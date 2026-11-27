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

const encodeScopePart = value => encodeURIComponent(String(value ?? '').slice(0, 300));
export const normalizeRuntimeScope = option => ({ ...(option || {}), type: option?.type || 'chat' });
export function resolveRuntimeMessageIndex(value, length) {
  if (length <= 0) return -1;
  if (value === undefined || value === 'latest') return length - 1;
  const index = Math.trunc(Number(value));
  return Number.isFinite(index) ? index < 0 ? length + index : index : -1;
}
export function runtimeVariableStorageKey(option, context) {
  const scope = normalizeRuntimeScope(option);
  const prefix = STORAGE_PREFIX + ':variables:';
  switch (scope.type) {
    case 'global': return GLOBAL_VARIABLES_STORAGE_KEY;
    case 'preset': return prefix + 'preset:' + encodeScopePart(context.presetName || 'default');
    case 'character': return prefix + 'character:' + encodeScopePart(context.characterId);
    case 'message': return prefix + 'message:' + encodeScopePart(context.chatId) + ':' + resolveRuntimeMessageIndex(scope.message_id, Math.max(1, (context.messageId ?? 0) + 1));
    case 'script': return prefix + 'script:' + encodeScopePart(context.chatId) + ':' + encodeScopePart(scope.script_id || context.scriptId || 'default');
    case 'extension': return prefix + 'extension:' + encodeScopePart(scope.extension_id || context.extensionId || 'unknown');
    default: return null;
  }
}
export function runtimeWebStorageKey(type, context) {
  return STORAGE_PREFIX + ':web-storage:' + type + ':' + encodeScopePart(context.characterId) + ':' + encodeScopePart(context.chatId);
}
export function readRuntimeRecord(storage, key) {
  if (!storage) return {};
  try {
    const value = JSON.parse(storage.getItem(key) || '{}');
    return isRecord(value) ? value : {};
  } catch { return {}; }
}
export function writeRuntimeRecord(storage, key, value, validate = () => {}) {
  if (!storage) return;
  validate(value);
  storage.setItem(key, JSON.stringify(value));
}
