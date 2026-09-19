import { createGeminiGenerationProvider } from '../gemini/generation.js';
import { createOpenRouterGenerationProvider } from '../openrouter/generation.js';
import { createProxyGenerationProvider } from '../proxy/generation.js';

export function createGenerationGateway(deps) {
  const proxy = createProxyGenerationProvider({
    request: deps.request,
    addNetworkLog: deps.addNetworkLog,
    normalizeProxyUrl: deps.normalizeProxyUrl,
    getProxyUrl: deps.getProxyUrl,
    getProxyPassword: deps.getProxyPassword,
    getProxyLegacyMode: deps.getProxyLegacyMode,
  });
  const openrouter = createOpenRouterGenerationProvider({
    request: deps.request,
    addNetworkLog: deps.addNetworkLog,
    getHeaders: deps.getOpenRouterHeaders,
    readResponseError: deps.readResponseError,
  });
  const gemini = createGeminiGenerationProvider({
    generateOnce: deps.geminiGenerateOnce,
    createClient: deps.createGeminiClient,
    buildRequest: deps.buildGeminiRequest,
    safetySettings: deps.safetySettings,
  });

  function resolve(sourceOverride, modelOverride) {
    const settings = deps.getConnectionSettings();
    const source = sourceOverride || settings.source;
    const model = modelOverride || (
      source === 'gemini'
        ? settings.gemini_model
        : source === 'proxy'
          ? settings.proxy_model
          : settings.openrouter_model
    );
    return { source, model };
  }

  async function generateOnce({ prompt, preset, model, source, proxyConfig, signal }) {
    const resolved = resolve(source, model);
    if (resolved.source === 'proxy') {
      const result = await proxy.generate({ model: resolved.model, prompt, preset, proxyConfig, signal });
      return { response: { text: result.text } };
    }
    if (resolved.source === 'openrouter') {
      const result = await openrouter.generate({ model: resolved.model, prompt, preset, signal });
      return { response: { text: result.text }, reasoning: result.reasoning };
    }
    return gemini.generate({ model: resolved.model, prompt, preset, signal });
  }

  async function* stream(options) {
    const resolved = resolve(options.source, options.model);
    const args = { ...options, model: resolved.model };
    if (resolved.source === 'proxy') {
      yield* proxy.stream(args);
      return;
    }
    if (resolved.source === 'openrouter') {
      yield* openrouter.stream(args);
      return;
    }
    yield* gemini.stream(args);
  }

  return Object.freeze({ generateOnce, stream });
}
