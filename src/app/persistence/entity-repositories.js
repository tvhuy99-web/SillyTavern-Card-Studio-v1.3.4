import { createAppDatabase } from './app-database.js';
import { validateRecordBatches } from './backup-codec.js';
import { normalizeLoadedSession, sessionStateContract } from './session-state.js';

export const RESTORE_COMMIT_MARKER_ID = '__sts_restore_commit_marker__';

// Domain-specific persistence operations; no React, DOM or application store dependency.
export async function prepareCharacterRecord(character) {
  const record = { card: character.card, fileName: character.fileName };
  if (character.avatarFile) {
    record.avatar = { buffer: await character.avatarFile.arrayBuffer(), name: character.avatarFile.name, type: character.avatarFile.type };
  }
  return record;
}

const SESSION_GENERATION = '__stsRecordGeneration';
const SESSION_EDITOR = '__stsRecordEditor';
let fallbackCounter = 0;

function isInternalMarker(record) {
  return Boolean(record && (record.id === RESTORE_COMMIT_MARKER_ID || record.__stsInternalMarker === true));
}

function getRandomBytes(length) {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    return cryptoObj.getRandomValues(new Uint8Array(length));
  }
  // Safe fallback for environments without global Web Crypto (e.g., bare Node 18).
  const bytes = new Uint8Array(length);
  const seed = Date.now() ^ (++fallbackCounter * 0x9e3779b1);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = ((Math.floor(Math.random() * 256) ^ ((seed >>> ((index % 4) * 8)) & 0xff)) & 0xff);
  }
  return bytes;
}

const newGeneration = () => Array.from(getRandomBytes(16), byte => byte.toString(16).padStart(2, '0')).join('');
const withGeneration = record => { const { [SESSION_EDITOR]: _editor, ...data } = record; return { ...data, [SESSION_GENERATION]: newGeneration() }; };

function bindRequestError(request, abort, fallbackMessage) {
  if (request && typeof request === 'object') {
    request.onerror = () => abort(request.error || new Error(fallbackMessage));
  }
  return request;
}

function applySessionNormalizer(record, normalizer) {
  if (typeof normalizer !== 'function') return record;
  const normalized = normalizer(record);
  if (normalized && typeof normalized === 'object' && 'record' in normalized && normalized.record && typeof normalized.record === 'object') {
    return normalized.record;
  }
  return normalized ?? record;
}

export function createEntityRepositories({
  database = createAppDatabase(),
  normalizePreset,
  normalizePresetList,
  normalizeSession = normalizeLoadedSession,
  writeGuard = null,
}) {
  let runWrite = (_operation, work) => work();
  function setWriteCoordinator(coordinator) {
    if (typeof coordinator !== 'function') throw new TypeError('Write coordinator must be a function');
    runWrite = coordinator;
  }
  function ordinaryTransaction(operation, stores, enqueue, message) {
    assertWriteAllowed(operation);
    return runWrite(operation, () => database.transaction(stores, 'readwrite', enqueue, message));
  }
  let activeWriteGuard = typeof writeGuard === 'function' ? writeGuard : null;
  function setWriteGuard(fn) {
    if (fn !== null && fn !== undefined && typeof fn !== 'function') {
      throw new TypeError('Entity repository writeGuard must be a function or null');
    }
    activeWriteGuard = fn || null;
  }
  function assertWriteAllowed(operationName) {
    if (typeof activeWriteGuard === 'function') {
      activeWriteGuard(operationName);
    }
  }
  if (typeof normalizePreset !== 'function' || typeof normalizePresetList !== 'function') throw new TypeError('Preset normalizers are required');
  // One editor per repository instance; another tab atomically claims a new generation.
  const editor = newGeneration();
  const definitions = {
    sessions: ['chatSessions', 'sessionId', 'phiên trò chuyện'],
    lorebooks: ['lorebooks', 'name', 'Sổ tay Thế giới'],
    characters: ['characters', 'fileName', 'nhân vật'],
    presets: ['presets', 'name', 'preset'],
    personas: ['userPersonas', 'id', 'hồ sơ'],
  };
  function repository(kind, [store, key, label], isPreset) {
    const isPersonas = store === 'userPersonas';
    return Object.freeze({
      async list() {
        const records = await database.read(store, 'getAll', [], `Không thể lấy ${label} từ cơ sở dữ liệu.`);
        const visible = isPersonas ? records.filter(record => !isInternalMarker(record)) : records;
        return isPreset ? normalizePresetList(visible) : visible;
      },
      async get(id) {
        if (isPersonas && id === RESTORE_COMMIT_MARKER_ID) return undefined;
        const record = await database.read(store, 'get', [id], `Không thể lấy ${label} từ cơ sở dữ liệu.`);
        if (isPersonas && isInternalMarker(record)) return undefined;
        return isPreset && record !== undefined ? normalizePreset(record) : record;
      },
      async put(record) {
        const value = isPreset ? normalizePreset(record) : store === 'chatSessions' ? withGeneration(record) : record;
        const message = `Không thể lưu ${label} "${value?.[key]}".`;
        return ordinaryTransaction(`${kind}.put`, [store], (tx, _setResult, abort) => {
          bindRequestError(tx.objectStore(store).put(value), abort, message);
        }, message);
      },
      async add(record) {
        const value = isPreset ? normalizePreset(record) : store === 'chatSessions' ? withGeneration(record) : record;
        const message = `Không thể tạo ${label} "${value?.[key]}".`;
        return ordinaryTransaction(`${kind}.add`, [store], (tx, _setResult, abort) => {
          bindRequestError(tx.objectStore(store).add(value), abort, message);
        }, message);
      },
      async remove(id) {
        const message = `Không thể xóa ${label} "${id}".`;
        return ordinaryTransaction(`${kind}.remove`, [store], (tx, _setResult, abort) => {
          bindRequestError(tx.objectStore(store).delete(id), abort, message);
        }, message);
      },
    });
  }
  const repositories = Object.fromEntries(Object.entries(definitions).map(([kind, definition]) => [kind, repository(kind, definition, kind === 'presets')]));

  // Legacy sessions acquire an identity on first edit. Replacement/import always
  // rotates it; an in-flight write from an earlier incarnation must fail.
  function openSessionForEditing(id, isCurrent = () => true) {
    const message = 'Không thể mở phiên trò chuyện.';
    return ordinaryTransaction('sessions.openForEditing', ['chatSessions'], (tx, setResult, abort) => {
      const store = tx.objectStore('chatSessions');
      const request = bindRequestError(store.get(id), abort, message);
      request.onsuccess = () => {
        try {
          if (!isCurrent()) { setResult(undefined); return; }
          let record = request.result;
          if (record && (!record[SESSION_GENERATION] || record[SESSION_EDITOR] !== editor)) {
            record = { ...withGeneration(record), [SESSION_EDITOR]: editor };
            bindRequestError(store.put(record), abort, message);
          }
          setResult(record);
        } catch (error) { abort(error); }
      };
    }, message);
  }

  // Existing-session writes must not resurrect a deleted record. Preserve fields
  // unknown to the current snapshot schema and resolve a renamed preset against
  // the stored session inside the same transaction.
  async function saveExistingSession(record) {
    const message = 'Không thể cập nhật phiên trò chuyện đã bị xóa hoặc thay thế.';
    return ordinaryTransaction('sessions.saveExisting', ['chatSessions', 'characters', 'presets'], (tx, setResult, abort) => {
      const sessions = tx.objectStore('chatSessions');
      const request = bindRequestError(sessions.get(record.sessionId), abort, message);
      request.onsuccess = () => {
        try {
          const previous = request.result;
          if (!previous || previous.characterFileName !== record.characterFileName || previous[SESSION_GENERATION] !== record[SESSION_GENERATION] || previous[SESSION_EDITOR] !== editor) throw Error('Session was deleted or replaced.');
          const character = bindRequestError(tx.objectStore('characters').get(record.characterFileName), abort, message);
          character.onsuccess = () => {
            try {
              if (!character.result) throw Error('Session character no longer exists.');
              const next = { ...previous, ...record, [SESSION_EDITOR]: editor };
              for (const key of [...sessionStateContract.runtimeOnly, ...sessionStateContract.diagnosticsOnly, 'arenaUserProfileId']) delete next[key];
              if (typeof record.presetName !== 'string' || !record.presetName.trim()) {
                if (previous.presetName !== undefined) next.presetName = previous.presetName;
                bindRequestError(sessions.put(next), abort, message);
                setResult(next);
                return;
              }
              const preset = bindRequestError(tx.objectStore('presets').get(record.presetName), abort, message);
              preset.onsuccess = () => {
                try {
                  if (!preset.result && previous.presetName !== record.presetName) next.presetName = previous.presetName;
                  bindRequestError(sessions.put(next), abort, message);
                  setResult(next);
                } catch (error) { abort(error); }
              };
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    }, message);
  }

  // Strip diagnostics-only fields inside a single readwrite transaction via cursor.
  // Never resurrects a session deleted concurrently and preserves active edit ownership.
  async function cleanupSessionDiagnostics() {
    const message = 'Không thể dọn dẹp dữ liệu chẩn đoán phiên trò chuyện.';
    return ordinaryTransaction('sessions.cleanupDiagnostics', ['chatSessions'], (tx, setResult, abort) => {
      let sessionsCleaned = 0;
      const store = tx.objectStore('chatSessions');
      const request = bindRequestError(store.openCursor(), abort, message);
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) {
            setResult({ sessionsCleaned });
            return;
          }
          const value = cursor.value;
          if (value && typeof value === 'object') {
            let dirty = false;
            for (const key of sessionStateContract.diagnosticsOnly) {
              if (Object.prototype.hasOwnProperty.call(value, key)) {
                dirty = true;
                break;
              }
            }
            if (dirty) {
              const cleaned = { ...value };
              for (const key of sessionStateContract.diagnosticsOnly) {
                delete cleaned[key];
              }
              bindRequestError(cursor.update(cleaned), abort, message);
              sessionsCleaned += 1;
            }
          }
          cursor.continue();
        } catch (error) { abort(error); }
      };
    }, message);
  }

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

  async function removeCharacterAndSessions(fileName) {
    const message = `Không thể xóa nhân vật "${fileName}" và các phiên liên quan.`;
    return ordinaryTransaction('characters.remove', ['characters', 'chatSessions'], (tx, setResult, abort) => {
      let count = 0;
      const request = bindRequestError(tx.objectStore('chatSessions').openCursor(), abort, message);
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) {
            bindRequestError(tx.objectStore('characters').delete(fileName), abort, message);
            setResult(count);
            return;
          }
          if (cursor.value.characterFileName === fileName) {
            bindRequestError(cursor.delete(), abort, message);
            count++;
          }
          cursor.continue();
        } catch (error) { abort(error); }
      };
    }, message);
  }

  // Read the stored source and create the destination without overwriting an existing key.
  // Both requests belong to one transaction; any constraint failure rolls back the rename.
  async function renamePreset(name, newName) {
    const message = `Không thể đổi tên preset "${name}" thành "${newName}".`;
    return ordinaryTransaction('presets.rename', ['presets', 'chatSessions'], (tx, setResult, abort) => {
      const store = tx.objectStore('presets');
      const request = bindRequestError(store.get(name), abort, message);
      request.onsuccess = () => {
        try {
          if (!request.result) throw Error(`Preset not found: ${name}`);
          if (name === newName) { setResult(normalizePreset(request.result)); return; }
          const next = normalizePreset({ ...request.result, name: newName });
          bindRequestError(store.add(next), abort, message);
          bindRequestError(store.delete(name), abort, message);
          const cursorRequest = bindRequestError(tx.objectStore('chatSessions').openCursor(), abort, message);
          cursorRequest.onsuccess = () => {
            try {
              const cursor = cursorRequest.result;
              if (!cursor) { setResult(next); return; }
              if (cursor.value.presetName === name) {
                bindRequestError(cursor.update({ ...cursor.value, presetName: newName }), abort, message);
              }
              cursor.continue();
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    }, message);
  }

  return Object.freeze({
    ...repositories,
    setWriteGuard,
    setWriteCoordinator,
    mergeRecords: async (records, options) => {
      // Ordinary import participates in the write boundary; recovery uses restoreRecords.
      assertWriteAllowed('entities.import');
      return runWrite('entities.import', () => mergeRecords(records, options));
    },
    restoreRecords: mergeRecords,
    rollbackRestoredRecords,
    readRestoreCommitMarker,
    clearRestoreCommitMarker,
    exportRecords,
    openSessionForEditing,
    saveExistingSession,
    cleanupSessionDiagnostics,
    removeCharacterAndSessions,
    renamePreset,
  });
}
