import { recordId } from './embedding-provider-registry.js';
import {
  formatEmbeddingDocument,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
} from './embedding-text.js';
import {
  isAndroidHost,
  planLocalEmbeddingBatch,
  createLocalEmbeddingBatchPlanner,
} from './local-model-runtime.js';
import { createWorldInfoSyncJournal } from './embedding-sync-journal.js';

export async function syncEmbeddingIndexOwned(context, characterId, entries, onProgress, config, provider) {
  const {
    deps,
    indexRepository,
    memoryIndexes,
    memoryKey,
    runtimeManager,
    embedTexts,
    loadIndex,
  } = context;

  // The shipped app already mirrors console.warn/error into
  // "1. BẢNG ĐIỀU KHIỂN HỆ THỐNG (CONSOLE)" (category: console).
  // This path works without rebuilding the legacy minified UI bridge.
  const consoleLogger = (level, _category, message) => {
    if (level === 'error') console.error(message);
    else console.warn(message);
  };
  const journal = createWorldInfoSyncJournal(deps.logSystemMessage || consoleLogger, provider.id);
  let currentStep = 'kiểm tra chế độ';
  let completed = false;
  let lastModelProgress = -1;
  journal.stage('Bắt đầu đồng bộ World Info; mode=' + (config.mode || 'unknown')
    + '; provider=' + provider.modelId + '; số mục truyền vào=' + (entries?.length || 0)
    + '; nguồn=' + (provider.kind === 'local' ? 'OFFLINE' : 'ONLINE'));

  try {
    if (!config.enabled || !['semantic', 'hybrid_fast', 'ultimate'].includes(config.mode)) {
      throw new Error('Smart Scan hoặc Semantic Search đang tắt.');
    }
    if (!characterId) throw new Error('Character ID is required for sync.');
    if (provider.kind === 'local') {
      currentStep = 'khởi tạo runtime ONNX';
      journal.stage('Chuẩn bị model offline, chỉ sử dụng dữ liệu đã tải (local_files_only=true)');
      await runtimeManager.ensureLocalRuntime(provider, {
        localOnly: true,
        onStage: message => { currentStep = message; journal.stage(message); },
        onProgress: info => {
          if (info.status === 'loading') {
            const progress = Math.floor(Number(info.progress) || 0);
            if (progress >= lastModelProgress + 10 || (lastModelProgress < 0 && progress === 0)) {
              lastModelProgress = progress;
              journal.info('Nạp model: ' + progress + '%'
                + (info.file ? '; tệp=' + String(info.file).split('/').pop() : ''));
            }
          }
        },
      });
    }
    currentStep = 'đọc IndexedDB';
    journal.stage('Đọc chỉ mục embedding trong IndexedDB');
    await loadIndex(characterId, provider.id);
    journal.info('Đã đọc xong chỉ mục embedding');

    const key = memoryKey(characterId, provider);
    const index = memoryIndexes.get(key) || new Map();
    memoryIndexes.set(key, index);
    const searchable = (entries || []).filter(entry => entry?.uid && entry?.content?.trim());
    const pending = [];
    currentStep = 'băm nội dung các mục Lorebook';
    journal.stage('Kiểm tra ' + searchable.length + ' mục có nội dung và đối chiếu mã băm');

    await Promise.all(searchable.map(async entry => {
      const text = buildEmbeddingEntryText(entry);
      const contentHash = await hashEmbeddingText(text);
      const existing = index.get(entry.uid);
      if (!existing?.length || existing[0].contentHash !== contentHash) {
        pending.push({
          entry,
          chunks: chunkEmbeddingText(text, 1000),
          hash: contentHash,
        });
      }
    }));

    let complete = searchable.length - pending.length;
    const totalChunks = pending.reduce((sum, item) => sum + item.chunks.length, 0);
    journal.info('Đối chiếu xong: ' + complete + ' mục đã cập nhật; '
      + pending.length + ' mục cần tạo lại; tổng ' + totalChunks + ' đoạn embedding');
    onProgress?.(complete, searchable.length);

    const requestedBatchSize = Math.max(1, Math.floor(Number(config.embedding_batch_size) || 30));
    const batchSize = provider.id === 'qwen3'
      ? Math.min(requestedBatchSize, 4)
      : provider.id === 'embeddinggemma'
        ? Math.min(requestedBatchSize, 8)
        : provider.id === 'embeddinggemma2'
          ? Math.min(requestedBatchSize, 8)
          : requestedBatchSize;
    const memoryGB = typeof navigator === 'undefined' ? 0 : Number(navigator.deviceMemory) || 0;
    const cpuCores = typeof navigator === 'undefined' ? 0 : Number(navigator.hardwareConcurrency) || 0;
    const profile = provider.kind === 'local'
      ? planLocalEmbeddingBatch(provider.id, {
        requestedBatchSize,
        deviceMemoryGB: memoryGB,
        hardwareConcurrency: cpuCores,
      })
      : null;
    let batchPlanner = profile ? createLocalEmbeddingBatchPlanner(profile) : null;
    let nativeGemma2Profiled = false;

    // Existing users may already have all 334 entries indexed. Allow them to
    // benchmark the new CPU/GPU path on their next Sync without modifying or
    // rewriting any vectors.
    if (provider.id === 'embeddinggemma2' && pending.length === 0 && searchable.length > 0) {
      currentStep = 'đo LiteRT trên Lorebook đã đồng bộ';
      journal.stage('LiteRT-LM [ACCEL] Tất cả mục đã có chỉ mục; thử tăng tốc mà không tạo lại vectors');
      const runtime = await runtimeManager.ensureLocalRuntime(provider, { localOnly: true });
      const samples = searchable.slice(0, 2).map(entry => {
        const chunk = chunkEmbeddingText(buildEmbeddingEntryText(entry), 1000)[0];
        return formatEmbeddingDocument(provider.id, chunk, entry.name || entry.comment || 'none');
      });
      const tuneResult = await runtime.tune(samples, message => {
        currentStep = message;
        journal.info(message);
      });
      journal.info('LiteRT-LM [ACCEL] Batch đề xuất=' + tuneResult.preferredBatch
        + '; chỉ mục Lorebook không thay đổi');
      nativeGemma2Profiled = true;
    }

    journal.info('Cấu hình hiệu năng: ' + (profile
      ? 'WebView RAM≈' + (profile.deviceMemoryGB || 'không xác định') + 'GiB'
        + '; CPU=' + (profile.hardwareConcurrency || 'không xác định')
        + '; batch suy luận khởi đầu=' + profile.initialBatch
        + '; giới hạn=' + profile.maxBatch
      : 'API online, không thay đổi cách xử lý'));

    for (let offset = 0; offset < pending.length; offset += batchSize) {
      const group = pending.slice(offset, offset + batchSize);
      currentStep = 'xử lý nhóm mục ' + (offset + 1) + '-' + Math.min(offset + group.length, pending.length);
      journal.stage('Xử lý nhóm ' + (Math.floor(offset / batchSize) + 1) + '/'
        + Math.ceil(pending.length / batchSize) + ': ' + group.length + ' mục Lorebook');
      const flattened = [];
      for (const item of group) {
        item.chunks.forEach((chunk, chunkIndex) => {
          flattened.push({
            entry: item.entry,
            chunk,
            chunkIndex,
            hash: item.hash,
            text: formatEmbeddingDocument(provider.id, chunk, item.entry.name || item.entry.comment || 'none'),
          });
        });
      }

      // Entry batch size does not bound the number of chunks: a single long lorebook
      // entry can yield dozens of chunks and kill the Android WebView process.
      const texts = flattened.map(item => item.text);
      if (provider.id === 'embeddinggemma2' && !nativeGemma2Profiled && texts.length) {
        nativeGemma2Profiled = true;
        currentStep = 'đo hiệu năng LiteRT CPU/GPU trên văn bản Lorebook thực tế';
        journal.stage('LiteRT-LM [ACCEL] Đo các backend và batch, không đổi model hoặc chế độ Smart Scan');
        const runtime = await runtimeManager.ensureLocalRuntime(provider, { localOnly: true });
        const preference = await runtime.tune(texts.slice(0, 4), detail => {
          currentStep = detail;
          journal.info(detail);
        });
        // Prefer the measured LiteRT batch to WASM-specific WebView heuristics,
        // but never exceed the user's batch setting or the device RAM limit.
        const tunedBatch = Math.max(1, Math.min(
          Number(preference.preferredBatch) || 2,
          profile?.maxBatch || 1,
          requestedBatchSize,
        ));
        batchPlanner = {
          next: remaining => Math.min(Math.max(1, remaining), tunedBatch),
          report: () => '',
          get size() { return tunedBatch; },
        };
        journal.info('LiteRT-LM [ACCEL] Sử dụng batch ' + tunedBatch
          + ' sau khi đo, giới hạn an toàn theo cấu hình thiết bị');
      }

      const vectors = [];
      const groupStarted = Date.now();
      journal.info('Nhóm đang xử lý gồm ' + texts.length + ' đoạn; batch suy luận hiện tại='
        + (batchPlanner?.size || Math.max(1, texts.length)));
      for (let textOffset = 0; textOffset < texts.length;) {
        const batch = batchPlanner
          ? batchPlanner.next(texts.length - textOffset)
          : Math.max(1, texts.length - textOffset);
        currentStep = 'suy luận embedding đoạn ' + (textOffset + 1) + '/'
          + texts.length + ' (batch=' + batch + ')';
        journal.stage('Suy luận embedding đoạn ' + (textOffset + 1) + '-' + (textOffset + batch)
          + '/' + texts.length + ' trong nhóm; batch=' + batch);
        const metrics = {};
        const started = Date.now();
        const part = await embedTexts(provider, texts.slice(textOffset, textOffset + batch), {
          onMeasurement: result => Object.assign(metrics, result),
        });
        const inferenceMs = Date.now() - started;
        if (part.length !== batch || part.some(vector => !vector?.length)) {
          throw new Error('ONNX trả về ' + part.length + '/' + batch + ' embedding, không đúng số yêu cầu.');
        }
        vectors.push(...part);
        textOffset += batch;
        journal.info('[PERF] ' + textOffset + '/' + texts.length + ' đoạn; batch=' + batch
          + '; thời gian=' + inferenceMs + 'ms'
          + (metrics.tokenizationMs !== undefined ? '; tokenizer=' + metrics.tokenizationMs + 'ms' : '')
          + (metrics.onnxMs !== undefined ? '; ONNX=' + metrics.onnxMs + 'ms' : '')
          + (metrics.litertMs !== undefined ? '; LiteRT=' + metrics.litertMs + 'ms' : '')
          + (metrics.bridgeMs !== undefined ? '; JS/native=' + metrics.bridgeMs + 'ms' : '')
          + (metrics.backend ? '; backend=' + metrics.backend : '')
          + (metrics.pipelineMs !== undefined ? '; pipeline=' + metrics.pipelineMs + 'ms (gồm tokenizer + ONNX)' : '')
          + '; tốc độ=' + (batch * 1000 / Math.max(1, inferenceMs)).toFixed(2) + ' đoạn/s');
        const decision = batchPlanner?.report(batch, inferenceMs);
        if (decision) journal.info('[AUTOTUNE] ' + decision);
        if (provider.kind === 'local' && textOffset < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      journal.info('[PERF] Tổng thời gian tạo ' + vectors.length + ' vectors trong nhóm: '
        + (Date.now() - groupStarted) + 'ms');

      const byUid = new Map();
      flattened.forEach((item, vectorIndex) => {
        if (!byUid.has(item.entry.uid)) byUid.set(item.entry.uid, []);
        byUid.get(item.entry.uid).push(vectors[vectorIndex]);
      });

      currentStep = 'ghi vectors vào IndexedDB';
      const writeStarted = Date.now();
      journal.stage('Đã suy luận ' + vectors.length + ' vectors; bắt đầu ghi IndexedDB');
      for (const item of group) {
        const uid = item.entry.uid;
        const vectorsForUid = byUid.get(uid);
        if (!vectorsForUid || vectorsForUid.length !== item.chunks.length || vectorsForUid.some(vector => !vector?.length)) {
          throw new Error(`Dữ liệu trả về bị thiếu cho mục: ${item.entry.comment || uid}`);
        }
        const storedAt = Date.now();
        const newRecords = item.chunks.map((_, chunkIndex) => ({
          id: recordId(characterId, uid, chunkIndex, provider),
          uid,
          characterId,
          provider: provider.id,
          indexKey: provider.indexKey,
          contentHash: item.hash,
          vector: vectorsForUid[chunkIndex],
          updatedAt: storedAt,
        }));
        await indexRepository.replace(index.get(uid) || [], newRecords);
        index.set(uid, newRecords);
      }

      journal.info('[PERF] IndexedDB: lưu ' + group.length + ' mục, ' + vectors.length
        + ' vectors trong ' + (Date.now() - writeStarted) + 'ms; giao dịch nguyên tử từng UID');
      complete += group.length;
      journal.info('Đã ghi xong nhóm; tiến độ mục ' + complete + '/' + searchable.length);
      onProgress?.(Math.min(complete, searchable.length), searchable.length);
      if (offset + batchSize < pending.length && provider.id === 'gemini') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    currentStep = 'dọn các vector không còn dùng';
    journal.stage('Dọn các bản ghi đã xóa khỏi Lorebook');
    const validUids = new Set(searchable.map(entry => entry.uid));
    for (const [uid] of Array.from(index.entries())) {
      if (validUids.has(uid)) continue;
      await indexRepository.replace(index.get(uid) || [], []);
      index.delete(uid);
    }
    completed = true;
  } catch (error) {
    journal.fail(currentStep, error);
    throw error;
  } finally {
    // On Android the ONNX runtime competes with the chat UI for one WebView memory budget.
    if (isAndroidHost() && provider.kind === 'local') {
      journal.stage('Giải phóng runtime embedding offline để trả RAM cho Android WebView');
      try {
        await runtimeManager.disposeUnusedLocalRuntimes();
      } catch (error) {
        journal.warning('Lỗi giải phóng ONNX: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    if (completed) journal.success('ĐỒNG BỘ HOÀN TẤT; tất cả bước đã chạy xong');
    journal.close();
  }
}
