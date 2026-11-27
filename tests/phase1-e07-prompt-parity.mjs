import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractStoryContent } from '../src/features/prompts/story-content.js';
import {
  assemblePrompt,
  buildBaseSections,
  createPromptAssembler,
} from '../src/features/prompts/prompt-assembler.js';
import { buildConversationPrompt } from '../src/features/prompts/prompt-service.js';
import { createMacroProcessing } from '../src/features/prompts/macro-processing.js';
import { createRegexProcessing } from '../src/features/chat/regex-processing.js';
import { createTableProcessing } from '../src/features/rpg/table-processing.js';
import { buildSmartStateBlock } from '../src/features/state/smart-state-service.js';
import { normalizePromptVariableScopes } from '../src/features/state/variable-scope-service.js';
import { normalizePresetConfig } from '../src/features/presets/prompt-normalizer.js';

const root = fileURLToPath(new URL('../', import.meta.url));

for (const removed of [
  'src/features/prompts/legacy-prompt-builder.js',
  'assets/recovered/features/prompts/legacy-prompt-builder.js',
  'src/providers/common/legacy-response-utils.js',
  'src/providers/common/legacy-transport.js',
  'src/providers/common/legacy-generation-adapters.js',
]) {
  assert.equal(existsSync(resolve(root, removed)), false, `Expected legacy file to be deleted: ${removed}`);
}

function getPathValue(target, path) {
  const cleanPath = String(path || '')
    .replace(/^stat_data\./, '')
    .replace(/^variables\./, '')
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1');
  const segments = cleanPath.split('.').filter(Boolean);
  let current = target;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

function setPathValue(target, path, value) {
  const cleanPath = String(path || '')
    .replace(/^stat_data\./, '')
    .replace(/^variables\./, '')
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1');
  const segments = cleanPath.split('.').filter(Boolean);
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (current[segment] == null || typeof current[segment] !== 'object') {
      current[segment] = /^\d+$/.test(segments[index + 1]) ? [] : {};
    }
    current = current[segment];
  }
  current[segments[segments.length - 1]] = value;
}

function isTuple(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[1] === 'string';
}

function createSharedDependencies({
  regexEngineMode = 'official-local',
  globalVariables = { campaign: 'Chronicles', rank: 2 },
  ejsRunner = null,
} = {}) {
  const logs = [];
  const macros = createMacroProcessing({});
  const getMode = () => regexEngineMode;
  const regex = createRegexProcessing({ readCardRuntimeEngineMode: getMode });
  const tables = createTableProcessing({ HarmCategory: {}, HarmBlockThreshold: {}, parseRelaxedJson: text => JSON.parse(text) });

  const getVariable = (variables, path, fallback = undefined, unwrap = true) => {
    const value = getPathValue(variables, path);
    if (unwrap && isTuple(value)) return value[0];
    return value === undefined ? fallback : value;
  };

  const mutateVariable = (variables, operation, path, operand) => {
    const clone = JSON.parse(JSON.stringify(variables));
    const write = nextValue => {
      const existing = getPathValue(clone, path);
      setPathValue(clone, path, isTuple(existing) ? [nextValue, existing[1]] : nextValue);
    };
    if (operation === 'set') {
      write(operand);
    } else if (operation === 'add') {
      const current = getVariable(clone, path, undefined, true);
      if (current == null) {
        write(operand);
      } else if (typeof current === 'number' && !Number.isNaN(Number(operand))) {
        write(current + Number(operand));
      } else if (Array.isArray(current)) {
        current.push(operand);
      } else {
        write(String(current) + String(operand));
      }
    }
    return clone;
  };

  const runIsolatedScript = ejsRunner || (async (_workerSource, payload) => {
    const template = String(payload.template || '');
    const rendered = template.replace(/<%=\s*([^%]+?)\s*%>/g, (_match, expr) => {
      const trimmed = expr.trim();
      if (trimmed === 'char') return String(payload.characterName || '');
      if (trimmed === 'user') return String(payload.variables?.user || 'User');
      const getvarMatch = trimmed.match(/^getvar\(['"]([^'"]+)['"]\)$/);
      if (getvarMatch) {
        const val = getVariable(payload.variables, getvarMatch[1]);
        return val === undefined ? '' : String(val);
      }
      const getwiMatch = trimmed.match(/^await\s+getwi\(['"]([^'"]+)['"]\)$/);
      if (getwiMatch) {
        const entry = (payload.entries || []).find(
          item => item.comment === getwiMatch[1]
            || item.name === getwiMatch[1]
            || (item.keys || []).includes(getwiMatch[1]),
        );
        return entry ? String(entry.content || '') : '';
      }
      return String(payload.variables?.[trimmed] ?? '');
    });
    return { ok: true, output: rendered };
  });

  return {
    logs,
    getRegexEngineMode: getMode,
    mutateVariable: mutateVariable,
    defaultMythicSystemPrompt: tables.defaultMythicSystemPrompt,
    expandBasicMacros: macros.expandBasicMacros,
    resolvePromptOverride: macros.resolvePromptOverride,
    runIsolatedScript: runIsolatedScript,
    createRpgRowSnapshot: tables.createRpgRowSnapshot,
    getVariable: getVariable,
    resolveCharacterName: macros.resolveCharacterName,
    formatRpgHybridTable: tables.formatRpgHybridTable,
    expandRandomMacros: macros.expandRandomMacros,
    buildMythicPrompt: tables.buildMythicPrompt,
    extractRegexScripts: macros.extractRegexScripts,
    __stsBuildSmartStateBlock: buildSmartStateBlock,
    __stsNormalizePromptVariableScopes: normalizePromptVariableScopes,
    __stsReadGlobalVariables: () => ({ ...globalVariables }),
    filterRpgDatabaseByActiveEntries: tables.filterRpgDatabaseByActiveEntries,
    processRegex: regex.processRegex,
    loadOptionalModule: async () => ({ default: {} }),
    logSystemMessage: (...entry) => logs.push(entry),
  };
}

assert.equal(
  extractStoryContent('<thinking>internal plan</thinking><content>The lantern flickers softly.</content><UpdateVariable>{"hp":9}</UpdateVariable>'),
  'The lantern flickers softly.',
);
assert.equal(
  extractStoryContent('<inner_monologue>plan</inner_monologue>Hello world!\n<tableThink>t</tableThink><tableEdit>e</tableEdit>\n[CHOICE: Go north]'),
  'Hello world!',
);
assert.equal(
  extractStoryContent('<plan>hidden</plan>Visible line.\n<StatusPlaceHolderImpl/>'),
  'Visible line.',
);
assert.equal(extractStoryContent(''), '');

const deps = createSharedDependencies();
const assembler = createPromptAssembler(deps);

const card = {
  name: 'Lyra',
  description: 'A starlight archivist.',
  personality: 'Calm and observant.',
  scenario: 'Inside the glass observatory.',
  system_prompt: 'Stay strictly in character as {{char}}.',
  post_history_instructions: 'End with a sensory detail.',
  character_book: {
    entries: [
      {
        uid: 'wi-before',
        comment: 'Observatory',
        keys: ['observatory'],
        content: 'The dome tracks three moons.',
        enabled: true,
        constant: true,
        position: 'before_char',
        insertion_order: 10,
      },
      {
        uid: 'wi-after',
        comment: 'Astrolabe',
        keys: ['astrolabe'],
        content: 'The brass astrolabe hums when {{char}} speaks.',
        enabled: true,
        constant: false,
        position: 'after_char',
        insertion_order: 20,
      },
    ],
  },
  extensions: {
    regex_scripts: [
      {
        id: 'rx-1',
        scriptName: 'Normalize title',
        findRegex: '/\\barchivist\\b/gi',
        replaceString: 'chronicler',
        placement: [1, 2],
        disabled: false,
        markdownOnly: false,
        promptOnly: true,
      },
    ],
  },
  rpg_data: {
    settings: { enabled: true, mode: 'hybrid' },
    tables: [
      {
        config: { id: 'inv', name: 'Inventory', columns: [{ id: 'item', label: 'Item' }, { id: 'qty', label: 'Qty' }] },
        data: { rows: [['r1', 'Lantern', '1']] },
      },
    ],
  },
};

const preset = normalizePresetConfig({
  name: 'GoldenPreset',
  prompts: [
    { identifier: 'main', name: 'Main', role: 'system', content: 'Main system directive for {{char}} and {{user}}.', enabled: true },
    { identifier: 'worldInfoBefore', name: 'WI Before', marker: true, enabled: true },
    { identifier: 'charDescription', name: 'Char Desc', marker: true, enabled: true },
    { identifier: 'worldInfoAfter', name: 'WI After', marker: true, enabled: true },
    { identifier: 'chatHistory', name: 'Chat History', role: 'system', content: '{{current_page_history}}\n{{last_turn}}', enabled: true },
    { identifier: 'customMacro', name: 'Macro Step', role: 'system', content: '{{addvar::gold::7}}Gold={{getvar::gold}} Campaign={{getglobalvar::campaign}}', enabled: true },
  ],
  prompt_order: [{
    character_id: 100001,
    order: [
      { identifier: 'main', enabled: true },
      { identifier: 'worldInfoBefore', enabled: true },
      { identifier: 'charDescription', enabled: true },
      { identifier: 'worldInfoAfter', enabled: true },
      { identifier: 'chatHistory', enabled: true },
      { identifier: 'customMacro', enabled: true },
    ],
  }],
});

const { baseSections } = assembler.buildBaseSections(card, preset);
assert.ok(Array.isArray(baseSections) && baseSections.length > 0, 'buildBaseSections must return non-empty baseSections');

const messages = [
  { id: 'm1', role: 'user', content: 'Tell me about the astrolabe, archivist.' },
  { id: 'm2', role: 'model', content: '<thinking>checking</thinking><content>The astrolabe points north.</content>' },
];

const assembled = await assembler.assemblePrompt(
  baseSections,
  messages,
  'Keep tension subtle.',
  card,
  [],
  10,
  { gold: 5 },
  null,
  [],
  'standard',
  'Alden',
  null,
  card.character_book.entries,
  'after_char',
  preset,
  false,
  'Alden is a traveling cartographer.',
);

assert.equal(typeof assembled.fullPrompt, 'string');
assert.ok(assembled.fullPrompt.includes('Lyra'), 'Prompt should contain character name');
assert.ok(assembled.fullPrompt.includes('Alden'), 'Prompt should contain user name');
assert.ok(assembled.fullPrompt.includes('The dome tracks three moons.'), 'Prompt should include before_char World Info');
assert.ok(assembled.fullPrompt.includes('The brass astrolabe hums when Lyra speaks.'), 'Prompt should include after_char World Info');
assert.ok(assembled.fullPrompt.includes('Gold=12'), 'Macro setvar+addvar+getvar should compute Gold=12');
assert.ok(assembled.fullPrompt.includes('Campaign=Chronicles'), 'Global variable macro should resolve');
assert.ok(assembled.fullPrompt.includes('chronicler'), 'Prompt-only regex script should rewrite archivist -> chronicler');
assert.equal(assembled.updatedVariables?.gold, 12, 'updatedVariables should persist gold=12');

const viaService = await buildConversationPrompt({
  state: {
    card,
    preset,
    messages,
    authorNote: 'Keep tension subtle.',
    longTermSummaries: [],
    variables: { gold: 5 },
    generatedLorebookEntries: [],
    worldInfoState: null,
    persona: { name: 'Alden', description: 'Alden is a traveling cartographer.' },
  },
  messages,
  summaryChunkSize: 10,
  lorebooks: [],
  contextMode: 'standard',
  persona: { name: 'Alden', description: 'Alden is a traveling cartographer.' },
  activeEntries: card.character_book.entries,
  worldInfoPlacement: 'after_char',
}, { assemblerDeps: deps });

assert.equal(viaService.fullPrompt, assembled.fullPrompt, 'prompt-service canonical path must match prompt-assembler directly');
assert.deepEqual(viaService.updatedVariables, assembled.updatedVariables);

const { baseSections: directBase } = buildBaseSections(card, preset, deps);
assert.deepEqual(directBase, baseSections);
const directAssembled = await assemblePrompt(
  directBase,
  messages,
  'Keep tension subtle.',
  card,
  [],
  10,
  { gold: 5 },
  null,
  [],
  'standard',
  'Alden',
  null,
  card.character_book.entries,
  'after_char',
  preset,
  false,
  'Alden is a traveling cartographer.',
  deps,
);
assert.equal(directAssembled.fullPrompt, assembled.fullPrompt);

console.log('Phase 1 WP-E07.2 canonical prompt engine & legacy removal checks: OK');
