const M4_IMPORTS = "import { normalizePromptVariableScopes as __stsNormalizePromptVariableScopes, readGlobalVariables as __stsReadGlobalVariables, writeGlobalVariables as __stsWriteGlobalVariables } from './variable-scope-service-v1.3.6.js?v=1.3.6-variable-scopes-1';\nimport { createGenerationGateway as __stsCreateGenerationGateway } from './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1';\nimport { chatTurnPolicy as __stsChatTurnPolicy } from './m4/features/chat/turn-policy.js?v=1.3.6-m4.5';\nimport { createConversationService as __stsCreateConversationService } from './m4/features/chat/conversation-service.js?v=1.3.6-m4.8';\nimport { liveStreamStore as __stsLiveStreamStore } from './m4/features/chat/live-stream-store.js?v=1.3.6-m4.10';\nimport { createEmbeddingService as __stsCreateEmbeddingService } from './m4/features/world-info/embedding-service.js?v=1.3.6-m4.9';\nimport { scanWorldInfo as __stsScanWorldInfo } from './m4/features/world-info/smart-scan-service.js?v=1.3.6-m4.8';\nimport { buildConversationPrompt as __stsBuildConversationPrompt } from './m4/features/prompts/prompt-service.js?v=1.3.6-m4.3';\nimport { processAIResponse as __stsProcessAIResponse } from './m4/features/chat/response-processor.js?v=1.3.6-m4.3';\n";

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

function replaceOnce(source, oldText, newText, label) {
  const index = findExactlyOnce(source, oldText, label);
  return source.slice(0, index) + newText + source.slice(index + oldText.length);
}

function conversationServiceBootstrap() {
  return 'const __stsConversationService=__stsCreateConversationService({' +
    'getState:()=>ol.getState(),setError:e.setError,setLoading:e.setLoading,startTurn:a.startTurn,' +
    'addAbortController:e.addAbortController,removeAbortController:e.removeAbortController,' +
    'addMessage:e.addMessage,updateMessage:e.updateMessage,setMessages:e.setMessages,setSessionData:e.setSessionData,' +
    'replaceGlobalVariables:e=>{let t=__stsWriteGlobalVariables(e);try{Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{variableScopes:{global:t}}})}catch{}return t},' +
    'turnPolicy:__stsChatTurnPolicy,nextSequence:gh,' +
    'preprocessInput:(t,s)=>s.visualState.disableInteractiveMode?t:gd(t,s.card.extensions?.regex_scripts||[],[1],{isMarkdown:!1,isPrompt:!0,depth:0,...Zu(s.extensionSettings,s.preset),macros:{char:s.card.name,bot:s.card.name,user:s.persona?.name||"User"}}).displayContent,' +
    'scanWorldInfo:i,logSmartScan:a.logSmartScan,logSelection:a.logSelection,' +
    'buildPrompt:sts=>__stsBuildConversationPrompt(sts,{lorebooks:r,buildBaseSections:vd,getSummaryChunkSize:()=>os().summarization_chunk_size||12,buildPromptCore:xd,onTiming:e=>{e.totalMs>=500&&a.logSystemMessage("warn","performance",\`[PERF] Prompt build ${Math.round(e.totalMs)}ms (core ${Math.round(e.coreMs)}ms, ${e.messageCount} messages, ${e.characterCount} chars).\`)}}),' +
    'logPrompt:a.logPrompt,createPlaceholderMessage:n,getConnectionSettings:ns,getProxyProfiles:cs,' +
    'arenaState:__stsArenaState,generationGateway:__stsGenerationGateway,liveStream:__stsLiveStreamStore,processAIResponse:g,playSound:u,' +
    'logSystemMessage:a.logSystemMessage,runtimeSize:()=>__stsRuntimeState.size()});';
}

function smartScanAdapter() {
  return 'scanInput:(0,b.useCallback)(t=>__stsScanWorldInfo({' +
    'scanInput:t?.scanInput??"",worldInfoState:t?.state?.worldInfoState??{},worldInfoRuntime:t?.state?.worldInfoRuntime??{},worldInfoPinned:t?.state?.worldInfoPinned??{},preset:t?.state?.preset??{},promptHistory:t?.promptHistory??[],content:t?.content??"",variables:t?.state?.variables??{},generatedEntries:t?.generatedEntries??[],sequence:t?.sequence??0,forceActiveUids:t?.forceActiveUids,card:t?.state?.card??e,lorebooks:r,setScanning:n' +
    '},{getSettings:as,embed:$c,loadIndex:Lc,getIndex:Fc,cosine:Gc,logSystemMessage:qu,' +
    'onSemanticError:e=>{e.message?.includes("API Key")?window.dispatchEvent(new CustomEvent("toast",{detail:{message:"Vui lòng cấu hình Gemini API Key trong phần Cài đặt để sử dụng Semantic Search.",type:"error"}})):e.message?.includes("chưa được tải")?window.dispatchEvent(new CustomEvent("toast",{detail:{message:e.message,type:"error"}})):window.dispatchEvent(new CustomEvent("toast",{detail:{message:"Lỗi Semantic Search, chuyển sang quét từ khóa.",type:"error"}}))},' +
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
  const compactHistorySanitizer = 'bd=e=>{if(!e)return"";let t=String(e),n=[...t.matchAll(/<content\\b[^>]*>([\\s\\S]*?)<\\/content>/gi)],r=n.length?n.map(e=>e[1]).join("\\n\\n"):t;return r.replace(/<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi,"").replace(/<UpdateVariable(?:variable)?>[\\s\\S]*?<\\/UpdateVariable(?:variable)?>/gi,"").replace(/<LogicStore>[\\s\\S]*?<\\/LogicStore>/gi,"").replace(/<VisualInterface>[\\s\\S]*?<\\/VisualInterface>/gi,"").replace(/<StatusPlaceHolderImpl\\s*\\/?>/gi,"").replace(/\\[CHOICE:[\\s\\S]*?\\]/gi,"").replace(/\`\`\`[\\s\\S]*?\`\`\`/g,"").replace(/<tableThink>[\\s\\S]*?<\\/tableEdit>/gi,"").replace(/<\\/?content\\b[^>]*>/gi,"").replace(/\\n\\s*\\n/g,"\\n").trim()}';
  const sanitizerIndex = findExactlyOnce(code, legacyHistorySanitizer, 'history pipeline sanitizer');
  code = code.slice(0, sanitizerIndex) + compactHistorySanitizer + code.slice(sanitizerIndex + legacyHistorySanitizer.length);

  const legacyTtsPipelineTags = 'thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|UpdateVariable(?:variable)?|LogicStore|VisualInterface';
  const expandedTtsPipelineTags = 'thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan|UpdateVariable(?:variable)?|LogicStore|VisualInterface';
  const ttsPipelineIndex = findExactlyOnce(code, legacyTtsPipelineTags, 'tts internal pipeline tags');
  code = code.slice(0, ttsPipelineIndex) + expandedTtsPipelineTags + code.slice(ttsPipelineIndex + legacyTtsPipelineTags.length);

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


  code = replaceOnce(code,
    'j=async e=>{let t=[];for(let n of e){let e={...o,user:u},a=await fd(n.content,e,r,l);if(a=await yd(a,o,r,l),!a||!a.trim()&&!a.includes("[SYSTEM ERROR"))continue;a=S(a);let i=N.replace(/{{keys}}/g,(n.keys||[]).join(", ")).replace(/{{content}}/g,a.trim());t.push(i)}return t}',
    'j=async e=>{let t=[],__stsWiIndex=0;for(let n of e){let e={...o,user:u},a=await fd(n.content,e,r,l);a=await yd(a,o,r,l);if(a&&(!a.trim()&&!a.includes("[SYSTEM ERROR"))){__stsWiIndex++,0===__stsWiIndex%4&&await new Promise(e=>setTimeout(e,0));continue}if(!a){__stsWiIndex++,0===__stsWiIndex%4&&await new Promise(e=>setTimeout(e,0));continue}a=S(a);let i=N.replace(/{{keys}}/g,(n.keys||[]).join(", ")).replace(/{{content}}/g,a.trim());t.push(i),__stsWiIndex++,0===__stsWiIndex%4&&await new Promise(e=>setTimeout(e,0))}return t}',
    "prompt builder yields World Info entries");



  const legacySmartScanDefaults = 'Jo={enabled:!0,mode:"hybrid_fast",model:"gemini-3-flash-preview",depth:6,max_entries:20,aiStickyDuration:5,system_prompt:"",scan_strategy:"efficient",semantic_threshold:.7,max_semantic_entries:20,embedding_batch_size:30}';
  const embeddingSmartScanDefaults = 'Jo={enabled:!0,mode:"hybrid_fast",model:"gemini-3-flash-preview",depth:6,max_entries:20,aiStickyDuration:5,system_prompt:"",scan_strategy:"efficient",embedding_provider:"gemini",semantic_threshold:.7,max_semantic_entries:20,embedding_batch_size:30}';
  const smartScanDefaultsIndex = findExactlyOnce(code, legacySmartScanDefaults, 'embedding UI/default provider');
  code = code.slice(0, smartScanDefaultsIndex) + embeddingSmartScanDefaults + code.slice(smartScanDefaultsIndex + legacySmartScanDefaults.length);

  const embeddingProviderStatusComponent =
    '__stsEmbeddingProviderStatus=({providerId:e,showToast:t})=>{let[n,r]=(0,b.useState)({status:"checking",progress:0}),a=__stsEmbeddingService.getProviderInfo(e),i="local"===a.kind;' +
    '(0,b.useEffect)(()=>{let t=!1;r({status:"checking",progress:0});__stsEmbeddingService.getProviderStatus(e).then(e=>{t||r(e)}).catch(e=>{t||r({status:"error",progress:0,error:e?.message||String(e)})});return()=>{t=!0}},[e]);' +
    'let o=async()=>{try{r({status:"loading",progress:0}),await __stsEmbeddingService.prepareProvider(e,e=>r({status:"loading",progress:Math.max(0,Math.min(100,Number(e?.progress)||0))})),r(await __stsEmbeddingService.getProviderStatus(e)),t("Mô hình "+a.shortLabel+" đã sẵn sàng.","success")}catch(e){r({status:"error",progress:0,error:e?.message||String(e)}),t("Không thể tải mô hình: "+(e?.message||e),"error")}},' +
    's=async()=>{try{await __stsEmbeddingService.deleteProvider(e),r(await __stsEmbeddingService.getProviderStatus(e)),t("Đã xóa "+a.shortLabel+" khỏi bộ nhớ cục bộ.","info")}catch(e){t("Không thể xóa mô hình: "+(e?.message||e),"error")}};' +
    'if(!i)return(0,wt.jsx)("div",{className:"bg-slate-900/50 border border-slate-700 rounded-lg p-3",children:(0,wt.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,wt.jsxs)("div",{children:[(0,wt.jsx)("div",{className:"text-sm font-bold text-sky-300",children:a.shortLabel}),(0,wt.jsx)("div",{className:"text-xs text-slate-400 mt-1",children:"Online · sử dụng Gemini API đã cấu hình"})]}),(0,wt.jsx)("span",{className:"text-xs font-bold "+("ready"===n.status?"text-emerald-400":"text-amber-400"),children:"ready"===n.status?"Sẵn sàng":"Chưa có API Key"})]})});' +
    'let l="ready"===n.status?"Sẵn sàng":"cached"===n.status?"Đã tải · sẵn sàng":"loading"===n.status?"Đang tải...":"error"===n.status?"Lỗi":"checking"===n.status?"Đang kiểm tra...":"Chưa tải";' +
    'return(0,wt.jsxs)("div",{className:"bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-3",children:[(0,wt.jsxs)("div",{className:"flex items-start justify-between gap-3",children:[(0,wt.jsxs)("div",{children:[(0,wt.jsx)("div",{className:"text-sm font-bold text-sky-300",children:a.shortLabel}),(0,wt.jsxs)("div",{className:"text-xs text-slate-400 mt-1",children:[a.sizeLabel," · lưu trên thiết bị"]})]}),(0,wt.jsx)("span",{className:"text-xs font-bold "+(("ready"===n.status||"cached"===n.status)?"text-emerald-400":"error"===n.status?"text-red-400":"text-amber-400"),children:l})]}),"loading"===n.status&&(0,wt.jsxs)("div",{className:"space-y-1",children:[(0,wt.jsx)("div",{className:"h-2 bg-slate-800 rounded-full overflow-hidden",children:(0,wt.jsx)("div",{className:"h-full bg-sky-500",style:{width:(n.progress||0)+"%"}})}),(0,wt.jsxs)("div",{className:"text-[11px] text-slate-400 text-right",children:[Math.round(n.progress||0),"%"]})]}),n.error&&(0,wt.jsx)("div",{className:"text-xs text-red-400",children:n.error}),(0,wt.jsxs)("div",{className:"flex flex-wrap gap-2",children:[("missing"===n.status||"error"===n.status)&&(0,wt.jsx)("button",{type:"button",onClick:o,className:"px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold",children:"TẢI MÔ HÌNH"}),("cached"===n.status||"ready"===n.status)&&(0,wt.jsx)("button",{type:"button",onClick:s,className:"px-3 py-2 rounded-lg bg-slate-700 hover:bg-red-700 text-slate-200 text-xs font-bold",children:"XÓA MÔ HÌNH"})]})]})},';

  const smartScanUiIndex = findExactlyOnce(code, 'Td=()=>{', 'embedding UI/status component');
  code = code.slice(0, smartScanUiIndex) + embeddingProviderStatusComponent + code.slice(smartScanUiIndex);

  const semanticHeader =
    '(0,wt.jsx)("div",{className:"flex items-center gap-2 mb-2",children:(0,wt.jsx)("span",{className:"text-sky-400 font-bold text-sm uppercase tracking-wide",children:"Cài đặt Ngữ nghĩa (Embedding)"})}),(0,wt.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6"';
  const semanticHeaderWithProvider =
    '(0,wt.jsx)("div",{className:"flex items-center gap-2 mb-2",children:(0,wt.jsx)("span",{className:"text-sky-400 font-bold text-sm uppercase tracking-wide",children:"Cài đặt Ngữ nghĩa (Embedding)"})}),(0,wt.jsx)(Cl,{label:"Mô hình Embedding",value:e.embedding_provider||"gemini",onChange:e=>o("embedding_provider",e.target.value),options:__stsEmbeddingService.listProviders().map(e=>({value:e.id,label:e.label}))}),(0,wt.jsx)(__stsEmbeddingProviderStatus,{providerId:e.embedding_provider||"gemini",showToast:a}),(0,wt.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6"';
  const semanticHeaderIndex = findExactlyOnce(code, semanticHeader, 'embedding UI/provider selector');
  code = code.slice(0, semanticHeaderIndex) + semanticHeaderWithProvider + code.slice(semanticHeaderIndex + semanticHeader.length);

  const batchLabel = 'label:"Số mục đồng bộ mỗi lần (Batch Size)"';
  const batchLabelIndex = findExactlyOnce(code, batchLabel, 'embedding UI/batch label');
  code = code.slice(0, batchLabelIndex) + 'label:"Số mục xử lý mỗi đợt"' + code.slice(batchLabelIndex + batchLabel.length);

  const syncLabel = '(0,wt.jsx)("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider",children:"Semantic Sync"})';
  const syncLabelReplacement = '(0,wt.jsx)("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider",children:["Semantic Sync · ",__stsEmbeddingService.getProviderInfo(as().embedding_provider||"gemini").shortLabel]})';
  const syncLabelIndex = findExactlyOnce(code, syncLabel, 'embedding UI/sync provider label');
  code = code.slice(0, syncLabelIndex) + syncLabelReplacement + code.slice(syncLabelIndex + syncLabel.length);

  const testerTitle = '(0,wt.jsx)("h2",{id:"relevance-tester-title",className:"text-xl font-bold text-sky-400",children:"Relevance Tester (Kiểm tra Ngữ nghĩa)"})';
  const testerTitleReplacement = '(0,wt.jsx)("h2",{id:"relevance-tester-title",className:"text-xl font-bold text-sky-400",children:["Relevance Tester · ",__stsEmbeddingService.getProviderInfo(as().embedding_provider||"gemini").shortLabel]})';
  const testerTitleIndex = findExactlyOnce(code, testerTitle, 'embedding UI/tester provider label');
  code = code.slice(0, testerTitleIndex) + testerTitleReplacement + code.slice(testerTitleIndex + testerTitle.length);

  const legacyEmbeddingCache = 'Lc=async e=>{if(e&&!Pc.has(e)){if(!Mc.has(e)){let t=Kc(e).finally(()=>{Mc.delete(e)});Mc.set(e,t)}return Mc.get(e)}},Fc=e=>{let t=Pc.get(e);if(!t)return[];let n=[];for(let e of t.values())n.push(...e);return n},Bc=';
  const ownedEmbeddingCache = '__stsEmbeddingService=__stsCreateEmbeddingService({getSettings:as,getGeminiApiKey:ys,hasGeminiApiKey:()=>{let e=fs();return!e.useDefault&&Array.isArray(e.keys)&&e.keys.some(e=>String(e).trim())},createGeminiClient:e=>new vo({apiKey:e}),addNetworkLog:e=>ol.getState().addNetworkLog(e)}),Lc=e=>__stsEmbeddingService.loadIndex(e),Fc=e=>__stsEmbeddingService.getIndex(e),Bc=';
  const embeddingCacheIndex = findExactlyOnce(code, legacyEmbeddingCache, 'embedding service/cache adapter');
  code = code.slice(0, embeddingCacheIndex) + ownedEmbeddingCache + code.slice(embeddingCacheIndex + legacyEmbeddingCache.length);

  const legacyQueryEmbedding = '$c=async e=>{let t=ys();if(!t)throw Error("Missing Gemini API Key. Please configure it in settings.");return(await Hc(new vo({apiKey:t}),[e]))[0]||[]},Gc=';
  const ownedQueryEmbedding = '$c=e=>__stsEmbeddingService.embedQuery(e),Gc=';
  const queryEmbeddingIndex = findExactlyOnce(code, legacyQueryEmbedding, 'embedding service/query adapter');
  code = code.slice(0, queryEmbeddingIndex) + ownedQueryEmbedding + code.slice(queryEmbeddingIndex + legacyQueryEmbedding.length);

  const legacySyncStart = 'Vc=async(e,t,n)=>{';
  const legacySyncEnd = '},Kc=';
  const syncStart = findExactlyOnce(code, legacySyncStart, 'embedding service/sync start');
  const syncEnd = code.indexOf(legacySyncEnd, syncStart + legacySyncStart.length);
  if (syncEnd < 0) throw new Error('[M4 chat/generation] embedding service/sync end token not found');
  code = code.slice(0, syncStart) + 'Vc=(e,t,n)=>__stsEmbeddingService.syncIndex(e,t,n),Kc=' + code.slice(syncEnd + legacySyncEnd.length);

  const legacyIndexLoaderStart = 'Kc=async e=>{';
  const legacyIndexLoaderEnd = '},Wc=';
  const indexLoaderStart = findExactlyOnce(code, legacyIndexLoaderStart, 'embedding service/index loader start');
  const indexLoaderEnd = code.indexOf(legacyIndexLoaderEnd, indexLoaderStart + legacyIndexLoaderStart.length);
  if (indexLoaderEnd < 0) throw new Error('[M4 chat/generation] embedding service/index loader end token not found');
  code = code.slice(0, indexLoaderStart) + 'Kc=e=>__stsEmbeddingService.loadIndex(e),Wc=' + code.slice(indexLoaderEnd + legacyIndexLoaderEnd.length);

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
  const retryPromptReplacement =
    'let h,p=d.filter(e=>e.uid&&o.includes(e.uid)),b=await __stsBuildConversationPrompt({state:n,messages:i,activeEntries:p,generatedEntries:n.generatedLorebookEntries||[]},{lorebooks:r,buildBaseSections:vd,getSummaryChunkSize:()=>os().summarization_chunk_size||12,buildPromptCore:xd,onTiming:e=>{e.totalMs>=500&&qu("warn","performance",\`[PERF] Arena retry prompt build ${Math.round(e.totalMs)}ms (core ${Math.round(e.coreMs)}ms, ${e.messageCount} messages, ${e.characterCount} chars).\`)}});' +
    'b?.updatedVariables&&n.setSessionData({variables:b.updatedVariables});' +
    'if(b?.updatedGlobalVariables){let e=__stsWriteGlobalVariables(b.updatedGlobalVariables);try{Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{variableScopes:{global:e}}})}catch{}}' +
    'let v=""';
  const retryPromptIndex = findExactlyOnce(code, retryPromptStart, 'arena retry prompt');
  code = code.slice(0, retryPromptIndex) + retryPromptReplacement + code.slice(retryPromptIndex + retryPromptStart.length);

  const sendStartToken = 'return{sendMessage:(0,b.useCallback)(async(t,o)=>{';
  const sendStart = findExactlyOnce(code, sendStartToken, 'sendMessage boundary');
  const sendEnd = code.indexOf(',stopGeneration:p', sendStart);
  if (sendEnd < 0) throw new Error('[M4 chat/generation] sendMessage end token not found');

  const sendAdapter = conversationServiceBootstrap() +
    'return{sendMessage:(0,b.useCallback)((t,o)=>__stsConversationService.send(t,o),[__stsConversationService])';
  code = code.slice(0, sendStart) + sendAdapter + code.slice(sendEnd);

  const smartStateStart = findExactlyOnce(
    code,
    'F=(e=>{if(!e||0===Object.keys(e).length)return"";let t={};',
    'canonical smart state/start',
  );
  const smartStateEnd = code.indexOf('let z=', smartStateStart);
  if (smartStateEnd < 0) throw new Error('[M4 chat/generation] canonical smart state/end token not found');
  const smartStateReplacement =
    'F=__stsNormalizePromptVariableScopes(o,__stsReadGlobalVariables()),G=(o=F.chat,F.global),B=(F=__stsBuildSmartStateBlock({variables:o,messages:t,card:r,legacyVisualState:s}),F.mythicDatabase),' +
    'U=F.visualState,H="";' +
    'if("integrated"===r.rpg_data?.settings?.executionMode&&r.rpg_data){let e=el(r.rpg_data,h||[]),t=[...R].join("\\n");H=Zs(r.rpg_data.settings.customSystemPrompt||Js,e,"",t)}' +
    'let $=F.smartStateBlock;F=F.logicStore;';
  code = code.slice(0, smartStateStart) + smartStateReplacement + code.slice(smartStateEnd);

  const legacyLastStateMacro = '.replace(/{{last_state}}/g,s)';
  const legacyLastStateAt = findExactlyOnce(code, legacyLastStateMacro, 'legacy last_state macro');
  code = code.slice(0, legacyLastStateAt)
    + '.replace(/{{last_state}}/g,U)'
    + code.slice(legacyLastStateAt + legacyLastStateMacro.length);

  const legacySetGlobalMacro = 'i=i.replace(/{{setglobalvar::([^:]+)::([\\s\\S]*?)}}/gi,(e,t,n)=>{let r=t.trim(),a=n.trim(),i=Number(a),s=""===a||isNaN(i)?a:i;return o=Gu(o,"set","globals."+r,s),""})';
  const setGlobalAt = findExactlyOnce(code, legacySetGlobalMacro, 'global variable macro/set');
  code = code.slice(0, setGlobalAt)
    + 'i=i.replace(/{{setglobalvar::([^:]+)::([\\s\\S]*?)}}/gi,(e,t,n)=>{let r=t.trim(),a=n.trim(),i=Number(a),s=""===a||isNaN(i)?a:i;return G=Gu(G,"set",r,s),""})'
    + code.slice(setGlobalAt + legacySetGlobalMacro.length);

  const legacyGetGlobalMacro = 'i=i.replace(/{{getglobalvar::([^}]+)}}/gi,(e,t)=>{let n=t.trim(),r=Uu(o,"globals."+n);return void 0===r?"":String(r)})';
  const getGlobalAt = findExactlyOnce(code, legacyGetGlobalMacro, 'global variable macro/get');
  code = code.slice(0, getGlobalAt)
    + 'i=i.replace(/{{getglobalvar::([^}]+)}}/gi,(e,t)=>{let n=t.trim(),r=Uu(G,n);return void 0===r?"":String(r)})'
    + code.slice(getGlobalAt + legacyGetGlobalMacro.length);

  const promptResult = 'return{fullPrompt:re.map(e=>e.content).join("\\n\\n").replace(/\\n{3,}/g,"\\n\\n").trim(),structuredPrompt:re,rpgSnapshot:y}';
  const promptResultIndex = findExactlyOnce(code, promptResult, 'prompt result variable persistence');
  code = code.slice(0, promptResultIndex)
    + 'return{fullPrompt:re.map(e=>e.content).join("\\n\\n").replace(/\\n{3,}/g,"\\n\\n").trim(),structuredPrompt:re,rpgSnapshot:y,updatedVariables:o,updatedGlobalVariables:G}'
    + code.slice(promptResultIndex + promptResult.length);

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

  const currentPageHistoryRawBranch =
    'X=V.map(e=>{let t=K(e,W||g),n=Y(e,t),r=g?n:bd(n),a=S(r);';
  const currentPageHistoryStoryOnly =
    'X=V.map(e=>{let t=K(e,W||g),n=Y(e,t),r=bd(n),a=S(r);';
  const currentPageHistoryIndex = findExactlyOnce(
    code,
    currentPageHistoryRawBranch,
    'current page history keeps story content only',
  );
  code = code.slice(0, currentPageHistoryIndex) +
    currentPageHistoryStoryOnly +
    code.slice(currentPageHistoryIndex + currentPageHistoryRawBranch.length);

  const promptRegexUncached =
    'Y=(e,t)=>{if(!W)return t;let n=b.indexOf(e),a=n>=0?Math.max(0,b.length-1-n):void 0,i="user"===e.role?[1]:[2];return gd(t,r.extensions?.regex_scripts||[],i,{engineMode:"official-local",isMarkdown:!1,isPrompt:!0,depth:a,...Zu(void 0,m),macros:J}).displayContent}';
  const promptRegexCached =
    '__stsPromptRegexCache=new WeakMap,Y=(e,t)=>{if(!W)return t;let n=b.indexOf(e),a=n>=0?Math.max(0,b.length-1-n):void 0,i=__stsPromptRegexCache.get(e);if(i&&i.source===t&&i.depth===a)return i.value;let o="user"===e.role?[1]:[2],s=gd(t,r.extensions?.regex_scripts||[],o,{engineMode:"official-local",isMarkdown:!1,isPrompt:!0,depth:a,...Zu(void 0,m),macros:J}).displayContent;return __stsPromptRegexCache.set(e,{source:t,depth:a,value:s}),s}';
  code = replaceOnce(code, promptRegexUncached, promptRegexCached, 'prompt regex per-build cache');

  const promptHistoryBlockingLoop =
    'X=V.map(e=>{let t=K(e,W||g),n=Y(e,t),r=bd(n),a=S(r);return a.trim()?"user"===e.role?\`${u}: ${a}\`:"system"===e.role?\`System: ${a}\`:\`${x}: ${a}\`:null}).filter(Boolean)';
  const promptHistoryCooperativeLoop =
    'X=[];for(let __stsPromptIndex=0;__stsPromptIndex<V.length;__stsPromptIndex++){let e=V[__stsPromptIndex],t=K(e,W||g),n=Y(e,t),r=bd(n),a=S(r),i=a.trim()?"user"===e.role?\`${u}: ${a}\`:"system"===e.role?\`System: ${a}\`:\`${x}: ${a}\`:null;i&&X.push(i),__stsPromptIndex>0&&0===__stsPromptIndex%4&&await new Promise(e=>setTimeout(e,0))}';
  code = replaceOnce(code, promptHistoryBlockingLoop, promptHistoryCooperativeLoop, 'prompt history cooperative scheduling');

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

  const runtimePromptBuild =
    'p=os(),m=await xd(h,c,i.chat_history?.author_note??n.authorNote,d,n.longTermSummaries,p.summarization_chunk_size||10,n.variables,n.lastStateBlock,u,"standard",n.persona?.name||"User",n.worldInfoState,void 0,n.worldInfoPlacement,r,n.visualState.disableInteractiveMode,i.persona_description??n.persona?.description??""),g=t.json_schema?';
  const runtimePromptBuildReplacement =
    'p=os(),m=await xd(h,c,i.chat_history?.author_note??n.authorNote,d,n.longTermSummaries,p.summarization_chunk_size||10,n.variables,n.lastStateBlock,u,"standard",n.persona?.name||"User",n.worldInfoState,void 0,n.worldInfoPlacement,r,n.visualState.disableInteractiveMode,i.persona_description??n.persona?.description??"");' +
    'm?.updatedVariables&&n.setSessionData({variables:m.updatedVariables});' +
    'if(m?.updatedGlobalVariables){let e=__stsWriteGlobalVariables(m.updatedGlobalVariables);try{Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{variableScopes:{global:e}}})}catch{}}' +
    'let g=t.json_schema?';
  runtimeIndex = findExactlyOnce(code, runtimePromptBuild, 'card runtime prompt variable persistence');
  code = code.slice(0, runtimeIndex) + runtimePromptBuildReplacement + code.slice(runtimeIndex + runtimePromptBuild.length);

  if (!code.startsWith(M4_IMPORTS)) code = M4_IMPORTS + code;
  return code;
}

export const M4_CHAT_GENERATION_PATCH_COUNT = 34;
