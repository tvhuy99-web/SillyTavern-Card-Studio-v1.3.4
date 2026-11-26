import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSessionStore } from '../src/app/state/session-store.js';
import { useSessionPersistence } from '../src/features/chat/hooks/use-session-persistence.js';
import { createBackupSettings } from '../src/ui/settings/settings-screens.js';
import { useConnectionSettings } from '../src/ui/settings/settings-controller.js';
import { createMemoryStorage } from '../src/providers/proxy/persistence.js';

// 1. session-store.js: Es must NOT be called inside the Immer setState updater.
{
  let insideReducer = false;
  let storeState = null;
  const esCalls = [];

  const createStore = () => creator => {
    const getState = () => storeState;
    const setState = updater => {
      if (typeof updater === 'function') {
        insideReducer = true;
        try {
          const draft = { ...storeState };
          updater(draft);
          storeState = draft;
        } finally {
          insideReducer = false;
        }
      } else {
        storeState = { ...storeState, ...updater };
      }
    };
    storeState = creator(setState, getState);
    return { getState };
  };

  const store = createSessionStore({
    At: createStore,
    It: fn => fn,
    Bs: x => x,
    Es: payload => esCalls.push({ insideReducer, payload }),
    __stsDiagnosticsState: {
      activate: () => ({ turns: [] }),
      snapshot: () => ({ turns: [] }),
      replace: x => x,
      clear: () => ({ turns: [] }),
    },
    __stsRuntimeState: {
      invalidateSession() {},
      add() {},
      remove() {},
      abortAll() {},
    },
    il: {
      isArenaMode: false,
      arenaProvider: 'gemini',
      arenaModelId: null,
      arenaUserProfileId: null,
      messages: [],
      logs: { turns: [] },
    },
    rl: () => [],
  });

  store.getState().setArenaMode(true);
  store.getState().setArenaProvider('proxy');
  store.getState().setArenaModelId('claude-opus-4.5');
  store.getState().setArenaUserProfileId('prof-1');

  assert.equal(esCalls.length, 4);
  for (const call of esCalls) {
    assert.equal(call.insideReducer, false, 'dependencies.Es must run outside Immer updater');
  }
  assert.deepEqual(esCalls.at(-1).payload, {
    enabled: true,
    provider: 'proxy',
    modelId: 'claude-opus-4.5',
    userProfileId: 'prof-1',
  });
}

// 2. settings-screens.js (BackupSettings): uses cleanupSessionDiagnostics & __stsBackupRestoreService.restore.
{
  const jsx = (type, props, key) => ({ type, props, key });
  const wt = { jsx, jsxs: jsx, Fragment: 'Fragment' };
  const find = (tree, pred) => {
    if (Array.isArray(tree)) {
      for (const child of tree) {
        const match = find(child, pred);
        if (match) return match;
      }
      return null;
    }
    if (!tree || typeof tree !== 'object' || !tree.props) return null;
    if (pred(tree)) return tree;
    return find(tree.props.children, pred);
  };

  const toasts = [];
  const reloads = [];
  let cleanupCalls = 0;
  let clearAllCalls = 0;
  let legacyListCalls = 0;
  let legacyPutCalls = 0;
  const restoredPayloads = [];
  let nextRestoreError = null;

  const react = {
    useState: init => [typeof init === 'function' ? init() : init, () => {}],
    useRef: init => ({ current: init }),
  };

  const originalWindow = globalThis.window;
  globalThis.window = { confirm: () => true };

  try {
    const BackupSettings = createBackupSettings(() => ({
      Ao: 'gemini',
      Io: 'rotation',
      jo: 'openrouter',
      Mo: 'profiles',
      Oo: 'password',
      Ns: [],
      To: 'st-card-studio:card-runtime:v2:',
      Ts: new Set(),
      Vt: async () => { legacyListCalls += 1; return []; },
      Wt: async () => { legacyPutCalls += 1; },
      Wd: v => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
      Jd: v => v,
      Kd: 14e7,
      Xd: async () => new ArrayBuffer(0),
      Yd: async () => '',
      __stsConnections: {},
      connections: {},
      __stsDiagnosticsState: { clearAll: () => { clearAllCalls += 1; } },
      diagnosticsState: { clearAll: () => { clearAllCalls += 1; } },
      __stsProxyPersistence: {},
      proxyPersistence: {},
      __stsRepositories: {
        cleanupSessionDiagnostics: async () => {
          cleanupCalls += 1;
          return { sessionsCleaned: 3 };
        },
        exportRecords: async () => ({ characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [] }),
        mergeRecords: async () => { throw new Error('must not bypass __stsBackupRestoreService'); },
      },
      repositories: {
        cleanupSessionDiagnostics: async () => {
          cleanupCalls += 1;
          return { sessionsCleaned: 3 };
        },
        exportRecords: async () => ({ characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [] }),
        mergeRecords: async () => { throw new Error('must not bypass __stsBackupRestoreService'); },
      },
      backupRestoreService: {
        restore: async payload => {
          restoredPayloads.push(payload);
          if (nextRestoreError) {
            const err = nextRestoreError;
            nextRestoreError = null;
            throw err;
          }
          return { ok: true };
        },
      },
      __stsBackupRestoreService: {
        restore: async payload => {
          restoredPayloads.push(payload);
          if (nextRestoreError) {
            const err = nextRestoreError;
            nextRestoreError = null;
            throw err;
          }
          return { ok: true };
        },
      },
      b: react,
      react,
      bu: () => ({ reloadPresets: async () => reloads.push('presets') }),
      presetStore: () => ({ reloadPresets: async () => reloads.push('presets') }),
      kc: () => ({ reloadCharacters: async () => reloads.push('characters') }),
      characterStore: () => ({ reloadCharacters: async () => reloads.push('characters') }),
      sn: () => ({ reloadLorebooks: async () => reloads.push('lorebooks') }),
      lorebookStore: () => ({ reloadLorebooks: async () => reloads.push('lorebooks') }),
      Au: () => ({ reloadPersonas: async () => reloads.push('personas') }),
      personaStore: () => ({ reloadPersonas: async () => reloads.push('personas') }),
      hl: () => ({ showToast: (msg, level) => toasts.push([msg, level]) }),
      useToast: () => ({ showToast: (msg, level) => toasts.push([msg, level]) }),
      mn: 'LoadingIndicator',
      LoadingIndicator: 'LoadingIndicator',
      wt,
      jsxRuntime: wt,
    }));

    const tree = BackupSettings();

    // Test cleanup button uses cleanupSessionDiagnostics (no Vt/Wt loop)
    const cleanupBtn = find(tree, node =>
      node.type === 'button' &&
      Array.isArray(node.props.children?.props?.children) &&
      node.props.children.props.children.includes('Dọn Dẹp Ngay'),
    );
    assert.ok(cleanupBtn, 'Dọn Dẹp Ngay button must exist');
    await cleanupBtn.props.onClick();
    assert.equal(cleanupCalls, 1);
    assert.equal(clearAllCalls, 1);
    assert.equal(legacyListCalls, 0);
    assert.equal(legacyPutCalls, 0);
    assert.ok(toasts.at(-1)[0].includes('3') && toasts.at(-1)[1] === 'success');

    // Test restore input routes through __stsBackupRestoreService.restore
    const restoreInput = find(tree, node => node.type === 'input' && node.props['aria-label'] === 'Chọn tệp khôi phục');
    assert.ok(restoreInput, 'Restore file input must exist');
    const sampleBackup = { version: 1, dataType: 'full_system_backup', data: { characters: [], presets: [], lorebooks: [], personas: [], chatSessions: [], appSettings: {} } };
    const file = new File([JSON.stringify(sampleBackup)], 'backup.json', { type: 'application/json' });
    await restoreInput.props.onChange({ target: { files: [file], value: 'backup.json' } });
    assert.equal(restoredPayloads.length, 1);
    assert.equal(restoredPayloads[0].dataType, 'full_system_backup');
    assert.deepEqual(reloads.slice(-4).sort(), ['characters', 'lorebooks', 'personas', 'presets']);
    assert.equal(toasts.at(-1)[1], 'success');

    // Test partial IDB commit failure still reloads catalogs and reports error toast
    reloads.length = 0;
    const partialErr = new Error('QuotaExceededError on Web Storage');
    partialErr.idbCommitted = true;
    nextRestoreError = partialErr;
    await restoreInput.props.onChange({ target: { files: [file], value: 'backup.json' } });
    assert.deepEqual(reloads.sort(), ['characters', 'lorebooks', 'personas', 'presets']);
    assert.equal(toasts.at(-1)[1], 'error');
  } finally {
    globalThis.window = originalWindow;
  }
}

// 3. use-session-persistence.js: passes initialRevision, onOwnershipLost, publishes & subscribes crossTabSync with cleanup.
{
  let coordinatorArgs = null;
  let cancelTimerCalls = 0;
  const toasts = [];
  const published = [];
  const subscriptions = new Map();
  const unsubscribed = [];
  const invalidations = [];
  const effects = [];

  const sessionState = {
    sessionId: null,
    messages: [],
    variables: {},
    extensionSettings: {},
    worldInfoState: {},
    worldInfoRuntime: {},
    worldInfoPinned: {},
    worldInfoPlacement: {},
    generatedLorebookEntries: [],
    storyQueue: [],
    longTermSummaries: [],
    summaryChunkSize: null,
    summaryQueue: [],
    visualState: {},
    authorNote: '',
    lastStateBlock: '',
    card: null,
    preset: null,
    persona: null,
    isArenaMode: false,
    arenaModelId: null,
    arenaProvider: null,
    arenaUserProfileId: null,
    setSessionData: patch => Object.assign(sessionState, patch),
    setError() {},
    setLoading() {},
    resetStore() {},
  };
  const ol = () => sessionState;
  ol.getState = () => sessionState;

  const react = {
    useRef: init => ({ current: init }),
    useMemo: fn => fn(),
    useCallback: fn => fn,
    useEffect: fn => { effects.push(fn); },
  };

  const deps = {
    b: react,
    ol,
    kc: () => ({ characters: [{ fileName: 'hero.png', card: { name: 'Hero' } }], isLoading: false }),
    bu: () => ({ presets: [{ name: 'Default', prompts: [] }], isLoading: false }),
    Au: () => ({ personas: [], isLoading: false }),
    hl: () => ({ showToast: (msg, level) => toasts.push([msg, level]) }),
    Is: s => String(s || '').slice(0, 50),
    yh: () => ({}),
    jt: { default: { parse: JSON.parse } },
    __stsRuntimeState: {
      getSessionRevision: () => 42,
      isBusy: () => false,
      invalidateSession: reason => invalidations.push(reason),
    },
    __stsCreateSessionSaveCoordinator: args => {
      coordinatorArgs = args;
      return {
        markDirty: () => false,
        cancelTimer: () => { cancelTimerCalls += 1; },
        flush: async () => true,
      };
    },
    __stsSessionWriteQueue: {
      drain: async () => {},
      enqueue: async () => {},
    },
    __stsRepositories: {
      openSessionForEditing: async id => ({
        sessionId: id,
        __stsRecordGeneration: 'gen-abc',
        characterFileName: 'hero.png',
        presetName: 'Default',
        chatHistory: [],
      }),
    },
    __stsSessionPersistence: {
      normalizeLoadedSession: record => ({ record, needsRewrite: false }),
      createSessionSnapshot: s => s,
    },
    __stsSeedSessionInitialVariablesFromCard: () => ({ variables: {} }),
    __stsDiagnosticsState: { activate: () => ({ turns: [] }) },
    __stsCrossTabSync: {
      publish: (type, payload) => { published.push({ type, payload }); return true; },
      subscribe: (type, fn) => {
        subscriptions.set(type, fn);
        return () => { unsubscribed.push(type); subscriptions.delete(type); };
      },
    },
  };

  useSessionPersistence(deps, 'sess-99');

  assert.ok(coordinatorArgs, 'createSessionSaveCoordinator must be called');
  assert.equal(coordinatorArgs.initialRevision, 42, 'initialRevision must be locked from runtimeState');
  assert.equal(typeof coordinatorArgs.onOwnershipLost, 'function');
  coordinatorArgs.onOwnershipLost(new Error('stale'));
  assert.equal(toasts.at(-1)[1], 'warning');

  // Run all mount effects
  const cleanups = effects.map(fn => fn()).filter(fn => typeof fn === 'function');
  await new Promise(resolve => setImmediate(resolve));

  assert.ok(
    published.some(e => e.type === 'session-claimed' && e.payload.sessionId === 'sess-99' && e.payload.generation === 'gen-abc'),
    'must publish session-claimed after openSessionForEditing',
  );
  assert.ok(subscriptions.has('session-claimed'));
  assert.ok(subscriptions.has('restore-completed'));

  // Simulate remote tab claiming the same session
  subscriptions.get('session-claimed')({ type: 'session-claimed', payload: { sessionId: 'sess-99' } });
  assert.equal(cancelTimerCalls, 1);
  assert.ok(invalidations.includes('cross-tab-session-claimed'));

  // Simulate remote tab completing restore
  subscriptions.get('restore-completed')({ type: 'restore-completed', payload: { ok: true } });
  assert.equal(cancelTimerCalls, 2);
  assert.ok(invalidations.includes('cross-tab-restore-completed'));

  // Verify cleanup unsubscribes both cross-tab listeners
  for (const cleanup of cleanups) cleanup();
  assert.deepEqual(unsubscribed.sort(), ['restore-completed', 'session-claimed']);
}

// 4. settings-controller.js: routes proxy keys and sts_aistudio_show_page through settingsRepository.
{
  const repoWrites = [];
  const mem = createMemoryStorage({ sts_aistudio_show_page: 'false' });
  const settingsRepository = {
    getRaw: key => mem.getItem(key),
    setRaw: (key, value) => { repoWrites.push([key, value]); mem.setItem(key, value); },
  };
  const state = [];
  const refs = [];
  let cursor = 0;
  let refCursor = 0;
  const react = {
    useState(init) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof init === 'function' ? init() : init;
      return [state[i], val => { state[i] = typeof val === 'function' ? val(state[i]) : val; }];
    },
    useMemo: fn => fn(),
    useRef(init) {
      const i = refCursor++;
      return refs[i] ??= { current: init };
    },
    useEffect() {},
  };

  const originalWindow = globalThis.window;
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  globalThis.window = {
    Capacitor: {
      isNativePlatform: () => true,
      nativePromise: async () => ({ ok: true }),
    },
  };

  try {
    const ctrl = useConnectionSettings({
      react,
      useToast: () => ({ showToast() {} }),
      useGeminiModels: () => ({ models: [], isLoading: false, refetch: async () => [] }),
      defaultGeminiModels: [],
      readSettings: () => ({ source: 'proxy', proxy_protocol: 'openai', proxy_model: 'm1', proxy_tool_model: 'm2', proxy_profile_id: '' }),
      saveSettings() {},
      readGemini: () => ({ useDefault: true, keys: [] }),
      readOpenRouterKey: () => '',
      readOpenRouterModels: () => [],
      readProxyUrl: () => 'https://proxy.example/',
      readProxyPassword: () => 'pw',
      readLegacyMode: () => false,
      readProxyForTools: () => true,
      readProfiles: () => [],
      saveProfiles() {},
      fetchOpenRouterModels: async () => [],
      saveOpenRouterModels() {},
      proxyPersistence: { getRememberSecrets: () => false, setPassword() {} },
      createAiStudioCatalog: () => ({ read: () => [], load: async () => ({ models: [] }), clear() {} }),
      connections: { saveGemini() {}, saveOpenRouterKey() {} },
      proxyUrlKey: 'sillyTavernStudio_proxyUrl',
      proxyLegacyKey: 'sillyTavernStudio_proxyLegacyMode',
      proxyForToolsKey: 'sillyTavernStudio_proxyForTools',
      catalog: { readProxyTarget: () => [], mergeProxyTarget() {}, clearProxyTarget() {} },
      settingsRepository,
    });

    ctrl.applySettings();
    await ctrl.changeAiStudioVisibility(true);

    const writtenKeys = repoWrites.map(([k]) => k);
    assert.ok(writtenKeys.includes('sillyTavernStudio_proxyUrl'));
    assert.ok(writtenKeys.includes('sillyTavernStudio_proxyLegacyMode'));
    assert.ok(writtenKeys.includes('sillyTavernStudio_proxyForTools'));
    assert.ok(writtenKeys.includes('sts_aistudio_show_page'));
    assert.equal(mem.getItem('sts_aistudio_show_page'), 'true');
  } finally {
    globalThis.window = originalWindow;
    globalThis.setTimeout = originalTimeout;
  }
}

// 5. host.js: initializes and injects all 3 E06 services + 3 missing backup keys in Ns.
{
  const hostSrc = readFileSync(new URL('../src/app/host.js', import.meta.url), 'utf8');
  assert.ok(hostSrc.includes("createCrossTabSync as __stsCreateCrossTabSync } from './persistence/cross-tab-sync.js'"));
  assert.ok(hostSrc.includes("createBackupRestoreService as __stsCreateBackupRestoreService } from './persistence/backup-restore-service.js'"));
  assert.ok(hostSrc.includes("createSettingsRepository as __stsCreateSettingsRepository } from './state/settings-repository.js'"));
  assert.ok(hostSrc.includes('__stsCrossTabSync=__stsCreateCrossTabSync()'));
  assert.ok(hostSrc.includes('__stsSettingsRepository=__stsCreateSettingsRepository('));
  assert.ok(hostSrc.includes('__stsBackupRestoreService=__stsCreateBackupRestoreService('));
  assert.ok(hostSrc.includes('saveArenaSettings=settings=>{__stsSettingsRepository.setJson(arenaSettingsKey,settings)}'));
  assert.ok(hostSrc.includes('"sillyTavernStudio_proxyRememberSecrets"'));
  assert.ok(hostSrc.includes('"sts_aistudio_show_page"'));
  assert.ok(hostSrc.includes('"sts_ai_studio_model_list"'));
  assert.ok(hostSrc.includes('settingsRepository:__stsSettingsRepository'));
  assert.ok(/backupRestoreService:\s*__stsBackupRestoreService/.test(hostSrc) && /connections:\s*__stsConnections/.test(hostSrc));
  assert.ok(hostSrc.includes('get __stsCrossTabSync(){return __stsCrossTabSync}'));
}

// 6. settings-screens.js: must NOT contain inline restoreBackupSettings( fallback.
{
  const settingsScreensSrc = readFileSync(new URL('../src/ui/settings/settings-screens.js', import.meta.url), 'utf8');
  assert.equal(settingsScreensSrc.includes('restoreBackupSettings('), false, 'legacy inline restoreBackupSettings fallback must be removed');
  assert.ok(/(?:__stsBackupRestoreService|backupRestoreService)\.restore\(rawBackup\)/.test(settingsScreensSrc));
  assert.ok(/(?:__stsBackupRestoreService|backupRestoreService)\?\.getPendingRecovery\?\.\(\)/.test(settingsScreensSrc));
  assert.ok(/(?:__stsBackupRestoreService|backupRestoreService)\.recover\(/.test(settingsScreensSrc));
}

console.log('WP-GAP-1 E06 live wiring (session-store, settings-screens, use-session-persistence, settings-controller, host): OK');
