import { buildGeminiSamplerSettings } from '../common/generation-utils.js';

export function createGeminiGenerationProvider(deps) {
  function requestInfo(prompt, preset, signal) {
    const request = deps.buildRequest(prompt, preset, deps.safetySettings);
    return {
      contents: request.contents,
      config: {
        ...request.config,
        ...buildGeminiSamplerSettings(preset),
        ...(signal ? { abortSignal: signal } : {}),
      },
    };
  }

  async function generate({ model, prompt, preset, signal }) {
    const client = deps.createClient();
    const resolvedModel = model || 'gemini-3.1-pro-preview';
    const request = requestInfo(prompt, preset, signal);
    const response = await client.models.generateContent({
      model: resolvedModel,
      contents: request.contents,
      config: request.config,
    });
    return { response: { text: response.text || '' } };
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
