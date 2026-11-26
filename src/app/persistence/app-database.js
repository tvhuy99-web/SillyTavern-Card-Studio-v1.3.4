// Browser persistence boundary. Keep the existing database identity and key paths.
export const APP_DATABASE = Object.freeze({
  name: 'SillyTavernCardStudioDB',
  version: 6,
  stores: Object.freeze({ lorebooks: 'name', characters: 'fileName', presets: 'name', chatSessions: 'sessionId', userPersonas: 'id' }),
});

export function createAppDatabase({ indexedDB = globalThis.indexedDB, name = APP_DATABASE.name } = {}) {
  let connection = null;
  function open() {
    if (connection) return connection;
    const pending = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, APP_DATABASE.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [store, keyPath] of Object.entries(APP_DATABASE.stores)) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath });
        }
        // Do not delete historical stores during an upgrade without a verified migration.
      };
      request.onerror = () => reject(new Error('Lỗi khi mở IndexedDB.', { cause: request.error }));
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

  // enqueue must be synchronous; further operations may be scheduled by IDB callbacks.
  // A successful request is not a successful transaction: resolve only on commit.
  async function transaction(stores, mode, enqueue, message = 'Không thể truy cập cơ sở dữ liệu.') {
    const db = await open();
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
        tx = db.transaction(stores, mode);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => {
          if (!failure && tx.error) failure = tx.error;
        };
        tx.onabort = () => reject(fail(failure || tx.error));
        const setResult = value => { result = value; };
        enqueue(tx, setResult, abort);
      } catch (cause) {
        if (tx) abort(cause);
        else reject(fail(cause));
      }
    });
  }
  function read(store, method, args, message) {
    return transaction([store], 'readonly', (tx, setResult, abort) => {
      const request = tx.objectStore(store)[method](...args);
      request.onsuccess = () => setResult(request.result);
      request.onerror = () => abort(request.error || new Error(message || 'Không thể đọc cơ sở dữ liệu.'));
    }, message);
  }
  return Object.freeze({ transaction, read });
}
