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

// Capacitor base64 transport: each embedding is 768 little-endian float32
// values. Preserve the existing L2-normalization, index dimensions and
// provider identity, while avoiding thousands of JSON number objects.
export function decodeEmbeddingGemma2Binary(base64, count, dimensions = 768) {
  if (typeof base64 !== 'string' || !Number.isInteger(count) || count < 1 || count > 4
    || dimensions !== 768) {
    throw new Error('LiteRT: định dạng vector nhị phân không hợp lệ.');
  }
  const raw = atob(base64);
  if (raw.length !== count * dimensions * 4) {
    throw new Error('LiteRT: độ dài bộ đệm embedding không khớp.');
  }
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const vectors = [];
  for (let batch = 0; batch < count; batch++) {
    const vector = [];
    for (let position = 0; position < dimensions; position++) {
      const value = view.getFloat32((batch * dimensions + position) * 4, true);
      if (!Number.isFinite(value)) throw new Error('LiteRT: vector có NaN hoặc Infinity.');
      vector.push(value);
    }
    vectors.push(vector);
  }
  return vectors;
}

export function formatEmbeddingGemma2TuningReport(result) {
  const entries = Array.isArray(result?.benchmarks) ? result.benchmarks : [];
  const measured = entries.map(item => (item.backend || 'không xác định') + '/batch'
    + Number(item.batch) + '=' + Number(item.segmentsPerSecond || 0).toFixed(2) + ' đoạn/s');
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  return {
    summary: 'LiteRT-LM [ACCEL] backend chọn: ' + (result?.backend || 'CPU')
      + '; batch=' + (Number(result?.preferredBatch) || 2)
      + (result?.reused ? '; dùng cấu hình đã đo' : '; đo thực tế ' + (Number(result?.totalMs) || 0) + 'ms'),
    measurements: measured,
    warnings,
  };
}

export async function createEmbeddingGemma2Runtime(provider, onStage = () => {}, plugin = requirePlugin()) {
  if (provider?.id !== 'embeddinggemma2') throw new Error('Sai model: LiteRT-LM chỉ dành cho EmbeddingGemma 2 Text 270M.');
  const status = await plugin.status();
  if (!status.modelReady) throw new Error('EmbeddingGemma 2 chưa được tải. Hãy tải mô hình trong Cài đặt Smart Scan.');
  onStage('LiteRT-LM: khởi tạo EmbeddingGemma 2 Text 270M bằng backend đã chọn');
  const loaded = await plugin.load();
  onStage('LiteRT-LM: model sẵn sàng; backend=' + (loaded.backend || 'CPU')
    + '; thời gian nạp=' + (loaded.loadMs ?? 0) + 'ms'
    + (loaded.backendNote ? '; ' + loaded.backendNote : ''));
  let tuningDone = false;
  let preferredBatch = Math.max(1, Math.min(4, Number(loaded.preferredBatch) || 2));
  return {
    provider,
    async tune(texts, report = onStage) {
      if (tuningDone) return { preferredBatch, reused: true };
      if (!Array.isArray(texts) || !texts.length) return { preferredBatch, reused: true };
      report('LiteRT-LM [ACCEL] Đang đo CPU 2/4 luồng và kiểm tra GPU/OpenCL (nếu hỗ trợ).');
      const result = await plugin.tune({ texts: texts.slice(0, 4) });
      preferredBatch = Math.max(1, Math.min(4, Number(result.preferredBatch) || 2));
      tuningDone = true;
      const detail = formatEmbeddingGemma2TuningReport(result);
      report(detail.summary);
      for (const line of detail.measurements) report('LiteRT-LM [ACCEL] ' + line);
      for (const warning of detail.warnings) report('LiteRT-LM [ACCEL] ' + warning);
      return { ...result, preferredBatch };
    },
    get preferredBatch() { return preferredBatch; },
    async embed(texts, onMeasurement) {
      if (!Array.isArray(texts) || texts.length < 1 || texts.length > 4) {
        throw new Error('LiteRT-LM yêu cầu batch từ 1 đến 4 đoạn.');
      }
      const start = Date.now();
      const result = await plugin.embed({ texts });
      const decoded = result.format === 'float32le'
        ? decodeEmbeddingGemma2Binary(result.vectorBytes, Number(result.count), Number(result.dimensions))
        : result.vectors;
      const rows = validateEmbeddingGemma2Vectors(decoded, texts.length);
      const totalMs = Date.now() - start;
      onMeasurement?.({
        litertMs: Number(result.onnxMs) || 0,
        bridgeMs: Math.max(0, totalMs - (Number(result.onnxMs) || 0)),
        backend: result.backend || 'LiteRT-LM CPU',
      });
      return rows;
    },
    async dispose() {
      await plugin.unload();
    },
  };
}
