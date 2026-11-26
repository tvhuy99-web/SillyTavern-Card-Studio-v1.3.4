import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderHost } from '../build/asset-manifest.mjs';

const hostRaw = readFileSync(new URL('../src/app/host.js', import.meta.url), 'utf8');
const portable = readFileSync(new URL('../assets/app-production-v1.3.6.js', import.meta.url), 'utf8');
assert.equal(portable, renderHost(hostRaw), 'portable host must be generated from canonical source');
const source = ['src/app/host.js','src/app/composition/persistence-composition.js','src/app/composition/provider-composition.js','src/app/composition/store-composition.js','src/app/composition/conversation-composition.js','src/app/composition/runtime-composition.js','src/app/composition/ui-composition.js'].map(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
assert.doesNotMatch(source, /^(?:var|function) ([$\w]{1,2})\s*(?:=\s*__stsCreate[A-Z]\w+\(|\(\.\.\.args\)\{return __stsCreate[A-Z]\w+\()/m);
for (const [name, factory] of [
  ['Icon', 'Icon'], ['ConnectionSettingsScreen', 'ConnectionSettingsScreen'],
  ['ChatSessionScreen', 'ChatSessionScreen'], ['CardPreviewDialog', 'CardPreviewDialog'],
  ['useDiagnostics', 'DiagnosticsHook'], ['useConversation', 'ConversationHook'],
  ['useChatSession', 'ChatSessionHook'], ['ApplicationShell', 'ApplicationShell'],
]) assert.ok(source.includes(name + '=__stsCreate' + factory + '('), 'missing descriptive host binding: ' + name);
// The remaining dependency contracts use these keys; renaming a lexical
// binding must not implicitly rename an object property read by another module.
for (const marker of ['ToastNotification: ToastItem', 'get broadcastRuntimeMessage(){return broadcastRuntimeMessage}', 'useConversation,processRegex']) assert.ok(source.includes(marker), marker);
assert.ok(source.includes('CardFrame.displayName="InteractiveHtmlMessage"'));
assert.ok(source.includes('CardPreviewDialog.displayName="FloatingStatusHUD"'));
assert.doesNotMatch(source, /^(?:var|let|const|function)\s+[$A-Za-z_][\w$]?\s*(?:=|\()/m, 'no opaque direct top-level declarations in host');
for (const marker of ['createSessionDefaults({arenaSettingsKey', 'createRegexProcessing({readCardRuntimeEngineMode', 'createSummaryGeneration({getProxyForTools', 'get broadcastRuntimeMessage(){return broadcastRuntimeMessage}']) assert.ok(source.includes(marker), marker);
// Every top-level destructured local has a descriptive name; old property keys are retained.
for (const match of source.matchAll(/^var\s*\{([^}\n]+)\}\s*=/gm)) {
  for (const part of match[1].split(',')) {
    const name = part.trim().split(':').at(-1).trim();
    assert.doesNotMatch(name, /^[$A-Za-z_][\w$]?$/, 'opaque destructured binding: ' + name);
  }
}
assert.doesNotMatch(source, /^import[^\n]*\bas\s+[$A-Za-z_][\w$]?(?=\s*[,}])/m, 'opaque named import alias');
assert.ok(source.includes('export{unsupportedRequire as n,commonJsFactory as t};'), 'legacy public exports remain stable');
console.log('F01 readable composition-root binding inventory: OK');
