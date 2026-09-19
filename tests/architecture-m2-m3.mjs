import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = read('assets/app-production-v1.3.6.js');
const promptSource = read('src/features/presets/prompt-normalizer.js');
const promptGenerated = read('assets/prompt-normalizer-v1.3.6.js');
const rendererSource = read('src/runtime/card-runtime/renderer.js');
const rendererGenerated = read('assets/card-runtime-renderer-v1.3.6.js');
const coreBuilder = read('assets/card-runtime-core-builder-v1.3.6.js');

for (const forbidden of [
  'prompt-order-identifier-fix-v1.3.6.js',
  'card-runtime-dependency-compat-v1.3.6.2.js',
  'arena-state-bundle-loader-v1.3.6.4.js',
  'arena-state-bundle-loader-v1.3.6.5.js',
]) {
  assert.ok(!index.includes(forbidden), `index.html must not load legacy artifact: ${forbidden}`);
  assert.ok(!entry.includes(forbidden), `app entry must not reference legacy artifact: ${forbidden}`);
}

assert.ok(entry.includes("stage: 'M3-complete'"));
assert.ok(!entry.includes('LEGACY_FALLBACK'), 'M3 entry must not contain runtime fallback');

for (const forbiddenCode of [
  'JSON.parse = function patchedJsonParse',
  'JSON.stringify = function patchedJsonStringify',
  'window.structuredClone = function patchedStructuredClone',
  'Map.prototype.get = function patchedMapGet',
]) {
  assert.ok(!production.includes(forbiddenCode), `production must not monkey-patch built-in: ${forbiddenCode}`);
}

assert.ok(production.includes('prompt-normalizer-v1.3.6.js'));
assert.ok(production.includes('card-runtime-core-builder-v1.3.6.js'));
assert.ok(production.includes('card-runtime-renderer-v1.3.6.js'));
assert.ok(production.includes('__stsBuildCardRuntimeCoreScript'));
assert.ok(production.includes('__stsBuildCardRuntimeRendererScript'));
assert.ok(!production.includes('root.__STS_START_CARD_RUNTIME__ = function startCardRuntimeCore'));
assert.ok(!production.includes('const START_OPTIONS = ${i};'));

assert.equal(promptGenerated, promptSource, 'generated prompt normalizer must match source owner exactly');
assert.equal(rendererGenerated, rendererSource, 'generated Card Runtime renderer must match source owner exactly');
assert.ok(coreBuilder.includes('__STS_START_CARD_RUNTIME__'));
assert.ok(!coreBuilder.includes('/*__STS_COMPATIBILITY_API__*/'));

for (const removedPath of [
  'assets/prompt-order-identifier-fix-v1.3.6.js',
  'assets/card-runtime-dependency-compat-v1.3.6.2.js',
  'assets/arena-state-bundle-loader-v1.3.6.4.js',
  'assets/arena-state-bundle-loader-v1.3.6.5.js',
  'patch-src/runtime-core-original.txt',
  'patch-src/runtime-current-0.txt',
  'patch-src/runtime-current-1.txt',
  'patch-src/runtime-current-2.txt',
  'patch-src/runtime-overlay-original.txt',
]) {
  assert.equal(exists(removedPath), false, `obsolete artifact must stay removed: ${removedPath}`);
}

console.log('M2/M3 architecture boundary checks: OK');
