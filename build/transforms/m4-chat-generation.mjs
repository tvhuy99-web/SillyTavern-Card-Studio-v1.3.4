const M4_IMPORTS = "import { createGenerationGateway as __stsCreateGenerationGateway } from './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1';\nimport { chatTurnPolicy as __stsChatTurnPolicy } from './m4/features/chat/turn-policy.js?v=1.3.6-m4.1';\nimport { createConversationService as __stsCreateConversationService } from './m4/features/chat/conversation-service.js?v=1.3.6-m4.2';\n";

function findExactlyOnce(source, token, label, from = 0) {
  const first = source.indexOf(token, from);
  if (first < 0) throw new Error('[M4 chat/generation] ' + label + ': token not found');
  const second = source.indexOf(token, first + token.length);
  if (second >= 0) throw new Error('[M4 chat/generation] ' + label + ': token matched more than once');
  return first;
}

function replaceRange(source, startToken, endToken, replacement, label, keepEnd = true) {
  const start = findExactlyOnce(source, startToken, label + '/start');
  const end = source.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error('[M4 chat/generation] ' + label + ': end token not found');
  return source.slice(0, start) + replacement + source.slice(keepEnd ? end : end + endToken.length);
}

function conversationServiceBootstrap() {
  return 'const __stsConversationService=__stsCreateConversationService({' +
    'getState:()=>ol.getState(),setError:e.setError,setLoading:e.setLoading,startTurn:a.startTurn,' +
    'addAbortController:e.addAbortController,removeAbortController:e.removeAbortController,' +
    'addMessage:e.addMessage,updateMessage:e.updateMessage,setSessionData:e.setSessionData,' +
    'turnPolicy:__stsChatTurnPolicy,nextSequence:gh,' +
    'preprocessInput:(t,s)=>s.visualState.disableInteractiveMode?t:gd(t,s.card.extensions?.regex_scripts||[],[1],{isMarkdown:!1,isPrompt:!0,depth:0,...Zu(s.extensionSettings,s.preset),macros:{char:s.card.name,bot:s.card.name,user:s.persona?.name||"User"}}).displayContent,' +
    'scanWorldInfo:sts=>i(sts.scanInput,sts.state.worldInfoState,sts.state.worldInfoRuntime,sts.state.worldInfoPinned,sts.state.preset,sts.promptHistory,sts.content,sts.state.variables,sts.generatedEntries,sts.sequence,sts.forceActiveUids),' +
    'logSmartScan:a.logSmartScan,logSelection:a.logSelection,' +
    'buildPrompt:async sts=>{let stsSessionBook={name:"Session Generated",book:{entries:sts.generatedEntries}},stsLorebooks=[...r,stsSessionBook],{baseSections:stsBaseSections}=vd(sts.state.card,sts.state.preset,0,sts.state.persona),stsChunkSize=os().summarization_chunk_size||12;return xd(stsBaseSections,[...sts.state.messages,sts.userMessage],sts.state.authorNote,sts.state.card,sts.state.longTermSummaries,stsChunkSize,sts.state.variables,sts.state.lastStateBlock,stsLorebooks,sts.state.preset.context_mode||"standard",sts.state.persona?.name||"User",sts.state.worldInfoState,sts.activeEntries,sts.state.worldInfoPlacement,sts.state.preset,sts.state.visualState.disableInteractiveMode,sts.state.persona?.description||"")},' +
    'logPrompt:a.logPrompt,createPlaceholderMessage:n,getConnectionSettings:ns,getProxyProfiles:cs,' +
    'arenaState:__stsArenaState,generationGateway:__stsGenerationGateway,processAIResponse:g,playSound:u,' +
    'logSystemMessage:a.logSystemMessage,runtimeSize:()=>__stsRuntimeState.size()});';
}

export function applyM4ChatGenerationTransform(source) {
  let code = source;
  code = replaceRange(code, ',Vs=async(', ',Ks=async(', '', 'remove legacy proxy chat generator');

  const generationBootstrap =
    'const __stsGenerationGateway=__stsCreateGenerationGateway({' +
    'getConnectionSettings:ns,request:Hs,addNetworkLog:e=>ol.getState().addNetworkLog(e),' +
    'getOpenRouterHeaders:Du,readResponseError:Ou,normalizeProxyUrl:qs,' +
    'getProxyUrl:ws,getProxyPassword:ks,getProxyLegacyMode:Ss,' +
    'geminiGenerateOnce:cl,createGeminiClient:sl,buildGeminiRequest:ll,safetySettings:kd});' +
    'async function Sd(e,t,n,r,a,i){return __stsGenerationGateway.generateOnce({prompt:e,preset:t,model:n,source:r,proxyConfig:a,signal:i})}' +
    'async function*Cd(e,t,n,r,a,i){yield* __stsGenerationGateway.stream({prompt:e,preset:t,signal:n,model:r,source:a,proxyConfig:i})}';

  const generationStart = findExactlyOnce(code, 'async function Sd(', 'generation gateway/start');
  const generationEnd = code.indexOf('}var Ed=', generationStart);
  if (generationEnd < 0) throw new Error('[M4 chat/generation] generation gateway/end token not found');
  code = code.slice(0, generationStart) + generationBootstrap + code.slice(generationEnd + 1);

  const sendStartToken = 'return{sendMessage:(0,b.useCallback)(async(t,o)=>{';
  const sendStart = findExactlyOnce(code, sendStartToken, 'sendMessage boundary');
  const sendEnd = code.indexOf(',stopGeneration:p', sendStart);
  if (sendEnd < 0) throw new Error('[M4 chat/generation] sendMessage end token not found');

  const sendAdapter = conversationServiceBootstrap() +
    'return{sendMessage:(0,b.useCallback)((t,o)=>__stsConversationService.send(t,o),[__stsConversationService])';
  code = code.slice(0, sendStart) + sendAdapter + code.slice(sendEnd);

  if (!code.startsWith(M4_IMPORTS)) code = M4_IMPORTS + code;
  return code;
}

export const M4_CHAT_GENERATION_PATCH_COUNT = 3;
