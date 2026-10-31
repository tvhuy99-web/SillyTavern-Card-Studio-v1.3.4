// M8: source-owned AI Studio (Android WebView) text-only provider UI.
// This transform deliberately fails if the minified bundle layout changes.
const PATCHES = [
  [
    'Wo={source:"gemini",gemini_model:"gemini-3-flash-preview"',
    'Wo={source:"gemini",aistudio_model:"gemini-2.5-flash",gemini_model:"gemini-3-flash-preview"',
  ],
  [
    'te("gemini","Google Gemini"),te("openrouter","OpenRouter"),te("proxy","Reverse Proxy")',
    'te("gemini","Google Gemini"),te("openrouter","OpenRouter"),te("proxy","Reverse Proxy"),te("aistudio","Tài khoản Google / AI Studio")',
  ],
  [
    '"proxy"===t.source&&(0,wt.jsxs)("div",{className:"space-y-6 "',
    '"aistudio"===t.source&&(0,wt.jsxs)("div",{className:"space-y-4",children:[' +
      '(0,wt.jsx)("p",{className:"text-sm text-amber-300",children:"Dùng phiên Google / AI Studio trong WebView Android (thử nghiệm). Không yêu cầu API key. Google có thể chặn đăng nhập WebView; nội dung và giao diện AI Studio có thể thay đổi."}),' +
      '(0,wt.jsx)("p",{className:"text-xs text-slate-400",children:"Hãy chọn mô hình trực tiếp trên trang AI Studio. Ứng dụng không tự thay đổi model qua API riêng."}),' +
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

export const AI_STUDIO_TEXT_PATCH_COUNT = PATCHES.length + 4;

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
  return code;
}
