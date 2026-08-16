import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARENA_CORE_REPLACEMENTS,
  patchArenaBundleSource
} from '../assets/arena-state-bundle-transform-v1.3.6.4.js';
import {
  CORE_RELIABILITY_PATCH_VERSION,
  CORE_RELIABILITY_REPLACEMENTS,
  patchCoreReliabilityBundleSource
} from '../assets/core-reliability-bundle-transform-v1.3.6.4.js';

const fixture = CORE_RELIABILITY_REPLACEMENTS.map((spec) => spec.oldText).join(';/*fixture*/;');
const fixtureResult = patchCoreReliabilityBundleSource(fixture);
assert.equal(fixtureResult.report.version, CORE_RELIABILITY_PATCH_VERSION);
assert.equal(fixtureResult.report.appliedCount, CORE_RELIABILITY_REPLACEMENTS.length);

for (const spec of CORE_RELIABILITY_REPLACEMENTS) {
  assert.ok(fixtureResult.code.includes(spec.newText), `missing replacement: ${spec.label}`);
  assert.ok(!fixtureResult.code.includes(spec.oldText), `old pattern remains: ${spec.label}`);
}

assert.match(fixtureResult.code, /stsSendSucceeded&&!c\.signal\.aborted/);
assert.match(fixtureResult.code, /if\(!r\)return;t\.setStoryQueue/);
assert.match(fixtureResult.code, /bg:"backgroundImage",music:"musicUrl",class:"globalClass",sound:"ambientSoundUrl"/);
assert.match(fixtureResult.code, /e\.abortControllers\.forEach/);
assert.match(fixtureResult.code, /case"raw\.import\.regex":\{/);
assert.match(fixtureResult.code, /mergedSettings:o\.card\?yh\(o\.card,a\):a/);
assert.match(fixtureResult.code, /generatedLorebookEntries:n/);
assert.match(fixtureResult.code, /await navigator\.clipboard\.writeText/);

const duplicated = fixture + ';' + CORE_RELIABILITY_REPLACEMENTS[0].oldText;
assert.throws(
  () => patchCoreReliabilityBundleSource(duplicated),
  /matched more than once/,
  'duplicate source pattern must fail closed'
);

const missing = fixture.replace(CORE_RELIABILITY_REPLACEMENTS[0].oldText, 'missing-pattern');
assert.throws(
  () => patchCoreReliabilityBundleSource(missing),
  /pattern not found/,
  'missing source pattern must fail closed'
);

// Integration check against the exact production bundle, after the Arena transform
// because that is the order used by the browser loader.
const productionBundlePath = fileURLToPath(new URL('../assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js', import.meta.url));
const productionSource = readFileSync(productionBundlePath, 'utf8');
const productionUrl = 'https://example.test/assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js?v=test';
const arenaResult = patchArenaBundleSource(productionSource, productionUrl);
assert.equal(arenaResult.report.appliedCount, ARENA_CORE_REPLACEMENTS.length);
const integratedResult = patchCoreReliabilityBundleSource(arenaResult.code);
assert.equal(integratedResult.report.appliedCount, CORE_RELIABILITY_REPLACEMENTS.length);

for (const spec of CORE_RELIABILITY_REPLACEMENTS) {
  assert.ok(integratedResult.code.includes(spec.newText), `production bundle missing replacement: ${spec.label}`);
}

// Parse the complete transformed production bundle. This catches malformed minified
// replacements even when every exact source anchor matched successfully.
const syntaxDir = mkdtempSync(join(tmpdir(), 'sts-core-reliability-'));
try {
  const syntaxFile = join(syntaxDir, 'transformed-production.mjs');
  writeFileSync(syntaxFile, integratedResult.code, 'utf8');
  execFileSync(process.execPath, ['--check', syntaxFile], { stdio: 'pipe' });
} finally {
  rmSync(syntaxDir, { recursive: true, force: true });
}

console.log(`core reliability bundle transform tests: OK (${CORE_RELIABILITY_REPLACEMENTS.length} strict replacements; production integration + syntax verified)`);
