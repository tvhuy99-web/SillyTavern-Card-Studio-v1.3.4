import assert from 'node:assert/strict';
import { createToastProvider, createSpeechProvider, createCardPopupProvider } from '../src/ui/shell/providers.js';
const jsx=(type,props,key)=>({type,props,key});
const jsxRuntime={jsx,jsxs:jsx};
const makeReact=()=>{
  const state=[],effects=[];
  return {state,effects,useState(initial){const index=state.length;state.push(typeof initial==='function'?initial():initial);return [state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value;}];},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
};
const toastReact=makeReact();
const ToastProvider=createToastProvider(()=>({react:toastReact,jsxRuntime:jsxRuntime,toastContext:{Provider:'toast'},ToastNotification:'notification'}));
const toast=ToastProvider({children:'child'});
toast.props.value.showToast('hello','success');
assert.equal(toastReact.state[0][0].message,'hello');
toast.props.value.dismissToast?.('not-public');
assert.equal(toast.props.children[0],'child');
const speechReact=makeReact();
const saved={tts_voice:'saved',tts_rate:2};
const previousStorage=globalThis.localStorage;
globalThis.localStorage={getItem:()=>JSON.stringify(saved),setItem(){}};
try {
  const SpeechProvider=createSpeechProvider(()=>({react:speechReact,jsxRuntime:jsxRuntime,speechContext:{Provider:'speech'},stopNativeSpeech:()=>{},generateGeminiSpeech:async()=>({}),speakNativeText:()=>{},useToast:()=>({showToast(){}}),speechSettingsKey:'tts',speechDefaults:{tts_provider:'native',tts_native_voice:'default',tts_rate:1,tts_pitch:1}}));
  const speech=SpeechProvider({children:'child'});
  assert.equal(speech.props.value.settings.tts_voice,'saved');
  assert.equal(speech.props.value.settings.tts_provider,'native');
  speech.props.value.addToQueue('hello',undefined,'message-1');
  assert.equal(speechReact.state[1][0].id,'message-1');
  assert.equal(speechReact.state[1][0].voice,'default');
  assert.equal(speechReact.state[1][0].rate,2);
  speech.props.value.toggleAutoPlay();
  assert.equal(speechReact.state[4],true);
} finally { if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage; }
const popupReact=makeReact();
const PopupProvider=createCardPopupProvider(()=>({react:popupReact,jsxRuntime:jsxRuntime,cardPopupContext:{Provider:'popup'},useDialogFocus(){},htmlSanitizer:{sanitize:value=>'safe:'+value}}));
const popup=PopupProvider({children:'child'});
popup.props.value.showPopup('html','title');
assert.deepEqual(popupReact.state,[true,'safe:html','title']);
popup.props.value.closePopup();
assert.deepEqual(popupReact.state,[false,'','title']);
console.log('F01 shell provider local names and context contracts OK');
