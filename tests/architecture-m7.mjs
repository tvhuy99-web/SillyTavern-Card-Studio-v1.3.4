import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import { renderEntry, verifyAssetInventory } from '../build/asset-manifest.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const url = path => new URL('../' + path, import.meta.url);
const read = path => fs.readFileSync(url(path), 'utf8');
const exists = path => fs.existsSync(url(path));

const index = read('index.html');
const entrySource = read('src/app/entry.js');
const entryGenerated = read('assets/app-entry-v1.3.6.js');
const geminiSource = read('src/providers/common/model-catalog.js');
const geminiGenerated = read('assets/m4/providers/common/model-catalog.js');
const build = read('build/build-production-bundle.mjs');
const production = readRecoveredHostView();
const version = JSON.parse(read('version.json'));

assert.equal(entryGenerated, renderEntry(entrySource), 'generated app entry must match source owner');
assert.equal(geminiGenerated, geminiSource, 'generated Gemini diagnostics must match source owner');

assert.ok(entryGenerated.includes("stage: 'M7-complete'"));
assert.ok(entryGenerated.includes("assetPolicy: 'generated-vendor-static-only'"));
assert.ok(entryGenerated.includes("runtimePatchScripts: 'none'"));
assert.ok(!entryGenerated.includes('installGeminiModelListDiagnostics'));
assert.ok(!exists('src/diagnostics/gemini-model-list.js'));
assert.ok(!exists('assets/m7/diagnostics/gemini-model-list.js'));

assert.ok(!geminiSource.includes('window.fetch ='));
assert.ok(!geminiSource.includes('window.alert ='));
assert.ok(!geminiSource.includes('MutationObserver'));
assert.ok(!geminiSource.includes("document.addEventListener"));
assert.ok(!geminiSource.includes("location.reload"));
assert.ok(production.includes("__stsCatalog.subscribeGemini"));

const scriptTags = index.match(/<script\b[^>]*>/g) || [];
assert.equal(scriptTags.length, 1, 'index must have one application script entry');
assert.ok(scriptTags[0].includes('type="module"'));
assert.ok(scriptTags[0].includes('app-entry-v1.3.6.js?v=1.3.6-m7.5'));
assert.ok(!index.includes('gemini-model-list-diagnostics-v1.3.6.js'));

assert.ok(build.includes('renderHost'));
assert.ok(!build.includes('/legacy/'));
assert.ok(!build.includes('/transforms/'));
assert.ok(build.includes('emitOwnedAssets'));
assert.ok(build.includes('verifyAssetInventory'));

assert.equal(exists('legacy/app-bundle-input-v1.3.6.js'), false);
assert.equal(exists('assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js'), false);
assert.equal(exists('patch-src'), false);

for (const removed of [
  'assets/arena-state-bundle-transform-v1.3.6.4.js',
  'assets/arena-cancellation-bundle-transform-v1.3.6.5.js',
  'assets/core-reliability-bundle-transform-v1.3.6.4.js',
  'assets/arena-runtime-ux-guard-v1.3.6.3.js',
  'assets/chat-send-recovery-v1.3.6.js',
  'assets/chat-send-recovery-v1.3.6.2.js',
  'assets/gemini-model-list-diagnostics-v1.3.6.js',
  'COMPATIBILITY-FIX-REPORT.md',
  'MODEL-TEST-PATCH.txt',
  'RELEASE-NOTES-1.3.4.txt',
  'SHA256SUMS.txt',
]) assert.equal(exists(removed), false, 'legacy cleanup target survived: ' + removed);

await verifyAssetInventory();

assert.equal(version.architectureStage, 'M7-complete');
assert.equal(version.assetPolicy, 'generated-vendor-static-only');
assert.equal(version.hostSource, './src/app/host.js');
assert.equal(version.historicalTransformsExecuted, 0);
for (const key of Object.keys(version)) {
  assert.ok(!/Patch$/.test(key), 'version metadata still exposes obsolete patch field: ' + key);
}

for (const marker of [
  '__stsScanWorldInfo',
  '__stsBuildConversationPrompt',
  '__stsProcessAIResponse',
  '__stsSessionPersistence.createSessionSnapshot',
  'ToggleSwitch=__stsCreateToggleSwitch(jsxRuntime,React,Tooltip)',
]) assert.ok(production.includes(marker), 'previous milestone invariant lost: ' + marker);

console.log('M7 cleanup architecture checks: OK');
