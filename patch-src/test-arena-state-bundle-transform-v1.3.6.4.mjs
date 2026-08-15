import assert from 'node:assert/strict';
import {
  ARENA_CORE_REPLACEMENTS,
  ARENA_STATE_PATCH_VERSION,
  patchArenaBundleSource
} from '../assets/arena-state-bundle-transform-v1.3.6.4.js';

const bundleUrl = 'https://example.test/assets/index-original.js?v=test';
const viteResolver = 'function c(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href}';
const dynamicImport = 'async function loadChunk(){return import("./chunk-A.js")}';
const fixture = [
  ...ARENA_CORE_REPLACEMENTS.map((spec) => spec.oldText),
  viteResolver,
  dynamicImport,
  'const moduleUrl=import.meta.url;'
].join(';/*fixture*/;');

const { code, report } = patchArenaBundleSource(fixture, bundleUrl);
assert.equal(report.version, ARENA_STATE_PATCH_VERSION);
assert.equal(report.appliedCount, ARENA_CORE_REPLACEMENTS.length);

for (const spec of ARENA_CORE_REPLACEMENTS) {
  assert.ok(code.includes(spec.newText), `missing replacement: ${spec.label}`);
  assert.ok(!code.includes(spec.oldText), `old pattern remains: ${spec.label}`);
}

assert.match(code, /status:"pending",completed:!1/);
assert.match(code, /status:"stopped"/);
assert.match(code, /status:"error"/);
assert.match(code, /"success"!==arenaStatus/);
assert.match(code, /arenaHasSnapshot=!!\(arenaSide\.provider&&arenaSide\.modelId\)/);
assert.match(code, /arenaNormalizeMessagesOnLoad/);
assert.match(code, /arenaStateHealed/);
assert.ok(code.includes('https://example.test/assets/chunk-A.js'));
assert.ok(!/\bimport\.meta\b/.test(code));

const duplicated = fixture + ';' + ARENA_CORE_REPLACEMENTS[0].oldText;
assert.throws(
  () => patchArenaBundleSource(duplicated, bundleUrl),
  /matched more than once/,
  'duplicate source pattern must fail closed'
);

const missing = fixture.replace(ARENA_CORE_REPLACEMENTS[0].oldText, 'missing-pattern');
assert.throws(
  () => patchArenaBundleSource(missing, bundleUrl),
  /pattern not found/,
  'missing source pattern must fail closed'
);

console.log(`arena state bundle transform tests: OK (${ARENA_CORE_REPLACEMENTS.length} strict replacements)`);
