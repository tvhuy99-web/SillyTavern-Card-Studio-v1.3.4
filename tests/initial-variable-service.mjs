import assert from 'node:assert/strict';
import {
  extractInlineInitVariableBlocks,
  findInitVariableEntry,
  hasInitialVariables,
  inspectInitialVariablePipeline,
  mergeInitialVariableSources,
  parseInitialVariableDocument,
  seedInitialVariablesFromCard,
  selectInitialVariableOpening,
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
  inline: true,
});
assert.deepEqual(merged.sources, ['opening:initvar:0']);
assert.equal(merged.worldbookEntryFound, true);
assert.equal(merged.worldbookSuppressedByInline, true);
assert.equal(merged.inlineBlockCount, 1);
assert.equal(hasInitialVariables(merged.variables), true);

const yamlDocument = `'Hệ Thống Tu Luyện':
  cảnh_giới: Luyện Khí
  tầng: 3
  hoạt_động: true
  mô_tả: "Ổn định: có thể tu luyện"
  vật_phẩm:
    - Kiếm Gỗ
    - tên: Đan Dược
      số_lượng: 2
Nhân Vật:
  linh_thạch: 100
  thuộc_tính: [Kim, Mộc, "Hỏa"]
`;
assert.deepEqual(parseInitialVariableDocument(yamlDocument, () => { throw new Error('JSON5 rejected YAML'); }), {
  'Hệ Thống Tu Luyện': {
    cảnh_giới: 'Luyện Khí',
    tầng: 3,
    hoạt_động: true,
    mô_tả: 'Ổn định: có thể tu luyện',
    vật_phẩm: ['Kiếm Gỗ', { tên: 'Đan Dược', số_lượng: 2 }],
  },
  'Nhân Vật': {
    linh_thạch: 100,
    thuộc_tính: ['Kim', 'Mộc', 'Hỏa'],
  },
});

const yamlWorldbook = mergeInitialVariableSources(
  {},
  [{ comment: '[initvar] Khởi Tạo Biến Không Bật', enabled: false, content: yamlDocument }],
  '',
  () => { throw new Error('JSON5 rejected YAML'); },
);
assert.equal(yamlWorldbook.sources[0], 'worldbook:initvar');
assert.equal(yamlWorldbook.variables['Hệ Thống Tu Luyện'].tầng, 3);

const yamlInline = mergeInitialVariableSources(
  {},
  [{ comment: '[initvar] yaml', content: 'hp: 12' }],
  '<initvar>mp: 7\nlist:\n  - one\n  - two</initvar>',
  () => { throw new Error('JSON5 rejected YAML'); },
);
assert.deepEqual(yamlInline.variables, { mp: 7, list: ['one', 'two'] });
assert.equal(yamlInline.worldbookSuppressedByInline, true);

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
assert.equal(mismatchDiagnostic.classification, 'seed-produced-but-final-chat-empty');
assert.equal(mismatchDiagnostic.openings[1].inlineInitvarCount, 1);
assert.equal(mismatchDiagnostic.openings[1].seedResult.keyCount, 1);
assert.equal(mismatchDiagnostic.actualRuntimeSeed.openingSource, 'message0.originalRawContent');
assert.equal(mismatchDiagnostic.actualRuntimeSeed.result.keyCount, 1);

const selectedOpening = selectInitialVariableOpening(
  { first_mes: 'short opening without variables' },
  [{ originalRawContent: 'story<initvar>Hệ Thống: true</initvar>', content: 'story' }],
  'runtime content',
);
assert.equal(selectedOpening.source, 'message0.originalRawContent');
assert.equal(selectedOpening.hasInlineInitvar, true);

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
assert.equal(parseFailureDiagnostic.cardWorldbook.matches[0].parse.yaml.attempted, true);
assert.equal(parseFailureDiagnostic.cardWorldbook.matches[0].parse.yaml.ok, false);


const diagnosticShapeCard = {
  name: 'Ly Hỏa Tiên Ma Lục',
  first_mes: 'Lời mở đầu ngắn không chứa biến.',
  extensions: {
    tavern_helper: { variables: {} },
  },
  char_book: {
    entries: Array.from({ length: 117 }, (_, index) => index === 41
      ? {
          comment: '[initvar] Khởi Tạo Biến Không Bật',
          enabled: false,
          content: `'Hệ Thống Tu Luyện':
  cảnh_giới: Luyện Khí
  tầng: 1
  linh_căn:
    - Hỏa
  trạng_thái: bình thường
Nhân Vật:
  tên: Lý Hỏa
  linh_thạch: 50
`,
        }
      : { comment: 'entry-' + index, enabled: true, content: '' }),
  },
};
const diagnosticShapeMessages = [{
  role: 'model',
  content: 'Nội dung hiển thị đã qua xử lý.',
  originalRawContent: `Phần mở đầu
<initvar>
Hệ Thống Tu Luyện:
  cảnh_giới: Trúc Cơ
  tầng: 2
  linh_căn: [Hỏa, Mộc]
Nhân Vật:
  tên: Lý Hỏa
  linh_thạch: 88
</initvar>
Phần HTML tiếp theo
`,
}];
const diagnosticOpening = selectInitialVariableOpening(
  diagnosticShapeCard,
  diagnosticShapeMessages,
  diagnosticShapeMessages[0].originalRawContent,
);
assert.equal(diagnosticOpening.source, 'message0.originalRawContent');
assert.equal(diagnosticOpening.hasInlineInitvar, true);

const diagnosticSeed = seedInitialVariablesFromCard(
  {},
  diagnosticShapeCard,
  diagnosticOpening.text,
  JSON.parse,
);
assert.deepEqual(diagnosticSeed.variables, {
  'Hệ Thống Tu Luyện': {
    cảnh_giới: 'Trúc Cơ',
    tầng: 2,
    linh_căn: ['Hỏa', 'Mộc'],
  },
  'Nhân Vật': {
    tên: 'Lý Hỏa',
    linh_thạch: 88,
  },
});
assert.deepEqual(diagnosticSeed.sources, ['opening:initvar:0']);
assert.equal(diagnosticSeed.worldbookEntryFound, true);
assert.equal(diagnosticSeed.worldbookSuppressedByInline, true);

const diagnosticShapeReport = inspectInitialVariablePipeline({
  baseVariables: {},
  card: diagnosticShapeCard,
  messages: diagnosticShapeMessages,
  messageId: 0,
  variableScopes: {
    chat: diagnosticSeed.variables,
    'message:0': diagnosticSeed.variables,
  },
  worldInfo: diagnosticShapeCard.char_book.entries,
  originalContent: diagnosticShapeMessages[0].originalRawContent,
  parseStructured: JSON.parse,
});
assert.equal(diagnosticShapeReport.classification, 'final-chat-populated');
assert.equal(diagnosticShapeReport.cardWorldbook.matches[0].enabled, false);
assert.equal(diagnosticShapeReport.cardWorldbook.matches[0].parse.parserUsed, 'yaml');
assert.equal(diagnosticShapeReport.openings[1].inlineBlocks[0].parse.parserUsed, 'yaml');
assert.equal(diagnosticShapeReport.actualRuntimeSeed.openingSource, 'message0.originalRawContent');
assert.equal(diagnosticShapeReport.actualRuntimeSeed.result.keyCount, 2);

const yamlDiagnostic = inspectInitialVariablePipeline({
  baseVariables: {},
  card: {
    first_mes: 'short',
    char_book: { entries: [{ comment: '[initvar] Khởi Tạo Biến Không Bật', enabled: false, content: yamlDocument }] },
  },
  messages: [{
    role: 'model',
    originalRawContent: 'story<initvar>Hệ Thống Tu Luyện:\n  tầng: 9</initvar>',
    content: 'story',
  }],
  messageId: 0,
  variableScopes: { chat: { 'Hệ Thống Tu Luyện': { tầng: 9 } }, 'message:0': { 'Hệ Thống Tu Luyện': { tầng: 9 } } },
  worldInfo: [],
  parseStructured: () => { throw new Error('JSON5 rejected YAML'); },
});
assert.equal(yamlDiagnostic.classification, 'final-chat-populated');
assert.equal(yamlDiagnostic.actualRuntimeSeed.openingSource, 'message0.originalRawContent');
assert.equal(yamlDiagnostic.openings[1].inlineBlocks[0].parse.parserUsed, 'yaml');

console.log('initial variable service tests: OK');
