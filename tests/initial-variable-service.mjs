import assert from 'node:assert/strict';
import {
  extractInlineInitVariableBlocks,
  findInitVariableEntry,
  hasInitialVariables,
  mergeInitialVariableSources,
} from '../src/features/state/initial-variable-service.js';

const entries = [
  { comment: 'other', content: '{"ignored":true}' },
  { comment: '[initvar]变量初始化勿开', content: '{"stat_data":{"hp":10},"world":{"day":1}}' },
];

assert.equal(findInitVariableEntry(entries)?.comment, '[initvar]变量初始化勿开');
assert.equal(findInitVariableEntry([{ comment: '[INITVAR] Seed' }])?.comment, '[INITVAR] Seed');
assert.equal(findInitVariableEntry([{ comment: '[InitVar]' }])?.comment, '[InitVar]');

const blocks = extractInlineInitVariableBlocks(
  'hello<initvar>{"stat_data":{"mp":5}}</initvar>world<INITVAR>\n{"extra":1}\n</INITVAR>',
);
assert.equal(blocks.length, 2);

const merged = mergeInitialVariableSources(
  { stat_data: { base: true, hp: 1 } },
  entries,
  '<initvar>{"stat_data":{"hp":20,"mp":5},"inline":true}</initvar>',
  JSON.parse,
);
assert.deepEqual(merged.variables, {
  stat_data: { base: true, hp: 20, mp: 5 },
  world: { day: 1 },
  inline: true,
});
assert.deepEqual(merged.sources, ['worldbook:initvar', 'opening:initvar:0']);
assert.equal(merged.worldbookEntryFound, true);
assert.equal(merged.inlineBlockCount, 1);
assert.equal(hasInitialVariables(merged.variables), true);

const yamlish = mergeInitialVariableSources(
  {},
  [{ comment: '[initvar] yaml', content: 'hp: 12' }],
  '<initvar>mp: 7</initvar>',
  text => {
    const [key, raw] = text.split(':').map(value => value.trim());
    return { [key]: Number(raw) };
  },
);
assert.deepEqual(yamlish.variables, { hp: 12, mp: 7 });

const invalid = mergeInitialVariableSources({}, [{ comment: '[initvar]', content: 'not structured' }], '', () => null);
assert.deepEqual(invalid.variables, {});
assert.equal(invalid.worldbookEntryFound, true);

console.log('initial variable service tests: OK');
