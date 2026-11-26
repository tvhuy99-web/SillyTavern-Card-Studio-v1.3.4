import { CROSS_TAB_EVENTS } from '../persistence/cross-tab-sync.js';

// Unified write owner for application settings stored in localStorage.
// Designed for Wave 3 migration of UI and store consumers away from direct localStorage calls.
export const SETTINGS_STORAGE_KEYS = Object.freeze({
  compatibilityMode: 'st-card-studio:card-runtime:compatibility-mode',
  engineMode: 'st-card-studio:card-runtime:engine-mode',
  arenaSettings: 'arena_settings',
  activePersonaId: 'sillyTavernStudio_activePersonaId',
  cardRuntimePrefix: 'st-card-studio:card-runtime:v2:',
  apiSettings: 'sillyTavernStudio_apiSettings',
  apiKeyIndex: 'sillyTavernStudio_apiKeyIndex',
  openRouterApiKey: 'sillyTavernStudio_openRouterApiKey',
  proxyUrl: 'sillyTavernStudio_proxyUrl',
  proxyPassword: 'sillyTavernStudio_proxyPassword',
  proxyLegacyMode: 'sillyTavernStudio_proxyLegacyMode',
  proxyForTools: 'sillyTavernStudio_proxyForTools',
  proxyProfiles: 'sillyTavernStudio_proxyProfiles',
  geminiModels: 'sillyTavernStudio_geminiModels',
  openrouterModels: 'sillyTavernStudio_openrouterModels',
  globalConnection: 'sillyTavernStudio_globalConnection',
  smartScanGlobal: 'sillyTavernStudio_smartScanGlobal',
  globalContext: 'sillyTavernStudio_globalContext',
  globalActionSuggestion: 'sillyTavernStudio_globalActionSuggestion',
  globalWritingRefinement: 'sillyTavernStudio_globalWritingRefinement',
  ttsGlobal: 'sillyTavernStudio_ttsGlobal',
});

function assertKey(key) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('Settings key must be a non-empty string');
  }
}

export function createSettingsRepository({
  storage = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null,
  crossTabSync = null,
  prefix = SETTINGS_STORAGE_KEYS.cardRuntimePrefix,
  writeGuard = null,
} = {}) {
  let activeWriteGuard = typeof writeGuard === 'function' ? writeGuard : null;
  function setWriteGuard(fn) {
    if (fn !== null && fn !== undefined && typeof fn !== 'function') {
      throw new TypeError('Settings repository writeGuard must be a function or null');
    }
    activeWriteGuard = fn || null;
  }
  function assertWriteAllowed(operationName) {
    if (typeof activeWriteGuard === 'function') {
      activeWriteGuard(operationName);
    }
  }
  const listeners = new Set();

  function notify(change) {
    for (const listener of [...listeners]) {
      try {
        listener(change);
      } catch {
        // Keep repository writes isolated from subscriber errors.
      }
    }
  }

  let unsubscribeCrossTab = null;
  if (crossTabSync && typeof crossTabSync.subscribe === 'function') {
    unsubscribeCrossTab = crossTabSync.subscribe(CROSS_TAB_EVENTS.SETTINGS_UPDATED, event => {
      notify({
        source: 'remote',
        keys: Array.isArray(event.payload?.keys) ? event.payload.keys : [],
        senderId: event.senderId,
      });
    });
  }

  function getRaw(key, fallback = null) {
    assertKey(key);
    if (!storage || typeof storage.getItem !== 'function') return fallback;
    const value = storage.getItem(key);
    return value === null || value === undefined ? fallback : value;
  }

  function setRaw(key, value, { broadcast = true } = {}) {
    assertKey(key);
    assertWriteAllowed('settings.set');
    if (!storage || typeof storage.setItem !== 'function') {
      throw new Error('Settings storage is unavailable.');
    }
    if (value === null || value === undefined) {
      return remove(key, { broadcast });
    }
    const serialized = String(value);
    storage.setItem(key, serialized);
    notify({ source: 'local', keys: [key], action: 'set' });
    if (broadcast) {
      crossTabSync?.publish(CROSS_TAB_EVENTS.SETTINGS_UPDATED, { keys: [key], action: 'set' });
    }
    return serialized;
  }

  function remove(key, { broadcast = true } = {}) {
    assertKey(key);
    assertWriteAllowed('settings.remove');
    if (!storage || typeof storage.removeItem !== 'function') {
      throw new Error('Settings storage is unavailable.');
    }
    storage.removeItem(key);
    notify({ source: 'local', keys: [key], action: 'remove' });
    if (broadcast) {
      crossTabSync?.publish(CROSS_TAB_EVENTS.SETTINGS_UPDATED, { keys: [key], action: 'remove' });
    }
    return true;
  }

  function getJson(key, fallback = null) {
    const raw = getRaw(key, null);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function setJson(key, value, options) {
    if (value === undefined) return remove(key, options);
    const serialized = JSON.stringify(value);
    setRaw(key, serialized, options);
    return value;
  }

  function updateJson(key, updater, fallback = {}) {
    if (typeof updater !== 'function') {
      throw new TypeError('Settings updater must be a function');
    }
    const current = getJson(key, fallback);
    const next = updater(current);
    return setJson(key, next);
  }

  function getMany(keys) {
    const output = {};
    for (const key of keys) {
      output[key] = getRaw(key, null);
    }
    return output;
  }

  // Transactional batch write over localStorage with rollback on QuotaExceededError.
  function setMany(entries, { broadcast = true } = {}) {
    assertWriteAllowed('settings.set');
    if (!storage || typeof storage.setItem !== 'function') {
      throw new Error('Settings storage is unavailable.');
    }
    const pairs = Array.isArray(entries) ? entries : Object.entries(entries || {});
    for (const [key] of pairs) assertKey(key);

    const snapshot = pairs.map(([key]) => [key, storage.getItem(key)]);
    try {
      for (const [key, value] of pairs) {
        if (value === null || value === undefined) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, String(value));
        }
      }
    } catch (cause) {
      let rollbackFailed = false;
      for (const [key, previous] of snapshot) {
        try {
          if (storage.getItem(key) === previous) continue;
          if (previous === null || previous === undefined) storage.removeItem(key);
          else storage.setItem(key, previous);
        } catch {
          rollbackFailed = true;
        }
      }
      throw new Error(
        rollbackFailed
          ? 'Không thể lưu nhóm cài đặt và không thể hoàn tác đầy đủ.'
          : 'Không thể lưu nhóm cài đặt. Các khóa đã được hoàn tác.',
        { cause },
      );
    }

    const keys = pairs.map(([key]) => key);
    notify({ source: 'local', keys, action: 'batch' });
    if (broadcast && keys.length > 0) {
      crossTabSync?.publish(CROSS_TAB_EVENTS.SETTINGS_UPDATED, { keys, action: 'batch' });
    }
    return keys;
  }

  function listByPrefix(targetPrefix = prefix) {
    if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') return [];
    const results = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (typeof key === 'string' && key.startsWith(targetPrefix)) {
        results.push([key, storage.getItem(key)]);
      }
    }
    return results;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Settings subscriber must be a function');
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function close() {
    if (typeof unsubscribeCrossTab === 'function') {
      unsubscribeCrossTab();
      unsubscribeCrossTab = null;
    }
    listeners.clear();
  }

  return Object.freeze({
    keys: SETTINGS_STORAGE_KEYS,
    setWriteGuard,
    getRaw,
    setRaw,
    remove,
    getJson,
    setJson,
    updateJson,
    getMany,
    setMany,
    listByPrefix,
    subscribe,
    close,
  });
}
