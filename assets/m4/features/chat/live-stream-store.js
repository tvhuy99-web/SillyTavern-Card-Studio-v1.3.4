const EMPTY_SNAPSHOT = Object.freeze({ content: '', reasoning: undefined, version: 0 });
const snapshots = new Map();
const pendingSnapshots = new Map();
const listeners = new Map();
const pendingKeys = new Set();
let flushTimer = null;

function streamKey(messageId, slot = 'main') {
  return String(messageId) + '::' + String(slot || 'main');
}

function notifyKey(key) {
  const set = listeners.get(key);
  if (!set?.size) return;
  for (const listener of Array.from(set)) {
    try { listener(); } catch (error) { console.error('[LiveStream] listener failed:', error); }
  }
}

function flushPending() {
  flushTimer = null;
  const keys = Array.from(pendingKeys);
  pendingKeys.clear();
  for (const key of keys) {
    const pending = pendingSnapshots.get(key);
    if (pending) {
      snapshots.set(key, Object.freeze({
        content: pending.content,
        reasoning: pending.reasoning,
        version: pending.version,
      }));
      pendingSnapshots.delete(key);
    }
    notifyKey(key);
  }
}

function scheduleNotify(key) {
  pendingKeys.add(key);
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flushPending, 100);
}

export const liveStreamStore = Object.freeze({
  publish(messageId, slot, content, reasoning) {
    const key = streamKey(messageId, slot);
    let pending = pendingSnapshots.get(key);
    if (!pending) {
      const previous = snapshots.get(key) || EMPTY_SNAPSHOT;
      pending = {
        content: previous.content,
        reasoning: previous.reasoning,
        version: previous.version,
      };
      pendingSnapshots.set(key, pending);
    }
    pending.content = String(content ?? '');
    pending.reasoning = reasoning || undefined;
    pending.version += 1;
    scheduleNotify(key);
  },

  getSnapshot(messageId, slot = 'main') {
    const key = streamKey(messageId, slot);
    return pendingSnapshots.get(key) || snapshots.get(key) || EMPTY_SNAPSHOT;
  },

  subscribe(messageId, slot = 'main', listener) {
    const key = streamKey(messageId, slot);
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (!set.size) listeners.delete(key);
    };
  },

  clear(messageId, slot = 'main') {
    const key = streamKey(messageId, slot);
    snapshots.delete(key);
    pendingSnapshots.delete(key);
    pendingKeys.delete(key);
    notifyKey(key);
  },

  clearMessage(messageId) {
    const prefix = String(messageId) + '::';
    const keys = new Set([
      ...snapshots.keys(),
      ...pendingSnapshots.keys(),
    ]);
    for (const key of keys) {
      if (!key.startsWith(prefix)) continue;
      snapshots.delete(key);
      pendingSnapshots.delete(key);
      pendingKeys.delete(key);
      notifyKey(key);
    }
  },
});
