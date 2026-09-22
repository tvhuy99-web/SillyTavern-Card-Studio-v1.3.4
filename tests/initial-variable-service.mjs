import assert from 'node:assert/strict';
import {
  extractInlineInitVariableBlocks,
  findInitVariableEntry,
  hasInitialVariables,
  inspectInitialVariablePipeline,
  mergeInitialVariableSources,
  seedInitialVariablesFromCard,
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

const seededCard = seedInitialVariablesFromCard(
  {},
  {
    first_mes: '<initvar>{"fromOpening":3}</initvar>',
    extensions: {
      TavernHelper_variables: '{"fromExtension":1}',
      tavern_helper: [['variables', '{"fromArray":2}']],
    },
    char_book: {
      entries: [{ comment: '[INITVAR] seed', content: '{"fromWorldbook":4}' }],
    },
  },
  undefined,
  JSON.parse,
);
assert.deepEqual(seededCard.variables, {
  fromExtension: 1,
  fromArray: 2,
  fromWorldbook: 4,
  fromOpening: 3,
});

const invalid = mergeInitialVariableSources({}, [{ comment: '[initvar]', content: 'not structured' }], '', () => null);
assert.deepEqual(invalid.variables, {});
assert.equal(invalid.worldbookEntryFound, true);

const mismatchDiagnostic = inspectInitialVariablePipeline({
  baseVariables: {},
  card: { first_mes: '', char_book: { entries: [] } },
  messages: [{ role: 'model', originalRawContent: '<initvar>{"fromMessage":7}</initvar>', content: 'hello' }],
  messageId: 0,
  variableScopes: { chat: {}, 'message:0': {} },
  worldInfo: [],
  parseStructured: JSON.parse,
});
assert.equal(mismatchDiagnostic.classification, 'runtime-opening-source-mismatch');
assert.equal(mismatchDiagnostic.openings[1].inlineInitvarCount, 1);
assert.equal(mismatchDiagnostic.openings[1].seedResult.keyCount, 1);
assert.equal(mismatchDiagnostic.actualRuntimeSeed.result.keyCount, 0);

const worldInfoOnlyDiagnostic = inspectInitialVariablePipeline({
  baseVariables: {},
  card: { first_mes: '', char_book: { entries: [] } },
  messages: [{ role: 'model', content: 'hello' }],
  messageId: 0,
  variableScopes: { chat: {}, 'message:0': {} },
  worldInfo: [{ comment: '[initvar] external', content: '{"outside":1}' }],
  parseStructured: JSON.parse,
});
assert.equal(worldInfoOnlyDiagnostic.classification, 'initvar-only-in-runtime-worldinfo');
assert.equal(worldInfoOnlyDiagnostic.runtimeWorldInfo.exactMarkerCount, 1);

const parseFailureDiagnostic = inspectInitialVariablePipeline({
  baseVariables: {},
  card: { first_mes: '', char_book: { entries: [{ comment: '[initvar]', content: 'not structured' }] } },
  messages: [],
  messageId: 0,
  variableScopes: { chat: {}, 'message:0': {} },
  worldInfo: [],
  parseStructured: () => null,
});
assert.equal(parseFailureDiagnostic.classification, 'sources-detected-but-seed-empty');
assert.equal(parseFailureDiagnostic.cardWorldbook.matches[0].parse.parsed.keyCount, 0);
assert.equal(parseFailureDiagnostic.cardWorldbook.matches[0].parse.json.ok, false);

console.log('initial variable service tests: OK');
