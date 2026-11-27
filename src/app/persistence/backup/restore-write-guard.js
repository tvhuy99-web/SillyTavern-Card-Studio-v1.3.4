import { BackupRestoreError, nextId } from './backup-constants.js';

export function createRestoreWriteGuard({
  hasWebLocks,
  webLocks,
  lockKey,
  lockMeta,
  now,
  readLock,
  readJournal,
  isUnresolvedJournal,
  getPendingRecovery,
}) {

  let activeOperation = null;
  const activeWrites = new Set();
  function runOrdinaryWrite(operation, work) {
    assertNotRestoring(operation);
    const execute = () => {
      assertNotRestoring(operation);
      return work();
    };

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

  function getActiveOperation() { return activeOperation; }
  function incrementRestoreEpoch() { restoreEpoch += 1; return restoreEpoch; }
  return {
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
  };
}
