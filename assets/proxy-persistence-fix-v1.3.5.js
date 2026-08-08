(() => {
  'use strict';

  if (window.__STS_PROXY_PERSISTENCE__?.version) return;

  const KEYS = {
    profiles: 'sillyTavernStudio_proxyProfiles',
    profilesCanonical: 'sillyTavernStudio_proxyProfilesV2',
    profileSecretsSession: 'sillyTavernStudio_proxyProfileSecrets',
    profileSecretsPersistent: 'sillyTavernStudio_proxyProfileSecretsPersistent',
    profileSecretRequired: 'sillyTavernStudio_proxyProfileSecretRequired',
    rememberSecrets: 'sillyTavernStudio_proxyRememberSecrets',
    proxyPassword: 'sillyTavernStudio_proxyPassword',
    proxyPasswordPersistent: 'sillyTavernStudio_proxyPasswordPersistent',
    connection: 'sillyTavernStudio_globalConnection'
  };

  const SECRET_FIELDS = ['password', 'apiKey', 'api_key', 'token', 'authorization'];
  const original = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };

  const local = window.localStorage;
  const session = window.sessionStorage;
  let sessionMirrorPending = false;
  let refreshTimer = 0;

  const parseJSON = (value, fallback) => {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };

  const profileKey = (profile, index = 0) => {
    const explicit = profile && (profile.id ?? profile.profileId ?? profile.name);
    return explicit === undefined || explicit === null || String(explicit).trim() === ''
      ? `__index:${index}`
      : String(explicit);
  };

  const readMap = (storage, key) => {
    const value = parseJSON(original.getItem.call(storage, key), {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  const readSet = key => {
    const value = parseJSON(original.getItem.call(local, key), []);
    return new Set(Array.isArray(value) ? value.map(String) : []);
  };

  const writeSet = (key, values) => {
    original.setItem.call(local, key, JSON.stringify(Array.from(values)));
  };

  const rememberEnabled = () => original.getItem.call(local, KEYS.rememberSecrets) === 'true';

  function splitProfiles(input) {
    const profiles = [];
    const secrets = {};
    const presentSecretFields = {};
    const nonEmptySecretIds = new Set();

    (Array.isArray(input) ? input : []).forEach((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      const profile = { ...raw };
      const key = profileKey(profile, index);
      const secret = {};
      let hasSecretField = false;
      let hasNonEmptySecret = false;

      for (const field of SECRET_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(profile, field)) continue;
        hasSecretField = true;
        const value = profile[field];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          secret[field] = value;
          hasNonEmptySecret = true;
        }
        delete profile[field];
      }

      if (hasSecretField) presentSecretFields[key] = true;
      if (hasNonEmptySecret) {
        secrets[key] = secret;
        nonEmptySecretIds.add(key);
      }
      profiles.push(profile);
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
    const allowed = new Set(profiles.map((profile, index) => profileKey(profile, index)));
    return Object.fromEntries(Object.entries(secretMap || {}).filter(([id]) => allowed.has(String(id))));
  }

  function canonicalProfiles() {
    const value = parseJSON(original.getItem.call(local, KEYS.profilesCanonical), []);
    return Array.isArray(value) ? value : [];
  }

  function mergedProfiles() {
    const profiles = canonicalProfiles();
    const persistent = rememberEnabled() ? readMap(local, KEYS.profileSecretsPersistent) : {};
    const perSession = readMap(session, KEYS.profileSecretsSession);
    const secrets = mergeSecretMaps(persistent, perSession);

    return profiles.map((profile, index) => {
      const key = profileKey(profile, index);
      return secrets[key] ? { ...profile, ...secrets[key] } : { ...profile };
    });
  }

  function writeProfiles(input) {
    const previousRequired = readSet(KEYS.profileSecretRequired);
    const previousSessionSecrets = readMap(session, KEYS.profileSecretsSession);
    const previousPersistentSecrets = readMap(local, KEYS.profileSecretsPersistent);
    const split = splitProfiles(input);
    const ids = new Set(split.profiles.map((profile, index) => profileKey(profile, index)));

    const sessionSecrets = pruneSecretMap(
      mergeSecretMaps(previousSessionSecrets, split.secrets),
      split.profiles
    );
    for (const id of Object.keys(split.presentSecretFields)) {
      if (!split.nonEmptySecretIds.has(id)) delete sessionSecrets[id];
    }

    const nextRequired = new Set();
    for (const id of ids) {
      if (split.nonEmptySecretIds.has(id)) nextRequired.add(id);
      else if (split.presentSecretFields[id]) {
        // Explicitly saving an empty secret means this profile no longer requires a stored secret.
      } else if (previousRequired.has(id)) nextRequired.add(id);
    }

    original.setItem.call(local, KEYS.profilesCanonical, JSON.stringify(split.profiles));
    original.setItem.call(session, KEYS.profileSecretsSession, JSON.stringify(sessionSecrets));
    original.removeItem.call(local, KEYS.profiles);
    original.removeItem.call(session, KEYS.profiles);
    writeSet(KEYS.profileSecretRequired, nextRequired);

    if (rememberEnabled()) {
      const persistentSecrets = pruneSecretMap(
        mergeSecretMaps(previousPersistentSecrets, split.secrets),
        split.profiles
      );
      for (const id of Object.keys(split.presentSecretFields)) {
        if (!split.nonEmptySecretIds.has(id)) delete persistentSecrets[id];
      }
      original.setItem.call(local, KEYS.profileSecretsPersistent, JSON.stringify(persistentSecrets));
    } else {
      original.removeItem.call(local, KEYS.profileSecretsPersistent);
    }
  }

  function migrateLegacyState() {
    const canonicalRaw = original.getItem.call(local, KEYS.profilesCanonical);
    const legacyLocalRaw = original.getItem.call(local, KEYS.profiles);
    const legacySessionRaw = original.getItem.call(session, KEYS.profiles);
    const canonical = parseJSON(canonicalRaw, null);
    const legacyLocal = parseJSON(legacyLocalRaw, null);
    const legacySession = parseJSON(legacySessionRaw, null);

    const source = Array.isArray(canonical)
      ? canonical
      : Array.isArray(legacyLocal)
        ? legacyLocal
        : Array.isArray(legacySession) ? legacySession : [];

    const sourceSplit = splitProfiles(source);
    const localSplit = splitProfiles(Array.isArray(legacyLocal) ? legacyLocal : []);
    const sessionSplit = splitProfiles(Array.isArray(legacySession) ? legacySession : []);
    const canonicalIds = new Set(sourceSplit.profiles.map((profile, index) => profileKey(profile, index)));
    const onlyCanonicalIds = secrets => Object.fromEntries(
      Object.entries(secrets || {}).filter(([id]) => canonicalIds.has(String(id)))
    );

    const existingSessionSecrets = readMap(session, KEYS.profileSecretsSession);
    const combinedSessionSecrets = pruneSecretMap(
      mergeSecretMaps(
        mergeSecretMaps(
          mergeSecretMaps(existingSessionSecrets, onlyCanonicalIds(sourceSplit.secrets)),
          onlyCanonicalIds(localSplit.secrets)
        ),
        onlyCanonicalIds(sessionSplit.secrets)
      ),
      sourceSplit.profiles
    );

    original.setItem.call(local, KEYS.profilesCanonical, JSON.stringify(sourceSplit.profiles));
    original.setItem.call(session, KEYS.profileSecretsSession, JSON.stringify(combinedSessionSecrets));
    original.removeItem.call(local, KEYS.profiles);
    original.removeItem.call(session, KEYS.profiles);

    const required = readSet(KEYS.profileSecretRequired);
    for (const id of sourceSplit.nonEmptySecretIds) required.add(id);
    for (const id of localSplit.nonEmptySecretIds) {
      if (canonicalIds.has(id)) required.add(id);
    }
    for (const id of sessionSplit.nonEmptySecretIds) {
      if (canonicalIds.has(id)) required.add(id);
    }
    for (const id of Array.from(required)) {
      if (!canonicalIds.has(id)) required.delete(id);
    }
    writeSet(KEYS.profileSecretRequired, required);

    const legacyPassword = original.getItem.call(local, KEYS.proxyPassword);
    if (legacyPassword) {
      original.setItem.call(session, KEYS.proxyPassword, legacyPassword);
      if (rememberEnabled()) original.setItem.call(local, KEYS.proxyPasswordPersistent, legacyPassword);
      original.removeItem.call(local, KEYS.proxyPassword);
    }

    if (!rememberEnabled()) {
      original.removeItem.call(local, KEYS.profileSecretsPersistent);
      original.removeItem.call(local, KEYS.proxyPasswordPersistent);
    } else {
      const persistent = pruneSecretMap(
        mergeSecretMaps(
          mergeSecretMaps(readMap(local, KEYS.profileSecretsPersistent), onlyCanonicalIds(sourceSplit.secrets)),
          onlyCanonicalIds(localSplit.secrets)
        ),
        sourceSplit.profiles
      );
      original.setItem.call(local, KEYS.profileSecretsPersistent, JSON.stringify(persistent));
    }
  }

  function clearProfiles() {
    original.removeItem.call(local, KEYS.profilesCanonical);
    original.removeItem.call(local, KEYS.profiles);
    original.removeItem.call(session, KEYS.profiles);
    original.removeItem.call(session, KEYS.profileSecretsSession);
    original.removeItem.call(local, KEYS.profileSecretsPersistent);
    original.removeItem.call(local, KEYS.profileSecretRequired);
  }

  const clearMirrorFlagSoon = () => {
    const clear = () => { sessionMirrorPending = false; };
    if (typeof queueMicrotask === 'function') queueMicrotask(clear);
    else Promise.resolve().then(clear);
  };

  migrateLegacyState();

  Storage.prototype.getItem = function patchedGetItem(key) {
    if (key === KEYS.profiles && (this === local || this === session)) {
      return JSON.stringify(mergedProfiles());
    }

    if (key === KEYS.proxyPassword && this === session) {
      const current = original.getItem.call(session, key);
      if (current !== null && current !== '') return current;
      if (rememberEnabled()) return original.getItem.call(local, KEYS.proxyPasswordPersistent);
      return current;
    }

    return original.getItem.call(this, key);
  };

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (key === KEYS.profiles && (this === local || this === session)) {
      const parsed = parseJSON(String(value), null);
      if (!Array.isArray(parsed)) {
        console.warn('[Proxy persistence] Ignored invalid proxyProfiles write; expected an array.');
        return;
      }
      writeProfiles(parsed);
      if (this === session) {
        sessionMirrorPending = true;
        clearMirrorFlagSoon();
      } else {
        sessionMirrorPending = false;
      }
      refreshUiSoon();
      return;
    }

    if (key === KEYS.proxyPassword && (this === local || this === session)) {
      const text = String(value ?? '');
      original.setItem.call(session, KEYS.proxyPassword, text);
      original.removeItem.call(local, KEYS.proxyPassword);
      if (rememberEnabled() && text) original.setItem.call(local, KEYS.proxyPasswordPersistent, text);
      else if (!text || !rememberEnabled()) original.removeItem.call(local, KEYS.proxyPasswordPersistent);
      refreshUiSoon();
      return;
    }

    return original.setItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    if (key === KEYS.profiles && this === session) {
      original.removeItem.call(session, KEYS.profiles);
      return;
    }

    if (key === KEYS.profiles && this === local) {
      if (sessionMirrorPending) {
        // Legacy startup code mirrors local -> session and immediately removes local.
        // Keep the V2 canonical data and only consume the obsolete facade cleanup.
        sessionMirrorPending = false;
        original.removeItem.call(local, KEYS.profiles);
        original.removeItem.call(session, KEYS.profiles);
        return;
      }
      clearProfiles();
      refreshUiSoon();
      return;
    }

    if (key === KEYS.proxyPassword && (this === local || this === session)) {
      original.removeItem.call(this, key);
      if (this === local) original.removeItem.call(local, KEYS.proxyPassword);
      refreshUiSoon();
      return;
    }

    return original.removeItem.call(this, key);
  };

  function setRememberSecrets(enabled) {
    const next = !!enabled;
    original.setItem.call(local, KEYS.rememberSecrets, next ? 'true' : 'false');

    if (!next) {
      original.removeItem.call(local, KEYS.profileSecretsPersistent);
      original.removeItem.call(local, KEYS.proxyPasswordPersistent);
    } else {
      const currentProfiles = mergedProfiles();
      const split = splitProfiles(currentProfiles);
      const persistent = pruneSecretMap(split.secrets, split.profiles);
      original.setItem.call(local, KEYS.profileSecretsPersistent, JSON.stringify(persistent));
      const currentPassword = original.getItem.call(session, KEYS.proxyPassword);
      if (currentPassword) original.setItem.call(local, KEYS.proxyPasswordPersistent, currentPassword);
    }

    refreshUiSoon();
  }

  function selectedProfileId(root = document) {
    const select = root.querySelector?.('select[aria-label="Cấu hình proxy"], select[aria-label*="Cấu hình Proxy" i], select[aria-label*="Cấu hình proxy" i]');
    if (select && String(select.value || '').trim()) return String(select.value).trim();
    const connection = parseJSON(original.getItem.call(local, KEYS.connection), {});
    return String(connection?.proxy_profile_id || '').trim();
  }

  function profileStatus(id) {
    const profileId = String(id || '').trim();
    if (!profileId) return { profileId: '', requiresSecret: false, hasSecret: false, profile: null };
    const required = readSet(KEYS.profileSecretRequired).has(profileId);
    const profile = mergedProfiles().find(item => String(item?.id ?? item?.profileId ?? item?.name ?? '') === profileId) || null;
    const hasSecret = !!(profile && SECRET_FIELDS.some(field => String(profile[field] ?? '').trim()));
    return { profileId, requiresSecret: required, hasSecret, profile };
  }

  function isProxySecretInput(input, scope = document) {
    if (!input || input.getAttribute?.('data-sts-proxy-persistence-control') === 'true') return false;
    const type = String(input.type || '').toLowerCase();
    if (type && !['text', 'password', 'search', 'url', 'email'].includes(type)) return false;

    const aria = String(input.getAttribute?.('aria-label') || '');
    const placeholder = String(input.getAttribute?.('placeholder') || '');
    let label = '';
    if (input.id) {
      try { label = String(scope.querySelector?.(`label[for="${CSS.escape(input.id)}"]`)?.textContent || ''); } catch {}
    }
    const direct = `${aria} ${placeholder} ${label}`;
    if (/proxy/i.test(direct) && /(password|key|token)/i.test(direct)) return true;
    if (!/(password\s*\/\s*key|proxy password)/i.test(direct)) return false;

    let node = input.parentElement;
    for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
      const text = String(node.textContent || '');
      if (/(proxy url|reverse proxy|giao thức proxy|cấu hình proxy)/i.test(text)) return true;
    }
    return false;
  }

  function passwordField(root = document) {
    const controls = root.querySelectorAll?.('input, textarea') || [];
    for (const input of controls) {
      if (isProxySecretInput(input, root)) return input;
    }
    return null;
  }

  function proxyRootFor(input) {
    return input?.closest?.('[role="dialog"], [role="tabpanel"], .bg-slate-800\\/50, .bg-slate-900\\/50') || document;
  }

  function setStatus(detail, text, color) {
    if (detail.textContent !== text) detail.textContent = text;
    if (detail.style.color !== color) detail.style.color = color;
  }

  function refreshProxyUi() {
    if (!document?.querySelectorAll) return;
    const inputs = Array.from(document.querySelectorAll('input, textarea')).filter(input => isProxySecretInput(input, document));

    for (const input of inputs) {
      const root = proxyRootFor(input);
      const host = input.parentElement || root;
      if (!host || host.querySelector?.(':scope > [data-sts-proxy-persistence-note="true"]')) continue;

      const box = document.createElement('div');
      box.setAttribute('data-sts-proxy-persistence-note', 'true');
      box.style.marginTop = '0.45rem';
      box.style.fontSize = '0.75rem';
      box.style.lineHeight = '1.1rem';
      box.style.color = 'rgb(148 163 184)';

      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.45rem';
      label.style.cursor = 'pointer';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = rememberEnabled();
      checkbox.setAttribute('data-sts-proxy-persistence-control', 'true');
      checkbox.setAttribute('aria-label', 'Ghi nhớ Proxy Password / Key trên thiết bị này');

      const text = document.createElement('span');
      text.textContent = 'Ghi nhớ Password / Key trên thiết bị này';
      label.append(checkbox, text);

      const detail = document.createElement('div');
      detail.setAttribute('data-sts-proxy-persistence-status', 'true');
      detail.style.marginTop = '0.25rem';

      checkbox.addEventListener('change', () => {
        const enabled = checkbox.checked;
        if (enabled) {
          const value = String(input.value || '').trim();
          if (value) original.setItem.call(session, KEYS.proxyPassword, value);
        }
        setRememberSecrets(enabled);
      });

      input.addEventListener('input', () => {
        const value = String(input.value || '');
        original.setItem.call(session, KEYS.proxyPassword, value);
        if (rememberEnabled() && value) original.setItem.call(local, KEYS.proxyPasswordPersistent, value);
        else if (!value) original.removeItem.call(local, KEYS.proxyPasswordPersistent);
        refreshUiSoon();
      });

      box.append(label, detail);
      host.appendChild(box);
    }

    for (const checkbox of document.querySelectorAll('[data-sts-proxy-persistence-control="true"]')) {
      if (checkbox.checked !== rememberEnabled()) checkbox.checked = rememberEnabled();
    }

    for (const detail of document.querySelectorAll('[data-sts-proxy-persistence-status="true"]')) {
      const root = detail.closest?.('[role="dialog"], [role="tabpanel"]') || document;
      const input = passwordField(root);
      const id = selectedProfileId(root);
      const status = profileStatus(id);
      const currentPassword = String(input?.value || original.getItem.call(session, KEYS.proxyPassword) || '').trim();
      const missingRequired = status.requiresSecret && !status.hasSecret && !currentPassword;

      if (missingRequired) {
        setStatus(
          detail,
          'Profile đã được khôi phục, nhưng Password / Key của phiên trước đã hết. Hãy nhập lại để kết nối.',
          'rgb(251 191 36)'
        );
      } else if (rememberEnabled()) {
        setStatus(
          detail,
          'Secret đang được lưu trên thiết bị này. Chỉ bật tùy chọn này trên thiết bị riêng.',
          'rgb(251 191 36)'
        );
      } else {
        setStatus(
          detail,
          'Profile, URL và giao thức được lưu bền vững; Password / Key mặc định chỉ được giữ trong phiên hiện tại.',
          'rgb(148 163 184)'
        );
      }
    }
  }

  function refreshUiSoon() {
    if (typeof window.setTimeout !== 'function') return;
    window.clearTimeout?.(refreshTimer);
    refreshTimer = window.setTimeout(refreshProxyUi, 0);
  }

  function notify(message, type = 'warning') {
    try { window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } })); } catch {}
  }

  function blockMissingCredentialTests(event) {
    const button = event.target?.closest?.('.sts-model-test-button');
    if (!button) return;
    const root = button.closest?.('[role="dialog"], [role="tabpanel"]') || document;
    const context = String(root.textContent || '').toLowerCase();
    if (!context.includes('proxy')) return;

    const id = selectedProfileId(root);
    const status = profileStatus(id);
    if (!status.requiresSecret || status.hasSecret) return;

    const input = passwordField(root);
    const currentPassword = String(input?.value || original.getItem.call(session, KEYS.proxyPassword) || '').trim();
    if (currentPassword) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    notify('Cấu hình proxy đã được khôi phục nhưng Password / Key đã hết phiên. Hãy nhập lại secret hoặc bật “Ghi nhớ Password / Key”.');
    refreshUiSoon();
  }

  document.addEventListener?.('click', blockMissingCredentialTests, true);
  document.addEventListener?.('change', event => {
    if (event.target?.matches?.('select[aria-label*="Cấu hình proxy" i], select[aria-label*="Cấu hình Proxy" i]')) refreshUiSoon();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshProxyUi, { once: true });
  else refreshUiSoon();

  if (typeof MutationObserver === 'function' && document.documentElement) {
    const observer = new MutationObserver(refreshUiSoon);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.__STS_PROXY_PERSISTENCE__ = Object.freeze({
    version: '1.1.0',
    getProfiles: mergedProfiles,
    isRememberingSecrets: rememberEnabled,
    setRememberSecrets,
    getProfileStatus: profileStatus,
    refreshUi: refreshProxyUi
  });
})();
