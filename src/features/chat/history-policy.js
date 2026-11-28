const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export const summaryChunkSize = (settings = {}, state) => {
  const stored = state?.summaryChunkSize;
  if (state?.longTermSummaries?.length && Number.isSafeInteger(stored) && stored >= 1 && stored <= 100) return stored;
  return Math.max(1, Math.min(100, Math.floor(Number(settings.summarization_chunk_size) || 10)));
};

export const isTurnMemory = settings => settings?.memory_mode === 'turn';

// The legacy chunk arithmetic must never be used to prune per-turn history.
export const summaryHistoryChunkSize = (settings, state) =>
  isTurnMemory(settings) ? 0 : summaryChunkSize(settings, state);

export function extractTurnSummary(raw, tag = 'Tóm tắt ngắn') {
  const text = String(raw ?? '');
  const name = String(tag ?? '').trim();
  if (!name || /[<>\/\r\n]/u.test(name)) return { content: text, summary: '' };
  const opening = '<' + name + '>', closing = '</' + name + '>';
  let cursor = 0, content = '', summaries = [];
  while (cursor < text.length) {
    const start = text.indexOf(opening, cursor);
    if (start < 0) { content += text.slice(cursor); break; }
    const end = text.indexOf(closing, start + opening.length);
    if (end < 0) { content += text.slice(cursor); break; }
    content += text.slice(cursor, start);
    const summary = text.slice(start + opening.length, end).trim();
    if (summary) summaries.push(summary);
    cursor = end + closing.length;
  }
  return { content: content.trim(), summary: summaries.join('\n\n') };
}

export function hasTurnSummary(message, summaries) {
  return message?.role === 'model' && Number.isSafeInteger(message.turnSummaryIndex)
    && message.turnSummaryIndex >= 0 && typeof message.turnSummary === 'string'
    && !!message.turnSummary && summaries[message.turnSummaryIndex] === message.turnSummary;
}

export function buildTurnSummaryPatch(state, messageId, summary) {
  const target = state.messages.find(message => message.id === messageId && message.role === 'model');
  if (!target || !summary) return null;
  const longTermSummaries = [...(state.longTermSummaries || [])];
  const index = hasTurnSummary(target, longTermSummaries) ? target.turnSummaryIndex : longTermSummaries.length;
  longTermSummaries[index] = summary;
  return {
    longTermSummaries,
    messages: state.messages.map(message => message === target ? { ...message, turnSummary: summary, turnSummaryIndex: index } : message),
  };
}

export function normalizeTurnHistoryKeep(value) {
  if (value == null || String(value).trim() === '') return 10;
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(1, Math.min(100, Math.floor(count))) : 10;
}

// Keep the configured recent full turns and every turn without a recorded
// summary. Never discard system messages or an unsummarized greeting.
export function selectTurnMemoryHistory(messages, summaries, keepTurns = 10) {
  let remaining = normalizeTurnHistoryKeep(keepTurns);
  let firstRecentModel = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'model' && --remaining === 0) {
      firstRecentModel = index;
      break;
    }
  }
  const result = [];
  let pending = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    pending.push(message);
    if (message.role !== 'model') continue;
    if (index < firstRecentModel && hasTurnSummary(message, summaries)) {
      result.push(...pending.filter(item => item.role === 'system'));
    } else result.push(...pending);
    pending = [];
  }
  return [...result, ...pending];
}

function invalidateTurnMemory(state, index, nextMessages) {
  const summaries = state.longTermSummaries || [];
  const affected = state.messages.slice(index).filter(message => hasTurnSummary(message, summaries));
  const cutoff = affected.reduce((min, message) => Math.min(min, message.turnSummaryIndex), summaries.length);
  const retainedIds = new Set(state.messages.slice(0, index).map(message => message.id));
  return {
    longTermSummaries: summaries.slice(0, cutoff),
    summaryQueue: [],
    messages: nextMessages.map(message => {
      if (retainedIds.has(message.id) && hasTurnSummary(message, summaries.slice(0, cutoff))) return message;
      if (!Object.hasOwn(message, 'turnSummaryIndex') && !Object.hasOwn(message, 'turnSummary')) return message;
      const { turnSummaryIndex, turnSummary, ...rest } = message;
      return rest;
    }),
  };
}

const latest = (messages, field) => {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index][field] != null) return clone(messages[index][field]);
  }
  return undefined;
};

export function buildRewindPatch(state, index, { initialVariables, initialRpg, buildLorebook, countTurns, settings }) {
  const messages = state.messages.slice(0, index);
  const variables = latest(messages, 'contextState') ?? initialVariables(state.card);
  const lastStateBlock = [...messages].reverse().find(message => message.interactiveHtml)?.interactiveHtml || '';
  const rpg = latest(messages, 'rpgState') ?? initialRpg;
  const worldInfoRuntime = latest(messages, 'worldInfoRuntime') ?? {};
  const worldInfoState = latest(messages, 'worldInfoState') ?? Object.fromEntries((state.card?.char_book?.entries || []).filter(entry => entry.uid != null).map(entry => [entry.uid, entry.enabled !== false]));
  const depth = Math.max(0, Number(settings.context_depth) || 24);
  const chunk = summaryChunkSize(settings, state);
  const turns = countTurns(messages);
  const remaining = Math.max(0, Math.min(Math.floor(turns / chunk), Math.ceil((turns - depth) / chunk)));
  const memoryPatch = isTurnMemory(settings) ? invalidateTurnMemory(state, index, messages) : { longTermSummaries: state.longTermSummaries.slice(0, remaining), summaryQueue: [] };
  const patch = { messages, variables, lastStateBlock, worldInfoRuntime, worldInfoState, ...memoryPatch };
  if (rpg != null && state.card) {
    patch.card = { ...state.card, rpg_data:clone(rpg) };
    patch.generatedLorebookEntries = buildLorebook(patch.card.rpg_data);
  }
  return patch;
}

export function invalidateHistorySummaries(state, index, settings, countTurns, nextMessages = state.messages) {
  if (isTurnMemory(settings)) return invalidateTurnMemory(state, index, nextMessages);
  const chunk = summaryChunkSize(settings, state);
  const completed = Math.floor(countTurns(state.messages.slice(0,index)) / chunk);
  return { longTermSummaries: state.longTermSummaries.slice(0,completed), summaryQueue: [] };
}

export function firstChangedHistoryIndex(previous, next) {
  for (let index=0;index<previous.length;index++) {
    const previousMessage=previous[index], nextMessage=next[index];
    if (!nextMessage || previousMessage.id!==nextMessage.id || previousMessage.role!==nextMessage.role || previousMessage.content!==nextMessage.content || previousMessage.is_hidden!==nextMessage.is_hidden) return index;
  }
  return -1;
}
