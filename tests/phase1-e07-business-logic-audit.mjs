import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRegexProcessing } from '../src/features/chat/regex-processing.js';
import { createTableProcessing } from '../src/features/rpg/table-processing.js';
import { createKeywordMatching } from '../src/features/world-info/keyword-matching.js';
import { createMacroProcessing } from '../src/features/prompts/macro-processing.js';
import { createSummaryGeneration } from '../src/features/chat/summary-generation.js';
import * as arenaState from '../src/features/arena/state-machine.js';
import {
  normalizePromptVariableScopes,
  readGlobalVariables,
  writeGlobalVariables,
} from '../src/features/state/variable-scope-service.js';
import {
  buildSmartStateBlock,
  normalizeSmartStateVariables,
  serializeSmartStateVariables,
} from '../src/features/state/smart-state-service.js';
import { extractStoryContent } from '../src/features/prompts/story-content.js';

// ============================================================================
// 1. Static Readability & De-minification Audit across all 10 recovered files
// ============================================================================
const RECOVERED_FILES = [
  'src/features/chat/regex-processing.js',
  'src/features/rpg/table-processing.js',
  'src/features/state/script-execution.js',
  'src/features/world-info/keyword-matching.js',
  'src/features/prompts/macro-processing.js',
  'src/features/chat/hooks/use-conversation.js',
  'src/features/chat/hooks/use-slash-commands.js',
  'src/features/chat/hooks/use-smart-scan.js',
  'src/features/chat/hooks/use-response-pipeline.js',
  'src/features/chat/hooks/use-diagnostics.js',
];

for (const relativePath of RECOVERED_FILES) {
  const source = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  assert.equal(
    /(?:^|[^\w$])!0(?:$|[^\w$])/.test(source),
    false,
    `${relativePath} must not contain minified "!0"`,
  );
  assert.equal(
    /(?:^|[^\w$])!1(?:$|[^\w$])/.test(source),
    false,
    `${relativePath} must not contain minified "!1"`,
  );
  assert.equal(
    /\bvoid\s+0\b/.test(source),
    false,
    `${relativePath} must not contain minified "void 0"`,
  );
  const lines = source.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  assert.ok(
    maxLineLength <= 500,
    `${relativePath} has a compressed line of ${maxLineLength} chars (> 500)`,
  );
}

// ============================================================================
// 2. regex-processing audit (official-local + legacy masking)
// ============================================================================
{
  let mode = 'official-local';
  const { processRegex } = createRegexProcessing({ Co: () => mode });

  const official = processRegex(
    'Hello [TAG:Aria]!\n```html\n<div class="hud">HP 90</div>\n```',
    [
      {
        scriptName: 'ReplaceTag',
        findRegex: '/\\[TAG:({{char}})\\]/g',
        replaceString: 'Commander $1',
        substituteRegex: 2,
        placement: [2],
        markdownOnly: true,
        minDepth: 0,
        maxDepth: 2,
      },
      {
        scriptName: 'OutOfDepth',
        findRegex: '/Hello/g',
        replaceString: 'SHOULD_NOT_RUN',
        placement: [2],
        minDepth: 3,
      },
    ],
    [2],
    {
      isMarkdown: true,
      isPrompt: false,
      depth: 1,
      macros: { char: 'Aria' },
    },
  );
  assert.equal(official.displayContent, 'Hello Commander Aria!');
  assert.equal(official.interactiveHtml, '<div class="hud">HP 90</div>');
  assert.deepEqual(official.interactiveHtmlBlocks, ['<div class="hud">HP 90</div>']);

  mode = 'legacy-masking';
  const legacyMasked = processRegex(
    'Story; : scale(2)\n```html\n<div>Protected</div>\n```',
    [
      {
        scriptName: 'RewriteStory',
        findRegex: '/Story/g',
        replaceString: 'Tale',
        placement: [2],
      },
    ],
    [2],
  );
  assert.ok(legacyMasked.displayContent.includes('Tale'));
  assert.ok(legacyMasked.displayContent.includes('transform: scale(2)'));
  assert.ok(legacyMasked.interactiveHtml?.includes('<div>Protected</div>'));
}

// ============================================================================
// 3. table-processing audit (hybrid table, snapshot, filter, parse, apply)
// ============================================================================
{
  const { Xs, Qs, Zs, el, tl, nl, Js } = createTableProcessing({
    ke: {
      HARM_CATEGORY_HARASSMENT: 'HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HATE',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEXUAL',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS',
    },
    Ce: { BLOCK_NONE: 'BLOCK_NONE' },
    As: text => JSON.parse(text),
  });

  const db = {
    globalRules: 'Keep inventory realistic.',
    tables: [
      {
        config: {
          id: 'bag',
          name: 'Inventory',
          description: 'Player items',
          lorebookLink: { enabled: true },
          aiRules: { insert: 'Add loot', update: 'Track count' },
          columns: [
            { label: 'Item', type: 'string' },
            { label: 'Qty', type: 'number' },
            { label: 'Thời gian', type: 'string' },
          ],
        },
        data: {
          rows: [
            ['r1', 'Lantern', 1, '08:00'],
            ['r2', 'Map', 1, '08:00'],
          ],
        },
      },
    ],
  };

  const filtered = el(db, [{ uid: 'mythic_bag_r1' }]);
  assert.equal(filtered.tables[0].data.rows.length, 1);
  assert.equal(filtered.tables[0].data.rows[0][1], 'Lantern');

  const hybrid = Xs(filtered);
  assert.ok(hybrid.includes('[[DB_TABLE_0]] Inventory'));
  assert.ok(hybrid.includes('["Lantern",1,"08:00"]'));

  const snapshot = Qs(filtered);
  assert.deepEqual(snapshot, [['r1']]);

  const mythicPrompt = Zs(Js, filtered, 'User: Light the lantern', 'Lore A');
  assert.ok(mythicPrompt.includes('[[DB_TABLE_0]] Inventory'));
  assert.ok(mythicPrompt.includes('Keep inventory realistic.'));

  const rawReply = [
    '<tableThink><!-- analyze --></tableThink>',
    '<tableEdit><!--',
    'updateRow(0, 0, {"1": 2, "2": "09:00"})',
    'insertRow(0, {"0": "Rope", "1": 1, "2": "09:05"})',
    '--></tableEdit>',
  ].join('\n');
  const actions = tl(rawReply, snapshot);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].rowId, 'r1');

  const applied = nl(db, actions);
  assert.equal(applied.newDb.tables[0].data.rows[0][2], 2);
  assert.equal(applied.newDb.tables[0].data.rows.length, 3);
  assert.ok(applied.notifications.some(note => note.includes('Inventory (Qty): 1 ➝ 2')));
  assert.ok(!applied.notifications.some(note => note.includes('Thời gian')));
  assert.ok(applied.notifications.some(note => note.includes('Mới: Rope (Inventory)')));
}

// ============================================================================
// 4. keyword-matching audit (boolean ops, whole words, selective, recursion, sticky)
// ============================================================================
{
  const { resolveWorldInfo } = createKeywordMatching({});
  const entries = [
    {
      uid: 'e_const',
      constant: true,
      enabled: true,
      insertion_order: 1,
      content: 'Constant lore',
    },
    {
      uid: 'e_trigger',
      keys: ['dragon & !asleep'],
      selective: true,
      secondary_keys: ['cave'],
      match_whole_words: true,
      enabled: true,
      sticky: 2,
      insertion_order: 5,
      content: 'Mentions emberstone inside the lair.',
    },
    {
      uid: 'e_recursive',
      keys: ['emberstone'],
      enabled: true,
      insertion_order: 10,
      extensions: { exclude_recursion: true },
      content: 'Emberstone glows faintly.',
    },
    {
      uid: 'e_cooldown',
      keys: ['dragon'],
      enabled: true,
      insertion_order: 15,
      content: 'Should be blocked by cooldown.',
    },
  ];

  const resolved = resolveWorldInfo(
    'The dragon guards the cave.',
    entries,
    {},
    { e_cooldown: { stickyDuration: 0, cooldownDuration: 2, lastActiveTurn: 1 } },
    {},
    [],
    false,
    3,
    0,
  );

  assert.deepEqual(
    resolved.activeEntries.map(entry => entry.uid),
    ['e_const', 'e_trigger', 'e_recursive'],
  );
  assert.equal(resolved.updatedRuntimeState.e_trigger.stickyDuration, 2);
  assert.equal(resolved.updatedRuntimeState.e_cooldown.cooldownDuration, 1);
}

// ============================================================================
// 5. macro-processing audit
// ============================================================================
{
  const { Vu, Ku, Ju, Xu, Zu } = createMacroProcessing({});
  assert.equal(Vu({ name: 'Aria', nickname: 'Captain Aria' }), 'Captain Aria');
  assert.equal(Ku('Override {{original}}', 'Base'), 'Override Base');
  assert.equal(Ku('   ', 'Base'), 'Base');

  const expanded = Ju('{{char}} greets {{user}} (<user>/<bot>): {{last_user_message}}', {
    card: { name: 'Aria', nickname: 'Captain Aria' },
    userName: 'Minh',
    messages: [{ role: 'user', content: 'Hello there' }],
    now: new Date('2026-01-15T10:20:30.000Z'),
  });
  assert.equal(expanded, 'Captain Aria greets Minh (Minh/Captain Aria): Hello there');

  const rolled = Number(Xu('{{roll:2d6+3}}'));
  assert.ok(rolled >= 5 && rolled <= 15);
  assert.ok(['red', 'blue'].includes(Xu('{{pick::red::blue}}')));

  const scripts = Zu(
    { regex: [{ scriptName: 'G1' }] },
    { extensions: { regex_scripts: [{ scriptName: 'P1' }] } },
  );
  assert.deepEqual(scripts, {
    globalScripts: [{ scriptName: 'G1' }],
    presetScripts: [{ scriptName: 'P1' }],
  });
}

// ============================================================================
// 6. summary-generation audit
// ============================================================================
{
  let capturedPrompt = '';
  const { generateSummary } = createSummaryGeneration({
    bd: extractStoryContent,
    ns: () => ({ source: 'aistudio', aistudio_tool_model: 'gemini-2.5-flash' }),
    Cs: () => false,
    __stsAiStudioToolText: async prompt => {
      capturedPrompt = prompt;
      return '  Summary OK  ';
    },
  });

  const summary = await generateSummary(
    [
      { role: 'user', content: 'Enter the vault.' },
      { role: 'model', content: '<thinking>plan</thinking><content>The heavy door opens.</content>' },
    ],
    'Nora',
    'SLICE:\n{{chat_history_slice}}',
  );
  assert.equal(summary, 'Summary OK');
  assert.ok(capturedPrompt.includes('User: Enter the vault.'));
  assert.ok(capturedPrompt.includes('Nora: The heavy door opens.'));
  assert.ok(!capturedPrompt.includes('<thinking>'));
}

// ============================================================================
// 7. arena/state-machine audit
// ============================================================================
{
  const arena = {
    enabled: true,
    modelA: { name: 'Model A', modelId: 'm-a', provider: 'gemini', content: 'Answer A', status: 'success', completed: true },
    modelB: { name: 'Model B', modelId: 'm-b', provider: 'proxy', content: '', status: 'pending', completed: false },
    selected: null,
  };
  assert.equal(arenaState.canSelect(arena.modelA), true);
  assert.equal(arenaState.canSelect(arena.modelB), false);
  assert.equal(arenaState.select(arena, 'A').ok, true);
  assert.equal(arenaState.select(arena, 'B').ok, false);

  const normalized = arenaState.normalizeMessagesOnLoad([{ id: 'm1', arena }]);
  assert.equal(normalized[0].arena.modelB.status, 'stopped');
  assert.equal(normalized[0].arena.modelB.completed, true);

  const retry = arenaState.prepareRetry(arena, 'B', { source: 'gemini' }, { provider: 'proxy', modelId: 'm-b' });
  assert.equal(retry.side.status, 'pending');
  assert.equal(retry.side.completed, false);
}

// ============================================================================
// 8. variable-scope-service & smart-state-service audit
// ============================================================================
{
  const backing = new Map();
  const storage = {
    getItem: key => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => backing.set(key, String(value)),
  };
  writeGlobalVariables({ act: 2 }, storage);
  assert.deepEqual(readGlobalVariables(storage), { act: 2 });

  const scopes = normalizePromptVariableScopes(
    { hp: 50, globals: { oldKey: true, act: 1 } },
    readGlobalVariables(storage),
  );
  assert.deepEqual(scopes.chat, { hp: 50 });
  assert.deepEqual(scopes.global, { oldKey: true, act: 2 });

  const normalizedVars = normalizeSmartStateVariables({
    $hidden: 1,
    hp: [50, 'HP'],
  });
  assert.deepEqual(normalizedVars, { hp: 50 });

  const smartBlock = buildSmartStateBlock({
    variables: { hp: [50, 'HP'] },
    messages: [{ role: 'model', interactiveHtml: '<section data-hud="main">Ready</section>' }],
    card: {},
  });
  assert.ok(smartBlock.smartStateBlock.includes('<LogicStore>'));
  assert.ok(smartBlock.smartStateBlock.includes('<VisualInterface>'));
  assert.ok(!smartBlock.smartStateBlock.includes('<MythicDatabase>'));

  const capped = serializeSmartStateVariables({ big: 'a'.repeat(3000) }, { maxChars: 1000 });
  assert.ok(capped.length <= 1000);
}

console.log('Phase 1 WP-FC-2 business logic audit checks: OK');
