import { createNativeEmbeddingGemmaRuntime, getNativeEmbeddingPlugin } from '../../../../m4/features/world-info/native-embedding-bridge.js';
import { getEmbeddingGemma2Status, createEmbeddingGemma2Runtime } from '../../../../m4/features/world-info/embeddinggemma2-litert-bridge.js';
import { normalizeTensorRows, normalizeRows } from './embedding-math.js';
import { TRANSFORMERS_CACHE_KEY, providerIsCached } from './local-model-cache.js';

const TRANSFORMERS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

// Inspired by NgheTruyen's per-device inference profiles. The WebView has a
// smaller memory budget than Android-native ORT, so batches stay capped at 4.
// A missing deviceMemory signal is treated conservatively, not as 8 GiB.
export function planLocalEmbeddingBatch(providerId, options = {}) {
  const requested = Math.max(1, Math.min(30, Math.floor(Number(options.requestedBatchSize) || 30)));
  const memory = Number(options.deviceMemoryGB) || 0;
  const cores = Number(options.hardwareConcurrency) || 0;
  const lowMemory = options.lowMemory === true || (memory > 0 && memory <= 2);
  let limit = 1;
  if (!lowMemory && cores !== 1 && cores !== 2) {
    if (providerId === 'embeddinggemma' || providerId === 'embeddinggemma2') {
      limit = memory >= 8 ? 4 : 2;
    } else if (providerId === 'qwen3') {
      // Large Qwen weights can exhaust the Android WebView process.
      limit = memory >= 8 ? 2 : 1;
    }
  }
  const maxBatch = Math.min(requested, limit);
  return { maxBatch, initialBatch: Math.min(maxBatch, 2), deviceMemoryGB: memory, hardwareConcurrency: cores };
}

// Autotune with useful work rather than running an extra benchmark. One batch
// of 2 is measured before a >=8 GiB device may try 4; slower batches are
// reduced after comparing per-vector inference time. No model/mode fallback.
export function createLocalEmbeddingBatchPlanner(profile) {
  const maxBatch = Math.max(1, Math.min(4, Number(profile?.maxBatch) || 1));
  let current = Math.max(1, Math.min(maxBatch, Number(profile?.initialBatch) || 1));
  let twoThroughput = 0;
  let escalated = false;
  let downgraded = false;
  return Object.freeze({
    next: remaining => Math.min(Math.max(1, Number(remaining) || 1), current),
    report: (count, elapsedMs) => {
      const size = Math.max(1, Number(count) || 1);
      const duration = Math.max(1, Number(elapsedMs) || 1);
      const throughput = size * 1000 / duration;
      if (size === 2 && current === 2 && maxBatch >= 4 && !escalated && !downgraded) {
        twoThroughput = throughput;
        current = 4;
        escalated = true;
        return 'Tăng batch 2 → 4 sau phép đo đầu tiên trên thiết bị đủ RAM';
      }
      if (size === 4 && current === 4 && twoThroughput > 0 && throughput < twoThroughput * 0.9) {
        current = 2;
        downgraded = true;
        return 'Giảm batch 4 → 2 vì tốc độ mỗi vector không cải thiện';
      }
      return '';
    },
    get size() { return current; },
  });
}

export function isAndroidHost() {
  return typeof navigator !== 'undefined' && /Android/i.test(String(navigator.userAgent || ''));
}

// Only the Capacitor Android APK has the registered native ONNX plugin.
// Android mobile browsers must retain the existing WebAssembly path.
export function isNativeAndroidEmbeddingHost(host = globalThis) {
  return /Android/i.test(String(host?.navigator?.userAgent || ''))
    && host?.Capacitor?.getPlatform?.() === 'android';
}

function preferredDevice() {
  // Android WebView drivers can terminate the renderer on large WebGPU allocations.
  return !isAndroidHost() && typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm';
}

export function configureTransformersEnvironment(environment) {
  if (!environment) return;
  // Transformers.js v3 defaults allowLocalModels=false in browsers/WebViews.
  // Offline sync uses local_files_only=true and must be allowed to read files
  // previously downloaded into the browser Cache API.
  // Do not disable allowRemoteModels globally: first-time downloads still need it.
  environment.allowLocalModels = true;
  environment.useBrowserCache = true;
  environment.useWasmCache = true;
  environment.cacheKey = TRANSFORMERS_CACHE_KEY;
}

async function getTransformersModule() {
  const module = await import(TRANSFORMERS_MODULE_URL);
  configureTransformersEnvironment(module?.env);
  return module;
}

function progressAdapter(callback) {
  if (typeof callback !== 'function') return undefined;
  return info => {
    if (info?.status === 'progress_total') {
      callback({ status: 'loading', progress: Number(info.progress) || 0, loaded: info.loaded, total: info.total });
    } else if (info?.status === 'progress') {
      callback({ status: 'loading', progress: Number(info.progress) || 0, loaded: info.loaded, total: info.total, file: info.file });
    } else if (info?.status === 'ready') {
      callback({ status: 'ready', progress: 100 });
    }
  };
}

function wrapEmbeddingGemmaRuntime(provider, tokenizer, model) {
  return {
    provider,
    async embed(texts, onMeasurement) {
      const tokenStart = Date.now();
      const inputs = await tokenizer(texts, {
        padding: true,
        truncation: true,
        max_length: provider.maxLength,
      });
      const tokenizationMs = Date.now() - tokenStart;
      const modelStart = Date.now();
      const output = await model(inputs);
      onMeasurement?.({ tokenizationMs, onnxMs: Date.now() - modelStart });
      const tensor = output.sentence_embedding || output.pooler_output;
      if (!tensor) throw new Error('EmbeddingGemma không trả về sentence_embedding.');
      return normalizeRows(normalizeTensorRows(tensor));
    },
    async dispose() {
      try { await model.dispose?.(); } catch {}
    },
  };
}

function wrapFeatureExtractionRuntime(provider, extractor) {
  return {
    provider,
    async embed(texts, onMeasurement) {
      const start = Date.now();
      const tensor = await extractor(texts, {
        pooling: provider.pooling,
        normalize: true,
        truncation: true,
        max_length: provider.maxLength,
      });
      onMeasurement?.({ pipelineMs: Date.now() - start });
      return normalizeRows(normalizeTensorRows(tensor));
    },
    async dispose() {
      try { await extractor.dispose?.(); } catch {}
    },
  };
}

async function createLocalRuntime(provider, onProgress, localOnly = false, onStage = () => {}) {
  if (provider.kind !== 'local') throw new Error('Provider này không phải mô hình cục bộ.');
  if (provider.id === 'embeddinggemma2') {
    if (!isNativeAndroidEmbeddingHost()) {
      throw new Error('EmbeddingGemma 2 Text 270M yêu cầu APK Android có LiteRT-LM.');
    }
    // Native LiteRT-LM engine, never import Transformers.js or switch to ONNX.
    return createEmbeddingGemma2Runtime(provider, onStage);
  }
  onStage('Import Transformers.js (có thể truy cập CDN cho mã thư viện)');
  const transformers = await getTransformersModule();
  onStage('Đã nạp Transformers.js; chuẩn bị bộ suy luận cục bộ');
  // Android EmbeddingGemma OFFLINE always uses the native ORT engine.
  // The explicit Settings download action (localOnly=false) still fills
  // the original Transformers.js cache; it never changes sync behavior.
  if (isNativeAndroidEmbeddingHost() && provider.id === 'embeddinggemma' && localOnly) {
    return createNativeEmbeddingGemmaRuntime({ provider, transformers, onStage });
  }
  const callback = progressAdapter(onProgress);
  const common = {
    dtype: provider.dtype,
    device: preferredDevice(),
    progress_callback: callback,
    local_files_only: localOnly,
  };

  try {
    if (provider.id === 'embeddinggemma') {
      onStage('Nạp tokenizer EmbeddingGemma từ cache');
      const tokenizer = await transformers.AutoTokenizer.from_pretrained(provider.modelId, {
        progress_callback: callback,
        local_files_only: localOnly,
      });
      onStage('Khởi tạo ONNX EmbeddingGemma (' + common.device + ', Q4)');
      const model = await transformers.AutoModel.from_pretrained(provider.modelId, common);
      onStage('ONNX EmbeddingGemma sẵn sàng');
      return wrapEmbeddingGemmaRuntime(provider, tokenizer, model);
    }

    onStage('Khởi tạo pipeline ONNX ' + provider.shortLabel + ' (' + common.device + ', Q4)');
    const extractor = await transformers.pipeline('feature-extraction', provider.modelId, common);
    onStage('Pipeline ONNX ' + provider.shortLabel + ' sẵn sàng');
    return wrapFeatureExtractionRuntime(provider, extractor);
  } catch (error) {
    if (common.device !== 'webgpu') throw error;
    const fallback = { ...common, device: 'wasm' };
    if (provider.id === 'embeddinggemma') {
      const tokenizer = await transformers.AutoTokenizer.from_pretrained(provider.modelId, {
        progress_callback: callback,
        local_files_only: localOnly,
      });
      const model = await transformers.AutoModel.from_pretrained(provider.modelId, fallback);
      return wrapEmbeddingGemmaRuntime(provider, tokenizer, model);
    }
    const extractor = await transformers.pipeline('feature-extraction', provider.modelId, fallback);
    return wrapFeatureExtractionRuntime(provider, extractor);
  }
}

export function createLocalRuntimeManager() {
  const modelRuntimes = new Map();
  const modelLoads = new Map();

  async function disposeUnusedLocalRuntimes(keepProviderId = null) {
    for (const [providerId, runtime] of Array.from(modelRuntimes.entries())) {
      if (providerId === keepProviderId) continue;
      modelRuntimes.delete(providerId);
      try { await runtime.dispose?.(); } catch (error) {
        console.warn('[Embedding] Could not dispose inactive local model:', providerId, error);
      }
    }
  }

  async function disposeProviderRuntime(providerId) {
    const runtime = modelRuntimes.get(providerId);
    modelRuntimes.delete(providerId);
    modelLoads.delete(providerId);
    try { await runtime?.dispose?.(); } catch {}
  }

  async function ensureLocalRuntime(provider, options = {}) {
    const onStage = options.onStage || (() => {});
    if (modelRuntimes.has(provider.id)) {
      onStage('Dùng runtime ONNX đã nạp');
      return modelRuntimes.get(provider.id);
    }
    if (modelLoads.has(provider.id)) {
      onStage('Đợi lần nạp runtime ONNX đang chạy');
      return modelLoads.get(provider.id);
    }
    if (options.localOnly) onStage('Kiểm tra cache của model ' + provider.shortLabel);
    if (options.localOnly) {
      if (provider.id === 'embeddinggemma2') {
        const status = await getEmbeddingGemma2Status();
        if (status.status !== 'ready' && status.status !== 'cached') {
          throw new Error('EmbeddingGemma 2 Text 270M chưa được tải hoặc APK không hỗ trợ LiteRT-LM. Không tự chuyển model.');
        }
      } else {
        const cached = await providerIsCached(provider);
        let alreadyNative = false;
        if (!cached && isNativeAndroidEmbeddingHost() && provider.id === 'embeddinggemma') {
          const plugin = getNativeEmbeddingPlugin();
          alreadyNative = !!(plugin && (await plugin.status()).modelReady);
        }
        if (!cached && !alreadyNative) {
          throw new Error(`Mô hình ${provider.shortLabel} chưa được tải. Hãy tải mô hình trong Cài đặt Smart Scan trước.`);
        }
      }
    }
    // Keep only one heavy ONNX model resident when switching embedding providers.
    onStage('Giải phóng các model ONNX không sử dụng');
    await disposeUnusedLocalRuntimes(provider.id);
    const loading = createLocalRuntime(provider, options.onProgress, !!options.localOnly, onStage)
      .then(runtime => {
        modelRuntimes.set(provider.id, runtime);
        modelLoads.delete(provider.id);
        return runtime;
      })
      .catch(error => {
        modelLoads.delete(provider.id);
        throw error;
      });
    modelLoads.set(provider.id, loading);
    return loading;
  }

  return Object.freeze({
    hasRuntime: providerId => modelRuntimes.has(providerId),
    isLoading: providerId => modelLoads.has(providerId),
    ensureLocalRuntime,
    disposeUnusedLocalRuntimes,
    disposeProviderRuntime,
  });
}
