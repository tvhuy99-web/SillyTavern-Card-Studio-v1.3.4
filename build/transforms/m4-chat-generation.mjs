const M4_IMPORTS = "import { createGenerationGateway as __stsCreateGenerationGateway } from './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1';\nimport { chatTurnPolicy as __stsChatTurnPolicy } from './m4/features/chat/turn-policy.js?v=1.3.6-m4.5';\nimport { createConversationService as __stsCreateConversationService } from './m4/features/chat/conversation-service.js?v=1.3.6-m4.6';\nimport { scanWorldInfo as __stsScanWorldInfo } from './m4/features/world-info/smart-scan-service.js?v=1.3.6-m4.6';\nimport { buildConversationPrompt as __stsBuildConversationPrompt } from './m4/features/prompts/prompt-service.js?v=1.3.6-m4.3';\nimport { processAIResponse as __stsProcessAIResponse } from './m4/features/chat/response-processor.js?v=1.3.6-m4.3';\n";

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
    'addMessage:e.addMessage,updateMessage:e.updateMessage,setMessages:e.setMessages,setSessionData:e.setSessionData,' +
    'turnPolicy:__stsChatTurnPolicy,nextSequence:gh,' +
    'preprocessInput:(t,s)=>s.visualState.disableInteractiveMode?t:gd(t,s.card.extensions?.regex_scripts||[],[1],{isMarkdown:!1,isPrompt:!0,depth:0,...Zu(s.extensionSettings,s.preset),macros:{char:s.card.name,bot:s.card.name,user:s.persona?.name||"User"}}).displayContent,' +
    'scanWorldInfo:i,logSmartScan:a.logSmartScan,logSelection:a.logSelection,' +
    'buildPrompt:sts=>__stsBuildConversationPrompt(sts,{lorebooks:r,buildBaseSections:vd,getSummaryChunkSize:()=>os().summarization_chunk_size||12,buildPromptCore:xd}),' +
    'logPrompt:a.logPrompt,createPlaceholderMessage:n,getConnectionSettings:ns,getProxyProfiles:cs,' +
    'arenaState:__stsArenaState,generationGateway:__stsGenerationGateway,processAIResponse:g,playSound:u,' +
    'logSystemMessage:a.logSystemMessage,runtimeSize:()=>__stsRuntimeState.size()});';
}

function smartScanAdapter() {
  return 'scanInput:(0,b.useCallback)((t,r,a,i,o,s=[],l="",c={},u=[],d=0,h)=>__stsScanWorldInfo({' +
    'scanInput:t,worldInfoState:r,worldInfoRuntime:a,worldInfoPinned:i,preset:o,promptHistory:s,content:l,variables:c,generatedEntries:u,sequence:d,forceActiveUids:h,card:e,setScanning:n' +
    '},{getSettings:as,embed:$c,loadIndex:Lc,getIndex:Fc,cosine:Gc,logSystemMessage:qu,' +
    'onSemanticError:e=>{e.message?.includes("API Key")?window.dispatchEvent(new CustomEvent("toast",{detail:{message:"Vui lòng cấu hình Gemini API Key trong phần Cài đặt để sử dụng Semantic Search.",type:"error"}})):window.dispatchEvent(new CustomEvent("toast",{detail:{message:"Lỗi Semantic Search, chuyển sang quét từ khóa.",type:"error"}}))},' +
    'callSelectionModel:async(e,t)=>{if(Cs()){let o=ns();return Ks(e,o.proxy_tool_model||o.proxy_model||t,o.proxy_protocol)}return(await cl(t,e,{temp:0},_d)).text||"[]"},parseJson:As,resolveWorldInfo:ch}),[e,r])';
}

function responseProcessorAdapter() {
  return 'g=(0,b.useCallback)((n,r,i=!1)=>__stsProcessAIResponse({content:n,messageId:r,forced:i},{' +
    'getState:()=>ol.getState(),processOutput:t,logResponse:a.logResponse,playSound:u,logSystemMessage:a.logSystemMessage,' +
    'parseRpgActions:tl,applyRpgActions:nl,buildGeneratedLorebookEntries:rl,nextSequence:gh,' +
    'setSessionData:e.setSessionData,updateMessage:e.updateMessage,setRpgNotification:e.setRpgNotification,' +
    'setGeneratedLorebookEntries:e.setGeneratedLorebookEntries,runStandaloneMythic:m}),[e,r,a,t,u,m])';
}

export function applyM4ChatGenerationTransform(source) {
  let code = source;
  const legacyHistorySanitizer = 'bd=e=>e?e.replace(/<(thinking|inner_monologue)>[\\s\\S]*?<\\/\\1>/gi,"").replace(/<UpdateVariable(?:variable)?>[\\s\\S]*?<\\/UpdateVariable(?:variable)?>/gi,"").replace(/<LogicStore>[\\s\\S]*?<\\/LogicStore>/gi,"").replace(/<VisualInterface>[\\s\\S]*?<\\/VisualInterface>/gi,"").replace(/<StatusPlaceHolderImpl\\s*\\/?>/gi,"").replace(/\\[CHOICE:[\\s\\S]*?\\]/gi,"").replace(/\`\`\`[\\s\\S]*?\`\`\`/g,"").replace(/<tableThink>[\\s\\S]*?<\\/tableEdit>/gi,"").replace(/\\n\\s*\\n/g,"\\n").trim():""';
  const compactHistorySanitizer = 'bd=e=>{if(!e)return"";let t=String(e),n=t.match(/<content\\b[^>]*>([\\s\\S]*?)<\\/content>/i),r=n?n[1]:t;return r.replace(/<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi,"").replace(/<UpdateVariable(?:variable)?>[\\s\\S]*?<\\/UpdateVariable(?:variable)?>/gi,"").replace(/<LogicStore>[\\s\\S]*?<\\/LogicStore>/gi,"").replace(/<VisualInterface>[\\s\\S]*?<\\/VisualInterface>/gi,"").replace(/<StatusPlaceHolderImpl\\s*\\/?>/gi,"").replace(/\\[CHOICE:[\\s\\S]*?\\]/gi,"").replace(/\`\`\`[\\s\\S]*?\`\`\`/g,"").replace(/<tableThink>[\\s\\S]*?<\\/tableEdit>/gi,"").replace(/<\\/?content\\b[^>]*>/gi,"").replace(/\\n\\s*\\n/g,"\\n").trim()}';
  const sanitizerIndex = findExactlyOnce(code, legacyHistorySanitizer, 'history pipeline sanitizer');
  code = code.slice(0, sanitizerIndex) + compactHistorySanitizer + code.slice(sanitizerIndex + legacyHistorySanitizer.length);
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

  code = replaceRange(
    code,
    'scanInput:(0,b.useCallback)(async(t,r,a,i,o,s=[],l="",c={},u=[],d=0,h)=>{',
    ',processOutput:',
    smartScanAdapter(),
    'smart scan source owner',
    true,
  );

  code = replaceRange(
    code,
    'g=(0,b.useCallback)(async(n,r,i=!1)=>{',
    ',f=(0,b.useCallback)(async(t,n)=>{',
    responseProcessorAdapter(),
    'response processor source owner',
    true,
  );

  const retryPromptStart = 'let h,p=d.filter(e=>e.uid&&o.includes(e.uid)),m={name:"Session Generated",book:{entries:n.generatedLorebookEntries||[]}},g=[...r,m],{baseSections:f}=vd(n.card,n.preset,0,n.persona),y=os().summarization_chunk_size||12,b=await xd(f,i,n.authorNote,n.card,n.longTermSummaries,y,n.variables,n.lastStateBlock,g,n.preset.context_mode||"standard",n.persona?.name||"User",n.worldInfoState,p,n.worldInfoPlacement,n.preset,n.visualState.disableInteractiveMode,n.persona?.description||""),v=""';
  const retryPromptReplacement = 'let h,p=d.filter(e=>e.uid&&o.includes(e.uid)),b=await __stsBuildConversationPrompt({state:n,messages:i,activeEntries:p,generatedEntries:n.generatedLorebookEntries||[]},{lorebooks:r,buildBaseSections:vd,getSummaryChunkSize:()=>os().summarization_chunk_size||12,buildPromptCore:xd}),v=""';
  const retryPromptIndex = findExactlyOnce(code, retryPromptStart, 'arena retry prompt');
  code = code.slice(0, retryPromptIndex) + retryPromptReplacement + code.slice(retryPromptIndex + retryPromptStart.length);

  const sendStartToken = 'return{sendMessage:(0,b.useCallback)(async(t,o)=>{';
  const sendStart = findExactlyOnce(code, sendStartToken, 'sendMessage boundary');
  const sendEnd = code.indexOf(',stopGeneration:p', sendStart);
  if (sendEnd < 0) throw new Error('[M4 chat/generation] sendMessage end token not found');

  const sendAdapter = conversationServiceBootstrap() +
    'return{sendMessage:(0,b.useCallback)((t,o)=>__stsConversationService.send(t,o),[__stsConversationService])';
  code = code.slice(0, sendStart) + sendAdapter + code.slice(sendEnd);

  const plainTextVariableGate = 'g||(i=Xu(i),';
  const plainTextVariableGateIndex = findExactlyOnce(
    code,
    plainTextVariableGate,
    'plain text mode keeps prompt variables',
  );
  code = code.slice(0, plainTextVariableGateIndex) +
    '(i=Xu(i),' +
    code.slice(plainTextVariableGateIndex + plainTextVariableGate.length);

  const plainTextMacroStart = findExactlyOnce(
    code,
    'i=g?i.replace(/{{current_page_history}}/g,Q)',
    'plain text prompt macro branch',
  );
  const normalMacroBranch = code.indexOf(
    ':i.replace(/{{worldInfo_before}}/g,P)',
    plainTextMacroStart,
  );
  if (normalMacroBranch < 0) {
    throw new Error('[M4 chat/generation] normal prompt macro branch not found');
  }
  const macroBranchEnd = code.indexOf(',!g){let e=', normalMacroBranch);
  if (macroBranchEnd < 0) {
    throw new Error('[M4 chat/generation] prompt macro branch end not found');
  }
  const normalMacroExpression = code.slice(normalMacroBranch + 1, macroBranchEnd);
  code = code.slice(0, plainTextMacroStart) +
    'i=' + normalMacroExpression +
    code.slice(macroBranchEnd);

  const runtimeChatMutation =
    'p=(0,b.useCallback)(async e=>{ol.getState().setMessages(e),await(n?.({messages:e}));let t=ol.getState();return Eh(e,t.persona?.name||"User",t.card?.name||"Character",!0)},[n])';
  const runtimeChatMutationReplacement =
    'p=(0,b.useCallback)(async e=>{let r=__stsChatTurnPolicy.compactModelMessages(e,{keepLatest:!0}).messages;ol.getState().setMessages(r),await(n?.({messages:r}));let t=ol.getState();return Eh(r,t.persona?.name||"User",t.card?.name||"Character",!0)},[n])';
  let runtimeIndex = findExactlyOnce(code, runtimeChatMutation, 'card runtime chat mutation boundary');
  code = code.slice(0, runtimeIndex) + runtimeChatMutationReplacement + code.slice(runtimeIndex + runtimeChatMutation.length);

  const runtimeScanHistory =
    '(n.messages||[]).slice(-Math.max(1,Math.trunc(Number(e?.strategy?.scan_depth||e?.scanDepth||2)))).map(e=>e.content).concat(a).join("\\n")';
  const runtimeScanHistoryReplacement =
    '(n.messages||[]).slice(-Math.max(1,Math.trunc(Number(e?.strategy?.scan_depth||e?.scanDepth||2)))).map(e=>__stsChatTurnPolicy.modelContextContent(e)).concat(a).join("\\n")';
  runtimeIndex = findExactlyOnce(code, runtimeScanHistory, 'card runtime world info history');
  code = code.slice(0, runtimeIndex) + runtimeScanHistoryReplacement + code.slice(runtimeIndex + runtimeScanHistory.length);

  const runtimeRawHistory =
    'chat_history:n.messages.map(e=>\`[\${e.role}] \${e.content}\`).join("\\n")';
  const runtimeRawHistoryReplacement =
    'chat_history:n.messages.map(e=>\`[\${e.role}] \${__stsChatTurnPolicy.modelContextContent(e)}\`).join("\\n")';
  runtimeIndex = findExactlyOnce(code, runtimeRawHistory, 'card runtime raw chat history');
  code = code.slice(0, runtimeIndex) + runtimeRawHistoryReplacement + code.slice(runtimeIndex + runtimeRawHistory.length);

  const runtimePromptHistory = 'c=l?n.messages.slice(-l):[];';
  const runtimePromptHistoryReplacement =
    'c=l?n.messages.slice(-l).map(e=>"model"===e.role?{...e,content:__stsChatTurnPolicy.modelContextContent(e)}:e):[];';
  runtimeIndex = findExactlyOnce(code, runtimePromptHistory, 'card runtime generated prompt history');
  code = code.slice(0, runtimeIndex) + runtimePromptHistoryReplacement + code.slice(runtimeIndex + runtimePromptHistory.length);

  if (!code.startsWith(M4_IMPORTS)) code = M4_IMPORTS + code;
  return code;
}

export const M4_CHAT_GENERATION_PATCH_COUNT = 13;
