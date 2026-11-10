// M8: source-owned AI Studio (Android WebView) text-only provider UI.
// This transform deliberately fails if the minified bundle layout changes.
const PATCHES = [
  [
    'Wo={source:"gemini",gemini_model:"gemini-3-flash-preview"',
    'Wo={source:"gemini",aistudio_model:"gemini-2.5-flash",gemini_model:"gemini-3-flash-preview"',
  ],
  [
    '(0,wt.jsxs)("div",{className:"flex gap-4 flex-col sm:flex-row",children:[te("gemini","Google Gemini"),te("openrouter","OpenRouter"),te("proxy","Reverse Proxy")]})',
    '(0,wt.jsxs)("select",{value:t.source,onChange:e=>Y("source",e.target.value),"aria-label":"Nhà cung cấp AI",className:"w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-sky-500 outline-none",children:[' +
      '(0,wt.jsx)("option",{value:"gemini",children:"Google Gemini"}),' +
      '(0,wt.jsx)("option",{value:"openrouter",children:"OpenRouter"}),' +
      '(0,wt.jsx)("option",{value:"proxy",children:"Reverse Proxy"}),' +
      '(0,wt.jsx)("option",{value:"aistudio",children:"Tài khoản Google / AI Studio"})' +
    ']})',
  ],
  [
    '"proxy"===t.source&&(0,wt.jsxs)("div",{className:"space-y-6 "',
    '"aistudio"===t.source&&(0,wt.jsxs)("div",{className:"space-y-4",children:[' +
      '(0,wt.jsxs)("label",{className:"flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/60 p-3 cursor-pointer",children:[' +
        '(0,wt.jsx)("input",{type:"checkbox",defaultChecked:localStorage.getItem("sts_aistudio_show_page")==="true",onChange:async t=>{const n=t.target,o=n.checked;try{const a=window.Capacitor;if(typeof a?.nativePromise!=="function")throw Error("Chỉ hỗ trợ APK Android");await a.nativePromise("AIStudioText","setVisibility",{visible:o});localStorage.setItem("sts_aistudio_show_page",o?"true":"false");}catch(t){n.checked=!o;e("Không đổi được hiển thị AI Studio: "+(t?.message||String(t)),"error")}},className:"h-5 w-5 accent-indigo-500","aria-label":"Hiển thị trang web AI Studio"}),' +
        '(0,wt.jsx)("span",{className:"text-sm text-white font-semibold",children:"Hiển thị trang web AI Studio"})' +
      ']}),' +
      '(0,wt.jsx)("button",{type:"button",onClick:async()=>{try{const n=window.Capacitor;if(typeof n?.nativePromise!=="function")throw Error("Chỉ hỗ trợ APK Android");await n.nativePromise("AIStudioText","openSession",{})}catch(t){e("AI Studio: "+(t?.message||String(t)),"error")}},className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded px-4 py-2",children:"Mở Google / AI Studio để đăng nhập"})' +
    ']}),"proxy"===t.source&&(0,wt.jsxs)("div",{className:"space-y-6 "',
  ],
  [
    'case"openrouter":return e.openrouter_model',
    'case"aistudio":return e.aistudio_model||"gemini-2.5-flash";case"openrouter":return e.openrouter_model',
  ],
  [
    '(0,wt.jsx)("option",{value:"proxy",children:"Proxy"})',
    '(0,wt.jsx)("option",{value:"proxy",children:"Proxy"}),(0,wt.jsx)("option",{value:"aistudio",children:"Google / AI Studio"})',
  ],
  [
    '"gemini"===d.source?d.gemini_model:"proxy"===d.source?d.proxy_model:d.openrouter_model',
    '"aistudio"===d.source?d.aistudio_model||"gemini-2.5-flash":"gemini"===d.source?d.gemini_model:"proxy"===d.source?d.proxy_model:d.openrouter_model',
  ],
  [
    '"gemini"===d.source?n.gemini_model=t:"proxy"===d.source?n.proxy_model=t:"openrouter"===d.source&&(n.openrouter_model=t)',
    '"aistudio"===d.source?n.aistudio_model=t:"gemini"===d.source?n.gemini_model=t:"proxy"===d.source?n.proxy_model=t:"openrouter"===d.source&&(n.openrouter_model=t)',
  ],
];

function replaceExactlyOnce(source, oldText, newText) {
  const start = source.indexOf(oldText);
  if (start < 0 || source.indexOf(oldText, start + oldText.length) >= 0) {
    throw new Error('[AI Studio text UI] expected exactly one match: ' + oldText.slice(0, 80));
  }
  return source.slice(0, start) + newText + source.slice(start + oldText.length);
}

const AI_STUDIO_TOOL_MODEL_PATCHES = [
  [
    "Wo={source:\"gemini\",aistudio_model:\"gemini-2.5-flash\",gemini_model:\"gemini-3-flash-preview\"",
    "Wo={source:\"gemini\",aistudio_model:\"gemini-2.5-flash\",aistudio_tool_model:\"\",gemini_model:\"gemini-3-flash-preview\""
  ],
  [
    "\"aistudio\"===t.source&&(0,wt.jsxs)(\"div\",{className:\"space-y-4\",children:[(0,wt.jsxs)(\"label\"",
    "\"aistudio\"===t.source&&(0,wt.jsxs)(\"div\",{className:\"space-y-4\",children:[(0,wt.jsx)(Ed,{label:\"Tool Model ID\",value:t.aistudio_tool_model||t.aistudio_model||\"gemini-2.5-flash\",onChange:e=>Y(\"aistudio_tool_model\",e),options:[{id:\"gemini-2.5-flash\",name:\"Gemini 2.5 Flash\"},...Vo]}),(0,wt.jsxs)(\"label\""
  ],
  [
    "ms=e=>{localStorage.setItem(Bo,JSON.stringify(e))},gs=()=>",
    "ms=e=>{localStorage.setItem(Bo,JSON.stringify(e))},__stsAiStudioToolText=async(e,t)=>{let n=await __stsGenerationGateway.generateOnce({prompt:e,model:t,source:\"aistudio\"});return String(n?.response?.text||\"\")},gs=()=>"
  ],
  [
    "callSelectionModel:async(e,t)=>{if(Cs()){",
    "callSelectionModel:async(e,t)=>{let n=ns();if(n.source===\"aistudio\")return __stsAiStudioToolText(e,n.aistudio_tool_model||n.aistudio_model||t);if(Cs()){"
  ],
  [
    "let s=ns(),l=\"proxy\"===s.source||Cs(),c=t.settings?.modelId||(l?s.proxy_tool_model||s.proxy_model:i)",
    "let s=ns(),l=\"proxy\"===s.source||Cs(),c=t.settings?.modelId||(\"aistudio\"===s.source?s.aistudio_tool_model||s.aistudio_model||i:l?s.proxy_tool_model||s.proxy_model:i)"
  ],
  [
    "e=l?await Ks(m,c,s.proxy_protocol,0,o):(await new vo({apiKey:n}).models.generateContent",
    "e=\"aistudio\"===s.source?await __stsAiStudioToolText(m,c):l?await Ks(m,c,s.proxy_protocol,0,o):(await new vo({apiKey:n}).models.generateContent"
  ],
  [
    "i=\"\";if(Cs()){let e=ns();i=await Ks(a,e.proxy_tool_model||e.proxy_model||\"gemini-3-flash-preview\",e.proxy_protocol)}else i=(await cl(\"gemini-3-flash-preview\",a,{temp:.3},_d)).text||\"\"",
    "i=\"\";let u=ns();if(u.source===\"aistudio\")i=await __stsAiStudioToolText(a,u.aistudio_tool_model||u.aistudio_model||\"gemini-2.5-flash\");else if(Cs()){let e=ns();i=await Ks(a,e.proxy_tool_model||e.proxy_model||\"gemini-3-flash-preview\",e.proxy_protocol)}else i=(await cl(\"gemini-3-flash-preview\",a,{temp:.3},_d)).text||\"\""
  ],
  [
    "o=\"proxy\"===s.source?await Ks(i,s.proxy_tool_model||s.proxy_model||\"gemini-3-flash-preview\",s.proxy_protocol):(await cl",
    "o=\"aistudio\"===s.source?await __stsAiStudioToolText(i,s.aistudio_tool_model||s.aistudio_model||\"gemini-2.5-flash\"):\"proxy\"===s.source?await Ks(i,s.proxy_tool_model||s.proxy_model||\"gemini-3-flash-preview\",s.proxy_protocol):(await cl"
  ],
  [
    "return r=Cs()||\"proxy\"===a.source?await Ks(n,a.proxy_tool_model||a.proxy_model||\"gemini-3-flash-preview\",a.proxy_protocol):(await cl",
    "return r=\"aistudio\"===a.source?await __stsAiStudioToolText(n,a.aistudio_tool_model||a.aistudio_model||\"gemini-2.5-flash\"):Cs()||\"proxy\"===a.source?await Ks(n,a.proxy_tool_model||a.proxy_model||\"gemini-3-flash-preview\",a.proxy_protocol):(await cl"
  ],
  [
    "if(Cs()){let e=ns();i=await Ks(a,e.proxy_model||e.proxy_tool_model||\"gemini-3.1-pro-preview\",e.proxy_protocol)}else i=(await cl",
    "if(ns().source===\"aistudio\"){let e=ns();i=await __stsAiStudioToolText(a,e.aistudio_tool_model||e.aistudio_model||\"gemini-2.5-flash\")}else if(Cs()){let e=ns();i=await Ks(a,e.proxy_model||e.proxy_tool_model||\"gemini-3.1-pro-preview\",e.proxy_protocol)}else i=(await cl"
  ],
  [
    "if(Cs()){let e=ns();r=await Ks(n,e.proxy_tool_model||e.proxy_model||t,e.proxy_protocol)}else r=(await sl()",
    "if(ns().source===\"aistudio\"){let e=ns();r=await __stsAiStudioToolText(n,e.aistudio_tool_model||e.aistudio_model||t)}else if(Cs()){let e=ns();r=await Ks(n,e.proxy_tool_model||e.proxy_model||t,e.proxy_protocol)}else r=(await sl()"
  ]
];

export const AI_STUDIO_TEXT_PATCH_COUNT = PATCHES.length + 7 + AI_STUDIO_TOOL_MODEL_PATCHES.length;

export function applyAiStudioTextTransform(source) {
  let code = source;
  for (const [oldText, newText] of PATCHES) {
    code = replaceExactlyOnce(code, oldText, newText);
  }

  // Only the SECOND identical model dropdown is the quick connection selector.
  // The first belongs to Arena: leave Arena untouched.
  const oldOption = 'children:[(0,wt.jsx)("option",{value:"",children:"-- Chọn Model --"}),k.map(e=>(0,wt.jsx)("option",{value:e.id,children:e.name},e.id))]';
  const first = code.indexOf(oldOption);
  const second = code.indexOf(oldOption, first + oldOption.length);
  if (first < 0 || second < 0 || code.indexOf(oldOption, second + oldOption.length) !== -1) {
    throw new Error('[AI Studio text UI] model dropdown count changed');
  }
  const newOption = 'children:[(0,wt.jsx)("option",{value:"",children:"-- Chọn Model --"}),("aistudio"===d.source?[{id:d.aistudio_model||"gemini-2.5-flash",name:d.aistudio_model||"gemini-2.5-flash"}]:k).map(e=>(0,wt.jsx)("option",{value:e.id,children:e.name},e.id))]';
  code = code.slice(0, second) + newOption + code.slice(second + oldOption.length);

  // Add an AI Studio filter in System Console without modifying M5's store tokens.
  code = replaceExactlyOnce(
    code,
    '{id:"diagnostic",label:"Chẩn đoán"},{id:"regex"',
    '{id:"diagnostic",label:"Chẩn đoán"},{id:"aistudio",label:"AI Studio"},{id:"regex"',
  );
  code = replaceExactlyOnce(
    code,
    '"diagnostic"===r?t=t.filter(e=>"diagnostic"===e.source):"regex"',
    '"diagnostic"===r?t=t.filter(e=>"diagnostic"===e.source):"aistudio"===r?t=t.filter(e=>"aistudio"===e.source):"regex"',
  );
  code = replaceExactlyOnce(
    code,
    'e.filter(e=>"diagnostic"===e.source).map(e=>e.message.trim())',
    'e.filter(e=>"diagnostic"===e.source||"aistudio"===e.source).map(e=>e.message.trim())',
  );
  // Android System WebView may implement speechSynthesis without
  // SpeechSynthesisUtterance. Missing browser TTS must not produce a global
  // unhandled promise rejection while an AI Studio text request is running.
  code = replaceExactlyOnce(
    code,
    'Bd=()=>{Fd++,typeof window<"u"&&(window.speechSynthesis.speaking||window.speechSynthesis.pending)&&window.speechSynthesis.cancel()}',
    'Bd=()=>{Fd++,typeof window<"u"&&window.speechSynthesis&&(window.speechSynthesis.speaking||window.speechSynthesis.pending)&&window.speechSynthesis.cancel()}',
  );
  code = replaceExactlyOnce(
    code,
    'Ud=(e,t,n=1,r=1,a,i)=>{Bd();let o=++Fd',
    'Ud=(e,t,n=1,r=1,a,i)=>{if(typeof window.SpeechSynthesisUtterance!=="function"||!window.speechSynthesis){console.warn("[TTS] Browser voice unavailable");i&&i();return;}Bd();let o=++Fd',
  );
  code = replaceExactlyOnce(
    code,
    'let e=async()=>{let t=new SpeechSynthesisUtterance("");t.volume=0,window.speechSynthesis.speak(t)',
    'let e=async()=>{if(typeof window.SpeechSynthesisUtterance!=="function"||!window.speechSynthesis){document.removeEventListener("click",e),document.removeEventListener("touchstart",e);return;}let t=new SpeechSynthesisUtterance("");t.volume=0,window.speechSynthesis.speak(t)',
  );
  for (const [oldText, newText] of AI_STUDIO_TOOL_MODEL_PATCHES) {
    code = replaceExactlyOnce(code, oldText, newText);
  }
  return code;
}
