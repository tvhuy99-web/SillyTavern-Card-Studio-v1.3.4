import { postFrameMessage } from './rpc-dispatcher.js';
// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRuntimeContextAdapters(dependencies = {}) {
var Hh=5e3;
var $h=(e,t)=>String(e??"").trim().slice(0,300)||t;
var Gh=e=>{let t=dependencies.kc.getState(),n=t.characters.find(t=>t.fileName===e);return n?{fileName:n.fileName,name:n.card.name,avatar:n.avatarUrl||n.fileName,avatarUrl:n.avatarUrl,card:(0, dependencies.xh)(n.card),current:n.fileName===t.activeCharacterFileName}:null};
var zh=e=>{let t=dependencies.kc.getState(),n=String(e??""),r=Number(n);return t.characters.find((e,t)=>e.fileName===n||e.card.name===n||Number.isInteger(r)&&r===t)};
var qh=(e,t)=>{let n=(0, dependencies.xh)(t?.raw||t?.data||t||{}),r=Array.isArray(t?.first_messages)?t.first_messages.map(String):[];return (0, dependencies.gc)({...n,name:$h(e??n.name,"Imported Character"),description:t?.description??n.description??"",personality:t?.personality??n.personality??"",scenario:t?.scenario??n.scenario??"",mes_example:t?.mes_example??n.mes_example??"",first_mes:r[0]??n.first_mes??"",alternate_greetings:r.length>1?r.slice(1):n.alternate_greetings,creator:t?.creator??n.creator,creator_notes:t?.creator_notes??n.creator_notes??n.creatorcomment,character_version:t?.version??n.character_version,extensions:t?.extensions??n.extensions})};
var Vh=async e=>e instanceof Blob?e.text():e instanceof ArrayBuffer||ArrayBuffer.isView(e)?(new TextDecoder).decode(e):String(e??"");
var Kh=()=>Array.from(document.querySelectorAll('iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"]'));
var Wh=e=>{Kh().forEach(frame=>postFrameMessage(frame,e))};
var Jh=(e,t,n=[])=>{postFrameMessage(Kh().find(frame=>frame.contentWindow===e),{type:"CARD_RUNTIME_EVENT",eventName:t,args:n})};
var Yh=e=>/Unsupported card runtime method|unavailable in the isolated card runtime/i.test(e)?"CARD_RUNTIME_RPC_UNSUPPORTED":/payload exceeds|oversized/i.test(e)?"CARD_RUNTIME_PAYLOAD_TOO_LARGE":/storage|quota/i.test(e)?"CARD_RUNTIME_STORAGE_FAILED":/timeout|timed out/i.test(e)?"CARD_RUNTIME_RPC_TIMEOUT":"CARD_RUNTIME_RPC_FAILED";
var Xh=e=>{let t=dependencies.ol.getState();return{chatId:t.sessionId||"current-chat",characterId:t.card?.fileName||t.card?.name||"current-character",presetName:t.preset?.name||"default",messageId:e}};
var Zh=e=>{let t=dependencies.ol.getState();if(!t.preset)throw Error("No generation preset is loaded.");let n=String(e.preset_name||"in_use"),r="in_use"===n?t.preset:dependencies.bu.getState().presets.find(e=>e.name===n);if(!r)throw Error(`Generation preset not found: ${n}`);let a=(0, dependencies.xh)(r),i=e.custom_api||{};return[["max_tokens","max_tokens"],["temperature","temp"],["frequency_penalty","frequency_penalty"],["presence_penalty","presence_penalty"],["top_p","top_p"],["top_k","top_k"]].forEach(([e,t])=>{let n=i[e];void 0!==n&&"same_as_preset"!==n&&"unset"!==n&&Number.isFinite(Number(n))&&(a[t]=Number(n))}),a};
return { Hh, $h, Gh, zh, qh, Vh, Kh, Wh, Jh, Yh, Xh, Zh };
}
