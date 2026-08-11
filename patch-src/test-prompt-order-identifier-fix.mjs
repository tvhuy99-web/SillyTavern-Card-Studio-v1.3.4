import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/prompt-order-identifier-fix-v1.3.6.js', import.meta.url), 'utf8');

const context = vm.createContext({
  console,
  Map,
  Set,
  WeakSet,
  JSON,
  Object,
  Array,
  String,
  structuredClone,
});
context.window = context;
vm.runInContext(source, context, { filename: 'prompt-order-identifier-fix-v1.3.6.js' });

const parsed = context.JSON.parse(JSON.stringify({
  version: 1,
  type: 'character',
  data: {
    prompts: [
      { identifier: 'main', system_prompt: true },
      { identifier: 'custom-a', role: 'system', content: 'A' },
      null,
    ],
    prompt_order: [
      { identifier: 'main', enabled: true },
      undefined,
      { identifier: 'custom-a', enabled: true },
      { identifier: 'ghost', enabled: true },
    ],
  },
}));
assert.equal(parsed.data.prompts.length, 2);
assert.deepEqual(Array.from(parsed.data.prompt_order, entry => entry.identifier), ['main', 'custom-a']);

const grouped = {
  prompts: [
    { identifier: 'custom-b', content: 'B' },
    undefined,
  ],
  prompt_order: [
    {
      character_id: 100000,
      order: [
        { identifier: 'main', enabled: true },
        { identifier: 'custom-b', enabled: true },
        undefined,
        { identifier: 'missing-custom', enabled: true },
      ],
    },
    undefined,
  ],
};
context.JSON.stringify(grouped);
assert.equal(grouped.prompts.length, 1);
assert.equal(grouped.prompt_order.length, 1);
assert.deepEqual(Array.from(grouped.prompt_order[0].order, entry => entry.identifier), ['main', 'custom-b']);

const unrelated = { prompts: ['hello', null, 'world'] };
const unrelatedJson = context.JSON.stringify(unrelated);
assert.equal(unrelatedJson, '{"prompts":["hello",null,"world"]}');
assert.equal(unrelated.prompts.length, 3);

const promptOrderMap = new context.Map([
  ['main', { identifier: 'main', enabled: true }],
  ['custom-a', { identifier: 'custom-a', enabled: true }],
]);
const recovered = promptOrderMap.get('rendered-but-missing');
assert.equal(recovered.identifier, 'rendered-but-missing');
assert.equal(recovered.enabled, false);

const normalMap = new context.Map([['x', { value: 1 }]]);
assert.equal(normalMap.get('missing'), undefined);

const cloned = context.structuredClone({
  prompts: [{ identifier: 'custom-c', content: 'C' }],
  prompt_order: [{ identifier: 'custom-c', enabled: true }, undefined],
});
assert.equal(cloned.prompt_order.length, 1);

assert.equal(context.__STS_PROMPT_ORDER_FIX__.version, '1.3.6');
assert.ok(context.__STS_PROMPT_ORDER_FIX__.stats.removedInvalidOrderEntries >= 2);
assert.equal(context.__STS_PROMPT_ORDER_FIX__.stats.recoveredMapLookups, 1);

console.log('prompt order identifier fix tests: OK');
