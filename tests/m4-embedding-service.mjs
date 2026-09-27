import assert from 'node:assert/strict';
import {
  EMBEDDING_PROVIDERS,
  resolveEmbeddingProvider,
  getEmbeddingProvider,
  formatEmbeddingQuery,
  formatEmbeddingDocument,
  cosineSimilarity,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
} from '../src/features/world-info/embedding-service.js';

assert.equal(EMBEDDING_PROVIDERS.length, 3);
assert.equal(resolveEmbeddingProvider({}).id, 'gemini');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'embeddinggemma' }).id, 'embeddinggemma');
assert.equal(resolveEmbeddingProvider({ embedding_provider: 'qwen3' }).id, 'qwen3');
assert.equal(getEmbeddingProvider('missing').id, 'gemini');

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
