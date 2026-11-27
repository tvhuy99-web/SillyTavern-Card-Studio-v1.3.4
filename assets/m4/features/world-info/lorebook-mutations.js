import { createSerialQueue } from '../../../recovered/core/async/serial-queue.js';

export function createLorebookMutations({ get, set, repository, run = createSerialQueue() }) {
  function saveLorebookStrict(record, guard = () => {}) {
    return run(async () => {
      guard();
      await repository.put(record);
      set(state => {
        const index = state.lorebooks.findIndex(item => item.name === record.name);
        if (index < 0) state.lorebooks.push(record); else state.lorebooks[index] = record;
      });
      return record;
    });
  }
  function updateLorebookStrict(name, update, guard = () => {}) {
    return run(async () => {
      guard();
      const current = get().lorebooks.find(item => item.name === name);
      if (!current) throw Error(`Lorebook not found: ${name}`);
      const next = { ...update(current), name };
      guard();
      await repository.put(next);
      set(state => {
        const index = state.lorebooks.findIndex(item => item.name === name);
        if (index >= 0) state.lorebooks[index] = next;
      });
      return next;
    });
  }
  function deleteLorebookStrict(name, guard = () => {}) {
    return run(async () => {
      guard();
      await repository.remove(name);
      set(state => { state.lorebooks = state.lorebooks.filter(item => item.name !== name); });
      return true;
    });
  }
  function createLorebook(name, entries = [], extra = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return Promise.reject(new Error('Tên sổ tay không được để trống.'));
    return run(async () => {
      if (get().lorebooks.some(item => item.name === cleanName)) {
        throw new Error(`Sổ tay "${cleanName}" đã tồn tại.`);
      }
      const clonedEntries = JSON.parse(JSON.stringify(Array.isArray(entries) ? entries : [])).map((entry, idx) => ({
        ...entry,
        uid: entry.uid || `entry_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        source_lorebook: undefined,
      }));
      const record = {
        name: cleanName,
        isGlobal: Boolean(extra.isGlobal),
        book: {
          name: cleanName,
          entries: clonedEntries,
        },
      };
      await repository.put(record);
      set(state => { state.lorebooks.push(record); state.error = ''; });
      return record;
    });
  }
  function renameLorebook(oldName, newName) {
    const cleanNew = String(newName || '').trim();
    if (!cleanNew) return Promise.reject(new Error('Tên sổ tay mới không được để trống.'));
    return run(async () => {
      const current = get().lorebooks.find(item => item.name === oldName);
      if (!current) throw new Error(`Không tìm thấy sổ tay "${oldName}".`);
      if (cleanNew === oldName) return current;
      if (get().lorebooks.some(item => item.name === cleanNew)) {
        throw new Error(`Sổ tay "${cleanNew}" đã tồn tại.`);
      }
      const next = {
        ...current,
        name: cleanNew,
        book: { ...(current.book || { entries: [] }), name: cleanNew },
      };
      await repository.put(next);
      await repository.remove(oldName);
      set(state => {
        state.lorebooks = state.lorebooks.map(item => (item.name === oldName ? next : item));
        state.error = '';
      });
      return next;
    });
  }
  const ui = (action, message) => async (...args) => {
    try { return await action(...args); }
    catch { set(state => { state.error = message; }); }
  };
  return {
    saveLorebookStrict,
    updateLorebookStrict,
    deleteLorebookStrict,
    createLorebook,
    renameLorebook,
    addLorebook: ui(record => saveLorebookStrict(record), 'Failed to add lorebook'),
    updateLorebook: ui(record => updateLorebookStrict(record.name, () => record), 'Failed to update lorebook'),
    deleteLorebook: ui(name => deleteLorebookStrict(name), 'Failed to delete lorebook'),
  };
}
