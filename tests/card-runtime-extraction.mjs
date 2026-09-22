import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyCardRuntimeTransform } from '../build/transforms/card-runtime.mjs';
import { buildCardRuntimeAssets } from '../build/build-card-runtime.mjs';

const bundle = fs.readFileSync(
  new URL('../legacy/app-bundle-input-v1.3.6.js', import.meta.url),
  'utf8',
);
const transformed = applyCardRuntimeTransform(bundle);

assert.ok(transformed.includes('initial-variable-service-v1.3.6.js?v=1.3.6-initvar-3'));
assert.ok(transformed.includes('smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2'));
assert.ok(transformed.includes('card-runtime-core-builder-v1.3.6.js?v=1.3.6-m3.10'));
assert.ok(transformed.includes('card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.10'));
assert.ok(transformed.includes('__stsBuildCardRuntimeCoreScript'));
assert.ok(transformed.includes('__stsBuildCardRuntimeRendererScript'));
assert.ok(transformed.includes('__stsNormalizeCardRuntimeMarkup'));
assert.ok(transformed.includes('__stsBuildSmartStateBlock'));
assert.ok(transformed.includes('__stsSeedInitialVariablesFromCard'));
assert.ok(transformed.includes('__stsSelectInitialVariableOpening'));
assert.ok(transformed.includes('__stsInspectInitialVariablePipeline'));
assert.ok(transformed.includes('variableDiagnostics:__stsVariableDiagnostics'));
assert.ok(transformed.includes('variableDiagnostics:a.snapshot.variableDiagnostics'));
assert.ok(transformed.includes('let __stsScopes=Ap(r||{},v,M,t,m,n)'));
assert.ok(transformed.includes('variableScopes:__stsScopes'));
assert.ok(transformed.includes('e&&Object.keys(e).length?e:__stsSeedInitialVariablesFromCard'));
assert.ok(transformed.includes('Np=(e,t,n,r)=>__stsBuildSmartStateBlock({variables:e,card:t,messages:n.slice(0,Math.max(0,r))}).smartStateBlock'));
assert.ok(!transformed.includes('Np=(e,t,n,r)=>{let a=[]'));
assert.ok(transformed.includes('srcDoc:__stsNormalizeCardRuntimeMarkup(U),style:'));
assert.ok(!transformed.includes('card-runtime-core-v1.3.6.js?v='));
assert.ok(!transformed.includes('const BOOT = ${t};'), 'inline Card Runtime core must be removed');
assert.ok(!transformed.includes('const START_OPTIONS = ${i};'), 'inline renderer must be removed');
assert.ok(!transformed.includes('yp=String.raw'), 'embedded compatibility API must be removed');
assert.ok(transformed.includes('vue-router@5.1.0/dist/vue-router.global.js'));
assert.ok(!transformed.includes('vue-router@5.2.0/dist/vue-router.global.js'));

const report = await buildCardRuntimeAssets();
assert.equal(report.coreModuleFragments, 17);
assert.ok(report.coreTemplateBytes < 30000, 'core template should only retain bootstrap/composition glue');
assert.equal(report.compatibilityFragments, 6);
assert.equal(report.iframeModuleImportRequired, false);

const coreBuilder = fs.readFileSync(
  new URL('../assets/card-runtime-core-builder-v1.3.6.js', import.meta.url),
  'utf8',
);
const renderer = fs.readFileSync(
  new URL('../assets/card-runtime-renderer-v1.3.6.js', import.meta.url),
  'utf8',
);
assert.ok(coreBuilder.includes('buildCardRuntimeCoreScript'));
assert.ok(coreBuilder.includes('__STS_START_CARD_RUNTIME__'));
assert.ok(!coreBuilder.includes('/*__STS_COMPATIBILITY_API__*/'));
assert.ok(renderer.includes('buildCardRuntimeRendererScript'));
assert.ok(renderer.includes('parentVariableDiagnostics'));
assert.ok(renderer.includes('bootVariableScopeNames'));
assert.ok(renderer.includes('uiReportedNotReady'));
assert.ok(renderer.includes('literalPathProbes'));
assert.ok(renderer.includes('accessSnippets'));
assert.ok(renderer.includes('readinessTextLiterals'));

const runtimeModule = await import('../assets/card-runtime-core-builder-v1.3.6.js?test=' + Date.now());
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
