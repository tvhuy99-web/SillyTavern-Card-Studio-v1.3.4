import { firstChangedHistoryIndex, invalidateHistorySummaries } from '../history-policy.js';
import { createHostRpcDispatcher, authorizeFrameRpc, createFrameIdentityReader, isFrameMessageOrigin, frameMessageTargetOrigin, postFrameMessage } from '../../../../m4/runtime/card-runtime/host/rpc-dispatcher.js';
import { createRuntimeGenerationTasks, createRuntimeGenerationService } from '../../../../m4/runtime/card-runtime/host/generation-tasks.js';
import { createStateRpcHandlers } from '../../../../m4/runtime/card-runtime/host/state-rpc.js';
import { createChatRpcHandlers } from '../../../../m4/runtime/card-runtime/host/chat-rpc.js';
import { createCatalogRpcHandlers } from '../../../../m4/runtime/card-runtime/host/catalog-rpc.js';
import { createLorebookRpcHandlers } from '../../../../m4/runtime/card-runtime/host/lorebook-rpc.js';
import { createUtilityRpcHandlers } from '../../../../m4/runtime/card-runtime/host/utility-rpc.js';
import { createHostMethodRouter } from '../../../runtime/card-runtime/host/method-router.js';
import { createRuntimePromptBuilder } from '../../../runtime/card-runtime/host/runtime-prompt.js';
import { createRuntimeMessageHandler, subscribeRuntimeSession, subscribeRuntimeLorebooks } from '../../../runtime/card-runtime/host/runtime-events.js';

/** Compatibility adapter. Only this boundary knows recovered binding names. */
export function useCardRuntime(dependencies, options) {
  const d = dependencies;
  return useRuntimeBridge({
    react: d.b, sessionStore: d.ol, lorebookStore: d.sn, characterStore: d.kc,
    personaStore: d.Au, presetStore: d.bu, runtimeState: d.__stsRuntimeState,
    frames: d.Kh, validatePayload: d._h, clone: d.xh, turnPolicy: d.__stsChatTurnPolicy,
    countTurns: d.gh, formatHistory: d.Eh, resolveIndex: d.wh, resolveRange: d.kh, normalizeScope: d.Nh,
    variableStorageKey: d.Ah, webStorageKey: d.Ih, readRecord: d.jh, writeRecord: d.Dh,
    readContext: d.Xh, publish: d.Wh, readText: d.Vh, parseRegex: d.As,
    resolvePreset: d.Zh, baseSections: d.vd, buildPrompt: d.xd, readContextSettings: d.os,
    writeGlobalVariables: d.__stsWriteGlobalVariables, generateOnce: d.Sd, stream: d.Cd,
    emit: d.Jh, maxEntries: d.Hh, parseWorldbook: d.Lt, safeName: d.$h,
    toChatMessage: d.Ch, normalizeRole: d.Sh, isRecord: d.vh, findCharacter: d.zh,
    describeCharacter: d.Gh, normalizeCharacter: d.qh, mergeSettings: d.yh,
    sessions: d.__stsRepositories.sessions, listProxyModels: d.Ws, gateway: d.__stsGenerationGateway,
    diagnostics: { create: d.Lh, normalize: d.Fh, format: d.Bh, append: d.Uh, code: d.Yh },
  }, options);
}

/** React owns subscriptions and stable callbacks; domain modules own behavior. */
function useRuntimeBridge(deps, { logSystemMessage, executeSlashCommands, saveSession, changePreset }) {
  const { useMemo, useCallback, useEffect } = deps.react;
  const { sessionStore, lorebookStore, runtimeState } = deps;
  const { quickReplies, setQuickReplies, scriptButtons, setScriptButtons, isInputLocked, setIsInputLocked, isAutoLooping, setIsAutoLooping } = sessionStore();
  const readState = () => sessionStore.getState();
  const findFrame = source => deps.frames().find(frame => frame.contentWindow === source);
  const isActiveSource = (source, event) => {
    const frame = findFrame(source);
    return !!frame && (!event || isFrameMessageOrigin(frame, event.origin, window.location.origin));
  };
  const getFrameIdentity = useMemo(() => createFrameIdentityReader(findFrame), []);
  const tasks = useMemo(() => createRuntimeGenerationTasks({ register: runtimeState.add, unregister: runtimeState.remove }), []);
  const dispatcher = useMemo(() => createHostRpcDispatcher({ isActiveSource, getFrameIdentity, targetOriginForSource: source => frameMessageTargetOrigin(findFrame(source), window.location.origin), authorize: (request, source) => authorizeFrameRpc(request, findFrame(source), readState()), getSessionRevision: runtimeState.getSessionRevision, getSessionId: () => readState().sessionId, validatePayload: deps.validatePayload, clone: deps.clone, onTransportError: error => console.error('[card runtime] RPC transport', error) }), []);
  const persistMessages = useCallback(async messages => {
    const compact = deps.turnPolicy.compactModelMessages(messages, { keepLatest: true }).messages;
    const state = readState();
    const changed = firstChangedHistoryIndex(state.messages,messages);
    const patch = {messages:compact,...(changed<0?{}:invalidateHistorySummaries(state,changed,deps.readContextSettings(),deps.countTurns))};
    state.setSessionData(patch);
    await saveSession?.(patch);
    return deps.formatHistory(compact, state.persona?.name || 'User', state.card?.name || 'Character', true);
  }, [saveSession]);
  const stateRpc = useMemo(() => createStateRpcHandlers({ readState, saveSession, persistMessages, resolveIndex: deps.resolveIndex, normalizeScope: deps.normalizeScope, variableStorageKey: deps.variableStorageKey, webStorageKey: deps.webStorageKey, readRecord: deps.readRecord, writeRecord: deps.writeRecord, readContext: deps.readContext, getStorage: scope => scope === 'session' ? window.sessionStorage : window.localStorage, validatePayload: deps.validatePayload, clone: deps.clone, publish: deps.publish, parseRegexImport: async content => deps.parseRegex(await deps.readText(content)) }), [persistMessages, saveSession]);
  const saveExtensionSettings = stateRpc.saveExtensionSettings;
  const buildRuntimePrompt = useMemo(() => createRuntimePromptBuilder({ readState, readLorebooks: () => lorebookStore.getState().lorebooks, resolvePreset: deps.resolvePreset, turnPolicy: deps.turnPolicy, baseSections: deps.baseSections, buildPrompt: deps.buildPrompt, readContextSettings: deps.readContextSettings, writeGlobalVariables: deps.writeGlobalVariables, publish: deps.publish }), []);
  const generate = useMemo(() => createRuntimeGenerationService({ tasks, buildPrompt: (raw, options, assertCurrent, source) => buildRuntimePrompt(raw, options, assertCurrent, {allowGlobalWrites: findFrame(source)?.hasAttribute('sandbox') === false}), resolvePreset: deps.resolvePreset, generateOnce: ({ prompt, preset, model, source, proxyConfig, signal }) => deps.generateOnce(prompt, preset, model, source, proxyConfig, signal), stream: ({ prompt, preset, model, source, proxyConfig, signal }) => deps.stream(prompt, preset, signal, model, source, proxyConfig), emit: deps.emit, readMessageCount: () => readState().messages.length }), [buildRuntimePrompt, tasks]);
  const lorebookRpc = useMemo(() => createLorebookRpcHandlers({ readState, lorebooks: () => lorebookStore.getState(), saveSession, resolveRange: deps.resolveRange, validatePayload: deps.validatePayload, clone: deps.clone, publish: deps.publish, maxEntries: deps.maxEntries, importWorldbook: async input => {
    const text = await deps.readText(input.content);
    const name = /\.json$/i.test(String(input.name || '')) ? String(input.name) : `${deps.safeName(input.name, 'Imported Worldbook')}.json`;
    return deps.parseWorldbook(new File([text], name, { type: 'application/json' }));
  } }), [saveSession]);
  const chatRpc = useMemo(() => createChatRpcHandlers({ readState, persistMessages, resolveIndex: deps.resolveIndex, resolveRange: deps.resolveRange, toChatMessage: deps.toChatMessage, normalizeRole: deps.normalizeRole, isRecord: deps.isRecord, clone: deps.clone, saveSession, saveExtensionSettings, formatHistory: deps.formatHistory, safeName: deps.safeName, publish: deps.publish }), [persistMessages, saveSession, saveExtensionSettings]);
  const catalogRpc = useMemo(() => createCatalogRpcHandlers({ readState, characters: () => deps.characterStore.getState(), personas: () => deps.personaStore.getState(), presets: () => deps.presetStore.getState(), findCharacter: deps.findCharacter, describeCharacter: deps.describeCharacter, normalizeCharacter: deps.normalizeCharacter, safeName: deps.safeName, mergeSettings: deps.mergeSettings, clone: deps.clone, saveSession, uuid: () => crypto.randomUUID() }), [saveSession]);
  const utilityRpc = useMemo(() => createUtilityRpcHandlers({ readState, characters: () => deps.characterStore.getState(), presets: () => deps.presetStore.getState(), personas: () => deps.personaStore.getState(), describeCharacter: deps.describeCharacter, readText: deps.readText, safeName: deps.safeName, clone: deps.clone, sessions: deps.sessions, slash: executeSlashCommands, loadPreset: changePreset, listProxyModels: deps.listProxyModels, currentModel: () => deps.gateway.getCurrentModel() }), [changePreset, executeSlashCommands]);
  const execute = useMemo(() => createHostMethodRouter({ chat: chatRpc, catalog: catalogRpc, state: stateRpc.dispatch, lorebook: lorebookRpc, utility: utilityRpc, generate, tasks, emit: deps.emit }), [chatRpc, catalogRpc, stateRpc, lorebookRpc, utilityRpc, generate, tasks]);
  useEffect(() => {
    const listener = createRuntimeMessageHandler({ isActiveSource, dispatcher, execute, readState, persistMessages, setScriptButtons, setInputLocked: setIsInputLocked, log: logSystemMessage, diagnostics: deps.diagnostics, validatePayload: deps.validatePayload });
    const onMessage = event => { void listener(event).catch(error => console.error('[card runtime] message handler failed', error)); };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [execute, logSystemMessage, persistMessages, setIsInputLocked, setScriptButtons, dispatcher]);
  useEffect(() => subscribeRuntimeSession({ store: sessionStore, publish: deps.publish, clone: deps.clone, formatHistory: deps.formatHistory }), []);
  useEffect(() => subscribeRuntimeLorebooks({ store: lorebookStore, readState, publish: deps.publish }), []);
  useEffect(() => { const timer=setInterval(dispatcher.sweep,1000); return () => { clearInterval(timer); dispatcher.cancelAll(); tasks.dispose(); }; }, [dispatcher,tasks]);
  const handleScriptButtonClick = useCallback(button => {
    deps.frames().forEach(frame => postFrameMessage(frame, { type: 'EXECUTE_BUTTON_SCRIPT', payload: { scriptId: button.scriptId, buttonName: button.label } }));
    logSystemMessage('interaction', 'system', `Clicked Script Button: ${button.label}`);
  }, [logSystemMessage]);
  return { quickReplies, setQuickReplies, scriptButtons, setScriptButtons, isInputLocked, setIsInputLocked, isAutoLooping, setIsAutoLooping, handleScriptButtonClick };
}
