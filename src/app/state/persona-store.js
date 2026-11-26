import { createSerialQueue } from '../../core/async/serial-queue.js';
import { createPersonaMutations } from '../../features/catalog/catalog-mutations.js';

export function createPersonaStore({ createStore, immer, repositories, defaultPersona, selectionKey, resolveActive, storage }) {
  const run = createSerialQueue();
  const local = () => storage ?? globalThis.localStorage;
  return createStore()(immer((set, get) => ({
    personas: [], activePersonaId: null, activePersona: null, isLoading: true, error: '',
    reloadPersonas: () => run(async () => {
      set(state => { state.isLoading = true; });
      try {
        let personas = await repositories.personas.list();
        if (!personas.length) { await repositories.personas.put(defaultPersona); personas = [defaultPersona]; }
        let selected = local().getItem(selectionKey);
        if (selected && !personas.some(item => item.id === selected)) selected = null;
        if (!selected && personas.length) { selected = personas[0].id; local().setItem(selectionKey, selected); }
        set(state => { state.personas = personas; state.activePersonaId = selected; state.activePersona = resolveActive(personas, selected); state.error = ''; });
      } catch (error) { set(state => { state.error = error instanceof Error ? error.message : 'Error loading personas'; }); }
      finally { set(state => { state.isLoading = false; }); }
    }),
    ...createPersonaMutations({ get, set, repositories, resolveActive, clearActive: () => local().removeItem(selectionKey), run }),
    setActivePersonaId: id => {
      if (id) local().setItem(selectionKey, id); else local().removeItem(selectionKey);
      set(state => { state.activePersonaId = id; state.activePersona = resolveActive(state.personas, id); });
    },
  })));
}
