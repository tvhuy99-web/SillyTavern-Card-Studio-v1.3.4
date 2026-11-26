import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import { renderEntry } from '../build/asset-manifest.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = readRecoveredHostView();
const sessionPersistenceAsset = read('assets/m5/app/persistence/session-state.js');
assert.ok(!sessionPersistenceAsset.includes("../../features/chat/turn-policy.js"), 'M5 persistence must not import M4 chat modules via a broken relative path');

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("statePersistence: 'tiered-owned-state'"));
assert.ok(entry.includes("arenaState: 'owned-state-machine'"));
assert.ok(entry.includes("runtimeGuard: 'service-driven'"));
assert.ok(entry.includes("installRuntimeUxGuard()"));

assert.ok(!index.includes('chat-send-recovery-v1.3.6.5.js'));
assert.ok(!index.includes('arena-runtime-ux-guard-v1.3.6.5.js'));

for (const token of [
  './initial-variable-service-v1.3.6.js',
  './m5/app/state/runtime-state.js',
  './m5/app/persistence/session-state.js',
  './m5/diagnostics/state.js',
  './m5/features/arena/state-machine.js',
  '__stsSessionPersistence.createSessionSnapshot',
  '__stsSessionPersistence.normalizeLoadedSession',
  'conversationService.retryArena',
  '__stsDiagnosticsState.addNetwork',
  '__stsRuntimeState.size()',
]) assert.ok(production.includes(token), 'missing M5 ownership token: ' + token);

for (const forbidden of [
  'abortControllers:new Set',
  '.abortControllers.size',
  'arenaNormalizeSideOnLoad=e=>',
  'logs:e.logs??t.logs',
  'initialDiagnosticLog:e.initialDiagnosticLog??t.initialDiagnosticLog',
]) assert.ok(!production.includes(forbidden), 'legacy mixed-state code survived: ' + forbidden);

const snapshotStart = production.indexOf('__stsSessionPersistence.createSessionSnapshot');
assert.ok(snapshotStart >= 0);
assert.ok(!production.slice(snapshotStart - 150, snapshotStart + 500).includes('logs:e.logs'));
assert.ok(!production.includes('[e,i,o,s,l,c,u,d,h,p,m,g,f,y,v,x,_,w,k,S,C,E,N,T,U,H]'), 'diagnostics must not trigger autosave');
assert.ok(/(?:__stsDiagnosticsState|diagnosticsState)\.drop\((?:sessionId|e)\)/.test(production));
assert.ok(/(?:__stsDiagnosticsState|diagnosticsState)\.clearAll\(\)/.test(production));
assert.ok(/(?:__stsSessionPersistence|sessionPersistence)\.normalizeLoadedSession\([\s\S]{0,600}\.record/.test(production));
assert.ok(!production.includes('lastUpdated:Date.now(),initialDiagnosticLog:d}'));
assert.ok(/(?:__stsMergeInitialVariableSources|mergeInitialVariableSources)\(/.test(production));
assert.ok(production.includes('__stsSeedSessionInitialVariablesFromCard') && production.includes('originalRawContent'));
assert.ok(production.includes('variablesHealed') || production.includes('__stsVariablesHealed'));
assert.ok(/contextState:\s*JSON\.parse\(JSON\.stringify\([^)]+\.variables\)\)/.test(production));
assert.ok(/(?:arenaStateHealed|needsSaveAfterHeal)\s*=\s*[^;]*needsRewrite\s*\|\|\s*[^;]*[vV]ariablesHealed/.test(production));
assert.ok(read('src/features/chat/hooks/use-message-history.js').includes("__stsMergeInitialVariableSources({},card?.char_book?.entries||[],String(card?.first_mes||''),text=>dependencies.relaxedJson.default.parse(text))"));
assert.ok(!production.includes('e.comment?.includes("[InitVar]")'));
assert.ok(!production.includes('L.current=U(),M.current=setTimeout'), 'autosave must not build snapshots eagerly on every state change');
assert.ok(/(?:__stsAutosave|autosave)\.markDirty\(\)/.test(production), 'autosave must mark dirty via coordinator');
assert.ok(/isBusy:\s*\w+\s*=>\s*(?:dependencies\.)?__stsRuntimeState\.isBusy\(\)\s*\|\|\s*\w+\.isLoading/.test(production), 'autosave must defer while busy');
assert.ok(read('src/features/chat/conversation-service.js').includes('async function retryArena('), 'Arena retry belongs to conversation service');
assert.ok(/(?:__stsAutosave|autosave)\.flush\(\{\s*force:\s*(?:true|!0),\s*overrides/.test(production), 'explicit save must use coordinator');
assert.ok(/await\s+(?:dependencies\.)?__stsSessionWriteQueue\.drain\(\)/.test(production), 'session load waits for pending queued saves');
assert.ok(production.includes('beforeTurn: async () => true === await deleteMessage(userMessage.id, { persist: false, allowBusy: true })'), 'regenerate must rewind inside the visible send busy state without an intermediate DB save');
assert.ok(read('src/features/chat/hooks/use-message-history.js').includes('options.persist !== false'), 'rewind must support skipping the intermediate persistence write');

assert.ok(
  /originalRawContent:\s*\w+,\s*contextState:\s*JSON\.parse\(JSON\.stringify\(\w+\)\),\s*timestamp:\s*Date\.now\(\)/.test(production),
  'opening message must persist the initialized variable snapshot',
);
assert.ok(
  /content:\s*\w+,\s*contextState:\s*JSON\.parse\(JSON\.stringify\(\w+\)\),\s*timestamp:\s*Date\.now\(\),?\s*\}/.test(production),
  'raw first-message fallback must persist the initialized variable snapshot',
);

for (const [source, generated] of [
  ['src/app/state/runtime-state.js', 'assets/m5/app/state/runtime-state.js'],
  ['src/app/persistence/session-state.js', 'assets/m5/app/persistence/session-state.js'],
  ['src/diagnostics/state.js', 'assets/m5/diagnostics/state.js'],
  ['src/features/arena/state-machine.js', 'assets/m5/features/arena/state-machine.js'],
  ['src/ui/runtime-guard.js', 'assets/m5/ui/runtime-guard.js'],
]) assert.equal(read(source), read(generated), generated + ' must match source owner');

assert.equal(exists('assets/chat-send-recovery-v1.3.6.5.js'), false);
assert.equal(exists('assets/arena-runtime-ux-guard-v1.3.6.5.js'), false);
assert.equal(renderEntry(read('src/app/entry.js')), read('assets/app-entry-v1.3.6.js'), 'generated app entry must match source owner');
assert.ok(index.includes('app-entry-v1.3.6.js?v=1.3.6-m7.5'));

const runtimeGuard = read('src/ui/runtime-guard.js');
assert.ok(!runtimeGuard.includes('window.fetch ='));
assert.ok(!runtimeGuard.includes('XMLHttpRequest.prototype'));
assert.ok(runtimeGuard.includes('runtimeState.isBusy()'));

console.log('M5 architecture boundary checks: OK');
