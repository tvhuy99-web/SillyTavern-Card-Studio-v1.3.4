/** Host-owned variable, scoped storage and extension mutations. */
export const STATE_RPC_METHODS = Object.freeze([
  'variables.replace', 'storage.set', 'storage.remove', 'storage.clear',
  'extension.settings.save', 'character.data.get', 'character.data.save',
  'character.extension.write', 'regex.replace',
]);

export const EXTENSION_LIFECYCLE_RPC_METHODS = Object.freeze([
  'extension.install', 'extension.reinstall', 'extension.update', 'extension.uninstall',
]);

export function createStateRpcHandlers({ readState, saveSession, persistMessages, resolveIndex,
  normalizeScope, variableStorageKey, webStorageKey, readRecord, writeRecord, readContext,
  getStorage, validatePayload, clone, publish, now = Date.now, parseRegexImport }) {
  const assertCurrent = lease => lease?.assertCurrent();
  async function saveExtensionSettings(settings, lease) {
    assertCurrent(lease);
    validatePayload(settings);
    const clean = clone(settings);
    readState().setSessionData({ extensionSettings: clean });
    await saveSession?.({ extensionSettings: clean });
    assertCurrent(lease);
    return clone(clean);
  }
  async function replaceVariables(option, variables, lease) {
    assertCurrent(lease);
    validatePayload(variables);
    const state = readState(), scope = normalizeScope(option), clean = clone(variables || {});
    let key = scope.type, publishedValue = clean;
    if (scope.type === 'chat') {
      state.setVariables(clean);
      await saveSession?.({ variables: clean });
    } else if (scope.type === 'message') {
      const index = resolveIndex(scope.message_id, state.messages.length);
      if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) throw new Error('Message variable scope is out of range.');
      key = `message:${index}`;
      const messageId = state.messages[index].id;
      await persistMessages(state.messages.map((message, messageIndex) => messageIndex === index ? { ...message, contextState: clean } : message));
      assertCurrent(lease);
      const current = readState().messages[index];
      // A later mutation may have replaced the scope while persistence awaited.
      // Publish only the current state for the same message, never stale input.
      if (!current || current.id !== messageId) return clean;
      publishedValue = clone(current.contextState || {});
    } else {
      const storageKey = variableStorageKey(scope, readContext());
      if (!storageKey) throw new Error(`Unsupported variable scope: ${scope.type}`);
      if (scope.type === 'script') key = `script:${scope.script_id || 'default'}`;
      if (scope.type === 'extension') key = `extension:${scope.extension_id || 'unknown'}`;
      writeRecord(getStorage('local'), storageKey, clean);
    }
    assertCurrent(lease);
    if (scope.type !== 'chat') publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload: { variableScopes: { [key]: publishedValue } } });
    return clean;
  }
  function mutateStorage(method, args, lease) {
    assertCurrent(lease);
    const type = args.storageType === 'session' ? 'session' : 'local';
    const storage = getStorage(type), key = webStorageKey(type, readContext());
    // Null-prototype records keep arbitrary web Storage keys (including __proto__) inert.
    const record = Object.assign(Object.create(null), readRecord(storage, key));
    const item = String(args.key || '').slice(0, 500);
    if (method === 'storage.set') record[item] = String(args.value ?? '').slice(0, 1e6);
    else if (method === 'storage.remove') delete record[item];
    else for (const name of Object.keys(record)) delete record[name];
    writeRecord(storage, key, record);
    return true;
  }
  async function writeCharacterExtensions(state, extensions, lease) {
    assertCurrent(lease);
    const card = { ...state.card, extensions };
    const extensionSettings = { ...state.extensionSettings, __cardRuntimeCardExtensions: extensions };
    state.setSessionData({ card, extensionSettings });
    await saveSession?.({ extensionSettings });
    assertCurrent(lease);
  }
  async function dispatch(method, args, lease) {
    assertCurrent(lease);
    switch (method) {
      case 'extension.install': case 'extension.reinstall': case 'extension.update': case 'extension.uninstall': {
        const state = readState();
        const extensions = Object.assign(Object.create(null), clone(state.extensionSettings.__cardRuntimeExtensions || {}));
        const uninstall = method === 'extension.uninstall';
        const basename = String(args.id || args.url || 'extension').replace(/\/$/, '').split('/').pop() || 'extension';
        const id = uninstall ? String(args.id || '') : String(args.id || `third-party/${basename.replace(/\.git$/i, '')}`);
        const previous = extensions[id];
        const next = uninstall ? { ...(previous || { id, type: 'third-party' }), installed: false, enabled: false }
          : { ...previous, id, url: args.url || previous?.url || '', type: args.extensionType || previous?.type || 'third-party', installed: true, enabled: true, updatedAt: now() };
        if (uninstall) delete extensions[id]; else extensions[id] = next;
        await saveExtensionSettings({ ...state.extensionSettings, __cardRuntimeExtensions: extensions }, lease);
        return next;
      }
      case 'raw.import.regex': {
        const card = readState().card;
        if (!card) throw Error('No character is loaded.');
        const key = card.fileName || card.name;
        const parsed = await parseRegexImport(args.content);
        assertCurrent(lease);
        const latest = readState().card;
        if (!latest || (latest.fileName || latest.name) !== key) throw Error('Character changed during regex import.');
        const regexes = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.regex_scripts) ? parsed.regex_scripts
          : Array.isArray(parsed?.extensions?.regex_scripts) ? parsed.extensions.regex_scripts : parsed && typeof parsed === 'object' ? [parsed] : [];
        if (!regexes.length) throw Error('Regex import did not contain any scripts.');
        return { ok: true, regexes: await dispatch('regex.replace', { regexes }, lease) };
      }
      case 'variables.replace': return replaceVariables(args.option, args.variables || {}, lease);
      case 'storage.set': case 'storage.remove': case 'storage.clear': return mutateStorage(method, args, lease);
      case 'extension.settings.save': return saveExtensionSettings(args.settings || {}, lease);
      case 'character.data.get': return clone(readState().extensionSettings.__cardRuntimeCharacterData || {});
      case 'character.data.save': return saveExtensionSettings({ ...readState().extensionSettings, __cardRuntimeCharacterData: clone(args.data || {}) }, lease);
      case 'character.extension.write': {
        const state = readState(), key = String(args.key || '').slice(0, 200);
        if (!key || !state.card) throw new Error('A character extension key and loaded character are required.');
        await writeCharacterExtensions(state, { ...state.card.extensions, [key]: clone(args.value) }, lease);
        return true;
      }
      case 'regex.replace': {
        const state = readState();
        if (!state.card) throw new Error('No character is loaded.');
        const regexes = Array.isArray(args.regexes) ? clone(args.regexes.slice(0, 1000)) : [];
        await writeCharacterExtensions(state, { ...state.card.extensions, regex_scripts: regexes }, lease);
        return regexes;
      }
      default: throw new Error(`Unsupported state RPC: ${method}`);
    }
  }
  return Object.freeze({ dispatch, saveExtensionSettings });
}
