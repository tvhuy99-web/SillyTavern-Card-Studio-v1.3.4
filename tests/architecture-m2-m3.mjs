import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = read('assets/app-production-v1.3.6.js');
const promptSource = read('src/features/presets/prompt-normalizer.js');
const promptGenerated = read('assets/prompt-normalizer-v1.3.6.js');
const proxySource = read('src/providers/proxy/persistence.js');
const proxyGenerated = read('assets/proxy-persistence-service-v1.3.6.js');
const rendererSource = read('src/runtime/card-runtime/renderer.js');
const rendererGenerated = read('assets/card-runtime-renderer-v1.3.6.js');
const coreTemplate = read('src/runtime/card-runtime/core.template.js');
const coreBuilder = read('assets/card-runtime-core-builder-v1.3.6.js');

for (const forbidden of [
  'prompt-order-identifier-fix-v1.3.6.js',
  'card-runtime-dependency-compat-v1.3.6.2.js',
  'arena-state-bundle-loader-v1.3.6.4.js',
  'arena-state-bundle-loader-v1.3.6.5.js',
  'proxy-persistence-fix-v1.3.6.js',
]) {
  assert.ok(!index.includes(forbidden), 'index.html must not load legacy artifact: ' + forbidden);
  assert.ok(!entry.includes(forbidden), 'app entry must not reference legacy artifact: ' + forbidden);
}

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("proxyPersistence: 'owned-provider-service'"));
assert.ok(entry.includes("cardRuntime: 'modular-owned-source'"));
assert.ok(!entry.includes('LEGACY_FALLBACK'));

for (const forbiddenCode of [
  'JSON.parse = function patchedJsonParse',
  'JSON.stringify = function patchedJsonStringify',
  'window.structuredClone = function patchedStructuredClone',
  'Map.prototype.get = function patchedMapGet',
  'Storage.prototype.getItem =',
  'Storage.prototype.setItem =',
  'Storage.prototype.removeItem =',
]) {
  assert.ok(!production.includes(forbiddenCode), 'production must not monkey-patch built-in: ' + forbiddenCode);
}

assert.ok(production.includes('prompt-normalizer-v1.3.6.js'));
assert.ok(production.includes('proxy-persistence-service-v1.3.6.js?v=1.3.6-m2-final'));
assert.ok(production.includes('card-runtime-core-builder-v1.3.6.js?v=1.3.6-m3.7'));
assert.ok(production.includes('card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.6'));
assert.ok(production.includes('smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2'));
assert.ok(production.includes('__stsBuildSmartStateBlock'));
assert.ok(production.includes('__stsBuildCardRuntimeCoreScript'));
assert.ok(production.includes('__stsBuildCardRuntimeRendererScript'));
assert.ok(production.includes('__stsNormalizeCardRuntimeMarkup'));
assert.ok(production.includes('__stsProxyPersistence'));
assert.ok(!production.includes('root.__STS_START_CARD_RUNTIME__ = function startCardRuntimeCore'));

assert.equal(promptGenerated, promptSource);
assert.equal(proxyGenerated, proxySource);
assert.equal(rendererGenerated, rendererSource);
assert.ok(coreBuilder.includes('__STS_START_CARD_RUNTIME__'));
assert.ok(!coreBuilder.includes('/*__STS_COMPATIBILITY_API__*/'));
assert.ok(coreTemplate.length < 30000, 'Card Runtime core template must stay small');

for (const path of [
  'src/runtime/card-runtime/modules/bridge-rpc.jsfrag',
  'src/runtime/card-runtime/modules/events.jsfrag',
  'src/runtime/card-runtime/modules/variables.jsfrag',
  'src/runtime/card-runtime/modules/chat.jsfrag',
  'src/runtime/card-runtime/modules/macros.jsfrag',
  'src/runtime/card-runtime/modules/generation.jsfrag',
  'src/runtime/card-runtime/modules/worldbook.jsfrag',
  'src/runtime/card-runtime/modules/regex.jsfrag',
  'src/runtime/card-runtime/modules/audio.jsfrag',
  'src/runtime/card-runtime/modules/storage.jsfrag',
  'src/runtime/card-runtime/modules/bridge-network.jsfrag',
  'src/runtime/card-runtime/modules/accessibility.jsfrag',
  'src/runtime/card-runtime/modules/scripts.jsfrag',
  'src/runtime/card-runtime/modules/variables-mvu.jsfrag',
  'src/runtime/card-runtime/modules/bridge-context.jsfrag',
  'src/runtime/card-runtime/modules/hud.jsfrag',
  'src/runtime/card-runtime/modules/bridge-handshake.jsfrag',
]) {
  assert.equal(exists(path), true, 'Card Runtime module owner must exist: ' + path);
}

for (const removedPath of [
  'assets/prompt-order-identifier-fix-v1.3.6.js',
  'assets/card-runtime-dependency-compat-v1.3.6.2.js',
  'assets/arena-state-bundle-loader-v1.3.6.4.js',
  'assets/arena-state-bundle-loader-v1.3.6.5.js',
  'assets/proxy-persistence-fix-v1.3.6.js',
  'patch-src/test-proxy-persistence.mjs',
  'patch-src/runtime-core-original.txt',
  'patch-src/runtime-current-0.txt',
  'patch-src/runtime-current-1.txt',
  'patch-src/runtime-current-2.txt',
  'patch-src/runtime-overlay-original.txt',
]) {
  assert.equal(exists(removedPath), false, 'obsolete artifact must stay removed: ' + removedPath);
}

console.log('M2/M3 architecture boundary checks: OK');
