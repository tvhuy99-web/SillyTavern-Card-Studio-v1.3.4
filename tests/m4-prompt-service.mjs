import assert from 'node:assert/strict';
import { buildConversationPrompt } from '../src/features/prompts/prompt-service.js';

let args;
const state = {
  card: { name: 'Card' }, preset: { context_mode: 'standard' }, persona: { name: 'User', description: 'Persona' },
  messages: [{ role: 'user', content: 'old' }], authorNote: 'note', longTermSummaries: ['sum'], variables: { hp: 1 },
  lastStateBlock: 'state', worldInfoState: { a: true }, worldInfoPlacement: { a: 'before' }, visualState: { disableInteractiveMode: false },
};
const result = await buildConversationPrompt({
  state,
  userMessage: { role: 'user', content: 'new' },
  activeEntries: [{ uid: 'a' }],
  generatedEntries: [{ uid: 'g' }],
}, {
  lorebooks: [{ name: 'External', book: { entries: [] } }],
  buildBaseSections: () => ({ baseSections: ['base'] }),
  getSummaryChunkSize: () => 9,
  buildPromptCore: async (...value) => (args = value, { fullPrompt: 'ok' }),
});
assert.equal(result.fullPrompt, 'ok');
assert.deepEqual(args[0], ['base']);
assert.equal(args[1].length, 2);
assert.equal(args[5], 9);
assert.equal(args[8].at(-1).name, 'Session Generated');
assert.deepEqual(args[12], [{ uid: 'a' }]);
console.log('M4 prompt service checks: OK');
