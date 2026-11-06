import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AI_STICKY_DEFAULT_TURNS,
  migrateSmartScanStickySettings,
  markSmartScanStickySettingsSaved,
  createUidSafeWorldInfoResolver,
} from '../src/features/world-info/sticky-compat.js';

assert.equal(AI_STICKY_DEFAULT_TURNS, 3);

// Existing installations often persisted the old default of 5. Migrate
// exactly once without resetting model, threshold, or other preferences.
const previous = {
  mode: 'hybrid_fast', embedding_provider: 'embeddinggemma2',
  semantic_threshold: 0.1, max_semantic_entries: 20, aiStickyDuration: 5,
};
const updated = migrateSmartScanStickySettings(previous);
assert.equal(previous.aiStickyDuration, 5, 'never mutate persisted settings in place');
assert.equal(updated.aiStickyDuration, 3);
assert.equal(updated.semantic_threshold, 0.1);
assert.equal(updated.embedding_provider, 'embeddinggemma2');
assert.equal(migrateSmartScanStickySettings(updated), updated, 'no repeated migrations');
assert.equal(migrateSmartScanStickySettings({ aiStickyDuration: 8 }).aiStickyDuration, 8);
assert.equal(migrateSmartScanStickySettings({ aiStickyDuration: 0 }).aiStickyDuration, 0);
const saved = markSmartScanStickySettingsSaved({ ...updated, aiStickyDuration: 5 });
assert.equal(migrateSmartScanStickySettings(saved).aiStickyDuration, 5,
  'user can explicitly change the slider back to 5 later');

// Exercise the actual legacy World Info resolver used by the APK, not a
// simplified simulation. The minified module is extracted solely inside
// this repository regression test, using known lexical function boundaries.
const production = readFileSync(
  new URL('../assets/app-production-v1.3.6.js', import.meta.url), 'utf8');
const start = production.indexOf('lh=(e,t,n={},r={},a=0,i=new Set,o=!0)=>');
const end = production.indexOf(',uh=({', start);
assert.ok(start > 0 && end > start, 'legacy World Info resolver must be present');
const source = production.slice(start, end);
const legacyResolver = new Function(
  'sh', 'oh',
  'let ' + source + ';return ch;',
)(
  () => true,
  (needle, haystack, regex = false, caseSensitive = false) => {
    const hay = String(haystack || '');
    const key = String(needle || '');
    return caseSensitive ? hay.includes(key) : hay.toLowerCase().includes(key.toLowerCase());
  },
);
const resolver = createUidSafeWorldInfoResolver(legacyResolver);

const numericEntry = {
  uid: 42, name: 'Rồng', content: 'dragon lore',
  keys: ['dragon'], enabled: true, insertion_order: 0,
};

// Control regression: unmodified legacy resolver fails when runtime object
// key is string but Lorebook UID is numeric.
const oldCode = legacyResolver('', [numericEntry], {}, {
  '42': { stickyDuration: 2, cooldownDuration: 0 },
}, {}, [], true, 11, 3);
assert.equal(oldCode.activeEntries.length, 0,
  'the old implementation demonstrably drops numeric sticky IDs');

let runtime = {};
const play = (turn, selected = [], text = '') => {
  const result = resolver(text, [numericEntry], {}, runtime, {},
    selected, true, turn, AI_STICKY_DEFAULT_TURNS);
  runtime = result.updatedRuntimeState;
  return result;
};
const activation = play(10, [42]);
assert.deepEqual(activation.activeEntries.map(x => x.uid), [42]);
assert.equal(runtime['42'].stickyDuration, 3);
for (const turn of [11, 12, 13]) {
  const state = play(turn);
  assert.deepEqual(state.activeEntries.map(x => x.uid), [42],
    'numeric UID must remain active through all three Sticky turns');
}
assert.deepEqual(play(14).activeEntries, [],
  'without another match, entry expires on the fourth following response');

// A second match refreshes Sticky to three following turns.
runtime = {};
play(20, ['42']);
play(21);
assert.equal(play(22, [42]).updatedRuntimeState['42'].stickyDuration, 3);
for (const turn of [23, 24, 25]) assert.equal(play(turn).activeEntries.length, 1);
assert.equal(play(26).activeEntries.length, 0);

// Older sessions may have 5 remaining. Existing 5-turn state is capped to 3;
// explicit per-entry Sticky longer than the global duration still wins.
runtime = { '42': { stickyDuration: 5, cooldownDuration: 0 } };
let capped = play(30);
assert.equal(capped.activeEntries.length, 1);
assert.equal(runtime['42'].stickyDuration, 2, 'capped from five and then decremented one turn');
const custom = { ...numericEntry, sticky: 6 };
const longer = resolver('', [custom], {}, {}, {}, [42], true, 33, 3);
assert.equal(longer.updatedRuntimeState['42'].stickyDuration, 6);
const customStored = resolver('', [custom], {}, {
  '42': { stickyDuration: 6, cooldownDuration: 0 },
}, {}, [], true, 34, 3);
assert.equal(customStored.updatedRuntimeState['42'].stickyDuration, 5);

// UID zero, pinned entries, cooldown and keyword scanning retain their prior
// semantics after canonicalization.
const zero = { ...numericEntry, uid: 0 };
const zeroResult = resolver('', [zero], {}, {}, {}, [0], true, 1, 3);
assert.deepEqual(zeroResult.activeEntries.map(e => e.uid), [0]);
const pinned = resolver('', [numericEntry], {}, {}, { '42': true }, [], true, 31, 3);
assert.deepEqual(pinned.activeEntries.map(e => e.uid), [42]);
const keyword = resolver('dragon', [numericEntry], {}, {}, {}, [], false, 40, 3);
assert.deepEqual(keyword.activeEntries.map(e => e.uid), [42]);
const cooling = resolver('dragon', [numericEntry], {}, {
  '42': { cooldownDuration: 2, stickyDuration: 0 },
}, {}, [], false, 41, 3);
assert.equal(cooling.activeEntries.length, 0);

// The generated production bundle must have the actual 3-turn default,
// migrating getter, original semantic provider and the always-visible slider.
assert.ok(production.includes('aiStickyDuration:3,system_prompt:'));
assert.ok(production.includes('__stsMigrateSmartScanStickySettings(t)'));
assert.ok(production.includes('__stsMarkSmartScanStickySettingsSaved(e)'));
assert.ok(production.includes('resolveWorldInfo:__stsCreateUidSafeWorldInfoResolver(ch)'));
assert.ok(production.includes('label:"AI Sticky Duration (lượt AI phản hồi)"'));
assert.equal((production.match(/label:"AI Sticky Duration \(lượt AI phản hồi\)"/g) || []).length, 1);

console.log('World Info Sticky: 3-turn default, migration, numeric UID and actual resolver tests OK');
