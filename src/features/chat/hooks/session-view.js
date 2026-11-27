// Diagnostic-only writes must not invalidate the chat's React subscription.
// The underlying store, getState(), persistence and diagnostic actions stay intact.
export function createSessionViewSelector() {
  let previousState;
  let previousView;
  return state => {
    if (state === previousState && previousView) return previousView;
    const { logs, ...view } = state;
    const keys = Object.keys(view);
    if (!previousView || keys.length !== Object.keys(previousView).length
      || keys.some(key => !Object.hasOwn(previousView, key) || !Object.is(view[key], previousView[key]))) {
      previousView = view;
    }
    previousState = state;
    return previousView;
  };
}

const selectors = new WeakMap();
export function useSessionView(store) {
  let select = selectors.get(store);
  if (!select) {
    select = createSessionViewSelector();
    selectors.set(store, select);
  }
  return store(select);
}
