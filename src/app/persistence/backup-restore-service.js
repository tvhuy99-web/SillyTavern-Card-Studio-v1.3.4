import {
  MAX_AVATAR_BASE64_LENGTH,
  assertBackupArray,
  decodeBase64ToBuffer,
  encodeBufferToBase64,
  isPlainObject,
  prepareBackupSettings,
  restoreBackupSettings,
  validateRecordBatches,
} from './backup-codec.js';
import { CROSS_TAB_EVENTS } from './cross-tab-sync.js';

// Durable restore journal & cross-tab lock keys.
//
// HONESTY CONTRACT:
// 1. IndexedDB and Web Storage are separate persistence engines and CANNOT be committed
//    atomically across storages (atomicAcrossStorages: false).
// 2. When navigator.locks.request is available, cross-tab mutual exclusion uses an
//    exclusive non-blocking Web Lock (crossTabLockMechanism: 'web-locks', crossTabLockAtomic: true).
//    When unavailable, it falls back to a localStorage advisory lease
//    (crossTabLockMechanism: 'localStorage-advisory', crossTabLockAtomic: false) — NEVER
//    claiming localStorage is atomic. Both modes are paired with strict in-process mutual exclusion.
// 3. IndexedDB commit verification relies on a durable commit marker (with journalId,
//    ownerId, operationId) written inside the EXACT same IndexedDB transaction as restored records.
// 4. Credentials & sensitive settings are NEVER written to RESTORE_JOURNAL_KEY, inspection
//    results, error messages, or logs; they exist only inside the dedicated durable snapshotStore
//    record (containsSensitiveSettings: true) and are wiped immediately on completion or full rollback.
export const RESTORE_JOURNAL_KEY = 'stcs:backup-restore:journal:v1';
export const RESTORE_LOCK_KEY = 'stcs:backup-restore:lock:v1';

export const RECOVERY_DATABASE = Object.freeze({
  name: 'SillyTavernCardStudioRecoveryDB',
  version: 1,
  store: 'restoreSnapshots',
  keyPath: 'journalId',
});

export const RESTORE_STAGES = Object.freeze({
  VALIDATED: 'validated',
  STAGED: 'staged',
  SNAPSHOT_PERSISTED: 'snapshot-persisted',
  JOURNALED: 'journaled',
  APPLYING_IDB: 'applying-idb',
  IDB_COMMITTED: 'idb-committed',
  APPLYING_SETTINGS: 'applying-settings',
  SETTINGS_APPLIED: 'settings-applied',
  COMPLETED: 'completed',
  FAILED_IDB: 'failed-idb',
  FAILED_SETTINGS: 'failed-settings',
  RECOVERING: 'recovering',
  PARTIAL_ROLLBACK: 'partial-rollback',
  ROLLED_BACK: 'rolled-back',
});

const PRE_IDB_STAGES = new Set([
  RESTORE_STAGES.VALIDATED,
  RESTORE_STAGES.STAGED,
  RESTORE_STAGES.SNAPSHOT_PERSISTED,
  RESTORE_STAGES.JOURNALED,
]);

const UNRESOLVED_STAGES = new Set([
  RESTORE_STAGES.JOURNALED,
  RESTORE_STAGES.APPLYING_IDB,
  RESTORE_STAGES.IDB_COMMITTED,
  RESTORE_STAGES.APPLYING_SETTINGS,
  RESTORE_STAGES.SETTINGS_APPLIED,
  RESTORE_STAGES.FAILED_SETTINGS,
  RESTORE_STAGES.RECOVERING,
  RESTORE_STAGES.PARTIAL_ROLLBACK,
]);

const SETTINGS_TOUCHED_STAGES = new Set([
  RESTORE_STAGES.APPLYING_SETTINGS,
  RESTORE_STAGES.SETTINGS_APPLIED,
  RESTORE_STAGES.FAILED_SETTINGS,
  RESTORE_STAGES.PARTIAL_ROLLBACK,
  RESTORE_STAGES.RECOVERING,
]);

const STORE_CONFIG = Object.freeze([
  ['characters', 'characters', 'fileName'],
  ['presets', 'presets', 'name'],
  ['lorebooks', 'lorebooks', 'name'],
  ['personas', 'personas', 'id'],
  ['chatSessions', 'sessions', 'sessionId'],
]);

const DEFAULT_LOCK_TTL_MS = 60_000;
let sequenceCounter = 0;

function nextId(prefix, now) {
  sequenceCounter += 1;
  return `${prefix}-${now()}-${sequenceCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveJournalIdArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object' && typeof arg.journalId === 'string') return arg.journalId;
  return undefined;
}

function sanitizeErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return raw
    .replace(/AIza[\w-]{10,}|sk-[\w-]{10,}|Bearer\s+\S+/gi, '[REDACTED]')
    .slice(0, 300);
}

export class BackupRestoreError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause ? { cause: details.cause } : undefined);
    this.name = 'BackupRestoreError';
    this.code = details.code || 'BACKUP_RESTORE_FAILED';
    this.phase = details.phase || 'unknown';
    this.journalId = details.journalId || null;
    this.idbCommitted = Boolean(details.idbCommitted);
    this.settingsApplied = Boolean(details.settingsApplied);
    this.idbRolledBack = Boolean(details.idbRolledBack);
    this.settingsRolledBack = Boolean(details.settingsRolledBack);
    if (details.rollbackScope !== undefined) this.rollbackScope = details.rollbackScope;
    this.atomicAcrossStorages = false;
    this.crossTabLockMechanism = details.crossTabLockMechanism || 'localStorage-advisory';
    this.crossTabLockAtomic = Boolean(details.crossTabLockAtomic);
    this.recoverable = Boolean(details.recoverable);
  }
}

async function serializeRecordsForStorage(records) {
  if (!records || typeof records !== 'object') return records;
  const serializedCharacters = [];
  for (const character of records.characters || []) {
    if (character?.avatar?.buffer) {
      serializedCharacters.push({
        ...character,
        avatar: {
          ...character.avatar,
          buffer: {
            __stsBinaryBase64: true,
            data: await encodeBufferToBase64(character.avatar.buffer),
          },
        },
      });
    } else {
      serializedCharacters.push(character);
    }
  }
  return {
    ...records,
    characters: serializedCharacters,
  };
}

async function deserializeRecordsFromStorage(records) {
  if (!records || typeof records !== 'object') return records;
  const deserializedCharacters = [];
  for (const character of records.characters || []) {
    if (character?.avatar?.buffer?.__stsBinaryBase64) {
      deserializedCharacters.push({
        ...character,
        avatar: {
          ...character.avatar,
          buffer: await decodeBase64ToBuffer(character.avatar.buffer.data, character.avatar.type || 'image/png'),
        },
      });
    } else {
      deserializedCharacters.push(character);
    }
  }
  return {
    ...records,
    characters: deserializedCharacters,
  };
}

// Durable snapshot store backed by a dedicated IndexedDB database (SillyTavernCardStudioRecoveryDB v1,
// objectStore "restoreSnapshots", keyPath "journalId") with structured Web Storage fallback when
// IndexedDB is unavailable (e.g., Node test environments without global indexedDB).
export function createDurableRecoveryStore({
  indexedDB = typeof globalThis.indexedDB !== 'undefined' ? globalThis.indexedDB : null,
  storage = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null,
  dbName = RECOVERY_DATABASE.name,
  dbVersion = RECOVERY_DATABASE.version,
  storeName = RECOVERY_DATABASE.store,
  keyPath = RECOVERY_DATABASE.keyPath,
  storagePrefix = 'stcs:backup-restore:snapshot:',
} = {}) {
  if (indexedDB && typeof indexedDB.open === 'function') {
    let connection = null;

    function openDb() {
      if (connection) return connection;
      const pending = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath });
          }
        };
        request.onerror = () => reject(new Error('Không thể mở kho snapshot phục hồi IndexedDB.', { cause: request.error }));
        request.onsuccess = () => {
          const db = request.result;
          const invalidate = () => { if (connection === pending) connection = null; };
          db.onversionchange = () => { db.close(); invalidate(); };
          db.onclose = invalidate;
          resolve(db);
        };
      });
      connection = pending;
      pending.catch(() => { if (connection === pending) connection = null; });
      return pending;
    }

    async function runTx(mode, enqueue, message) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        let tx;
        let result;
        let failure;
        const fail = cause => new Error(message, { cause });
        const abort = cause => {
          failure = cause;
          try { tx.abort(); } catch { reject(fail(cause)); }
        };
        try {
          tx = db.transaction([storeName], mode);
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => { if (!failure && tx.error) failure = tx.error; };
          tx.onabort = () => reject(fail(failure || tx.error));
          enqueue(tx.objectStore(storeName), value => { result = value; }, abort);
        } catch (cause) {
          if (tx) abort(cause);
          else reject(fail(cause));
        }
      });
    }

    return Object.freeze({
      kind: 'indexeddb',
      async put(snapshot) {
        if (!snapshot || typeof snapshot.journalId !== 'string' || !snapshot.journalId.trim()) {
          throw new TypeError('Recovery snapshot requires a valid journalId');
        }
        await runTx('readwrite', (store, _setResult, abort) => {
          const request = store.put(snapshot);
          request.onerror = () => abort(request.error || new Error('Snapshot put failed'));
        }, 'Không thể lưu bản chụp phục hồi vào IndexedDB.');
        return true;
      },
      async get(journalId) {
        if (!journalId) return null;
        const record = await runTx('readonly', (store, setResult, abort) => {
          const request = store.get(journalId);
          request.onsuccess = () => setResult(request.result ?? null);
          request.onerror = () => abort(request.error || new Error('Snapshot get failed'));
        }, 'Không thể đọc bản chụp phục hồi từ IndexedDB.');
        return record ?? null;
      },
      async remove(journalId) {
        if (!journalId) return false;
        await runTx('readwrite', (store, _setResult, abort) => {
          const request = store.delete(journalId);
          request.onerror = () => abort(request.error || new Error('Snapshot delete failed'));
        }, 'Không thể xóa bản chụp phục hồi khỏi IndexedDB.');
        return true;
      },
    });
  }

  return Object.freeze({
    kind: 'storage-fallback',
    async put(snapshot) {
      if (!snapshot || typeof snapshot.journalId !== 'string' || !snapshot.journalId.trim()) {
        throw new TypeError('Recovery snapshot requires a valid journalId');
      }
      if (!storage || typeof storage.setItem !== 'function') {
        throw new Error('Recovery snapshot storage is unavailable.');
      }
      const serialized = {
        ...snapshot,
        previousRecords: await serializeRecordsForStorage(snapshot.previousRecords),
      };
      storage.setItem(`${storagePrefix}${snapshot.journalId}`, JSON.stringify(serialized));
      return true;
    },
    async get(journalId) {
      if (!journalId || !storage || typeof storage.getItem !== 'function') return null;
      const raw = storage.getItem(`${storagePrefix}${journalId}`);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!isPlainObject(parsed)) return null;
        return {
          ...parsed,
          previousRecords: await deserializeRecordsFromStorage(parsed.previousRecords),
        };
      } catch {
        return null;
      }
    },
    async remove(journalId) {
      if (!journalId || !storage || typeof storage.removeItem !== 'function') return false;
      try {
        storage.removeItem(`${storagePrefix}${journalId}`);
        return true;
      } catch {
        return false;
      }
    },
  });
}

function validateBackupEnvelope(rawBackup) {
  if (!isPlainObject(rawBackup) || rawBackup.dataType !== 'full_system_backup' || !isPlainObject(rawBackup.data)) {
    throw new BackupRestoreError('File không phải là định dạng Sao lưu Hệ thống hợp lệ.', {
      code: 'INVALID_BACKUP_FORMAT',
      phase: 'validate',
    });
  }
  const data = rawBackup.data;
  const characters = assertBackupArray(data.characters, 'characters');
  const presets = assertBackupArray(data.presets, 'presets');
  const lorebooks = assertBackupArray(data.lorebooks, 'lorebooks');
  const personas = assertBackupArray(data.personas, 'personas');
  const chatSessions = assertBackupArray(data.chatSessions, 'chatSessions');
  if (!isPlainObject(data.appSettings)) {
    throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: appSettings phải là một đối tượng.', {
      code: 'INVALID_BACKUP_SETTINGS',
      phase: 'validate',
    });
  }

  for (const item of [...presets, ...lorebooks, ...personas]) {
    if (!isPlainObject(item)) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có mục dữ liệu không phải đối tượng.', {
        code: 'INVALID_BACKUP_RECORD',
        phase: 'validate',
      });
    }
  }
  for (const character of characters) {
    if (!isPlainObject(character) || !isPlainObject(character.card) || typeof character.fileName !== 'string' || !character.fileName.trim() || character.fileName.length > 500) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có nhân vật không hợp lệ.', {
        code: 'INVALID_CHARACTER_RECORD',
        phase: 'validate',
      });
    }
    if (character.avatarBase64 !== undefined) {
      if (typeof character.avatarBase64 !== 'string' || character.avatarBase64.length > MAX_AVATAR_BASE64_LENGTH || !/^[A-Za-z0-9+/]*={0,2}$/.test(character.avatarBase64.replace(/\s/g, ''))) {
        throw new BackupRestoreError(`Ảnh đại diện của "${character.fileName}" không hợp lệ hoặc quá lớn.`, {
          code: 'INVALID_AVATAR_BASE64',
          phase: 'validate',
        });
      }
    }
  }
  for (const session of chatSessions) {
    if (!isPlainObject(session) || typeof session.sessionId !== 'string' || !session.sessionId.trim() || session.sessionId.length > 500 || !Array.isArray(session.chatHistory)) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có phiên chat không hợp lệ.', {
        code: 'INVALID_SESSION_RECORD',
        phase: 'validate',
      });
    }
  }

  validateRecordBatches({ characters, presets, lorebooks, personas, chatSessions });
  return { characters, presets, lorebooks, personas, chatSessions, appSettings: data.appSettings };
}

function computeAddedKeys(previousRecords, incomingRecords) {
  const addedKeys = {};
  for (const [batchKey, _repoKey, keyPath] of STORE_CONFIG) {
    const existingKeys = new Set((previousRecords?.[batchKey] || []).map(record => record?.[keyPath]));
    addedKeys[batchKey] = (incomingRecords?.[batchKey] || [])
      .map(record => record?.[keyPath])
      .filter(key => typeof key === 'string' && !existingKeys.has(key));
  }
  return addedKeys;
}

function capturePreviousSettingsSnapshot(storage, backupOptions, incomingEntries) {
  const scopedKeys = new Set();
  for (const key of backupOptions?.allowed || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const key of Object.values(backupOptions?.keys || {})) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const key of storage?.proxy?.getOwnedStorageKeys?.() || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const [key] of incomingEntries || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }

  const prefix = backupOptions?.prefix;
  if (typeof prefix === 'string' && prefix) {
    for (const store of [storage?.local, storage?.session]) {
      if (!store || typeof store.length !== 'number' || typeof store.key !== 'function') continue;
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (typeof key === 'string' && key.startsWith(prefix)) scopedKeys.add(key);
      }
    }
  }

  const localEntries = [];
  const sessionEntries = [];
  const addedSettingsKeys = [];

  for (const key of scopedKeys) {
    const prevLocal = storage?.local?.getItem?.(key) ?? null;
    const prevSession = storage?.session?.getItem?.(key) ?? null;
    localEntries.push([key, prevLocal]);
    sessionEntries.push([key, prevSession]);
    if (prevLocal === null && prevSession === null) {
      addedSettingsKeys.push(key);
    }
  }

  return {
    local: localEntries,
    session: sessionEntries,
    addedSettingsKeys,
  };
}

function restorePreviousSettingsSnapshot(previousSettings, storage) {
  const stores = [
    [storage?.local, previousSettings?.local || []],
    [storage?.session, previousSettings?.session || []],
  ];
  for (const [target, pairs] of stores) {
    if (!target || typeof target.getItem !== 'function') continue;
    for (const [key, previousValue] of pairs) {
      const current = target.getItem(key);
      if (current === previousValue) continue;
      if (previousValue === null || previousValue === undefined) {
        target.removeItem(key);
      } else {
        target.setItem(key, previousValue);
      }
    }
  }
}

function isUnresolvedJournal(journal) {
  return Boolean(journal && UNRESOLVED_STAGES.has(journal.status));
}

function computeAvailableActions({ journal, commitState, idbCommitted, hasSettingsEntries, hasDurableSnapshot }) {
  if (!journal) {
    return { canRetrySettings: false, canRollbackIdb: false, canDismiss: false };
  }
  if (journal.status === RESTORE_STAGES.PARTIAL_ROLLBACK) {
    const canRollbackIdb = Boolean(hasDurableSnapshot);
    return {
      canRetrySettings: false,
      canRollbackIdb,
      canDismiss: !canRollbackIdb,
    };
  }
  if (commitState === 'verified-committed' && idbCommitted) {
    const canRetrySettings = Boolean(hasSettingsEntries) && journal.status !== RESTORE_STAGES.SETTINGS_APPLIED;
    const canRollbackIdb = Boolean(hasDurableSnapshot);
    const canDismiss = !canRetrySettings && !canRollbackIdb;
    return { canRetrySettings, canRollbackIdb, canDismiss };
  }
  if (commitState === 'pre-idb') {
    return {
      canRetrySettings: false,
      canRollbackIdb: false,
      canDismiss: true,
    };
  }
  // commitState === 'unverified-or-aborted'
  const canRollbackIdb = Boolean(hasDurableSnapshot);
  return {
    canRetrySettings: false,
    canRollbackIdb,
    canDismiss: !canRollbackIdb,
  };
}

export function createBackupRestoreService({
  repositories,
  storage,
  backupOptions,
  crossTabSync = null,
  journalStorage = storage?.local ?? globalThis.localStorage,
  journalKey = RESTORE_JOURNAL_KEY,
  lockKey = RESTORE_LOCK_KEY,
  lockTtlMs = DEFAULT_LOCK_TTL_MS,
  ownerId,
  snapshotStore,
  webLocks = typeof globalThis.navigator !== 'undefined' ? globalThis.navigator?.locks ?? null : null,
  now = () => Date.now(),
  decodeBase64 = decodeBase64ToBuffer,
} = {}) {
  if (!repositories || typeof repositories.mergeRecords !== 'function' || typeof repositories.exportRecords !== 'function') {
    throw new TypeError('BackupRestoreService requires entity repositories with exportRecords and mergeRecords');
  }
  if (!storage || !backupOptions) {
    throw new TypeError('BackupRestoreService requires storage and backupOptions');
  }

  const instanceOwnerId = ownerId || crossTabSync?.tabId || nextId('owner', now);
  const hasWebLocks = Boolean(webLocks && typeof webLocks.request === 'function');
  const crossTabLockMechanism = hasWebLocks ? 'web-locks' : 'localStorage-advisory';
  const crossTabLockAtomic = hasWebLocks;
  const lockMeta = { crossTabLockMechanism, crossTabLockAtomic };

  const durableSnapshotStore = snapshotStore || createDurableRecoveryStore({
    storage: journalStorage,
  });

  // Strict in-process mutual exclusion across restore / recover / dismiss on this instance.
  let activeOperation = null;
  const activeWrites = new Set();
  function runOrdinaryWrite(operation, work) {
    assertNotRestoring(operation);
    const execute = () => {
      assertNotRestoring(operation);
      return work();
    };
    // Hold a shared lock until the transaction settles. Restore uses an exclusive lock.
    const pending = Promise.resolve(hasWebLocks
      ? webLocks.request(lockKey, { mode: 'shared', ifAvailable: true }, lock => {
          if (!lock) throw new BackupRestoreError('Restore write boundary is busy.', { code: 'RESTORE_IN_PROGRESS', phase: 'guard' });
          return execute();
        })
      : execute());
    activeWrites.add(pending);
    pending.then(() => activeWrites.delete(pending), () => activeWrites.delete(pending));
    return pending;
  }
  async function drainOrdinaryWrites() {
    await Promise.allSettled([...activeWrites]);
  }
  let restoreEpoch = 0;
  const lifecycleListeners = new Set();

  function getRestoreEpoch() {
    return restoreEpoch;
  }

  function subscribeRestoreLifecycle(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Restore lifecycle listener must be a function');
    }
    lifecycleListeners.add(listener);
    return () => { lifecycleListeners.delete(listener); };
  }

  function emitRestoreLifecycle(type, journalId = null) {
    const event = Object.freeze({
      type,
      epoch: restoreEpoch,
      journalId: journalId || null,
    });
    for (const listener of [...lifecycleListeners]) {
      try {
        listener(event);
      } catch {
        // Isolate lifecycle subscribers from restore execution.
      }
    }
  }

  function beginOperation(type, journalId = null) {
    if (activeOperation !== null) {
      const code = type === 'restore' && activeOperation.type === 'restore'
        ? 'CONCURRENT_RESTORE_IN_PROGRESS'
        : 'CONCURRENT_OPERATION_IN_PROGRESS';
      throw new BackupRestoreError(
        `Một thao tác khôi phục (${activeOperation.type}) đang chạy trên phiên này. Vui lòng chờ hoàn tất trước khi thực hiện ${type}.`,
        {
          code,
          phase: 'concurrency',
          journalId: activeOperation.journalId || journalId || null,
          recoverable: false,
          ...lockMeta,
        },
      );
    }
    const op = {
      operationId: nextId('op', now),
      type,
      journalId,
      startedAt: now(),
    };
    activeOperation = op;
    return op;
  }

  function endOperation(op) {
    if (activeOperation && op && activeOperation.operationId === op.operationId) {
      activeOperation = null;
    }
  }

  function readJournal() {
    if (!journalStorage || typeof journalStorage.getItem !== 'function') return null;
    try {
      const raw = journalStorage.getItem(journalKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  // Persist non-sensitive journal metadata ONLY — never write plaintext credentials or secrets here,
  // and never silently swallow journal write errors.
  function writeJournal(entry, { allowCompactFallback = false } = {}) {
    if (!journalStorage || typeof journalStorage.setItem !== 'function') {
      throw new BackupRestoreError('Kho lưu nhật ký khôi phục Web Storage không khả dụng.', {
        code: 'JOURNAL_WRITE_FAILED',
        phase: 'journal',
        journalId: entry?.id || null,
        idbCommitted: Boolean(entry?.idbCommitted),
        settingsApplied: Boolean(entry?.settingsApplied),
        recoverable: Boolean(entry?.idbCommitted),
        ...lockMeta,
      });
    }
    // Strip any sensitive settings payload if accidentally passed on entry.
    const {
      settingsEntries: _omitIncoming,
      previousSettings: _omitPrevious,
      ...safeEntry
    } = entry || {};
    const fullRecord = {
      ...safeEntry,
      atomicAcrossStorages: false,
      crossTabLockMechanism,
      crossTabLockAtomic,
      updatedAt: now(),
    };
    try {
      journalStorage.setItem(journalKey, JSON.stringify(fullRecord));
      return fullRecord;
    } catch (firstError) {
      if (!allowCompactFallback) {
        throw new BackupRestoreError('Không thể ghi nhật ký khôi phục vào Web Storage.', {
          code: 'JOURNAL_WRITE_FAILED',
          phase: 'journal',
          journalId: fullRecord.id || null,
          idbCommitted: Boolean(fullRecord.idbCommitted),
          settingsApplied: Boolean(fullRecord.settingsApplied),
          recoverable: Boolean(fullRecord.idbCommitted),
          cause: firstError,
          ...lockMeta,
        });
      }
      const compactRecord = {
        id: fullRecord.id,
        status: fullRecord.status,
        createdAt: fullRecord.createdAt,
        updatedAt: fullRecord.updatedAt,
        idbCommitted: Boolean(fullRecord.idbCommitted),
        settingsApplied: Boolean(fullRecord.settingsApplied),
        idbRolledBack: Boolean(fullRecord.idbRolledBack),
        settingsRolledBack: Boolean(fullRecord.settingsRolledBack),
        snapshotPersisted: Boolean(fullRecord.snapshotPersisted),
        hasSettingsEntries: Boolean(fullRecord.hasSettingsEntries),
        containsSensitiveSettings: Boolean(fullRecord.containsSensitiveSettings),
        errorName: fullRecord.errorName || null,
        errorMessage: fullRecord.errorMessage ? sanitizeErrorMessage(fullRecord.errorMessage) : null,
        compact: true,
        atomicAcrossStorages: false,
        crossTabLockMechanism,
        crossTabLockAtomic,
      };
      try {
        journalStorage.setItem(journalKey, JSON.stringify(compactRecord));
        return compactRecord;
      } catch (compactError) {
        throw new BackupRestoreError('Không thể ghi cả nhật ký khôi phục rút gọn vào Web Storage.', {
          code: 'JOURNAL_WRITE_FAILED',
          phase: 'journal',
          journalId: fullRecord.id || null,
          idbCommitted: Boolean(fullRecord.idbCommitted),
          settingsApplied: Boolean(fullRecord.settingsApplied),
          recoverable: Boolean(fullRecord.idbCommitted),
          cause: compactError,
          ...lockMeta,
        });
      }
    }
  }

  function clearJournal() {
    if (!journalStorage || typeof journalStorage.removeItem !== 'function') return;
    journalStorage.removeItem(journalKey);
  }

  function readLock() {
    if (!journalStorage || typeof journalStorage.getItem !== 'function') return null;
    try {
      const raw = journalStorage.getItem(lockKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  // Advisory lease keyed by BOTH ownerId and unique operationId (never ownerId-only re-entry).
  function acquireAdvisoryLock(op, journalId) {
    if (!journalStorage || typeof journalStorage.setItem !== 'function') return true;
    const current = readLock();
    const timestamp = now();
    if (
      current &&
      typeof current.expiresAt === 'number' &&
      current.expiresAt > timestamp &&
      current.operationId !== op.operationId
    ) {
      throw new BackupRestoreError(
        'Một tiến trình hoặc tab khác đang giữ khóa khôi phục dữ liệu. Vui lòng chờ hoàn tất trước khi thử lại.',
        {
          code: 'CONCURRENT_RESTORE_IN_PROGRESS',
          phase: 'lock',
          journalId: current.journalId || null,
          recoverable: false,
          ...lockMeta,
        },
      );
    }
    const lockRecord = {
      ownerId: instanceOwnerId,
      operationId: op.operationId,
      type: op.type,
      journalId,
      acquiredAt: timestamp,
      expiresAt: timestamp + lockTtlMs,
      crossTabLockMechanism,
      crossTabLockAtomic,
    };
    try {
      journalStorage.setItem(lockKey, JSON.stringify(lockRecord));
    } catch (cause) {
      throw new BackupRestoreError('Không thể khóa tiến trình khôi phục trong Web Storage.', {
        code: 'LOCK_ACQUIRE_FAILED',
        phase: 'lock',
        journalId,
        recoverable: false,
        cause,
        ...lockMeta,
      });
    }
    return lockRecord;
  }

  function renewLock(op, journalId) {
    if (!journalStorage || typeof journalStorage.setItem !== 'function') return true;
    const current = readLock();
    if (!current || current.ownerId !== instanceOwnerId || current.operationId !== op.operationId) {
      throw new BackupRestoreError('Khóa khôi phục đã bị mất hoặc bị chiếm bởi thao tác khác.', {
        code: 'LOCK_OWNERSHIP_LOST',
        phase: 'lock',
        journalId,
        recoverable: false,
        ...lockMeta,
      });
    }
    const timestamp = now();
    const renewed = {
      ownerId: instanceOwnerId,
      operationId: op.operationId,
      type: op.type,
      journalId,
      acquiredAt: current.acquiredAt ?? timestamp,
      expiresAt: timestamp + lockTtlMs,
      crossTabLockMechanism,
      crossTabLockAtomic,
    };
    try {
      journalStorage.setItem(lockKey, JSON.stringify(renewed));
      return true;
    } catch (cause) {
      throw new BackupRestoreError('Không thể gia hạn khóa khôi phục trong Web Storage.', {
        code: 'LOCK_OWNERSHIP_LOST',
        phase: 'lock',
        journalId,
        recoverable: false,
        cause,
        ...lockMeta,
      });
    }
  }

  function releaseAdvisoryLock(op) {
    if (!journalStorage || typeof journalStorage.removeItem !== 'function') return;
    try {
      const current = readLock();
      if (current && current.ownerId === instanceOwnerId && current.operationId === op.operationId) {
        journalStorage.removeItem(lockKey);
      }
    } catch {
      // Ignore lock release errors during teardown.
    }
  }

  // Acquire exclusive cross-tab lock: Web Locks API when available, localStorage advisory fallback otherwise.
  async function withExclusiveLock(op, journalId, work) {
    if (hasWebLocks) {
      // Stop admitting new local writers and let already-started writes release their shared locks.
      await drainOrdinaryWrites();
      return webLocks.request(lockKey, { mode: 'exclusive', ifAvailable: true }, async lock => {
        if (!lock) {
          throw new BackupRestoreError(
            'Một tab khác đang giữ Web Lock khôi phục dữ liệu. Vui lòng chờ hoàn tất trước khi thử lại.',
            {
              code: 'CONCURRENT_RESTORE_IN_PROGRESS',
              phase: 'lock',
              journalId: readLock()?.journalId || null,
              recoverable: false,
              ...lockMeta,
            },
          );
        }
        acquireAdvisoryLock(op, journalId);
        try {
          await drainOrdinaryWrites();
          return await work();
        } finally {
          releaseAdvisoryLock(op);
        }
      });
    }

    acquireAdvisoryLock(op, journalId);
    try {
      await drainOrdinaryWrites();
      return await work();
    } finally {
      releaseAdvisoryLock(op);
    }
  }

  // Revalidate active in-process operation, journal identity, and lock ownership immediately before any mutation.
  function assertOwnershipBeforeMutation(op, expectedJournalId) {
    if (!activeOperation || activeOperation.operationId !== op.operationId) {
      throw new BackupRestoreError('Quyền sở hữu thao tác khôi phục trong tiến trình đã bị mất.', {
        code: 'LOCK_OWNERSHIP_LOST',
        phase: 'ownership',
        journalId: expectedJournalId,
        ...lockMeta,
      });
    }
    const currentJournal = readJournal();
    if (!currentJournal || currentJournal.id !== expectedJournalId) {
      throw new BackupRestoreError(`Nhật ký khôi phục "${expectedJournalId}" đã thay đổi hoặc bị xóa trước khi ghi dữ liệu.`, {
        code: 'JOURNAL_ID_MISMATCH',
        phase: 'ownership',
        journalId: expectedJournalId,
        ...lockMeta,
      });
    }
    renewLock(op, expectedJournalId);
  }

  function isRestoreInProgress() {
    if (activeOperation !== null) return true;
    const lock = readLock();
    if (lock && typeof lock.expiresAt === 'number' && lock.expiresAt > now()) return true;
    return getPendingRecovery() !== null;
  }

  function assertNotRestoring(operationName = 'write') {
    const lock = readLock();
    const hasActiveLock = Boolean(lock && typeof lock.expiresAt === 'number' && lock.expiresAt > now());
    if (activeOperation !== null || hasActiveLock) {
      throw new BackupRestoreError(
        `Hệ thống đang khôi phục sao lưu. Không thể thực hiện thao tác ghi "${operationName}" đồng thời.`,
        {
          code: 'RESTORE_IN_PROGRESS',
          phase: 'guard',
          journalId: activeOperation?.journalId || lock?.journalId || null,
          ...lockMeta,
        },
      );
    }
    const pending = getPendingRecovery();
    if (pending) {
      throw new BackupRestoreError(
        `Đang tồn tại phiên phục hồi chưa hoàn tất. Không thể thực hiện thao tác ghi "${operationName}" cho đến khi hoàn tất phục hồi.`,
        {
          code: 'PENDING_RECOVERY_EXISTS',
          phase: 'guard',
          journalId: pending.id || null,
          idbCommitted: Boolean(pending.idbCommitted),
          settingsApplied: Boolean(pending.settingsApplied),
          recoverable: true,
          ...lockMeta,
        },
      );
    }
    return true;
  }

  async function removeSnapshotQuietly(journalId) {
    if (!journalId) return;
    try {
      await durableSnapshotStore.remove(journalId);
    } catch {
      // Best-effort snapshot cleanup.
    }
  }

  async function clearCommitMarkerQuietly() {
    if (typeof repositories.clearRestoreCommitMarker !== 'function') return;
    try {
      await repositories.clearRestoreCommitMarker();
    } catch {
      // Best-effort commit marker cleanup.
    }
  }

  // Deterministic verification of whether IndexedDB actually committed this journal.
  async function verifyIdbCommitState(journal) {
    if (!journal) {
      return { idbCommitted: false, commitState: 'none', marker: null };
    }
    if (journal.status === RESTORE_STAGES.PARTIAL_ROLLBACK && journal.idbRolledBack) {
      return { idbCommitted: false, commitState: 'idb-rolled-back', marker: null };
    }
    if (typeof repositories.readRestoreCommitMarker === 'function') {
      const marker = await repositories.readRestoreCommitMarker();
      if (marker && marker.journalId === journal.id) {
        return { idbCommitted: true, commitState: 'verified-committed', marker };
      }
      if (PRE_IDB_STAGES.has(journal.status)) {
        return { idbCommitted: false, commitState: 'pre-idb', marker: marker || null };
      }
      return { idbCommitted: false, commitState: 'unverified-or-aborted', marker: marker || null };
    }
    if (journal.idbCommitted === true) {
      return { idbCommitted: true, commitState: 'verified-committed', marker: null };
    }
    if (PRE_IDB_STAGES.has(journal.status)) {
      return { idbCommitted: false, commitState: 'pre-idb', marker: null };
    }
    return { idbCommitted: false, commitState: 'unverified-or-aborted', marker: null };
  }

  // Step 1: Validate backup structure, entity keys, and preflight settings.
  function validate(rawBackup) {
    const data = validateBackupEnvelope(rawBackup);
    let settingsEntries;
    try {
      settingsEntries = prepareBackupSettings(data.appSettings, backupOptions);
    } catch (cause) {
      throw new BackupRestoreError(cause instanceof Error ? cause.message : 'Cấu hình trong bản sao lưu không hợp lệ.', {
        code: 'INVALID_BACKUP_SETTINGS',
        phase: 'validate',
        cause,
        ...lockMeta,
      });
    }
    return {
      stage: RESTORE_STAGES.VALIDATED,
      data,
      settingsEntries,
    };
  }

  // Step 2: Stage decoded records and capture BOTH pre-restore IDB snapshot and pre-restore Web Storage settings.
  async function stage(validated) {
    const { data, settingsEntries } = validated;
    const restoredCharacters = [];
    for (const character of data.characters) {
      restoredCharacters.push({
        card: character.card,
        fileName: character.fileName,
        avatar: character.avatarBase64
          ? {
            buffer: await decodeBase64(character.avatarBase64, character.avatarType || 'image/png'),
            name: character.fileName.replace(/\.json$/i, '.png'),
            type: character.avatarType || 'image/png',
          }
          : undefined,
      });
    }

    const records = {
      characters: restoredCharacters,
      presets: data.presets,
      lorebooks: data.lorebooks,
      personas: data.personas,
      chatSessions: data.chatSessions,
    };

    const previousRecords = await repositories.exportRecords();
    const addedKeys = computeAddedKeys(previousRecords, records);
    const previousSettings = capturePreviousSettingsSnapshot(storage, backupOptions, settingsEntries);

    return {
      stage: RESTORE_STAGES.STAGED,
      records,
      settingsEntries,
      previousRecords,
      previousSettings,
      addedKeys,
    };
  }

  function sanitizeJournalForInspection(journal) {
    const {
      settingsEntries: _omitIncoming,
      previousSettings: _omitPrevious,
      ...safe
    } = journal;
    return safe;
  }

  function getPendingRecovery() {
    const journal = readJournal();
    if (!isUnresolvedJournal(journal)) return null;
    const commitState = journal.status === RESTORE_STAGES.PARTIAL_ROLLBACK && journal.idbRolledBack
      ? 'idb-rolled-back'
      : PRE_IDB_STAGES.has(journal.status)
        ? 'pre-idb'
        : journal.idbCommitted
          ? 'verified-committed'
          : 'unverified-or-aborted';
    const hasSettingsEntries = Boolean(journal.hasSettingsEntries || Array.isArray(journal.settingsEntries) || journal.snapshotPersisted);
    const hasDurableSnapshot = Boolean(journal.snapshotPersisted);
    const availableActions = computeAvailableActions({
      journal,
      commitState,
      idbCommitted: Boolean(journal.idbCommitted),
      hasSettingsEntries,
      hasDurableSnapshot,
    });
    return {
      ...sanitizeJournalForInspection(journal),
      commitState,
      hasSettingsEntries,
      availableActions,
      atomicAcrossStorages: false,
      ...lockMeta,
    };
  }

  async function inspectPendingRecovery() {
    const journal = readJournal();
    if (!isUnresolvedJournal(journal)) return null;
    const [verification, snapshot] = await Promise.all([
      verifyIdbCommitState(journal),
      durableSnapshotStore.get(journal.id).catch(() => null),
    ]);
    const snapshotValid = Boolean(snapshot && snapshot.journalId === journal.id);
    const hasDurableSnapshot = snapshotValid && Boolean(snapshot.previousRecords);
    const hasPreviousSettings = snapshotValid && Boolean(snapshot.previousSettings);
    const hasSettingsEntries = (snapshotValid && Array.isArray(snapshot.settingsEntries)) || Array.isArray(journal.settingsEntries);
    const availableActions = computeAvailableActions({
      journal,
      commitState: verification.commitState,
      idbCommitted: verification.idbCommitted,
      hasSettingsEntries,
      hasDurableSnapshot,
    });
    return {
      ...sanitizeJournalForInspection(journal),
      idbCommitted: verification.idbCommitted,
      commitState: verification.commitState,
      hasDurableSnapshot,
      hasPreviousSettings,
      hasSettingsEntries,
      availableActions,
      atomicAcrossStorages: false,
      ...lockMeta,
    };
  }

  function requireActiveRecoveryJournal(requestedJournalId) {
    const journal = readJournal();
    if (!journal) {
      throw new BackupRestoreError('Không tìm thấy nhật ký khôi phục đang chờ xử lý.', {
        code: 'NO_PENDING_JOURNAL',
        phase: 'recovery',
        journalId: requestedJournalId || null,
        ...lockMeta,
      });
    }
    if (!isUnresolvedJournal(journal)) {
      throw new BackupRestoreError(`Nhật ký khôi phục "${journal.id}" đã ở trạng thái kết thúc ("${journal.status}").`, {
        code: 'STALE_RECOVERY_JOURNAL',
        phase: 'recovery',
        journalId: journal.id,
        ...lockMeta,
      });
    }
    if (requestedJournalId && journal.id !== requestedJournalId) {
      throw new BackupRestoreError(`Nhật ký khôi phục "${requestedJournalId}" không khớp với phiên hiện tại ("${journal.id}").`, {
        code: 'JOURNAL_ID_MISMATCH',
        phase: 'recovery',
        journalId: requestedJournalId,
        ...lockMeta,
      });
    }
    return journal;
  }

  // Recovery path A: Retry applying Web Storage settings — ONLY if active pending journal & IDB commit verified!
  async function retrySettings(journalIdArg, { settingsEntries: overrideEntries } = {}) {
    const requestedJournalId = resolveJournalIdArg(journalIdArg);
    const op = beginOperation('recover', requestedJournalId || null);
    try {
      const journal = requireActiveRecoveryJournal(requestedJournalId);
      const targetId = journal.id;
      op.journalId = targetId;

      return await withExclusiveLock(op, targetId, async () => {
        const [verification, snapshot] = await Promise.all([
          verifyIdbCommitState(journal),
          durableSnapshotStore.get(targetId).catch(() => null),
        ]);

        if (snapshot && snapshot.journalId !== targetId) {
          throw new BackupRestoreError('Bản chụp phục hồi không khớp với nhật ký hiện tại.', {
            code: 'SNAPSHOT_OWNERSHIP_MISMATCH',
            phase: 'recovery',
            journalId: targetId,
            ...lockMeta,
          });
        }

        if (!verification.idbCommitted || verification.commitState !== 'verified-committed') {
          throw new BackupRestoreError(
            'Không thể áp dụng lại cài đặt Web Storage vì chưa xác minh được dữ liệu IndexedDB đã commit.',
            {
              code: 'IDB_COMMIT_NOT_VERIFIED',
              phase: 'recovery',
              journalId: targetId,
              idbCommitted: false,
              settingsApplied: false,
              recoverable: Boolean(snapshot?.previousRecords),
              ...lockMeta,
            },
          );
        }

        const entries = overrideEntries ?? snapshot?.settingsEntries ?? journal.settingsEntries;
        if (!Array.isArray(entries)) {
          throw new BackupRestoreError('Thiếu dữ liệu cấu hình bền vững để thử lại khôi phục Web Storage.', {
            code: 'MISSING_SETTINGS_FOR_RETRY',
            phase: 'recovery',
            journalId: targetId,
            idbCommitted: true,
            recoverable: Boolean(snapshot?.previousRecords),
            ...lockMeta,
          });
        }

        writeJournal({
          ...journal,
          status: RESTORE_STAGES.RECOVERING,
          idbCommitted: true,
        }, { allowCompactFallback: true });

        assertOwnershipBeforeMutation(op, targetId);

        try {
          restoreBackupSettings(entries, storage);
        } catch (cause) {
          writeJournal({
            ...journal,
            status: RESTORE_STAGES.FAILED_SETTINGS,
            idbCommitted: true,
            settingsApplied: false,
            errorName: cause?.cause?.name || cause?.name || 'Error',
            errorMessage: sanitizeErrorMessage(cause),
          }, { allowCompactFallback: true });
          throw new BackupRestoreError(
            'Thử lại lưu cấu hình Web Storage thất bại. Dữ liệu IndexedDB vẫn giữ nguyên và nhật ký khôi phục được bảo toàn.',
            {
              code: 'WEB_STORAGE_RETRY_FAILED',
              phase: 'recovery',
              journalId: targetId,
              idbCommitted: true,
              settingsApplied: false,
              recoverable: true,
              cause,
              ...lockMeta,
            },
          );
        }

        writeJournal({
          ...journal,
          status: RESTORE_STAGES.SETTINGS_APPLIED,
          idbCommitted: true,
          settingsApplied: true,
        }, { allowCompactFallback: true });

        clearJournal();
        await removeSnapshotQuietly(targetId);
        await clearCommitMarkerQuietly();
        crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
          ok: true,
          recovered: 'retry-settings',
          journalId: targetId,
          atomicAcrossStorages: false,
          ...lockMeta,
        });

        return {
          ok: true,
          status: RESTORE_STAGES.COMPLETED,
          strategy: 'retry-settings',
          journalId: targetId,
          idbCommitted: true,
          settingsApplied: true,
          atomicAcrossStorages: false,
          ...lockMeta,
        };
      });
    } finally {
      endOperation(op);
    }
  }

  // Recovery path B: Full cross-storage rollback (IndexedDB + Web Storage when settings were touched).
  // Requires an active pending journal (never executes against a stale snapshot when no journal is pending).
  async function rollbackIndexedDb(journalIdArg) {
    const requestedJournalId = resolveJournalIdArg(journalIdArg);
    const op = beginOperation('recover', requestedJournalId || null);
    try {
      const journal = requireActiveRecoveryJournal(requestedJournalId);
      const targetId = journal.id;
      op.journalId = targetId;

      return await withExclusiveLock(op, targetId, async () => {
        let snapshot = null;
        try {
          snapshot = await durableSnapshotStore.get(targetId);
        } catch (cause) {
          throw new BackupRestoreError('Không thể đọc bản chụp phục hồi bền vững từ kho lưu trữ.', {
            code: 'RECOVERY_SNAPSHOT_UNAVAILABLE',
            phase: 'recovery',
            journalId: targetId,
            idbCommitted: Boolean(journal.idbCommitted),
            recoverable: false,
            cause,
            ...lockMeta,
          });
        }

        if (!snapshot || !snapshot.previousRecords) {
          throw new BackupRestoreError('Không tìm thấy bản chụp IndexedDB bền vững để hoàn tác.', {
            code: 'RECOVERY_SNAPSHOT_UNAVAILABLE',
            phase: 'recovery',
            journalId: targetId,
            idbCommitted: Boolean(journal.idbCommitted),
            recoverable: false,
            ...lockMeta,
          });
        }

        if (snapshot.journalId !== targetId) {
          throw new BackupRestoreError('Bản chụp phục hồi không khớp quyền sở hữu với nhật ký hiện tại.', {
            code: 'SNAPSHOT_OWNERSHIP_MISMATCH',
            phase: 'recovery',
            journalId: targetId,
            idbCommitted: Boolean(journal.idbCommitted),
            recoverable: false,
            ...lockMeta,
          });
        }

        const settingsWereTouched = Boolean(
          journal.settingsApplied ||
          SETTINGS_TOUCHED_STAGES.has(journal.status),
        );
        const addedKeys = snapshot.addedKeys || journal.addedKeys;

        restoreEpoch += 1;
        emitRestoreLifecycle('rollback-started', targetId);

        let idbRolledBack = Boolean(journal.idbRolledBack);
        let settingsRolledBack = Boolean(journal.settingsRolledBack);
        let commitMarkerCleared = false;

        // Step 1: Roll back IndexedDB transactionally (if not already rolled back before an interruption).
        if (!idbRolledBack) {
          writeJournal({
            ...journal,
            status: RESTORE_STAGES.RECOVERING,
            idbRolledBack: false,
            settingsRolledBack,
          }, { allowCompactFallback: true });

          assertOwnershipBeforeMutation(op, targetId);

          try {
            if (typeof repositories.rollbackRestoredRecords === 'function') {
              await repositories.rollbackRestoredRecords({
                previousRecords: snapshot.previousRecords,
                addedKeys,
                clearCommitMarker: true,
              });
              commitMarkerCleared = true;
            } else {
              if (addedKeys) {
                for (const [batchKey, repoKey] of STORE_CONFIG) {
                  const keysToRemove = addedKeys[batchKey] || [];
                  for (const key of keysToRemove) {
                    await repositories[repoKey].remove(key);
                  }
                }
              }
              await (repositories.restoreRecords ?? repositories.mergeRecords)(snapshot.previousRecords, { normalizeSession: null });
              await clearCommitMarkerQuietly();
            }
          } catch (cause) {
            writeJournal({
              ...journal,
              status: journal.status,
              errorName: cause?.name || 'Error',
              errorMessage: sanitizeErrorMessage(cause),
            }, { allowCompactFallback: true });
            throw cause;
          }

          idbRolledBack = true;
          // Persist progress before attempting Web Storage rollback so repeated interruption can resume cleanly.
          writeJournal({
            ...journal,
            status: settingsWereTouched ? RESTORE_STAGES.PARTIAL_ROLLBACK : RESTORE_STAGES.RECOVERING,
            idbCommitted: false,
            idbRolledBack: true,
            settingsRolledBack,
          }, { allowCompactFallback: true });
        }

        // Step 2: Roll back Web Storage settings if settings were touched.
        if (settingsWereTouched && !settingsRolledBack) {
          if (!snapshot.previousSettings) {
            writeJournal({
              ...journal,
              status: RESTORE_STAGES.PARTIAL_ROLLBACK,
              idbCommitted: false,
              idbRolledBack: true,
              settingsRolledBack: false,
              errorName: 'MissingSettingsSnapshot',
              errorMessage: 'Thiếu bản chụp cài đặt Web Storage trước khôi phục.',
            }, { allowCompactFallback: true });
            throw new BackupRestoreError(
              'IndexedDB đã hoàn tác nhưng thiếu bản chụp cài đặt Web Storage trước khôi phục. Nhật ký phục hồi được giữ lại.',
              {
                code: 'SETTINGS_ROLLBACK_FAILED',
                phase: 'recovery',
                journalId: targetId,
                idbCommitted: false,
                idbRolledBack: true,
                settingsRolledBack: false,
                rollbackScope: 'idb-only',
                recoverable: true,
                ...lockMeta,
              },
            );
          }

          assertOwnershipBeforeMutation(op, targetId);

          try {
            restorePreviousSettingsSnapshot(snapshot.previousSettings, storage);
          } catch (cause) {
            writeJournal({
              ...journal,
              status: RESTORE_STAGES.PARTIAL_ROLLBACK,
              idbCommitted: false,
              idbRolledBack: true,
              settingsRolledBack: false,
              errorName: cause?.name || 'Error',
              errorMessage: sanitizeErrorMessage(cause),
            }, { allowCompactFallback: true });
            throw new BackupRestoreError(
              'IndexedDB đã hoàn tác nhưng hoàn tác cài đặt Web Storage thất bại. Nhật ký và bản chụp phục hồi được giữ lại để tiếp tục xử lý.',
              {
                code: 'SETTINGS_ROLLBACK_FAILED',
                phase: 'recovery',
                journalId: targetId,
                idbCommitted: false,
                idbRolledBack: true,
                settingsRolledBack: false,
                rollbackScope: 'idb-only',
                recoverable: true,
                cause,
                ...lockMeta,
              },
            );
          }
          settingsRolledBack = true;
        }

        // Step 3: Finalize complete rollback — wipe journal, durable snapshot (containing sensitive settings), and marker.
        clearJournal();
        await removeSnapshotQuietly(targetId);
        if (!commitMarkerCleared) await clearCommitMarkerQuietly();

        restoreEpoch += 1;
        emitRestoreLifecycle('rollback-completed', targetId);

        const rollbackScope = settingsWereTouched ? 'full-cross-storage' : 'idb-only';
        crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
          ok: false,
          rolledBack: true,
          rollbackScope,
          idbRolledBack: true,
          settingsRolledBack,
          journalId: targetId,
          atomicAcrossStorages: false,
          ...lockMeta,
        });

        return {
          ok: true,
          status: RESTORE_STAGES.ROLLED_BACK,
          strategy: 'rollback-idb',
          rollbackScope,
          idbRolledBack: true,
          settingsRolledBack,
          journalId: targetId,
          idbCommitted: false,
          settingsApplied: false,
          atomicAcrossStorages: false,
          ...lockMeta,
        };
      });
    } finally {
      endOperation(op);
    }
  }

  // Protected dismiss: validates journalId ownership, rejects concurrent operations,
  // and blocks dismissing when actionable recovery (rollback or retry) is still required unless force: true.
  async function dismissPendingRecovery(journalIdArg, { force = false } = {}) {
    const requestedJournalId = resolveJournalIdArg(journalIdArg);
    const op = beginOperation('dismiss', requestedJournalId || null);
    try {
      const journal = readJournal();
      if (!journal) {
        if (requestedJournalId) {
          throw new BackupRestoreError(`Nhật ký khôi phục "${requestedJournalId}" không còn tồn tại hoặc đã được xử lý.`, {
            code: 'JOURNAL_ID_MISMATCH',
            phase: 'recovery',
            journalId: requestedJournalId,
            ...lockMeta,
          });
        }
        return {
          ok: true,
          status: 'dismissed',
          strategy: 'dismiss',
          journalId: null,
          atomicAcrossStorages: false,
          ...lockMeta,
        };
      }

      if (requestedJournalId && journal.id !== requestedJournalId) {
        throw new BackupRestoreError(`Nhật ký khôi phục "${requestedJournalId}" không khớp với phiên đang chờ ("${journal.id}").`, {
          code: 'JOURNAL_ID_MISMATCH',
          phase: 'recovery',
          journalId: requestedJournalId,
          ...lockMeta,
        });
      }

      const targetId = journal.id;
      op.journalId = targetId;

      return await withExclusiveLock(op, targetId, async () => {
        if (!force) {
          const [verification, snapshot] = await Promise.all([
            verifyIdbCommitState(journal),
            durableSnapshotStore.get(targetId).catch(() => null),
          ]);
          const snapshotValid = Boolean(snapshot && snapshot.journalId === targetId);
          const hasDurableSnapshot = snapshotValid && Boolean(snapshot.previousRecords);
          const hasSettingsEntries = (snapshotValid && Array.isArray(snapshot.settingsEntries)) || Array.isArray(journal.settingsEntries);
          const actions = computeAvailableActions({
            journal,
            commitState: verification.commitState,
            idbCommitted: verification.idbCommitted,
            hasSettingsEntries,
            hasDurableSnapshot,
          });
          if (!actions.canDismiss) {
            throw new BackupRestoreError(
              'Không thể đóng cảnh báo khi dữ liệu IndexedDB đã thay đổi hoặc chưa xác minh và vẫn còn phương án phục hồi khả dụng.',
              {
                code: 'DISMISS_NOT_ALLOWED',
                phase: 'recovery',
                journalId: targetId,
                idbCommitted: verification.idbCommitted,
                recoverable: true,
                ...lockMeta,
              },
            );
          }
        }

        clearJournal();
        await removeSnapshotQuietly(targetId);
        await clearCommitMarkerQuietly();
        crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
          ok: false,
          dismissed: true,
          journalId: targetId,
          atomicAcrossStorages: false,
          ...lockMeta,
        });

        return {
          ok: true,
          status: 'dismissed',
          strategy: 'dismiss',
          journalId: targetId,
          atomicAcrossStorages: false,
          ...lockMeta,
        };
      });
    } finally {
      endOperation(op);
    }
  }

  async function recover({ strategy = 'retry-settings', journalId, settingsEntries, force = false } = {}) {
    if (strategy === 'retry-settings') {
      return retrySettings(journalId, { settingsEntries });
    }
    if (strategy === 'rollback-idb' || strategy === 'rollback') {
      return rollbackIndexedDb(journalId);
    }
    if (strategy === 'dismiss') {
      return dismissPendingRecovery(journalId, { force });
    }
    throw new TypeError(`Unsupported recovery strategy: ${String(strategy)}`);
  }

  // Full crash-safe state machine:
  //   in-process mutex + no pending recovery + exclusive cross-tab lock
  //   -> validate -> stage -> snapshot-persisted -> journaled
  //   -> applying-idb -> idb-committed -> applying-settings -> settings-applied -> completed.
  async function restore(rawBackup) {
    const op = beginOperation('restore', null);
    const journalId = nextId('restore', now);
    op.journalId = journalId;

    try {
      return await withExclusiveLock(op, journalId, async () => {
        const existingPending = getPendingRecovery();
        if (existingPending) {
          throw new BackupRestoreError(
            'Đang tồn tại phiên khôi phục chưa hoàn tất. Hãy giải quyết phiên khôi phục đang chờ trước khi bắt đầu khôi phục mới.',
            {
              code: 'PENDING_RECOVERY_EXISTS',
              phase: 'preflight',
              journalId: existingPending.id,
              idbCommitted: Boolean(existingPending.idbCommitted),
              settingsApplied: Boolean(existingPending.settingsApplied),
              recoverable: true,
              ...lockMeta,
            },
          );
        }

        restoreEpoch += 1;
        emitRestoreLifecycle('restore-started', journalId);

        try {
        // 1. Validate
        const validated = validate(rawBackup);

        // 2. Stage (captures both previousRecords and previousSettings)
        const staged = await stage(validated);

        // 3. Persist durable rollback snapshot (sensitive settings stored ONLY here, never in journal)
        const createdAt = now();
        try {
          await durableSnapshotStore.put({
            journalId,
            previousRecords: staged.previousRecords,
            previousSettings: staged.previousSettings,
            addedKeys: staged.addedKeys,
            settingsEntries: staged.settingsEntries,
            containsSensitiveSettings: true,
            createdAt,
            stage: RESTORE_STAGES.SNAPSHOT_PERSISTED,
          });
        } catch (cause) {
          throw new BackupRestoreError(
            'Không thể lưu bản chụp phục hồi bền vững trước khi khôi phục. Chưa có dữ liệu nào bị thay đổi.',
            {
              code: 'SNAPSHOT_PERSIST_FAILED',
              phase: 'snapshot',
              journalId,
              idbCommitted: false,
              settingsApplied: false,
              recoverable: false,
              cause,
              ...lockMeta,
            },
          );
        }

        renewLock(op, journalId);

        // 4. Write durable non-sensitive journal metadata (never contains plaintext secrets)
        const baseJournal = {
          id: journalId,
          status: RESTORE_STAGES.JOURNALED,
          createdAt,
          idbCommitted: false,
          settingsApplied: false,
          idbRolledBack: false,
          settingsRolledBack: false,
          snapshotPersisted: true,
          hasSettingsEntries: staged.settingsEntries.length > 0,
          settingsEntryCount: staged.settingsEntries.length,
          containsSensitiveSettings: true,
          addedKeys: staged.addedKeys,
          atomicAcrossStorages: false,
          ...lockMeta,
        };

        try {
          writeJournal(baseJournal, { allowCompactFallback: false });
        } catch (journalError) {
          await removeSnapshotQuietly(journalId);
          throw journalError;
        }

        crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_STARTED, {
          journalId,
          atomicAcrossStorages: false,
          ...lockMeta,
        });

        // 5a. Apply IndexedDB transaction with atomic durable commit marker (with ownerId & operationId)
        writeJournal({
          ...baseJournal,
          status: RESTORE_STAGES.APPLYING_IDB,
        }, { allowCompactFallback: true });

        assertOwnershipBeforeMutation(op, journalId);

        try {
          await (repositories.restoreRecords ?? repositories.mergeRecords)(staged.records, {
            commitMarker: {
              journalId,
              ownerId: instanceOwnerId,
              operationId: op.operationId,
              committedAt: now(),
              status: 'committed',
            },
          });
        } catch (cause) {
          clearJournal();
          await removeSnapshotQuietly(journalId);
          crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
            ok: false,
            journalId,
            idbCommitted: false,
            status: RESTORE_STAGES.FAILED_IDB,
            atomicAcrossStorages: false,
            ...lockMeta,
          });
          throw new BackupRestoreError('Không thể áp dụng dữ liệu vào IndexedDB. Không có thay đổi nào được lưu.', {
            code: 'IDB_COMMIT_FAILED',
            phase: 'apply-idb',
            journalId,
            idbCommitted: false,
            settingsApplied: false,
            recoverable: false,
            cause,
            ...lockMeta,
          });
        }

        // IDB + commit marker are now atomically committed on disk.
        writeJournal({
          ...baseJournal,
          status: RESTORE_STAGES.IDB_COMMITTED,
          idbCommitted: true,
        }, { allowCompactFallback: true });

        // 5b. Apply Web Storage settings (separate storage engine; NOT atomic with IDB)
        writeJournal({
          ...baseJournal,
          status: RESTORE_STAGES.APPLYING_SETTINGS,
          idbCommitted: true,
        }, { allowCompactFallback: true });

        assertOwnershipBeforeMutation(op, journalId);

        try {
          restoreBackupSettings(staged.settingsEntries, storage);
        } catch (cause) {
          writeJournal({
            ...baseJournal,
            status: RESTORE_STAGES.FAILED_SETTINGS,
            idbCommitted: true,
            settingsApplied: false,
            errorName: cause?.cause?.name || cause?.name || 'Error',
            errorMessage: sanitizeErrorMessage(cause),
          }, { allowCompactFallback: true });
          crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
            ok: false,
            partialCommit: true,
            journalId,
            idbCommitted: true,
            settingsApplied: false,
            status: RESTORE_STAGES.FAILED_SETTINGS,
            atomicAcrossStorages: false,
            ...lockMeta,
          });
          throw new BackupRestoreError(
            'Dữ liệu IndexedDB đã được lưu, nhưng ghi cấu hình Web Storage thất bại (không atomic xuyên storage). Nhật ký và bản chụp phục hồi bền vững đã được giữ lại để thử lại Web Storage hoặc hoàn tác toàn bộ.',
            {
              code: 'WEB_STORAGE_RESTORE_FAILED',
              phase: 'apply-settings',
              journalId,
              idbCommitted: true,
              settingsApplied: false,
              recoverable: true,
              cause,
              ...lockMeta,
            },
          );
        }

        // Mark settings applied before cleanup so crash between settings apply and cleanup
        // triggers full cross-storage rollback (both IDB + Web Storage) on restart.
        writeJournal({
          ...baseJournal,
          status: RESTORE_STAGES.SETTINGS_APPLIED,
          idbCommitted: true,
          settingsApplied: true,
        }, { allowCompactFallback: true });

        // 6. Finalize — wipe journal, durable snapshot (including sensitive settings), and commit marker.
        clearJournal();
        await removeSnapshotQuietly(journalId);
        await clearCommitMarkerQuietly();
        restoreEpoch += 1;
        emitRestoreLifecycle('restore-completed', journalId);
        crossTabSync?.publish(CROSS_TAB_EVENTS.RESTORE_COMPLETED, {
          ok: true,
          journalId,
          idbCommitted: true,
          settingsApplied: true,
          atomicAcrossStorages: false,
          ...lockMeta,
        });

        return {
          ok: true,
          journalId,
          status: RESTORE_STAGES.COMPLETED,
          idbCommitted: true,
          settingsApplied: true,
          atomicAcrossStorages: false,
          ...lockMeta,
        };
        } catch (restoreFailure) {
          emitRestoreLifecycle('restore-failed', journalId);
          throw restoreFailure;
        }
      });
    } finally {
      endOperation(op);
    }
  }

  return Object.freeze({
    atomicAcrossStorages: false,
    crossTabLockMechanism,
    crossTabLockAtomic,
    isRestoreInProgress,
    assertNotRestoring,
    runOrdinaryWrite,
    getRestoreEpoch,
    subscribeRestoreLifecycle,
    validate,
    stage,
    restore,
    readJournal,
    clearJournal,
    verifyIdbCommitState,
    getPendingRecovery,
    inspectPendingRecovery,
    retrySettings,
    rollbackIndexedDb,
    dismissPendingRecovery,
    recover,
  });
}
