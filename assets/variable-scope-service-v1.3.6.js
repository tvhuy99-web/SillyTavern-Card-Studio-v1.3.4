const STORAGE_PREFIX = 'st-card-studio:card-runtime:v2';
export const GLOBAL_VARIABLES_STORAGE_KEY = STORAGE_PREFIX + ':variables:global';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneRecord(value) {
  if (!isRecord(value)) return {};
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch {}
  }
  try { return JSON.parse(JSON.stringify(value)); } catch { return { ...value }; }
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {}
  return null;
}

export function readGlobalVariables(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') return {};
  try {
    const parsed = JSON.parse(target.getItem(GLOBAL_VARIABLES_STORAGE_KEY) || '{}');
    return cloneRecord(parsed);
  } catch {
    return {};
  }
}

export function writeGlobalVariables(value, storage) {
  const clean = cloneRecord(value);
  const target = resolveStorage(storage);
  if (target && typeof target.setItem === 'function') {
    target.setItem(GLOBAL_VARIABLES_STORAGE_KEY, JSON.stringify(clean));
  }
  return clean;
}

export function normalizePromptVariableScopes(chatVariables, globalVariables) {
  const chat = cloneRecord(chatVariables);
  const canonicalGlobal = cloneRecord(globalVariables);
  const legacyGlobal = isRecord(chat.globals) ? cloneRecord(chat.globals) : {};
  delete chat.globals;
  const global = { ...legacyGlobal, ...canonicalGlobal };
  return Object.freeze({
    chat,
    global,
    migratedLegacyGlobalKeys: Object.freeze(Object.keys(legacyGlobal)),
  });
}
