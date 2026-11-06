import assert from 'node:assert/strict';
import {
  EMBEDDING_PROVIDERS,
  configureTransformersEnvironment,
  createEmbeddingService,
  isNativeAndroidEmbeddingHost,
  createWorldInfoSyncJournal,
  planLocalEmbeddingBatch,
  createLocalEmbeddingBatchPlanner,
  resolveEmbeddingProvider,
  getEmbeddingProvider,
  formatEmbeddingQuery,
  formatEmbeddingDocument,
  cosineSimilarity,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
} from '../src/features/world-info/embedding-service.js';

// The Android APK uses ONNX native. Ordinary Android browsers must not
// be forced through a Capacitor plugin they do not have.
assert.equal(isNativeAndroidEmbeddingHost({
  navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
}), false);
assert.equal(isNativeAndroidEmbeddingHost({
  navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
  Capacitor: { getPlatform: () => 'web' },
}), false);
assert.equal(isNativeAndroidEmbeddingHost({
  navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
  Capacitor: { getPlatform: () => 'android' },
}), true);
assert.equal(isNativeAndroidEmbeddingHost({
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10)' },
  Capacitor: { getPlatform: () => 'android' },
}), false);

// Android WebView sets allowLocalModels=false, which conflicts with
// local_files_only=true when loading cached ONNX weights for offline sync.
{
  const env = {
    allowLocalModels: false,
    allowRemoteModels: true,
    useBrowserCache: false,
    useWasmCache: false,
  };
  configureTransformersEnvironment(env);
  assert.equal(env.allowLocalModels, true, 'browser cache-only sync requires local models enabled');
  assert.equal(env.allowRemoteModels, true, 'initial model download must remain possible');
  assert.equal(env.useBrowserCache, true);
  assert.equal(env.useWasmCache, true);
}
configureTransformersEnvironment(null);

assert.equal(EMBEDDING_PROVIDERS.length, 4);
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'embeddinggemma2' }).id, 'embeddinggemma2');
assert.equal(getEmbeddingProvider('embeddinggemma2').indexKey,
  'embeddinggemma2:text270m:int4:768:litertlm:v1');
assert.notEqual(getEmbeddingProvider('embeddinggemma').indexKey,
  getEmbeddingProvider('embeddinggemma2').indexKey,
  'the new model must NOT reuse old vectors');
assert.equal(getEmbeddingProvider('embeddinggemma2').dimensions, 768);
assert.equal(resolveEmbeddingProvider({}).id, 'gemini');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'embeddinggemma' }).id, 'embeddinggemma');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'qwen3' }).id, 'qwen3');
assert.equal(getEmbeddingProvider('missing').id, 'gemini');
assert.equal(getEmbeddingProvider('gemini').modelId, 'gemini-embedding-2');
assert.equal(getEmbeddingProvider('gemini').indexKey, 'gemini:gemini-embedding-2:v1');
assert.match(getEmbeddingProvider('gemini').label, /Stable/);


assert.equal(formatEmbeddingQuery('gemini', ' hello '), 'hello');
assert.equal(formatEmbeddingQuery('embeddinggemma2', 'hello'),
  'task: search result | query: hello');
assert.equal(formatEmbeddingDocument('embeddinggemma2', 'abc', 'Foo|Bar'),
  'title: Foo Bar | text: abc');
assert.equal(formatEmbeddingQuery('embeddinggemma', 'hello'), 'task: search result | query: hello');
assert.match(formatEmbeddingQuery('qwen3', 'hello'), /^Instruct: .+\nQuery:hello$/);
assert.equal(
  formatEmbeddingDocument('embeddinggemma', 'abc', 'Foo|Bar'),
  'title: Foo Bar | text: abc',
);
assert.equal(formatEmbeddingDocument('qwen3', 'abc'), 'abc');

assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
assert.equal(cosineSimilarity([1], [1, 2]), 0);

const entry = { name: 'Dragon', keys: ['fire', 'gate'], content: 'Lore text' };
assert.equal(
  buildEmbeddingEntryText(entry),
  'Name: Dragon | Keys: fire, gate | Content: Lore text',
);

const chunks = chunkEmbeddingText('a '.repeat(1200), 1000);
assert.ok(chunks.length >= 2);
assert.ok(chunks.every(chunk => chunk.length <= 1000));
assert.equal(chunkEmbeddingText('   ', 1000).length, 0);

assert.equal((await hashEmbeddingText('abc')).length, 64);

// The console must show a checkpoint while a long-running ONNX step is pending,
// then a warning with the last checkpoint if no progress is reported.
{
  const records = [];
  let clock = 1000;
  let heartbeat;
  let cleared = false;
  const journal = createWorldInfoSyncJournal(
    (level, category, message) => records.push({ level, category, message }),
    'embeddinggemma',
    {
      now: () => clock,
      setInterval: (fn, duration) => {
        assert.equal(duration, 15000);
        heartbeat = fn;
        return 12;
      },
      clearInterval: id => { assert.equal(id, 12); cleared = true; },
    },
  );
  journal.stage('Khởi tạo ONNX từ cache');
  assert.ok(records.some(item => item.category === 'system' && item.message.includes('Khởi tạo ONNX')));
  clock += 16000;
  heartbeat();
  assert.ok(records.some(item => item.message.includes('Đang chạy: Khởi tạo ONNX')));
  clock += 46000;
  heartbeat();
  assert.ok(records.some(item => item.level === 'warn' && item.message.includes('không có bước mới 62s')));
  journal.fail('khởi tạo ONNX', new Error('cannot initialize'));
  assert.ok(records.some(item => item.level === 'error' && item.message.includes('cannot initialize')));
  journal.close();
  assert.equal(cleared, true);
  const length = records.length;
  clock += 20000;
  heartbeat();
  assert.equal(records.length, length, 'closed journal must never emit more console entries');
}

// Failure during configuration must reach the system console instead of being
// hidden by the chat input's indefinite "Đang đồng bộ" state.
{
  const logs = [];
  const service = createEmbeddingService({
    getSettings: () => ({ enabled: false, mode: 'semantic', embedding_provider: 'embeddinggemma' }),
    logSystemMessage: (...args) => logs.push(args),
  });
  await assert.rejects(service.syncIndex('test-card', []), /Smart Scan hoặc Semantic Search đang tắt/);
  assert.ok(logs.some(args => String(args[2]).includes('Bắt đầu đồng bộ World Info')));
  assert.ok(logs.some(args => args[0] === 'error' && String(args[2]).includes('THẤT BẠI')));
}

// Existing production bridge captures console.warn/error into the system panel;
// the embedding service must still report when no explicit logger is injected.
{
  const previousWarn = console.warn;
  const previousError = console.error;
  const warnings = [];
  const errors = [];
  console.warn = message => warnings.push(String(message));
  console.error = message => errors.push(String(message));
  try {
    const service = createEmbeddingService({
      getSettings: () => ({ enabled: false, mode: 'semantic', embedding_provider: 'embeddinggemma' }),
    });
    await assert.rejects(service.syncIndex('test-card', []), /Smart Scan hoặc Semantic Search đang tắt/);
    assert.ok(warnings.some(message => message.includes('Bắt đầu đồng bộ World Info')));
    assert.ok(errors.some(message => message.includes('THẤT BẠI')));
  } finally {
    console.warn = previousWarn;
    console.error = previousError;
  }
}

// Memory-aware WASM batching, inspired by NgheTruyen's adaptive profiles.
// Never select a different model or Smart Scan mode based on these signals.
{
  const cfg = (providerId, deviceMemoryGB, hardwareConcurrency = 8, requestedBatchSize = 30) =>
    planLocalEmbeddingBatch(providerId, { deviceMemoryGB, hardwareConcurrency, requestedBatchSize });
  assert.equal(cfg('embeddinggemma', 2).maxBatch, 1, 'low-RAM Android must stay at batch 1');
  assert.equal(cfg('embeddinggemma', 4).maxBatch, 2);
  assert.equal(cfg('embeddinggemma', 8).maxBatch, 4);
  assert.equal(cfg('embeddinggemma2', 8).maxBatch, 4);
  assert.equal(cfg('embeddinggemma2', 2).maxBatch, 1);
  assert.equal(cfg('embeddinggemma', 0).maxBatch, 2, 'unknown memory must be conservative');
  assert.equal(cfg('embeddinggemma', 8, 2).maxBatch, 1, 'low-core device must be conservative');
  assert.equal(cfg('embeddinggemma', 8, 8, 1).maxBatch, 1, 'respect user entry batch limit');
  assert.equal(cfg('qwen3', 4).maxBatch, 1, 'large model must stay single on 4 GiB');
  assert.equal(cfg('qwen3', 8).maxBatch, 2, 'large model never expands to 4');
  assert.equal(planLocalEmbeddingBatch('embeddinggemma', { deviceMemoryGB: 8, lowMemory: true }).maxBatch, 1);
  assert.equal(cfg('unsupported-provider', 16).maxBatch, 1);

  const planner = createLocalEmbeddingBatchPlanner(cfg('embeddinggemma', 8));
  assert.equal(planner.next(8), 2, 'start with safe microbatch to measure throughput');
  assert.match(planner.report(2, 1000), /Tăng batch/);
  assert.equal(planner.next(10), 4);
  assert.match(planner.report(4, 5000), /Giảm batch/, 'batch 4 slower per item than 2');
  assert.equal(planner.next(10), 2);
  assert.equal(planner.report(2, 1000), '', 'do not oscillate back to 4');
  assert.equal(planner.next(1), 1);

  const single = createLocalEmbeddingBatchPlanner(cfg('qwen3', 4));
  assert.equal(single.next(9), 1);
  assert.equal(single.report(1, 2000), '');
  assert.equal(single.next(9), 1);
}

// We intentionally keep 1,000-character chunking and per-provider max_length
// unchanged. Shortening model context without rechunking would silently truncate
// Lorebook content and force an unintended index policy change.
assert.deepEqual(chunkEmbeddingText('abc', 1000), ['abc']);

console.log('M4 embedding service checks: OK');
