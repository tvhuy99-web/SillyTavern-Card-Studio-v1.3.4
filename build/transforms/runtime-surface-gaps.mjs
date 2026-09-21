function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[runtime surface gaps] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[runtime surface gaps] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

const PATCHES = [
  {
    label: 'gemini-nonstream-abort-signal',
    oldText: 'cl=async(e,t,n,r=[],a)=>{let i=sl(),o=ll(t,n,r),s=e||o.model;',
    newText: 'cl=async(e,t,n,r=[],a)=>{let i=sl(),o=ll(t,n,r);a&&(o.config={...o.config,abortSignal:a});let s=e||o.model;',
  },
  {
    label: 'custom-model-list',
    oldText: 'case"generation.models":return[Qh()];',
    newText: 'case"generation.models":{let e=i.custom_api||{};return e.apiurl?await Ws(String(e.apiurl),String(e.key||""),!1):[Qh()]}',
  },
  {
    label: 'message-refresh-rpc',
    oldText: 'case"chat.reload":return Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{chatHistory:Eh(o.messages,s,l,!0)}}),!0;',
    newText: 'case"chat.refresh":return o.setMessages(o.messages.slice()),Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{chatHistory:Eh(o.messages,s,l,!0)}}),!0;case"chat.reload":return Wh({type:"CARD_RUNTIME_STATE_UPDATE",payload:{chatHistory:Eh(o.messages,s,l,!0)}}),!0;',
  },
  {
    label: 'visual-state-legacy-payload',
    oldText: 'Object.entries("object"==typeof r?r:{}).forEach',
    newText: 'Object.entries("object"==typeof r&&r&&"type"in r&&"value"in r?{[r.type]:r.value}:"object"==typeof r?r:{}).forEach',
  },
];

export const RUNTIME_SURFACE_GAP_PATCH_COUNT = PATCHES.length;

export function applyRuntimeSurfaceGapsTransform(source) {
  let code = source;
  for (const patch of PATCHES) {
    code = replaceExactlyOnce(code, patch.oldText, patch.newText, patch.label);
  }
  return code;
}
