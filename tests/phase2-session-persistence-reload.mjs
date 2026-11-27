import assert from 'node:assert/strict';
import { createSessionSaveCoordinator, createSessionWriteQueue } from '../src/app/persistence/session-save-coordinator.js';
import { useSessionPersistence } from '../src/features/chat/hooks/use-session-persistence.js';
import { runtimeState } from '../src/app/state/runtime-state.js';

const db = new Map();
db.set('sess-10-turns', {
  sessionId: 'sess-10-turns',
  characterFileName: 'hero.png',
  presetName: 'Default',
  userPersonaId: null,
  __stsRecordGeneration: 'gen-1',
  chatHistory: [{ id: 'm0', role: 'model', content: 'Greeting' }],
  variables: {},
  extensionSettings: {},
  visualState: {},
});

let storeState = {
  sessionId: null,
  __stsRecordGeneration: null,
  card: null,
  preset: null,
  persona: null,
  messages: [],
  variables: {},
  extensionSettings: {},
  visualState: {},
  isLoading: false,
  error: null,
};

const sessionStore = Object.assign(() => storeState, { getState: () => storeState });
const setSessionData = patch => {
  if (
    (Object.prototype.hasOwnProperty.call(patch, 'sessionId') && patch.sessionId !== storeState.sessionId) ||
    (Object.prototype.hasOwnProperty.call(patch, '__stsRecordGeneration') && patch.__stsRecordGeneration !== storeState.__stsRecordGeneration)
  ) {
    runtimeState.invalidateSession();
  }
  storeState = { ...storeState, ...patch };
};
const resetStore = () => {
  runtimeState.invalidateSession('store-reset');
  storeState = {
    sessionId: null,
    __stsRecordGeneration: null,
    card: null,
    preset: null,
    persona: null,
    messages: [],
    variables: {},
    extensionSettings: {},
    visualState: {},
    isLoading: false,
    error: null,
    setSessionData,
    setError: error => { storeState = { ...storeState, error }; },
    setLoading: isLoading => { storeState = { ...storeState, isLoading }; },
    resetStore,
  };
};
storeState.setSessionData = setSessionData;
storeState.setError = error => { storeState = { ...storeState, error }; };
storeState.setLoading = isLoading => { storeState = { ...storeState, isLoading }; };
storeState.resetStore = resetStore;

const writeQueue = createSessionWriteQueue(async record => {
  db.set(record.sessionId, JSON.parse(JSON.stringify(record)));
});

const states = [];
const refs = [];
const memos = [];
const scheduledTimers = [];
let stateIdx = 0, refIdx = 0, memoIdx = 0;
let pendingEffects = [];

const fakeReact = {
  useRef: initial => {
    const idx = refIdx++;
    if (!(idx in refs)) refs[idx] = { current: initial };
    return refs[idx];
  },
  useState: initial => {
    const idx = stateIdx++;
    if (!(idx in states)) states[idx] = typeof initial === 'function' ? initial() : initial;
    return [states[idx], next => { states[idx] = typeof next === 'function' ? next(states[idx]) : next; }];
  },
  useMemo: (fn, deps) => {
    const idx = memoIdx++;
    const prev = memos[idx];
    if (!prev || prev.deps.length !== deps.length || deps.some((d, i) => !Object.is(d, prev.deps[i]))) {
      memos[idx] = { value: fn(), deps };
    }
    return memos[idx].value;
  },
  useCallback: fn => fn,
  useEffect: fn => { pendingEffects.push(fn); },
};

const deps = {
  react: fakeReact,
  sessionStore,
  characterStore: () => ({ characters: [{ fileName: 'hero.png', card: { name: 'Hero', char_book: { entries: [] } } }], isLoading: false }),
  presetStore: () => ({ presets: [{ name: 'Default' }], isLoading: false }),
  personaStore: () => ({ personas: [], isLoading: false }),
  useToast: () => ({ showToast: () => {} }),
  truncateText: s => s,
  applySamplingOverrides: () => ({}),
  relaxedJson: { default: { parse: JSON.parse } },
  __stsRuntimeState: runtimeState,
  __stsSessionWriteQueue: writeQueue,
  __stsDiagnosticsState: { activate: () => ({}) },
  __stsSeedSessionInitialVariablesFromCard: () => ({ variables: {} }),
  __stsBackupRestoreService: { isRestoreInProgress: () => false, getRestoreEpoch: () => 0, subscribeRestoreLifecycle: () => () => {} },
  __stsCrossTabSync: { publish: () => {}, subscribe: () => () => {} },
  __stsRepositories: {
    openSessionForEditing: async id => JSON.parse(JSON.stringify(db.get(id))),
  },
  __stsSessionPersistence: {
    normalizeLoadedSession: record => ({ record, needsRewrite: false }),
    createSessionSnapshot: (state, overrides = {}) => ({
      sessionId: state.sessionId,
      characterFileName: state.card?.fileName,
      presetName: state.preset?.name,
      __stsRecordGeneration: state.__stsRecordGeneration,
      chatHistory: overrides.messages ?? state.messages,
      variables: overrides.variables ?? state.variables,
    }),
  },
  __stsCreateSessionSaveCoordinator: opts => createSessionSaveCoordinator({
    ...opts,
    delayMs: 0,
    schedule: fn => { scheduledTimers.push(fn); return scheduledTimers.length; },
    unschedule: () => {},
  }),
};

function renderHook() {
  stateIdx = 0; refIdx = 0; memoIdx = 0; pendingEffects = [];
  return useSessionPersistence(deps, 'sess-10-turns');
}

renderHook();
for (const eff of pendingEffects) eff();
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(storeState.sessionId, 'sess-10-turns');

const { saveSession } = renderHook();

const tenTurnMessages = [...storeState.messages];
for (let turn = 1; turn <= 10; turn += 1) {
  tenTurnMessages.push({ id: `u-${turn}`, role: 'user', content: `Player turn ${turn}` });
  tenTurnMessages.push({ id: `a-${turn}`, role: 'model', content: `AI reply ${turn}` });
}
storeState = { ...storeState, messages: tenTurnMessages };

const saved = await saveSession({});
assert.equal(saved, true, 'saveSession must commit after hydration');
await writeQueue.drain();

resetStore();
assert.equal(storeState.sessionId, null);
const reloaded = db.get('sess-10-turns');
assert.equal(reloaded.chatHistory.length, 21, 'All 10 turns must survive exit and re-enter');
assert.equal(reloaded.chatHistory.at(-1).content, 'AI reply 10');

const staleSaved = await saveSession({});
assert.equal(staleSaved, false, 'Stale save after resetStore must still be rejected');

console.log('Chat session 10-turn persistence & reload regression test: OK');
