import { buildGeminiSamplerSettings, networkLogId } from '../common/generation-utils.js';

export function createGeminiGenerationProvider(deps) {
  function requestInfo(prompt, preset, signal, safetySettings = deps.safetySettings) {
    const request = deps.buildRequest(prompt, preset, safetySettings);
    return {
      contents: request.contents,
      config: {
        ...request.config,
        ...buildGeminiSamplerSettings(preset),
        ...(signal ? { abortSignal: signal } : {}),
      },
    };
  }

  async function generate({ model, prompt, preset, signal, credentials, safetySettings, purpose }) {
    if (signal?.aborted) throw new DOMException('Generation was stopped.', 'AbortError');
    const client = deps.createClient(credentials?.geminiApiKey || undefined);
    const resolvedModel = model || 'gemini-3.1-pro-preview';
    const request = requestInfo(prompt, preset, signal, safetySettings);
    if (purpose !== 'connection-test') deps.addNetworkLog?.({
      id: networkLogId('gemini'), timestamp: Date.now(),
      url: `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent`,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: { contents: request.contents, generationConfig: request.config }, source: 'gemini',
    });
    const pending = client.models.generateContent({ model: resolvedModel, contents: request.contents, config: request.config });
    let response;
    if (!signal) response = await pending;
    else {
      let abort;
      try {
        response = await Promise.race([pending, new Promise((_, reject) => {
          abort = () => reject(new DOMException('Generation was stopped.', 'AbortError'));
          signal.addEventListener('abort', abort, { once: true });
          if (signal.aborted) abort();
        })]);
      } finally { signal.removeEventListener('abort', abort); }
    }
    return { response: { text: typeof response.text === 'function' ? response.text() : response.text || '' } };
  }

  async function* stream({ model, prompt, preset, signal }) {
    const client = deps.createClient();
    const resolvedModel = model || 'gemini-3.1-pro-preview';
    const request = requestInfo(prompt, preset, signal);
    try {
      const stream = await client.models.generateContentStream({
        model: resolvedModel,
        contents: request.contents,
        config: request.config,
      });
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        yield { text: chunk.text || '' };
      }
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Streaming Error:', error);
      throw new Error('Lỗi luồng dữ liệu AI.');
    }
  }

  return Object.freeze({ generate, stream });
}
