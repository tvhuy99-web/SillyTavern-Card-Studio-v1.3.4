import { validateRecordBatches } from '../backup-codec.js';

// Transaction bodies remain intact; the facade supplies the shared write boundary and record identity.
export function assembleRestoreOperations({ database, definitions, normalizePreset, normalizePresetList, normalizeSession, withGeneration, isInternalMarker, applySessionNormalizer, bindRequestError, RESTORE_COMMIT_MARKER_ID, SESSION_GENERATION, SESSION_EDITOR }) {
  // Read all five stores from the same database snapshot. Web Storage is a
  // separate persistence system and is deliberately not part of this transaction.
  function exportRecords() {
    const message = 'Không thể đọc bản sao lưu từ cơ sở dữ liệu.';
    const stores = Object.values(definitions).map(([store]) => store);
    return database.transaction(stores, 'readonly', (tx, setResult, abort) => {
      const result = {};
      for (const [kind, [store]] of Object.entries(definitions)) {
        const request = bindRequestError(tx.objectStore(store).getAll(), abort, message);
        request.onsuccess = () => {
          try {
            const rows = store === 'userPersonas'
              ? request.result.filter(record => !isInternalMarker(record))
              : request.result;
            result[kind === 'sessions' ? 'chatSessions' : kind] = kind === 'presets'
              ? normalizePresetList(rows)
              : kind === 'sessions'
                ? rows.map(({ [SESSION_GENERATION]: _generation, [SESSION_EDITOR]: _editor, ...record }) => record)
                : rows;
          } catch (error) { abort(error); }
        };
      }
      setResult(result);
    }, message);
  }

  // Read the durable restore commit marker written atomically during mergeRecords.
  async function readRestoreCommitMarker() {
    const marker = await database.read(
      'userPersonas',
      'get',
      [RESTORE_COMMIT_MARKER_ID],
      'Không thể đọc dấu xác nhận commit khôi phục từ cơ sở dữ liệu.',
    );
    return isInternalMarker(marker) ? marker : null;
  }

  function clearRestoreCommitMarker() {
    const message = 'Không thể xóa dấu xác nhận commit khôi phục khỏi cơ sở dữ liệu.';
    return database.transaction(['userPersonas'], 'readwrite', (tx, _setResult, abort) => {
      bindRequestError(tx.objectStore('userPersonas').delete(RESTORE_COMMIT_MARKER_ID), abort, message);
    }, message);
  }

  // Merge exactly as the previous restore path did, but commit the five stores together.
  // When options.commitMarker is provided, write the durable commit marker in the EXACT
  // same IndexedDB transaction so crash recovery can verify IDB commit state deterministically.
  async function mergeRecords({ characters = [], presets = [], lorebooks = [], personas = [], chatSessions = [] }, options = {}) {
    validateRecordBatches({ characters, presets, lorebooks, personas, chatSessions });
    const sessionNormalizer = Object.prototype.hasOwnProperty.call(options, 'normalizeSession')
      ? options.normalizeSession
      : normalizeSession;
    const normalizedSessions = chatSessions.map(record => withGeneration(applySessionNormalizer(record, sessionNormalizer)));
    const safePersonas = personas.filter(record => !isInternalMarker(record));
    const batches = { characters, presets: presets.map(normalizePreset), lorebooks, userPersonas: safePersonas, chatSessions: normalizedSessions };
    const commitMarker = options?.commitMarker && typeof options.commitMarker.journalId === 'string'
      ? {
        id: RESTORE_COMMIT_MARKER_ID,
        __stsInternalMarker: true,
        journalId: options.commitMarker.journalId,
        ownerId: options.commitMarker.ownerId || null,
        operationId: options.commitMarker.operationId || null,
        committedAt: options.commitMarker.committedAt ?? Date.now(),
        status: options.commitMarker.status || 'committed',
      }
      : null;
    const message = 'Không thể nhập dữ liệu. Thay đổi cơ sở dữ liệu đã được hủy.';
    return database.transaction(Object.keys(batches), 'readwrite', (tx, _setResult, abort) => {
      for (const [store, records] of Object.entries(batches)) {
        const target = tx.objectStore(store);
        for (const record of records) {
          bindRequestError(target.put(record), abort, message);
        }
      }
      if (commitMarker) {
        bindRequestError(tx.objectStore('userPersonas').put(commitMarker), abort, message);
      }
    }, message);
  }

  // Single-transaction rollback across all 5 stores: deletes newly added keys,
  // restores previousRecords, and clears the restore commit marker atomically.
  async function rollbackRestoredRecords({ previousRecords, addedKeys = {}, clearCommitMarker = true }) {
    const {
      characters = [],
      presets = [],
      lorebooks = [],
      personas = [],
      chatSessions = [],
    } = previousRecords || {};
    validateRecordBatches({ characters, presets, lorebooks, personas, chatSessions });
    const storeMap = [
      ['characters', 'characters', characters],
      ['presets', 'presets', presets.map(normalizePreset)],
      ['lorebooks', 'lorebooks', lorebooks],
      ['personas', 'userPersonas', personas.filter(record => !isInternalMarker(record))],
      ['chatSessions', 'chatSessions', chatSessions.map(withGeneration)],
    ];
    const storeNames = storeMap.map(([, storeName]) => storeName);
    const message = 'Không thể hoàn tác dữ liệu IndexedDB. Thay đổi hoàn tác đã được hủy.';
    return database.transaction(storeNames, 'readwrite', (tx, _setResult, abort) => {
      for (const [batchKey, storeName] of storeMap) {
        const target = tx.objectStore(storeName);
        const keysToDelete = Array.isArray(addedKeys?.[batchKey]) ? addedKeys[batchKey] : [];
        for (const key of keysToDelete) {
          if (typeof key === 'string' && key !== RESTORE_COMMIT_MARKER_ID) {
            bindRequestError(target.delete(key), abort, message);
          }
        }
      }
      for (const [, storeName, records] of storeMap) {
        const target = tx.objectStore(storeName);
        for (const record of records) {
          bindRequestError(target.put(record), abort, message);
        }
      }
      if (clearCommitMarker) {
        bindRequestError(tx.objectStore('userPersonas').delete(RESTORE_COMMIT_MARKER_ID), abort, message);
      }
    }, message);
  }

  return { exportRecords, readRestoreCommitMarker, clearRestoreCommitMarker, mergeRecords, rollbackRestoredRecords };
}
