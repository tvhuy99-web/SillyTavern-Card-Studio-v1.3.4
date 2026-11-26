import { createSerialQueue } from '../../core/async/serial-queue.js';

/** One queue for catalog writes from UI and runtime. Read-modify-write runs inside it. */
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
  const ui = (action, message) => async (...args) => {
    try { return await action(...args); }
    catch { set(state => { state.error = message; }); }
  };
  return { saveLorebookStrict, updateLorebookStrict, deleteLorebookStrict,
    addLorebook: ui(record => saveLorebookStrict(record), 'Failed to add lorebook'),
    updateLorebook: ui(record => updateLorebookStrict(record.name, () => record), 'Failed to update lorebook'),
    deleteLorebook: ui(name => deleteLorebookStrict(name), 'Failed to delete lorebook') };
}
