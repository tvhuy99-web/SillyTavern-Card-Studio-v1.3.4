const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export const summaryChunkSize = (settings = {}, state) => {
  const stored = state?.summaryChunkSize;
  if (state?.longTermSummaries?.length && Number.isSafeInteger(stored) && stored >= 1 && stored <= 100) return stored;
  return Math.max(1, Math.min(100, Math.floor(Number(settings.summarization_chunk_size) || 10)));
};
const latest = (messages, field) => {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index][field] != null) return clone(messages[index][field]);
  }
  return undefined;
};

/** Rewind derives a complete patch before touching the live session. */
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
  const longTermSummaries = state.longTermSummaries.slice(0, remaining);
  const patch = { messages, variables, lastStateBlock, worldInfoRuntime, worldInfoState, longTermSummaries, summaryQueue: [] };
  if (rpg != null && state.card) {
    patch.card = { ...state.card, rpg_data:clone(rpg) };
    patch.generatedLorebookEntries = buildLorebook(patch.card.rpg_data);
  }
  return patch;
}

// Edits/deletions invalidate summaries whose covered prefix may have changed.
export function invalidateHistorySummaries(state, index, settings, countTurns) {
  const chunk = summaryChunkSize(settings, state);
  const completed = Math.floor(countTurns(state.messages.slice(0,index)) / chunk);
  return { longTermSummaries: state.longTermSummaries.slice(0,completed), summaryQueue: [] };
}

/** Find the first changed message in an existing conversation. Appends do not
 * invalidate summaries; changed, deleted or reordered historical text does. */
export function firstChangedHistoryIndex(previous, next) {
  for (let index=0;index<previous.length;index++) {
    const previousMessage=previous[index], nextMessage=next[index];
    if (!nextMessage || previousMessage.id!==nextMessage.id || previousMessage.role!==nextMessage.role || previousMessage.content!==nextMessage.content || previousMessage.is_hidden!==nextMessage.is_hidden) return index;
  }
  return -1;
}
