import { decodeBase64ToBuffer, prepareBackupSettings, restoreBackupSettings } from '../../../recovered/app/persistence/backup-codec.js';
import { CROSS_TAB_EVENTS } from './cross-tab-sync.js';
import {
  RESTORE_JOURNAL_KEY,
  RESTORE_LOCK_KEY,
  RECOVERY_DATABASE,
  RESTORE_STAGES,
  PRE_IDB_STAGES,
  STORE_CONFIG,
  DEFAULT_LOCK_TTL_MS,
  BackupRestoreError,
  nextId,
  sanitizeErrorMessage,
} from './backup/backup-constants.js';
import { createDurableRecoveryStore } from './backup/recovery-snapshot-store.js';
import { validateBackupEnvelope } from './backup/backup-validator.js';
import { computeAddedKeys, capturePreviousSettingsSnapshot, restorePreviousSettingsSnapshot } from './backup/settings-snapshot.js';
import { isUnresolvedJournal, computeAvailableActions, createRecoveryJournalManager } from './backup/recovery-journal.js';
import { createRestoreLockManager } from './backup/restore-lock.js';
import { createRestoreWriteGuard } from './backup/restore-write-guard.js';
import { createRollbackService } from './backup/rollback-service.js';

export { RESTORE_JOURNAL_KEY, RESTORE_LOCK_KEY, RECOVERY_DATABASE, RESTORE_STAGES, BackupRestoreError, createDurableRecoveryStore };

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

  const {
    readJournal,
    writeJournal,
    clearJournal,
    sanitizeJournalForInspection,
    getPendingRecovery,
    requireActiveRecoveryJournal,
  } = createRecoveryJournalManager({ journalStorage, journalKey, lockMeta, crossTabLockMechanism, crossTabLockAtomic, now, sanitizeErrorMessage });

  const {
    readLock,
    acquireAdvisoryLock,
    renewLock,
    releaseAdvisoryLock,
    withExclusiveLock,
    assertOwnershipBeforeMutation,
  } = createRestoreLockManager({
    journalStorage, lockKey, lockTtlMs, instanceOwnerId, hasWebLocks, webLocks, crossTabLockMechanism, crossTabLockAtomic, lockMeta, now, readJournal, drainOrdinaryWrites: () => drainOrdinaryWrites(), getActiveOperation: () => getActiveOperation(),
  });

  const {
    runOrdinaryWrite,
    drainOrdinaryWrites,
    getRestoreEpoch,
    getActiveOperation,
    incrementRestoreEpoch,
    subscribeRestoreLifecycle,
    emitRestoreLifecycle,
    beginOperation,
    endOperation,
    isRestoreInProgress,
    assertNotRestoring,
  } = createRestoreWriteGuard({
    hasWebLocks, webLocks, lockKey, lockMeta, now, readLock, readJournal, isUnresolvedJournal, getPendingRecovery,
  });

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

  const {
    retrySettings,
    rollbackIndexedDb,
    dismissPendingRecovery,
    recover,
  } = createRollbackService({
    repositories, storage, crossTabSync, durableSnapshotStore, lockMeta, now,
    beginOperation, endOperation, withExclusiveLock, renewLock, assertOwnershipBeforeMutation,
    requireActiveRecoveryJournal, readJournal, writeJournal, clearJournal, isUnresolvedJournal, instanceOwnerId, removeSnapshotQuietly,
    clearCommitMarkerQuietly, verifyIdbCommitState, emitRestoreLifecycle, incrementRestoreEpoch, drainOrdinaryWrites,
  });

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

        incrementRestoreEpoch();
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
        incrementRestoreEpoch();
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
