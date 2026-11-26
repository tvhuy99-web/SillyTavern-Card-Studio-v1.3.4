// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRuntimeCompatibilityData(dependencies = {}) {
var yh=(e,t)=>{let n=JSON.parse(JSON.stringify(t)),r={temperature:"temp",temp:"temp",top_p:"top_p",top_k:"top_k",typical_p:"typical_p",repetition_penalty:"repetition_penalty",frequency_penalty:"frequency_penalty",presence_penalty:"presence_penalty",max_context:"truncation_length",truncation_length:"truncation_length",max_tokens:"max_tokens"};for(let t in r)if(e.hasOwnProperty(t)&&void 0!==e[t]&&null!==e[t]){let a=r[t];a&&(n[a]=e[t])}return n};
var vh=e=>!!e&&"object"==typeof e&&!Array.isArray(e);
var xh=e=>{if("function"==typeof structuredClone)try{return structuredClone(e)}catch{}return void 0===e?e:JSON.parse(JSON.stringify(e))};
var _h=(e,t=2e6)=>{let n=JSON.stringify(e??null);if((new TextEncoder).encode(n).byteLength>t)throw Error(`Card runtime payload exceeds the ${t} byte limit.`)};
var wh=dependencies.__stsResolveRuntimeMessageIndex;
var kh=(e,t)=>{if(t<=0)return[];if(null==e||""===e)return Array.from({length:t},(e,t)=>t);if("number"==typeof e){let n=wh(e,t);return n>=0&&n<t?[n]:[]}let n=String(e).replace(/{{\s*lastMessageId\s*}}/gi,String(t-1)).trim(),r=n.match(/^(-?\d+)\s*-\s*(-?\d+)$/);if(!r){let e=wh(Number(n),t);return Number.isFinite(Number(n))&&e>=0&&e<t?[e]:[]}let a=wh(Number(r[1]),t),i=wh(Number(r[2]),t);if(a<0&&i<0)return[];let o=Math.max(0,Math.min(a,i)),s=Math.min(t-1,Math.max(a,i));return o>s?[]:Array.from({length:s-o+1},(e,t)=>o+t)};
var Sh=e=>"assistant"===e?"model":"user"===e?"user":"system";
var Ch=(e,t,n,r,a=!1)=>{let i=(e=>"model"===e?"assistant":e)(e.role),o=e,s={message_id:t,name:o.name||("user"===i?n:"assistant"===i?r:"System"),role:i,is_hidden:!!o.is_hidden,message:String(e.content??""),data:xh(e.contextState||{}),extra:xh(o.extra||{})};if(a){let e=Array.isArray(o.swipes)&&o.swipes.length?o.swipes.map(String):[s.message];s.swipe_id=Math.max(0,Math.min(e.length-1,Number(o.swipe_id)||0)),s.swipes=e,s.swipes_data=Array.isArray(o.swipes_data)?xh(o.swipes_data):e.map(()=>({})),s.swipes_info=Array.isArray(o.swipes_info)?xh(o.swipes_info):e.map(()=>({}))}return s};
var Eh=(e,t,n,r=!1)=>e.map((e,a)=>Ch(e,a,t,n,r));
var Nh=dependencies.__stsNormalizeRuntimeScope;
var Ah=dependencies.__stsRuntimeVariableStorageKey;
var Ih=dependencies.__stsRuntimeWebStorageKey;
var jh=dependencies.__stsReadRuntimeRecord;
var Dh=(e,t,n)=>(0, dependencies.__stsWriteRuntimeRecord)(e,t,n,_h);
return { yh, vh, xh, _h, wh, kh, Sh, Ch, Eh, Nh, Ah, Ih, jh, Dh };
}
