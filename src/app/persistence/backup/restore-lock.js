import { isPlainObject } from '../backup-codec.js';
import { BackupRestoreError } from './backup-constants.js';

export function createRestoreLockManager({
  journalStorage,
  lockKey,
  lockTtlMs,
  instanceOwnerId,
  hasWebLocks,
  webLocks,
  crossTabLockMechanism,
  crossTabLockAtomic,
  lockMeta,
  now,
  readJournal,
  drainOrdinaryWrites,
  getActiveOperation,
}) {
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
    const activeOperation = getActiveOperation();
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


  return { readLock, acquireAdvisoryLock, renewLock, releaseAdvisoryLock, withExclusiveLock, assertOwnershipBeforeMutation };
}
