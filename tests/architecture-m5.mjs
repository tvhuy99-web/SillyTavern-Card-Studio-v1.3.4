import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

const index = read('index.html');
const entry = read('assets/app-entry-v1.3.6.js');
const production = read('assets/app-production-v1.3.6.js');

assert.ok(entry.includes("stage: 'M6-complete'"));
assert.ok(entry.includes("statePersistence: 'tiered-owned-state'"));
assert.ok(entry.includes("arenaState: 'owned-state-machine'"));
assert.ok(entry.includes("runtimeGuard: 'service-driven'"));
assert.ok(entry.includes("installRuntimeUxGuard()"));

assert.ok(!index.includes('chat-send-recovery-v1.3.6.5.js'));
assert.ok(!index.includes('arena-runtime-ux-guard-v1.3.6.5.js'));

for (const token of [
  './m5/app/state/runtime-state.js?v=1.3.6-m5.1',
  './m5/app/persistence/session-state.js?v=1.3.6-m5.1',
  './m5/diagnostics/state.js?v=1.3.6-m5.1',
  './m5/features/arena/state-machine.js?v=1.3.6-m5.1',
  '__stsSessionPersistence.createSessionSnapshot',
  '__stsSessionPersistence.normalizeLoadedSession',
  '__stsArenaState.prepareRetry',
  '__stsArenaState.withResult',
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

for (const [source, generated] of [
  ['src/app/state/runtime-state.js', 'assets/m5/app/state/runtime-state.js'],
  ['src/app/persistence/session-state.js', 'assets/m5/app/persistence/session-state.js'],
  ['src/diagnostics/state.js', 'assets/m5/diagnostics/state.js'],
  ['src/features/arena/state-machine.js', 'assets/m5/features/arena/state-machine.js'],
  ['src/ui/runtime-guard.js', 'assets/m5/ui/runtime-guard.js'],
]) assert.equal(read(source), read(generated), generated + ' must match source owner');

assert.equal(exists('assets/chat-send-recovery-v1.3.6.5.js'), false);
assert.equal(exists('assets/arena-runtime-ux-guard-v1.3.6.5.js'), false);

const runtimeGuard = read('src/ui/runtime-guard.js');
assert.ok(!runtimeGuard.includes('window.fetch ='));
assert.ok(!runtimeGuard.includes('XMLHttpRequest.prototype'));
assert.ok(runtimeGuard.includes('runtimeState.isBusy()'));

console.log('M5 architecture boundary checks: OK');
