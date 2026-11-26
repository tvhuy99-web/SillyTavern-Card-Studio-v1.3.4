/** Provider identity, model resolution and capability contracts. No DOM/storage. */
export const CONNECTION_DEFAULTS = Object.freeze({
  source: 'gemini', aistudio_model: 'default', aistudio_tool_model: 'default',
  aistudio_thinking: 'default', aistudio_tool_thinking: 'default',
  gemini_model: 'gemini-3-flash-preview', openrouter_model: '',
  proxy_model: 'gemini-3.1-pro-preview', proxy_tool_model: 'gemini-3-flash-preview',
  proxy_protocol: 'openai', proxy_profile_id: '', directFetchBypass: true,
});

export const DEFAULT_PROVIDER_CAPABILITIES = Object.freeze({
  streaming: false,
  cancellation: false,
  modelCatalog: false,
  connectionTest: false,
  customModel: false,
  toolCalling: false,
});

export function normalizeProviderCapabilities(capabilities = {}) {
  const connectionTest = Boolean(capabilities.connectionTest ?? capabilities.testConnection ?? false);
  return Object.freeze({
    streaming: Boolean(capabilities.streaming),
    cancellation: Boolean(capabilities.cancellation),
    modelCatalog: Boolean(capabilities.modelCatalog),
    connectionTest,
    testConnection: connectionTest,
    customModel: Boolean(capabilities.customModel),
    toolCalling: Boolean(capabilities.toolCalling),
  });
}

function buildValidationResult(errors) {
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
  });
}

export const BUILTIN_PROVIDER_CONTRACTS = Object.freeze({
  gemini: Object.freeze({
    id: 'gemini',
    modelKey: 'gemini_model',
    defaultModel: 'gemini-3.1-pro-preview',
    capabilities: normalizeProviderCapabilities({
      streaming: true,
      cancellation: true,
      modelCatalog: true,
      connectionTest: true,
      customModel: true,
      toolCalling: true,
    }),
    validateConfig(config = {}) {
      const errors = [];
      const apiKey = String(config.geminiApiKey ?? config.apiKey ?? '').trim();
      if (!apiKey && !config.useDefault) {
        errors.push('API Key Gemini chưa được cấu hình.');
      }
      if (Object.hasOwn(config, 'model') && !String(config.model ?? '').trim()) {
        errors.push('Model ID Gemini đang trống.');
      }
      return buildValidationResult(errors);
    },
  }),
  openrouter: Object.freeze({
    id: 'openrouter',
    modelKey: 'openrouter_model',
    capabilities: normalizeProviderCapabilities({
      streaming: true,
      cancellation: true,
      modelCatalog: true,
      connectionTest: true,
      customModel: true,
      toolCalling: true,
    }),
    validateConfig(config = {}) {
      const errors = [];
      const apiKey = String(config.openRouterApiKey ?? config.apiKey ?? '').trim();
      if (!apiKey) {
        errors.push('API Key OpenRouter chưa được cấu hình.');
      }
      const model = String(config.model ?? config.openrouter_model ?? '').trim();
      if (!model) {
        errors.push('Model ID OpenRouter đang trống.');
      }
      return buildValidationResult(errors);
    },
  }),
  proxy: Object.freeze({
    id: 'proxy',
    modelKey: 'proxy_model',
    capabilities: normalizeProviderCapabilities({
      streaming: true,
      cancellation: true,
      modelCatalog: true,
      connectionTest: true,
      customModel: true,
      toolCalling: true,
    }),
    validateConfig(config = {}) {
      const errors = [];
      const url = String(config.url ?? config.proxyUrl ?? '').trim();
      if (!url) {
        errors.push('Chưa cấu hình Proxy URL.');
      }
      const protocol = config.protocol ?? config.proxy_protocol ?? 'openai';
      if (protocol !== 'openai' && protocol !== 'google_native') {
        errors.push(`Giao thức Proxy không được hỗ trợ: ${protocol}`);
      }
      if (Object.hasOwn(config, 'model') && !String(config.model ?? '').trim()) {
        errors.push('Model ID Proxy đang trống.');
      }
      return buildValidationResult(errors);
    },
  }),
  aistudio: Object.freeze({
    id: 'aistudio',
    modelKey: 'aistudio_model',
    defaultModel: 'gemini-2.5-flash',
    capabilities: normalizeProviderCapabilities({
      streaming: true,
      cancellation: true,
      modelCatalog: true,
      connectionTest: false,
      customModel: false,
      toolCalling: false,
    }),
    testUnavailableReason: 'AI Studio chưa hỗ trợ kiểm tra model độc lập an toàn. Hãy mở phiên để kiểm tra.',
    validateConfig(config = {}) {
      const errors = [];
      if (config.nativeAvailable === false) {
        errors.push('AI Studio WebView native bridge chưa sẵn sàng.');
      }
      return buildValidationResult(errors);
    },
  }),
});

export class UnsupportedProviderError extends Error {
  constructor(id) { super(`Nhà cung cấp AI không được hỗ trợ: ${String(id)}`); this.name = 'UnsupportedProviderError'; }
}

export function createProviderRegistry(entries) {
  const providers = new Map();
  for (const entry of entries) {
    const { id, modelKey, adapter, validateConfig } = entry;
    if (typeof id !== 'string' || !id || providers.has(id) || !modelKey ||
        typeof adapter?.generate !== 'function' || typeof adapter?.stream !== 'function' ||
        (validateConfig !== undefined && typeof validateConfig !== 'function')) {
      throw new TypeError(`Invalid or duplicate provider: ${id}`);
    }
    const normalizedCapabilities = normalizeProviderCapabilities(entry.capabilities);
    const resolvedValidateConfig = validateConfig ?? (() => buildValidationResult([]));
    providers.set(id, Object.freeze({
      ...entry,
      capabilities: normalizedCapabilities,
      validateConfig: resolvedValidateConfig,
    }));
  }
  function get(id) {
    const entry = providers.get(id);
    if (!entry) throw new UnsupportedProviderError(id);
    return entry;
  }
  return Object.freeze({
    get,
    has: id => providers.has(id),
    resolve(settings, source, model) {
      const entry = get(source ?? settings.source ?? CONNECTION_DEFAULTS.source);
      return { entry, model: model || settings[entry.modelKey] || entry.defaultModel };
    },
    validateConfig(id, config = {}) {
      return get(id).validateConfig(config);
    },
    list: () => [...providers.values()].map(({ id, capabilities }) => ({ id, capabilities })),
  });
}

export function normalizeGenerationResult(result) {
  return {
    response: { text: String(result?.response?.text ?? result?.text ?? '') },
    ...(result?.reasoning !== undefined ? { reasoning: result.reasoning } : {}),
  };
}
