import assert from 'node:assert/strict';
import { APP_DATABASE, createAppDatabase } from '../src/app/persistence/app-database.js';
import { createEntityRepositories } from '../src/app/persistence/entity-repositories.js';
import {
  MAX_AVATAR_BASE64_LENGTH,
  assertBackupArray,
  createBackupCodec,
  decodeBase64ToBuffer,
  encodeBufferToBase64,
  isPlainObject,
} from '../src/app/persistence/backup-codec.js';
import {
  CROSS_TAB_EVENTS,
  CROSS_TAB_EVENT_TYPES,
  createCrossTabSync,
} from '../src/app/persistence/cross-tab-sync.js';
import {
  BackupRestoreError,
  RESTORE_JOURNAL_KEY,
  RESTORE_STAGES,
  createBackupRestoreService,
} from '../src/app/persistence/backup-restore-service.js';
import {
  createSessionSaveCoordinator,
  createSessionWriteQueue,
} from '../src/app/persistence/session-save-coordinator.js';
import {
  SETTINGS_STORAGE_KEYS,
  createSettingsRepository,
} from '../src/app/state/settings-repository.js';
import {
  PROXY_PERSISTENCE_KEYS,
  createMemoryStorage,
  createProxyPersistence,
} from '../src/providers/proxy/persistence.js';
import {
  CONNECTION_KEYS,
  createConnectionRepository,
} from '../src/providers/common/connection-repository.js';

function createInMemoryIdbDatabase() {
  const stores = Object.fromEntries(Object.keys(APP_DATABASE.stores).map(key => [key, new Map()]));
  const transactions = [];
  let injectRequestError = null;

  const database = {
    stores,
    transactions,
    setNextRequestError(error) {
      injectRequestError = error;
    },
    async read(store, method, args) {
      return structuredClone(method === 'getAll' ? [...stores[store].values()] : stores[store].get(args[0]));
    },
    async transaction(names, mode, work, message = 'Transaction failed') {
      transactions.push({ names, mode });
      const draft = Object.fromEntries(names.map(name => [name, structuredClone(stores[name])]));
      const queue = [];
      let result;
      let abortedError = null;
      const abort = cause => {
        abortedError = cause || new Error(message);
        throw abortedError;
      };
      const makeRequest = executor => {
        const req = {};
        queue.push(() => {
          if (injectRequestError) {
            const err = injectRequestError;
            injectRequestError = null;
            req.error = err;
            if (typeof req.onerror === 'function') {
              req.onerror();
              return;
            }
            throw err;
          }
          req.result = structuredClone(executor());
          req.onsuccess?.();
        });
        return req;
      };
      const tx = {
        objectStore(name) {
          assert.ok(names.includes(name));
          const data = draft[name];
          const keyPath = APP_DATABASE.stores[name];
          const write = (value, add = false) => makeRequest(() => {
            assert.equal(mode, 'readwrite');
            const key = value[keyPath];
            assert.equal(typeof key, 'string');
            if (add && data.has(key)) throw Error('duplicate');
            data.set(key, structuredClone(value));
            return key;
          });
          return {
            get: key => makeRequest(() => data.get(key)),
            getAll: () => makeRequest(() => [...data.values()]),
            put: value => write(value, false),
            add: value => write(value, true),
            delete: key => makeRequest(() => data.delete(key)),
            openCursor() {
              const req = {};
              let keys;
              let index = 0;
              const step = () => {
                if (injectRequestError) {
                  const err = injectRequestError;
                  injectRequestError = null;
                  req.error = err;
                  if (typeof req.onerror === 'function') {
                    req.onerror();
                    return;
                  }
                  throw err;
                }
                keys ??= [...data.keys()];
                const key = keys[index++];
                req.result = key === undefined
                  ? null
                  : {
                    value: structuredClone(data.get(key)),
                    update(value) {
                      return makeRequest(() => {
                        data.set(key, structuredClone(value));
                        return key;
                      });
                    },
                    delete() {
                      return makeRequest(() => data.delete(key));
                    },
                    continue() {
                      queue.push(step);
                    },
                  };
                req.onsuccess?.();
              };
              queue.push(step);
              return req;
            },
          };
        },
      };
      try {
        work(tx, value => { result = value; }, abort);
        while (queue.length) {
          queue.shift()();
        }
        if (mode === 'readwrite') {
          for (const name of names) stores[name] = draft[name];
        }
        return result;
      } catch (cause) {
        throw new Error(message, { cause: abortedError || cause });
      }
    },
  };
  return database;
}

{
  let readRequest;
  let tx;
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    close() {},
    transaction(stores, mode) {
      tx = {
        stores,
        mode,
        abort() { this.onabort?.(); },
        objectStore() {
          return {
            get() {
              readRequest = {};
              return readRequest;
            },
          };
        },
      };
      return tx;
    },
  };
  const indexedDB = {
    open() {
      const req = { result: db };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
  const appDb = createAppDatabase({ indexedDB });
  const pending = appDb.read('characters', 'get', ['c1'], 'read failed');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof readRequest.onerror, 'function', 'app-database read must attach request.onerror');
  readRequest.error = new Error('SimulatedIDBReadError');
  readRequest.onerror();
  await assert.rejects(pending, err => err.message === 'read failed' && err.cause?.message === 'SimulatedIDBReadError');
}

{

  const originalCryptoDesc = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    const dbNoCrypto = createInMemoryIdbDatabase();
    const reposNoCrypto = createEntityRepositories({
      database: dbNoCrypto,
      normalizePreset: value => value,
      normalizePresetList: value => value,
    });
    await reposNoCrypto.sessions.put({ sessionId: 'no-crypto-s1', characterFileName: 'A', chatHistory: [] });
    const stored = await reposNoCrypto.sessions.get('no-crypto-s1');
    assert.equal(typeof stored.__stsRecordGeneration, 'string');
    assert.equal(stored.__stsRecordGeneration.length, 32);
  } finally {
    if (originalCryptoDesc) Object.defineProperty(globalThis, 'crypto', originalCryptoDesc);
  }

  const db = createInMemoryIdbDatabase();
  const repos = createEntityRepositories({
    database: db,
    normalizePreset: value => value,
    normalizePresetList: value => value,
  });

  await repos.characters.put({ fileName: 'hero.png', card: { name: 'Hero' } });
  await repos.presets.put({ name: 'Default', prompts: [] });
  db.stores.chatSessions.set('s-dirty', {
    sessionId: 's-dirty',
    characterFileName: 'hero.png',
    presetName: 'Default',
    chatHistory: [{ id: 'm1', role: 'user', content: 'hello' }],
    logs: { turns: [{ id: 1 }], systemLog: [{ message: 'trace' }] },
    initialDiagnosticLog: 'boot-log',
    futureField: { keep: 123 },
  });
  db.stores.chatSessions.set('s-clean', {
    sessionId: 's-clean',
    characterFileName: 'hero.png',
    presetName: 'Default',
    chatHistory: [{ id: 'm2', role: 'model', content: 'hi' }],
  });
  db.stores.chatSessions.set('s-deleted', {
    sessionId: 's-deleted',
    characterFileName: 'hero.png',
    presetName: 'Default',
    chatHistory: [],
    logs: { turns: [{ id: 9 }] },
  });

  const activeEdit = await repos.openSessionForEditing('s-dirty');
  await repos.sessions.remove('s-deleted');

  const txBeforeCleanup = db.transactions.length;
  const cleanupResult = await repos.cleanupSessionDiagnostics();
  assert.equal(db.transactions.length, txBeforeCleanup + 1, 'cleanupSessionDiagnostics must run in a single transaction');
  assert.deepEqual(db.transactions.at(-1), { names: ['chatSessions'], mode: 'readwrite' });
  assert.deepEqual(cleanupResult, { sessionsCleaned: 1 });

  const cleanedDirty = await repos.sessions.get('s-dirty');
  assert.equal(Object.prototype.hasOwnProperty.call(cleanedDirty, 'logs'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cleanedDirty, 'initialDiagnosticLog'), false);
  assert.deepEqual(cleanedDirty.chatHistory, [{ id: 'm1', role: 'user', content: 'hello' }]);
  assert.deepEqual(cleanedDirty.futureField, { keep: 123 });
  assert.equal(await repos.sessions.get('s-deleted'), undefined, 'cleanup must never resurrect a deleted session');

  await repos.saveExistingSession({ ...activeEdit, chatHistory: [{ id: 'm1', role: 'user', content: 'updated' }] });
  assert.equal((await repos.sessions.get('s-dirty')).chatHistory[0].content, 'updated');

  db.setNextRequestError(new Error('IDBCursorBoom'));
  await assert.rejects(
    repos.cleanupSessionDiagnostics(),
    err => err.cause?.message === 'IDBCursorBoom',
  );

  await repos.mergeRecords({
    characters: [{ fileName: 'hero.png', card: { name: 'Hero' } }],
    presets: [{ name: 'Default', prompts: [] }],
    chatSessions: [{
      sessionId: 's-legacy-import',
      characterFileName: 'hero.png',
      presetName: 'Default',
      logs: { turns: [{ id: 1 }] },
      initialDiagnosticLog: 'legacy-boot',
      isLoading: true,
      visualState: { bg: 'off', sound: 'rain.mp3' },
      arenaUserProfileId: 'legacy-profile-1',
      futureField: { version: 99 },
      chatHistory: [
        { id: 'old-m', role: 'model', content: '<think>secret</think><content>preserved story</content>' },
        { id: 'u1', role: 'user', content: 'continue' },
        { id: 'latest-m', role: 'model', content: '<content>latest</content>' },
      ],
    }],
  });
  const migrated = await repos.sessions.get('s-legacy-import');
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, 'logs'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, 'initialDiagnosticLog'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, 'isLoading'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, 'arenaUserProfileId'), false);
  assert.equal(migrated.arenaProfileId, 'legacy-profile-1');
  assert.equal(migrated.visualState.backgroundImage, '');
  assert.equal(migrated.visualState.ambientSoundUrl, 'rain.mp3');
  assert.equal(migrated.chatHistory[0].content, 'preserved story');
  assert.deepEqual(migrated.futureField, { version: 99 });
}

{
  const codec = createBackupCodec();
  assert.equal(codec.MAX_AVATAR_BASE64_LENGTH, MAX_AVATAR_BASE64_LENGTH);
  assert.equal(codec.isPlainObject, isPlainObject);
  assert.equal(codec.assertBackupArray, assertBackupArray);
  assert.equal(codec.encodeBufferToBase64, encodeBufferToBase64);
  assert.equal(codec.decodeBase64ToBuffer, decodeBase64ToBuffer);
  const sample = new Uint8Array([1, 2, 3, 250, 255]).buffer;
  const encoded = await encodeBufferToBase64(sample);
  const decoded = await decodeBase64ToBuffer(encoded);
  assert.deepEqual(new Uint8Array(decoded), new Uint8Array(sample));
}

{

  const channelsByName = new Map();
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.closed = false;
      this.listeners = new Set();
      let group = channelsByName.get(name);
      if (!group) { group = new Set(); channelsByName.set(name, group); }
      group.add(this);
    }
    addEventListener(type, fn) { if (type === 'message') this.listeners.add(fn); }
    removeEventListener(type, fn) { if (type === 'message') this.listeners.delete(fn); }
    postMessage(data) {
      if (this.closed) throw new Error('Channel closed');
      for (const peer of channelsByName.get(this.name) || []) {
        if (peer === this || peer.closed) continue;
        for (const fn of peer.listeners) fn({ data: structuredClone(data) });
      }
    }
    close() {
      this.closed = true;
      channelsByName.get(this.name)?.delete(this);
    }
  }

  const tabA = createCrossTabSync({ tabId: 'tab-a', BroadcastChannelCtor: FakeBroadcastChannel });
  const tabB = createCrossTabSync({ tabId: 'tab-b', BroadcastChannelCtor: FakeBroadcastChannel });
  assert.equal(tabA.transport, 'broadcast-channel');
  const receivedByB = [];
  const receivedByA = [];
  tabA.subscribe('*', event => receivedByA.push(event));
  tabB.subscribe('*', event => receivedByB.push(event));

  for (const eventType of CROSS_TAB_EVENT_TYPES) {
    assert.equal(tabA.publish(eventType, { marker: eventType }), true);
  }
  assert.equal(receivedByA.length, 0, 'tab must not receive its own messages');
  assert.deepEqual(receivedByB.map(e => e.type), [...CROSS_TAB_EVENT_TYPES]);
  assert.throws(() => tabA.publish('unknown-event'), TypeError);

  tabB.close();
  assert.equal(tabB.isClosed(), true);
  assert.equal(tabB.publish(CROSS_TAB_EVENTS.SESSION_CLAIMED, {}), false);
  tabA.publish(CROSS_TAB_EVENTS.SESSION_DELETED, { sessionId: 'x' });
  assert.equal(receivedByB.length, CROSS_TAB_EVENT_TYPES.length, 'closed tab must stop receiving');
  tabA.close();

  const windowListeners = new Set();
  const fakeWindow = {
    addEventListener(type, fn) { if (type === 'storage') windowListeners.add(fn); },
    removeEventListener(type, fn) { if (type === 'storage') windowListeners.delete(fn); },
  };
  const sharedStorage = createMemoryStorage();
  const origSetItem = sharedStorage.setItem;
  sharedStorage.setItem = (key, value) => {
    origSetItem(key, value);
    for (const fn of [...windowListeners]) {
      fn({ key, newValue: value });
    }
  };
  const fallbackA = createCrossTabSync({
    tabId: 'fb-a',
    BroadcastChannelCtor: null,
    targetWindow: fakeWindow,
    storage: sharedStorage,
  });
  const fallbackB = createCrossTabSync({
    tabId: 'fb-b',
    BroadcastChannelCtor: null,
    targetWindow: fakeWindow,
    storage: sharedStorage,
  });
  assert.equal(fallbackA.transport, 'storage');
  const fallbackEvents = [];
  fallbackB.subscribe(CROSS_TAB_EVENTS.CATALOG_MUTATED, event => fallbackEvents.push(event));
  fallbackA.publish(CROSS_TAB_EVENTS.CATALOG_MUTATED, { kind: 'characters' });
  assert.equal(fallbackEvents.length, 1);
  assert.equal(fallbackEvents[0].payload.kind, 'characters');
  fallbackB.close();
  fallbackA.publish(CROSS_TAB_EVENTS.CATALOG_MUTATED, { kind: 'presets' });
  assert.equal(fallbackEvents.length, 1, 'storage listener must be cleaned up on close()');
  fallbackA.close();
  assert.equal(windowListeners.size, 0);
}

{
  const keys = {
    ...CONNECTION_KEYS,
    profiles: PROXY_PERSISTENCE_KEYS.profilesLegacy,
    password: PROXY_PERSISTENCE_KEYS.proxyPasswordLegacy,
  };
  const allowed = new Set([
    CONNECTION_KEYS.gemini,
    CONNECTION_KEYS.openrouter,
    CONNECTION_KEYS.rotation,
    keys.profiles,
    keys.password,
    SETTINGS_STORAGE_KEYS.arenaSettings,
  ]);

  function setupRestoreHarness() {
    const db = createInMemoryIdbDatabase();
    const repos = createEntityRepositories({
      database: db,
      normalizePreset: value => value,
      normalizePresetList: value => value,
    });
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    const host = { localStorage: local, sessionStorage: session };
    const connections = createConnectionRepository(host);
    const proxy = createProxyPersistence(host);
    const storage = { local, session, connections, proxy, keys };
    const syncEvents = [];
    const crossTabSync = {
      publish(type, payload) { syncEvents.push({ type, payload }); return true; },
    };
    const service = createBackupRestoreService({
      repositories: repos,
      storage,
      backupOptions: { allowed, prefix: SETTINGS_STORAGE_KEYS.cardRuntimePrefix, keys, proxy },
      crossTabSync,
      journalStorage: local,
    });
    return { db, repos, local, session, connections, proxy, storage, syncEvents, service };
  }

  const incomingBackup = {
    version: 1,
    timestamp: 1700000000000,
    dataType: 'full_system_backup',
    data: {
      characters: [{ fileName: 'new-char.png', card: { name: 'New Char' }, avatarBase64: 'AQID', avatarType: 'image/png' }],
      presets: [{ name: 'RestoredPreset', prompts: [] }],
      lorebooks: [{ name: 'RestoredBook', entries: [] }],
      personas: [{ id: 'p-restored', name: 'Traveler' }],
      chatSessions: [{
        sessionId: 's-restored',
        characterFileName: 'new-char.png',
        presetName: 'RestoredPreset',
        chatHistory: [{ id: 'm1', role: 'model', content: 'restored hi' }],
        logs: { turns: [{ id: 1 }] },
      }],
      appSettings: {
        [CONNECTION_KEYS.gemini]: JSON.stringify({ useDefault: false, keys: ['restored-key'] }),
        [SETTINGS_STORAGE_KEYS.arenaSettings]: JSON.stringify({ enabled: true }),
      },
    },
  };

  {
    const h = setupRestoreHarness();
    const result = await h.service.restore(incomingBackup);
    assert.equal(result.ok, true);
    assert.equal(result.status, RESTORE_STAGES.COMPLETED);
    assert.equal(result.atomicAcrossStorages, false);
    assert.equal(h.service.getPendingRecovery(), null, 'journal must be cleared after finalize');
    assert.equal(h.connections.getGemini().keys[0], 'restored-key');
    const restoredChar = await h.repos.characters.get('new-char.png');
    assert.equal(restoredChar.avatar.buffer.byteLength, 3);
    const restoredSession = await h.repos.sessions.get('s-restored');
    assert.equal(Object.prototype.hasOwnProperty.call(restoredSession, 'logs'), false);
    assert.deepEqual(h.syncEvents.map(e => e.type), [
      CROSS_TAB_EVENTS.RESTORE_STARTED,
      CROSS_TAB_EVENTS.RESTORE_COMPLETED,
    ]);
  }

  {
    const h = setupRestoreHarness();
    h.connections.saveGemini({ useDefault: false, keys: ['before-key'] });
    h.local.setItem(SETTINGS_STORAGE_KEYS.arenaSettings, JSON.stringify({ enabled: false }));
    const origSetItem = h.local.setItem;
    let throwQuotaOnArena = true;
    h.local.setItem = (key, value) => {
      if (throwQuotaOnArena && key === SETTINGS_STORAGE_KEYS.arenaSettings) {
        const quotaErr = new Error('QuotaExceededError: storage full');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      }
      return origSetItem(key, value);
    };

    let caught;
    try {
      await h.service.restore(incomingBackup);
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof BackupRestoreError);
    assert.equal(caught.code, 'WEB_STORAGE_RESTORE_FAILED');
    assert.equal(caught.idbCommitted, true);
    assert.equal(caught.settingsApplied, false);
    assert.equal(caught.atomicAcrossStorages, false);
    assert.equal(caught.recoverable, true);

    assert.ok(await h.repos.characters.get('new-char.png'));
    assert.equal(h.connections.getGemini().keys[0], 'before-key');
    const pending = h.service.getPendingRecovery();
    assert.ok(pending);
    assert.equal(pending.id, caught.journalId);
    assert.equal(pending.status, RESTORE_STAGES.FAILED_SETTINGS);
    assert.equal(pending.idbCommitted, true);
    assert.equal(pending.atomicAcrossStorages, false);
    assert.ok(h.local.getItem(RESTORE_JOURNAL_KEY));

    throwQuotaOnArena = false;
    const recovered = await h.service.recover({ strategy: 'retry-settings', journalId: caught.journalId });
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, RESTORE_STAGES.COMPLETED);
    assert.equal(recovered.strategy, 'retry-settings');
    assert.equal(h.service.getPendingRecovery(), null);
    assert.equal(h.connections.getGemini().keys[0], 'restored-key');
    assert.equal(JSON.parse(h.local.getItem(SETTINGS_STORAGE_KEYS.arenaSettings)).enabled, true);
  }

  {
    const h = setupRestoreHarness();
    await h.repos.characters.put({ fileName: 'orig-char.png', card: { name: 'Original' } });
    await h.repos.sessions.put({
      sessionId: 's-orig',
      characterFileName: 'orig-char.png',
      presetName: 'OrigPreset',
      chatHistory: [{ id: 'm0', role: 'user', content: 'original history' }],
    });
    const origSetItem = h.local.setItem;
    h.local.setItem = (key, value) => {
      if (key === SETTINGS_STORAGE_KEYS.arenaSettings) {
        const quotaErr = new Error('QuotaExceededError');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      }
      return origSetItem(key, value);
    };

    let caught;
    try {
      await h.service.restore(incomingBackup);
    } catch (error) {
      caught = error;
    }
    assert.equal(caught.code, 'WEB_STORAGE_RESTORE_FAILED');
    assert.ok(await h.repos.characters.get('new-char.png'));

    const rolledBack = await h.service.recover({ strategy: 'rollback-idb', journalId: caught.journalId });
    assert.equal(rolledBack.ok, true);
    assert.equal(rolledBack.status, RESTORE_STAGES.ROLLED_BACK);
    assert.equal(await h.repos.characters.get('new-char.png'), undefined, 'newly inserted char must be removed on IDB rollback');
    assert.equal(await h.repos.sessions.get('s-restored'), undefined, 'newly inserted session must be removed on IDB rollback');
    assert.equal((await h.repos.characters.get('orig-char.png')).card.name, 'Original');
    assert.equal((await h.repos.sessions.get('s-orig')).chatHistory[0].content, 'original history');
    assert.equal(h.service.getPendingRecovery(), null);
  }
}

{

  let revision = 1;
  let state = { sessionId: 'S1', text: 'v1' };
  const writes = [];
  const coordinator = createSessionSaveCoordinator({
    sessionId: 'S1',
    initialRevision: 1,
    getState: () => state,
    getRevision: () => revision,
    captureSnapshot: s => ({ ...s }),
    queue: createSessionWriteQueue(async record => writes.push(record)),
  });
  revision = 2;
  state = { sessionId: 'S1', text: 'v2-new-instance' };
  assert.equal(coordinator.markDirty(), false, 'locked initialRevision must reject markDirty after revision drift');
  assert.equal(await coordinator.flush({ force: true }), false, 'locked initialRevision must reject forced flush after revision drift');
  assert.equal(writes.length, 0);

  let ownershipLostCount = 0;
  let errorCount = 0;
  let enqueueAttempts = 0;
  let scheduledCallback = null;
  const ownershipCoord = createSessionSaveCoordinator({
    sessionId: 'S2',
    initialRevision: 10,
    getState: () => ({ sessionId: 'S2', text: 'stale-tab' }),
    getRevision: () => 10,
    captureSnapshot: s => ({ ...s }),
    queue: createSessionWriteQueue(async () => {
      enqueueAttempts += 1;
      throw new Error('Không thể cập nhật phiên trò chuyện đã bị xóa hoặc thay thế.', {
        cause: new Error('Session was deleted or replaced.'),
      });
    }),
    onError: () => { errorCount += 1; },
    onOwnershipLost: () => { ownershipLostCount += 1; },
    schedule: fn => { scheduledCallback = fn; return 1; },
    unschedule: () => { scheduledCallback = null; },
  });

  assert.equal(ownershipCoord.markDirty(), true);
  assert.equal(typeof scheduledCallback, 'function');
  scheduledCallback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(enqueueAttempts, 1);
  assert.equal(ownershipLostCount, 1);
  assert.equal(errorCount, 1);

  assert.equal(ownershipCoord.markDirty(), false);
  assert.equal(await ownershipCoord.flush({ force: true }), false);
  assert.equal(enqueueAttempts, 1);
}

{
  const local = createMemoryStorage();
  const syncEvents = [];
  let remoteHandler = null;
  const mockSync = {
    publish(type, payload) { syncEvents.push({ type, payload }); return true; },
    subscribe(type, fn) {
      if (type === CROSS_TAB_EVENTS.SETTINGS_UPDATED) remoteHandler = fn;
      return () => { remoteHandler = null; };
    },
  };
  const settingsRepo = createSettingsRepository({ storage: local, crossTabSync: mockSync });
  const notifications = [];
  settingsRepo.subscribe(change => notifications.push(change));

  settingsRepo.setJson(SETTINGS_STORAGE_KEYS.arenaSettings, { mode: 'dual' });
  assert.deepEqual(settingsRepo.getJson(SETTINGS_STORAGE_KEYS.arenaSettings), { mode: 'dual' });
  settingsRepo.updateJson(SETTINGS_STORAGE_KEYS.arenaSettings, prev => ({ ...prev, round: 2 }));
  assert.deepEqual(settingsRepo.getJson(SETTINGS_STORAGE_KEYS.arenaSettings), { mode: 'dual', round: 2 });

  local.setItem(SETTINGS_STORAGE_KEYS.globalContext, '{corrupt-json');
  assert.deepEqual(settingsRepo.getJson(SETTINGS_STORAGE_KEYS.globalContext, { safe: true }), { safe: true });

  settingsRepo.setRaw(`${SETTINGS_STORAGE_KEYS.cardRuntimePrefix}a`, '1');
  settingsRepo.setRaw(`${SETTINGS_STORAGE_KEYS.cardRuntimePrefix}b`, '2');
  assert.equal(settingsRepo.listByPrefix().length, 2);

  const origSetItem = local.setItem;
  local.setItem = (key, value) => {
    if (key === SETTINGS_STORAGE_KEYS.ttsGlobal) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return origSetItem(key, value);
  };
  assert.throws(
    () => settingsRepo.setMany([
      [SETTINGS_STORAGE_KEYS.engineMode, 'current'],
      [SETTINGS_STORAGE_KEYS.ttsGlobal, 'fail'],
    ]),
    /hoàn tác/,
  );
  assert.equal(settingsRepo.getRaw(SETTINGS_STORAGE_KEYS.engineMode), null);

  remoteHandler({ senderId: 'other-tab', payload: { keys: [SETTINGS_STORAGE_KEYS.engineMode] } });
  assert.ok(notifications.some(n => n.source === 'remote' && n.keys[0] === SETTINGS_STORAGE_KEYS.engineMode));
  assert.ok(syncEvents.some(e => e.type === CROSS_TAB_EVENTS.SETTINGS_UPDATED));

  settingsRepo.close();
  assert.equal(remoteHandler, null);
}

console.log('WP-E06 persistence hardening (onerror, Node18 crypto, cleanup, cross-tab, restore journal/recovery, coordinator lock, settings repo): OK');
