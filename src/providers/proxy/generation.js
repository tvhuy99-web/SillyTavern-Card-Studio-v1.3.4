import {
  clampNumber,
  networkLogId,
  openAiCompatibleError,
  optionalPositiveInt,
  readSseResponse,
} from '../common/generation-utils.js';

export function createProxyGenerationProvider(deps) {
  function config(override) {
    return {
      url: override?.url || deps.getProxyUrl(),
      password: override?.password ?? deps.getProxyPassword(),
      legacyMode: override?.legacyMode ?? deps.getProxyLegacyMode(),
    };
  }

  function payload(model, prompt, preset, stream) {
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: clampNumber(preset.temp, 1, { min: 0, max: 2 }),
      max_tokens: Math.trunc(clampNumber(preset.max_tokens, 4096, { min: 1 })),
      stream,
    };
    if (preset.top_p !== undefined) body.top_p = Number(preset.top_p);
    if (preset.frequency_penalty !== undefined) body.frequency_penalty = Number(preset.frequency_penalty);
    if (preset.presence_penalty !== undefined) body.presence_penalty = Number(preset.presence_penalty);
    const topK = optionalPositiveInt(preset.top_k);
    if (topK !== undefined) body.top_k = topK;
    return body;
  }

  function requestInfo(model, prompt, preset, stream, override) {
    const resolved = config(override);
    const base = deps.normalizeProxyUrl(resolved.url);
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

  async function generate({ model, prompt, preset, proxyConfig, signal }) {
    const req = requestInfo(model, prompt, preset, false, proxyConfig);
    deps.addNetworkLog({
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
    return { text: json.choices?.[0]?.message?.content || '' };
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
          const text = JSON.parse(event).choices?.[0]?.delta?.content || '';
          return text ? { text } : null;
        } catch {
          return null;
        }
      },
    });
  }

  return Object.freeze({ generate, stream });
}
