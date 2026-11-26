import { modelContextContent } from '../chat/turn-policy.js';
import { summaryChunkSize } from '../../../recovered/features/chat/history-policy.js';
import {
  assemblePrompt,
  buildBaseSections,
  createPromptAssembler,
} from './prompt-assembler.js';

const modelContextCache = new WeakMap();

function cachedModelContextContent(message) {
  if (!message || typeof message !== 'object' || message.role !== 'model') return message?.content;
  const content = String(message.content ?? '');
  const cached = modelContextCache.get(message);
  if (cached?.source === content) return cached.value;
  const value = modelContextContent(message);
  modelContextCache.set(message, { source: content, value });
  return value;
}

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

async function yieldToBrowser() {
  await new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function buildConversationPrompt(input, deps = {}) {
  const state = input.state;
  const generatedEntries = input.generatedEntries ?? state.generatedLorebookEntries ?? [];
  const lorebooks = [
    ...(deps.lorebooks || []),
    { name: 'Session Generated', book: { entries: generatedEntries } },
  ];
  const needsDefaultAssembler = !deps.buildBaseSections || !deps.buildPromptCore;
  const assembler = needsDefaultAssembler
    ? createPromptAssembler(deps.assemblerDeps || deps)
    : null;
  const resolveBaseSections = deps.buildBaseSections
    || (assembler ? assembler.buildBaseSections : buildBaseSections);
  const runPromptCore = deps.buildPromptCore
    || (assembler ? assembler.assemblePrompt : assemblePrompt);

  const started = nowMs();
  const { baseSections } = resolveBaseSections(state.card, state.preset, 0, state.persona);
  const chunkSize = summaryChunkSize({ summarization_chunk_size: deps.getSummaryChunkSize?.() || 12 }, state);
  const sourceMessages = input.messages || [...(state.messages || []), input.userMessage].filter(Boolean);
  const messages = sourceMessages.map(message => {
    if (message?.role !== 'model') return message;
    const content = cachedModelContextContent(message);
    return content === String(message.content ?? '') ? message : { ...message, content };
  });

  const preparedAt = nowMs();
  // Always yield before prompt core execution. This guarantees that a click-triggered
  // loading state has a chance to paint before regex/EJS/World Info processing begins.
  await yieldToBrowser();
  const coreStarted = nowMs();
  const result = await runPromptCore(
    baseSections,
    messages,
    state.authorNote,
    state.card,
    state.longTermSummaries,
    chunkSize,
    state.variables,
    state.lastStateBlock,
    lorebooks,
    state.preset.context_mode || 'standard',
    state.persona?.name || 'User',
    state.worldInfoState,
    input.activeEntries,
    state.worldInfoPlacement,
    state.preset,
    state.visualState?.disableInteractiveMode,
    state.persona?.description || '',
  );
  const finishedAt = nowMs();
  deps.onTiming?.({
    prepareMs: Math.max(0, preparedAt - started),
    coreMs: Math.max(0, finishedAt - coreStarted),
    totalMs: Math.max(0, finishedAt - started),
    messageCount: messages.length,
    characterCount: messages.reduce((sum, message) => sum + String(message?.content || '').length, 0),
  });
  return result;
}
