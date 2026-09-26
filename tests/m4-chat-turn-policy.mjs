import assert from 'node:assert/strict';
import { createChatTurnPolicy } from '../src/features/chat/turn-policy.js';

const policy = createChatTurnPolicy({ now: () => 1234, random: () => 0.5 });
const state = {
  variables: { hp: 10 },
  card: { rpg_data: { gold: 3 } },
  worldInfoRuntime: { seen: true },
  worldInfoState: { active: [1] },
  arenaModelId: 'challenger',
  arenaProvider: 'proxy',
  arenaUserProfileId: 'p2',
};

const turn = policy.beginTurn({ state, content: 'Xin chào', sequence: 8 });
assert.equal(turn.sequence, 8);
assert.equal(turn.userMessage.role, 'user');
assert.equal(turn.userMessage.timestamp, 1234);
assert.equal(turn.userMessage.content, 'Xin chào');
turn.variables.hp = 1;
assert.equal(state.variables.hp, 10, 'turn snapshot must not mutate store state');

const context = policy.buildContext([
  { role: 'user', content: 'u1' },
  { role: 'model', content: '<content>a1</content>' },
  { role: 'model', content: 'a2' },
  { role: 'user', content: 'u2' },
], 'new', 'forced');
assert.equal(context.recentText, 'a1\na2\nu2');
assert.equal(context.scanInput, 'a1\na2\nu2\nnew\nforced');
assert.deepEqual(context.promptHistory, [
  { role: 'model', content: 'a1' },
  { role: 'model', content: 'a2' },
  { role: 'user', content: 'u2' },
]);

const pipeline = '<thinking>hidden</thinking><plan>plan</plan><basic_confirmation>ok</basic_confirmation><draft>draft</draft><revision_confirmation>rev</revision_confirmation><content>final</content>';
const compacted = policy.compactModelMessages([
  { id: 'm1', role: 'model', content: pipeline },
  { id: 'u2', role: 'user', content: 'next' },
], { keepLatest: false });
assert.equal(compacted.changed, true);
assert.equal(compacted.messages[0].content, 'final');
assert.equal(policy.modelContextContent({ role: 'model', content: '<thinking>x</thinking><plan>y</plan>visible' }), 'visible');

const unitPipeline = '<draft_unit_plan>unit 1</draft_unit_plan><content>part 1</content><draft_unit_plan>unit 2</draft_unit_plan><content>part 2</content>';
assert.equal(
  policy.modelContextContent({ role: 'model', content: unitPipeline }),
  'part 1\n\npart 2',
  'all content blocks must be joined in order while draft_unit_plan stays internal',
);
assert.equal(
  policy.modelContextContent({ role: 'model', content: '<draft_unit_plan>hidden</draft_unit_plan>visible' }),
  'visible',
  'draft_unit_plan must be stripped when content wrappers are absent',
);
assert.equal(
  policy.modelContextContent({ role: 'model', content: '<content>before<draft_unit_plan>hidden</draft_unit_plan>after</content>' }),
  'beforeafter',
  'draft_unit_plan must not leak even when a malformed preset places it inside content',
);

const arena = policy.createArenaState({
  source: 'proxy',
  proxy_model: 'main-proxy',
  proxy_profile_id: 'p1',
}, state);
assert.equal(arena.modelA.modelId, 'main-proxy');
assert.equal(arena.modelA.profileId, 'p1');
assert.equal(arena.modelB.modelId, 'challenger');
assert.equal(arena.modelB.profileId, 'p2');
assert.equal(arena.modelA.status, 'pending');

assert.equal(policy.isAbortLike(new DOMException('Aborted', 'AbortError')), true);
assert.equal(policy.isAbortLike(new Error('network failed')), false);
assert.equal(policy.generationStatus('text', { aborted: false }), 'success');
assert.equal(policy.generationStatus('', { aborted: false }), 'error');
assert.equal(policy.generationStatus('text', { aborted: true }), 'stopped');

console.log('M4 chat turn policy tests: OK');
