import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCardRuntimeAssets } from '../build/build-card-runtime.mjs';
const report = await buildCardRuntimeAssets();
assert.equal(report.coreModuleFragments, 17);
assert.ok(report.coreTemplateBytes < 30000, 'core template should only retain bootstrap/composition glue');
assert.equal(report.compatibilityFragments, 6);
assert.equal(report.iframeModuleImportRequired, false);

const coreBuilder = fs.readFileSync(
  new URL('../src/runtime/card-runtime/core-builder.js', import.meta.url),
  'utf8',
);
const { buildCardRuntimeRendererScript } = await import('../assets/card-runtime-renderer-v1.3.6.js');
const renderer = buildCardRuntimeRendererScript('', [], { executeScripts: false });
assert.ok(coreBuilder.includes('buildCardRuntimeCoreScript'));
assert.ok(coreBuilder.includes('__STS_START_CARD_RUNTIME__'));
assert.ok(!coreBuilder.includes('/*__STS_COMPATIBILITY_API__*/'));
assert.equal(typeof buildCardRuntimeRendererScript, 'function');
assert.ok(renderer.includes('parentVariableDiagnostics'));
assert.ok(renderer.includes('bootVariableScopeNames'));
assert.ok(renderer.includes('uiReportedNotReady'));
assert.ok(renderer.includes('literalPathProbes'));
assert.ok(renderer.includes('accessSnippets'));
assert.ok(renderer.includes('readinessTextLiterals'));

const runtimeModule = await import('../src/runtime/card-runtime/core-builder.js?test=' + Date.now());
const injected = runtimeModule.buildCardRuntimeCoreScript({
  context: { compatibilityMode: 'safe', messageId: 1 },
  probe: '</script><script>boom()</script><!--probe',
});
assert.ok(!injected.includes('</script'), 'inline runtime payload must escape closing script tags');
assert.ok(!injected.includes('<!--'), 'inline runtime payload must escape HTML comment openers');
assert.doesNotThrow(() => new Function(injected), 'generated inline Card Runtime must be valid JavaScript');
assert.ok(injected.includes('\n(function registerCardRuntimeCore'), 'BOOT payload must be followed by a real newline before core source');
assert.ok(injected.includes('__STS_START_CARD_RUNTIME__(window.__CARD_STUDIO_BOOT__)'));
assert.ok(injected.includes('window.cardStudioReady = Promise.resolve().then'));
assert.ok(injected.includes('CARD_RUNTIME_START_FUNCTION_MISSING'));
assert.ok(injected.includes('CARD_RUNTIME_EVENT_BRIDGE_NOT_READY'));
assert.ok(injected.includes('CARD_RUNTIME_OPTIONAL_RESOURCE_LOAD_FAILED'));
assert.ok(injected.includes('__cardRuntimeVariableReadinessSnapshot'));
assert.ok(injected.includes('registeredSchemas'));
assert.ok(injected.includes('variableSchemaTrace'));
assert.ok(!injected.includes('Promise.resolve(window.__STS_START_CARD_RUNTIME__('));

const rendererModule = await import('../assets/card-runtime-renderer-v1.3.6.js?test=' + Date.now());
const rendererInjected = rendererModule.buildCardRuntimeRendererScript(
  '<div id="state">Biến chưa sẵn sàng</div>',
  [{
    id: 'html-script-0',
    name: 'Inline HTML script 1',
    type: 'classic',
    content: 'const state = getVariables({ type: "chat" }); const hp = stat_data.hp; if (!hp) document.getElementById("state").textContent = "Biến chưa sẵn sàng";',
  }],
  { executeScripts: true, runtimeMode: 'active' },
);
assert.doesNotThrow(() => new Function(rendererInjected), 'generated renderer must be valid JavaScript');
assert.ok(rendererInjected.includes('uiReportedNotReady'));
assert.ok(rendererInjected.includes('literalPathProbes'));
assert.ok(rendererInjected.includes('stat_data.hp'));
assert.ok(rendererInjected.includes('post-script-settle-1200ms'));

console.log('card runtime extraction tests: OK');
