import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = ['AiStudioTextPlugin.java','AiStudioDiagnostics.java','AiStudioWebViewController.java','AiStudioSessionController.java','AiStudioThinkingController.java','AiStudioGenerationController.java','AiStudioResponsePoller.java'].map(f => fs.readFileSync(new URL('../android-native/' + f, import.meta.url), 'utf8')).join('\n');
const service = fs.readFileSync(new URL('../android-native/AiStudioGenerationService.java', import.meta.url),'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/android-apk.yml', import.meta.url),'utf8');

// A user-initiated generation must start the FGS before pressing Home.
assert.match(native, /pending\s*=\s*call;[\s\S]*?thinkingController\.resetForGeneration\(/);
const generation = native.slice(native.indexOf('void startGeneration('), native.indexOf('private void prepareText('));
assert.ok(generation.indexOf('thinkingController.resetForGeneration(') < generation.indexOf('startBackgroundGeneration('),
  'Native thinking setting must be parsed before starting the foreground service');
assert.match(generation, /GENERATION_SETTINGS/);
assert.match(native, /startForegroundService\(intent\)/);
assert.match(native, /foregroundRequestStarted = true/);
assert.match(native, /handleOnPause\(\)/);
assert.match(native, /handleOnResume\(\)/);
assert.match(native, /sessionWebView\.resumeTimers\(\)/);
assert.match(native, /APP_BACKGROUND/);
assert.match(native, /APP_RETURNED/);
assert.match(native, /public void getBackgroundStatus\(PluginCall call\)/);
assert.match(native, /stopBackgroundGeneration\(true\)/);
assert.match(native, /stopBackgroundGeneration\(false\)/);

// Active foreground service: CPU wake lock, ongoing notification, tap-to-return,
// no prompt or response leakage, completion and service cleanup.
assert.match(service, /extends Service/);
assert.match(service, /FOREGROUND_SERVICE_TYPE_DATA_SYNC/);
assert.match(service, /PARTIAL_WAKE_LOCK/);
assert.match(service, /wakeLock\.release\(\)/);
assert.match(service, /AI Studio đang trả lời/);
assert.match(service, /AI Studio đã trả lời xong/);
assert.match(service, /PendingIntent\.getActivity/);
assert.match(service, /START_NOT_STICKY/);
assert.match(service, /stopForeground\(/);
assert.match(service, /onTimeout\(int startId, int fgsType\)/);
assert.doesNotMatch(service, /getString\("prompt"|getString\("text"|getString\("cookie"/);

// Generated APK must include a declared Android 14+ dataSync service, and
// Android 13+ optional notifications permission.
assert.match(workflow, /python3 tools\/prepare-android\.py android/);
const overlay = fs.readFileSync(new URL('../tools/prepare-android.py', import.meta.url),'utf8');
assert.match(overlay, /glob\("\*\.java"\)/);
assert.match(overlay, /FOREGROUND_SERVICE_DATA_SYNC/);
assert.match(overlay, /FOREGROUND_SERVICE/);
assert.match(overlay, /WAKE_LOCK/);
assert.match(overlay, /POST_NOTIFICATIONS/);
assert.match(overlay, /"foregroundServiceType":"dataSync"/);
assert.match(overlay, /"stopWithTask":"false"/);

// Preserve previous text streaming, unique Google conversation and the
// default-hidden/optional inline debug page.
assert.match(native, /(?:notifyListeners|emitEvent)\("textProgress",\s*event\)/);
assert.match(native, /NEW_CHAT_CONFIRMED/);
assert.match(native, /getBoolean\(PREFS_SHOW_PAGE, false\)/);
assert.match(native, /WEBVIEW_INLINE_VISIBLE/);
console.log('Android background AI Studio FGS lifecycle regression: OK');
