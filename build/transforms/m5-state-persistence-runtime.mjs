const M5_IMPORTS = "import { runtimeState as __stsRuntimeState } from './m5/app/state/runtime-state.js?v=1.3.6-m5.1';\nimport { diagnosticsState as __stsDiagnosticsState } from './m5/diagnostics/state.js?v=1.3.6-m5.1';\nimport * as __stsSessionPersistence from './m5/app/persistence/session-state.js?v=1.3.6-m5.1';\nimport * as __stsArenaState from './m5/features/arena/state-machine.js?v=1.3.6-m5.1';\n";

function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error('[M5 state] ' + label + ': pattern not found');
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error('[M5 state] ' + label + ': pattern matched more than once');
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceAllChecked(source, oldText, newText, expected, label) {
  let count = 0;
  let position = 0;
  while ((position = source.indexOf(oldText, position)) >= 0) {
    count += 1;
    position += oldText.length;
  }
  if (count !== expected) throw new Error('[M5 state] ' + label + ': expected ' + expected + ', got ' + count);
  return source.split(oldText).join(newText);
}

function replaceRange(source, startToken, endToken, replacement, label, keepEnd = true) {
  const start = source.indexOf(startToken);
  if (start < 0) throw new Error('[M5 state] ' + label + ': start not found');
  if (source.indexOf(startToken, start + startToken.length) >= 0) throw new Error('[M5 state] ' + label + ': start matched more than once');
  const end = source.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error('[M5 state] ' + label + ': end not found');
  return source.slice(0, start) + replacement + source.slice(keepEnd ? end : end + endToken.length);
}

export function applyM5StateTransform(source) {
  let code = source;

  code = replaceOnce(code, "abortControllers:new Set,", "", "runtime controller store field");
  code = replaceOnce(code,
    "addAbortController:t=>e(e=>{e.abortControllers.add(t)}),removeAbortController:t=>e(e=>{e.abortControllers.delete(t)}),abortAll:()=>e(e=>{e.abortControllers.forEach(e=>e.abort()),e.abortControllers.clear()}),",
    "addAbortController:t=>{__stsRuntimeState.add(t)},removeAbortController:t=>{__stsRuntimeState.remove(t)},abortAll:()=>{__stsRuntimeState.abortAll()},",
    "runtime controller actions");
  code = replaceOnce(code,
    "resetStore:()=>e(e=>{e.abortControllers.forEach(e=>{try{e.abort()}catch{}}),e.abortControllers.clear(),Object.assign(e,il)})",
    "resetStore:()=>e(e=>{__stsRuntimeState.abortAll(\"store-reset\"),Object.assign(e,il)})",
    "runtime reset");
  code = replaceAllChecked(code, "ol.getState().abortControllers.size", "__stsRuntimeState.size()", 3, "runtime size refs");
  code = replaceOnce(code, "t.abortControllers.size>0", "__stsRuntimeState.size()>0", "stop generation runtime size");
  code = replaceOnce(code, "r.abortControllers.size>0", "__stsRuntimeState.size()>0", "arena selection runtime size");

  code = replaceOnce(code,
    "logs:{turns:[],systemLog:[],smartScanLog:[],mythicLog:[],networkLog:[],selectionLog:[]}",
    "logs:__stsDiagnosticsState.snapshot()", "diagnostics initial state");
  code = replaceOnce(code,
    "setSessionData:t=>e(e=>{Object.assign(e,t),t.logs&&(e.logs={turns:Array.isArray(t.logs.turns)?t.logs.turns.slice(0,10):[],systemLog:Array.isArray(t.logs.systemLog)?t.logs.systemLog.slice(0,1):[],smartScanLog:Array.isArray(t.logs.smartScanLog)?t.logs.smartScanLog.slice(0,1):[],mythicLog:Array.isArray(t.logs.mythicLog)?t.logs.mythicLog.slice(0,1):[],networkLog:Array.isArray(t.logs.networkLog)?t.logs.networkLog.slice(0,1).map(Bs):[],selectionLog:Array.isArray(t.logs.selectionLog)?t.logs.selectionLog.slice(0,1):[]})})",
    "setSessionData:t=>e(e=>{Object.assign(e,t),t.logs&&(e.logs=__stsDiagnosticsState.replace(t.logs))})",
    "diagnostics setSessionData");

  const diagnosticReplacements = [
    ["addSystemLog:t=>e(e=>{e.logs.systemLog=[t]})","addSystemLog:t=>e(e=>{e.logs=__stsDiagnosticsState.addSystem(t)})","system log"],
    ["addLogTurn:t=>e(e=>{e.logs.turns.unshift(t),e.logs.turns.length>10&&(e.logs.turns.length=10)})","addLogTurn:t=>e(e=>{e.logs=__stsDiagnosticsState.addTurn(t)})","turn log"],
    ["updateCurrentTurn:t=>e(e=>{e.logs.turns.length>0&&Object.assign(e.logs.turns[0],t)})","updateCurrentTurn:t=>e(e=>{e.logs=__stsDiagnosticsState.updateCurrentTurn(t)})","turn update"],
    ["addSmartScanLog:t=>e(e=>{e.logs.smartScanLog=[t]})","addSmartScanLog:t=>e(e=>{e.logs=__stsDiagnosticsState.addSmartScan(t)})","smart scan log"],
    ["addMythicLog:t=>e(e=>{e.logs.mythicLog=[t]})","addMythicLog:t=>e(e=>{e.logs=__stsDiagnosticsState.addMythic(t)})","mythic log"],
    ["addSelectionLog:t=>e(e=>{e.logs.selectionLog=[t]})","addSelectionLog:t=>e(e=>{e.logs=__stsDiagnosticsState.addSelection(t)})","selection log"],
    ["addNetworkLog:t=>e(e=>{e.logs.networkLog=[Bs(t)]})","addNetworkLog:t=>e(e=>{e.logs=__stsDiagnosticsState.addNetwork(Bs(t))})","network log"],
    ["clearLogs:()=>e(e=>{e.logs={turns:[],systemLog:[],smartScanLog:[],mythicLog:[],networkLog:[],selectionLog:[]}})","clearLogs:()=>e(e=>{e.logs=__stsDiagnosticsState.clear()})","clear logs"],
  ];
  for (const [oldText, newText, label] of diagnosticReplacements) code = replaceOnce(code, oldText, newText, label);

  code = replaceOnce(code,
    'let i=e.status||(!1===e.completed?"pending":/^\\[Lỗi:\\s*/i.test(String(e.content||""))?"error":String(e.content||"").trim()?"success":"stopped"),o="pending"===i,s="success"===i&&!!String(e.content||"").trim();return',
    'let i=__stsArenaState.sideStatus(e),o="pending"===i,s=__stsArenaState.canSelect(e);return',
    "arena renderer status");

  code = replaceRange(code,
    'let arenaSide="A"===n?i.arena.modelA:i.arena.modelB',
    ';e.updateMessage(t,{content:o',
    'let arenaDecision=__stsArenaState.select(i.arena,n);if(!arenaDecision.ok)return void a.logSystemMessage("error","system",\`Arena: Không thể chọn ${n} vì phản hồi chưa hoàn tất hợp lệ.\`);__stsRuntimeState.size()>0&&r.abortAll();let o=arenaDecision.content,s=arenaDecision.name',
    "arena selection", true);

  code = replaceRange(code,
    'let i=ns(),c="A"===t?"modelA":"modelB",arenaSide=',
    'let u=new AbortController;n.addAbortController(u);',
    'let i=ns(),arenaRetry=__stsArenaState.prepareRetry(a.arena,t,i,{modelId:n.arenaModelId,provider:n.arenaProvider,userProfileId:n.arenaUserProfileId}),c=arenaRetry.slot,arenaSide=arenaRetry.side,s=arenaRetry.model,l=arenaRetry.provider,arenaProfileId=arenaRetry.profileId;if(!s)return void o("Không xác định được Model ID để thử lại.","error");n.updateMessage(e,{arena:arenaRetry.arena}),n.setLoading(!0);let u=new AbortController;n.addAbortController(u);',
    "arena retry descriptor", false);

  code = replaceOnce(code,
    'if("proxy"===l&&arenaProfileId){let e=cs().find(e=>e.id===arenaProfileId);if(!e)throw Error(\`Cấu hình Proxy Arena không còn tồn tại: ${arenaProfileId}\`);h={url:e.url,password:e.password,legacyMode:e.legacyMode}}',
    'h=__stsArenaState.resolveProxyConfig(l,arenaProfileId,cs());',
    "arena retry proxy");
  code = replaceOnce(code,
    'let r={...t.arena,[c]:{...t.arena[c],content:v}};n.updateMessage(e,{arena:r})',
    'n.updateMessage(e,{arena:__stsArenaState.withContent(t.arena,c,v)})',
    "arena retry progress");
  code = replaceOnce(code,
    'let t={...w.arena,[c]:{...w.arena[c],content:v,status:u.signal.aborted?"stopped":v.trim()?"success":"error"}};n.updateMessage(e,{arena:t})',
    'n.updateMessage(e,{arena:__stsArenaState.withResult(w.arena,c,v,u.signal)})',
    "arena retry result");
  code = replaceOnce(code,
    'let a=u.signal.aborted||"AbortError"===t?.name||/(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(String(t?.message||""))?{...r.arena,[c]:{...r.arena[c],content:r.arena[c].content||"",status:"stopped"}}:{...r.arena,[c]:{...r.arena[c],content:\`[Lỗi: ${t.message}]\`,status:"error"}};n.updateMessage(e,{arena:a})',
    'let a=__stsArenaState.withError(r.arena,c,t,u.signal,r.arena[c].content||"");n.updateMessage(e,{arena:a})',
    "arena retry error");
  code = replaceOnce(code,
    'let r={...t.arena,[c]:{...t.arena[c],completed:!0}};n.updateMessage(e,{arena:r})',
    'n.updateMessage(e,{arena:__stsArenaState.complete(t.arena,c)})',
    "arena retry complete");

  code = replaceRange(code, 'arenaNormalizeSideOnLoad=e=>', 'lp=e=>', 'lp=e=>', "arena inline normalizers", false);

  code = replaceOnce(code,
    'if(!n)throw Error("Không tìm thấy phiên trò chuyện trong Database.");let r=',
    'if(!n)throw Error("Không tìm thấy phiên trò chuyện trong Database.");let __stsLoaded=__stsSessionPersistence.normalizeLoadedSession(n);n=__stsLoaded.record;let r=',
    "session normalize on load");
  code = replaceRange(code, 'let arenaStateHealed=', 't({sessionId:e',
    'let arenaStateHealed=__stsLoaded.needsRewrite;', "session old arena heal", true);
  code = replaceOnce(code,
    'visualState:(e=>{let t={...e||{}},n={bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"};for(let[e,r]of Object.entries(n))void 0===t[r]&&void 0!==t[e]&&(t[r]=("backgroundImage"===r||"musicUrl"===r||"ambientSoundUrl"===r)&&"off"===t[e]?"":t[e]),delete t[e];return t})(n.visualState)',
    'visualState:n.visualState||{}',
    "session visual normalization");
  code = replaceOnce(code, 'initialDiagnosticLog:n.initialDiagnosticLog||""', 'initialDiagnosticLog:""', "diagnostics not hydrated");
  code = replaceOnce(code,
    'logs:{turns:Array.isArray(n.logs?.turns)?n.logs.turns.slice(0,10):[],systemLog:Array.isArray(n.logs?.systemLog)?n.logs.systemLog.slice(0,1):[],smartScanLog:Array.isArray(n.logs?.smartScanLog)?n.logs.smartScanLog.slice(0,1):[],mythicLog:Array.isArray(n.logs?.mythicLog)?n.logs.mythicLog.slice(0,1):[],networkLog:Array.isArray(n.logs?.networkLog)?n.logs.networkLog.slice(0,1).map(Bs):[],selectionLog:Array.isArray(n.logs?.selectionLog)?n.logs.selectionLog.slice(0,1):[]}',
    'logs:__stsDiagnosticsState.clear()',
    "diagnostics not hydrated from session");

  code = replaceRange(code,
    'let U=(0,b.useCallback)((e={})=>{',
    ',H=(0,b.useCallback)',
    'let U=(0,b.useCallback)((e={})=>__stsSessionPersistence.createSessionSnapshot(ol.getState(),e,{snippet:Is,now:Date.now}),[])',
    "session snapshot owner", true);

  if (!code.startsWith(M5_IMPORTS)) code = M5_IMPORTS + code;
  return code;
}

export const M5_STATE_PATCH_COUNT = 27;
