import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyCardRuntimeTransform } from '../build/transforms/card-runtime.mjs';
import { buildCardRuntimeAssets } from '../build/build-card-runtime.mjs';

const bundle = fs.readFileSync(
  new URL('../legacy/app-bundle-input-v1.3.6.js', import.meta.url),
  'utf8',
);
const transformed = applyCardRuntimeTransform(bundle);

assert.ok(transformed.includes('smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2'));
assert.ok(transformed.includes('card-runtime-core-builder-v1.3.6.js?v=1.3.6-m3.6'));
assert.ok(transformed.includes('card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.5'));
assert.ok(transformed.includes('__stsBuildCardRuntimeCoreScript'));
assert.ok(transformed.includes('__stsBuildCardRuntimeRendererScript'));
assert.ok(transformed.includes('__stsNormalizeCardRuntimeMarkup'));
assert.ok(transformed.includes('__stsBuildSmartStateBlock'));
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

const runtimeModule = await import('../assets/card-runtime-core-builder-v1.3.6.js?test=' + Date.now());
const injected = runtimeModule.buildCardRuntimeCoreScript({
  context: { compatibilityMode: 'safe', messageId: 1 },
  probe: '</script><script>boom()</script><!--probe',
});
assert.ok(!injected.includes('</script'), 'inline runtime payload must escape closing script tags');
assert.ok(!injected.includes('<!--'), 'inline runtime payload must escape HTML comment openers');
assert.ok(injected.includes('__STS_START_CARD_RUNTIME__(window.__CARD_STUDIO_BOOT__)'));

console.log('card runtime extraction tests: OK');
