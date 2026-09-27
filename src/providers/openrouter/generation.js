import {
  buildSamplerSettings,
  clampNumber,
  networkLogId,
  readSseResponse,
} from '../common/generation-utils.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export function createOpenRouterGenerationProvider(deps) {
  function payload(model, prompt, preset, stream) {
    return {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: clampNumber(preset.temp, 1, { min: 0, max: 2 }),
      ...buildSamplerSettings(preset, { includeTypicalP: false }),
      max_tokens: Math.trunc(clampNumber(preset.max_tokens, 4096, { min: 1 })),
      stop: preset.stopping_strings,
      include_reasoning: true,
      stream,
    };
  }

  async function generate({ model, prompt, preset, signal }) {
    const body = payload(model, prompt, preset, false);
    const headers = deps.getHeaders();
    deps.addNetworkLog({
      id: networkLogId('or'),
      timestamp: Date.now(),
      url: ENDPOINT,
      method: 'POST',
      headers,
      body,
      source: 'openrouter',
    });
    const response = await deps.request(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw new Error(await deps.readResponseError(response, 'OpenRouter Error'));
    const json = await response.json();
    return {
      text: json.choices?.[0]?.message?.content || '',
      reasoning: json.choices?.[0]?.message?.reasoning_content || undefined,
    };
  }

  async function* stream({ model, prompt, preset, signal }) {
    const body = payload(model, prompt, preset, true);
    const headers = deps.getHeaders();
    deps.addNetworkLog({
      id: networkLogId('or-stream'),
      timestamp: Date.now(),
      url: ENDPOINT,
      method: 'POST',
      headers,
      body,
      source: 'openrouter',
    });
    const response = await deps.request(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      let message = 'OpenRouter Stream Error: ' + response.status;
      try {
        const json = await response.json();
        if (json?.error?.message) message = json.error.message;
      } catch {}
      throw new Error(message);
    }

    yield* readSseResponse(response, {
      signal,
      parseEvent(event) {
        if (!event || event.trim() === '[DONE]') return null;
        try {
          const choice = JSON.parse(event).choices?.[0];
          const text = choice?.delta?.content || '';
          const reasoning = choice?.delta?.reasoning_content || '';
          return text || reasoning ? { text, reasoning: reasoning || undefined } : null;
        } catch {
          return null;
        }
      },
    });
  }

  return Object.freeze({ generate, stream });
}
