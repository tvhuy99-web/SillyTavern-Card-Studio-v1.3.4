// EmbeddingGemma 2 Text 270M runs only in Capacitor Android APK via LiteRT-LM.
// No model/backend switching: an absent plugin, model, or runtime is an error.
// Browser users can keep using the original EmbeddingGemma 300M / Qwen3 paths.

export const EMBEDDINGGEMMA2_MODEL_ID = 'litert-community/embeddinggemma-2-text-270m-litert-lm';
export const EMBEDDINGGEMMA2_FILE_NAME = 'embeddinggemma-2-text-270m.litertlm';

export function getEmbeddingGemma2Plugin(host = globalThis) {
  if (host?.Capacitor?.getPlatform?.() !== 'android') return null;
  return host.Capacitor.Plugins?.EmbeddingGemma2LiteRT || null;
}

function requirePlugin() {
  const plugin = getEmbeddingGemma2Plugin();
  if (!plugin) {
    throw new Error('EmbeddingGemma 2 Text 270M yêu cầu APK Android có LiteRT-LM. Không tự chuyển sang WASM hoặc model khác.');
  }
  return plugin;
}

export async function getEmbeddingGemma2Status() {
  const plugin = getEmbeddingGemma2Plugin();
  if (!plugin) return { status: 'unsupported', progress: 0 };
  const state = await plugin.status();
  return { status: state.sessionReady ? 'ready' : state.modelReady ? 'cached' : 'missing', progress: state.modelReady ? 100 : 0 };
}

// Only called when the user clicks "Tải mô hình" in Smart Scan Settings.
export async function downloadEmbeddingGemma2(onProgress) {
  const plugin = requirePlugin();
  const state = await plugin.status();
  if (state.modelReady) {
    onProgress?.({ status: 'ready', progress: 100 });
    return;
  }
  const listener = await plugin.addListener('downloadProgress', data => {
    const { progress, loaded, total } = data;
    onProgress?.({ status: 'loading', progress: Number(progress) || 0, loaded, total });
  });
  try {
    await plugin.download();
    const verified = await plugin.status();
    if (!verified.modelReady) throw new Error('LiteRT model download completed but native files are not ready.');
    onProgress?.({ status: 'ready', progress: 100 });
  } finally {
    await listener?.remove?.();
  }
}

export async function removeEmbeddingGemma2() {
  await requirePlugin().deleteModel();
}

export function validateEmbeddingGemma2Vectors(vectors, count) {
  if (!Array.isArray(vectors) || vectors.length !== count) {
    throw new Error('EmbeddingGemma 2 trả về sai số lượng vector.');
  }
  return vectors.map(row => {
    if (!Array.isArray(row) || row.length !== 768) {
      throw new Error('EmbeddingGemma 2 trả về vector không đủ 768 chiều.');
    }
    const numbers = row.map(Number);
    if (numbers.some(value => !Number.isFinite(value))) {
      throw new Error('EmbeddingGemma 2 trả về dữ liệu NaN hoặc vô hạn.');
    }
    const magnitude = Math.sqrt(numbers.reduce((sum, value) => sum + value * value, 0));
    if (magnitude <= 0) throw new Error('EmbeddingGemma 2 trả về vector rỗng.');
    return numbers.map(value => value / magnitude);
  });
}

export async function createEmbeddingGemma2Runtime(provider, onStage = () => {}, plugin = requirePlugin()) {
  if (provider?.id !== 'embeddinggemma2') throw new Error('Sai model: LiteRT-LM chỉ dành cho EmbeddingGemma 2 Text 270M.');
  const status = await plugin.status();
  if (!status.modelReady) throw new Error('EmbeddingGemma 2 chưa được tải. Hãy tải mô hình trong Cài đặt Smart Scan.');
  onStage('LiteRT-LM: khởi tạo EmbeddingGemma 2 Text 270M trên Android CPU');
  const loaded = await plugin.load();
  onStage('LiteRT-LM: model sẵn sàng; backend=' + (loaded.backend || 'CPU')
    + '; thời gian nạp=' + (loaded.loadMs ?? 0) + 'ms');
  return {
    provider,
    async embed(texts, onMeasurement) {
      if (!Array.isArray(texts) || texts.length < 1 || texts.length > 4) {
        throw new Error('LiteRT-LM yêu cầu batch từ 1 đến 4 đoạn.');
      }
      const start = Date.now();
      const result = await plugin.embed({ texts });
      const rows = validateEmbeddingGemma2Vectors(result.vectors, texts.length);
      onMeasurement?.({ onnxMs: Number(result.onnxMs) || 0, backend: result.backend || 'LiteRT-LM CPU' });
      return rows;
    },
    async dispose() {
      await plugin.unload();
    },
  };
}
