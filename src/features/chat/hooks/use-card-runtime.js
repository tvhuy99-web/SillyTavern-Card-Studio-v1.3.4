import { useSessionView } from './session-view.js';
import { firstChangedHistoryIndex, invalidateHistorySummaries } from '../history-policy.js';
import { createHostRpcDispatcher, authorizeFrameRpc, createFrameIdentityReader, isFrameMessageOrigin, frameMessageTargetOrigin, postFrameMessage } from '../../../runtime/card-runtime/host/rpc-dispatcher.js';
import { createRuntimeGenerationTasks, createRuntimeGenerationService } from '../../../runtime/card-runtime/host/generation-tasks.js';
import { createStateRpcHandlers } from '../../../runtime/card-runtime/host/state-rpc.js';
import { createChatRpcHandlers } from '../../../runtime/card-runtime/host/chat-rpc.js';
import { createCatalogRpcHandlers } from '../../../runtime/card-runtime/host/catalog-rpc.js';
import { createLorebookRpcHandlers } from '../../../runtime/card-runtime/host/lorebook-rpc.js';
import { createUtilityRpcHandlers } from '../../../runtime/card-runtime/host/utility-rpc.js';
import { createHostMethodRouter } from '../../../runtime/card-runtime/host/method-router.js';
import { createRuntimePromptBuilder } from '../../../runtime/card-runtime/host/runtime-prompt.js';
import { createRuntimeMessageHandler, subscribeRuntimeSession, subscribeRuntimeLorebooks } from '../../../runtime/card-runtime/host/runtime-events.js';

export function useCardRuntime(dependencies, options) {
  return useRuntimeBridge({
    react: dependencies.react, sessionStore: dependencies.sessionStore, lorebookStore: dependencies.lorebookStore, characterStore: dependencies.characterStore,
    personaStore: dependencies.personaStore, presetStore: dependencies.presetStore, runtimeState: dependencies.__stsRuntimeState,
    frames: dependencies.getActiveCardFrames, validatePayload: dependencies.assertPayloadSize, clone: dependencies.cloneRuntimeValue, turnPolicy: dependencies.__stsChatTurnPolicy,
    countTurns: dependencies.countModelMessages, formatHistory: dependencies.toRuntimeMessages, resolveIndex: dependencies.resolveMessageIndex, resolveRange: dependencies.resolveMessageRange, normalizeScope: dependencies.normalizeRuntimeScope,
    variableStorageKey: dependencies.runtimeVariableStorageKey, webStorageKey: dependencies.runtimeWebStorageKey, readRecord: dependencies.readRuntimeRecord, writeRecord: dependencies.writeRuntimeRecord,
    readContext: dependencies.buildRuntimeScope, publish: dependencies.broadcastRuntimeMessage, readText: dependencies.readTextPayload, parseRegex: dependencies.parseRelaxedJson,
    resolvePreset: dependencies.resolveGenerationPreset, baseSections: dependencies.buildBaseSections, buildPrompt: dependencies.assemblePrompt, readContextSettings: dependencies.getSmartContextSettings,
    writeGlobalVariables: dependencies.__stsWriteGlobalVariables, generateOnce: dependencies.generateOnce, stream: dependencies.streamGeneration,
    emit: dependencies.emitRuntimeEvent, maxEntries: dependencies.DEFAULT_RPC_TIMEOUT_MS, parseWorldbook: dependencies.parseLorebookFile, safeName: dependencies.normalizeImportedName,
    toChatMessage: dependencies.toRuntimeMessage, normalizeRole: dependencies.toInternalRole, isRecord: dependencies.isRuntimeRecordObject, findCharacter: dependencies.findCharacter,
    describeCharacter: dependencies.getCharacterSummary, normalizeCharacter: dependencies.normalizeImportedCharacter, mergeSettings: dependencies.applySamplingOverrides,
    sessions: dependencies.__stsRepositories.sessions, listProxyModels: dependencies.fetchProxyModels, gateway: dependencies.__stsGenerationGateway,
    diagnostics: { create: dependencies.createDiagnostic, normalize: dependencies.normalizeDiagnostic, format: dependencies.formatDiagnostic, append: dependencies.appendDiagnostic, code: dependencies.classifyRuntimeError },
  }, options);
}

function useRuntimeBridge(deps, { logSystemMessage, executeSlashCommands, saveSession, changePreset }) {
  const { useMemo, useCallback, useEffect } = deps.react;
  const { sessionStore, lorebookStore, runtimeState } = deps;
  const { quickReplies, setQuickReplies, scriptButtons, setScriptButtons, isInputLocked, setIsInputLocked, isAutoLooping, setIsAutoLooping } = useSessionView(sessionStore);
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
    const patch = {messages:compact,...(changed<0?{}:invalidateHistorySummaries(state,changed,deps.readContextSettings(),deps.countTurns,compact))};
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
