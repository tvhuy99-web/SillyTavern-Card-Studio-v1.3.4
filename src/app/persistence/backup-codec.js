export const MAX_AVATAR_BASE64_LENGTH = 14e7;

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function assertBackupArray(value, fieldName) {
  if (!Array.isArray(value)) throw Error(`Dữ liệu sao lưu không hợp lệ: ${fieldName} phải là một mảng.`);
  if (value.length > 1e5) throw Error(`Dữ liệu sao lưu không hợp lệ: ${fieldName} có quá nhiều mục.`);
  return value;
}

export async function encodeBufferToBase64(buffer) {
  if (typeof FileReader === 'function' && typeof Blob === 'function') {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result || '').split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export async function decodeBase64ToBuffer(base64, _mimeType = 'application/octet-stream') {
  const normalized = String(base64).replace(/\s/g, '');
  if (normalized.length > MAX_AVATAR_BASE64_LENGTH || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw Error('Dữ liệu ảnh đại diện Base64 không hợp lệ hoặc quá lớn.');
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function createBackupCodec(_dependencies = {}) {
  return {

    MAX_AVATAR_BASE64_LENGTH,
    isPlainObject,
    assertBackupArray,
    encodeBufferToBase64,
    decodeBase64ToBuffer,
  };
}

export function validateRecordBatches(batches) {
  const keys = { characters: 'fileName', presets: 'name', lorebooks: 'name', personas: 'id', chatSessions: 'sessionId' };
  for (const [kind, key] of Object.entries(keys)) {
    const records = batches[kind];
    if (!Array.isArray(records) || records.length > 100000) throw Error(`Dữ liệu sao lưu không hợp lệ: ${kind}.`);
    const seen = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record[key] !== 'string' || !record[key].trim()) throw Error(`Dữ liệu sao lưu không hợp lệ: ${kind}.${key}.`);
      if (seen.has(record[key])) throw Error(`Dữ liệu sao lưu có khóa trùng lặp: ${kind}.${key}.`);
      seen.add(record[key]);
    }
  }
  return batches;
}

export function readBackupSetting(key, { local, session, connections, proxy, keys }) {
  if (key === keys.gemini) return JSON.stringify(connections.getGemini());
  if (key === keys.openrouter) return connections.getOpenRouterKey();
  if (key === keys.rotation) return session.getItem(key);
  if (key === keys.profiles) return proxy.exportProfilesForBackup();
  if (key === keys.password) return proxy.exportPasswordForBackup();
  return local.getItem(key);
}

export function prepareBackupSettings(settings, { allowed, prefix, keys, proxy }) {
  const output = [];
  let size = 0;
  for (const [key, value] of Object.entries(settings || {})) {
    if (!allowed.has(key) && !key.startsWith(prefix)) continue;
    if (typeof value !== 'string' || value.length > 5e6 || output.length >= 2000 || size + value.length > 5e7) throw Error('Dữ liệu cấu hình trong bản sao lưu không hợp lệ hoặc quá lớn.');
    if (key === keys.gemini) {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed.useDefault !== 'boolean' || !Array.isArray(parsed.keys) || parsed.keys.some(item => typeof item !== 'string')) throw Error('Cấu hình Gemini trong bản sao lưu không hợp lệ.');
    }
    if (key === keys.profiles) {
      const profiles = JSON.parse(value);
      if (!Array.isArray(profiles)) throw Error('Cấu hình Proxy trong bản sao lưu không hợp lệ.');
      proxy?.validateProfiles(profiles);
    }
    output.push([key, value]); size += value.length;
  }
  return output;
}
export function restoreBackupSettings(entries, { local, session, connections, proxy, keys }) {

  const touched = new Set(entries.map(([key]) => key));
  if (touched.has(keys.profiles) || touched.has(keys.password)) {
    for (const key of proxy.getOwnedStorageKeys()) touched.add(key);
  }
  const snapshot = [local, session].map(storage => [storage, [...touched].map(key => [key, storage.getItem(key)])]);
  try {
    for (const [key, value] of entries) {
      if (key === keys.gemini) connections.saveGemini(JSON.parse(value));
      else if (key === keys.openrouter) connections.saveOpenRouterKey(value);
      else if (key === keys.rotation) { session.setItem(key, value); local.removeItem(key); }
      else if (key === keys.profiles) proxy.importProfilesFromBackup(value);
      else if (key === keys.password) proxy.importPasswordFromBackup(value);
      else local.setItem(key, value);
    }
  } catch (cause) {
    let rollbackFailed = false;
    for (const [storage, values] of snapshot) for (const [key, value] of values) {
      try {
        if (storage.getItem(key) === value) continue;
        if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      } catch { rollbackFailed = true; }
    }
    throw new Error(rollbackFailed ? 'Không lưu được cấu hình và không thể hoàn tác đầy đủ.' : 'Không lưu được cấu hình. Các khóa cấu hình đã được hoàn tác.', { cause });
  }
}
