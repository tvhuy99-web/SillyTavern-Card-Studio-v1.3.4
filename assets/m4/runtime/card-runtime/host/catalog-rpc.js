export const CATALOG_RPC_METHODS = Object.freeze([
  'character.create', 'character.replace', 'character.delete', 'character.select',
  'persona.create', 'persona.replace', 'persona.delete',
  'preset.create', 'preset.replace', 'preset.delete', 'preset.rename',
]);
export function createCatalogRpcHandlers({ readState, characters, personas, presets, findCharacter,
  describeCharacter, normalizeCharacter, safeName, mergeSettings, clone, saveSession, uuid }) {
  return async function dispatch(method, args, lease) {
    const assertCurrent = () => lease?.assertCurrent();
    assertCurrent();
    switch (method) {
      case 'character.create': {
        const id = await characters().createNewCharacter(normalizeCharacter(args.name, args.character), null);
        assertCurrent(); return describeCharacter(id);
      }
      case 'character.replace': {
        const item = findCharacter(args.name);
        if (!item) throw Error(`Character not found: ${String(args.name || '')}`);
        const updated = await characters().updateCharacterById(item.fileName, current => normalizeCharacter(current.name, { ...args.character, raw: { ...current, ...args.character?.raw } }), assertCurrent);
        const card = updated.card;
        assertCurrent();
        const state = readState();

        if (state.card && (state.card.fileName ? state.card.fileName === item.fileName : state.card.name === item.card.name)) {
          const current = { ...card, fileName: item.fileName };
          state.setSessionData({ card: current, mergedSettings: state.preset ? mergeSettings(current, state.preset) : state.mergedSettings });
          await saveSession?.(); assertCurrent();
        }
        return describeCharacter(item.fileName);
      }
      case 'character.delete': {
        const item = findCharacter(args.name);
        return item ? characters().deleteCharacterById(item.fileName, assertCurrent) : false;
      }
      case 'character.select': {
        const item = findCharacter(args.id ?? args.name);
        if (!item) return false;
        const state = readState(), card = { ...clone(item.card), fileName: item.fileName };
        characters().setActiveCharacterFileName(item.fileName);
        state.setSessionData({ card, mergedSettings: state.preset ? mergeSettings(card, state.preset) : state.mergedSettings });
        return true;
      }
      case 'persona.create': {
        const input = args.persona || {};
        const next = { ...clone(input), id: safeName(input.id, `persona_${uuid()}`), name: safeName(args.name ?? input.name, 'Persona'), description: String(input.description ?? '') };
        await personas().savePersonaStrict(next, assertCurrent); assertCurrent();
        return { ...clone(next), current: next.id === personas().activePersonaId };
      }
      case 'persona.replace': {
        const item = personas().personas.find(item => item.id === String(args.id) || item.name === String(args.id));
        if (!item) throw Error(`Persona not found: ${String(args.id || '')}`);
        const next = { ...item, ...clone(args.persona || {}), id: item.id, name: safeName(args.persona?.name ?? item.name, item.name), description: String(args.persona?.description ?? item.description ?? '') };
        await personas().savePersonaStrict(next, assertCurrent); assertCurrent();
        const state = readState();
        if (state.persona?.id === item.id) state.setSessionData({ persona: next });
        return { ...clone(next), current: next.id === personas().activePersonaId };
      }
      case 'persona.delete': return personas().deletePersonaStrict(String(args.id || ''), assertCurrent);
      case 'preset.create': return clone(await presets().createPresetStrict(safeName(args.name, 'Preset'), args.preset || {}, assertCurrent));
      case 'preset.replace': {
        const name = safeName(args.name, readState().preset?.name || 'Preset');
        const item = presets().presets.find(item => item.name === name);
        if (!item) throw Error(`Preset not found: ${name}`);
        const next = await presets().updatePresetByName(name, current => ({ ...current, ...clone(args.preset || {}), name }), assertCurrent);
        assertCurrent(); const state = readState();
        if (state.preset?.name === name) state.setSessionData({ preset: next, mergedSettings: state.card ? mergeSettings(state.card, next) : next });
        return clone(next);
      }
      case 'preset.delete': return presets().deletePresetByName(String(args.name || ''), assertCurrent);
      case 'preset.rename': {
        const name = String(args.name || '');
        const next = await presets().renamePresetStrict(name, String(args.newName || ''), assertCurrent);
        assertCurrent();
        const state = readState();
        if (state.preset?.name === name) state.setSessionData({ preset: next, mergedSettings: state.card ? mergeSettings(state.card, next) : next });
        return clone(next);
      }
      default: throw Error(`Unsupported catalog RPC: ${method}`);
    }
  };
}
