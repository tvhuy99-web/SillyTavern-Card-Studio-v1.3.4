import assert from 'node:assert/strict';
import { scanWorldInfo } from '../src/features/world-info/smart-scan-service.js';

const baseInput = {
  scanInput: 'dragon gate',
  worldInfoState: {},
  worldInfoRuntime: {},
  worldInfoPinned: {},
  preset: {},
  promptHistory: [{ role: 'user', content: 'hello' }],
  content: 'dragon gate',
  variables: {},
  generatedEntries: [],
  sequence: 4,
  card: { name: 'Test', char_book: { entries: [
    { uid: 'a', keys: ['dragon'], content: 'A', enabled: true },
    { uid: 'b', keys: ['gate'], content: 'B', enabled: true },
  ] } },
};

{
  let resolveArgs;
  const result = await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: false, mode: 'keyword', semantic_threshold: 0.7 }),
    resolveWorldInfo: (...args) => (resolveArgs = args, { activeEntries: ['keyword'] }),
    logSystemMessage() {},
  });
  assert.deepEqual(result.activeEntries, ['keyword']);
  assert.deepEqual(resolveArgs[5], []);
  assert.equal(resolveArgs[6], false);
}

{
  let called = 0;
  let selected;
  const result = await scanWorldInfo({ ...baseInput, forceActiveUids: ['b'] }, {
    getSettings: () => ({ enabled: true, mode: 'llm_only', max_entries: 5 }),
    callSelectionModel: async () => { called += 1; return '["a"]'; },
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => (selected = args[5], { activeEntries: [] }),
    logSystemMessage() {},
  });
  assert.equal(called, 0);
  assert.deepEqual(selected, ['b']);
  assert.equal(result.selectionData.selectedItems[0].id, 'b');
}

{
  let selected;
  const result = await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'semantic', semantic_threshold: 0.5, max_semantic_entries: 20 }),
    embed: async () => [1, 0],
    loadIndex: async () => {},
    getIndex: () => [{ uid: 'a', vector: [1, 0] }, { uid: 'b', vector: [0, 1] }],
    cosine: (a, b) => a[0] * b[0] + a[1] * b[1],
    resolveWorldInfo: (...args) => (selected = args[5], { activeEntries: [] }),
    logSystemMessage() {},
  });
  assert.deepEqual(selected, ['a']);
  assert.equal(result.selectionData.selectedItems[0].score, 1);
}

{
  let resolveArgs;
  const logs = [];
  const result = await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'ultimate', max_entries: 5, semantic_threshold: 0.99 }),
    embed: async () => [0, 0],
    loadIndex: async () => {},
    getIndex: () => [],
    cosine: () => 0,
    callSelectionModel: async () => { throw new Error('selection offline'); },
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => (resolveArgs = args, { activeEntries: ['keyword-fallback'] }),
    logSystemMessage: (...args) => logs.push(args),
  });
  assert.deepEqual(result.activeEntries, ['keyword-fallback']);
  assert.equal(resolveArgs[6], false, 'ultimate mode must keep keyword fallback enabled');
  assert.ok(logs.some(item => String(item[2]).includes('deterministic World Info fallback')));
}

console.log('M4 Smart Scan service checks: OK');
