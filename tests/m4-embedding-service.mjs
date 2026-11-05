import assert from 'node:assert/strict';
import {
  EMBEDDING_PROVIDERS,
  configureTransformersEnvironment,
  createEmbeddingService,
  createWorldInfoSyncJournal,
  resolveEmbeddingProvider,
  getEmbeddingProvider,
  formatEmbeddingQuery,
  formatEmbeddingDocument,
  cosineSimilarity,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
} from '../src/features/world-info/embedding-service.js';

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

assert.equal(EMBEDDING_PROVIDERS.length, 3);
assert.equal(resolveEmbeddingProvider({}).id, 'gemini');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'embeddinggemma' }).id, 'embeddinggemma');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'qwen3' }).id, 'qwen3');
assert.equal(getEmbeddingProvider('missing').id, 'gemini');
assert.equal(getEmbeddingProvider('gemini').modelId, 'gemini-embedding-2');
assert.equal(getEmbeddingProvider('gemini').indexKey, 'gemini:gemini-embedding-2:v1');
assert.match(getEmbeddingProvider('gemini').label, /Stable/);


assert.equal(formatEmbeddingQuery('gemini', ' hello '), 'hello');
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

// Regression guard: the generated M4 bridge must forward the console logger,
// otherwise the embedding service works but all diagnostic entries disappear.
{
  const { readFileSync } = await import('node:fs');
  const bridge = readFileSync(new URL('../build/transforms/m4-chat-generation.mjs', import.meta.url), 'utf8');
  assert.match(bridge, /addNetworkLog:e=>ol\.getState\(\)\.addNetworkLog\(e\),logSystemMessage:qu/);
}

console.log('M4 embedding service checks: OK');
