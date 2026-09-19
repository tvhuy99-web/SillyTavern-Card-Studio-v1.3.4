export function createGeminiGenerationProvider(deps) {
  async function generate({ model, prompt, preset, signal }) {
    return {
      response: await deps.generateOnce(
        model || 'gemini-3.1-pro-preview',
        prompt,
        preset,
        deps.safetySettings,
        signal,
      ),
    };
  }

  async function* stream({ model, prompt, preset, signal }) {
    const client = deps.createClient();
    const resolvedModel = model || 'gemini-3.1-pro-preview';
    const request = deps.buildRequest(prompt, preset, deps.safetySettings);
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
