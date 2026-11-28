import assert from 'node:assert/strict';
import { extractTurnSummary, buildTurnSummaryPatch, selectTurnMemoryHistory, invalidateHistorySummaries, summaryHistoryChunkSize } from '../src/features/chat/history-policy.js';
import { processAIResponse } from '../src/features/chat/response-processor.js';

const settings = { memory_mode: 'turn', turn_summary_tag: 'Tóm tắt ngắn' };
const raw = '<content>Chuyện mới</content>\n<Tóm tắt ngắn>Thời gian: 8 giờ.\nĐịa điểm: Quán.</Tóm tắt ngắn>';
const extracted = extractTurnSummary(raw, settings.turn_summary_tag);
assert.deepEqual(extracted, { content: '<content>Chuyện mới</content>', summary: 'Thời gian: 8 giờ.\nĐịa điểm: Quán.' });
assert.equal(extractTurnSummary('<a+b>test</a+b>', 'a+b').summary, 'test');
assert.equal(extractTurnSummary('<a>incomplete', 'a').summary, '');
assert.equal(extractTurnSummary('<a> </a>', 'a').summary, '');
assert.equal(extractTurnSummary('<a>one</a><a>two</a>', 'a').summary, 'one\n\ntwo');
assert.equal(summaryHistoryChunkSize(settings, {}), 0);
assert.equal(summaryHistoryChunkSize({ summarization_chunk_size: 6 }, {}), 6);
let state = { sessionId: 's', messages: [
  { id: 'g', role: 'model', content: 'Greeting' },
  { id: 'u', role: 'user', content: 'User' },
  { id: 'a', role: 'model', content: 'AI' },
], longTermSummaries: ['Old chunk'] };
Object.assign(state, buildTurnSummaryPatch(state, 'a', 'First'));
Object.assign(state, buildTurnSummaryPatch(state, 'a', 'Updated'));
assert.deepEqual(state.longTermSummaries, ['Old chunk', 'Updated']);
state.messages.push({ id: 'u2', role: 'user', content: 'Missing' }, { id: 'a2', role: 'model', content: 'Missing summary' }, { id: 'u3', role: 'user', content: 'Next' }, { id: 'a3', role: 'model', content: 'Last' });
Object.assign(state, buildTurnSummaryPatch(state, 'a3', 'Third'));
assert.deepEqual(selectTurnMemoryHistory(state.messages, state.longTermSummaries).map(x => x.id), ['g','u2','a2','u3','a3']);
const rewind = invalidateHistorySummaries(state, 2, settings, () => 0, state.messages.filter(x => x.id !== 'a'));
assert.deepEqual(rewind.longTermSummaries, ['Old chunk']);
assert.ok(rewind.messages.every(message => !Object.hasOwn(message, 'turnSummaryIndex')));
const output = [], logs = [];
const deps = {
  getState: () => state, getSmartContextSettings: () => settings,
  getSessionRevision: () => 1, processOutput: async content => { output.push(content); return {}; },
  setSessionData: patch => Object.assign(state, patch), logSystemMessage() {},
  logResponse: text => logs.push(text), playSound() {}, nextSequence: () => 1,
};
await processAIResponse({ content: raw, messageId: 'a3' }, deps);
assert.equal(output[0], extracted.content);
assert.equal(logs[0], raw);
assert.equal(state.longTermSummaries.at(-1), extracted.summary);
const before = state.longTermSummaries.length;
await processAIResponse({ content: 'No tag', messageId: 'a2' }, deps);
assert.equal(state.longTermSummaries.length, before);
await processAIResponse({ content: raw, messageId: 'a2', forced: true }, deps);
assert.equal(state.longTermSummaries.length, before);
deps.getSmartContextSettings = () => ({ memory_mode: 'chunk' });
await processAIResponse({ content: raw, messageId: 'a2' }, deps);
assert.equal(output.at(-1), raw);
assert.equal(state.longTermSummaries.length, before);
console.log('Turn memory extraction, replacement, rewind and legacy compatibility: OK');
