// Bridge for the Android-native ONNX Runtime engine. Browser/web installations
// retain their existing Transformers.js implementation. On an Android APK,
// EmbeddingGemma sync must use the native engine or show an explicit error:
// there is NO automatic WASM/online/keyword/model fallback.
const GRAPH_FILE = 'model_q4.onnx';
const DATA_FILE = 'model_q4.onnx_data';
const TRANSFER_CHUNK_BYTES = 512 * 1024;
const PROGRESS_INTERVAL_BYTES = 16 * 1024 * 1024;

export function getNativeEmbeddingPlugin(host = globalThis) {
  const capacitor = host?.Capacitor;
  if (capacitor?.getPlatform?.() !== 'android') return null;
  return capacitor.Plugins?.WorldInfoEmbeddingNative || null;
}

// Convert Tensor<bigint> token IDs into plain JSON arrays. Never send document
// text to the native plugin. The web tokenizer preserves the exact formatting,
// padding and truncation used by the previous WebView implementation.
export function packNativeEmbeddingInputs(tokenized) {
  const ids = tokenized?.input_ids;
  const mask = tokenized?.attention_mask;
  const dimensions = ids?.dims;
  if (!Array.isArray(dimensions) || dimensions.length !== 2
    || !ids?.data || !mask?.data) {
    throw new Error('Tokenizer không trả input_ids/attention_mask đúng định dạng cho ONNX native.');
  }
  const [batch, sequence] = dimensions.map(Number);
  if (!Number.isInteger(batch) || batch < 1 || batch > 4
    || !Number.isInteger(sequence) || sequence < 1 || sequence > 2048
    || ids.data.length !== batch * sequence || mask.data.length !== batch * sequence) {
    throw new Error('Tokenizer trả kích thước đầu vào không hợp lệ cho ONNX native.');
  }
  const convert = (data, label) => Array.from({ length: batch }, (_, row) =>
    Array.from(data.slice(row * sequence, (row + 1) * sequence), value => {
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0) {
        throw new Error('Token ' + label + ' không phải số nguyên hợp lệ.');
      }
      return number;
    }));
  return {
    inputIds: convert(ids.data, 'input_ids'),
    attentionMask: convert(mask.data, 'attention_mask'),
  };
}

function encodeBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

async function getCachedFile(modelId, fileName, cacheStorage) {
  if (!cacheStorage?.keys) throw new Error('Cache API không khả dụng: không thể chuyển model sang ONNX native.');
  const names = await cacheStorage.keys();
  const expectedSuffix = '/onnx/' + fileName;
  const modelNeedle = '/' + modelId.toLowerCase() + '/';
  for (const name of names) {
    if (!/transformers/i.test(name) && name !== 'st-card-studio-embedding-models-v1') continue;
    const cache = await cacheStorage.open(name);
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      if (!url.pathname.toLowerCase().includes(modelNeedle)
        || !url.pathname.toLowerCase().endsWith(expectedSuffix)) continue;
      const response = await cache.match(request);
      if (response?.ok && response.body?.getReader) return response;
    }
  }
  throw new Error('Không tìm thấy ' + fileName + ' của ' + modelId
    + ' trong Cache API. Hãy tải lại model trong Cài đặt Smart Scan, không đổi model tự động.');
}

// Transfer is bounded by 512 KiB per JS/native bridge call. The model can
// exceed 200 MB; never call response.arrayBuffer() or hold it all in JS RAM.
export async function copyCachedModelToNative(plugin, provider, onStage = () => {}, cacheStorage = globalThis.caches) {
  const status = await plugin.status();
  if (status.modelReady) {
    onStage('ONNX native: trọng số đã được sao chép từ lần trước; tái sử dụng');
    return;
  }
  for (const [fileName, ready] of [[GRAPH_FILE, status.graphReady], [DATA_FILE, status.weightsReady]]) {
    if (ready) continue;
    const response = await getCachedFile(provider.modelId, fileName, cacheStorage);
    const reader = response.body.getReader();
    let copied = 0;
    let nextNotice = PROGRESS_INTERVAL_BYTES;
    onStage('ONNX native: đang sao chép ' + fileName
      + ' từ Cache API vào vùng lưu trữ riêng (không tải lại qua mạng)');
    await plugin.beginFile({ fileName });
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        for (let offset = 0; offset < bytes.length; offset += TRANSFER_CHUNK_BYTES) {
          const piece = bytes.subarray(offset, Math.min(offset + TRANSFER_CHUNK_BYTES, bytes.length));
          await plugin.appendChunk({ fileName, base64: encodeBase64(piece) });
          copied += piece.length;
          if (copied >= nextNotice) {
            onStage('ONNX native: đã sao chép ' + Math.round(copied / 1048576)
              + ' MiB của ' + fileName);
            nextNotice += PROGRESS_INTERVAL_BYTES;
          }
        }
      }
      const result = await plugin.finishFile({ fileName });
      if (result.bytes !== copied) {
        throw new Error('Số byte chuyển sang ONNX native không khớp: ' + fileName);
      }
      onStage('ONNX native: sao chép xong ' + fileName + ' (' + Math.round(copied / 1048576) + ' MiB)');
    } finally {
      try { reader.releaseLock(); } catch {}
    }
  }
  const finalStatus = await plugin.status();
  if (!finalStatus.modelReady) {
    throw new Error('ONNX native chưa nhận đủ graph và trọng số, không thể suy luận.');
  }
}

export async function createNativeEmbeddingGemmaRuntime({
  provider,
  transformers,
  onStage = () => {},
  plugin = getNativeEmbeddingPlugin(),
  cacheStorage = globalThis.caches,
}) {
  if (provider?.id !== 'embeddinggemma') throw new Error('ONNX native mới hỗ trợ EmbeddingGemma 300M Q4.');
  if (!plugin) throw new Error('APK này không có plugin ONNX native. Không tự chuyển về WASM hay model khác.');
  await copyCachedModelToNative(plugin, provider, onStage, cacheStorage);
  onStage('ONNX native: nạp tokenizer EmbeddingGemma đã lưu trong Cache API');
  const tokenizer = await transformers.AutoTokenizer.from_pretrained(provider.modelId, {
    local_files_only: true,
  });
  onStage('ONNX native: khởi tạo phiên suy luận Android (CPU, Q4)');
  const loaded = await plugin.load({ backend: 'CPU' });
  onStage('ONNX native: sẵn sàng; backend=' + loaded.backend
    + '; tải phiên=' + (loaded.loadMs ?? 0) + 'ms');
  return {
    provider,
    async embed(texts, onMeasurement) {
      const tokenStart = Date.now();
      const tokenized = await tokenizer(texts, {
        padding: true,
        truncation: true,
        max_length: provider.maxLength,
      });
      const inputs = packNativeEmbeddingInputs(tokenized);
      const tokenizationMs = Date.now() - tokenStart;
      const result = await plugin.embed(inputs);
      if (!Array.isArray(result?.vectors) || result.vectors.length !== texts.length
        || result.vectors.some(vector => !Array.isArray(vector) || vector.length !== provider.dimensions)) {
        throw new Error('ONNX native trả về số lượng hoặc kích thước vector không hợp lệ.');
      }
      onMeasurement?.({ tokenizationMs, onnxMs: Number(result.onnxMs) || 0, backend: result.backend });
      // As in the WebView engine, vectors are L2 normalized before indexing.
      return result.vectors.map(row => {
        const values = row.map(Number);
        if (values.some(value => !Number.isFinite(value))) throw new Error('ONNX native trả vector NaN/Infinity.');
        const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
        return norm > 0 ? values.map(value => value / norm) : values;
      });
    },
    async dispose() {
      // Keep copied graph/weights on disk; only release the native ORT session.
      await plugin.unload();
    },
  };
}
