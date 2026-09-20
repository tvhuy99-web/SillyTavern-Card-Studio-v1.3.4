export const ARENA_CANCELLATION_PATCH_VERSION = '1.0.0';

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[Arena cancellation patch] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[Arena cancellation patch] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

export const ARENA_CANCELLATION_REPLACEMENTS = Object.freeze([
  {
    label: 'direct fetch preserves abort semantics',
    oldText: 'if(n??1)try{return console.log(`[Direct Fetch] Connecting directly to API: ${Ms(e)}`),await fetch(e,t)}catch(t){throw console.warn(`[Direct Fetch] Direct connection to ${Ms(e)} failed:`,t),Error(`Kết nối trực tiếp thất bại. Lỗi gốc: ${t.message}. (Gợi ý: Nếu API của bạn chặn CORS hoặc mạng có vấn đề, bạn có thể thử tắt "Tự động Kết nối Trực tiếp" trong Cài đặt API để sử dụng Proxy dự phòng)`)}',
    newText: 'if(n??1)try{return console.log(`[Direct Fetch] Connecting directly to API: ${Ms(e)}`),await fetch(e,t)}catch(r){if(t?.signal?.aborted||"AbortError"===r?.name||/(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(String(r?.message||"")))throw r;throw console.warn(`[Direct Fetch] Direct connection to ${Ms(e)} failed:`,r),Error(`Kết nối trực tiếp thất bại. Lỗi gốc: ${r.message}. (Gợi ý: Nếu API của bạn chặn CORS hoặc mạng có vấn đề, bạn có thể thử tắt "Tự động Kết nối Trực tiếp" trong Cài đặt API để sử dụng Proxy dự phòng)`)}'
  },
  {
    label: 'retry recognizes wrapped abort errors',
    oldText: 'let a=u.signal.aborted||"AbortError"===t?.name?{...r.arena,[c]:{...r.arena[c],content:r.arena[c].content||"",status:"stopped"}}:{...r.arena,[c]:{...r.arena[c],content:`[Lỗi: ${t.message}]`,status:"error"}};',
    newText: 'let a=u.signal.aborted||"AbortError"===t?.name||/(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(String(t?.message||""))?{...r.arena,[c]:{...r.arena[c],content:r.arena[c].content||"",status:"stopped"}}:{...r.arena,[c]:{...r.arena[c],content:`[Lỗi: ${t.message}]`,status:"error"}};'
  },
  {
    label: 'initial Arena gets independent controllers',
    oldText: 'let o=async(t,n,r,a)=>{let i="";try{let o=Cd(_,s.preset,c.signal,t,r,a),l=Date.now();for await(let t of o){if(c.signal.aborted)break;',
    newText: 'let arenaControllerA=new AbortController,arenaControllerB=new AbortController;e.addAbortController(arenaControllerA),e.addAbortController(arenaControllerB);let o=async(t,n,r,a,arenaSignal)=>{let i="";try{let o=Cd(_,s.preset,arenaSignal,t,r,a),l=Date.now();for await(let t of o){if(arenaSignal.aborted)break;'
  },
  {
    label: 'initial Arena status follows side controller',
    oldText: 'content:i,status:c.signal.aborted?"stopped":i.trim()?"success":"error"',
    newText: 'content:i,status:arenaSignal.aborted?"stopped":i.trim()?"success":"error"'
  },
  {
    label: 'initial Arena recognizes wrapped abort errors per side',
    oldText: 'let a=c.signal.aborted||"AbortError"===t?.name?{...r.arena,[n]:{...r.arena[n],content:i,status:"stopped"}}:{...r.arena,[n]:{...r.arena[n],content:`[Lỗi: ${t.message}]`,status:"error"}};',
    newText: 'let a=arenaSignal.aborted||"AbortError"===t?.name||/(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(String(t?.message||""))?{...r.arena,[n]:{...r.arena[n],content:i,status:"stopped"}}:{...r.arena,[n]:{...r.arena[n],content:`[Lỗi: ${t.message}]`,status:"error"}};'
  },
  {
    label: 'initial Arena settles sides independently',
    oldText: 'await Promise.all([o(r,"modelA",arenaMainProvider,arenaMainProxyConfig),o(a,"modelB",i,t)]),u("ai")',
    newText: 'await Promise.allSettled([o(r,"modelA",arenaMainProvider,arenaMainProxyConfig,arenaControllerA.signal),o(a,"modelB",i,t,arenaControllerB.signal)]),e.removeAbortController(arenaControllerA),e.removeAbortController(arenaControllerB),u("ai")'
  },
  {
    label: 'top-level send suppresses abort-like error banners',
    oldText: '}}catch(t){stsSendSucceeded=!1,"Aborted"!==t.message&&(console.error(t),e.setError(`Lỗi: ${t.message}`),a.logSystemMessage("api-error","network",t.message))}finally{e.removeAbortController(c),0===ol.getState().abortControllers.size&&ol.getState().setLoading(!1)}return stsSendSucceeded&&!c.signal.aborted}',
    newText: '}}catch(t){stsSendSucceeded=!1;let stsAbortLike=c.signal.aborted||"AbortError"===t?.name||"Aborted"===t?.message||/(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(String(t?.message||""));stsAbortLike||(console.error(t),e.setError(`Lỗi: ${t.message}`),a.logSystemMessage("api-error","network",t.message))}finally{e.removeAbortController(c),0===ol.getState().abortControllers.size&&ol.getState().setLoading(!1)}return stsSendSucceeded&&!c.signal.aborted}'
  }
]);

export function patchArenaCancellationBundleSource(source) {
  if (typeof source !== 'string' || !source.length) {
    throw new Error('[Arena cancellation patch] bundle source is empty');
  }

  let code = source;
  const applied = [];
  for (const replacement of ARENA_CANCELLATION_REPLACEMENTS) {
    code = replaceExactlyOnce(code, replacement.oldText, replacement.newText, replacement.label);
    applied.push(replacement.label);
  }

  return {
    code,
    report: Object.freeze({
      version: ARENA_CANCELLATION_PATCH_VERSION,
      appliedCount: applied.length,
      applied: Object.freeze(applied.slice())
    })
  };
}
