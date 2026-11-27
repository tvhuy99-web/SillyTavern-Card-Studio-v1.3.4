import { sessionStateContract } from '../session-state.js';

export function assembleSessionOperations({ ordinaryTransaction, editor, withGeneration, bindRequestError, SESSION_GENERATION, SESSION_EDITOR }) {

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

  return { openSessionForEditing, saveExistingSession, cleanupSessionDiagnostics };
}
