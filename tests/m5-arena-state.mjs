import assert from 'node:assert/strict';
import * as arena from '../src/features/arena/state-machine.js';

assert.equal(arena.sideStatus({ completed: false, content: '' }), 'pending');
assert.equal(arena.sideStatus({ completed: true, content: 'ok' }), 'success');
assert.equal(arena.sideStatus({ completed: true, content: '[Lỗi: x]' }), 'error');
assert.equal(arena.canSelect({ status: 'success', completed: true, content: 'ok' }), true);
assert.equal(arena.canSelect({ status: 'error', completed: true, content: 'x' }), false);

const decision = arena.select({
  modelA: { name: 'A', status: 'success', completed: true, content: 'answer' },
  modelB: { name: 'B', status: 'error', completed: true, content: '' },
}, 'A');
assert.equal(decision.ok, true);
assert.equal(decision.content, 'answer');

const retry = arena.prepareRetry(
  { modelB: { name: 'old', modelId: 'snapshot', provider: 'proxy', profileId: 'p2', content: 'old' } },
  'B',
  { source: 'gemini', gemini_model: 'g' },
  { modelId: 'fallback', provider: 'gemini' },
);
assert.equal(retry.slot, 'modelB');
assert.equal(retry.model, 'snapshot');
assert.equal(retry.provider, 'proxy');
assert.equal(retry.profileId, 'p2');
assert.equal(retry.arena.modelB.status, 'pending');

const profiles = [{ id: 'p2', url: 'https://proxy', password: 'x', legacyMode: false }];
assert.deepEqual(arena.resolveProxyConfig('proxy', 'p2', profiles), {
  url: 'https://proxy',
  password: 'x',
  legacyMode: false,
});
assert.equal(arena.resolveProxyConfig('gemini', null, profiles), undefined);

const running = new AbortController();
let state = { modelA: { content: '', status: 'pending', completed: false } };
state = arena.withContent(state, 'modelA', 'hello');
assert.equal(state.modelA.content, 'hello');
state = arena.withResult(state, 'modelA', 'hello', running.signal);
assert.equal(state.modelA.status, 'success');
state = arena.complete(state, 'modelA');
assert.equal(state.modelA.completed, true);

const stopped = new AbortController();
stopped.abort();
const errorState = arena.withError(state, 'modelA', new DOMException('Aborted', 'AbortError'), stopped.signal, 'partial');
assert.equal(errorState.modelA.status, 'stopped');
assert.equal(errorState.modelA.content, 'partial');

console.log('M5 Arena state-machine tests: OK');
