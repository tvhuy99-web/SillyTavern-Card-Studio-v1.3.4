import {
  buildSamplerSettings,
  buildGeminiSamplerSettings,
  clampNumber,
  networkLogId,
  openAiCompatibleError,
  readSseResponse,
} from '../common/generation-utils.js';

function googleText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || payload?.text || '';
}

export function createProxyGenerationProvider(deps) {
  function config(override) {

    const explicitEndpoint = override != null && Object.hasOwn(override, 'url');
    if (explicitEndpoint && !String(override.url ?? '').trim()) throw Error('Chưa cấu hình Proxy URL.');
    return {
      url: override?.url || deps.getProxyUrl(),
      password: override?.password ?? (explicitEndpoint ? '' : deps.getProxyPassword()),
      legacyMode: override?.legacyMode ?? (explicitEndpoint ? false : deps.getProxyLegacyMode()),
      protocol: override?.protocol ?? (explicitEndpoint ? 'openai' : deps.getProxyProtocol?.() ?? 'openai'),
    };
  }

  function payload(model, prompt, preset, stream) {
    return {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: clampNumber(preset.temp, 1, { min: 0, max: 2 }),
      ...buildSamplerSettings(preset),
      max_tokens: Math.trunc(clampNumber(preset.max_tokens, 4096, { min: 1 })),
      stop: preset.stopping_strings,
      stream,
    };
  }

  function requestInfo(model, prompt, preset, stream, override) {
    const resolved = config(override);
    const base = deps.normalizeProxyUrl(resolved.url);
    if (resolved.protocol === 'google_native') {
      const headers = { 'Content-Type': 'application/json' };
      if (resolved.password) headers['x-goog-api-key'] = resolved.password;
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: clampNumber(preset.temp, 1, { min: 0, max: 2 }),
          maxOutputTokens: Math.trunc(clampNumber(preset.max_tokens, 4096, { min: 1 })),
          ...buildGeminiSamplerSettings(preset),
          ...(preset.stopping_strings ? { stopSequences: preset.stopping_strings } : {}),
        },
      };
      const id = encodeURIComponent(String(model).replace(/^models\//, ''));
      return { url: `${base.replace(/\/v1beta(?:\/models)?$/, '')}/v1beta/models/${id}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`, headers, body, protocol: resolved.protocol };
    }
    if (resolved.protocol !== 'openai') throw new Error(`Giao thức Proxy không được hỗ trợ: ${resolved.protocol}`);
    const body = payload(model, prompt, preset, stream);
    const headers = {};
    if (resolved.legacyMode) headers['Content-Type'] = 'text/plain';
    else {
      headers['Content-Type'] = 'application/json';
      if (resolved.password) headers.Authorization = 'Bearer ' + resolved.password;
    }
    return {
      url: base + '/v1/chat/completions',
      headers,
      body,
    };
  }

  async function generate({ model, prompt, preset, proxyConfig, signal, purpose }) {
    const req = requestInfo(model, prompt, preset, false, proxyConfig);
    if (purpose !== 'connection-test') deps.addNetworkLog({
      id: networkLogId('proxy'),
      timestamp: Date.now(),
      url: req.url,
      method: 'POST',
      headers: req.headers,
      body: req.body,
      source: 'proxy',
    });
    const response = await deps.request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal,
    });
    if (!response.ok) throw new Error(await openAiCompatibleError(response, 'Proxy Error'));
    const json = await response.json();
    return { text: req.protocol === 'google_native' ? googleText(json) : json.choices?.[0]?.message?.content || '' };
  }

  async function* stream({ model, prompt, preset, proxyConfig, signal }) {
    const req = requestInfo(model, prompt, preset, true, proxyConfig);
    deps.addNetworkLog({
      id: networkLogId('proxy-stream'),
      timestamp: Date.now(),
      url: req.url,
      method: 'POST',
      headers: req.headers,
      body: req.body,
      source: 'proxy',
    });
    const response = await deps.request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal,
    });
    if (!response.ok) throw new Error(await openAiCompatibleError(response, 'Proxy Stream Error'));

    yield* readSseResponse(response, {
      signal,
      parseEvent(event) {
        if (!event || event.trim() === '[DONE]') return null;
        try {
          const json = JSON.parse(event);
          const text = req.protocol === 'google_native' ? googleText(json) : json.choices?.[0]?.delta?.content || '';
          return text ? { text } : null;
        } catch {
          return null;
        }
      },
    });
  }

  return Object.freeze({ generate, stream });
}
