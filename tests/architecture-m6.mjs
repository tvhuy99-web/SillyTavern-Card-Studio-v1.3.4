import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = readRecoveredHostView();

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("uiSemantics: 'source-build-owned'"));
assert.ok(entry.includes("accessibility: 'semantic-controls'"));
assert.ok(entry.includes("modelTestUi: 'react-owned'"));
assert.ok(!entry.includes('installModelConnectionTestEnhancer'));

for (const oldArtifact of [
  'ui-version-display-fix-v1.3.6.js',
  'preset-switch-status-only-v1.3.6.js',
  'lorebook-item-accessibility-v1.3.6.js',
  'model-connection-test-v1.3.6-v2.js',
  'accessibility-performance-v1.3.6.css',
]) assert.ok(!index.includes(oldArtifact), 'index must not load legacy UI patch: ' + oldArtifact);

assert.ok(index.includes('assets/m6/ui/accessibility.css?v=1.3.6-m6.2'));
const shellSource = read('src/ui/shell/application-shell.js');
assert.equal(shellSource, read('assets/m6/ui/shell/application-shell.js'));
assert.ok(shellSource.includes("title: 'Phiên bản ứng dụng 1.3.6'"));
assert.ok(shellSource.includes("children: 'v1.3.6'"));
assert.ok(production.includes('Ct=__stsCreateAppHeader(jsxRuntime,kt)'));
assert.ok(!production.includes('Phiên bản ứng dụng 1.3.4'));
assert.ok(!production.includes('children:"v1.3.4"'));

const switchSource = read('src/ui/components/form-controls.js').split('export function createToggleSwitch')[1];
assert.ok(production.includes('yl=__stsCreateToggleSwitch(jsxRuntime,React,cn)'));
assert.ok(switchSource.includes("type: 'button', disabled"));
assert.ok(switchSource.includes("role: 'switch'"));
assert.ok(!switchSource.includes('onKeyDown:'));
assert.ok(!switchSource.includes('aria-disabled'));

const loreSource = read('src/features/world-info/ui/lorebook-controls.js').split('export function createLorebookEntryCard')[1].split('export function createActiveWorldInfoEntry')[0];
assert.ok(production.includes('Nc=__stsCreateLorebookEntryCard('));
assert.match(loreSource, /jsxRuntime\.jsxs\)\("article",\s*\{\s*"aria-labelledby":/);
assert.match(loreSource, /jsxRuntime\.jsxs\)\("h3",\s*\{\s*id:/);
assert.ok(!loreSource.includes('role: "button"'));
assert.ok(!loreSource.includes('Chỉnh sửa mục'));
assert.match(loreSource, /ariaLabel:\s*(?:undefined|void 0),[\s\S]*?checked:\s*(?:false|!1)\s*!==\s*propEntry\.enabled/);
assert.ok(!loreSource.includes('role: "img"'));
assert.ok(!production.includes('Chưa đồng bộ Semantic'));
assert.ok(/showPipeline(?:\s*:\s*__stsShowPipeline)?\s*=\s*(?:false|!1)/.test(production));
assert.ok(/extractThinkingBlocksAndCleanText\(preparedText,\s*showPipeline\)|showPipeline[\s\S]{0,60}\.push\(\{\s*label:/.test(production));
assert.ok(/isStreaming\b[\s\S]{0,300}onArenaSelect\b[\s\S]{0,300}onArenaRetry\b[\s\S]{0,300}showPipeline\b/.test(production));
assert.ok(/showPipeline\]/.test(production));
assert.ok(production.includes('__stsLiveStreamText=__stsCreateLiveStreamText('));
assert.ok(/(?:__stsLiveStreamStore|liveStreamStore)\.subscribe/.test(production));
assert.ok(/(?:__stsLiveStreamStore|liveStreamStore)\.getSnapshot/.test(production));
assert.ok(/messageId:\s*(?:message|e)\.id,\s*slot:\s*['"]main['"],\s*fallback:\s*(?:message|e)\.content/.test(production));
assert.ok(/messageId:\s*(?:message|e)\.id\b/.test(production), 'Arena stream sides must receive the parent message id');
assert.ok(
  /isStreaming[\s\S]{0,80}['"]model['"]\s*===\s*(?:message|b)\.role|(?:message|b)\.role\s*===\s*['"]model['"]/.test(production),
  'streaming messages must render raw text without interactive regex parsing',
);
assert.ok(
  !production.includes('K=!U||b.interactiveHtml||b.interactiveHtmlBlocks?.length?null:gd(b.content'),
  'interactive regex pipeline must never run on the active streaming message',
);

const promptSource = read('src/features/presets/ui/preset-sections.js').split('export function createPromptListItem')[1].split('export function createPromptPreview')[0];
assert.ok(production.includes('pu=__stsCreatePromptListItem('));
assert.match(promptSource, /ariaLabel:\s*(?:undefined|void 0),[\s\S]*?checked:\s*propPrompt\.enabled\s*\?\?\s*(?:false|!1)/);

assert.equal(read('src/ui/styles/accessibility.css'), read('assets/m6/ui/accessibility.css'), 'assets/m6/ui/accessibility.css must match source owner');

for (const removed of [
  'assets/ui-version-display-fix-v1.3.6.js',
  'assets/preset-switch-status-only-v1.3.6.js',
  'assets/lorebook-item-accessibility-v1.3.6.js',
  'assets/model-connection-test-v1.3.6-v2.js',
  'src/ui/model-connection-test.js',
  'assets/m6/ui/model-connection-test.js',
  'assets/accessibility-performance-v1.3.6.css',
]) assert.equal(exists(removed), false, 'legacy M6 artifact must be removed: ' + removed);

console.log('M6 UI/accessibility architecture checks: OK');
