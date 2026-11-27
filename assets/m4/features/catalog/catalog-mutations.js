import { createSerialQueue } from '../../../recovered/core/async/serial-queue.js';

function report(set, message) { set(state => { state.error = message; }); }
function uiAction(set, action, message) {
  return async (...args) => {
    try { return await action(...args); }
    catch (error) { report(set, message || error.message); }
  };
}
export function createCharacterMutations({ get, set, repositories, prepareRecord, revokeAvatar, parseCharacter, run = createSerialQueue() }) {
  const importCharacterStrict = (file, guard = () => {}) => run(async () => {
    guard();
    const selected = get().activeCharacterFileName;
    const { card, avatarUrl, avatarFile } = await parseCharacter(file);
    const next = { card, fileName: file.name, avatarUrl, avatarFile };
    let committed = false;
    try {
      const record = await prepareRecord(next);
      guard();
      await repositories.characters.put(record);
      committed = true;
      let previousAvatar;
      let canSelect = true;
      try { guard(); } catch { canSelect = false; }
      set(state => {
        const index = state.characters.findIndex(item => item.fileName === next.fileName);
        if (index < 0) state.characters.push(next);
        else { previousAvatar = state.characters[index].avatarUrl; state.characters[index] = next; }
        if (canSelect && state.activeCharacterFileName === selected) state.activeCharacterFileName = next.fileName;
      });
      if (previousAvatar && previousAvatar !== avatarUrl) revokeAvatar(previousAvatar);
      guard();
      return next;
    } finally {
      if (!committed && avatarUrl) revokeAvatar(avatarUrl);
    }
  });
  const updateCharacterById = (id, update, guard = () => {}) => run(async () => {
    guard();
    const item = get().characters.find(item => item.fileName === id);
    if (!item) throw Error(`Character not found: ${id}`);
    const next = { ...item, card: typeof update === 'function' ? update(item.card) : update };
    const record = await prepareRecord(next); guard();
    await repositories.characters.put(record);
    set(state => { const index = state.characters.findIndex(item => item.fileName === id); if (index !== -1) state.characters[index] = next; });
    return next;
  });
  const deleteCharacterById = (id, guard = () => {}) => run(async () => {
    guard();
    if (!get().characters.some(item => item.fileName === id)) return false;
    await repositories.removeCharacterAndSessions(id);
    let avatar;
    set(state => {
      avatar = state.characters.find(item => item.fileName === id)?.avatarUrl;
      state.characters = state.characters.filter(item => item.fileName !== id);
      if (state.activeCharacterFileName === id) state.activeCharacterFileName = state.characters[0]?.fileName ?? null;
    });
    if (avatar) revokeAvatar(avatar);
    return true;
  });
  return { importCharacterStrict, loadCharacter: uiAction(set, async file => { report(set, ""); return importCharacterStrict(file); }), updateCharacterById, deleteCharacterById,
    updateActiveCharacter: uiAction(set, card => { const id = get().activeCharacterFileName; if (id) return updateCharacterById(id, card); }),
    deleteActiveCharacter: uiAction(set, () => { const id = get().activeCharacterFileName; if (id) return deleteCharacterById(id); }, 'Failed to delete character') };
}
export function createPersonaMutations({ get, set, repositories, resolveActive, clearActive, run = createSerialQueue() }) {
  const savePersonaStrict = (persona, guard = () => {}) => run(async () => {
    guard();
    await repositories.personas.put(persona);
    set(state => {
      const index = state.personas.findIndex(item => item.id === persona.id);
      if (index === -1) state.personas.push(persona); else state.personas[index] = persona;
      state.activePersona = resolveActive(state.personas, state.activePersonaId);
    });
    return persona;
  });
  const deletePersonaStrict = (id, guard = () => {}) => run(async () => {
    guard();
    if (!get().personas.some(item => item.id === id)) return false;
    await repositories.personas.remove(id);
    set(state => {
      state.personas = state.personas.filter(item => item.id !== id);
      if (state.activePersonaId === id) { state.activePersonaId = null; clearActive(); }
      state.activePersona = resolveActive(state.personas, state.activePersonaId);
    });
    return true;
  });
  return { savePersonaStrict, deletePersonaStrict,
    addOrUpdatePersona: uiAction(set, persona => savePersonaStrict(persona), 'Failed to save persona'),
    deletePersona: uiAction(set, id => deletePersonaStrict(id), 'Failed to delete persona') };
}
export function createPresetMutations({ get, set, repositories, normalize, defaultPreset, clone, parsePreset, run = createSerialQueue() }) {
  const importPresetStrict = (file, { select = false, guard = () => {} } = {}) => run(async () => {
    guard();
    const selected = get().activePresetName;
    const next = normalize(await parsePreset(file));
    guard();
    await repositories.presets.put(next);
    let canSelect = true;
    try { guard(); } catch { canSelect = false; }
    set(state => {
      const index = state.presets.findIndex(item => item.name === next.name);
      if (index < 0) state.presets.push(next); else state.presets[index] = next;
      if (select && canSelect && state.activePresetName === selected) state.activePresetName = next.name;
    });
    guard();
    return next;
  });
  const createPresetStrict = (name, overrides = {}, guard = () => {}) => run(async () => {
    guard();
    if (!name || get().presets.some(item => item.name === name)) throw Error('Tên Preset đã tồn tại hoặc không hợp lệ.');
    const next = normalize({ ...clone(defaultPreset), comment: 'Preset mới được tạo.', prompts: [], ...clone(overrides), name });
    await repositories.presets.add(next);
    set(state => { state.presets.push(next); state.activePresetName = name; });
    return next;
  });
  const updatePresetByName = (name, update, guard = () => {}) => run(async () => {
    guard();
    const current = get().presets.find(item => item.name === name);
    if (!current) throw Error(`Preset not found: ${name}`);
    const next = normalize({ ...(typeof update === 'function' ? update(current) : update), name });
    await repositories.presets.put(next);
    set(state => { const index = state.presets.findIndex(item => item.name === name); if (index !== -1) state.presets[index] = next; });
    return next;
  });
  const deletePresetByName = (name, guard = () => {}) => run(async () => {
    guard();
    if (!get().presets.some(item => item.name === name)) return false;
    await repositories.presets.remove(name);
    set(state => {
      state.presets = state.presets.filter(item => item.name !== name);
      if (state.activePresetName === name) state.activePresetName = state.presets[0]?.name ?? null;
    });
    return true;
  });
  const renamePresetStrict = (name, newName, guard = () => {}) => run(async () => {
    guard();
    const current = get().presets.find(item => item.name === name);
    if (!current) throw Error(`Preset not found: ${name}`);
    if (name === newName) return current;
    if (!newName || get().presets.some(item => item.name === newName)) throw Error('Tên Preset mới đã tồn tại hoặc không hợp lệ.');
    const next = await repositories.renamePreset(name, newName);
    set(state => {
      state.presets = state.presets.filter(item => item.name !== name);
      state.presets.push(next);
      if (state.activePresetName === name) state.activePresetName = newName;
    });
    return next;
  });
  const reportAndThrow = (action, message) => async (...args) => {
    report(set, '');
    try { return await action(...args); } catch (error) { report(set, message); throw error; }
  };
  return { importPresetStrict, addPreset: uiAction(set, async file => { report(set, ""); return importPresetStrict(file, { select: true }); }), createPresetStrict, updatePresetByName, deletePresetByName, renamePresetStrict,
    createPreset: reportAndThrow(name => createPresetStrict(name), 'Lỗi khi tạo Preset.'),
    renamePreset: reportAndThrow((name, newName) => renamePresetStrict(name, newName), 'Lỗi khi đổi tên Preset.'),
    updateActivePreset: uiAction(set, preset => updatePresetByName(preset.name, preset), 'Failed to update preset'),
    deleteActivePreset: uiAction(set, () => { const name = get().activePresetName; if (name) return deletePresetByName(name); }, 'Failed to delete preset') };
}
