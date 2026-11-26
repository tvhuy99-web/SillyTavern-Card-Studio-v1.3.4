import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAiStudioTextProvider } from '../src/providers/aistudio/text.js';

const native = ['AiStudioTextPlugin.java','AiStudioDiagnostics.java','AiStudioWebViewController.java','AiStudioSessionController.java','AiStudioThinkingController.java','AiStudioGenerationController.java','AiStudioResponsePoller.java'].map(f => fs.readFileSync(new URL('../android-native/' + f, import.meta.url), 'utf8')).join('\n');
const panel = fs.readFileSync(new URL('../android-native/AiStudioPanel.java', import.meta.url), 'utf8');
const completion = fs.readFileSync(new URL('../android-native/AiStudioCompletionPolicy.java', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/features/chat/conversation-service.js', import.meta.url), 'utf8');

assert.match(native,/NEW_CHAT_NAVIGATE/);
assert.match(native,/sessionWebView\.loadUrl\(URL\)/);
assert.match(native,/NEW_CHAT_CONFIRMED/);
assert.match(native,/oldModelTurns/);
assert.match(native,/AI_STUDIO_NEW_CHAT_NOT_EMPTY/);

// Google login is retained across requests; the troubleshooting WebView must
// be hidden by default without stopping the native page or text streaming.
assert.match(native, /PREFS_SHOW_PAGE = "show_ai_studio_page"/);
assert.match(native, /getBoolean\(PREFS_SHOW_PAGE, false\)/);
assert.match(native, /public void setVisibility\(PluginCall call\)/);
assert.match(native, /public void getVisibility\(PluginCall call\)/);
// A visible AI Studio page is an inline non-modal monitor, never an
// AlertDialog. The user must be able to send messages without leaving it.
assert.match(panel, /root\.addView\(offscreenHost,0,p\)/);
assert.match(panel, /offscreenHost\.setTranslationY\(visible\?0f:screenHeight\+Math\.max\(1,panelHeight\)\)/);
assert.match(panel, /offscreenHost\.setImportantForAccessibility\(accessibility\)/);
assert.match(panel, /IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS/);
assert.match(panel, /sessionWebView\.setAlpha\(1f\)/);
assert.doesNotMatch(panel, /sessionWebView\.setAlpha\(0\.01f\)/);
assert.match(native, /sessionWebView\.resumeTimers\(\)/);
assert.match(native, /WEBVIEW_HIDDEN_OFFSCREEN/);
assert.match(native, /WEBVIEW_INLINE_VISIBLE/);
assert.match(panel, /hidePanelButton\.setText\("Ẩn AI Studio"\)/);
assert.doesNotMatch(native, /AlertDialog|sessionDialog|showWindow\(\)/);
assert.match(native, /applyPanelPresentation\((?:webViewController\.)?isPageDisplayEnabled\(\),\s*"generate"\)/);
assert.match(completion, /CONFIRMED_IDLE_MS = 7_000L/);
assert.match(native, /if\s*\(busy\)\s*\{/);
assert.match(completion, /return !busy && confirmedIdle >= idleRequirement/);
assert.match(native, /AiStudioCompletionPolicy\.isTerminal/);
assert.match(completion, /consecutiveIdlePolls >= 4/);
assert.doesNotMatch(native, /if\(stable>\(everSawBusy&&!busy\?1700L:5000L\)\)/);
assert.match(native, /AI_STUDIO_NOT_READY_HIDDEN/);
const sections = fs.readFileSync(new URL('../src/ui/settings/provider-sections/aistudio-section.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../src/ui/settings/connection-settings-screen.js', import.meta.url), 'utf8');
assert.match(sections, /Hiển thị trang web AI Studio/);
assert.match(sections, /checked: aiStudioVisible/);
assert.match(sections, /changeAiStudioVisibility\(event.target.checked\)/);
assert.match(screen, /"aria-label": "Nhà cung cấp AI"/);
for (const source of ['gemini','openrouter','proxy','aistudio']) assert.ok(screen.includes('value: "'+source+'"'));
assert.match(screen, /value: settings\.source, onChange: ([\w$]+) => updateSetting\("source", \1\.target\.value\)/);
for (const note of ['Dùng phiên Google / AI Studio trong WebView Android (thử nghiệm)', 'Hãy chọn mô hình trực tiếp trên trang AI Studio', 'Mặc định tắt. Bật khi cần đăng nhập, chọn mô hình hoặc kiểm tra lỗi']) assert.ok(!sections.includes(note));

assert.match(native,/event\.put\("replace",\s*true\)/);
assert.match(service,/connectionSource === 'aistudio'/);
assert.match(service,/chunk\.replaceText === true/);

const handlers = new Map();
const observed = [];
globalThis.Capacitor = {
  isNativePlatform: () => true,
  Plugins: {
    AIStudioText: {
      async addListener(event, listener) {
        handlers.set(event,listener);
        return {async remove(){handlers.delete(event);}};
      },
    },
  },
  async nativePromise(plugin, method, args) {
    assert.equal(plugin,'AIStudioText');
    if(method==='cancel') return {};
    assert.equal(method,'generate');
    assert.equal(args.prompt,'Test streaming');
    // Simulate a UI response that is revised after the first visible text.
    for(const [delay,text] of [[10,'Mở đầu tạm'],[22,'Mở đầu đã sửa, câu một'],[33,'Mở đầu đã sửa, câu một và câu hai']]){
      setTimeout(()=>handlers.get('textProgress')?.({
        requestId:args.requestId,text,replace:true,
      }),delay);
    }
    return await new Promise(resolve=>setTimeout(()=>resolve({
      text:'Mở đầu đã sửa, câu một và câu hai!',
    }),55));
  },
};

const provider = createAiStudioTextProvider();
for await (const chunk of provider.stream({prompt:'Test streaming',model:'gemini-2.5-flash'})) {
  assert.equal(chunk.replaceText,true,'Snapshots must replace the UI preview');
  observed.push(chunk.text);
}
assert.deepEqual(observed,[
  'Mở đầu tạm',
  'Mở đầu đã sửa, câu một',
  'Mở đầu đã sửa, câu một và câu hai',
  'Mở đầu đã sửa, câu một và câu hai!',
]);
assert.equal(handlers.size,0,'Listener removed after finished stream');
delete globalThis.Capacitor;
console.log('AI Studio live snapshots and per-turn new conversation checks: OK');
