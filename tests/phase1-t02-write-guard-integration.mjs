import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGuardedStorage } from '../src/app/persistence/guarded-storage.js';
import { APP_DATABASE } from '../src/app/persistence/app-database.js';
import { createEntityRepositories } from '../src/app/persistence/entity-repositories.js';
import {
  createSessionSaveCoordinator,
  createSessionWriteQueue,
} from '../src/app/persistence/session-save-coordinator.js';
import {
  BackupRestoreError,
  createBackupRestoreService,
  createDurableRecoveryStore,
} from '../src/app/persistence/backup-restore-service.js';
import {
  createSessionSnapshot,
  normalizeLoadedSession,
} from '../src/app/persistence/session-state.js';
import {
  SETTINGS_STORAGE_KEYS,
  createSettingsRepository,
} from '../src/app/state/settings-repository.js';
import { useSessionPersistence } from '../src/features/chat/hooks/use-session-persistence.js';
import {
  PROXY_PERSISTENCE_KEYS,
  createMemoryStorage,
  createProxyPersistence,
} from '../src/providers/proxy/persistence.js';
import {
  CONNECTION_KEYS,
  createConnectionRepository,
} from '../src/providers/common/connection-repository.js';

// ============================================================================
// 1. Static + structural production wiring assertions on host.js & use-session-persistence.js
// ============================================================================
{
  const hostSrc = ['src/app/host.js','src/app/composition/persistence-composition.js','src/app/composition/provider-composition.js','src/app/composition/store-composition.js','src/app/composition/conversation-composition.js','src/app/composition/runtime-composition.js','src/app/composition/ui-composition.js'].map(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
  assert.ok(
    hostSrc.includes('__stsRepositories.setWriteGuard?.(operation=>__stsBackupRestoreService.assertNotRestoring(operation))'),
    'host.js must wire writeGuard onto __stsRepositories',
  );
  assert.ok(
    hostSrc.includes('__stsSessionWriteQueue.setWriteGuard?.({assertWriteAllowed:operation=>__stsBackupRestoreService.assertNotRestoring(operation),getRestoreEpoch:()=>__stsBackupRestoreService.getRestoreEpoch(),subscribeRestoreLifecycle:listener=>__stsBackupRestoreService.subscribeRestoreLifecycle(listener)})'),
    'host.js must wire writeGuard + epoch + lifecycle onto __stsSessionWriteQueue',
  );
  assert.ok(
    hostSrc.includes('__stsSettingsRepository.setWriteGuard?.(operation=>__stsBackupRestoreService.assertNotRestoring(operation))'),
    'host.js must wire writeGuard onto __stsSettingsRepository',
  );
  assert.ok(
    /var\s+useChatSession=__stsCreateChatSessionHook\(\{[^}]*__stsBackupRestoreService/.test(hostSrc),
    'host.js must pass __stsBackupRestoreService into __stsCreateChatSessionHook',
  );

  const hookSrc = readFileSync(new URL('../src/features/chat/hooks/use-session-persistence.js', import.meta.url), 'utf8');
  assert.ok(hookSrc.includes('isRestoreInProgress:'), 'useSessionPersistence must wire isRestoreInProgress');
  assert.ok(hookSrc.includes('getRestoreEpoch:'), 'useSessionPersistence must wire getRestoreEpoch');
  assert.ok(hookSrc.includes('subscribeRestoreLifecycle:'), 'useSessionPersistence must wire subscribeRestoreLifecycle');
}

// ============================================================================
// 2. Live end-to-end production-wired integration test
// ============================================================================
function createControllableDatabase() {
  const stores = Object.fromEntries(Object.keys(APP_DATABASE.stores).map(key => [key, new Map()]));
  let beforeMergeHook = null;
  let beforeWriteHook = null;
  let beforeExportHook = null;

  return {
    stores,
    setBeforeWriteHook(fn) { beforeWriteHook = fn; },
    setBeforeExportHook(fn) { beforeExportHook = fn; },
    setBeforeMergeHook(fn) {
      beforeMergeHook = fn;
    },
    async read(store, method, args) {
      return structuredClone(method === 'getAll' ? [...stores[store].values()] : stores[store].get(args[0]));
    },
    async transaction(names, mode, work, message = 'Transaction failed') {
      if (beforeExportHook && mode === 'readonly' && names.length === 5) { beforeExportHook(); }
      if (beforeWriteHook && mode === 'readwrite' && names.length === 1) {
        const hook = beforeWriteHook; beforeWriteHook = null; await hook();
      }
      if (beforeMergeHook && mode === 'readwrite' && names.length === 5) {
        const hook = beforeMergeHook;
        beforeMergeHook = null;
        await hook();
      }
      const draft = Object.fromEntries(names.map(name => [name, structuredClone(stores[name])]));
      const queue = [];
      let result;
      const makeRequest = executor => {
        const req = {};
        queue.push(() => {
          req.result = structuredClone(executor());
          req.onsuccess?.();
        });
        return req;
      };
      const tx = {
        objectStore(name) {
          const data = draft[name];
          const keyPath = APP_DATABASE.stores[name];
          const write = (value, add = false) => makeRequest(() => {
            const key = value[keyPath];
            if (add && data.has(key)) throw Error('duplicate');
            data.set(key, structuredClone(value));
            return key;
          });
          return {
            get: key => makeRequest(() => data.get(key)),
            getAll: () => makeRequest(() => [...data.values()]),
            put: value => write(value, false),
            add: value => write(value, true),
            delete: key => makeRequest(() => data.delete(key)),
          };
        },
      };
      work(tx, value => { result = value; }, cause => { throw cause || new Error(message); });
      while (queue.length) queue.shift()();
      if (mode === 'readwrite') {
        for (const name of names) stores[name] = draft[name];
      }
      return result;
    },
  };
}

function buildProductionWiredStack({ webLocks = null } = {}) {
  const database = createControllableDatabase();
  const local = createMemoryStorage();
  const session = createMemoryStorage();
  const snapshotStorage = createMemoryStorage();
  const host = { localStorage: local, sessionStorage: session };

  const repositories = createEntityRepositories({
    database,
    normalizePreset: value => value,
    normalizePresetList: value => value,
  });
  const sessionWriteQueue = createSessionWriteQueue(record => repositories.saveExistingSession(record));
  const settingsRepository = createSettingsRepository({ storage: local });
  const connections = createConnectionRepository(host);
  const proxy = createProxyPersistence(host);
  const backupKeys = {
    ...CONNECTION_KEYS,
    profiles: PROXY_PERSISTENCE_KEYS.profilesLegacy,
    password: PROXY_PERSISTENCE_KEYS.proxyPasswordLegacy,
  };
  const allowed = new Set([
    CONNECTION_KEYS.gemini,
    CONNECTION_KEYS.openrouter,
    CONNECTION_KEYS.rotation,
    backupKeys.profiles,
    backupKeys.password,
    SETTINGS_STORAGE_KEYS.arenaSettings,
  ]);
  const backupRestoreService = createBackupRestoreService({
    repositories,
    storage: { local, session, connections, proxy, keys: backupKeys },
    backupOptions: { allowed, prefix: SETTINGS_STORAGE_KEYS.cardRuntimePrefix, keys: backupKeys, proxy },
    journalStorage: local,
    snapshotStore: createDurableRecoveryStore({ indexedDB: null, storage: snapshotStorage }),
    webLocks,
  });

  // Exact same centralized wiring as src/app/host.js:
  repositories.setWriteGuard(op => backupRestoreService.assertNotRestoring(op));
  repositories.setWriteCoordinator(backupRestoreService.runOrdinaryWrite);
  sessionWriteQueue.setWriteGuard({
    assertWriteAllowed: op => backupRestoreService.assertNotRestoring(op),
    getRestoreEpoch: () => backupRestoreService.getRestoreEpoch(),
    subscribeRestoreLifecycle: fn => backupRestoreService.subscribeRestoreLifecycle(fn),
  });
  settingsRepository.setWriteGuard(op => backupRestoreService.assertNotRestoring(op));

  return {
    database,
    local,
    session,
    repositories,
    sessionWriteQueue,
    settingsRepository,
    backupRestoreService,
    ordinaryConnections: createConnectionRepository(host, { assertWriteAllowed: backupRestoreService.assertNotRestoring }),
    ordinaryProxy: createProxyPersistence({ ...host, migrateOnCreate: false, assertWriteAllowed: backupRestoreService.assertNotRestoring }),
    guardedStorage: createGuardedStorage(() => local, backupRestoreService.assertNotRestoring),
  };
}

// 2a. Pause real restore() mid-flight; verify useSessionPersistence autosave, explicit saveSession,
//     pre-restore queued writes, and all entity/settings mutations are blocked & invalidated cleanly.
{
  const stack = buildProductionWiredStack();

  // Seed initial baseline data
  await stack.repositories.characters.put({ fileName: 'hero.png', card: { name: 'Hero' } });
  await stack.repositories.presets.put({ name: 'Default', prompts: [] });
  await stack.repositories.lorebooks.put({ name: 'Book1', entries: [] });
  await stack.repositories.personas.put({ id: 'p1', name: 'Player' });
  await stack.repositories.sessions.put({
    sessionId: 's1',
    characterFileName: 'hero.png',
    presetName: 'Default',
    chatHistory: [{ id: 'm0', role: 'user', content: 'pre-restore message' }],
  });

  // Mount real useSessionPersistence hook wired identically to host.js
  let revision = 1;
  const sessionState = {
    sessionId: null,
    __stsRecordGeneration: null,
    card: null,
    preset: null,
    persona: null,
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
    isArenaMode: false,
    arenaModelId: null,
    arenaProvider: null,
    arenaUserProfileId: null,
    isLoading: false,
    setSessionData: patch => Object.assign(sessionState, patch),
    setError() {},
    setLoading(flag) { sessionState.isLoading = flag; },
    resetStore() {},
  };
  const ol = () => sessionState;
  ol.getState = () => sessionState;

  const effects = [];
  const refs = [];
  let refCursor = 0;
  let memoVal;
  let memoInit = false;
  const react = {
    useRef(init) {
      const idx = refCursor++;
      return refs[idx] ??= { current: init };
    },
    useMemo(fn) {
      if (!memoInit) { memoVal = fn(); memoInit = true; }
      return memoVal;
    },
    useCallback: fn => fn,
    useEffect(fn) { effects.push(fn); },
  };

  let scheduledTick = null;
  const hookResult = useSessionPersistence({
    react: react,
    sessionStore: ol,
    characterStore: () => ({ characters: [{ fileName: 'hero.png', card: { name: 'Hero' } }], isLoading: false }),
    presetStore: () => ({ presets: [{ name: 'Default', prompts: [] }], isLoading: false }),
    personaStore: () => ({ personas: [{ id: 'p1', name: 'Player' }], isLoading: false }),
    useToast: () => ({ showToast() {} }),
    truncateText: s => String(s || '').slice(0, 50),
    applySamplingOverrides: () => ({}),
    relaxedJson: { default: { parse: JSON.parse } },
    __stsRuntimeState: {
      getSessionRevision: () => revision,
      isBusy: () => false,
      invalidateSession() { revision += 1; },
    },
    __stsCreateSessionSaveCoordinator: opts => createSessionSaveCoordinator({
      ...opts,
      schedule: fn => { scheduledTick = fn; return 1; },
      unschedule: () => { scheduledTick = null; },
    }),
    __stsSessionWriteQueue: stack.sessionWriteQueue,
    __stsRepositories: stack.repositories,
    __stsBackupRestoreService: stack.backupRestoreService,
    __stsSessionPersistence: { createSessionSnapshot, normalizeLoadedSession },
    __stsSeedSessionInitialVariablesFromCard: () => ({ variables: {} }),
    __stsDiagnosticsState: { activate: () => ({ turns: [] }) },
  }, 's1');

  // Run mount effects to load s1 and claim edit ownership
  const cleanups = effects.map(fn => fn()).filter(fn => typeof fn === 'function');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sessionState.sessionId, 's1');

  // Trigger a pre-restore dirty edit (schedules autosave timer)
  sessionState.messages = [{ id: 'm0', role: 'user', content: 'STALE PRE-RESTORE EDIT' }];
  const dirtyEffect = effects[2];
  dirtyEffect();
  assert.equal(typeof scheduledTick, 'function', 'autosave timer should be armed before restore');

  // Also queue a pre-restore write behind a blocker in sessionWriteQueue
  const staleQueuedRecord = createSessionSnapshot(sessionState);
  let releaseMerge;
  const enteredMerge = new Promise(resolve => {
    stack.database.setBeforeMergeHook(() => {
      resolve();
      return new Promise(r => { releaseMerge = r; });
    });
  });

  const incomingBackup = {
    version: 1,
    timestamp: Date.now(),
    dataType: 'full_system_backup',
    data: {
      characters: [{ fileName: 'hero.png', card: { name: 'Restored Hero' } }],
      presets: [{ name: 'Default', prompts: [] }],
      lorebooks: [{ name: 'Book1', entries: [] }],
      personas: [{ id: 'p1', name: 'Restored Player' }],
      chatSessions: [{
        sessionId: 's1',
        characterFileName: 'hero.png',
        presetName: 'Default',
        chatHistory: [{ id: 'm-restored', role: 'model', content: 'FRESHLY RESTORED CONTENT' }],
      }],
      appSettings: {
        [SETTINGS_STORAGE_KEYS.arenaSettings]: JSON.stringify({ enabled: true }),
      },
    },
  };

  // Start restore -> lifecycle emits 'restore-started' -> cancels autosave timer & invalidates queued writes!
  const restorePromise = stack.backupRestoreService.restore(incomingBackup);
  await enteredMerge;

  // Autosave timer MUST have been cancelled immediately by 'restore-started'
  assert.equal(scheduledTick, null, 'restore-started must cancel pre-restore autosave timer');

  // Explicit saveSession during active restore MUST reject with RESTORE_IN_PROGRESS
  await assert.rejects(
    hookResult.saveSession(),
    err => err.code === 'RESTORE_IN_PROGRESS',
  );

  // All normal entity & settings mutations MUST reject during active restore!
  await assert.rejects(stack.repositories.characters.put({ fileName: 'c2.png', card: { name: 'C2' } }), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.characters.remove('hero.png'), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.presets.put({ name: 'P2', prompts: [] }), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.presets.remove('Default'), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.lorebooks.put({ name: 'L2', entries: [] }), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.lorebooks.remove('Book1'), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.personas.put({ id: 'p2', name: 'P2' }), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.personas.remove('p1'), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.sessions.put({ sessionId: 's2', characterFileName: 'hero.png', chatHistory: [] }), err => err.code === 'RESTORE_IN_PROGRESS');
  await assert.rejects(stack.repositories.sessions.remove('s1'), err => err.code === 'RESTORE_IN_PROGRESS');
  assert.throws(() => stack.settingsRepository.setJson(SETTINGS_STORAGE_KEYS.engineMode, 'current'), err => err.code === 'RESTORE_IN_PROGRESS');
  assert.throws(() => stack.settingsRepository.remove(SETTINGS_STORAGE_KEYS.engineMode), err => err.code === 'RESTORE_IN_PROGRESS');

  // U01: normal connection / proxy / feature writes must be blocked, including imports and editor claims.
  const blocked = err => err.code === 'RESTORE_IN_PROGRESS';
  assert.throws(() => stack.ordinaryConnections.saveSettings({source:'proxy'}), blocked);
  assert.throws(() => stack.ordinaryConnections.saveGemini({useDefault:false,keys:['test-only']}), blocked);
  assert.throws(() => stack.ordinaryConnections.saveOpenRouterKey('test-only'), blocked);
  assert.throws(() => stack.ordinaryProxy.setPassword('test-only'), blocked);
  assert.throws(() => stack.ordinaryProxy.setProfiles([]), blocked);
  assert.throws(() => stack.ordinaryProxy.setRememberSecrets(true), blocked);
  assert.throws(() => stack.guardedStorage.setItem(SETTINGS_STORAGE_KEYS.globalContext, '{}'), blocked);
  assert.throws(() => stack.guardedStorage.removeItem(SETTINGS_STORAGE_KEYS.globalContext), blocked);
  await assert.rejects(() => stack.repositories.mergeRecords({characters:[{fileName:'bypass.png'}]}), blocked);
  await assert.rejects(async () => stack.repositories.openSessionForEditing('s1'), blocked);

  // Finish restore
  releaseMerge();
  const restoreRes = await restorePromise;
  assert.equal(restoreRes.ok, true);

  // Verify freshly restored data is intact and NOT overwritten by pre-restore dirty state!
  const restoredSession = await stack.repositories.sessions.get('s1');
  assert.equal(restoredSession.chatHistory[0].content, 'FRESHLY RESTORED CONTENT');
  assert.equal((await stack.repositories.characters.get('hero.png')).card.name, 'Restored Hero');

  // Test pre-restore queued write invalidation explicitly:
  // Enqueue a write behind a paused queue item, start a second restore -> queued write MUST be skipped!
  let releaseBlocker;
  let resolveEnteredBlocker;
  const enteredBlocker = new Promise(r => { resolveEnteredBlocker = r; });
  const freshEdit = await stack.repositories.openSessionForEditing('s1');
  let writeExecuted = false;
  const customQueue = createSessionWriteQueue({
    write: async record => {
      if (record.marker === 'blocker') {
        resolveEnteredBlocker();
        await new Promise(r => { releaseBlocker = r; });
        return;
      }
      writeExecuted = true;
    },
    assertWriteAllowed: op => stack.backupRestoreService.assertNotRestoring(op),
    getRestoreEpoch: () => stack.backupRestoreService.getRestoreEpoch(),
    subscribeRestoreLifecycle: fn => stack.backupRestoreService.subscribeRestoreLifecycle(fn),
  });
  const pBlocker = customQueue.enqueue({ ...freshEdit, marker: 'blocker' });
  const pStaleQueued = customQueue.enqueue({ ...freshEdit, marker: 'stale-pre-restore' });
  await enteredBlocker;
  // Trigger restore (bumps epoch & emits restore-started -> invalidates pStaleQueued!)
  await stack.backupRestoreService.restore(incomingBackup);
  releaseBlocker();
  await pBlocker;
  assert.deepEqual(await pStaleQueued, {status:"discarded"});
  assert.equal(writeExecuted, false, 'pre-restore queued write MUST be skipped and never execute after restore');

  // Normal writes resume cleanly after restore completes!
  await stack.repositories.characters.put({ fileName: 'post-restore.png', card: { name: 'Post Restore' } });
  assert.equal((await stack.repositories.characters.get('post-restore.png')).card.name, 'Post Restore');
  stack.settingsRepository.setJson(SETTINGS_STORAGE_KEYS.engineMode, 'official-local');
  assert.equal(stack.settingsRepository.getJson(SETTINGS_STORAGE_KEYS.engineMode), 'official-local');

  for (const cleanup of cleanups) cleanup();
}

// 2b. During unresolved pending recovery (QuotaExceededError after IDB commit), all normal writes
//     are blocked with PENDING_RECOVERY_EXISTS while recover({ strategy: 'rollback-idb' }) succeeds
//     and normal writes resume afterward!
{
  const stack = buildProductionWiredStack();
  await stack.repositories.characters.put({ fileName: 'orig.png', card: { name: 'Original' } });
  await stack.repositories.presets.put({ name: 'OrigPreset', prompts: [] });
  await stack.repositories.lorebooks.put({ name: 'OrigBook', entries: [] });
  await stack.repositories.personas.put({ id: 'orig-p', name: 'Original Player' });
  await stack.repositories.sessions.put({
    sessionId: 'orig-s',
    characterFileName: 'orig.png',
    presetName: 'OrigPreset',
    chatHistory: [{ id: 'm0', role: 'user', content: 'original' }],
  });

  const origSetItem = stack.local.setItem;
  let failQuota = true;
  stack.local.setItem = (key, value) => {
    if (failQuota && key === SETTINGS_STORAGE_KEYS.arenaSettings) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return origSetItem(key, value);
  };

  await assert.rejects(
    stack.backupRestoreService.restore({
      version: 1,
      timestamp: Date.now(),
      dataType: 'full_system_backup',
      data: {
        characters: [{ fileName: 'new.png', card: { name: 'New' } }],
        presets: [{ name: 'NewPreset', prompts: [] }],
        lorebooks: [{ name: 'NewBook', entries: [] }],
        personas: [{ id: 'new-p', name: 'New Player' }],
        chatSessions: [{ sessionId: 'new-s', characterFileName: 'new.png', presetName: 'NewPreset', chatHistory: [] }],
        appSettings: { [SETTINGS_STORAGE_KEYS.arenaSettings]: JSON.stringify({ enabled: true }) },
      },
    }),
    err => err instanceof BackupRestoreError && err.code === 'WEB_STORAGE_RESTORE_FAILED',
  );

  // Unresolved pending recovery exists -> normal mutations MUST be rejected with PENDING_RECOVERY_EXISTS!
  await assert.rejects(stack.repositories.characters.put({ fileName: 'blocked.png', card: { name: 'Blocked' } }), err => err.code === 'PENDING_RECOVERY_EXISTS');
  await assert.rejects(stack.repositories.presets.put({ name: 'BlockedP', prompts: [] }), err => err.code === 'PENDING_RECOVERY_EXISTS');
  await assert.rejects(stack.repositories.lorebooks.put({ name: 'BlockedL', entries: [] }), err => err.code === 'PENDING_RECOVERY_EXISTS');
  await assert.rejects(stack.repositories.personas.put({ id: 'blocked-p', name: 'Blocked' }), err => err.code === 'PENDING_RECOVERY_EXISTS');
  await assert.rejects(stack.repositories.sessions.put({ sessionId: 'blocked-s', characterFileName: 'orig.png', chatHistory: [] }), err => err.code === 'PENDING_RECOVERY_EXISTS');
  assert.throws(() => stack.settingsRepository.setRaw(SETTINGS_STORAGE_KEYS.engineMode, 'safe'), err => err.code === 'PENDING_RECOVERY_EXISTS');

  assert.throws(() => stack.ordinaryConnections.saveSettings({source:'gemini'}), err => err.code === 'PENDING_RECOVERY_EXISTS');
  assert.throws(() => stack.ordinaryProxy.setPassword('test-only'), err => err.code === 'PENDING_RECOVERY_EXISTS');
  assert.throws(() => stack.guardedStorage.setItem(SETTINGS_STORAGE_KEYS.globalContext, '{}'), err => err.code === 'PENDING_RECOVERY_EXISTS');

  // Valid recovery rollback MUST still succeed even though normal writes are blocked!
  failQuota = false;
  const rolledBack = await stack.backupRestoreService.recover({ strategy: 'rollback-idb' });
  assert.equal(rolledBack.ok, true);
  assert.equal(rolledBack.status, 'rolled-back');
  assert.equal(await stack.repositories.characters.get('new.png'), undefined);
  assert.equal((await stack.repositories.characters.get('orig.png')).card.name, 'Original');

  // Normal writes resume cleanly after recovery completes!
  await stack.repositories.characters.put({ fileName: 'after-recovery.png', card: { name: 'After Recovery' } });
  assert.equal((await stack.repositories.characters.get('after-recovery.png')).card.name, 'After Recovery');
  stack.settingsRepository.setRaw(SETTINGS_STORAGE_KEYS.engineMode, 'safe');
  assert.equal(stack.settingsRepository.getRaw(SETTINGS_STORAGE_KEYS.engineMode), 'safe');
}

console.log('T02 production write-guard integration (host wiring, autosave discard, queued-write invalidation, entity/settings blocking & resume): OK');

// U02: a discarded queue operation must not be reported as a successful save.
{
  const state = {sessionId:'s'};
  const coordinator = createSessionSaveCoordinator({sessionId:'s', getState:()=>state,
    captureSnapshot:()=>state, queue:{enqueue:async()=>({status:'discarded'})}});
  assert.equal(await coordinator.flush({force:true}), false);
  coordinator.dispose();
}
// U03: fallback mode drains already-started local transactions before staging rollback data.
{
  const stack = buildProductionWiredStack();
  let release, entered;
  const started = new Promise(resolve => { entered=resolve; });
  stack.database.setBeforeWriteHook(async () => { entered(); await new Promise(resolve => {release=resolve;}); });
  const writer = stack.repositories.characters.put({fileName:'in-flight.png',card:{name:'before restore'}});
  await started;
  let staged = false;
  stack.database.setBeforeExportHook(() => {staged=true;});
  const restoring = stack.backupRestoreService.restore({version:1,timestamp:Date.now(),dataType:'full_system_backup',data:{
    characters:[{fileName:'in-flight.png',card:{name:'restored'}}],presets:[],lorebooks:[],personas:[],chatSessions:[],appSettings:{}}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(staged,false,'restore must wait for an in-flight normal transaction');
  release(); await writer; await restoring;
  assert.equal((await stack.repositories.characters.get('in-flight.png')).card.name,'restored');
  stack.ordinaryConnections.saveSettings({source:'proxy'});
  assert.equal(stack.ordinaryConnections.getSettings().source,'proxy');
}
console.log('U01-U03 guard coverage, discarded result and in-flight write drain: OK');

// Shared Web Locks prevent an exclusive restore from overtaking writers in another
// context; this is a protocol simulation, not browser acceptance.
{
  let shared = 0, exclusive = false;
  const locks = {async request(name, options, callback) {
    assert.equal(options.ifAvailable,true);
    const isShared = options.mode === 'shared';
    if (exclusive || (!isShared && shared)) return callback(null);
    if (isShared) shared++; else exclusive=true;
    try { return await callback({name,mode:options.mode}); }
    finally { if (isShared) shared--; else exclusive=false; }
  }};
  const a=buildProductionWiredStack({webLocks:locks});
  const b=buildProductionWiredStack({webLocks:locks});
  let entered,release;
  const enteredWrite=new Promise(resolve=>{entered=resolve;});
  a.database.setBeforeWriteHook(async()=>{entered();await new Promise(resolve=>{release=resolve;});});
  const write=a.repositories.characters.put({fileName:'test.png',card:{name:'writer'}});
  await enteredWrite;
  assert.equal(shared,1);
  const backup={version:1,timestamp:Date.now(),dataType:'full_system_backup',data:{characters:[],presets:[],lorebooks:[],personas:[],chatSessions:[],appSettings:{}}};
  await assert.rejects(b.backupRestoreService.restore(backup),err=>err.code==='CONCURRENT_RESTORE_IN_PROGRESS');
  release();await write;
  assert.equal(shared,0);
  assert.equal((await b.backupRestoreService.restore(backup)).ok,true);
}
console.log('U03 shared/exclusive Web Locks protocol simulation: OK');
