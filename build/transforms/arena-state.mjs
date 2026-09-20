export const ARENA_STATE_PATCH_VERSION = '1.0.0';

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[Arena state patch] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[Arena state patch] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

export const ARENA_CORE_REPLACEMENTS = Object.freeze([
  {
    label: 'candidate renderer uses explicit status',
    oldText: 'ef=(0,b.memo)(({modelData:e,selection:t,colorClass:n,onSelect:r,onRetry:a})=>{let i=!1===e.completed;return',
    newText: 'ef=(0,b.memo)(({modelData:e,selection:t,colorClass:n,onSelect:r,onRetry:a})=>{let i=e.status||(!1===e.completed?"pending":/^\\[Lỗi:\\s*/i.test(String(e.content||""))?"error":String(e.content||"").trim()?"success":"stopped"),o="pending"===i,s="success"===i&&!!String(e.content||"").trim();return'
  },
  {
    label: 'retry button only disabled while pending',
    oldText: '(0,wt.jsx)("button",{onClick:()=>a(t),disabled:i,className:"p-1 hover:bg-white/10 rounded  disabled:opacity-50",title:"Thử lại model này","aria-label":"Thử lại model này",children:(0,wt.jsx)(kt,{name:"refresh",className:"h-4 w-4"})})',
    newText: '(0,wt.jsx)("button",{onClick:()=>a(t),disabled:o,className:"p-1 hover:bg-white/10 rounded  disabled:opacity-50",title:"Thử lại model này","aria-label":"Thử lại model này",children:(0,wt.jsx)(kt,{name:"refresh",className:"h-4 w-4"})})'
  },
  {
    label: 'streaming indicator follows pending state',
    oldText: 'children:(0,wt.jsx)(Zg,{content:e.content,isStreaming:i})',
    newText: 'children:(0,wt.jsx)(Zg,{content:e.content,isStreaming:o})'
  },
  {
    label: 'selection button requires successful non-empty output',
    oldText: '(0,wt.jsx)("button",{onClick:()=>r(t),disabled:i,className:`w-full py-1.5 rounded text-xs font-bold  active:scale-95 ${n} hover:brightness-110 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`,children:i?"Đang tạo...":"Chọn cái này"})',
    newText: '(0,wt.jsx)("button",{onClick:()=>r(t),disabled:!s,className:`w-full py-1.5 rounded text-xs font-bold  active:scale-95 ${n} hover:brightness-110 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`,children:o?"Đang tạo...":"error"===i?"Không thể chọn — bị lỗi":"stopped"===i?"Đã dừng — thử lại":s?"Chọn cái này":"Không thể chọn — trống"})'
  },
  {
    label: 'candidate memo includes status',
    oldText: 'e.modelData.content===t.modelData.content&&e.modelData.completed===t.modelData.completed&&e.modelData.name===t.modelData.name',
    newText: 'e.modelData.content===t.modelData.content&&e.modelData.completed===t.modelData.completed&&e.modelData.status===t.modelData.status&&e.modelData.name===t.modelData.name'
  },
  {
    label: 'message memo includes both side statuses',
    oldText: 'e.message.arena?.modelA.completed===t.message.arena?.modelA.completed&&e.message.arena?.modelB.completed===t.message.arena?.modelB.completed',
    newText: 'e.message.arena?.modelA.completed===t.message.arena?.modelA.completed&&e.message.arena?.modelA.status===t.message.arena?.modelA.status&&e.message.arena?.modelB.completed===t.message.arena?.modelB.completed&&e.message.arena?.modelB.status===t.message.arena?.modelB.status'
  },
  {
    label: 'selection action enforces success invariant',
    oldText: 'f=(0,b.useCallback)(async(t,n)=>{let r=ol.getState(),i=r.messages.find(e=>e.id===t);if(!i||!i.arena)return;r.abortControllers.size>0&&r.abortAll();let o="A"===n?i.arena.modelA.content:i.arena.modelB.content,s="A"===n?i.arena.modelA.name:i.arena.modelB.name;e.updateMessage',
    newText: 'f=(0,b.useCallback)(async(t,n)=>{let r=ol.getState(),i=r.messages.find(e=>e.id===t);if(!i||!i.arena)return;let arenaSide="A"===n?i.arena.modelA:i.arena.modelB,arenaStatus=arenaSide.status||(!1===arenaSide.completed?"pending":/^\\[Lỗi:\\s*/i.test(String(arenaSide.content||""))?"error":String(arenaSide.content||"").trim()?"success":"stopped");if("success"!==arenaStatus||!String(arenaSide.content||"").trim())return void a.logSystemMessage("error","system",`Arena: Không thể chọn ${n} vì phản hồi chưa hoàn tất hợp lệ.`);r.abortControllers.size>0&&r.abortAll();let o=arenaSide.content,s=arenaSide.name;e.updateMessage'
  },
  {
    label: 'retry uses candidate snapshot and marks pending',
    oldText: 'let i=ns(),s="",l=i.source;if("A"===t?(s="gemini"===i.source?i.gemini_model:"proxy"===i.source?i.proxy_model:i.openrouter_model,l=i.source):(s=n.arenaModelId||"gemini-3-flash-preview",l=n.arenaProvider||"gemini"),!s)return void o("Không xác định được Model ID để thử lại.","error");let c="A"===t?"modelA":"modelB";n.updateMessage(e,{arena:{...a.arena,[c]:{...a.arena[c],content:"",completed:!1}}}),n.setLoading(!0);',
    newText: 'let i=ns(),c="A"===t?"modelA":"modelB",arenaSide=a.arena[c]||{},arenaHasSnapshot=!!(arenaSide.provider&&arenaSide.modelId),s=arenaHasSnapshot?arenaSide.modelId:("A"===t?("gemini"===i.source?i.gemini_model:"proxy"===i.source?i.proxy_model:i.openrouter_model):(n.arenaModelId||"gemini-3-flash-preview")),l=arenaHasSnapshot?arenaSide.provider:("A"===t?i.source:n.arenaProvider||"gemini"),arenaProfileId=Object.prototype.hasOwnProperty.call(arenaSide,"profileId")?arenaSide.profileId:("A"===t&&"proxy"===l?i.proxy_profile_id||null:"B"===t&&"proxy"===l?n.arenaUserProfileId||null:null);if(!s)return void o("Không xác định được Model ID để thử lại.","error");n.updateMessage(e,{arena:{...a.arena,[c]:{...arenaSide,name:s,modelId:s,provider:l,profileId:arenaProfileId,content:"",status:"pending",completed:!1}}}),n.setLoading(!0);'
  },
  {
    label: 'retry resolves stored proxy profile',
    oldText: 'if("proxy"===l&&n.arenaUserProfileId&&"B"===t){let e=cs().find(e=>e.id===n.arenaUserProfileId);e&&(h={url:e.url,password:e.password,legacyMode:e.legacyMode})}',
    newText: 'if("proxy"===l&&arenaProfileId){let e=cs().find(e=>e.id===arenaProfileId);if(!e)throw Error(`Cấu hình Proxy Arena không còn tồn tại: ${arenaProfileId}`);h={url:e.url,password:e.password,legacyMode:e.legacyMode}}'
  },
  {
    label: 'retry final output records status',
    oldText: 'if(w&&w.arena){let t={...w.arena,[c]:{...w.arena[c],content:v}};n.updateMessage(e,{arena:t})}}catch(t){',
    newText: 'if(w&&w.arena){let t={...w.arena,[c]:{...w.arena[c],content:v,status:u.signal.aborted?"stopped":v.trim()?"success":"error"}};n.updateMessage(e,{arena:t})}}catch(t){'
  },
  {
    label: 'retry cancellation is stopped not error',
    oldText: 'if(r&&r.arena){let a={...r.arena,[c]:{...r.arena[c],content:`[Lỗi: ${t.message}]`}};n.updateMessage(e,{arena:a})}}finally',
    newText: 'if(r&&r.arena){let a=u.signal.aborted||"AbortError"===t?.name?{...r.arena,[c]:{...r.arena[c],content:r.arena[c].content||"",status:"stopped"}}:{...r.arena,[c]:{...r.arena[c],content:`[Lỗi: ${t.message}]`,status:"error"}};n.updateMessage(e,{arena:a})}}finally'
  },
  {
    label: 'new Arena turn snapshots both sides',
    oldText: 'w.arena={enabled:!0,modelA:{name:("gemini"===e.source?e.gemini_model:"proxy"===e.source?e.proxy_model:e.openrouter_model)||"Model A",content:"",completed:!1},modelB:{name:s.arenaModelId,content:"",completed:!1},selected:null},w.content=""',
    newText: 'w.arena={enabled:!0,modelA:{name:("gemini"===e.source?e.gemini_model:"proxy"===e.source?e.proxy_model:e.openrouter_model)||"Model A",modelId:("gemini"===e.source?e.gemini_model:"proxy"===e.source?e.proxy_model:e.openrouter_model)||null,provider:e.source,profileId:"proxy"===e.source?e.proxy_profile_id||null:null,content:"",status:"pending",completed:!1},modelB:{name:s.arenaModelId,modelId:s.arenaModelId,provider:s.arenaProvider||"gemini",profileId:"proxy"===(s.arenaProvider||"gemini")?s.arenaUserProfileId||null:null,content:"",status:"pending",completed:!1},selected:null},w.content=""'
  },
  {
    label: 'initial Arena generation uses turn snapshot',
    oldText: 'else if(s.isArenaMode&&s.arenaModelId){let t,n=ns(),r="gemini"===n.source?n.gemini_model:"proxy"===n.source?n.proxy_model:n.openrouter_model,a=s.arenaModelId,i=s.arenaProvider||"gemini";if("proxy"===i&&s.arenaUserProfileId){let e=cs().find(e=>e.id===s.arenaUserProfileId);e&&(t={url:e.url,password:e.password,legacyMode:e.legacyMode})}',
    newText: 'else if(s.isArenaMode&&s.arenaModelId){let t,arenaMain=w.arena?.modelA||{},arenaChallenger=w.arena?.modelB||{},r=arenaMain.modelId||void 0,a=arenaChallenger.modelId||arenaChallenger.name||s.arenaModelId,i=arenaChallenger.provider||s.arenaProvider||"gemini",arenaMainProvider=arenaMain.provider||ns().source,arenaMainProxyConfig;if("proxy"===arenaMainProvider&&arenaMain.profileId){let e=cs().find(e=>e.id===arenaMain.profileId);if(!e)throw Error(`Cấu hình Proxy Arena không còn tồn tại: ${arenaMain.profileId}`);arenaMainProxyConfig={url:e.url,password:e.password,legacyMode:e.legacyMode}}if("proxy"===i&&arenaChallenger.profileId){let e=cs().find(e=>e.id===arenaChallenger.profileId);if(!e)throw Error(`Cấu hình Proxy Arena không còn tồn tại: ${arenaChallenger.profileId}`);t={url:e.url,password:e.password,legacyMode:e.legacyMode}}'
  },
  {
    label: 'initial Arena final output records status',
    oldText: 'if(u&&u.arena){let t={...u.arena,[n]:{...u.arena[n],content:i}};e.updateMessage(w.id,{arena:t})}}catch(t){',
    newText: 'if(u&&u.arena){let t={...u.arena,[n]:{...u.arena[n],content:i,status:c.signal.aborted?"stopped":i.trim()?"success":"error"}};e.updateMessage(w.id,{arena:t})}}catch(t){'
  },
  {
    label: 'initial Arena cancellation is stopped not error',
    oldText: 'if(r&&r.arena){let a={...r.arena,[n]:{...r.arena[n],content:`[Lỗi: ${t.message}]`}};e.updateMessage(w.id,{arena:a})}}finally',
    newText: 'if(r&&r.arena){let a=c.signal.aborted||"AbortError"===t?.name?{...r.arena,[n]:{...r.arena[n],content:i,status:"stopped"}}:{...r.arena,[n]:{...r.arena[n],content:`[Lỗi: ${t.message}]`,status:"error"}};e.updateMessage(w.id,{arena:a})}}finally'
  },
  {
    label: 'initial Arena passes snapshot providers',
    oldText: 'await Promise.all([o(r,"modelA",n.source),o(a,"modelB",i,t)]),u("ai")',
    newText: 'await Promise.all([o(r,"modelA",arenaMainProvider,arenaMainProxyConfig),o(a,"modelB",i,t)]),u("ai")'
  },
  {
    label: 'insert persisted Arena normalizers',
    oldText: '},lp=e=>{let t=ol()',
    newText: '},arenaNormalizeSideOnLoad=e=>{if(!e||"object"!=typeof e)return e;let t=e.status;if("pending"===t||!1===e.completed)t="stopped";else if(!["success","error","stopped"].includes(t))t=/^\\[Lỗi:\\s*/i.test(String(e.content||""))?"error":String(e.content||"").trim()?"success":"stopped";return{...e,modelId:e.modelId||e.name||null,status:t,completed:"pending"!==t}},arenaNormalizeMessagesOnLoad=e=>Array.isArray(e)?e.map(e=>e?.arena?{...e,arena:{...e.arena,modelA:arenaNormalizeSideOnLoad(e.arena.modelA),modelB:arenaNormalizeSideOnLoad(e.arena.modelB)}}:e):[],lp=e=>{let t=ol()'
  },
  {
    label: 'heal Arena messages before store hydration',
    oldText: 'u&&"object"==typeof u&&Array.isArray(u.entries)&&(l.char_book=u),t({sessionId:e',
    newText: 'u&&"object"==typeof u&&Array.isArray(u.entries)&&(l.char_book=u);let arenaStateHealed=(n.chatHistory||[]).some(e=>e?.arena&&["modelA","modelB"].some(t=>{let r=e.arena[t];return!!r&&(!["success","error","stopped"].includes(r.status)||!0!==r.completed||!r.modelId)}));n.chatHistory=arenaNormalizeMessagesOnLoad(n.chatHistory),t({sessionId:e'
  },
  {
    label: 'persist healed Arena state without false preset warning',
    oldText: 'B.current=!0,s&&(await Wt(n),i||P(`Preset cũ không tồn tại. Đã tự động chuyển sang "${o.name}".`,"warning"))',
    newText: 'B.current=!0,(arenaStateHealed||s)&&await Wt(n),s&&(i||P(`Preset cũ không tồn tại. Đã tự động chuyển sang "${o.name}".`,"warning"))'
  }
]);

function rewriteModuleRelativeReferences(source, bundleUrl) {
  const absoluteBase = new URL('.', bundleUrl).href;
  let code = source;
  const viteResolver = 'import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href';
  if (!code.includes(viteResolver)) {
    throw new Error('[Arena state patch] Vite module resolver pattern not found');
  }
  code = code.split(viteResolver).join(`new URL(e,${JSON.stringify(bundleUrl)}).href`);

  code = code.replace(/import\((['"])(\.\/[^'"\\]+)\1\)/g, (_all, _quote, rel) => {
    return `import(${JSON.stringify(new URL(rel, absoluteBase).href)})`;
  });
  code = code.replace(/(\bfrom\s*)(['"])(\.\/[^'"\\]+)\2/g, (_all, prefix, _quote, rel) => {
    return `${prefix}${JSON.stringify(new URL(rel, absoluteBase).href)}`;
  });
  code = code.replace(/import\.meta\.url/g, JSON.stringify(bundleUrl));

  if (/\bimport\.meta\b/.test(code)) {
    throw new Error('[Arena state patch] unresolved import.meta reference remains');
  }
  return code;
}

export function patchArenaBundleSource(source, bundleUrl) {
  if (typeof source !== 'string' || source.length < 1) throw new TypeError('source must be a non-empty string');
  if (!bundleUrl) throw new TypeError('bundleUrl is required');

  let code = source;
  const applied = [];
  for (const spec of ARENA_CORE_REPLACEMENTS) {
    code = replaceExactlyOnce(code, spec.oldText, spec.newText, spec.label);
    applied.push(spec.label);
  }
  code = rewriteModuleRelativeReferences(code, bundleUrl);

  return {
    code,
    report: Object.freeze({
      version: ARENA_STATE_PATCH_VERSION,
      appliedCount: applied.length,
      applied: Object.freeze(applied.slice())
    })
  };
}
