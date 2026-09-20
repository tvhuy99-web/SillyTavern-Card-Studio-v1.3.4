export const CORE_RELIABILITY_PATCH_VERSION = '1.0.2';

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[Core reliability patch] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[Core reliability patch] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

export const CORE_RELIABILITY_REPLACEMENTS = Object.freeze([
  {
    label: 'abort active requests before store reset',
    oldText: 'resetStore:()=>e(e=>{Object.assign(e,il),e.abortControllers.clear()})',
    newText: 'resetStore:()=>e(e=>{e.abortControllers.forEach(e=>{try{e.abort()}catch{}}),e.abortControllers.clear(),Object.assign(e,il)})'
  },
  {
    label: 'mark send operation success explicitly',
    oldText: 'e.addMessage(y);try{let t,h=s.generatedLorebookEntries||[]',
    newText: 'e.addMessage(y);let stsSendSucceeded=!0;try{let t,h=s.generatedLorebookEntries||[]'
  },
  {
    label: 'return send success and preserve abort semantics',
    oldText: '}}catch(t){"Aborted"!==t.message&&(console.error(t),e.setError(`Lỗi: ${t.message}`),a.logSystemMessage("api-error","network",t.message))}finally{e.removeAbortController(c),0===ol.getState().abortControllers.size&&ol.getState().setLoading(!1)}}',
    newText: '}}catch(t){stsSendSucceeded=!1,"Aborted"!==t.message&&(console.error(t),e.setError(`Lỗi: ${t.message}`),a.logSystemMessage("api-error","network",t.message))}finally{e.removeAbortController(c),0===ol.getState().abortControllers.size&&ol.getState().setLoading(!1)}return stsSendSucceeded&&!c.signal.aborted}'
  },
  {
    label: 'only dequeue Story Mode chunk after successful processing',
    oldText: 'P=(0,b.useCallback)(async()=>{if(!t.storyQueue||0===t.storyQueue.length||t.isLoading||g)return;let e=t.storyQueue[0],n=t.storyQueue.slice(1);await s("Tiếp tục...",{forcedContent:e}),t.setStoryQueue(n),await a({storyQueue:n})}',
    newText: 'P=(0,b.useCallback)(async()=>{if(!t.storyQueue||0===t.storyQueue.length||t.isLoading||g)return;let e=t.storyQueue[0],n=t.storyQueue.slice(1),r=await s("Tiếp tục...",{forcedContent:e});if(!r)return;t.setStoryQueue(n),await a({storyQueue:n})}'
  },
  {
    label: 'canonicalize visual-state keys',
    oldText: 'updateWorldInfoPlacement:e=>t.setSessionData({worldInfoPlacement:e}),updateVisualState:(e,n)=>t.setSessionData({visualState:{...t.visualState,[e]:n}}),clearLogs:n.clearLogs',
    newText: 'updateWorldInfoPlacement:e=>t.setSessionData({worldInfoPlacement:e}),updateVisualState:(e,n)=>{let r={bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"}[e]||e,a=("backgroundImage"===r||"musicUrl"===r||"ambientSoundUrl"===r)&&"off"===n?"":n;t.setSessionData({visualState:{...t.visualState,[r]:a}})},clearLogs:n.clearLogs'
  },
  {
    label: 'canonicalize slash-command visual-state keys',
    oldText: 'logSystemMessage:n.logSystemMessage,updateVisualState:(e,n)=>t.setSessionData({visualState:{...t.visualState,[e]:n}}),showToast:e=>console.log("Toast:",e),showPopup:e=>console.log("Popup:",e)',
    newText: 'logSystemMessage:n.logSystemMessage,updateVisualState:(e,n)=>{let r={bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"}[e]||e,a=("backgroundImage"===r||"musicUrl"===r||"ambientSoundUrl"===r)&&"off"===n?"":n;t.setSessionData({visualState:{...t.visualState,[r]:a}})},showToast:e=>console.log("Toast:",e),showPopup:e=>console.log("Popup:",e)'
  },
  {
    label: 'migrate legacy visual-state aliases on session load',
    oldText: 'visualState:n.visualState||{}',
    newText: 'visualState:(e=>{let t={...e||{}},n={bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"};for(let[e,r]of Object.entries(n))void 0===t[r]&&void 0!==t[e]&&(t[r]=("backgroundImage"===r||"musicUrl"===r||"ambientSoundUrl"===r)&&"off"===t[e]?"":t[e]),delete t[e];return t})(n.visualState)'
  },
  {
    label: 'apply Card Runtime visual-state messages directly',
    oldText: 'else"SET_VISUAL_STATE"===n&&r&&window.dispatchEvent(new CustomEvent("sillytavern:visual-state",{detail:r}))',
    newText: 'else if("SET_VISUAL_STATE"===n&&r){let e=ol.getState(),t={...e.visualState},a={bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"};Object.entries("object"==typeof r?r:{}).forEach(([e,n])=>{let r=a[e]||e;t[r]="off"===n&&("backgroundImage"===r||"musicUrl"===r||"ambientSoundUrl"===r)?"":n}),e.setSessionData({visualState:t}),window.dispatchEvent(new CustomEvent("sillytavern:visual-state",{detail:t}))}'
  },
  {
    label: 'block edit while generation or summarization is busy',
    oldText: 'm=(0,b.useCallback)(async(t,n)=>{let r=ol.getState(),a=r.messages,o=a.findIndex(e=>e.id===t);if(-1===o)return;let s=[...a]',
    newText: 'm=(0,b.useCallback)(async(t,n)=>{let r=ol.getState();if(r.isLoading||r.isSummarizing)return!1;let a=r.messages,o=a.findIndex(e=>e.id===t);if(-1===o)return!1;let s=[...a]'
  },
  {
    label: 'return edit persistence result',
    oldText: 's[o]=l,i(s),await e({messages:s})},[e,i]);return{deleteMessage:h',
    newText: 's[o]=l,i(s),await e({messages:s});return!0},[e,i]);return{deleteMessage:h'
  },
  {
    label: 'await edit before closing editor',
    oldText: 'onSaveEdit:()=>{r.editingMessageId&&(n.editMessage(r.editingMessageId,r.editingContent),r.cancelEditing())}',
    newText: 'onSaveEdit:async()=>{if(r.editingMessageId){let e=await n.editMessage(r.editingMessageId,r.editingContent);!1!==e&&r.cancelEditing()}}'
  },
  {
    label: 'await Co-pilot rewrite persistence',
    oldText: 't?(s(t.id,e.data.content),m("Đã viết lại phản hồi mới nhất.","success")):m("Không tìm thấy tin nhắn nào của AI để viết lại.","warning")',
    newText: 't?(!1===await s(t.id,e.data.content)?m("Hệ thống đang bận; chưa viết lại phản hồi.","warning"):m("Đã viết lại phản hồi mới nhất.","success")):m("Không tìm thấy tin nhắn nào của AI để viết lại.","warning")'
  },
  {
    label: 'implement raw Tavern Regex import',
    oldText: 'case"raw.import.regex":return!0;case"chat.reload":',
    newText: 'case"raw.import.regex":{if(!o.card)throw Error("No character is loaded.");let e=As(await Vh(i.content)),t=Array.isArray(e)?e:Array.isArray(e?.regex_scripts)?e.regex_scripts:Array.isArray(e?.extensions?.regex_scripts)?e.extensions.regex_scripts:e&&"object"==typeof e?[e]:[];if(!t.length)throw Error("Regex import did not contain any scripts.");t=xh(t.slice(0,1e3));let r={...o.card.extensions||{},regex_scripts:t},a={...o.card,extensions:r},s={...o.extensionSettings,__cardRuntimeCardExtensions:r};return o.setSessionData({card:a,extensionSettings:s}),await(n?.({extensionSettings:s})),{ok:!0,regexes:t}}case"chat.reload":'
  },
  {
    label: 'recompute merged settings after active preset replacement',
    oldText: 'o.preset?.name===e&&o.setSessionData({preset:a,mergedSettings:a})',
    newText: 'o.preset?.name===e&&o.setSessionData({preset:a,mergedSettings:o.card?yh(o.card,a):a})'
  },
  {
    label: 'recompute merged settings after active character replacement',
    oldText: '(o.card?.name===e.card.name||o.card?.fileName===e.fileName)&&(o.setSessionData({card:{...t,fileName:e.fileName}}),await(n?.()))',
    newText: '(o.card?.name===e.card.name||o.card?.fileName===e.fileName)&&(o.setSessionData({card:{...t,fileName:e.fileName},mergedSettings:o.preset?yh({...t,fileName:e.fileName},o.preset):o.mergedSettings}),await(n?.()))'
  },
  {
    label: 'recompute merged settings after character selection',
    oldText: 'case"character.select":{let e=zh(i.id??i.name);return!!e&&(kc.getState().setActiveCharacterFileName(e.fileName),o.setSessionData({card:{...xh(e.card),fileName:e.fileName}}),!0)}',
    newText: 'case"character.select":{let e=zh(i.id??i.name);if(!e)return!1;let t={...xh(e.card),fileName:e.fileName};return kc.getState().setActiveCharacterFileName(e.fileName),o.setSessionData({card:t,mergedSettings:o.preset?yh(t,o.preset):o.mergedSettings}),!0}'
  },
  {
    label: 'refresh RPG live-link entries after import',
    oldText: 'd?(0,wt.jsx)($f,{database:e,onImport:e=>{if(!o)return;let t={...o,rpg_data:e};s({card:t})}}):u?',
    newText: 'd?(0,wt.jsx)($f,{database:e,onImport:e=>{if(!o)return;let t={...o,rpg_data:e},n=rl(e);s({card:t,generatedLorebookEntries:n})}}):u?'
  },
  {
    label: 'await RPG table clipboard write before success toast',
    oldText: 'onClick:t=>{t.stopPropagation(),(e=>{try{let t=JSON.stringify(e,null,2);navigator.clipboard.writeText(t),c(`Đã sao chép bảng "${e.config.name}" vào clipboard.`,"success")}catch{c("Lỗi sao chép bảng.","error")}})(e)}',
    newText: 'onClick:async t=>{t.stopPropagation();try{let t=JSON.stringify(e,null,2);if(!navigator.clipboard?.writeText)throw Error("Clipboard API unavailable");await navigator.clipboard.writeText(t),c(`Đã sao chép bảng "${e.config.name}" vào clipboard.`,"success")}catch{c("Lỗi sao chép bảng.","error")}}'
  }
]);

export function patchCoreReliabilityBundleSource(source) {
  if (typeof source !== 'string' || !source.length) {
    throw new Error('[Core reliability patch] bundle source is empty');
  }

  let code = source;
  const applied = [];
  for (const replacement of CORE_RELIABILITY_REPLACEMENTS) {
    code = replaceExactlyOnce(code, replacement.oldText, replacement.newText, replacement.label);
    applied.push(replacement.label);
  }

  return {
    code,
    report: Object.freeze({
      version: CORE_RELIABILITY_PATCH_VERSION,
      appliedCount: applied.length,
      applied: Object.freeze(applied.slice())
    })
  };
}
