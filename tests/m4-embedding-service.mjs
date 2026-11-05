import assert from 'node:assert/strict';
import {
  EMBEDDING_PROVIDERS,
  configureTransformersEnvironment,
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

console.log('M4 embedding service checks: OK');
