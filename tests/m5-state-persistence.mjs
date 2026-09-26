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
diagnosticsState.drop('s1');
diagnosticsState.activate('s1');
assert.equal(diagnosticsState.snapshot().turns.length, 0, 'deleted sessions must not resurrect diagnostics');
diagnosticsState.addTurn({ id: 2 });
diagnosticsState.clearAll();
diagnosticsState.activate('s1');
assert.equal(diagnosticsState.snapshot().turns.length, 0, 'global cleanup must clear RAM diagnostics');
diagnosticsState.addSystem({ message: 'fresh' });
diagnosticsState.activate('other-2');
diagnosticsState.activate('s1');
assert.equal(diagnosticsState.snapshot().systemLog[0].message, 'fresh', 'active session must stay attached after global cleanup');

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
const persistedPipeline = createSessionSnapshot({
  ...state,
  messages: [
    { id: 'old-pipeline', role: 'model', content: '<think>legacy</think><thinking>x</thinking><draft>d</draft><draft_unit_plan>unit</draft_unit_plan><content>old persisted</content>' },
    { id: 'u', role: 'user', content: 'next' },
    { id: 'latest-pipeline', role: 'model', content: '<basic_confirmation>keep</basic_confirmation><content>latest persisted</content>' },
  ],
}, {}, { now: () => 100 });
assert.equal(persistedPipeline.chatHistory[0].content, 'old persisted');
assert.match(persistedPipeline.chatHistory[2].content, /<basic_confirmation>keep<\/basic_confirmation>/);

const referencedContentTagSnapshot = createSessionSnapshot({
  ...state,
  messages: [
    {
      id: 'reasoning-mentions-content',
      role: 'model',
      content: '<inner_monologue>STEP_1: <content> means Vietnamese. SECRET STEP_2<\/inner_monologue><draft_unit_plan>plan<\/draft_unit_plan><content>clean story<\/content>',
    },
    { id: 'u-after', role: 'user', content: 'next' },
  ],
}, {}, { now: () => 101 });
assert.equal(referencedContentTagSnapshot.chatHistory[0].content, 'clean story');
assert.ok(!referencedContentTagSnapshot.chatHistory[0].content.includes('SECRET STEP_2'));

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
      content: '<think>legacy</think><basic_confirmation>x</basic_confirmation><draft>draft</draft><draft_unit_plan>unit</draft_unit_plan><revision_confirmation>rev</revision_confirmation><content>old final</content>',
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
