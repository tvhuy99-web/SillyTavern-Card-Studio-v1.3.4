// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRuntimeCompatibilityData(dependencies = {}) {
var applySamplingOverrides=(e,t)=>{let n=JSON.parse(JSON.stringify(t)),r={temperature:"temp",temp:"temp",top_p:"top_p",top_k:"top_k",typical_p:"typical_p",repetition_penalty:"repetition_penalty",frequency_penalty:"frequency_penalty",presence_penalty:"presence_penalty",max_context:"truncation_length",truncation_length:"truncation_length",max_tokens:"max_tokens"};for(let t in r)if(e.hasOwnProperty(t)&&void 0!==e[t]&&null!==e[t]){let a=r[t];a&&(n[a]=e[t])}return n};
var isRecordObject=e=>!!e&&"object"==typeof e&&!Array.isArray(e);
var cloneRuntimeValue=e=>{if("function"==typeof structuredClone)try{return structuredClone(e)}catch{}return void 0===e?e:JSON.parse(JSON.stringify(e))};
var assertPayloadSize=(e,t=2e6)=>{let n=JSON.stringify(e??null);if((new TextEncoder).encode(n).byteLength>t)throw Error(`Card runtime payload exceeds the ${t} byte limit.`)};
var resolveMessageIndex=dependencies.__stsResolveRuntimeMessageIndex;
var resolveMessageRange=(e,t)=>{if(t<=0)return[];if(null==e||""===e)return Array.from({length:t},(e,t)=>t);if("number"==typeof e){let n=resolveMessageIndex(e,t);return n>=0&&n<t?[n]:[]}let n=String(e).replace(/{{\s*lastMessageId\s*}}/gi,String(t-1)).trim(),r=n.match(/^(-?\d+)\s*-\s*(-?\d+)$/);if(!r){let e=resolveMessageIndex(Number(n),t);return Number.isFinite(Number(n))&&e>=0&&e<t?[e]:[]}let a=resolveMessageIndex(Number(r[1]),t),i=resolveMessageIndex(Number(r[2]),t);if(a<0&&i<0)return[];let o=Math.max(0,Math.min(a,i)),s=Math.min(t-1,Math.max(a,i));return o>s?[]:Array.from({length:s-o+1},(e,t)=>o+t)};
var toInternalRole=e=>"assistant"===e?"model":"user"===e?"user":"system";
var toRuntimeMessage=(e,t,n,r,a=!1)=>{let i=(e=>"model"===e?"assistant":e)(e.role),o=e,s={message_id:t,name:o.name||("user"===i?n:"assistant"===i?r:"System"),role:i,is_hidden:!!o.is_hidden,message:String(e.content??""),data:cloneRuntimeValue(e.contextState||{}),extra:cloneRuntimeValue(o.extra||{})};if(a){let e=Array.isArray(o.swipes)&&o.swipes.length?o.swipes.map(String):[s.message];s.swipe_id=Math.max(0,Math.min(e.length-1,Number(o.swipe_id)||0)),s.swipes=e,s.swipes_data=Array.isArray(o.swipes_data)?cloneRuntimeValue(o.swipes_data):e.map(()=>({})),s.swipes_info=Array.isArray(o.swipes_info)?cloneRuntimeValue(o.swipes_info):e.map(()=>({}))}return s};
var toRuntimeMessages=(e,t,n,r=!1)=>e.map((e,a)=>toRuntimeMessage(e,a,t,n,r));
var normalizeRuntimeScope=dependencies.__stsNormalizeRuntimeScope;
var runtimeVariableStorageKey=dependencies.__stsRuntimeVariableStorageKey;
var runtimeWebStorageKey=dependencies.__stsRuntimeWebStorageKey;
var readRuntimeRecord=dependencies.__stsReadRuntimeRecord;
var writeRuntimeRecord=(e,t,n)=>(0, dependencies.__stsWriteRuntimeRecord)(e,t,n,assertPayloadSize);
return { yh: applySamplingOverrides, vh: isRecordObject, xh: cloneRuntimeValue, _h: assertPayloadSize, wh: resolveMessageIndex, kh: resolveMessageRange, Sh: toInternalRole, Ch: toRuntimeMessage, Eh: toRuntimeMessages, Nh: normalizeRuntimeScope, Ah: runtimeVariableStorageKey, Ih: runtimeWebStorageKey, jh: readRuntimeRecord, Dh: writeRuntimeRecord };
}
