import { CONNECTION_DEFAULTS } from './provider-registry.js';

export const CONNECTION_KEYS = Object.freeze({
  settings: 'sillyTavernStudio_globalConnection',
  gemini: 'sillyTavernStudio_apiSettings',
  rotation: 'sillyTavernStudio_apiKeyIndex',
  openrouter: 'sillyTavernStudio_openRouterApiKey',
});
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function read(storage, key) { try { return storage?.getItem(key) ?? null; } catch { return null; } }
function parse(raw) { try { return JSON.parse(raw); } catch { return null; } }
function normalizeGemini(value) {
  return { useDefault: typeof value?.useDefault !== 'boolean' || value.useDefault,
    keys: Array.isArray(value?.keys) ? value.keys.filter(key => typeof key === 'string').slice(0, 100) : [] };
}

export function resolveProxyProbe({ profileId, profile, draft, saved }) {
  if (!draft && profileId && !profile) throw new Error('Cấu hình Proxy không còn tồn tại.');
  const target = draft ?? profile ?? saved;
  if (!String(target?.url || '').trim()) throw new Error('Chưa cấu hình Proxy URL.');
  return { profileId, url: String(target.url).trim(), password: String(target.password ?? '').trim(),
    legacyMode: Boolean(target.legacyMode), protocol: target.protocol || 'openai' };
}
export function createConnectionRepository(host = globalThis, { assertWriteAllowed = () => {} } = {}) {

  const local = () => host.localStorage;
  const session = () => host.sessionStorage;
  const safe = getter => { try { return getter(); } catch { return undefined; } };
  const environmentKey = () => typeof host.process?.env?.GEMINI_API_KEY === 'string' ? host.process.env.GEMINI_API_KEY.trim() : '';
  const getGemini = () => normalizeGemini(parse(read(safe(session), CONNECTION_KEYS.gemini) || read(safe(local), CONNECTION_KEYS.gemini)));
  return Object.freeze({
    getSettings() {
      const value = parse(read(safe(local), CONNECTION_KEYS.settings));
      return { ...CONNECTION_DEFAULTS, ...(object(value) ? value : {}) };
    },
    saveSettings(value) {
      assertWriteAllowed("connections.saveSettings");
      if (!object(value)) throw new TypeError('Connection settings must be an object');
      local().setItem(CONNECTION_KEYS.settings, JSON.stringify(value));
    },
    getGemini,
    resolveProxyProbe,
    saveGemini(value) {
      assertWriteAllowed("connections.saveGemini");
      session().setItem(CONNECTION_KEYS.gemini, JSON.stringify(normalizeGemini(value)));
      local().removeItem(CONNECTION_KEYS.gemini);
    },
    nextGeminiKey() {
      const settings = getGemini();
      if (settings.useDefault) return undefined;
      const keys = settings.keys.filter(key => key.trim());
      if (!keys.length) return undefined;
      const raw = read(safe(session), CONNECTION_KEYS.rotation);
      const last = raw === null ? -1 : Number(raw);
      const index = ((Number.isSafeInteger(last) && last >= -1 ? last : -1) + 1) % keys.length;
      assertWriteAllowed("connections.rotateGeminiKey");
      try { session().setItem(CONNECTION_KEYS.rotation, String(index)); } catch { return keys[0]; }
      return keys[index];
    },
    getGeminiCatalogKey(explicit) {
      if (typeof explicit === 'string') return explicit.trim();
      const value = getGemini();
      if (!value.useDefault) return value.keys.find(key => key.trim())?.trim() || '';
      return environmentKey();
    },
    getGeminiCatalogKeyForEnvironment: environmentKey,
    getOpenRouterKey() { return read(safe(session), CONNECTION_KEYS.openrouter) || ''; },
    saveOpenRouterKey(value) {
      assertWriteAllowed("connections.saveOpenRouterKey");
      session().setItem(CONNECTION_KEYS.openrouter, String(value ?? '').trim());
      local().removeItem(CONNECTION_KEYS.openrouter);
    },
  });
}
