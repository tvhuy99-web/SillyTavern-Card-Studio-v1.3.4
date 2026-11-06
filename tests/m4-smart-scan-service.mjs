import assert from 'node:assert/strict';
import { scanWorldInfo, resolveSmartScanLlmModel } from '../src/features/world-info/smart-scan-service.js';

assert.equal(resolveSmartScanLlmModel(), 'gemini-3.5-flash-lite');
assert.equal(resolveSmartScanLlmModel('gemini-3.1-flash-lite-preview'), 'gemini-3.1-flash-lite-preview', 'respect explicitly selected models');
assert.equal(resolveSmartScanLlmModel('gemini-3.1-flash-lite'), 'gemini-3.1-flash-lite');
assert.equal(resolveSmartScanLlmModel('custom-llm-id'), 'custom-llm-id');

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
  let resolvedEntries;
  const result = await scanWorldInfo({
    ...baseInput,
    card: {
      ...baseInput.card,
      attached_lorebooks: ['Global Lore'],
    },
    lorebooks: [
      {
        name: 'Global Lore',
        book: { entries: [{ uid: 'global-1', keys: ['gate'], content: 'GLOBAL', enabled: true }] },
      },
      {
        name: 'Detached Lore',
        book: { entries: [{ uid: 'detached-1', keys: ['dragon'], content: 'DETACHED', enabled: true }] },
      },
    ],
  }, {
    getSettings: () => ({ enabled: false, mode: 'keyword' }),
    resolveWorldInfo: (...args) => {
      resolvedEntries = args[1];
      return { activeEntries: resolvedEntries };
    },
    logSystemMessage() {},
  });
  assert.ok(result.activeEntries.some(entry => entry.uid === 'global-1'));
  assert.ok(resolvedEntries.some(entry => entry.uid === 'global-1'));
  assert.ok(!resolvedEntries.some(entry => entry.uid === 'detached-1'));
}

{
  let resolvedEntries;
  await scanWorldInfo({
    ...baseInput,
    card: {
      ...baseInput.card,
      attached_lorebooks: ['Global Lore'],
      char_book: {
        entries: [
          ...baseInput.card.char_book.entries,
          {
            uid: 'hydrated-global-1',
            source_lorebook: 'Global Lore',
            keys: ['gate'],
            content: 'HYDRATED GLOBAL',
            enabled: true,
          },
        ],
      },
    },
    lorebooks: [
      {
        name: 'Global Lore',
        book: { entries: [{ uid: 'global-1', keys: ['gate'], content: 'GLOBAL', enabled: true }] },
      },
    ],
  }, {
    getSettings: () => ({ enabled: false, mode: 'keyword' }),
    resolveWorldInfo: (...args) => {
      resolvedEntries = args[1];
      return { activeEntries: resolvedEntries };
    },
    logSystemMessage() {},
  });
  assert.ok(resolvedEntries.some(entry => entry.uid === 'hydrated-global-1'));
  assert.ok(!resolvedEntries.some(entry => entry.uid === 'global-1'));
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
  assert.ok(logs.some(item => String(item[2]).includes('keyword scan is independently enabled')));
}

{
  let modelId;
  let selected;
  const logs = [];
  await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'llm_only', model: 'gemini-3.1-flash-lite-preview' }),
    callSelectionModel: async (_prompt, model) => { modelId = model; return '["a"]'; },
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => (selected = args[5], { activeEntries: [] }),
    logSystemMessage: (...args) => logs.push(args),
  });
  assert.equal(modelId, 'gemini-3.1-flash-lite-preview', 'selected model must never be replaced');
  assert.deepEqual(selected, ['a']);
}

{
  let resolveArgs;
  const logs = [];
  const result = await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'llm_only' }),
    callSelectionModel: async () => { throw new Error('model no longer available'); },
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => (resolveArgs = args, { activeEntries: ['keyword-fallback'] }),
    logSystemMessage: (...args) => logs.push(args),
  });
  assert.equal(resolveArgs[6], true, 'LLM-only API error must NOT restore keyword fallback');
  assert.ok(logs.some(item => String(item[2]).includes('model no longer available')));
  assert.match(result.smartScanLog.fullPrompt, /Nhiệm vụ: Chọn các ID/);
  assert.match(result.smartScanLog.rawResponse, /LỖI GỌI LLM.*model no longer available/);
}

{
  let resolveArgs;
  await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'llm_only' }),
    callSelectionModel: async () => '["invalid-uid"]',
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => (resolveArgs = args, { activeEntries: ['keyword-fallback'] }),
    logSystemMessage() {},
  });
  assert.deepEqual(resolveArgs[5], []);
  assert.equal(resolveArgs[6], true, 'unrecognized LLM IDs must not activate keyword fallback');
}

{
  // The journal must retain the actual request and actual raw response.
  let requestedPrompt = '';
  const result = await scanWorldInfo(baseInput, {
    getSettings: () => ({ enabled: true, mode: 'llm_only', model: 'my-custom-model' }),
    callSelectionModel: async (prompt, model) => {
      requestedPrompt = prompt;
      assert.equal(model, 'my-custom-model');
      return '```json\\n["a"]\\n```';
    },
    parseJson: JSON.parse,
    resolveWorldInfo: () => ({ activeEntries: [] }),
    logSystemMessage() {},
  });
  assert.equal(result.smartScanLog.fullPrompt, requestedPrompt);
  assert.equal(result.smartScanLog.rawResponse, '```json\\n["a"]\\n```');
}

{
  // No candidates means no API call; the journal must say so.
  let calls = 0;
  const result = await scanWorldInfo({
    ...baseInput,
    card: { char_book: { entries: [] } },
  }, {
    getSettings: () => ({ enabled: true, mode: 'llm_only' }),
    callSelectionModel: async () => { calls++; return '["a"]'; },
    parseJson: JSON.parse,
    resolveWorldInfo: (...args) => {
      assert.equal(args[6], true);
      return { activeEntries: [] };
    },
    logSystemMessage() {},
  });
  assert.equal(calls, 0);
  assert.match(result.smartScanLog.rawResponse, /SKIPPED/);
}

// Regression: SillyTavern numeric Lorebook UID vs IndexedDB string UID.
// A scored ID must reach the World Info resolver without string/number loss.
{
  const logs = [];
  const numericInput = {
    ...baseInput,
    card: { name: 'Numeric UID Card', fileName: 'numeric.png',
      char_book: { entries: [
        { uid: 123, name: 'Rồng', content: 'dragon lore', enabled: true },
        { uid: 456, name: 'Cổng', content: 'gate lore', enabled: true },
      ] } },
  };
  let resolverIds = null;
  let queried = 0;
  const deps = {
    getSettings: () => ({ enabled: true, mode: 'semantic', semantic_threshold: 0.1, max_semantic_entries: 20 }),
    embed: async () => { queried++; return [1, 0]; },
    loadIndex: async id => assert.equal(id, 'numeric.png'),
    getIndex: () => [
      { uid: '123', vector: [0.7, 0.3] },
      { uid: 456, vector: [0.3, 0.7] },
    ],
    cosine: (a, b) => (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...b),
    resolveWorldInfo: (...args) => { resolverIds = args[5]; return { activeEntries: [] }; },
    logSystemMessage: (...args) => logs.push(args),
  };
  for (const message of ['Mở cổng', 'Bước qua cổng', 'Tìm chìa khóa']) {
    const result = await scanWorldInfo({ ...numericInput, scanInput: message }, deps);
    assert.deepEqual(resolverIds, [123, 456], 'UID retains original entry type on every turn');
    assert.equal(result.selectionData.selectedItems.length, 2);
    assert.deepEqual(result.selectionData.selectedItems.map(item => item.id), [123, 456]);
  }
  assert.equal(queried, 3, 'independent semantic scans on three normal chat turns');
  assert.equal(logs.filter(item => String(item[2]).includes('[Semantic Scan][DIAG] mode=')).length, 3);
  assert.ok(logs.some(item => String(item[2]).includes('threshold=0.1')));
  assert.ok(logs.some(item => String(item[2]).includes('selected=2')));
}

// No more silent zero entries: report whether the index is missing, scored
// beneath threshold, or has incompatible vector dimensions.
{
  const logs = [];
  const deps = {
    getSettings: () => ({ enabled: true, mode: 'semantic', semantic_threshold: 0.1 }),
    embed: async () => [1, 0],
    loadIndex: async () => {},
    getIndex: () => [],
    cosine: () => 0,
    resolveWorldInfo: () => ({ activeEntries: [] }),
    logSystemMessage: (...args) => logs.push(args),
  };
  const result = await scanWorldInfo(baseInput, deps);
  assert.deepEqual(result.selectionData.selectedItems, []);
  assert.ok(logs.some(item => String(item[2]).includes('Chỉ mục rỗng')));
  deps.getIndex = () => [{ uid: 'a', vector: [1, 0, 0] }];
  await scanWorldInfo(baseInput, deps);
  assert.ok(logs.some(item => String(item[2]).includes('badDimensions=1')));
  assert.ok(logs.some(item => String(item[2]).includes('không có vector hợp lệ')));
  deps.getIndex = () => [{ uid: 'a', vector: [0, 1] }];
  await scanWorldInfo(baseInput, deps);
  assert.ok(logs.some(item => String(item[2]).includes('maxScore=0.000')));
  assert.ok(logs.some(item => String(item[2]).includes('không mục nào đạt threshold')));
}

// Forced UIDs only skip the semantic query on deliberate regenerate.
{
  let embedCalls = 0;
  const logs = [];
  const result = await scanWorldInfo({ ...baseInput, forceActiveUids: ['a'] }, {
    getSettings: () => ({ enabled: true, mode: 'semantic', semantic_threshold: 0.1 }),
    embed: async () => { embedCalls++; return [1, 0]; },
    resolveWorldInfo: (...args) => ({ activeEntries: [], selected: args[5] }),
    logSystemMessage: (...args) => logs.push(args),
  });
  assert.equal(embedCalls, 0);
  assert.ok(logs.some(item => String(item[2]).includes('forceActiveUids')));
  assert.deepEqual(result.selected, [], 'semantic-only mode continues to control actual entries');
}

console.log('M4 Smart Scan service checks: OK');
