import { createGeminiGenerationProvider } from '../gemini/generation.js';
import { createAiStudioTextProvider } from '../aistudio/text.js';
import { createOpenRouterGenerationProvider } from '../openrouter/generation.js';
import { createProxyGenerationProvider } from '../proxy/generation.js';
import {
  BUILTIN_PROVIDER_CONTRACTS,
  createProviderRegistry,
  normalizeGenerationResult,
} from './provider-registry.js';
import { redactHeaders } from '../../diagnostics/network-redaction.js';
export { createAiStudioModelCatalog } from '../aistudio/model-catalog.js';

const testPreset = Object.freeze({ temp: 0, max_tokens: 8 });

export function createGenerationGateway(deps) {
  const addNetworkLog = log => {
    deps.addNetworkLog?.({ ...log, headers: redactHeaders(log?.headers) });
  };
  const proxy = createProxyGenerationProvider({
    request: deps.request, addNetworkLog,
    normalizeProxyUrl: deps.normalizeProxyUrl, getProxyUrl: deps.getProxyUrl,
    getProxyPassword: deps.getProxyPassword, getProxyLegacyMode: deps.getProxyLegacyMode,
    getProxyProtocol: deps.getProxyProtocol || (() => deps.getConnectionSettings().proxy_protocol),
  });
  const openrouter = createOpenRouterGenerationProvider({
    request: deps.request, addNetworkLog,
    getHeaders: deps.getOpenRouterHeaders, readResponseError: deps.readResponseError,
  });
  const gemini = createGeminiGenerationProvider({
    createClient: deps.createGeminiClient, buildRequest: deps.buildGeminiRequest,
    safetySettings: deps.safetySettings, addNetworkLog,
  });
  const aistudio = createAiStudioTextProvider();
  const registry = createProviderRegistry([
    { ...BUILTIN_PROVIDER_CONTRACTS.gemini, adapter: gemini },
    { ...BUILTIN_PROVIDER_CONTRACTS.openrouter, adapter: openrouter },
    { ...BUILTIN_PROVIDER_CONTRACTS.proxy, adapter: proxy },

    { ...BUILTIN_PROVIDER_CONTRACTS.aistudio, adapter: aistudio },
    ...(deps.extraProviders || []),
  ]);
  function resolve(options) {
    const settings = deps.getConnectionSettings();
    const { entry, model } = registry.resolve(settings, options.source, options.model);
    return { entry, args: { ...options, model, preset: options.preset ?? {} } };
  }
  async function generateOnce(options) {
    const { entry, args } = resolve(options);
    if (args.signal?.aborted) throw new DOMException('Generation was stopped.', 'AbortError');
    return normalizeGenerationResult(await entry.adapter.generate(args));
  }
  async function* stream(options) {
    const { entry, args } = resolve(options);
    if (args.signal?.aborted) throw new DOMException('Generation was stopped.', 'AbortError');
    yield* entry.adapter.stream(args);
  }
  async function testModel({ provider, model, geminiApiKey = '', openRouterApiKey = '', proxy: proxyConfig, signal } = {}) {
    const entry = registry.get(provider);
    if (!entry.capabilities.connectionTest) throw new Error(entry.testUnavailableReason || `Provider ${entry.id} chưa hỗ trợ kiểm tra model.`);
    if (!String(model ?? '').trim()) throw new Error('Model ID đang trống.');
    if (signal?.aborted) throw new DOMException('Model test aborted.', 'AbortError');
    const start = performance.now();
    const { response } = await generateOnce({ source: provider, model, prompt: 'Trả lời duy nhất: OK', preset: testPreset,
      credentials: { geminiApiKey, openRouterApiKey }, proxyConfig, signal, purpose: 'connection-test' });
    if (signal?.aborted) throw new DOMException('Model test aborted.', 'AbortError');
    if (!/\bOK\b/i.test(response.text.trim())) throw new Error('Máy chủ phản hồi thành công nhưng nội dung kiểm tra không hợp lệ.');
    return { ok: true, provider, model, latencyMs: performance.now() - start, outputPreview: response.text.slice(0, 80) };
  }
  return Object.freeze({
    generateOnce,
    stream,
    testModel,
    listProviders: registry.list,
    validateConfig: registry.validateConfig,
    getCurrentModel: () => { const { entry, args } = resolve({}); return args.model || entry.id; },
  });
}
