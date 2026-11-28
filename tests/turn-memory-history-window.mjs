import assert from 'node:assert/strict';
import { selectTurnMemoryHistory, normalizeTurnHistoryKeep, partitionTurnMemory } from '../src/features/chat/history-policy.js';
import { buildHistoryContext } from '../src/features/prompts/assembler/history-context-builder.js';
import { buildConversationPrompt } from '../src/features/prompts/prompt-service.js';

const messages = [{ id: 'greeting', role: 'model', content: 'Greeting' }];
const summaries = [];
for (let turn = 1; turn <= 20; turn++) {
  messages.push({ id: 'u' + turn, role: 'user', content: 'User ' + turn });
  if (turn === 2) messages.push({ id: 'system', role: 'system', content: 'System instruction' });
  const message = { id: 'a' + turn, role: 'model', content: 'Response ' + turn };
  if (turn !== 3) {
    message.turnSummaryIndex = summaries.length;
    message.turnSummary = 'Summary ' + turn;
    summaries.push(message.turnSummary);
  }
  messages.push(message);
}
messages.push({ id: 'pending', role: 'user', content: 'Pending input' });
const ids = selected => selected.map(message => message.id);
const expected = count => messages.filter(message =>
  ['greeting','system','pending','u3','a3'].includes(message.id)
  || (/^[ua][0-9]+$/.test(message.id) && Number(message.id.slice(1)) > 20 - count)
).map(message => message.id);
assert.deepEqual(ids(selectTurnMemoryHistory(messages, summaries)), expected(10));
for (const count of [1, 5, 10, 20, 100]) {
  const partition = partitionTurnMemory(messages, summaries, count);
  assert.deepEqual(ids(partition.messages), expected(count));
  assert.deepEqual(partition.summaries, summaries.filter(summary => Number(summary.split(' ')[1]) <= 20 - count));
  for (const message of partition.messages) {
    if (message.turnSummary) assert.ok(!partition.archivedIndices.has(message.turnSummaryIndex));
  }
}
assert.equal(normalizeTurnHistoryKeep(undefined), 10);
assert.equal(normalizeTurnHistoryKeep(null), 10);
assert.equal(normalizeTurnHistoryKeep(''), 10);
assert.equal(normalizeTurnHistoryKeep('invalid'), 10);
assert.equal(normalizeTurnHistoryKeep(0), 1);
assert.equal(normalizeTurnHistoryKeep(101), 100);
assert.equal(normalizeTurnHistoryKeep(5.8), 5);
assert.equal(messages.length, 43);
assert.equal(summaries.length, 19);

const context = await buildHistoryContext({
  historyMessages: messages, longTermSummaries: summaries, summaryChunkSize: 0,
  turnHistoryKeep: 5, contextMode: 'standard', userName: 'User',
  characterName: 'AI', card: {}, expandMacros: text => text,
  deps: { getRegexEngineMode: () => 'legacy' },
});
assert.ok(context.currentPageLines.includes('AI: Response 16'));
assert.ok(!context.currentPageLines.includes('AI: Response 15'));
assert.ok(context.currentPageLines.includes('AI: Response 3'));
assert.ok(context.currentPageLines.includes('System: System instruction'));
assert.ok(context.longTermSummaryText.includes('Summary 1'));
assert.ok(!context.longTermSummaryText.includes('Summary 20'));
assert.deepEqual(context.promptSummaries, summaries.filter(summary => Number(summary.split(' ')[1]) <= 15));
const allRecent = await buildHistoryContext({
  historyMessages: messages, longTermSummaries: summaries, summaryChunkSize: 0,
  turnHistoryKeep: 100, contextMode: 'standard', userName: 'User',
  characterName: 'AI', card: {}, expandMacros: text => text,
  deps: { getRegexEngineMode: () => 'legacy' },
});
assert.deepEqual(allRecent.promptSummaries, []);
assert.equal(allRecent.longTermSummaryText, 'Đây là khởi đầu của cuộc trò chuyện.');
const duplicateLink = [...messages, {...messages.find(message => message.id === 'a1'), id: 'duplicate'}];
const ambiguous = partitionTurnMemory(duplicateLink, summaries, 5);
assert.ok(ambiguous.messages.some(message => message.id === 'a1'));
assert.ok(!ambiguous.archivedIndices.has(0));
assert.deepEqual(partitionTurnMemory(messages, [...summaries, 'Unlinked legacy summary'], 10).summaries, summaries.filter(summary => Number(summary.split(' ')[1]) <= 10));

let args;
const state = { messages, longTermSummaries: summaries, card: {}, preset: {}, variables: {} };
await buildConversationPrompt({ state, messages }, {
  buildBaseSections: () => ({ baseSections: [] }),
  buildPromptCore: async (...value) => { args = value; return {}; },
  getSummarySettings: () => ({ memory_mode: 'turn', turn_history_keep: 5 }),
});
assert.equal(args[5], 0);
assert.deepEqual(args[17], { turnHistoryKeep: 5 });
await buildConversationPrompt({ state, messages }, {
  buildBaseSections: () => ({ baseSections: [] }),
  buildPromptCore: async (...value) => { args = value; return {}; },
  getSummarySettings: () => ({ memory_mode: 'chunk', summarization_chunk_size: 6 }),
});
assert.equal(args[5], 6);
assert.equal(args.length, 17);
console.log('Turn memory recent history window and prompt forwarding: OK');
