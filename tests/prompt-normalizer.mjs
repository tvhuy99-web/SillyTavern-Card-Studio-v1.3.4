import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getPromptOrderIntegrity,
  normalizePresetConfig,
  normalizePresetList,
} from '../src/features/presets/prompt-normalizer.js';
import { applyPresetBoundaryTransform } from '../build/transforms/preset-boundary.mjs';

const source = Object.freeze({
  name: 'Imported',
  prompts: Object.freeze([
    Object.freeze({ identifier: 'main', enabled: true }),
    Object.freeze({ identifier: ' custom-a ', content: 'A' }),
    null,
  ]),
  prompt_order: Object.freeze([
    Object.freeze({ identifier: 'main', enabled: true }),
    undefined,
    Object.freeze({ identifier: 'custom-a', enabled: true }),
    Object.freeze({ identifier: 'ghost', enabled: true }),
  ]),
});

const normalized = normalizePresetConfig(source);
assert.equal(source.prompts.length, 3, 'normalization must not mutate frozen source arrays');
assert.equal(normalized.prompts.length, 2);
assert.equal(normalized.prompts[1].identifier, 'custom-a');
assert.deepEqual(normalized.prompts.map(entry => entry.identifier), ['main', 'custom-a']);
assert.equal(normalized.prompts[1].enabled, true);
assert.equal('prompt_order' in normalized, false);

const groupedSource = {
  prompts: [{ identifier: 'custom-b', content: 'B' }, undefined],
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
const grouped = normalizePresetConfig(groupedSource);
assert.equal(grouped.prompts.length, 1);
assert.equal(grouped.prompts[0].enabled, true);
assert.equal('prompt_order' in grouped, false);

const list = normalizePresetList([source, null, grouped]);
assert.equal(list.length, 2);

assert.deepEqual(getPromptOrderIntegrity(groupedSource), {
  promptCount: 1,
  orderCount: 2,
});

const worldInfoPreset = normalizePresetConfig({
  prompts: [
    { identifier: 'worldInfoBefore', name: 'World Info before', marker: true },
    { identifier: 'custom-world', name: 'World compatibility', content: '{{worldInfo}}' },
    { identifier: 'detached', name: 'Detached', content: 'MUST NOT SEND', enabled: true },
  ],
  prompt_order: [
    {
      character_id: 100001,
      order: [{ identifier: 'custom-world', enabled: false }],
    },
    {
      character_id: 100000,
      order: [
        { identifier: 'worldInfoBefore', enabled: true },
        { identifier: 'custom-world', enabled: true },
      ],
    },
  ],
});
assert.deepEqual(
  worldInfoPreset.prompts.map(entry => entry.identifier),
  ['worldInfoBefore', 'custom-world', 'detached'],
);
assert.equal(worldInfoPreset.prompts[0].content, '{{worldInfo_before}}');
assert.equal(worldInfoPreset.prompts[0].enabled, true);
assert.equal(worldInfoPreset.prompts[1].enabled, true);
assert.equal(worldInfoPreset.prompts[2].enabled, false);
assert.equal('prompt_order' in worldInfoPreset, false);

const unrelated = { name: 'No prompt payload', temperature: 1 };
assert.deepEqual(normalizePresetConfig(unrelated), unrelated);

const legacyBundle = fs.readFileSync(
  new URL('../legacy/app-bundle-input-v1.3.6.js', import.meta.url),
  'utf8',
);
const boundaryBundle = applyPresetBoundaryTransform(legacyBundle);
assert.ok(boundaryBundle.startsWith('import { normalizePresetConfig as __stsNormalizePresetConfig'));
assert.ok(boundaryBundle.includes('t(__stsNormalizePresetList(r.result))'));
assert.ok(boundaryBundle.includes('let n=__stsNormalizePresetConfig(t);await nn(n)'));
assert.ok(boundaryBundle.includes('return __stsNormalizePresetConfig(r)},bu=At()'));

console.log('prompt normalizer and preset boundary tests: OK');
