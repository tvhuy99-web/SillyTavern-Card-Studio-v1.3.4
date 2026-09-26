import { modelContextContent } from '../chat/turn-policy.js';

export async function buildConversationPrompt(input, deps) {
  const state = input.state;
  const generatedEntries = input.generatedEntries ?? state.generatedLorebookEntries ?? [];
  const lorebooks = [
    ...(deps.lorebooks || []),
    { name: 'Session Generated', book: { entries: generatedEntries } },
  ];
  const { baseSections } = deps.buildBaseSections(state.card, state.preset, 0, state.persona);
  const chunkSize = deps.getSummaryChunkSize?.() || 12;
  const sourceMessages = input.messages || [...(state.messages || []), input.userMessage].filter(Boolean);
  const messages = sourceMessages.map(message => {
    if (message?.role !== 'model') return message;
    const content = modelContextContent(message);
    return content === String(message.content ?? '') ? message : { ...message, content };
  });

  return deps.buildPromptCore(
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
    state.visualState.disableInteractiveMode,
    state.persona?.description || '',
  );
}
