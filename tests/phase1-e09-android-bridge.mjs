import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { abortError } from '../src/core/async/cancellation.js';
import {
  ANDROID_PLUGINS,
  acquireNativeListener,
  invokeNativeMethod,
} from '../src/platform/android/native-bridge.js';

const read = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const decodeJavaTextBlock = block =>
  block.replace(/\\(\\|n|r|t|s|"|')/g, (_, ch) => ({ '\\': '\\', n: '\n', r: '\r', t: '\t', s: ' ', '"': '"', "'": "'" })[ch]);

{
  const expected = abortError();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    acquireNativeListener({ addListener() { throw new Error('should not run'); } }, 'diagnostic', () => {}, { signal: controller.signal }),
    err => err?.name === expected.name && err?.message === expected.message,
  );

  await assert.rejects(
    invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'openSession', {}, { signal: controller.signal }),
    err => err?.name === expected.name && err?.message === expected.message,
  );
}

{
  const calls = [];
  const hostWithPromise = {
    Capacitor: {
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      async nativePromise(plugin, method, payload) {
        calls.push({ plugin, method, payload });
        return { ok: true, echoed: payload.ping };
      },
    },
  };
  const res1 = await invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'ping', { ping: 42 }, { host: hostWithPromise });
  assert.deepEqual(res1, { ok: true, echoed: 42 });
  assert.deepEqual(calls, [{ plugin: 'AIStudioText', method: 'ping', payload: { ping: 42 } }]);

  const hostWithPlugin = {
    Capacitor: {
      getPlatform: () => 'android',
      Plugins: {
        WorldInfoEmbeddingNative: {
          async status(payload) {
            return { ready: true, tag: payload.tag };
          },
        },
      },
    },
  };
  const res2 = await invokeNativeMethod(ANDROID_PLUGINS.onnx, 'status', { tag: 'v1' }, { host: hostWithPlugin });
  assert.deepEqual(res2, { ready: true, tag: 'v1' });

  await assert.rejects(
    invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'openSession', {}, { host: { Capacitor: { getPlatform: () => 'web' } } }),
    { code: 'NATIVE_BRIDGE_UNAVAILABLE' },
  );

  const neverHost = {
    Capacitor: {
      getPlatform: () => 'android',
      nativePromise: () => new Promise(() => {}),
    },
  };
  await assert.rejects(
    invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'hang', {}, { host: neverHost, timeoutMs: 15 }),
    { code: 'NATIVE_BRIDGE_TIMEOUT' },
  );

  const controller = new AbortController();
  const pending = invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'hang', {}, { host: neverHost, signal: controller.signal, timeoutMs: 1000 });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });

  const failingHost = {
    Capacitor: {
      getPlatform: () => 'android',
      nativePromise: async () => { throw new Error('native boom'); },
    },
  };
  await assert.rejects(
    invokeNativeMethod(ANDROID_PLUGINS.aiStudio, 'boom', {}, { host: failingHost }),
    err => err instanceof Error && err.message === 'native boom' && err.code === 'NATIVE_BRIDGE_ERROR',
  );
}

{
  const scriptsSrc = read('android-native/AiStudioPageScripts.java');
  const readinessMatch = scriptsSrc.match(/NEW_CHAT_READINESS_JS = """\n([\s\S]*?)\n        """;/);
  const expanderMatch = scriptsSrc.match(/RUN_SETTINGS_EXPAND_JS = """\n([\s\S]*?)\n        """;/);
  assert.ok(readinessMatch, 'AiStudioPageScripts.java must define NEW_CHAT_READINESS_JS');
  assert.ok(expanderMatch, 'AiStudioPageScripts.java must define RUN_SETTINGS_EXPAND_JS');

  const readinessScript = decodeJavaTextBlock(readinessMatch[1]);
  const readinessOk = JSON.parse(vm.runInNewContext(readinessScript, {
    location: { hostname: 'aistudio.google.com', pathname: '/u/0/prompts/new_chat' },
    document: {
      readyState: 'complete',
      querySelectorAll(sel) { return sel.includes('textarea') ? [{}] : []; },
    },
  }));
  assert.equal(readinessOk.ok, true);
  assert.equal(readinessOk.editors, 1);
  assert.equal(readinessOk.oldModelTurns, 0);

  const expanderScript = decodeJavaTextBlock(expanderMatch[1]);
  let clicked = 0;
  const expandResult = JSON.parse(vm.runInNewContext(expanderScript, {
    document: {
      querySelectorAll() {
        return [{
          getAttribute: () => 'Run settings',
          textContent: 'Run settings',
          getClientRects: () => [{}],
          click() { clicked++; },
        }];
      },
    },
  }));
  assert.equal(expandResult.ok, true);
  assert.equal(clicked, 1);
}

{
  const pluginSrc = ['AiStudioTextPlugin.java','AiStudioDiagnostics.java','AiStudioWebViewController.java','AiStudioSessionController.java','AiStudioThinkingController.java','AiStudioGenerationController.java','AiStudioResponsePoller.java'].map(f => read('android-native/' + f)).join('\n');
  assert.match(pluginSrc, /AiStudioPageScripts\.NEW_CHAT_READINESS_JS/);
  assert.match(pluginSrc, /AiStudioPageScripts\.RUN_SETTINGS_EXPAND_JS/);
  const watchdogMatch = pluginSrc.match(/(?:private\s+)?void clearWatchdog\(\)\s*\{([\s\S]*?)\}/);
  assert.ok(watchdogMatch, 'clearWatchdog() method must exist');
  assert.match(watchdogMatch[1], /handler\.removeCallbacks\(requestWatchdog\)/);
  assert.doesNotMatch(watchdogMatch[1], /removeCallbacksAndMessages\(null\)/);
}

{
  const logSrc = read('src/diagnostics/aistudio-log.js');
  assert.match(logSrc, /getAndroidPlugin\(ANDROID_PLUGINS\.aiStudio/);
  assert.doesNotMatch(logSrc, /Plugins\??\.AIStudioText/);

  const textSrc = read('src/providers/aistudio/text.js');
  assert.match(textSrc, /ANDROID_PLUGINS\.aiStudio/);
  assert.doesNotMatch(textSrc, /'AIStudioText'|"AIStudioText"/);
}

{
  const workflowSrc = read('.github/workflows/android-apk.yml');
  assert.match(workflowSrc, /@capacitor\/core@8\.0\.0\s+@capacitor\/android@8\.0\.0\s+@capacitor\/cli@8\.0\.0/);
}

console.log('Phase 1 E09 Android bridge & native cleanup tests: PASS');
