import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = read('assets/app-production-v1.3.6.js');

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("uiSemantics: 'source-build-owned'"));
assert.ok(entry.includes("accessibility: 'semantic-controls'"));
assert.ok(entry.includes("modelTestUi: 'owned-enhancer'"));
assert.ok(entry.includes('installModelConnectionTestEnhancer({ proxyPersistence: __stsProxyPersistence })'));

for (const oldArtifact of [
  'ui-version-display-fix-v1.3.6.js',
  'preset-switch-status-only-v1.3.6.js',
  'lorebook-item-accessibility-v1.3.6.js',
  'model-connection-test-v1.3.6-v2.js',
  'accessibility-performance-v1.3.6.css',
]) assert.ok(!index.includes(oldArtifact), 'index must not load legacy UI patch: ' + oldArtifact);

assert.ok(index.includes('assets/m6/ui/accessibility.css?v=1.3.6-m6.2'));
assert.ok(production.includes('title:"Phiên bản ứng dụng 1.3.6"'));
assert.ok(production.includes('children:"v1.3.6"'));
assert.ok(!production.includes('Phiên bản ứng dụng 1.3.4'));
assert.ok(!production.includes('children:"v1.3.4"'));

const switchStart = production.indexOf('yl=({label:e,ariaLabel:t,checked:n,onChange:r,tooltip:a,disabled:i,className:o="",clean:s=!1})=>');
const switchEnd = production.indexOf(',bl=', switchStart);
const switchSource = production.slice(switchStart, switchEnd);
assert.ok(switchSource.includes('(0,wt.jsxs)("button",{type:"button",disabled:i'));
assert.ok(switchSource.includes('role:"switch"'));
assert.ok(!switchSource.includes('onKeyDown:'));
assert.ok(!switchSource.includes('"aria-disabled":i'));

const loreStart = production.indexOf('Nc=({entry:e,index:t,onUpdate:n,onRemove:r,onEdit:a,syncStatus:i})=>');
const loreEnd = production.indexOf(',Tc=', loreStart);
const loreSource = production.slice(loreStart, loreEnd);
assert.ok(loreSource.includes('(0,wt.jsxs)("article",{"aria-labelledby":p'));
assert.ok(loreSource.includes('(0,wt.jsxs)("h3",{id:p'));
assert.ok(loreSource.includes('type:"button",onClick:()=>!o&&a(t),disabled:o'));
assert.ok(!loreSource.includes('role:"button"'));
assert.ok(!loreSource.includes('tabIndex:o?-1:0'));
assert.equal((loreSource.match(/Chỉnh sửa mục/g) || []).length, 0);
assert.ok(loreSource.includes('ariaLabel:void 0,checked:!1!==e.enabled'));
assert.ok(!loreSource.includes('role:"img"'));
assert.ok(!production.includes('Chưa đồng bộ Semantic'));
assert.ok(production.includes('showPipeline:__stsShowPipeline=!1'));
assert.ok(production.includes('__stsShowPipeline&&n.push({label:a,content:t})'));
assert.ok(production.includes('isStreaming:U,onArenaSelect:S,onArenaRetry:C,showPipeline:L})');
assert.ok(production.includes('[m,e.content,h,c,T,__stsShowPipeline]'));

const promptStart = production.indexOf('pu=({prompt:e,index:t,onUpdate:n,onRemove:r,onEdit:a,movingPromptIndex:i,onSelectToMove:o,onMoveTo:s,onCancelMove:l})=>');
const promptEnd = production.indexOf(',mu=', promptStart);
assert.ok(promptStart >= 0 && promptEnd > promptStart);
const promptSource = production.slice(promptStart, promptEnd);
assert.ok(promptSource.includes('ariaLabel:void 0,checked:e.enabled??!1'));

for (const [source, generated] of [
  ['src/ui/model-connection-test.js', 'assets/m6/ui/model-connection-test.js'],
  ['src/ui/styles/accessibility.css', 'assets/m6/ui/accessibility.css'],
]) assert.equal(read(source), read(generated), generated + ' must match source owner');

const modelUi = read('src/ui/model-connection-test.js');
assert.ok(modelUi.includes('deps.proxyPersistence?.getProfiles?.()'));
assert.ok(modelUi.includes('deps.proxyPersistence?.getPassword?.()'));
assert.ok(!modelUi.includes("document.createElement('style')"));

for (const removed of [
  'assets/ui-version-display-fix-v1.3.6.js',
  'assets/preset-switch-status-only-v1.3.6.js',
  'assets/lorebook-item-accessibility-v1.3.6.js',
  'assets/model-connection-test-v1.3.6-v2.js',
  'assets/accessibility-performance-v1.3.6.css',
]) assert.equal(exists(removed), false, 'legacy M6 artifact must be removed: ' + removed);

console.log('M6 UI/accessibility architecture checks: OK');
