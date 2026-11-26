import assert from 'node:assert/strict';
import { APP_DATABASE } from '../src/app/persistence/app-database.js';
import { createSessionSaveCoordinator, createSessionWriteQueue } from '../src/app/persistence/session-save-coordinator.js';
import {
  RESTORE_COMMIT_MARKER_ID,
  createEntityRepositories,
} from '../src/app/persistence/entity-repositories.js';
import {
  BackupRestoreError,
  RECOVERY_DATABASE,
  RESTORE_JOURNAL_KEY,
  RESTORE_LOCK_KEY,
  RESTORE_STAGES,
  createBackupRestoreService,
  createDurableRecoveryStore,
} from '../src/app/persistence/backup-restore-service.js';
import { createApplicationLifecycle } from '../src/app/lifecycle/application-lifecycle.js';
import { createBackupSettings } from '../src/ui/settings/sections/backup-settings.js';
import { SETTINGS_STORAGE_KEYS } from '../src/app/state/settings-repository.js';
import {
  PROXY_PERSISTENCE_KEYS,
  createMemoryStorage,
  createProxyPersistence,
} from '../src/providers/proxy/persistence.js';
import {
  CONNECTION_KEYS,
  createConnectionRepository,
} from '../src/providers/common/connection-repository.js';

function createPersistentIdbBacking() {
  const stores = Object.fromEntries(Object.keys(APP_DATABASE.stores).map(key => [key, new Map()]));
  const transactions = [];
  let failNextMerge = false;
  let beforeCommitHook = null;

  return {
    stores,
    transactions,
    setFailNextMerge(flag) {
      failNextMerge = flag;
    },
    setBeforeCommitHook(fn) {
      beforeCommitHook = fn;
    },
    createDatabaseHandle() {
      return {
        async read(store, method, args) {
          return structuredClone(method === 'getAll' ? [...stores[store].values()] : stores[store].get(args[0]));
        },
        async transaction(names, mode, work, message = 'Transaction failed') {
          transactions.push({ names: [...names], mode });
          if (beforeCommitHook && mode === 'readwrite' && names.length === 5) {
            const hook = beforeCommitHook;
            beforeCommitHook = null;
            await hook();
          }
          if (failNextMerge && mode === 'readwrite' && names.length === 5) {
            failNextMerge = false;
            throw new Error(message, { cause: new Error('SimulatedIDBCommitFailure') });
          }
          const draft = Object.fromEntries(names.map(name => [name, structuredClone(stores[name])]));
          const queue = [];
          let result;
          const makeRequest = executor => {
            const req = {};
            queue.push(() => {
              req.result = structuredClone(executor());
              req.onsuccess?.();
            });
            return req;
          };
          const tx = {
            objectStore(name) {
              const data = draft[name];
              const keyPath = APP_DATABASE.stores[name];
              const write = (value, add = false) => makeRequest(() => {
                const key = value[keyPath];
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
              };
            },
          };
          work(tx, value => { result = value; }, cause => { throw cause || new Error(message); });
          while (queue.length) queue.shift()();
          if (mode === 'readwrite') {
            for (const name of names) stores[name] = draft[name];
          }
          return result;
        },
      };
    },
  };
}

// Persistent mock IndexedDB for SillyTavernCardStudioRecoveryDB v1.
function createFakeRecoveryIndexedDB() {
  const databases = new Map();
  return {
    databases,
    open(name, version) {
      assert.equal(name, RECOVERY_DATABASE.name);
      assert.equal(version, RECOVERY_DATABASE.version);
      const req = {};
      queueMicrotask(() => {
        let entry = databases.get(name);
        let needsUpgrade = false;
        if (!entry) {
          entry = { stores: new Map() };
          databases.set(name, entry);
          needsUpgrade = true;
        }
        const db = {
          objectStoreNames: { contains: storeName => entry.stores.has(storeName) },
          createObjectStore: storeName => { entry.stores.set(storeName, new Map()); },
          close() {},
          transaction(storeNames, _mode) {
            const tx = {
              objectStore(storeName) {
                const map = entry.stores.get(storeName);
                assert.ok(map, `Missing store ${storeName}`);
                return {
                  put(record) {
                    const r = {};
                    queueMicrotask(() => {
                      map.set(record[RECOVERY_DATABASE.keyPath], structuredClone(record));
                      r.result = record[RECOVERY_DATABASE.keyPath];
                      r.onsuccess?.();
                      tx.oncomplete?.();
                    });
                    return r;
                  },
                  get(key) {
                    const r = {};
                    queueMicrotask(() => {
                      r.result = map.has(key) ? structuredClone(map.get(key)) : undefined;
                      r.onsuccess?.();
                      tx.oncomplete?.();
                    });
                    return r;
                  },
                  delete(key) {
                    const r = {};
                    queueMicrotask(() => {
                      map.delete(key);
                      r.onsuccess?.();
                      tx.oncomplete?.();
                    });
                    return r;
                  },
                };
              },
              abort() {
                tx.onabort?.();
              },
            };
            return tx;
          },
        };
        req.result = db;
        if (needsUpgrade) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
}

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

function buildBackupPayload() {
  return {
    version: 1,
    timestamp: 1700000000000,
    dataType: 'full_system_backup',
    data: {
      characters: [{ fileName: 'restarted-char.png', card: { name: 'Restarted Char' }, avatarBase64: 'AQID', avatarType: 'image/png' }],
      presets: [{ name: 'RestartedPreset', prompts: [] }],
      lorebooks: [{ name: 'RestartedBook', entries: [] }],
      personas: [{ id: 'p-restarted', name: 'Explorer' }],
      chatSessions: [{
        sessionId: 's-restarted',
        characterFileName: 'restarted-char.png',
        presetName: 'RestartedPreset',
        chatHistory: [{ id: 'm1', role: 'model', content: 'hello after restart' }],
      }],
      appSettings: {
        [CONNECTION_KEYS.gemini]: JSON.stringify({ useDefault: false, keys: ['recovered-key'] }),
        [SETTINGS_STORAGE_KEYS.arenaSettings]: JSON.stringify({ enabled: true, mode: 'dual' }),
      },
    },
  };
}

function createServiceInstance(idbBacking, persistentLocal, persistentSession, extra = {}) {
  const repositories = createEntityRepositories({
    database: idbBacking.createDatabaseHandle(),
    normalizePreset: value => value,
    normalizePresetList: value => value,
  });
  const host = { localStorage: persistentLocal, sessionStorage: persistentSession };
  const connections = createConnectionRepository(host);
  const proxy = createProxyPersistence(host);
  const service = createBackupRestoreService({
    repositories,
    storage: { local: persistentLocal, session: persistentSession, connections, proxy, keys },
    backupOptions: { allowed, prefix: SETTINGS_STORAGE_KEYS.cardRuntimePrefix, keys, proxy },
    journalStorage: persistentLocal,
    ...extra,
  });
  return { repositories, connections, proxy, service };
}

// ============================================================================
// DEFECT 1: Same-instance mutual exclusion, operationId lock ownership,
// renewal/expiration, crossTabLockAtomic: false, and stale dismiss protection.
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const persistentLocal = createMemoryStorage();
  const snapStore = createDurableRecoveryStore({ indexedDB: null, storage: createMemoryStorage() });

  let currentTime = 50_000;
  let releaseGate;
  const enteredMerge = new Promise(resolve => {
    idbBacking.setBeforeCommitHook(() => {
      resolve();
      return new Promise(r => { releaseGate = r; });
    });
  });

  const h = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'same-tab-owner',
    snapshotStore: snapStore,
    now: () => currentTime,
    lockTtlMs: 30_000,
  });
  assert.equal(h.service.atomicAcrossStorages, false);
  assert.equal(h.service.crossTabLockAtomic, false);

  // Start first restore and pause inside IDB commit.
  const firstRestore = h.service.restore(buildBackupPayload());
  await enteredMerge;

  // Verify lock exists with operationId and crossTabLockAtomic: false.
  const activeLock = JSON.parse(persistentLocal.getItem(RESTORE_LOCK_KEY));
  assert.equal(activeLock.ownerId, 'same-tab-owner');
  assert.equal(typeof activeLock.operationId, 'string');
  assert.equal(activeLock.crossTabLockAtomic, false);

  // Concurrent restore() on SAME instance MUST reject immediately!
  await assert.rejects(
    h.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError
      && err.code === 'CONCURRENT_RESTORE_IN_PROGRESS'
      && err.crossTabLockAtomic === false,
  );

  // Concurrent recover() and dismiss() on SAME instance MUST reject immediately!
  await assert.rejects(
    h.service.recover({ strategy: 'rollback-idb' }),
    err => err instanceof BackupRestoreError && err.code === 'CONCURRENT_OPERATION_IN_PROGRESS',
  );
  await assert.rejects(
    h.service.recover({ strategy: 'dismiss' }),
    err => err instanceof BackupRestoreError && err.code === 'CONCURRENT_OPERATION_IN_PROGRESS',
  );

  // Advance clock before completing so lock renewal is exercised.
  currentTime += 5_000;
  releaseGate();
  const firstResult = await firstRestore;
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.crossTabLockAtomic, false);
  assert.equal(persistentLocal.getItem(RESTORE_LOCK_KEY), null, 'lock must be released after completion');

  // Lock with SAME ownerId but DIFFERENT operationId (non-expired) MUST reject (no ownerId-only re-entry!).
  persistentLocal.setItem(RESTORE_LOCK_KEY, JSON.stringify({
    ownerId: 'same-tab-owner',
    operationId: 'other-op-id-999',
    journalId: 'other-j-999',
    acquiredAt: currentTime,
    expiresAt: currentTime + 30_000,
  }));
  await assert.rejects(
    h.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError && err.code === 'CONCURRENT_RESTORE_IN_PROGRESS',
  );
  // Foreign lock must NOT be deleted when our restore failed to acquire it!
  assert.equal(JSON.parse(persistentLocal.getItem(RESTORE_LOCK_KEY)).operationId, 'other-op-id-999');

  // Once lock expires (past TTL), restore can acquire it and release cleanly.
  currentTime += 35_000;
  const afterExpiry = await h.service.restore(buildBackupPayload());
  assert.equal(afterExpiry.ok, true);
  assert.equal(persistentLocal.getItem(RESTORE_LOCK_KEY), null);
}

// ============================================================================
// DEFECT 2A: Crash AFTER IDB commit BEFORE journal updates to idb-committed
// (journal stuck at applying-idb, idbCommitted: false; commit marker IS in IDB).
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const recoveryIndexedDB = createFakeRecoveryIndexedDB();
  const persistentLocal = createMemoryStorage();
  const snapshotStore1 = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });

  const inst1 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'tab-crash-after-idb',
    snapshotStore: snapshotStore1,
  });
  const origAvatarBytes = new Uint8Array([9, 8, 7, 6]).buffer;
  await inst1.repositories.characters.put({
    fileName: 'orig-char.png',
    card: { name: 'Original' },
    avatar: { buffer: origAvatarBytes, name: 'orig-char.png', type: 'image/png' },
  });
  await inst1.repositories.personas.put({ id: 'p-orig', name: 'OrigPersona' });
  await inst1.repositories.sessions.put({
    sessionId: 's-orig',
    characterFileName: 'orig-char.png',
    presetName: 'OrigPreset',
    chatHistory: [{ id: 'm0', role: 'user', content: 'original session' }],
  });

  // Simulate crash right AFTER IDB commit by making writeJournal(IDB_COMMITTED) throw!
  const origSetItem = persistentLocal.setItem;
  let crashOnIdbCommittedJournal = true;
  persistentLocal.setItem = (key, value) => {
    if (crashOnIdbCommittedJournal && key === RESTORE_JOURNAL_KEY) {
      const parsed = JSON.parse(value);
      if (parsed.status === RESTORE_STAGES.IDB_COMMITTED) {
        throw new Error('SimulatedCrashBeforeIdbCommittedJournalWrite');
      }
    }
    return origSetItem(key, value);
  };

  let crashError;
  try {
    await inst1.service.restore(buildBackupPayload());
  } catch (error) {
    crashError = error;
  }
  // Journal write failure MUST propagate explicitly (never silently swallowed)!
  assert.ok(crashError instanceof BackupRestoreError);
  assert.equal(crashError.code, 'JOURNAL_WRITE_FAILED');
  assert.equal(crashError.atomicAcrossStorages, false);
  assert.equal(crashError.crossTabLockAtomic, false);

  // Journal on disk is still at applying-idb with idbCommitted: false,
  // while IDB has committed BOTH the restored records AND the atomic commit marker!
  const rawJournal = JSON.parse(persistentLocal.getItem(RESTORE_JOURNAL_KEY));
  assert.equal(rawJournal.status, RESTORE_STAGES.APPLYING_IDB);
  assert.equal(rawJournal.idbCommitted, false);

  // Internal commit marker MUST be invisible to normal persona queries & exportRecords!
  assert.equal(await inst1.repositories.personas.get(RESTORE_COMMIT_MARKER_ID), undefined);
  const visiblePersonas = await inst1.repositories.personas.list();
  assert.ok(!visiblePersonas.some(p => p.id === RESTORE_COMMIT_MARKER_ID));
  const exported = await inst1.repositories.exportRecords();
  assert.ok(!exported.personas.some(p => p.id === RESTORE_COMMIT_MARKER_ID));

  // Restart with fresh Instance 2 (empty RAM).
  crashOnIdbCommittedJournal = false;
  const snapshotStore2 = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });
  const inst2 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'tab-restart-2',
    snapshotStore: snapshotStore2,
  });

  const inspected = await inst2.service.inspectPendingRecovery();
  assert.ok(inspected);
  assert.equal(inspected.commitState, 'verified-committed', 'durable IDB commit marker must verify IDB commit');
  assert.equal(inspected.idbCommitted, true);
  assert.equal(inspected.availableActions.canRetrySettings, true);
  assert.equal(inspected.availableActions.canRollbackIdb, true);
  assert.equal(inspected.availableActions.canDismiss, false, 'cannot dismiss when IDB committed and recovery actions exist');

  // Stale dismiss with wrong journalId MUST reject with JOURNAL_ID_MISMATCH.
  await assert.rejects(
    inst2.service.recover({ strategy: 'dismiss', journalId: 'wrong-journal-id' }),
    err => err instanceof BackupRestoreError && err.code === 'JOURNAL_ID_MISMATCH',
  );
  // Unforced dismiss with matching journalId MUST reject with DISMISS_NOT_ALLOWED.
  await assert.rejects(
    inst2.service.recover({ strategy: 'dismiss', journalId: inspected.id }),
    err => err instanceof BackupRestoreError && err.code === 'DISMISS_NOT_ALLOWED',
  );

  // Transactional rollback-idb WITHOUT passing previousRecords externally!
  const txCountBeforeRollback = idbBacking.transactions.length;
  const rolledBack = await inst2.service.recover({ strategy: 'rollback-idb', journalId: inspected.id });
  assert.equal(rolledBack.ok, true);
  assert.equal(rolledBack.status, RESTORE_STAGES.ROLLED_BACK);
  assert.equal(rolledBack.atomicAcrossStorages, false);
  assert.equal(rolledBack.crossTabLockAtomic, false);

  // Verify rollback executed in a SINGLE 5-store IDB transaction!
  const rollbackTxs = idbBacking.transactions.slice(txCountBeforeRollback);
  assert.equal(rollbackTxs.length, 1, 'rollback must run in a single atomic IndexedDB transaction');
  assert.equal(rollbackTxs[0].mode, 'readwrite');
  assert.equal(rollbackTxs[0].names.length, 5);

  // Verify commit marker, journal, and durable snapshot are all cleaned up, and original data restored!
  assert.equal(await inst2.repositories.readRestoreCommitMarker(), null);
  assert.equal(await inst2.service.inspectPendingRecovery(), null);
  assert.equal(persistentLocal.getItem(RESTORE_JOURNAL_KEY), null);
  assert.equal(await snapshotStore2.get(inspected.id), null);
  assert.equal(await inst2.repositories.characters.get('restarted-char.png'), undefined);
  const origCharAfterRollback = await inst2.repositories.characters.get('orig-char.png');
  assert.equal(origCharAfterRollback.card.name, 'Original');
  assert.deepEqual(new Uint8Array(origCharAfterRollback.avatar.buffer), new Uint8Array([9, 8, 7, 6]));
  assert.equal((await inst2.repositories.sessions.get('s-orig')).chatHistory[0].content, 'original session');
}

// ============================================================================
// DEFECT 2B: Crash BEFORE IDB commit (journal stuck at applying-idb, NO commit
// marker in IDB, durable snapshot exists) -> service MUST REJECT retry-settings!
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const recoveryIndexedDB = createFakeRecoveryIndexedDB();
  const persistentLocal = createMemoryStorage();
  const snapshotStore = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });

  const inst = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'tab-pre-commit-crash',
    snapshotStore,
  });
  await inst.repositories.characters.put({ fileName: 'orig-char.png', card: { name: 'Original' } });
  const preSnapshot = await inst.repositories.exportRecords();

  const journalId = 'restore-crash-before-idb-commit';
  await snapshotStore.put({
    journalId,
    previousRecords: preSnapshot,
    addedKeys: { characters: ['restarted-char.png'], presets: [], lorebooks: [], personas: [], chatSessions: [] },
    settingsEntries: [[SETTINGS_STORAGE_KEYS.arenaSettings, JSON.stringify({ enabled: true })]],
    createdAt: Date.now(),
    stage: RESTORE_STAGES.SNAPSHOT_PERSISTED,
  });
  persistentLocal.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({
    id: journalId,
    status: RESTORE_STAGES.APPLYING_IDB,
    idbCommitted: false,
    settingsApplied: false,
    snapshotPersisted: true,
    settingsEntries: [[SETTINGS_STORAGE_KEYS.arenaSettings, JSON.stringify({ enabled: true })]],
    atomicAcrossStorages: false,
    crossTabLockAtomic: false,
  }));

  const inspected = await inst.service.inspectPendingRecovery();
  assert.ok(inspected);
  assert.equal(inspected.commitState, 'unverified-or-aborted');
  assert.equal(inspected.idbCommitted, false);
  assert.equal(inspected.availableActions.canRetrySettings, false, 'canRetrySettings MUST be false when IDB commit is unverified');
  assert.equal(inspected.availableActions.canRollbackIdb, true, 'canRollbackIdb should be true when durable snapshot exists');
  assert.equal(inspected.availableActions.canDismiss, false, 'canDismiss MUST be false while durable snapshot is pending');

  // Service MUST reject direct retry-settings with IDB_COMMIT_NOT_VERIFIED!
  await assert.rejects(
    inst.service.recover({ strategy: 'retry-settings', journalId }),
    err => err instanceof BackupRestoreError
      && err.code === 'IDB_COMMIT_NOT_VERIFIED'
      && err.idbCommitted === false
      && err.atomicAcrossStorages === false,
  );

  // Pre-IDB journaled stage (before applying-idb) allows safe dismiss.
  persistentLocal.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({
    id: journalId,
    status: RESTORE_STAGES.JOURNALED,
    idbCommitted: false,
    settingsApplied: false,
    snapshotPersisted: true,
    atomicAcrossStorages: false,
    crossTabLockAtomic: false,
  }));
  const preIdbInspected = await inst.service.inspectPendingRecovery();
  assert.equal(preIdbInspected.commitState, 'pre-idb');
  assert.equal(preIdbInspected.availableActions.canDismiss, true);
  assert.equal(preIdbInspected.availableActions.canRetrySettings, false);
  const dismissed = await inst.service.recover({ strategy: 'dismiss', journalId });
  assert.equal(dismissed.ok, true);
  assert.equal(await inst.service.inspectPendingRecovery(), null);
  assert.equal(await snapshotStore.get(journalId), null);
}

// ============================================================================
// DEFECT 2C: QuotaExceededError on Web Storage -> restart -> retry-settings
// succeeds and clears commit marker, journal, and durable snapshot.
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const persistentLocal = createMemoryStorage();
  const snapshotStorage = createMemoryStorage();
  const snapshotStore1 = createDurableRecoveryStore({ indexedDB: null, storage: snapshotStorage });

  const inst1 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    snapshotStore: snapshotStore1,
  });
  inst1.connections.saveGemini({ useDefault: false, keys: ['before-key'] });

  const origSetItem = persistentLocal.setItem;
  let blockSettings = true;
  persistentLocal.setItem = (key, value) => {
    if (blockSettings && key === SETTINGS_STORAGE_KEYS.arenaSettings) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return origSetItem(key, value);
  };

  let restoreError;
  try {
    await inst1.service.restore(buildBackupPayload());
  } catch (error) {
    restoreError = error;
  }
  assert.equal(restoreError.code, 'WEB_STORAGE_RESTORE_FAILED');
  assert.equal(restoreError.idbCommitted, true);
  assert.equal((await inst1.repositories.readRestoreCommitMarker())?.journalId, restoreError.journalId);

  // Restart with fresh Instance 2, free quota, retry-settings.
  blockSettings = false;
  const snapshotStore2 = createDurableRecoveryStore({ indexedDB: null, storage: snapshotStorage });
  const inst2 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    snapshotStore: snapshotStore2,
  });
  const recovered = await inst2.service.recover({ strategy: 'retry-settings' });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.status, RESTORE_STAGES.COMPLETED);
  assert.equal(inst2.connections.getGemini().keys[0], 'recovered-key');
  assert.equal(await inst2.repositories.readRestoreCommitMarker(), null, 'commit marker must be cleared on finalize');
  assert.equal(await inst2.service.inspectPendingRecovery(), null);
  assert.equal(await snapshotStore2.get(restoreError.journalId), null);
}

// ============================================================================
// Fault injection: snapshotStore failure, IDB failure, PENDING_RECOVERY_EXISTS,
// RECOVERY_SNAPSHOT_UNAVAILABLE, and UI BackupSettings gating.
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const persistentLocal = createMemoryStorage();
  const failingSnapshotStore = {
    async put() { throw new Error('RecoveryIDBQuotaExceeded'); },
    async get() { return null; },
    async remove() { return true; },
  };
  const h1 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    snapshotStore: failingSnapshotStore,
  });
  await assert.rejects(
    h1.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError && err.code === 'SNAPSHOT_PERSIST_FAILED' && err.idbCommitted === false,
  );
  assert.equal(h1.service.getPendingRecovery(), null);

  // IDB mergeRecords failure cleans up journal & snapshot.
  const recoveryIndexedDB = createFakeRecoveryIndexedDB();
  const snapStore = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });
  idbBacking.setFailNextMerge(true);
  const h2 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    snapshotStore: snapStore,
  });
  let idbErr;
  try {
    await h2.service.restore(buildBackupPayload());
  } catch (error) {
    idbErr = error;
  }
  assert.equal(idbErr.code, 'IDB_COMMIT_FAILED');
  assert.equal(h2.service.getPendingRecovery(), null);
  assert.equal(await snapStore.get(idbErr.journalId), null);

  // Pending recovery exists -> restore() rejects with PENDING_RECOVERY_EXISTS.
  persistentLocal.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({
    id: 'pending-guard-1',
    status: RESTORE_STAGES.FAILED_SETTINGS,
    idbCommitted: true,
    settingsApplied: false,
    atomicAcrossStorages: false,
  }));
  await assert.rejects(
    h2.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError && err.code === 'PENDING_RECOVERY_EXISTS' && err.journalId === 'pending-guard-1',
  );
  // Missing snapshot -> rollback-idb rejects with RECOVERY_SNAPSHOT_UNAVAILABLE.
  await assert.rejects(
    h2.service.recover({ strategy: 'rollback-idb', journalId: 'pending-guard-1' }),
    err => err instanceof BackupRestoreError && err.code === 'RECOVERY_SNAPSHOT_UNAVAILABLE',
  );
  persistentLocal.removeItem(RESTORE_JOURNAL_KEY);

  // UI BackupSettings gating + InitialLoader boot check.
  const jsx = (type, props, key) => ({ type, props, key });
  const wt = { jsx, jsxs: jsx, Fragment: 'Fragment' };
  const find = (tree, pred) => {
    if (Array.isArray(tree)) {
      for (const child of tree) {
        const match = find(child, pred);
        if (match) return match;
      }
      return null;
    }
    if (!tree || typeof tree !== 'object' || !tree.props) return null;
    if (pred(tree)) return tree;
    return find(tree.props.children, pred);
  };
  const renderBackupWithPending = pendingValue => {
    const state = [];
    let cursor = 0;
    const recoverCalls = [];
    const react = {
      useState(init) {
        const idx = cursor++;
        if (!(idx in state)) state[idx] = typeof init === 'function' ? init() : init;
        return [state[idx], val => { state[idx] = typeof val === 'function' ? val(state[idx]) : val; }];
      },
      useRef: init => ({ current: init }),
      useEffect() {},
    };
    const BackupSettings = createBackupSettings(() => ({
      Ao: 'g', Io: 'r', jo: 'o', Mo: 'p', Oo: 'pw', Ns: [], To: 'p:', Yd: async () => '',
      __stsConnections: {}, connections: {}, __stsDiagnosticsState: { clearAll() {} }, diagnosticsState: { clearAll() {} }, __stsProxyPersistence: {}, proxyPersistence: {},
      repositories: { cleanupSessionDiagnostics: async () => ({ sessionsCleaned: 0 }), exportRecords: async () => ({ characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [] }) },
      __stsRepositories: { cleanupSessionDiagnostics: async () => ({ sessionsCleaned: 0 }), exportRecords: async () => ({ characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [] }) },
      backupRestoreService: {
        getPendingRecovery: () => pendingValue,
        inspectPendingRecovery: async () => pendingValue,
        recover: async opts => { recoverCalls.push(opts); return { ok: true }; },
        restore: async () => ({ ok: true }),
      },
      __stsBackupRestoreService: {
        getPendingRecovery: () => pendingValue,
        inspectPendingRecovery: async () => pendingValue,
        recover: async opts => { recoverCalls.push(opts); return { ok: true }; },
        restore: async () => ({ ok: true }),
      },
      b: react,
      react,
      bu: () => ({ reloadPresets: async () => {} }),
      presetStore: () => ({ reloadPresets: async () => {} }),
      kc: () => ({ reloadCharacters: async () => {} }),
      characterStore: () => ({ reloadCharacters: async () => {} }),
      sn: () => ({ reloadLorebooks: async () => {} }),
      lorebookStore: () => ({ reloadLorebooks: async () => {} }),
      Au: () => ({ reloadPersonas: async () => {} }),
      personaStore: () => ({ reloadPersonas: async () => {} }),
      hl: () => ({ showToast() {} }),
      useToast: () => ({ showToast() {} }),
      mn: 'LoadingIndicator',
      LoadingIndicator: 'LoadingIndicator',
      wt,
      jsxRuntime: wt,
    }));
    return { tree: BackupSettings(), recoverCalls };
  };

  const noRollback = renderBackupWithPending({
    id: 'ui-no-rollback',
    status: RESTORE_STAGES.FAILED_SETTINGS,
    availableActions: { canRetrySettings: true, canRollbackIdb: false, canDismiss: true },
  });
  assert.ok(find(noRollback.tree, n => n.type === 'button' && n.props.children === 'Thử áp dụng lại cài đặt'));
  assert.equal(find(noRollback.tree, n => n.type === 'button' && n.props.children === 'Hoàn tác IndexedDB'), null);
  const dismissBtn = find(noRollback.tree, n => n.type === 'button' && n.props.children === 'Đóng cảnh báo');
  assert.ok(dismissBtn);
  await dismissBtn.props.onClick();
  assert.deepEqual(noRollback.recoverCalls[0], { strategy: 'dismiss', journalId: 'ui-no-rollback' });

  const diagnosticLogs = [];
  const effects = [];
  const { InitialLoader } = createApplicationLifecycle({
    react: { Component: class FakeComponent {}, useEffect: fn => effects.push(fn) },
    jsxRuntime: wt,
    characterStore: () => ({ reloadCharacters() {}, characters: [], updateActiveCharacter() {}, activeCharacterFileName: null, isLoading: false }),
    lorebookStore: () => ({ reloadLorebooks() {}, lorebooks: [], isLoading: false }),
    personaStore: () => ({ reloadPersonas() {} }),
    presetStore: () => ({ reloadPresets() {} }),
    dispatchSystemLog: (level, source, message, stack, payload) => diagnosticLogs.push({ level, source, message, stack, payload }),
    __stsBackupRestoreService: {
      getPendingRecovery: () => ({
        id: 'boot-j-1',
        status: RESTORE_STAGES.FAILED_SETTINGS,
        idbCommitted: true,
        settingsApplied: false,
        atomicAcrossStorages: false,
      }),
    },
  });
  InitialLoader();
  for (const fn of effects) fn();
  assert.equal(diagnosticLogs.length, 1);
  assert.equal(diagnosticLogs[0].level, 'warn');
  assert.equal(diagnosticLogs[0].payload.atomicAcrossStorages, false);
}


// ============================================================================
// S01: Full cross-storage rollback (IDB + Web Storage), credential redaction,
// partial-rollback preservation, and repeated interruption/restart recovery.
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const recoveryIndexedDB = createFakeRecoveryIndexedDB();
  const persistentLocal = createMemoryStorage();
  const persistentSession = createMemoryStorage();
  const snapStore1 = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });

  const inst1 = createServiceInstance(idbBacking, persistentLocal, persistentSession, {
    ownerId: 'tab-s01-1',
    snapshotStore: snapStore1,
    webLocks: null,
  });

  // Seed pre-restore state in IDB and Web Storage (including sensitive credentials).
  await inst1.repositories.characters.put({ fileName: 'orig-char.png', card: { name: 'Orig S01' } });
  inst1.connections.saveGemini({ useDefault: false, keys: ['AIzaSyOriginalSecretKey12345'] });
  // Ensure arenaSettings did NOT exist before restore (so rollback must REMOVE it).
  assert.equal(persistentLocal.getItem(SETTINGS_STORAGE_KEYS.arenaSettings), null);

  const backupWithSecrets = buildBackupPayload();
  backupWithSecrets.data.appSettings[CONNECTION_KEYS.gemini] = JSON.stringify({
    useDefault: false,
    keys: ['AIzaSyIncomingSecretKey99999'],
  });

  // Simulate crash AFTER BOTH IDB and Web Storage settings are applied (right before clearJournal).
  const origRemoveItem = persistentLocal.removeItem;
  let crashBeforeClearJournal = true;
  persistentLocal.removeItem = key => {
    if (crashBeforeClearJournal && key === RESTORE_JOURNAL_KEY) {
      throw new Error('SimulatedCrashAfterSettingsAppliedBeforeCleanup');
    }
    return origRemoveItem(key);
  };

  await assert.rejects(
    inst1.service.restore(backupWithSecrets),
    /SimulatedCrashAfterSettingsAppliedBeforeCleanup/,
  );

  // Verify BOTH IDB and Web Storage were mutated, journal is at SETTINGS_APPLIED,
  // and NO plaintext credentials exist in RESTORE_JOURNAL_KEY or inspectPendingRecovery()!
  const rawJournalStr = persistentLocal.getItem(RESTORE_JOURNAL_KEY);
  assert.ok(rawJournalStr);
  assert.equal(JSON.parse(rawJournalStr).status, RESTORE_STAGES.SETTINGS_APPLIED);
  assert.equal(rawJournalStr.includes('AIzaSyOriginalSecretKey12345'), false, 'journal must never leak pre-restore secret');
  assert.equal(rawJournalStr.includes('AIzaSyIncomingSecretKey99999'), false, 'journal must never leak incoming secret');
  assert.equal(inst1.connections.getGemini().keys[0], 'AIzaSyIncomingSecretKey99999');
  assert.ok(persistentLocal.getItem(SETTINGS_STORAGE_KEYS.arenaSettings));

  // Restart with fresh Instance 2: first simulate Web Storage rollback failing mid-rollback!
  crashBeforeClearJournal = false;
  const origSessionSetItem = persistentSession.setItem;
  let failSettingsRollback = true;
  persistentSession.setItem = (key, value) => {
    if (failSettingsRollback && key === CONNECTION_KEYS.gemini) {
      const err = new Error('QuotaExceededError during settings rollback');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return origSessionSetItem(key, value);
  };

  const snapStore2 = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });
  const inst2 = createServiceInstance(idbBacking, persistentLocal, persistentSession, {
    ownerId: 'tab-s01-2',
    snapshotStore: snapStore2,
    webLocks: null,
  });

  const inspected2 = await inst2.service.inspectPendingRecovery();
  assert.equal(JSON.stringify(inspected2).includes('AIzaSyOriginalSecretKey12345'), false);
  assert.equal(JSON.stringify(inspected2).includes('AIzaSyIncomingSecretKey99999'), false);
  assert.equal(inspected2.availableActions.canRollbackIdb, true);

  let partialErr;
  try {
    await inst2.service.recover({ strategy: 'rollback-idb' });
  } catch (error) {
    partialErr = error;
  }
  assert.ok(partialErr instanceof BackupRestoreError);
  assert.equal(partialErr.code, 'SETTINGS_ROLLBACK_FAILED');
  assert.equal(partialErr.idbRolledBack, true);
  assert.equal(partialErr.settingsRolledBack, false);
  assert.equal(partialErr.rollbackScope, 'idb-only');
  assert.equal(partialErr.atomicAcrossStorages, false);

  // Journal & durable snapshot MUST be preserved at PARTIAL_ROLLBACK (not cleared!).
  const partialJournal = JSON.parse(persistentLocal.getItem(RESTORE_JOURNAL_KEY));
  assert.equal(partialJournal.status, RESTORE_STAGES.PARTIAL_ROLLBACK);
  assert.equal(partialJournal.idbRolledBack, true);
  assert.equal(partialJournal.settingsRolledBack, false);
  assert.ok(await snapStore2.get(inspected2.id), 'durable snapshot must remain for resumed rollback');

  // Restart with fresh Instance 3 after Web Storage recovers -> resume rollback to full completion!
  failSettingsRollback = false;
  const snapStore3 = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });
  const inst3 = createServiceInstance(idbBacking, persistentLocal, persistentSession, {
    ownerId: 'tab-s01-3',
    snapshotStore: snapStore3,
    webLocks: null,
  });

  const resumed = await inst3.service.recover({ strategy: 'rollback-idb' });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.status, RESTORE_STAGES.ROLLED_BACK);
  assert.equal(resumed.rollbackScope, 'full-cross-storage');
  assert.equal(resumed.idbRolledBack, true);
  assert.equal(resumed.settingsRolledBack, true);
  assert.equal(resumed.atomicAcrossStorages, false);

  // Verify BOTH IDB and Web Storage reverted to exact pre-restore state & newly added settings key removed!
  assert.equal(await inst3.repositories.characters.get('restarted-char.png'), undefined);
  assert.equal((await inst3.repositories.characters.get('orig-char.png')).card.name, 'Orig S01');
  assert.equal(inst3.connections.getGemini().keys[0], 'AIzaSyOriginalSecretKey12345');
  assert.equal(persistentLocal.getItem(SETTINGS_STORAGE_KEYS.arenaSettings), null, 'newly added setting must be removed on rollback');
  assert.equal(await inst3.service.inspectPendingRecovery(), null);
  assert.equal(await snapStore3.get(inspected2.id), null, 'sensitive snapshot must be wiped after full rollback');
}

// ============================================================================
// S02: Reject stale snapshot rollback when no active pending journal exists,
// terminal journal, or snapshot ownership mismatch.
// ============================================================================
{
  const idbBacking = createPersistentIdbBacking();
  const recoveryIndexedDB = createFakeRecoveryIndexedDB();
  const persistentLocal = createMemoryStorage();
  const snapStore = createDurableRecoveryStore({ indexedDB: recoveryIndexedDB });

  const inst = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'tab-s02',
    snapshotStore: snapStore,
    webLocks: null,
  });

  // Newer IDB state that must NEVER be overwritten by a stale snapshot!
  await inst.repositories.characters.put({ fileName: 'newer-char.png', card: { name: 'Newer Data' } });

  // Plant a stale snapshot in snapshotStore while getPendingRecovery() === null.
  await snapStore.put({
    journalId: 'stale-journal-1',
    previousRecords: { characters: [{ fileName: 'ancient-char.png', card: { name: 'Ancient' } }], presets: [], lorebooks: [], personas: [], chatSessions: [] },
    addedKeys: { characters: ['newer-char.png'], presets: [], lorebooks: [], personas: [], chatSessions: [] },
    settingsEntries: [],
    createdAt: Date.now() - 10_000,
    stage: RESTORE_STAGES.SNAPSHOT_PERSISTED,
  });
  assert.equal(inst.service.getPendingRecovery(), null);

  await assert.rejects(
    inst.service.recover({ strategy: 'rollback-idb', journalId: 'stale-journal-1' }),
    err => err instanceof BackupRestoreError && err.code === 'NO_PENDING_JOURNAL',
  );
  await assert.rejects(
    inst.service.rollbackIndexedDb({ journalId: 'stale-journal-1' }),
    err => err instanceof BackupRestoreError && err.code === 'NO_PENDING_JOURNAL',
  );
  // Newer data MUST remain untouched!
  assert.equal((await inst.repositories.characters.get('newer-char.png')).card.name, 'Newer Data');
  assert.equal(await inst.repositories.characters.get('ancient-char.png'), undefined);

  // Terminal journal (status: 'completed') MUST be rejected with STALE_RECOVERY_JOURNAL.
  persistentLocal.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({
    id: 'stale-journal-1',
    status: RESTORE_STAGES.COMPLETED,
    idbCommitted: true,
    settingsApplied: true,
    atomicAcrossStorages: false,
  }));
  await assert.rejects(
    inst.service.rollbackIndexedDb({ journalId: 'stale-journal-1' }),
    err => err instanceof BackupRestoreError && err.code === 'STALE_RECOVERY_JOURNAL',
  );

  // Snapshot ownership mismatch (snapshot.journalId !== journal.id) MUST reject with SNAPSHOT_OWNERSHIP_MISMATCH.
  const mismatchStore = {
    async get() { return { journalId: 'different-owner-journal', previousRecords: { characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [] } }; },
    async put() { return true; },
    async remove() { return true; },
  };
  const instMismatch = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    snapshotStore: mismatchStore,
    webLocks: null,
  });
  persistentLocal.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({
    id: 'active-j-1',
    status: RESTORE_STAGES.FAILED_SETTINGS,
    idbCommitted: true,
    settingsApplied: false,
    snapshotPersisted: true,
    atomicAcrossStorages: false,
  }));
  await assert.rejects(
    instMismatch.service.rollbackIndexedDb('active-j-1'),
    err => err instanceof BackupRestoreError && err.code === 'SNAPSHOT_OWNERSHIP_MISMATCH',
  );
  persistentLocal.removeItem(RESTORE_JOURNAL_KEY);
}

// ============================================================================
// S03: Web Locks API exclusive lock + advisory fallback, LOCK_OWNERSHIP_LOST,
// isRestoreInProgress() + session-save-coordinator guard, and commit marker ownership.
// ============================================================================
{
  // 1. Web Locks API available -> crossTabLockMechanism === 'web-locks', crossTabLockAtomic === true.
  const heldLocks = new Set();
  const fakeWebLocks = {
    async request(name, opts, callback) {
      assert.equal(opts.mode, 'exclusive');
      assert.equal(opts.ifAvailable, true);
      if (heldLocks.has(name)) {
        return callback(null);
      }
      heldLocks.add(name);
      try {
        return await callback({ name, mode: 'exclusive' });
      } finally {
        heldLocks.delete(name);
      }
    },
  };

  const idbBacking = createPersistentIdbBacking();
  const persistentLocal = createMemoryStorage();
  const snapStore = createDurableRecoveryStore({ indexedDB: null, storage: createMemoryStorage() });

  let releaseMerge;
  const enteredMerge = new Promise(resolve => {
    idbBacking.setBeforeCommitHook(() => {
      resolve();
      return new Promise(r => { releaseMerge = r; });
    });
  });

  const tab1 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'weblock-tab-1',
    snapshotStore: snapStore,
    webLocks: fakeWebLocks,
  });
  const tab2 = createServiceInstance(idbBacking, persistentLocal, createMemoryStorage(), {
    ownerId: 'weblock-tab-2',
    snapshotStore: snapStore,
    webLocks: fakeWebLocks,
  });
  assert.equal(tab1.service.crossTabLockMechanism, 'web-locks');
  assert.equal(tab1.service.crossTabLockAtomic, true);

  // SessionSaveCoordinator guarded by tab1.service.isRestoreInProgress
  const saveWrites = [];
  const coordinator = createSessionSaveCoordinator({
    sessionId: 's-guard',
    initialRevision: 1,
    getState: () => ({ sessionId: 's-guard', chatHistory: [] }),
    getRevision: () => 1,
    captureSnapshot: s => ({ ...s }),
    queue: createSessionWriteQueue(async r => saveWrites.push(r)),
    isRestoreInProgress: () => tab1.service.isRestoreInProgress(),
  });

  const tab1Restore = tab1.service.restore(buildBackupPayload());
  await enteredMerge;

  // During active restore: isRestoreInProgress() === true, assertNotRestoring() throws,
  // coordinator.flush({ force: true }) throws RESTORE_IN_PROGRESS, and tab2 Web Lock rejects!
  assert.equal(tab1.service.isRestoreInProgress(), true);
  assert.throws(() => tab1.service.assertNotRestoring(), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(
    coordinator.flush({ force: true }),
    err => err.code === 'RESTORE_IN_PROGRESS',
  );
  assert.equal(saveWrites.length, 0);

  await assert.rejects(
    tab2.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError
      && err.code === 'CONCURRENT_RESTORE_IN_PROGRESS'
      && err.crossTabLockMechanism === 'web-locks'
      && err.crossTabLockAtomic === true,
  );

  releaseMerge();
  const res = await tab1Restore;
  assert.equal(res.ok, true);
  assert.equal(res.crossTabLockMechanism, 'web-locks');
  assert.equal(res.crossTabLockAtomic, true);
  assert.equal(tab1.service.isRestoreInProgress(), false);
  assert.equal(await tab1.repositories.readRestoreCommitMarker(), null, 'commit marker must be cleaned up on completion');

  // After restore finishes, coordinator can save normally.
  assert.equal(await coordinator.flush({ force: true }), true);
  assert.equal(saveWrites.length, 1);

  // 2. LOCK_OWNERSHIP_LOST when advisory lock is stolen mid-operation before settings apply + commit marker has ownerId/operationId.
  const idbBacking2 = createPersistentIdbBacking();
  const local2 = createMemoryStorage();
  const snapStore2 = createDurableRecoveryStore({ indexedDB: null, storage: createMemoryStorage() });
  const tabSteal = createServiceInstance(idbBacking2, local2, createMemoryStorage(), {
    ownerId: 'victim-owner',
    snapshotStore: snapStore2,
    webLocks: null,
  });
  assert.equal(tabSteal.service.crossTabLockMechanism, 'localStorage-advisory');
  assert.equal(tabSteal.service.crossTabLockAtomic, false);

  const origSet = local2.setItem;
  let stealOnce = true;
  local2.setItem = (key, value) => {
    origSet(key, value);
    if (stealOnce && key === RESTORE_JOURNAL_KEY) {
      const parsed = JSON.parse(value);
      if (parsed.status === RESTORE_STAGES.APPLYING_SETTINGS) {
        stealOnce = false;
        // Another tab steals the lock right before settings mutation!
        origSet(RESTORE_LOCK_KEY, JSON.stringify({
          ownerId: 'attacker-owner',
          operationId: 'stolen-op-1',
          journalId: 'stolen-j-1',
          acquiredAt: Date.now(),
          expiresAt: Date.now() + 60_000,
        }));
      }
    }
  };

  await assert.rejects(
    tabSteal.service.restore(buildBackupPayload()),
    err => err instanceof BackupRestoreError && err.code === 'LOCK_OWNERSHIP_LOST',
  );
  // Web Storage settings must NOT have been applied after lock ownership was lost!
  assert.equal(local2.getItem(SETTINGS_STORAGE_KEYS.arenaSettings), null);
  // Commit marker written during IDB commit includes ownerId and operationId.
  const marker = await tabSteal.repositories.readRestoreCommitMarker();
  assert.ok(marker);
  assert.equal(marker.ownerId, 'victim-owner');
  assert.equal(typeof marker.operationId, 'string');
}

console.log('P0 Backup Recovery S01/S02/S03 (cross-storage rollback, credential redaction, stale snapshot rejection, Web Locks & ownership): OK');

