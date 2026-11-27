import { useSessionView } from './session-view.js';
import { summaryChunkSize } from '../history-policy.js';
import { useSessionPersistence } from './use-session-persistence.js';
import { useSmartContext } from './use-smart-context.js';
import { useMessageHistory } from './use-message-history.js';
import { useSlashCommands } from './use-slash-commands.js';
import { useCardRuntime } from './use-card-runtime.js';

const visualAliases = Object.freeze({ bg: 'backgroundImage', music: 'musicUrl', class: 'globalClass', sound: 'ambientSoundUrl' });
function updateSessionVisualState(state, key, value) {
  if (['__proto__', 'constructor', 'prototype'].includes(key)) return;
  const field = Object.hasOwn(visualAliases, key) ? visualAliases[key] : key;
  const next = ['backgroundImage', 'musicUrl', 'ambientSoundUrl'].includes(field) && value === 'off' ? '' : value;
  state.setSessionData({ visualState: { ...state.visualState, [field]: next } });
}

export function createStoryAdvance({ readState, getRevision, sendMessage, saveSession, isSummarizing, expectedSessionId = readState().sessionId, expectedRevision = getRevision() }) {
  return async function advanceStoryChunk() {
    const state = readState();
    const queue = state.storyQueue;
    if (state.sessionId !== expectedSessionId || getRevision() !== expectedRevision || !queue?.length || state.isLoading || isSummarizing()) return;
    const revision = getRevision(), sessionId = state.sessionId;
    const sent = await sendMessage('Tiếp tục...', { forcedContent: queue[0] });
    if (!sent) return;
    const current = readState();
    if (getRevision() !== revision || current.sessionId !== sessionId || current.storyQueue !== queue) return;
    const remaining = queue.slice(1);
    current.setStoryQueue(remaining);
    await saveSession({ storyQueue: remaining });
  };
}

export function createChatSessionHook(dependencies) {
  const { useCallback, useEffect } = dependencies.react;
  return function useChatSession(sessionId) {
    const state = useSessionView(dependencies.sessionStore);
    const diagnostics = dependencies.useDiagnostics();
    dependencies.lorebookStore();
    const { saveSession, changePreset, changePersona } = useSessionPersistence(dependencies, sessionId);
    const conversation = dependencies.useConversation();
    const { sendMessage, stopGeneration, interactiveError, handleUserDecision, manualMythicTrigger, handleArenaSelection, handleArenaRetry } = conversation;
    const { isSummarizing, triggerSmartContext, handleRegenerateSummary, handleRetryFailedTask, queueLength, summaryQueue } = useSmartContext(dependencies);
    const { deleteMessage, deleteOneMessage, deleteLastTurn, editMessage } = useMessageHistory(dependencies, { saveSession, card: state.card, mergedSettings: state.mergedSettings, logSystemMessage: diagnostics.logSystemMessage, isBusy: state.isLoading || isSummarizing });
    const { executeSlashCommands } = useSlashCommands(dependencies, {
      card: state.card, persona: state.persona, saveSession, sendMessage,
      addSystemMessage: content => state.addMessage({ id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, role: 'system', content }),
      logSystemMessage: diagnostics.logSystemMessage,
      updateVisualState: (key, value) => updateSessionVisualState(state, key, value),
      showToast: message => console.log('Toast:', message), showPopup: message => console.log('Popup:', message),
    });
    const { handleScriptButtonClick, isInputLocked, isAutoLooping, setIsAutoLooping, quickReplies, scriptButtons } = useCardRuntime(dependencies, { logSystemMessage: diagnostics.logSystemMessage, executeSlashCommands, saveSession, changePreset });
    const isStoryMode = state.storyQueue && state.storyQueue.length > 0;
    const sessionRevision = dependencies.__stsRuntimeState.getSessionRevision();
    const advanceStoryChunk = useCallback(createStoryAdvance({ readState: () => dependencies.sessionStore.getState(), getRevision: dependencies.__stsRuntimeState.getSessionRevision, sendMessage, saveSession, expectedSessionId: sessionId, expectedRevision: sessionRevision, isSummarizing: () => isSummarizing || dependencies.sessionStore.getState().isSummarizing }), [sessionId, sessionRevision, state.storyQueue, state.isLoading, isSummarizing, sendMessage, saveSession, state.setStoryQueue]);
    useEffect(() => {
      if (state.isLoading || isSummarizing || !state.preset || state.visualState.disableInteractiveMode) return;
      const settings = dependencies.getSmartContextSettings(), depth = settings.context_depth || 24, chunkSize = summaryChunkSize(settings, state);
      const turns = dependencies.countModelMessages(state.messages), summarizedTurns = state.longTermSummaries.length * chunkSize;
      if (Math.max(0, turns - summarizedTurns) >= depth) triggerSmartContext();
    }, [state.messages.length, state.isLoading, isSummarizing, state.preset, state.longTermSummaries.length, triggerSmartContext, state.visualState.disableInteractiveMode]);
    useEffect(() => {
      let timer;
      if (isAutoLooping && !state.isLoading && !isSummarizing && !state.error && isStoryMode) timer = setTimeout(() => { advanceStoryChunk(); }, 1000);
      return () => clearTimeout(timer);
    }, [isAutoLooping, state.isLoading, isSummarizing, state.error, isStoryMode, advanceStoryChunk]);
    const regenerateLastResponse = useCallback(async () => {
      const messages = state.messages;
      if (!messages.length || state.isLoading) return;
      let activeUids, userMessage;
      const last = messages.at(-1);
      if (last.role === 'model') {
        if (last.activeLorebookUids?.length) {
          activeUids = last.activeLorebookUids;
          diagnostics.logSystemMessage('state', 'system', `[Regenerate] Snapshot found! Will reuse ${activeUids.length} active entries (Skip Scan).`);
        }
        if (messages.at(-2)?.role === 'user') userMessage = messages.at(-2);
      } else if (last.role === 'user') userMessage = last;
      if (userMessage?.id && userMessage.content) await sendMessage(userMessage.content, { forceActiveUids: activeUids, beforeTurn: async () => true === await deleteMessage(userMessage.id, { persist: false, allowBusy: true }) });
      else console.warn('Could not find a valid user message to regenerate from.');
    }, [state.messages, state.isLoading, deleteMessage, sendMessage, diagnostics]);
    return {
      ...state, isSummarizing, queueLength, summaryQueue, isInputLocked, isAutoLooping, quickReplies, scriptButtons, interactiveError, isStoryMode,
      sendMessage, regenerateLastResponse, stopGeneration, deleteMessage, deleteOneMessage, deleteLastTurn, editMessage, saveSession, changePreset, changePersona, triggerSmartContext, handleRegenerateSummary, handleRetryFailedTask, handleScriptButtonClick, executeSlashCommands, handleUserDecision, handleRetryMythic: manualMythicTrigger, cancelStoryMode: state.clearStoryQueue, setError: state.setError, handleArenaSelection, handleArenaRetry, setIsAutoLooping,
      updateAuthorNote: value => state.setSessionData({ authorNote: value }), updateWorldInfoState: value => state.setSessionData({ worldInfoState: value }), updateWorldInfoPinned: value => state.setSessionData({ worldInfoPinned: value }), updateWorldInfoPlacement: value => state.setSessionData({ worldInfoPlacement: value }), updateVisualState: (key, value) => updateSessionVisualState(state, key, value), clearLogs: diagnostics.clearLogs, advanceStoryChunk,
    };
  };
}
