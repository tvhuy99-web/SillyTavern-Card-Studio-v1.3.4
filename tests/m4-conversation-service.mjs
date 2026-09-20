import assert from 'node:assert/strict';
import { createConversationService } from '../src/features/chat/conversation-service.js';

const controllers = new Set();
const calls = { prompt: 0, processed: [], sound: [], errors: [], logs: [] };
let messageCounter = 0;
const state = {
  card: { name: 'Card' },
  preset: { stream_response: false },
  messages: [],
  variables: { hp: 10 },
  worldInfoRuntime: { old: true },
  worldInfoState: {},
  generatedLorebookEntries: [],
  isArenaMode: false,
  arenaModelId: null,
};

const deps = {
  getState: () => state,
  setError: value => calls.errors.push(value),
  setLoading: value => { state.loading = value; },
  startTurn: () => { calls.started = (calls.started || 0) + 1; },
  addAbortController: value => controllers.add(value),
  removeAbortController: value => controllers.delete(value),
  addMessage: message => state.messages.push(message),
  updateMessage: (id, patch) => Object.assign(
    state.messages.find(item => item.id === id), patch,
  ),
  setMessages: messages => { state.messages = messages; },
  setSessionData: patch => Object.assign(state, patch),
  turnPolicy: {
    beginTurn({ content, sequence }) {
      return {
        sequence,
        variables: { hp: 10 },
        rpgState: { level: 1 },
        worldInfoRuntime: state.worldInfoRuntime,
        worldInfoState: state.worldInfoState,
        userMessage: { id: 'user-' + sequence, role: 'user', content },
      };
    },
    buildContext(messages, content, forcedContent) {
      return {
        scanInput: [messages.length, content, forcedContent || ''].join(':'),
        promptHistory: messages.slice(-3),
      };
    },
    createArenaState() {
      return {
        enabled: true,
        modelA: { content: '', status: 'pending', completed: false },
        modelB: { content: '', status: 'pending', completed: false },
        selected: null,
      };
    },
    isAbortLike(error, signal) {
      return signal?.aborted || error?.name === 'AbortError';
    },
    compactModelMessages(messages) {
      return { messages, changed: false };
    },
  },
  nextSequence: messages => messages.filter(message => message.role === 'user').length + 1,
  preprocessInput: value => value.trim(),
  async scanWorldInfo() {
    return {
      activeEntries: [{ uid: 'lore-1' }],
      updatedRuntimeState: { scanned: true },
      smartScanLog: { fullPrompt: 'scan', rawResponse: '[]', latency: 1 },
      selectionData: { prompt: 'select', selectedItems: [] },
    };
  },
  logSmartScan: () => { calls.smartScan = (calls.smartScan || 0) + 1; },
  logSelection: () => { calls.selection = (calls.selection || 0) + 1; },
  async buildPrompt() {
    calls.prompt += 1;
    return {
      fullPrompt: 'PROMPT',
      rpgSnapshot: { snapshot: true },
      structuredPrompt: ['PROMPT'],
    };
  },
  logPrompt: () => { calls.promptLog = (calls.promptLog || 0) + 1; },
  createPlaceholderMessage(role) {
    messageCounter += 1;
    return { id: 'model-' + messageCounter, role, content: '...' };
  },
  getConnectionSettings: () => ({ source: 'gemini', gemini_model: 'main' }),
  getProxyProfiles: () => [],
  arenaState: {
    describePair() {
      return {
        main: { model: 'main', provider: 'gemini', profileId: null },
        challenger: { model: 'challenger', provider: 'openrouter', profileId: null },
      };
    },
    resolveProxyConfig: () => undefined,
    withContent(arena, slot, content) {
      return { ...arena, [slot]: { ...arena[slot], content } };
    },
    withResult(arena, slot, content, signal) {
      return {
        ...arena,
        [slot]: {
          ...arena[slot],
          content,
          status: signal.aborted ? 'stopped' : content ? 'success' : 'error',
        },
      };
    },
    withError(arena, slot, error) {
      return {
        ...arena,
        [slot]: { ...arena[slot], content: String(error), status: 'error' },
      };
    },
    complete(arena, slot) {
      return { ...arena, [slot]: { ...arena[slot], completed: true } };
    },
  },
  generationGateway: {
    async generateOnce() {
      return { response: { text: 'AI' }, reasoning: 'WHY' };
    },
    async *stream({ source }) {
      yield { text: source === 'openrouter' ? 'B' : 'A' };
    },
  },
  async processAIResponse(content, id, forced) {
    calls.processed.push({ content, id, forced });
  },
  playSound: kind => calls.sound.push(kind),
  logSystemMessage: (...args) => calls.logs.push(args),
  runtimeSize: () => controllers.size,
  streamUpdateInterval: 0,
};

const conversation = createConversationService(deps);

assert.equal(await conversation.send(' hello '), true);
assert.equal(state.messages.length, 2);
assert.equal(state.messages[0].content, 'hello');
assert.equal(state.messages[1].content, 'AI');
assert.equal(state.messages[1].reasoning_content, 'WHY');
assert.deepEqual(state.messages[1].activeLorebookUids, ['lore-1']);
assert.equal(calls.prompt, 1);
assert.equal(calls.processed.at(-1).forced, false);
assert.equal(controllers.size, 0);
assert.equal(state.loading, false);

assert.equal(await conversation.send('forced input', { forcedContent: 'FORCED' }), true);
assert.equal(calls.prompt, 1);
assert.equal(calls.processed.at(-1).content, 'FORCED');
assert.equal(calls.processed.at(-1).forced, true);

state.isArenaMode = true;
state.arenaModelId = 'challenger';
assert.equal(await conversation.send('arena input'), true);
const arenaMessage = state.messages.at(-1);
assert.equal(arenaMessage.arena.modelA.content, 'A');
assert.equal(arenaMessage.arena.modelB.content, 'B');
assert.equal(arenaMessage.arena.modelA.completed, true);
assert.equal(arenaMessage.arena.modelB.completed, true);
assert.equal(arenaMessage.arena.modelA.status, 'success');
assert.equal(arenaMessage.arena.modelB.status, 'success');
assert.deepEqual(calls.sound, ['ai']);
assert.equal(controllers.size, 0);
assert.equal(state.loading, false);

console.log('M4 conversation service tests: OK');
