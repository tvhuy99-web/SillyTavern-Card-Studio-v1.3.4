import { decodeBase64ToBuffer, encodeBufferToBase64, isPlainObject } from '../backup-codec.js';
import { RECOVERY_DATABASE, BackupRestoreError } from './backup-constants.js';

async function serializeRecordsForStorage(records) {
  if (!records || typeof records !== 'object') return records;
  const serializedCharacters = [];
  for (const character of records.characters || []) {
    if (character?.avatar?.buffer) {
      serializedCharacters.push({
        ...character,
        avatar: {
          ...character.avatar,
          buffer: {
            __stsBinaryBase64: true,
            data: await encodeBufferToBase64(character.avatar.buffer),
          },
        },
      });
    } else {
      serializedCharacters.push(character);
    }
  }
  return {
    ...records,
    characters: serializedCharacters,
  };
}

async function deserializeRecordsFromStorage(records) {
  if (!records || typeof records !== 'object') return records;
  const deserializedCharacters = [];
  for (const character of records.characters || []) {
    if (character?.avatar?.buffer?.__stsBinaryBase64) {
      deserializedCharacters.push({
        ...character,
        avatar: {
          ...character.avatar,
          buffer: await decodeBase64ToBuffer(character.avatar.buffer.data, character.avatar.type || 'image/png'),
        },
      });
    } else {
      deserializedCharacters.push(character);
    }
  }
  return {
    ...records,
    characters: deserializedCharacters,
  };
}

// Durable snapshot store backed by a dedicated IndexedDB database (SillyTavernCardStudioRecoveryDB v1,
// objectStore "restoreSnapshots", keyPath "journalId") with structured Web Storage fallback when
// IndexedDB is unavailable (e.g., Node test environments without global indexedDB).
export function createDurableRecoveryStore({
  indexedDB = typeof globalThis.indexedDB !== 'undefined' ? globalThis.indexedDB : null,
  storage = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null,
  dbName = RECOVERY_DATABASE.name,
  dbVersion = RECOVERY_DATABASE.version,
  storeName = RECOVERY_DATABASE.store,
  keyPath = RECOVERY_DATABASE.keyPath,
  storagePrefix = 'stcs:backup-restore:snapshot:',
} = {}) {
  if (indexedDB && typeof indexedDB.open === 'function') {
    let connection = null;

    function openDb() {
      if (connection) return connection;
      const pending = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath });
          }
        };
        request.onerror = () => reject(new Error('Không thể mở kho snapshot phục hồi IndexedDB.', { cause: request.error }));
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

    async function runTx(mode, enqueue, message) {
      const db = await openDb();
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
          tx = db.transaction([storeName], mode);
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => { if (!failure && tx.error) failure = tx.error; };
          tx.onabort = () => reject(fail(failure || tx.error));
          enqueue(tx.objectStore(storeName), value => { result = value; }, abort);
        } catch (cause) {
          if (tx) abort(cause);
          else reject(fail(cause));
        }
      });
    }

    return Object.freeze({
      kind: 'indexeddb',
      async put(snapshot) {
        if (!snapshot || typeof snapshot.journalId !== 'string' || !snapshot.journalId.trim()) {
          throw new TypeError('Recovery snapshot requires a valid journalId');
        }
        await runTx('readwrite', (store, _setResult, abort) => {
          const request = store.put(snapshot);
          request.onerror = () => abort(request.error || new Error('Snapshot put failed'));
        }, 'Không thể lưu bản chụp phục hồi vào IndexedDB.');
        return true;
      },
      async get(journalId) {
        if (!journalId) return null;
        const record = await runTx('readonly', (store, setResult, abort) => {
          const request = store.get(journalId);
          request.onsuccess = () => setResult(request.result ?? null);
          request.onerror = () => abort(request.error || new Error('Snapshot get failed'));
        }, 'Không thể đọc bản chụp phục hồi từ IndexedDB.');
        return record ?? null;
      },
      async remove(journalId) {
        if (!journalId) return false;
        await runTx('readwrite', (store, _setResult, abort) => {
          const request = store.delete(journalId);
          request.onerror = () => abort(request.error || new Error('Snapshot delete failed'));
        }, 'Không thể xóa bản chụp phục hồi khỏi IndexedDB.');
        return true;
      },
    });
  }

  return Object.freeze({
    kind: 'storage-fallback',
    async put(snapshot) {
      if (!snapshot || typeof snapshot.journalId !== 'string' || !snapshot.journalId.trim()) {
        throw new TypeError('Recovery snapshot requires a valid journalId');
      }
      if (!storage || typeof storage.setItem !== 'function') {
        throw new Error('Recovery snapshot storage is unavailable.');
      }
      const serialized = {
        ...snapshot,
        previousRecords: await serializeRecordsForStorage(snapshot.previousRecords),
      };
      storage.setItem(`${storagePrefix}${snapshot.journalId}`, JSON.stringify(serialized));
      return true;
    },
    async get(journalId) {
      if (!journalId || !storage || typeof storage.getItem !== 'function') return null;
      const raw = storage.getItem(`${storagePrefix}${journalId}`);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!isPlainObject(parsed)) return null;
        return {
          ...parsed,
          previousRecords: await deserializeRecordsFromStorage(parsed.previousRecords),
        };
      } catch {
        return null;
      }
    },
    async remove(journalId) {
      if (!journalId || !storage || typeof storage.removeItem !== 'function') return false;
      try {
        storage.removeItem(`${storagePrefix}${journalId}`);
        return true;
      } catch {
        return false;
      }
    },
  });
}

