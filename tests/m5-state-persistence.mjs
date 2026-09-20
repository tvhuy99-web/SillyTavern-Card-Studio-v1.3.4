import assert from 'node:assert/strict';
import { runtimeState } from '../src/app/state/runtime-state.js';
import { diagnosticsState } from '../src/diagnostics/state.js';
import {
  createSessionSnapshot,
  normalizeLoadedSession,
  sessionStateContract,
} from '../src/app/persistence/session-state.js';

runtimeState.abortAll('test-reset');
const a = new AbortController();
const b = new AbortController();
runtimeState.add(a);
runtimeState.add(b);
assert.equal(runtimeState.size(), 2);
runtimeState.remove(a);
assert.equal(runtimeState.size(), 1);
assert.equal(runtimeState.abortAll('test'), 1);
assert.equal(runtimeState.size(), 0);
assert.equal(b.signal.aborted, true);

diagnosticsState.activate('s1');
diagnosticsState.clear();
diagnosticsState.addTurn({ id: 1 });
diagnosticsState.addSystem({ message: 'x' });
diagnosticsState.addNetwork({ url: '/test' });
const logs = diagnosticsState.snapshot();
assert.equal(logs.turns.length, 1);
assert.equal(logs.systemLog.length, 1);
assert.equal(logs.networkLog.length, 1);
diagnosticsState.activate('other');
assert.equal(diagnosticsState.snapshot().turns.length, 0);
diagnosticsState.activate('s1');
assert.equal(diagnosticsState.snapshot().turns[0].id, 1, 'diagnostics must survive chat tab/session switches in memory');

const state = {
  sessionId: 's1',
  card: { fileName: 'char.png', name: 'Char', rpg_data: { hp: 1 } },
  preset: { name: 'Default' },
  persona: { id: 'p1' },
  messages: [{ role: 'model', content: 'hello' }],
  longTermSummaries: [],
  summaryQueue: [],
  storyQueue: [],
  variables: {},
  extensionSettings: {},
  worldInfoState: {},
  worldInfoPinned: {},
  worldInfoPlacement: {},
  worldInfoRuntime: {},
  visualState: { bg: 'off', music: 'x.mp3' },
  authorNote: '',
  lastStateBlock: '',
  generatedLorebookEntries: [],
  isArenaMode: true,
  arenaModelId: 'm2',
  arenaProvider: 'proxy',
  arenaUserProfileId: 'profile',
  logs,
  initialDiagnosticLog: 'diagnostic',
  isLoading: true,
  abortControllers: new Set([new AbortController()]),
};

const snapshot = createSessionSnapshot(state, {}, { snippet: value => String(value).slice(0, 10), now: () => 99 });
assert.equal(snapshot.sessionId, 's1');
assert.equal(snapshot.lastUpdated, 99);
assert.equal(snapshot.visualState.backgroundImage, '');
assert.equal(snapshot.visualState.musicUrl, 'x.mp3');
assert.equal('logs' in snapshot, false);
assert.equal('initialDiagnosticLog' in snapshot, false);
assert.equal('isLoading' in snapshot, false);
assert.equal('abortControllers' in snapshot, false);

const legacy = {
  ...snapshot,
  logs,
  initialDiagnosticLog: 'old',
  isLoading: true,
  visualState: { bg: 'off', sound: 'wind.mp3' },
  chatHistory: [
    {
      id: 'old',
      role: 'model',
      content: '<basic_confirmation>x</basic_confirmation><draft>draft</draft><revision_confirmation>rev</revision_confirmation><content>old final</content>',
    },
    {
      id: 'latest',
      role: 'model',
      content: '<basic_confirmation>keep</basic_confirmation><content>latest final</content>',
      arena: {
        modelA: { name: 'a', content: 'done', completed: true },
        modelB: { name: 'b', content: '', completed: false },
      },
    },
  ],
};
const normalized = normalizeLoadedSession(legacy);
assert.equal(normalized.needsRewrite, true);
assert.equal('logs' in normalized.record, false);
assert.equal('initialDiagnosticLog' in normalized.record, false);
assert.equal(normalized.record.visualState.backgroundImage, '');
assert.equal(normalized.record.visualState.ambientSoundUrl, 'wind.mp3');
assert.equal(normalized.record.chatHistory[0].content, 'old final');
assert.match(normalized.record.chatHistory[1].content, /<basic_confirmation>keep<\/basic_confirmation>/);
assert.equal(normalized.record.chatHistory[1].arena.modelA.status, 'success');
assert.equal(normalized.record.chatHistory[1].arena.modelB.status, 'stopped');
assert.equal(normalized.record.chatHistory[1].arena.modelB.completed, true);

assert.ok(sessionStateContract.persistent.includes('chatHistory'));
assert.ok(sessionStateContract.runtimeOnly.includes('abortControllers'));
assert.ok(sessionStateContract.diagnosticsOnly.includes('logs'));

console.log('M5 state/persistence tests: OK');
