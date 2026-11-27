export function createSessionWriteQueue(writeOrOptions) {
  const isOptions = Boolean(writeOrOptions && typeof writeOrOptions === 'object');
  const write = isOptions ? writeOrOptions.write : writeOrOptions;
  if (typeof write !== 'function') {
    throw new TypeError('createSessionWriteQueue requires a write function');
  }

  let tail = Promise.resolve();
  let assertWriteAllowed = isOptions && typeof writeOrOptions.assertWriteAllowed === 'function'
    ? writeOrOptions.assertWriteAllowed
    : null;
  let getRestoreEpoch = isOptions && typeof writeOrOptions.getRestoreEpoch === 'function'
    ? writeOrOptions.getRestoreEpoch
    : () => 0;
  let unsubscribeLifecycle = null;
  let invalidationCounter = 0;

  function invalidatePending(_reason = 'manual') {
    invalidationCounter += 1;
    return invalidationCounter;
  }

  function bindLifecycle(subscribeRestoreLifecycle) {
    if (typeof unsubscribeLifecycle === 'function') {
      unsubscribeLifecycle();
      unsubscribeLifecycle = null;
    }
    if (typeof subscribeRestoreLifecycle === 'function') {
      unsubscribeLifecycle = subscribeRestoreLifecycle(event => {
        if (event?.type === 'restore-started' || event?.type === 'rollback-started') {
          invalidatePending(event.type);
        }
      });
    }
  }

  if (isOptions && typeof writeOrOptions.subscribeRestoreLifecycle === 'function') {
    bindLifecycle(writeOrOptions.subscribeRestoreLifecycle);
  }

  function setWriteGuard(guardConfig = null) {
    if (!guardConfig) {
      assertWriteAllowed = null;
      getRestoreEpoch = () => 0;
      bindLifecycle(null);
      return;
    }
    assertWriteAllowed = typeof guardConfig.assertWriteAllowed === 'function'
      ? guardConfig.assertWriteAllowed
      : null;
    getRestoreEpoch = typeof guardConfig.getRestoreEpoch === 'function'
      ? guardConfig.getRestoreEpoch
      : () => 0;
    bindLifecycle(guardConfig.subscribeRestoreLifecycle);
  }

  return Object.freeze({
    enqueue(record) {
      const enqueuedEpoch = getRestoreEpoch();
      const enqueuedInvalidation = invalidationCounter;
      const result = tail.then(() => {
        if (enqueuedInvalidation !== invalidationCounter || enqueuedEpoch !== getRestoreEpoch()) {
          return { status: "discarded" };
        }
        if (typeof assertWriteAllowed === 'function') {
          assertWriteAllowed('sessions.saveExisting');
        }
        return Promise.resolve(write(record)).then(() => ({ status: "committed" }));
      });
      tail = result.catch(() => {});
      return result;
    },
    invalidatePending,
    setWriteGuard,
    drain: () => tail,
  });
}

function defaultIsStaleOwnershipError(error) {
  if (!error) return false;
  if (error.code === 'STALE_SESSION_OWNERSHIP' || error.name === 'StaleSessionOwnershipError') return true;
  const text = `${error.message || ''} ${error.cause?.message || ''}`;
  return /deleted or replaced|bị xóa hoặc thay thế|stale.*ownership|session ownership/i.test(text);
}

export function createSessionSaveCoordinator({
  sessionId, getState, captureSnapshot, queue, isBusy = () => false, getRevision = () => undefined,
  initialRevision,
  isRestoreInProgress = () => false,
  getRestoreEpoch = () => 0,
  subscribeRestoreLifecycle,
  onError = error => console.error('Auto-save failed:', error),
  onOwnershipLost,
  isStaleOwnershipError = defaultIsStaleOwnershipError,
  delayMs = 500, busyDelayMs = 750,
  schedule = setTimeout, unschedule = clearTimeout,
}) {
  let timer = null;
  let dirty = false;
  const hasLockedRevision = initialRevision !== undefined;
  let revision = hasLockedRevision ? initialRevision : undefined;
  let bound = hasLockedRevision;
  let ownershipLost = false;
  let dirtyEpoch = getRestoreEpoch();
  const matches = state => Boolean(sessionId && state?.sessionId === sessionId);

  function cancelTimer() {
    if (timer !== null) unschedule(timer);
    timer = null;
  }

  const unsubscribeLifecycle = typeof subscribeRestoreLifecycle === 'function'
    ? subscribeRestoreLifecycle(event => {
      if (event?.type === 'restore-started' || event?.type === 'rollback-started') {

        cancelTimer();
        dirty = false;
        dirtyEpoch = getRestoreEpoch();
      }
    })
    : null;

  function isRevisionCurrent() {
    return revision === getRevision();
  }

  async function flush({ force = false, overrides = {} } = {}) {
    cancelTimer();
    if (ownershipLost) { dirty = false; return false; }
    if (!dirty && !force) return false;
    if (isRestoreInProgress()) {
      if (force) {
        const error = new Error('Không thể lưu phiên khi hệ thống đang khôi phục sao lưu.');
        error.code = 'RESTORE_IN_PROGRESS';
        throw error;
      }
      dirty = false;
      return false;
    }
    if (!force && dirtyEpoch !== getRestoreEpoch()) {
      dirty = false;
      return false;
    }
    const state = getState();
    if (!matches(state) || (bound && !isRevisionCurrent())) { dirty = false; return false; }
    if (!bound) {
      revision = getRevision();
      bound = true;
    }
    const record = captureSnapshot(state, overrides);
    if (!record) return false;
    if (record.sessionId !== sessionId) throw new Error('Session snapshot identity mismatch');
    const attemptedRevision = revision;
    const attemptedEpoch = getRestoreEpoch();
    dirty = false;
    try {
      const result = await queue.enqueue(record);
      return result?.status !== "discarded" && result?.status !== "blocked";
    } catch (error) {
      if (isStaleOwnershipError(error)) {
        ownershipLost = true;
        dirty = false;
        cancelTimer();
        if (typeof onOwnershipLost === 'function') {
          try { onOwnershipLost(error); } catch {}
        }
        throw error;
      }

      if (
        !isRestoreInProgress() &&
        attemptedEpoch === getRestoreEpoch() &&
        matches(getState()) &&
        revision === attemptedRevision &&
        attemptedRevision === getRevision()
      ) {
        dirty = true;
        dirtyEpoch = attemptedEpoch;
      }
      throw error;
    }
  }

  function tick() {
    timer = null;
    if (ownershipLost || !dirty || !bound) { dirty = false; return; }
    if (dirtyEpoch !== getRestoreEpoch() || isRestoreInProgress()) {
      dirty = false;
      return;
    }
    const state = getState();
    if (!matches(state) || !isRevisionCurrent()) { dirty = false; return; }
    if (isBusy(state)) { timer = schedule(tick, busyDelayMs); return; }
    const attemptedRevision = revision;
    void flush().catch(error => {
      if (matches(getState()) && revision === attemptedRevision && attemptedRevision === getRevision()) onError(error);
    });
  }

  function markDirty() {
    if (ownershipLost || isRestoreInProgress()) return false;
    if (!matches(getState())) return false;
    if (hasLockedRevision && !isRevisionCurrent()) { dirty = false; return false; }
    if (!hasLockedRevision) {
      revision = getRevision();
      bound = true;
    }
    dirty = true;
    dirtyEpoch = getRestoreEpoch();
    cancelTimer();
    timer = schedule(tick, delayMs);
    return true;
  }

  function dispose() {
    cancelTimer();
    dirty = false;
    if (typeof unsubscribeLifecycle === 'function') {
      unsubscribeLifecycle();
    }
  }

  return Object.freeze({ markDirty, cancelTimer, flush, dispose });
}
