import { createSerialQueue } from '../../core/async/serial-queue.js';
import { createCharacterMutations } from '../../features/catalog/catalog-mutations.js';

/** Zustand/Immer instance is supplied by composition. Repositories own data. */
export function createCharacterStore({ createStore, immer, repositories, prepareRecord, parseCharacter, normalizeDefault, defaultCharacter, url = globalThis.URL }) {
  const run = createSerialQueue();
  const revoke = value => { if (value) url.revokeObjectURL(value); };
  return createStore()(immer((set, get) => ({
    characters: [], activeCharacterFileName: null, isLoading: true, error: '',
    reloadCharacters: () => run(async () => {
      const oldUrls = get().characters.map(item => item.avatarUrl).filter(Boolean);
      const allocated = [];
      let committed = false;
      set(state => { state.isLoading = true; });
      try {
        let records = await repositories.characters.list();
        if (!records.length) {
          const record = { card: normalizeDefault(defaultCharacter), fileName: 'Tuệ Thu Sinh (Mặc định).json', avatarUrl: null, avatarFile: null };
          await repositories.characters.put(await prepareRecord(record));
          records = await repositories.characters.list();
        }
        const characters = records.map(record => {
          const avatarFile = record.avatar ? new File([record.avatar.buffer], record.avatar.name, { type: record.avatar.type }) : null;
          const avatarUrl = avatarFile ? url.createObjectURL(avatarFile) : null;
          if (avatarUrl) allocated.push(avatarUrl);
          return { card: record.card, fileName: record.fileName, avatarUrl, avatarFile };
        });
        set(state => {
          state.characters = characters;
          if (characters.length && !state.activeCharacterFileName) state.activeCharacterFileName = characters[0].fileName;
          state.error = '';
        });
        committed = true;
        oldUrls.forEach(revoke);
      } catch (error) {
        set(state => { state.error = error instanceof Error ? error.message : 'Error loading characters'; });
      } finally {
        if (!committed) allocated.forEach(revoke);
        set(state => { state.isLoading = false; });
      }
    }),
    createNewCharacter: (card, avatarFile) => run(async () => {
      set(state => { state.error = ''; });
      let allocated = null;
      try {
        if (card.spec === 'chara_card_v3' && !Number.isFinite(card.creation_date)) card = { ...card, creation_date: Math.floor(Date.now() / 1000) };
        const base = card.name.trim().replace(/[^\p{L}\p{N}\s-]/gu, '_').replace(/\s+/g, ' ') || 'New_Character';
        const extension = avatarFile ? '.png' : '.json';
        const existing = new Set(get().characters.map(item => item.fileName));
        let fileName = `${base}${extension}`, suffix = 2;
        while (existing.has(fileName)) fileName = `${base}_${suffix++}${extension}`;
        allocated = avatarFile ? url.createObjectURL(avatarFile) : null;
        const item = { card, fileName, avatarUrl: allocated, avatarFile };
        await repositories.characters.add(await prepareRecord(item));
        set(state => { state.characters.push(item); state.activeCharacterFileName = fileName; });
        allocated = null;
        return fileName;
      } catch (error) {
        revoke(allocated);
        const message = error instanceof Error ? error.message : 'Failed to create character';
        set(state => { state.error = message; });
        throw Error(message);
      }
    }),
    ...createCharacterMutations({ get, set, repositories, prepareRecord, parseCharacter, revokeAvatar: revoke, run }),
    setActiveCharacterFileName: fileName => set(state => { state.activeCharacterFileName = fileName; }),
    setAvatarForActiveCharacter: (fileName, avatarUrl, avatarFile) => run(async () => {
      const current = get().characters.find(item => item.fileName === fileName);
      if (!current) { if (!get().characters.some(item => item.avatarUrl === avatarUrl)) revoke(avatarUrl); return; }
      const oldUrl = current.avatarUrl, next = { ...current, avatarUrl, avatarFile };
      try {
        await repositories.characters.put(await prepareRecord(next));
        set(state => {
          const index = state.characters.findIndex(item => item.fileName === fileName);
          if (index !== -1) state.characters[index] = next;
        });
        if (oldUrl !== avatarUrl) revoke(oldUrl);
      } catch (error) {
        if (avatarUrl !== oldUrl) revoke(avatarUrl);
        set(state => { state.error = error instanceof Error ? error.message : 'Không thể lưu avatar.'; });
      }
    }),
  })));
}
