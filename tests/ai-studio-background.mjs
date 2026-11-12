import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync(new URL('../android-native/AiStudioTextPlugin.java', import.meta.url),'utf8');
const service = fs.readFileSync(new URL('../android-native/AiStudioGenerationService.java', import.meta.url),'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/android-apk.yml', import.meta.url),'utf8');

// A user-initiated generation must start the FGS before pressing Home.
assert.match(native, /pending=call;\s*pendingThinkingLevel=[^;]+;\s*startBackgroundGeneration\(\);/);
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
assert.match(workflow, /cp android-native\/AiStudioGenerationService\.java/);
assert.match(workflow, /android\.permission\.FOREGROUND_SERVICE_DATA_SYNC/);
assert.match(workflow, /android\.permission\.FOREGROUND_SERVICE/);
assert.match(workflow, /android\.permission\.WAKE_LOCK/);
assert.match(workflow, /android\.permission\.POST_NOTIFICATIONS/);
assert.match(workflow, /android:foregroundServiceType="dataSync"/);
assert.match(workflow, /android:stopWithTask="false"/);

// Preserve previous text streaming, unique Google conversation and the
// default-hidden/optional inline debug page.
assert.match(native, /notifyListeners\("textProgress",event\)/);
assert.match(native, /NEW_CHAT_CONFIRMED/);
assert.match(native, /getBoolean\(PREFS_SHOW_PAGE, false\)/);
assert.match(native, /WEBVIEW_INLINE_VISIBLE/);
console.log('Android background AI Studio FGS lifecycle regression: OK');
