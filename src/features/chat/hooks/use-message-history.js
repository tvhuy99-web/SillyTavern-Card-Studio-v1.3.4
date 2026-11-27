import { buildRewindPatch, invalidateHistorySummaries } from '../history-policy.js';

export function useMessageHistory(dependencies, {saveSession, logSystemMessage: log}) {
  const { useCallback } = dependencies.react;
  const readState = () => dependencies.sessionStore.getState();
  const busy = (state, options = {}) => state.isSummarizing || (state.isLoading && !options.allowBusy);
  const deleteMessage = useCallback(async (id, options = {}) => {
    const state = readState();
    if (busy(state,options)) { log('error','system','Cannot delete message: System is busy (Loading or Summarizing).'); return false; }
    const index = state.messages.findIndex(message => message.id === id);
    if (index < 0) { log('error','system',`Cannot delete message: Message ID ${id} not found.`); return false; }
    const revision = dependencies.__stsRuntimeState.getSessionRevision();
    try {
      const original = dependencies.characterStore.getState().characters.find(item => item.fileName === state.card?.fileName)?.card;
      const patch = buildRewindPatch(state,index,{initialVariables:card => dependencies.__stsMergeInitialVariableSources({},card?.char_book?.entries||[],String(card?.first_mes||''),text=>dependencies.relaxedJson.default.parse(text)).variables,initialRpg:original?.rpg_data,buildLorebook:dependencies.buildLinkedLorebookEntries,countTurns:dependencies.countModelMessages,settings:dependencies.getSmartContextSettings()});
      state.setSessionData(patch);
      if (options.persist !== false) await saveSession({...patch,rpgState:patch.card?.rpg_data});
      if (revision === dependencies.__stsRuntimeState.getSessionRevision() && readState().sessionId === state.sessionId) log('interaction','system',`Rewound chat to before message index ${index}.`);
      return true;
    } catch (error) {
      if (revision === dependencies.__stsRuntimeState.getSessionRevision()) log('error','system',`Failed to rewind chat: ${error}`);
      return false;
    }
  },[saveSession,log]);
  const deleteLastTurn = useCallback(async () => {
    const messages = readState().messages;
    if (!messages.length) return;
    const last = messages.at(-1), previous = messages.at(-2);
    return deleteMessage(last.role === 'model' && previous?.role === 'user' ? previous.id : last.id);
  },[deleteMessage]);
  const editMessage = useCallback(async (id, content) => {
    const state = readState();
    if (busy(state)) return false;
    const index = state.messages.findIndex(message => message.id === id);
    if (index < 0) return false;
    const messages = [...state.messages], message = {...messages[index],content};
    if (dependencies.readCardRuntimeEngineMode() === 'official-local') {
      const result = dependencies.processRegex(content,state.card?.extensions?.regex_scripts||[],[2],{engineMode:'official-local',isMarkdown:true,isPrompt:false,isEdit:true,depth:Math.max(0,messages.length-1-index),...dependencies.extractRegexScripts(state.extensionSettings,state.preset),macros:{char:state.card?.name||'Character',bot:state.card?.name||'Character',user:state.persona?.name||'User'}});
      message.content=result.displayContent; message.originalRawContent=content; message.interactiveHtml=result.interactiveHtml||undefined; message.interactiveHtmlBlocks=result.interactiveHtmlBlocks?.length?result.interactiveHtmlBlocks:undefined;
    } else { delete message.interactiveHtml; delete message.interactiveHtmlBlocks; delete message.originalRawContent; }
    messages[index] = message;
    const patch = {messages,...invalidateHistorySummaries(state,index,dependencies.getSmartContextSettings(),dependencies.countModelMessages)};
    state.setSessionData(patch); await saveSession(patch); return true;
  },[saveSession]);
  const deleteOneMessage = useCallback(async id => {
    const state = readState();
    if (busy(state)) { log('error','system','Cannot delete message: System is busy.'); return false; }
    const index = state.messages.findIndex(message=>message.id===id);
    if (index < 0) return false;
    const revision = dependencies.__stsRuntimeState.getSessionRevision();
    const patch = {messages:state.messages.filter(message=>message.id!==id),...invalidateHistorySummaries(state,index,dependencies.getSmartContextSettings(),dependencies.countModelMessages)};
    state.setSessionData(patch); await saveSession(patch);
    if (revision===dependencies.__stsRuntimeState.getSessionRevision()) log('interaction','system',`Deleted single message: ${id}`);
    return true;
  },[saveSession,log]);
  return {deleteMessage,deleteLastTurn,editMessage,deleteOneMessage};
}
