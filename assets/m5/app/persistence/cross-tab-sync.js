export const CROSS_TAB_EVENTS = Object.freeze({
  SESSION_CLAIMED: 'session-claimed',
  SESSION_DELETED: 'session-deleted',
  CATALOG_MUTATED: 'catalog-mutated',
  SETTINGS_UPDATED: 'settings-updated',
  RESTORE_STARTED: 'restore-started',
  RESTORE_COMPLETED: 'restore-completed',
});

export const CROSS_TAB_EVENT_TYPES = Object.freeze(Object.values(CROSS_TAB_EVENTS));
const VALID_EVENT_SET = new Set(CROSS_TAB_EVENT_TYPES);

const DEFAULT_CHANNEL_NAME = 'stcs:cross-tab-sync:v1';
const DEFAULT_STORAGE_KEY = 'stcs:cross-tab-sync:event';

let idSequence = 0;

function generateId(prefix = 'tab') {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(8));
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${hex}`;
  }
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCrossTabSync({
  channelName = DEFAULT_CHANNEL_NAME,
  storageKey = DEFAULT_STORAGE_KEY,
  tabId = generateId('tab'),
  BroadcastChannelCtor = globalThis.BroadcastChannel,
  targetWindow = typeof globalThis.window !== 'undefined' ? globalThis.window : undefined,
  storage = targetWindow?.localStorage ?? globalThis.localStorage,
  now = () => Date.now(),
  onError = () => {},
} = {}) {
  const listenersByType = new Map();
  const wildcardListeners = new Set();
  let closed = false;
  let channel = null;
  let transport = 'noop';

  function dispatch(message) {
    if (closed || !message || typeof message !== 'object') return;
    const { type, senderId } = message;
    if (senderId === tabId) return;
    if (!VALID_EVENT_SET.has(type)) return;

    const event = Object.freeze({
      id: message.id,
      type,
      payload: message.payload ?? {},
      senderId,
      timestamp: message.timestamp,
    });

    const typed = listenersByType.get(type);
    if (typed) {
      for (const listener of [...typed]) {
        try {
          listener(event);
        } catch (error) {
          onError(error, event);
        }
      }
    }
    for (const listener of [...wildcardListeners]) {
      try {
        listener(event);
      } catch (error) {
        onError(error, event);
      }
    }
  }

  function handleChannelMessage(event) {
    dispatch(event?.data);
  }

  function handleStorageEvent(event) {
    if (closed || !event || event.key !== storageKey || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      dispatch(parsed);
    } catch {

    }
  }

  if (typeof BroadcastChannelCtor === 'function') {
    try {
      channel = new BroadcastChannelCtor(channelName);
      if (typeof channel.unref === "function") channel.unref();
      if (typeof channel.addEventListener === 'function') {
        channel.addEventListener('message', handleChannelMessage);
      } else {
        channel.onmessage = handleChannelMessage;
      }
      transport = 'broadcast-channel';
    } catch {
      channel = null;
    }
  }

  if (!channel && targetWindow && typeof targetWindow.addEventListener === 'function' && storage && typeof storage.setItem === 'function') {
    targetWindow.addEventListener('storage', handleStorageEvent);
    transport = 'storage';
  }

  function publish(type, payload = {}) {
    if (!VALID_EVENT_SET.has(type)) {
      throw new TypeError(`Unsupported cross-tab event type: ${String(type)}`);
    }
    if (closed) return false;

    const message = {
      id: generateId('evt'),
      type,
      payload,
      senderId: tabId,
      timestamp: now(),
    };

    if (transport === 'broadcast-channel' && channel) {
      channel.postMessage(message);
      return true;
    }

    if (transport === 'storage' && storage) {
      try {
        storage.setItem(storageKey, JSON.stringify(message));
        try {
          storage.removeItem(storageKey);
        } catch {

        }
        return true;
      } catch (error) {
        onError(error, message);
        return false;
      }
    }

    return false;
  }

  function subscribe(typeOrListener, maybeListener) {
    if (closed) return () => {};
    if (typeof typeOrListener === 'function') {
      wildcardListeners.add(typeOrListener);
      return () => { wildcardListeners.delete(typeOrListener); };
    }
    const type = typeOrListener;
    const listener = maybeListener;
    if (typeof listener !== 'function') {
      throw new TypeError('Cross-tab subscriber must be a function');
    }
    if (type === '*') {
      wildcardListeners.add(listener);
      return () => { wildcardListeners.delete(listener); };
    }
    if (!VALID_EVENT_SET.has(type)) {
      throw new TypeError(`Unsupported cross-tab event type: ${String(type)}`);
    }
    let set = listenersByType.get(type);
    if (!set) {
      set = new Set();
      listenersByType.set(type, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) listenersByType.delete(type);
    };
  }

  function close() {
    if (closed) return;
    closed = true;
    if (channel) {
      try {
        if (typeof channel.removeEventListener === 'function') {
          channel.removeEventListener('message', handleChannelMessage);
        } else {
          channel.onmessage = null;
        }
        if (typeof channel.close === 'function') channel.close();
      } catch {

      }
      channel = null;
    }
    if (transport === 'storage' && targetWindow && typeof targetWindow.removeEventListener === 'function') {
      try {
        targetWindow.removeEventListener('storage', handleStorageEvent);
      } catch {

      }
    }
    listenersByType.clear();
    wildcardListeners.clear();
  }

  return Object.freeze({
    tabId,
    transport,
    publish,
    subscribe,
    isClosed: () => closed,
    close,
  });
}
