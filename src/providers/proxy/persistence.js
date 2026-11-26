const SECRET_FIELDS = Object.freeze(['password', 'apiKey', 'api_key', 'token', 'authorization']);

export const PROXY_PERSISTENCE_KEYS = Object.freeze({
  profilesLegacy: 'sillyTavernStudio_proxyProfiles',
  profilesCanonical: 'sillyTavernStudio_proxyProfilesV2',
  profileSecretsSession: 'sillyTavernStudio_proxyProfileSecrets',
  profileSecretsPersistent: 'sillyTavernStudio_proxyProfileSecretsPersistent',
  profileSecretRequired: 'sillyTavernStudio_proxyProfileSecretRequired',
  rememberSecrets: 'sillyTavernStudio_proxyRememberSecrets',
  proxyPasswordLegacy: 'sillyTavernStudio_proxyPassword',
  proxyPasswordPersistent: 'sillyTavernStudio_proxyPasswordPersistent',
});

export function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [String(key), String(value)]));
  return {
    getItem(key) { key = String(key); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    get length() { return values.size; },
    toJSON() { return Object.fromEntries(values); },
  };
}

function browserStorage(name) {
  try {
    const value = globalThis[name];
    if (value && typeof value.getItem === 'function') return value;
  } catch (_) {}
  return createMemoryStorage();
}

function parseJSON(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}

function read(storage, key) {
  try { return storage.getItem(key); } catch (_) { return null; }
}
function write(storage, key, value) {
  storage.setItem(key, String(value)); return true;
}
function remove(storage, key) {
  storage.removeItem(key);
}
function readMap(storage, key) {
  const value = parseJSON(read(storage, key), {});
  return Object.assign(Object.create(null), value && typeof value === 'object' && !Array.isArray(value) ? value : {});
}
function writeMap(storage, key, value) {
  write(storage, key, JSON.stringify(value && typeof value === 'object' ? value : {}));
}
function readSet(storage, key) {
  const value = parseJSON(read(storage, key), []);
  return new Set(Array.isArray(value) ? value.map(String) : []);
}
function writeSet(storage, key, value) {
  write(storage, key, JSON.stringify(Array.from(value || [], String)));
}
function profileKey(profile, index = 0) {
  const explicit = profile && (profile.id ?? profile.profileId ?? profile.name);
  return explicit === undefined || explicit === null || String(explicit).trim() === ''
    ? '__index:' + index
    : String(explicit);
}
function normalizeMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const profile = { ...raw };
  for (const field of SECRET_FIELDS) delete profile[field];
  profile.id = String(profile.id || profile.profileId || '').trim();
  profile.name = String(profile.name || 'Proxy');
  profile.url = String(profile.url || '').trim();
  profile.legacyMode = Boolean(profile.legacyMode);
  profile.proxyForTools = Boolean(profile.proxyForTools);
  profile.protocol = profile.protocol === 'google_native' ? 'google_native' : 'openai';
  profile.chatModel = String(profile.chatModel || '');
  profile.toolModel = String(profile.toolModel || '');
  if (!profile.id || !profile.url) return null;
  return profile;
}
function validateProfiles(input) {
  if (!Array.isArray(input) || input.length > 100) throw Error('Invalid proxy profile list.');
  const profiles = input.map(normalizeMetadata);
  if (profiles.some(profile => !profile)) throw Error('Invalid proxy profile list.');
  if (new Set(profiles.map(profile => profile.id)).size !== profiles.length) throw Error('Duplicate proxy profile ID.');
  return input;
}
function splitProfiles(input) {
  const profiles = [];
  const secrets = Object.create(null);
  const presentSecretFields = Object.create(null);
  const nonEmptySecretIds = new Set();
  (Array.isArray(input) ? input : []).slice(0, 100).forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const metadata = normalizeMetadata(raw);
    if (!metadata) return;
    const key = profileKey(metadata, index);
    const secret = {};
    let hasSecretField = false;
    let hasNonEmptySecret = false;
    for (const field of SECRET_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(raw, field)) continue;
      hasSecretField = true;
      const value = raw[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        secret[field] = value;
        hasNonEmptySecret = true;
      }
    }
    if (hasSecretField) presentSecretFields[key] = true;
    if (hasNonEmptySecret) {
      secrets[key] = secret;
      nonEmptySecretIds.add(key);
    }
    profiles.push(metadata);
  });
  return { profiles, secrets, presentSecretFields, nonEmptySecretIds };
}
function mergeSecretMaps(base, extra) {
  const result = Object.assign(Object.create(null), base || {});
  for (const [id, secret] of Object.entries(extra || {})) {
    if (!secret || typeof secret !== 'object' || Array.isArray(secret)) continue;
    result[id] = { ...(result[id] || {}), ...Object.fromEntries(SECRET_FIELDS.filter(field => Object.hasOwn(secret, field)).map(field => [field, secret[field]])) };
  }
  return result;
}
function pruneSecretMap(secretMap, profiles) {
  const allowed = new Set((profiles || []).map((profile, index) => profileKey(profile, index)));
  return Object.fromEntries(Object.entries(secretMap || {}).filter(([id]) => allowed.has(String(id))));
}

export function createProxyPersistence(options = {}) {
  const local = options.localStorage || browserStorage('localStorage');
  const session = options.sessionStorage || browserStorage('sessionStorage');
  const storageKeys = PROXY_PERSISTENCE_KEYS;

  const rememberEnabled = () => read(local, storageKeys.rememberSecrets) === 'true';

  function canonicalProfiles() {
    const value = parseJSON(read(local, storageKeys.profilesCanonical), []);
    return Array.isArray(value) ? value.map(normalizeMetadata).filter(Boolean) : [];
  }

  function getProfiles() {
    const profiles = canonicalProfiles();
    const persistent = rememberEnabled() ? readMap(local, storageKeys.profileSecretsPersistent) : {};
    const perSession = readMap(session, storageKeys.profileSecretsSession);
    const secrets = mergeSecretMaps(persistent, perSession);
    return profiles.map((profile, index) => {
      const key = profileKey(profile, index);
      const merged = Object.hasOwn(secrets, key) ? { ...profile, ...secrets[key] } : { ...profile };
      if (!Object.prototype.hasOwnProperty.call(merged, 'password')) merged.password = '';
      return merged;
    });
  }

  // Web Storage has no multi-key transaction. Restore owned keys on a failed
  // synchronous write where possible; never report success on a partial write.
  function mutate(work) {
    options.assertWriteAllowed?.("proxy.mutate");
    const snapshot = [local, session].map(storage => [storage, Object.values(storageKeys).map(key => [key, storage.getItem(key)])]);
    try { return work(); }
    catch (error) {
      let rollbackFailed = false;
      for (const [storage, entries] of snapshot) for (const [key, value] of entries) {
        try { if (storage.getItem(key) !== value) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } }
        catch { rollbackFailed = true; }
      }
      throw new Error(rollbackFailed ? 'Không thể lưu cấu hình Proxy; khôi phục dữ liệu chưa hoàn tất.' : 'Không thể lưu cấu hình Proxy.', { cause: error });
    }
  }
  function setProfiles(input) { return mutate(() => setProfilesInternal(input)); }
  function setProfilesInternal(input) {
    const previousRequired = readSet(local, storageKeys.profileSecretRequired);
    const previousSessionSecrets = readMap(session, storageKeys.profileSecretsSession);
    const previousPersistentSecrets = readMap(local, storageKeys.profileSecretsPersistent);
    validateProfiles(input);
    const split = splitProfiles(input);
    const ids = new Set(split.profiles.map((profile, index) => profileKey(profile, index)));
    const oldProfiles = new Map(canonicalProfiles().map(profile => [profile.id, profile]));
    for (const profile of split.profiles) {
      const old = oldProfiles.get(profile.id);
      if (old && (old.url !== profile.url || old.protocol !== profile.protocol)) {
        delete previousSessionSecrets[profile.id];
        delete previousPersistentSecrets[profile.id];
        previousRequired.delete(profile.id);
      }
    }

    const sessionSecrets = pruneSecretMap(
      mergeSecretMaps(previousSessionSecrets, split.secrets),
      split.profiles,
    );
    for (const id of Object.keys(split.presentSecretFields)) {
      if (!split.nonEmptySecretIds.has(id)) delete sessionSecrets[id];
    }

    const nextRequired = new Set();
    for (const id of ids) {
      if (split.nonEmptySecretIds.has(id)) nextRequired.add(id);
      else if (!split.presentSecretFields[id] && previousRequired.has(id)) nextRequired.add(id);
    }

    write(local, storageKeys.profilesCanonical, JSON.stringify(split.profiles));
    writeMap(session, storageKeys.profileSecretsSession, sessionSecrets);
    remove(local, storageKeys.profilesLegacy);
    remove(session, storageKeys.profilesLegacy);
    writeSet(local, storageKeys.profileSecretRequired, nextRequired);

    if (rememberEnabled()) {
      const persistentSecrets = pruneSecretMap(
        mergeSecretMaps(previousPersistentSecrets, split.secrets),
        split.profiles,
      );
      for (const id of Object.keys(split.presentSecretFields)) {
        if (!split.nonEmptySecretIds.has(id)) delete persistentSecrets[id];
      }
      writeMap(local, storageKeys.profileSecretsPersistent, persistentSecrets);
    } else {
      remove(local, storageKeys.profileSecretsPersistent);
    }
    return getProfiles();
  }

  function getPassword() {
    const current = read(session, storageKeys.proxyPasswordLegacy);
    if (current !== null && current !== '') return current;
    if (rememberEnabled()) return read(local, storageKeys.proxyPasswordPersistent) || '';
    return current || '';
  }

  function setPassword(value) { return mutate(() => setPasswordInternal(value)); }
  function setPasswordInternal(value) {
    const textValue = String(value ?? '');
    write(session, storageKeys.proxyPasswordLegacy, textValue);
    remove(local, storageKeys.proxyPasswordLegacy);
    if (rememberEnabled() && textValue) write(local, storageKeys.proxyPasswordPersistent, textValue);
    else if (!textValue || !rememberEnabled()) remove(local, storageKeys.proxyPasswordPersistent);
    return textValue;
  }

  function setRememberSecrets(enabled) { return mutate(() => setRememberSecretsInternal(enabled)); }
  function setRememberSecretsInternal(enabled) {
    const next = Boolean(enabled);
    write(local, storageKeys.rememberSecrets, next ? 'true' : 'false');
    if (!next) {
      remove(local, storageKeys.profileSecretsPersistent);
      remove(local, storageKeys.proxyPasswordPersistent);
      return false;
    }

    const split = splitProfiles(getProfiles());
    writeMap(local, storageKeys.profileSecretsPersistent, pruneSecretMap(split.secrets, split.profiles));
    const password = read(session, storageKeys.proxyPasswordLegacy);
    if (password) write(local, storageKeys.proxyPasswordPersistent, password);
    return true;
  }

  function getProfileStatus(id) {
    const profileId = String(id || '').trim();
    if (!profileId) return { profileId: '', requiresSecret: false, hasSecret: false, profile: null };
    const required = readSet(local, storageKeys.profileSecretRequired).has(profileId);
    const profile = getProfiles().find(item => String(item.id || '') === profileId) || null;
    const hasSecret = Boolean(profile && SECRET_FIELDS.some(field => String(profile[field] ?? '').trim()));
    return { profileId, requiresSecret: required, hasSecret, profile };
  }

  function clearProfiles() { return mutate(clearProfilesInternal); }
  function clearProfilesInternal() {
    remove(local, storageKeys.profilesCanonical);
    remove(local, storageKeys.profilesLegacy);
    remove(session, storageKeys.profilesLegacy);
    remove(session, storageKeys.profileSecretsSession);
    remove(local, storageKeys.profileSecretsPersistent);
    remove(local, storageKeys.profileSecretRequired);
  }

  function migrateLegacyState() { return mutate(migrateLegacyStateInternal); }
  function migrateLegacyStateInternal() {
    const canonicalRaw = parseJSON(read(local, storageKeys.profilesCanonical), null);
    const legacyLocalRaw = parseJSON(read(local, storageKeys.profilesLegacy), null);
    const legacySessionRaw = parseJSON(read(session, storageKeys.profilesLegacy), null);
    const source = Array.isArray(canonicalRaw)
      ? canonicalRaw
      : Array.isArray(legacyLocalRaw)
        ? legacyLocalRaw
        : Array.isArray(legacySessionRaw) ? legacySessionRaw : [];

    const sourceSplit = splitProfiles(source);
    const localSplit = splitProfiles(Array.isArray(legacyLocalRaw) ? legacyLocalRaw : []);
    const sessionSplit = splitProfiles(Array.isArray(legacySessionRaw) ? legacySessionRaw : []);
    const canonicalIds = new Set(sourceSplit.profiles.map((profile, index) => profileKey(profile, index)));
    const onlyCanonical = secrets => Object.fromEntries(
      Object.entries(secrets || {}).filter(([id]) => canonicalIds.has(String(id))),
    );

    const existingSessionSecrets = readMap(session, storageKeys.profileSecretsSession);
    const combinedSessionSecrets = pruneSecretMap(
      mergeSecretMaps(
        mergeSecretMaps(
          mergeSecretMaps(existingSessionSecrets, onlyCanonical(sourceSplit.secrets)),
          onlyCanonical(localSplit.secrets),
        ),
        onlyCanonical(sessionSplit.secrets),
      ),
      sourceSplit.profiles,
    );

    write(local, storageKeys.profilesCanonical, JSON.stringify(sourceSplit.profiles));
    writeMap(session, storageKeys.profileSecretsSession, combinedSessionSecrets);
    remove(local, storageKeys.profilesLegacy);
    remove(session, storageKeys.profilesLegacy);

    const required = readSet(local, storageKeys.profileSecretRequired);
    for (const id of sourceSplit.nonEmptySecretIds) required.add(id);
    for (const id of localSplit.nonEmptySecretIds) if (canonicalIds.has(id)) required.add(id);
    for (const id of sessionSplit.nonEmptySecretIds) if (canonicalIds.has(id)) required.add(id);
    for (const id of Array.from(required)) if (!canonicalIds.has(id)) required.delete(id);
    writeSet(local, storageKeys.profileSecretRequired, required);

    const legacyPassword = read(local, storageKeys.proxyPasswordLegacy);
    if (legacyPassword) {
      write(session, storageKeys.proxyPasswordLegacy, legacyPassword);
      if (rememberEnabled()) write(local, storageKeys.proxyPasswordPersistent, legacyPassword);
      remove(local, storageKeys.proxyPasswordLegacy);
    }
    if (!rememberEnabled()) {
      remove(local, storageKeys.profileSecretsPersistent);
      remove(local, storageKeys.proxyPasswordPersistent);
    }
  }

  function exportProfilesForBackup() {
    return JSON.stringify(getProfiles());
  }
  function importProfilesFromBackup(raw) {
    const parsed = parseJSON(String(raw ?? ''), null);
    if (!Array.isArray(parsed)) throw new TypeError('Proxy profile backup must be an array.');
    setProfiles(parsed);
    return true;
  }
  function exportPasswordForBackup() {
    return getPassword();
  }
  function importPasswordFromBackup(raw) {
    setPassword(String(raw ?? ''));
    return true;
  }

  try { if (options.migrateOnCreate !== false) migrateLegacyState(); } catch { console.warn('[Proxy] Legacy storage migration could not be completed.'); }

  return Object.freeze({
    getProfiles,
    getOwnedStorageKeys: () => Object.values(storageKeys),
    validateProfiles,
    setProfiles,
    clearProfiles,
    getPassword,
    setPassword,
    getRememberSecrets: rememberEnabled,
    setRememberSecrets,
    getProfileStatus,
    exportProfilesForBackup,
    importProfilesFromBackup,
    exportPasswordForBackup,
    importPasswordFromBackup,
    migrateLegacyState,
  });
}
