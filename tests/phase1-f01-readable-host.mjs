import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderHost } from '../build/asset-manifest.mjs';

const source = readFileSync(new URL('../src/app/host.js', import.meta.url), 'utf8');
const portable = readFileSync(new URL('../assets/app-production-v1.3.6.js', import.meta.url), 'utf8');
assert.equal(portable, renderHost(source), 'portable host must be generated from canonical source');
assert.doesNotMatch(source, /^(?:var|function) ([$\w]{1,2})\s*(?:=\s*__stsCreate[A-Z]\w+\(|\(\.\.\.args\)\{return __stsCreate[A-Z]\w+\()/m);
for (const [name, factory] of [
  ['Icon', 'Icon'], ['ConnectionSettingsScreen', 'ConnectionSettingsScreen'],
  ['ChatSessionScreen', 'ChatSessionScreen'], ['CardPreviewDialog', 'CardPreviewDialog'],
  ['useDiagnostics', 'DiagnosticsHook'], ['useConversation', 'ConversationHook'],
  ['useChatSession', 'ChatSessionHook'], ['ApplicationShell', 'ApplicationShell'],
]) assert.ok(source.includes(name + '=__stsCreate' + factory + '('), 'missing descriptive host binding: ' + name);
// The existing dependency contracts still use these keys; renaming a lexical
// binding must not implicitly rename an object property read by another module.
for (const marker of ['pl: ToastItem', 'mh: useDiagnostics', 'fh: useConversation']) assert.ok(source.includes(marker), marker);
assert.ok(source.includes('CardFrame.displayName="InteractiveHtmlMessage"'));
assert.ok(source.includes('CardPreviewDialog.displayName="FloatingStatusHUD"'));
assert.doesNotMatch(source, /^(?:var|let|const|function)\s+[$A-Za-z_][\w$]?\s*(?:=|\()/m, 'no opaque direct top-level declarations in host');
for (const marker of ['Eo: arenaSettingsKey', 'Co: readCardRuntimeEngineMode', 'Cs: getProxyForTools', 'get Wh(){return Wh}']) assert.ok(source.includes(marker), marker);
console.log('F01 readable composition-root direct bindings and settings aliases: OK');
