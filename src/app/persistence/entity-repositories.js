import { createAppDatabase } from './app-database.js';
import { normalizeLoadedSession } from './session-state.js';
import { assembleSessionOperations } from './repositories/session-operations.js';
import { assembleRestoreOperations } from './repositories/restore-operations.js';
import { assembleCrossEntityOperations } from './repositories/cross-entity-operations.js';

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

  const { openSessionForEditing, saveExistingSession, cleanupSessionDiagnostics } = assembleSessionOperations({ ordinaryTransaction, editor, withGeneration, bindRequestError, SESSION_GENERATION, SESSION_EDITOR });
  const { exportRecords, readRestoreCommitMarker, clearRestoreCommitMarker, mergeRecords, rollbackRestoredRecords } = assembleRestoreOperations({ database, definitions, normalizePreset, normalizePresetList, normalizeSession, withGeneration, isInternalMarker, applySessionNormalizer, bindRequestError, RESTORE_COMMIT_MARKER_ID, SESSION_GENERATION, SESSION_EDITOR });
  const { removeCharacterAndSessions, renamePreset } = assembleCrossEntityOperations({ ordinaryTransaction, normalizePreset, bindRequestError });

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
