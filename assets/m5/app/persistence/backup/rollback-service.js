import { restoreBackupSettings } from '../../../../recovered/app/persistence/backup-codec.js';
import { CROSS_TAB_EVENTS } from '../cross-tab-sync.js';
import {
  RESTORE_STAGES,
  SETTINGS_TOUCHED_STAGES,
  STORE_CONFIG,
  BackupRestoreError,
  resolveJournalIdArg,
  sanitizeErrorMessage,
} from './backup-constants.js';
import { restorePreviousSettingsSnapshot } from './settings-snapshot.js';
import { computeAvailableActions } from './recovery-journal.js';

export function createRollbackService({
  repositories,
  storage,
  crossTabSync,
  durableSnapshotStore,
  lockMeta,
  now,
  beginOperation,
  endOperation,
  withExclusiveLock,
  renewLock,
  assertOwnershipBeforeMutation,
  requireActiveRecoveryJournal,
  readJournal,
  writeJournal,
  isUnresolvedJournal,
  instanceOwnerId,
  clearJournal,
  removeSnapshotQuietly,
  clearCommitMarkerQuietly,
  verifyIdbCommitState,
  emitRestoreLifecycle,
  incrementRestoreEpoch,
  drainOrdinaryWrites,
}) {
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

        incrementRestoreEpoch();
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

        incrementRestoreEpoch();
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

  return { retrySettings, rollbackIndexedDb, dismissPendingRecovery, recover };
}
