import { createSerialQueue } from '../../core/async/serial-queue.js';
import { createLorebookMutations } from '../../../m4/features/world-info/lorebook-mutations.js';

export function createLorebookStore({ createStore, immer, repository, parseLorebook }) {
  const run = createSerialQueue();
  return createStore()(immer((set, get) => ({
    lorebooks: [], isLoading: false, error: '',
    reloadLorebooks: () => run(async () => {
      set(state => { state.isLoading = true; });
      try {
        const lorebooks = await repository.list();
        set(state => { state.lorebooks = lorebooks; state.error = ''; });
      } catch (error) { set(state => { state.error = error instanceof Error ? error.message : 'Error loading lorebooks'; }); }
      finally { set(state => { state.isLoading = false; }); }
    }),
    loadLorebooks: files => {
      const batch = Array.from(files);
      return run(async () => {
        set(state => { state.isLoading = true; });
        const failed = [], names = new Set(get().lorebooks.map(item => item.name));
        try {
          for (const file of batch) {
            try {
              const record = await parseLorebook(file);
              if (names.has(record.name)) continue;
              await repository.add(record);
              names.add(record.name);
            } catch { failed.push(file.name); }
          }
          const lorebooks = await repository.list();
          set(state => { state.lorebooks = lorebooks; if (failed.length) state.error = `Failed to load: ${failed.join(', ')}`; });
        } catch (error) { set(state => { state.error = error instanceof Error ? error.message : 'Error loading lorebooks'; }); }
        finally { set(state => { state.isLoading = false; }); }
      });
    },
    ...createLorebookMutations({ get, set, repository, run }),
  })));
}
