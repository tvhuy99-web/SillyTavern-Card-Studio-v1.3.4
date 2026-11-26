import { getNativePromiseBridge, getAndroidPlugin, ANDROID_PLUGINS, awaitNativeDeadline } from '../../platform/android/native-bridge.js';
const CACHE = 'sts_ai_studio_model_list';
export function normalizeAiStudioModelCatalog(payload) {
  let models = payload?.models;
  if (typeof models === 'string') {
    try { models = JSON.parse(models); } catch { models = []; }
  }
  if (!Array.isArray(models)) return [];
  return [...new Map(models.filter(item =>
    item && typeof item.id === 'string' &&
    /^gemini-[a-z0-9][a-z0-9._-]{2,110}$/i.test(item.id) &&
    !/(embedding|transcribe|tts|live|imagen|image|computer-use)/i.test(item.id)
  ).map(item => [item.id, {
    id: item.id, name: String(item.name || item.id).slice(0, 120),
  }])).values()].sort((firstModel, secondModel) => firstModel.id.localeCompare(secondModel.id));
}
async function requestModels(host) {
  const cap = getNativePromiseBridge(host);
  if (typeof cap?.nativePromise === 'function') {
    return cap.nativePromise('AIStudioText', 'listModels', {});
  }
  const plugin = getAndroidPlugin(ANDROID_PLUGINS.aiStudio, host);
  if (typeof plugin?.listModels === 'function') {
    return plugin.listModels({});
  }
  throw Error('AI_STUDIO_BRIDGE_MISSING: Không tìm thấy plugin AIStudioText. Cần cài APK Android, không dùng bản web.');
}
const catalogs = new WeakMap();
export function createAiStudioModelCatalog(host = globalThis, { timeoutMs = 35000, storage = host.localStorage } = {}) {
  if (!catalogs.has(host)) catalogs.set(host, { pending: null, revision: 0 });
  const state = catalogs.get(host);
  return Object.freeze({
    read() {
      try { return normalizeAiStudioModelCatalog({ models: JSON.parse(storage.getItem(CACHE) || '[]') }); }
      catch { return []; }
    },
    clear() { storage.removeItem(CACHE); state.revision++; },
    load() {
      if (state.pending) return state.pending;
      const revision = state.revision;
      const pending = (async () => {
      const response = await awaitNativeDeadline(() => requestModels(host), {
        timeoutMs, message:'AI_STUDIO_MODEL_TIMEOUT: Android chưa phản hồi. Kiểm tra Nhật ký hệ thống > AI Studio > MODEL_SCAN / MODEL_PAGE_*.'
      });
      const models = normalizeAiStudioModelCatalog(response);
      if (!models.length) throw Error('AI_STUDIO_MODEL_EMPTY: WebView trả về 0 model hợp lệ. Kiểm tra MODEL_SCAN trong Nhật ký hệ thống và đăng nhập lại AI Studio.');
      if (state.revision !== revision) throw Error('AI_STUDIO_MODEL_STALE: Danh sách model đã được xóa trong khi tải.');
      storage.setItem(CACHE, JSON.stringify(models));
      return { response, models };
      })();
      state.pending = pending;
      const release = () => { if (state.pending === pending) state.pending = null; };
      pending.then(release, release);
      return pending;
    },
  });
}
