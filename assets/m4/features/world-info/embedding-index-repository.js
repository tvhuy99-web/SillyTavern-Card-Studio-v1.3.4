// Persistence contract for vector indexes. Preserve the existing database and record schema.
export const EMBEDDING_DATABASE = Object.freeze({ name: 'LorebookEmbeddingsDB', version: 2, store: 'embeddings' });

export function createEmbeddingIndexRepository({ indexedDB = globalThis.indexedDB } = {}) {
  const { name, version, store } = EMBEDDING_DATABASE;
  function open() {
    return new Promise((resolve, reject) => {
      if (!indexedDB) throw new Error('Trình duyệt không hỗ trợ IndexedDB.');
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error || new Error('Failed to open embedding database'));
      request.onupgradeneeded = event => {
        const db = request.result;
        // Retain the established v1 -> v2 index rebuild policy. These are derived vectors.
        if (event.oldVersion < 2 && db.objectStoreNames.contains(store)) db.deleteObjectStore(store);
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath: 'id' });
          objectStore.createIndex('characterId', 'characterId', { unique: false });
          objectStore.createIndex('uid', 'uid', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  async function transaction(mode, enqueue) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        let tx;
        let result;
        let failure;
        try {
          tx = db.transaction([store], mode);
          tx.oncomplete = () => resolve(result);
          tx.onabort = () => reject(failure || tx.error || new Error('Embedding transaction aborted'));
          enqueue(tx.objectStore(store), value => { result = value; });
        } catch (error) {
          failure = error;
          if (tx) {
            try { tx.abort(); } catch { reject(error); }
          } else reject(error);
        }
      });
    } finally { db.close(); }
  }
  function listByCharacter(characterId) {
    return transaction('readonly', (objectStore, setResult) => {
      const request = objectStore.index('characterId').getAll(characterId);
      request.onsuccess = () => setResult(request.result || []);
    });
  }
  async function replace(oldRecords, newRecords) {
    if (!oldRecords.length && !newRecords.length) return;
    await transaction('readwrite', objectStore => {
      const nextIds = new Set(newRecords.map(record => record.id));
      for (const record of oldRecords) if (!nextIds.has(record.id)) objectStore.delete(record.id);
      for (const record of newRecords) objectStore.put(record);
    });
  }
  return Object.freeze({ listByCharacter, replace });
}
