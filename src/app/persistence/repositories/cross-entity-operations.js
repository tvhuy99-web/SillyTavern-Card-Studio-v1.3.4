// Transaction bodies remain intact; the facade supplies the shared write boundary and record identity.
export function assembleCrossEntityOperations({ ordinaryTransaction, normalizePreset, bindRequestError }) {
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

  return { removeCharacterAndSessions, renamePreset };
}
