import { summaryHistoryChunkSize } from '../../../features/chat/history-policy.js';

export function createRuntimePromptBuilder({ readState, readLorebooks, resolvePreset, turnPolicy,
  baseSections, buildPrompt, readContextSettings, writeGlobalVariables, publish }) {
  const contextContent = message => turnPolicy.modelContextContent(message);
  function embeddedWorldInfo(card, messages, input) {
    const book = card.char_book;
    const scanDepth = Math.max(1, Math.trunc(Number(book?.strategy?.scan_depth || book?.scanDepth || 2)));
    const scan = (messages || []).slice(-scanDepth).map(contextContent).concat(input).join('\n');
    return (book?.entries || []).filter(entry => {
      if (entry.enabled === false || entry.disable === true) return false;
      const probability = Number(entry.probability ?? 100);
      if (Number.isFinite(probability) && probability < 100 && 100 * Math.random() >= Math.max(0, probability)) return false;
      if (entry.constant || entry.strategy?.type === 'constant') return true;
      const keys = entry.strategy?.keys || entry.keys || entry.key || [];
      return !keys.length || keys.some(key => {
        try {
          const value = String(key), regex = value.match(/^\/(.*)\/([dgimsuvy]*)$/s);
          return regex ? new RegExp(regex[1], regex[2]).test(scan) : scan.toLowerCase().includes(value.toLowerCase());
        } catch { return false; }
      });
    }).map(entry => entry.content).filter(Boolean).join('\n');
  }
  return async function buildRuntimePrompt(raw, options, assertCurrent, { allowGlobalWrites = true } = {}) {
    assertCurrent();
    const state = readState();
    if (!state.card || !state.preset) throw Error('A character and generation preset must be loaded first.');
    const preset = resolvePreset(options);
    const input = String(options.user_input ?? options.userInput ?? '').slice(0, 5e5);
    const overrides = options.overrides || {};
    const injects = (Array.isArray(options.injects) ? options.injects : []).map(value => typeof value === 'string' ? value : value?.content ?? value?.value ?? value?.prompt ?? '').filter(Boolean).map(String);
    if (overrides.world_info_before) injects.unshift(String(overrides.world_info_before));
    if (overrides.world_info_after) injects.push(String(overrides.world_info_after));
    if (raw) {
      const order = Array.isArray(options.ordered_prompts) ? options.ordered_prompts : [];
      const worldInfo = embeddedWorldInfo(state.card, state.messages, input);
      const fields = {
        world_info_before: String(overrides.world_info_before || worldInfo),
        persona_description: String(overrides.persona_description ?? state.persona?.description ?? ''),
        char_description: String(overrides.char_description ?? state.card.description ?? ''),
        char_personality: String(overrides.char_personality ?? state.card.personality ?? ''),
        scenario: String(overrides.scenario ?? state.card.scenario ?? ''),
        world_info_after: String(overrides.world_info_after || ''),
        dialogue_examples: String(overrides.dialogue_examples ?? state.card.mes_example ?? ''),
        chat_history: state.messages.map(message => `[${message.role}] ${contextContent(message)}`).join('\n'),
        user_input: input,
      };
      const ordered = order.map(item => typeof item === 'string' ? fields[item] ?? item : `${item?.role ? `[${item.role}]\n` : ''}${item?.content ?? item?.prompt ?? item?.value ?? ''}`).filter(Boolean).join('\n\n');
      const result = [injects.join('\n\n'), ordered, order.includes('user_input') ? '' : input].filter(Boolean).join('\n\n');
      if (!result.trim()) throw Error('generateRaw requires ordered_prompts or user_input.');
      return result;
    }
    const requestedLength = Number(options.max_chat_history ?? state.messages.length);
    const limit = Math.max(0, Math.min(2e3, Number.isFinite(requestedLength) ? requestedLength : state.messages.length));
    let history = limit ? state.messages.slice(-limit).map(message => message.role === 'model' ? { ...message, content: contextContent(message) } : message) : [];
    if (Array.isArray(overrides.chat_history?.prompts)) history = overrides.chat_history.prompts.slice(-2e3).map((message, index) => ({ id: `runtime-history-${index}`, role: message.role === 'assistant' ? 'model' : message.role === 'system' ? 'system' : 'user', content: String(message.content || ''), timestamp: Date.now() }));
    if (input || !history.length || history.at(-1)?.role !== 'user') history.push({ id: `runtime-prompt-${Date.now()}`, role: 'user', content: input || 'Continue.', timestamp: Date.now() });
    const lorebooks = readLorebooks();
    const card = { ...state.card, description: overrides.char_description ?? state.card.description, personality: overrides.char_personality ?? state.card.personality, scenario: overrides.scenario ?? state.card.scenario, mes_example: overrides.dialogue_examples ?? state.card.mes_example };
    const { baseSections: sections } = baseSections(card, preset, 0, state.persona, state.worldInfoState, 0, state.worldInfoPlacement);
    const settings = readContextSettings();
    const result = await buildPrompt(sections, history, overrides.chat_history?.author_note ?? state.authorNote, card, (limit >= state.messages.length && !Array.isArray(overrides.chat_history?.prompts)) ? state.longTermSummaries : [], summaryHistoryChunkSize(settings, state), state.variables, state.lastStateBlock, lorebooks, 'standard', state.persona?.name || 'User', state.worldInfoState, undefined, state.worldInfoPlacement, preset, state.visualState.disableInteractiveMode, overrides.persona_description ?? state.persona?.description ?? '', ...(settings.memory_mode === 'turn' ? [{ turnHistoryKeep: settings.turn_history_keep }] : []));
    assertCurrent();
    const latest = readState();
    if (latest.messages !== state.messages || latest.variables !== state.variables || latest.card !== state.card || latest.preset !== state.preset || latest.longTermSummaries !== state.longTermSummaries || latest.summaryChunkSize !== state.summaryChunkSize) throw Error("Card prompt state changed during construction.");
    if (result?.updatedVariables) state.setSessionData({ variables: result.updatedVariables });
    if (allowGlobalWrites && result?.updatedGlobalVariables) {
      const global = writeGlobalVariables(result.updatedGlobalVariables);
      try { publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload: { variableScopes: { global } } }); } catch {}
    }
    const schema = options.json_schema ? `Return only valid JSON matching this schema:\n${JSON.stringify(options.json_schema)}` : '';
    return [injects.join('\n\n'), result.fullPrompt, schema].filter(Boolean).join('\n\n');
  };
}
