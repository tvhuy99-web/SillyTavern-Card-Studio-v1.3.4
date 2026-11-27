import { createConnectionRepository } from './connection-repository.js';
import { createModelCatalog } from './model-catalog.js';
import { createGenerationGateway } from './generation-gateway.js';

export function normalizeProxyUrl(url) {
  let base = url.trim().replace(/\/$/, '');
  if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base;
  return base.replace(/\/v1(?:\/chat\/completions|\/models)?$/, '');
}

export function createHostConnectionServices({ proxyPersistence, request, host = globalThis, connections = createConnectionRepository(host), settingsStorage }) {
  const storage = settingsStorage ?? host.localStorage;
  const catalog = createModelCatalog({ storage, request, geminiRequest: (...args) => host.fetch(...args), normalizeProxyUrl, getGeminiKey: connections.getGeminiCatalogKey });
  const readSettings = connections.getSettings;
  const readProfiles = () => proxyPersistence.getProfiles();
  const readProxyUrl = () => storage.getItem('sillyTavernStudio_proxyUrl') || 'http://127.0.0.1:8889';
  const readProxyPassword = () => proxyPersistence.getPassword();
  const readLegacyMode = () => storage.getItem('sillyTavernStudio_proxyLegacyMode') !== 'false';
  const readProxyForTools = () => storage.getItem('sillyTavernStudio_proxyForTools') === 'true';
  function selectedProfile() {
    const id = readSettings().proxy_profile_id;
    if (!id) return undefined;
    const profile = readProfiles().find(profile => profile.id === id);
    if (!profile) throw Error('Cấu hình Proxy đã chọn không còn tồn tại.');
    return profile;
  }
  function readEffectiveSettings() {
    const settings = readSettings();
    const profile = settings.proxy_profile_id && readProfiles().find(item => item.id === settings.proxy_profile_id);
    return profile ? {...settings,proxy_protocol:profile.protocol,proxy_model:profile.chatModel || settings.proxy_model,proxy_tool_model:profile.toolModel || settings.proxy_tool_model} : settings;
  }
  function getProxyForTools() {
    const id=readSettings().proxy_profile_id;
    return id ? !!readProfiles().find(profile=>profile.id===id)?.proxyForTools : readProxyForTools();
  }
  function getProxyUrl() { const profile = selectedProfile(); return profile ? profile.url : readProxyUrl(); }
  function getProxyPassword() { const profile = selectedProfile(); return profile ? profile.password : readProxyPassword(); }
  function getProxyLegacyMode() { const profile = selectedProfile(); return profile ? profile.legacyMode : readLegacyMode(); }
  function getProxyProtocol() { return selectedProfile()?.protocol || readSettings().proxy_protocol; }
  function getDisplayModel() {
    const settings = readEffectiveSettings();

    switch (settings.source) {
      case 'aistudio': return settings.aistudio_model || 'gemini-2.5-flash';
      case 'openrouter': return settings.openrouter_model || 'google/gemini-pro-1.5';
      case 'proxy': return settings.proxy_model || 'gemini-3.1-pro-preview';
      default: return settings.gemini_model || 'gemini-3-flash-preview';
    }
  }
  const readOpenRouterHeaders = () => {
    const headers = { Authorization: `Bearer ${connections.getOpenRouterKey()}`, 'X-Title': 'SillyTavern Card Studio' };
    if (/^https?:$/i.test(host.location?.protocol || '')) headers['HTTP-Referer'] = host.location.origin;
    return headers;
  };
  return Object.freeze({ connections, catalog, readSettings, readEffectiveSettings, getProxyForTools, readProfiles, saveProfiles: profiles => { proxyPersistence.setProfiles(profiles); }, readProxyUrl, readProxyPassword, readLegacyMode, readProxyForTools, getProxyUrl, getProxyPassword, getProxyLegacyMode, getProxyProtocol, getDisplayModel, readOpenRouterHeaders,
    loadProxyModels: (url, password, legacyMode, protocol) => catalog.loadProxy({ url, password, legacyMode, protocol }), loadOpenRouterModels: () => catalog.loadOpenRouter() });
}

export async function readResponseError(response, label) {
  let message = '';
  try {
    const text = await response.text();
    if (text) {
      try { const payload = JSON.parse(text); message = payload?.error?.message || payload?.message || text; }
      catch { message = text; }
    }
  } catch {}
  return `${label}: ${message || `HTTP ${response.status}`}`;
}

export function createHostGenerationBindings({ connectionServices, request, addNetworkLog, createGeminiClient, buildGeminiRequest, safetySettings }) {
  const { readSettings, getProxyUrl, getProxyPassword, getProxyLegacyMode, getProxyProtocol, readOpenRouterHeaders } = connectionServices;
  const gateway = createGenerationGateway({ getConnectionSettings: connectionServices.readEffectiveSettings || readSettings, request, addNetworkLog, getOpenRouterHeaders: key => ({ ...readOpenRouterHeaders(), 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) }), readResponseError, normalizeProxyUrl, getProxyUrl, getProxyPassword, getProxyLegacyMode, getProxyProtocol, createGeminiClient, buildGeminiRequest, safetySettings });
  const thinkingLevel = () => readSettings().aistudio_thinking || 'default';
  return Object.freeze({ gateway,
    async generateOnce(prompt, preset, model, source, proxyConfig, signal) { return gateway.generateOnce({ prompt, preset, model, source, proxyConfig, signal, thinkingLevel: thinkingLevel() }); },
    async *stream(prompt, preset, signal, model, source, proxyConfig) { yield* gateway.stream({ prompt, preset, signal, model, source, proxyConfig, thinkingLevel: thinkingLevel() }); },
    async aiStudioToolText(prompt, model, signal) { const result = await gateway.generateOnce({ prompt, model, source: 'aistudio', signal, thinkingLevel: readSettings().aistudio_tool_thinking || 'default' }); return String(result?.response?.text || ''); },
    async proxyToolText(prompt, model, protocol, _unused, maxTokens = 16384, signal) { return (await gateway.generateOnce({ source: 'proxy', model, prompt, signal, preset: { temp: .1, max_tokens: maxTokens }, proxyConfig: { protocol: getProxyProtocol?.() ?? protocol } })).response.text; },
  });
}
