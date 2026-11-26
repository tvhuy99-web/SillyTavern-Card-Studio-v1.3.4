import { createSerialQueue } from '../../core/async/serial-queue.js';
import { createPresetMutations } from '../../features/catalog/catalog-mutations.js';

export function createPresetStore({ createStore, immer, repositories, normalize, defaultPreset, parsePreset }) {
  const run = createSerialQueue(), clone = value => JSON.parse(JSON.stringify(value));
  return createStore()(immer((set, get) => ({
    presets: [], activePresetName: null, isLoading: true, error: '',
    reloadPresets: () => run(async () => {
      set(state => { state.isLoading = true; });
      try {
        let presets = await repositories.presets.list();
        if (!presets.some(item => item.name === defaultPreset.name)) {
          await repositories.presets.put(defaultPreset);
          presets = await repositories.presets.list();
        }
        set(state => { state.presets = presets; state.activePresetName ||= defaultPreset.name; state.error = ''; });
      } catch (error) {
        set(state => { state.error = error instanceof Error ? error.message : 'Error loading presets'; });
      } finally { set(state => { state.isLoading = false; }); }
    }),
    ...createPresetMutations({ get, set, repositories, normalize, defaultPreset, parsePreset, clone, run }),
    setActivePresetName: name => set(state => { state.activePresetName = name; }),
    revertActivePreset: () => {
      const name = get().activePresetName;
      if (!name) return Promise.resolve();
      return run(async () => {
        try {
          let record;
          if (name === defaultPreset.name) {
            record = normalize(defaultPreset);
            await repositories.presets.put(record);
          } else record = (await repositories.presets.list()).find(item => item.name === name);
          if (record) set(state => {
            const index = state.presets.findIndex(item => item.name === name);
            if (index !== -1) state.presets[index] = record;
          });
        } catch (error) { set(state => { state.error = error instanceof Error ? error.message : 'Failed to revert preset'; }); }
      });
    },
    duplicatePreset: (name, newName) => run(async () => {
      set(state => { state.error = ''; });
      const { presets } = get(), original = presets.find(item => item.name === name);
      if (!original) { set(state => { state.error = 'Không tìm thấy Preset gốc.'; }); return; }
      if (presets.some(item => item.name === newName)) throw Error('Tên Preset đã tồn tại.');
      try {
        const record = clone(original);
        record.name = newName;
        record.comment = `Bản sao của ${name}. ${record.comment || ''}`;
        await repositories.presets.add(record);
        set(state => { state.presets.push(record); state.activePresetName = newName; });
      } catch (error) { set(state => { state.error = 'Lỗi khi nhân bản Preset.'; }); throw error; }
    }),
  })));
}
