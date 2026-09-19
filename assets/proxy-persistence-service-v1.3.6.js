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
  try { storage.setItem(key, String(value)); return true; } catch (_) { return false; }
}
function remove(storage, key) {
  try { storage.removeItem(key); } catch (_) {}
}
function readMap(storage, key) {
  const value = parseJSON(read(storage, key), {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
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
function splitProfiles(input) {
  const profiles = [];
  const secrets = {};
  const presentSecretFields = {};
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
  const result = { ...(base || {}) };
  for (const [id, secret] of Object.entries(extra || {})) {
    if (!secret || typeof secret !== 'object' || Array.isArray(secret)) continue;
    result[id] = { ...(result[id] || {}), ...secret };
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
  const K = PROXY_PERSISTENCE_KEYS;

  const rememberEnabled = () => read(local, K.rememberSecrets) === 'true';

  function canonicalProfiles() {
    const value = parseJSON(read(local, K.profilesCanonical), []);
    return Array.isArray(value) ? value.map(normalizeMetadata).filter(Boolean) : [];
  }

  function getProfiles() {
    const profiles = canonicalProfiles();
    const persistent = rememberEnabled() ? readMap(local, K.profileSecretsPersistent) : {};
    const perSession = readMap(session, K.profileSecretsSession);
    const secrets = mergeSecretMaps(persistent, perSession);
    return profiles.map((profile, index) => {
      const key = profileKey(profile, index);
      const merged = secrets[key] ? { ...profile, ...secrets[key] } : { ...profile };
      if (!Object.prototype.hasOwnProperty.call(merged, 'password')) merged.password = '';
      return merged;
    });
  }

  function setProfiles(input) {
    const previousRequired = readSet(local, K.profileSecretRequired);
    const previousSessionSecrets = readMap(session, K.profileSecretsSession);
    const previousPersistentSecrets = readMap(local, K.profileSecretsPersistent);
    const split = splitProfiles(input);
    const ids = new Set(split.profiles.map((profile, index) => profileKey(profile, index)));

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

    write(local, K.profilesCanonical, JSON.stringify(split.profiles));
    writeMap(session, K.profileSecretsSession, sessionSecrets);
    remove(local, K.profilesLegacy);
    remove(session, K.profilesLegacy);
    writeSet(local, K.profileSecretRequired, nextRequired);

    if (rememberEnabled()) {
      const persistentSecrets = pruneSecretMap(
        mergeSecretMaps(previousPersistentSecrets, split.secrets),
        split.profiles,
      );
      for (const id of Object.keys(split.presentSecretFields)) {
        if (!split.nonEmptySecretIds.has(id)) delete persistentSecrets[id];
      }
      writeMap(local, K.profileSecretsPersistent, persistentSecrets);
    } else {
      remove(local, K.profileSecretsPersistent);
    }
    return getProfiles();
  }

  function getPassword() {
    const current = read(session, K.proxyPasswordLegacy);
    if (current !== null && current !== '') return current;
    if (rememberEnabled()) return read(local, K.proxyPasswordPersistent) || '';
    return current || '';
  }

  function setPassword(value) {
    const textValue = String(value ?? '');
    write(session, K.proxyPasswordLegacy, textValue);
    remove(local, K.proxyPasswordLegacy);
    if (rememberEnabled() && textValue) write(local, K.proxyPasswordPersistent, textValue);
    else if (!textValue || !rememberEnabled()) remove(local, K.proxyPasswordPersistent);
    return textValue;
  }

  function setRememberSecrets(enabled) {
    const next = Boolean(enabled);
    write(local, K.rememberSecrets, next ? 'true' : 'false');
    if (!next) {
      remove(local, K.profileSecretsPersistent);
      remove(local, K.proxyPasswordPersistent);
      return false;
    }

    const split = splitProfiles(getProfiles());
    writeMap(local, K.profileSecretsPersistent, pruneSecretMap(split.secrets, split.profiles));
    const password = read(session, K.proxyPasswordLegacy);
    if (password) write(local, K.proxyPasswordPersistent, password);
    return true;
  }

  function getProfileStatus(id) {
    const profileId = String(id || '').trim();
    if (!profileId) return { profileId: '', requiresSecret: false, hasSecret: false, profile: null };
    const required = readSet(local, K.profileSecretRequired).has(profileId);
    const profile = getProfiles().find(item => String(item.id || '') === profileId) || null;
    const hasSecret = Boolean(profile && SECRET_FIELDS.some(field => String(profile[field] ?? '').trim()));
    return { profileId, requiresSecret: required, hasSecret, profile };
  }

  function clearProfiles() {
    remove(local, K.profilesCanonical);
    remove(local, K.profilesLegacy);
    remove(session, K.profilesLegacy);
    remove(session, K.profileSecretsSession);
    remove(local, K.profileSecretsPersistent);
    remove(local, K.profileSecretRequired);
  }

  function migrateLegacyState() {
    const canonicalRaw = parseJSON(read(local, K.profilesCanonical), null);
    const legacyLocalRaw = parseJSON(read(local, K.profilesLegacy), null);
    const legacySessionRaw = parseJSON(read(session, K.profilesLegacy), null);
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

    const existingSessionSecrets = readMap(session, K.profileSecretsSession);
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

    write(local, K.profilesCanonical, JSON.stringify(sourceSplit.profiles));
    writeMap(session, K.profileSecretsSession, combinedSessionSecrets);
    remove(local, K.profilesLegacy);
    remove(session, K.profilesLegacy);

    const required = readSet(local, K.profileSecretRequired);
    for (const id of sourceSplit.nonEmptySecretIds) required.add(id);
    for (const id of localSplit.nonEmptySecretIds) if (canonicalIds.has(id)) required.add(id);
    for (const id of sessionSplit.nonEmptySecretIds) if (canonicalIds.has(id)) required.add(id);
    for (const id of Array.from(required)) if (!canonicalIds.has(id)) required.delete(id);
    writeSet(local, K.profileSecretRequired, required);

    const legacyPassword = read(local, K.proxyPasswordLegacy);
    if (legacyPassword) {
      write(session, K.proxyPasswordLegacy, legacyPassword);
      if (rememberEnabled()) write(local, K.proxyPasswordPersistent, legacyPassword);
      remove(local, K.proxyPasswordLegacy);
    }
    if (!rememberEnabled()) {
      remove(local, K.profileSecretsPersistent);
      remove(local, K.proxyPasswordPersistent);
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

  migrateLegacyState();

  return Object.freeze({
    getProfiles,
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

export const proxyPersistence = createProxyPersistence();
