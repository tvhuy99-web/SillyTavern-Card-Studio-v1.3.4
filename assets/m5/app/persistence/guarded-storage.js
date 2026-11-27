export function createGuardedStorage(getStorage, assertWriteAllowed) {
  return Object.freeze({
    getItem: key => getStorage().getItem(key),
    key: index => getStorage().key(index),
    get length() { return getStorage().length; },
    setItem(key, value) {
      assertWriteAllowed(`storage.set:${key}`);
      getStorage().setItem(key, value);
    },
    removeItem(key) {
      assertWriteAllowed(`storage.remove:${key}`);
      getStorage().removeItem(key);
    },
  });
}
