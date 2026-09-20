import assert from 'node:assert/strict';
import { processAIResponse } from '../src/features/chat/response-processor.js';

{
  const events = [];
  const state = {
    messages: [{ id: 'm1', rpgSnapshot: { old: true } }],
    card: { rpg_data: { settings: { executionMode: 'integrated' }, tables: [{ config: { id: 't1' } }] } },
    worldInfoRuntime: { mythic_t1_row1: { lastActiveTurn: 1 } },
  };
  await processAIResponse({ content: 'updated response content long enough for processing', messageId: 'm1', forced: false }, {
    getState: () => state,
    processOutput: async (...args) => events.push(['output', ...args]),
    logResponse: value => events.push(['response', value]),
    playSound: value => events.push(['sound', value]),
    logSystemMessage: (...args) => events.push(['log', ...args]),
    parseRpgActions: () => [{ type: 'UPDATE', tableIndex: 0, rowId: 'row1' }],
    applyRpgActions: () => ({ newDb: state.card.rpg_data, notifications: ['changed'], logs: ['ok'] }),
    buildGeneratedLorebookEntries: () => [{ uid: 'generated' }],
    nextSequence: () => 8,
    setSessionData: value => events.push(['session', value]),
    updateMessage: (...args) => events.push(['message', ...args]),
    setRpgNotification: value => events.push(['notice', value]),
    setGeneratedLorebookEntries: value => events.push(['generated', value]),
    runStandaloneMythic: async () => { throw new Error('should not run'); },
  });
  assert.ok(events.some(event => event[0] === 'sound' && event[1] === 'ai'));
  assert.ok(events.some(event => event[0] === 'sound' && event[1] === 'rpg'));
  const runtimeWrite = events.find(event => event[0] === 'session' && event[1].worldInfoRuntime);
  assert.equal(runtimeWrite[1].worldInfoRuntime.mythic_t1_row1.lastActiveTurn, 8);
}

{
  let standalone = 0;
  const state = { messages: [{ id: 'm2' }], card: { rpg_data: { settings: { executionMode: 'standalone' } } }, worldInfoRuntime: {} };
  await processAIResponse({ content: 'text', messageId: 'm2', forced: true }, {
    getState: () => state,
    processOutput: async () => {}, logResponse() {}, playSound() {}, logSystemMessage() {}, nextSequence: () => 1,
    runStandaloneMythic: async () => { standalone += 1; },
  });
  assert.equal(standalone, 1);
}

console.log('M4 response processor checks: OK');
