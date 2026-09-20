const controllers = new Set();
const listeners = new Set();
let lastFailure = null;

function emit(type, detail = {}) {
  const event = Object.freeze({ type, ...detail, snapshot: snapshot() });
  for (const listener of Array.from(listeners)) {
    try { listener(event); } catch (error) { console.error('[runtime-state] listener failed', error); }
  }
}

export function snapshot() {
  return Object.freeze({
    activeRequests: controllers.size,
    busy: controllers.size > 0,
    lastFailure,
  });
}

export function add(controller, meta = {}) {
  if (!controller || typeof controller.abort !== 'function') return controller;
  const before = controllers.size;
  controllers.add(controller);
  if (controllers.size !== before) emit('activity', { action: 'add', meta });
  return controller;
}

export function remove(controller, meta = {}) {
  const removed = controllers.delete(controller);
  if (removed) emit('activity', { action: 'remove', meta });
  return removed;
}

export function size() {
  return controllers.size;
}

export function isBusy() {
  return controllers.size > 0;
}

export function abortAll(reason = 'user-stop') {
  const active = Array.from(controllers);
  controllers.clear();
  for (const controller of active) {
    try { controller.abort(reason); } catch (_) {
      try { controller.abort(); } catch (_) {}
    }
  }
  if (active.length) emit('activity', { action: 'abort-all', reason, count: active.length });
  return active.length;
}

export function reportFailure(error, meta = {}) {
  lastFailure = Object.freeze({
    message: String(error?.message || error || 'unknown'),
    name: String(error?.name || ''),
    timestamp: Date.now(),
    meta: { ...meta },
  });
  emit('failure', { failure: lastFailure });
  return lastFailure;
}

export function clearFailure() {
  lastFailure = null;
  emit('failure-cleared');
}

export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const runtimeState = Object.freeze({
  add,
  remove,
  size,
  isBusy,
  abortAll,
  reportFailure,
  clearFailure,
  subscribe,
  snapshot,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__STS_RUNTIME_STATE__', {
    configurable: true,
    value: runtimeState,
  });
}
