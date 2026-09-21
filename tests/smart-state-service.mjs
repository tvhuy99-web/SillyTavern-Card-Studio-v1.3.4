import assert from 'node:assert/strict';
import {
  buildSmartStateBlock,
  deriveSemanticVisualState,
  findLatestVisualState,
  normalizeSmartStateVariables,
  sanitizeVisualInterface,
  serializeSmartStateVariables,
  smartStateContract,
} from '../src/features/state/smart-state-service.js';

const normalized = normalizeSmartStateVariables({
  $meta: { strict: true },
  $private: 'hidden',
  hp: [57, '[0-100] HP'],
  inventory: [[
    '$__META_EXTENSIBLE__$',
    'Sword',
    'Potion',
  ], 'Items'],
  nested: { $schema: 'hidden', name: ['Alice', 'Display name'] },
});
assert.deepEqual(normalized, {
  hp: 57,
  inventory: ['Sword', 'Potion'],
  nested: { name: 'Alice' },
});

const recent = findLatestVisualState([
  { role: 'model', interactiveHtml: '<div class="old" onclick="x()">OLD</div>' },
  { role: 'user', content: 'next' },
  { role: 'model', interactiveHtml: '<div class="new" style="color:red" data-state="open">NEW<script>bad()</script></div>' },
], { legacyVisualState: '<div>LEGACY</div>' });
assert.equal(recent.source, 'derived-html');
const recentState = JSON.parse(recent.value);
assert.ok(recentState.text.includes('NEW'));
assert.ok(recentState.elements.some(item => item.attributes?.['data-state'] === 'open'));
assert.ok(!recent.value.includes('bad()'));
assert.ok(!recent.value.includes('<div'));
assert.ok(!recent.value.includes('style='));
assert.ok(!recent.value.includes('class='));

const legacy = findLatestVisualState([], { legacyVisualState: '<div>LEGACY</div>' });
assert.equal(legacy.source, 'legacy-derived-html');
assert.ok(JSON.parse(legacy.value).text.includes('LEGACY'));

const semantic = deriveSemanticVisualState('<section data-screen="inventory"><button aria-label="Use sword">Use</button><span>Iron Sword</span></section>');
const semanticState = JSON.parse(semantic);
assert.ok(semanticState.text.includes('Iron Sword'));
assert.ok(semanticState.elements.some(item => item.attributes?.['data-screen'] === 'inventory'));
assert.ok(semanticState.elements.some(item => item.attributes?.['aria-label'] === 'Use sword'));

const sanitized = sanitizeVisualInterface('<div onclick="x()" class="x">A</div><iframe>bad</iframe>');
assert.ok(sanitized.includes('A'));
assert.ok(!sanitized.includes('onclick'));
assert.ok(!sanitized.includes('iframe'));

const block = buildSmartStateBlock({
  variables: { hp: [57, 'HP'] },
  messages: [{ role: 'model', interactiveHtml: '<section data-mode="battle">Battle</section>' }],
  card: {
    rpg_data: {
      tables: [{
        config: { name: 'Stats', columns: [{ label: 'Name' }, { label: 'Value' }] },
        data: { rows: [['row-1', 'HP', 57]] },
      }],
    },
  },
});
assert.ok(block.smartStateBlock.includes('<LogicStore>'));
assert.ok(block.smartStateBlock.includes('"hp": 57'));
assert.ok(block.smartStateBlock.includes('<VisualInterface>'));
assert.ok(!block.smartStateBlock.includes('<MythicDatabase>'));
assert.ok(block.mythicDatabase.includes('### Stats'));
assert.deepEqual(smartStateContract.smartStateIncludes, ['LogicStore', 'VisualInterface']);
assert.deepEqual(smartStateContract.smartStateExcludes, ['MythicDatabase']);

const budgeted = serializeSmartStateVariables({
  keep: 'x'.repeat(5000),
  second: 'y'.repeat(5000),
}, { maxChars: 1500 });
assert.ok(budgeted.length <= 1500);
assert.ok(budgeted.includes('__smart_state_meta'));

console.log('Smart State service checks: OK');
