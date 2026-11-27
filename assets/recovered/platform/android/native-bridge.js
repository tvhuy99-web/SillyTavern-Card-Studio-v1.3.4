import { awaitAbortable, abortError } from '../../../m4/core/async/cancellation.js';

export const ANDROID_PLUGINS = Object.freeze({
  aiStudio: 'AIStudioText', exportFile: 'AndroidExportFile',
  onnx: 'WorldInfoEmbeddingNative', liteRt: 'EmbeddingGemma2LiteRT',
});
export function getAndroidPlugin(name, host = globalThis) {
  const cap = host?.Capacitor;
  if (cap?.getPlatform?.() !== 'android') return null;
  return cap.Plugins?.[name] || null;
}
export function getNativePromiseBridge(host = globalThis) {
  const cap = host?.Capacitor;
  if (typeof cap?.nativePromise !== 'function') return null;
  if (typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'android') return null;
  if (typeof cap.isNativePlatform === 'function' && !cap.isNativePlatform()) return null;
  return cap;
}
export function requireNativePromiseBridge(host = globalThis) {
  const cap = getNativePromiseBridge(host);
  if (!cap) throw Error('Google / AI Studio chỉ hoạt động trong APK Android.');
  return cap;
}

export async function awaitNativeDeadline(work, {signal, timeoutMs = 30000, message = 'Native bridge timeout'} = {}) {
  let timer;
  try {
    const operation = () => {
      if (signal?.aborted) throw abortError();
      const result = work();
      return Promise.race([
        Promise.resolve(result),
        new Promise((_, reject) => { timer = setTimeout(() => {
          const error = new Error(message); error.code = 'NATIVE_BRIDGE_TIMEOUT'; reject(error);
        }, timeoutMs); }),
      ]);
    };
    return await (signal ? awaitAbortable(operation, signal) : operation());
  } finally { clearTimeout(timer); }
}

export async function invokeNativeMethod(
  pluginName,
  methodName,
  payload = {},
  {
    host = globalThis,
    signal,
    timeoutMs = 30000,
    message = `Native bridge timeout: ${pluginName}.${methodName}`,
    errorCode = 'NATIVE_BRIDGE_ERROR',
  } = {},
) {
  if (signal?.aborted) throw abortError();
  const bridge = getNativePromiseBridge(host);
  const plugin = bridge ? null : getAndroidPlugin(pluginName, host);
  if (!bridge && typeof plugin?.[methodName] !== 'function') {
    const error = new Error(`Native method ${pluginName}.${methodName} is unavailable.`);
    error.code = 'NATIVE_BRIDGE_UNAVAILABLE';
    throw error;
  }
  try {
    return await awaitNativeDeadline(
      () => (bridge ? bridge.nativePromise(pluginName, methodName, payload) : plugin[methodName](payload)),
      { signal, timeoutMs, message },
    );
  } catch (error) {
    if (error?.name === 'AbortError' || error?.code === 'NATIVE_BRIDGE_TIMEOUT' || error?.code === 'NATIVE_BRIDGE_UNAVAILABLE') {
      throw error;
    }
    const normalized = error instanceof Error ? error : new Error(String(error ?? 'Native bridge error'));
    if (!normalized.code) normalized.code = errorCode;
    throw normalized;
  }
}

export function releaseNativeListener(handle, {timeoutMs = 2000} = {}) {
  if (!handle?.remove) return Promise.resolve();
  return awaitNativeDeadline(() => handle.remove(), {timeoutMs, message: 'Native listener cleanup timeout'}).catch(() => {});
}

export async function acquireNativeListener(plugin, event, callback, {signal, timeoutMs = 10000, cleanupTimeoutMs = 2000} = {}) {
  if (signal?.aborted) throw abortError();
  let abandoned = false;

  const acquisition = Promise.resolve().then(() => {
    if (signal?.aborted) throw abortError();
    return plugin.addListener(event, (...args) => {
      if (!abandoned && !signal?.aborted) callback(...args);
    });
  });
  try {
    const handle = await awaitNativeDeadline(() => acquisition, {signal, timeoutMs, message: 'Native listener registration timeout'});
    return { remove() { abandoned = true; return handle?.remove?.(); } };
  } catch (error) {
    abandoned = true;
    acquisition.then(handle => releaseNativeListener(handle, {timeoutMs: cleanupTimeoutMs})).catch(() => {});
    throw error;
  }
}
