import assert from 'node:assert/strict';
import { createChatTurnPolicy, buildSemanticScanInput } from '../src/features/chat/turn-policy.js';

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
assert.equal(context.scanInput, 'new\nforced\na1\na2\nu2');
assert.deepEqual(context.promptHistory, [
  { role: 'model', content: 'a1' },
  { role: 'model', content: 'a2' },
  { role: 'user', content: 'u2' },
]);

// Previously all three assistant messages preceded the user's newest turn.
// Truncation at 2,048 embedding tokens could drop that turn entirely.
const longAnswer = 'truyện dài kỳ '.repeat(1400);
const turnTwo = policy.buildContext([
  { role: 'model', content: '<content>' + longAnswer + '</content>' },
], 'Mở cánh cổng rồng ở phía đông');
assert.ok(turnTwo.scanInput.startsWith('Mở cánh cổng rồng ở phía đông'));
assert.ok(turnTwo.scanInput.length < 3500, 'bound semantic input regardless of assistant response length');
assert.equal(turnTwo.promptHistory[0].content, longAnswer.trim());
const turnThree = policy.buildContext([
  { role: 'model', content: '<content>' + longAnswer + '</content>' },
  { role: 'user', content: 'previous user' },
  { role: 'model', content: '<thinking>hidden</thinking><content>' + longAnswer + '</content>' },
], 'Nhân vật tìm được chiếc chìa khóa mới');
assert.ok(turnThree.scanInput.startsWith('Nhân vật tìm được chiếc chìa khóa mới'));
assert.equal(turnThree.scanInput.includes('hidden'), false, 'internal model reasoning stays excluded');
assert.ok(turnThree.scanInput.length < 3500);
const longUser = 'START ' + 'x'.repeat(5000) + ' END';
const clipped = buildSemanticScanInput(longAnswer, longUser);
assert.ok(clipped.startsWith('START '));
assert.ok(clipped.includes(' END'), 'retain the end of an unusually long current user turn');
assert.ok(clipped.length < 3500);

const pipeline = '<think>legacy hidden</think><thinking>hidden</thinking><plan>plan</plan><basic_confirmation>ok</basic_confirmation><draft>draft</draft><revision_confirmation>rev</revision_confirmation><content>final</content>';
const compacted = policy.compactModelMessages([
  { id: 'm1', role: 'model', content: pipeline },
  { id: 'u2', role: 'user', content: 'next' },
], { keepLatest: false });
assert.equal(compacted.changed, true);
assert.equal(compacted.messages[0].content, 'final');
assert.equal(policy.modelContextContent({ role: 'model', content: '<thinking>x</thinking><plan>y</plan>visible' }), 'visible');
assert.equal(policy.modelContextContent({ role: 'model', content: '<think>x</think><inner_monologue>y</inner_monologue>visible' }), 'visible');

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

const referencedContentTagPipeline = [
  '<inner_monologue>',
  '[STEP_1: INIT_CALIBRATION]',
  '• 语言协议：<inner_monologue> 为中文，<content> 为 Tiếng Việt。',
  '[/STEP_1]',
  '[STEP_2: USER_INTENT_DECODING]',
  'SECRET REASONING MUST NOT LEAK',
  '[/STEP_2]',
  '</inner_monologue>',
  '<draft_unit_plan>internal unit plan</draft_unit_plan>',
  '<content>story only</content>',
].join('\n');
assert.equal(
  policy.modelContextContent({ role: 'model', content: referencedContentTagPipeline }),
  'story only',
  'a literal <content> mention inside reasoning must not be mistaken for the real story block',
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
