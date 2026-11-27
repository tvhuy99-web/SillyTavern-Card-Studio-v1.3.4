export function createRuntimeMessageHandler({ isActiveSource, dispatcher, execute, readState, persistMessages,
  setScriptButtons, setInputLocked, log, diagnostics, validatePayload = () => {}, window = globalThis.window, navigator = globalThis.navigator }) {
  const event = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  function diagnose(error, request) {
    const message = error instanceof Error ? error.message : String(error), state = readState();
    const diagnostic = diagnostics.create({ code: diagnostics.code(message), severity: 'error', phase: 'rpc', component: 'useChatInterface.handleRuntimeRpc', message, method: request.method, stack: error instanceof Error ? error.stack : undefined, messageId: Number(request.context?.messageId), characterId: state.card?.fileName || state.card?.name, chatId: state.sessionId || undefined, details: { argsKeys: Object.keys(request.args || {}) } });
    diagnostics.append(diagnostic);
    log('error', 'diagnostic', diagnostics.format(diagnostic), diagnostic.stack, diagnostic);
    return diagnostic;
  }
  return async function handleMessage(message) {
    if (!message.data || typeof message.data.type !== 'string' || !isActiveSource(message.source, message)) return;
    const { type, payload } = message.data;
    if (type === 'CARD_RUNTIME_RPC') { await dispatcher.dispatch(message, { execute, diagnose }); return; }
    try { validatePayload(payload); } catch { return; }
    if (type === 'CARD_RUNTIME_DIAGNOSTIC' && payload) {
      const state = readState();
      const diagnostic = diagnostics.normalize(payload, { phase: 'iframe', component: 'card-runtime', message: String(payload?.message || 'Card runtime diagnostic'), characterId: state.card?.fileName || state.card?.name, chatId: state.sessionId || undefined });
      diagnostics.append(diagnostic);
      log(diagnostic.severity === 'warning' ? 'warn' : 'error', 'diagnostic', diagnostics.format(diagnostic), diagnostic.stack, diagnostic);
      return;
    }
    switch (type) {
      case 'UPDATE_SCRIPT_BUTTONS': {
        if (!payload) break;
        const scriptId = String(payload.scriptId || 'default').slice(0, 200);
        setScriptButtons((Array.isArray(payload.buttons) ? payload.buttons : []).slice(0, 100).map((button, index) => ({ id: `btn_${scriptId}_${index}`, label: String(button?.name || button?.label || 'Button').slice(0, 200), scriptId, eventId: `btn_click_${String(button?.name || button?.label || 'Button').slice(0, 200)}` })));
        break;
      }
      case 'SET_INPUT_VALUE': event('sillytavern:set-input', String(payload || '').slice(0, 1e5)); break;
      case 'SET_INPUT_LOCKED': setInputLocked(!!payload); break;
      case 'SEND_USER_MESSAGE': case 'interactive-action': {
        const text = String(payload || '').slice(0, 2e5);
        if (text.trim()) event('sillytavern:send-message', text);
        break;
      }
      case 'SEND_CHARACTER_MESSAGE': case 'APPEND_MESSAGE': {
        const text = String(payload || '').slice(0, 2e5);
        if (text.trim()) await persistMessages(readState().messages.concat({ id: `iframe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, role: 'model', content: text, timestamp: Date.now() }));
        break;
      }
      case 'iframe-log': if (payload) log(payload.level || 'log', 'card-runtime', String(payload.message || '').slice(0, 2e4), payload.stack, payload.payload); break;
      case 'COPY_TO_CLIPBOARD': navigator.clipboard?.writeText(String(payload || '').slice(0, 1e6)).catch(() => {}); break;
      case 'SHOW_TOAST': {
        const text = String(payload?.message ?? payload ?? '').slice(0, 2e4);
        if (text.trim()) event('sillytavern:show-toast', { message: text, type: String(payload?.type ?? 'info') });
        break;
      }
      case 'SHOW_POPUP': {
        const html = String(payload?.html ?? payload ?? '').slice(0, 5e5);
        if (html.trim()) event('sillytavern:show-popup', { content: html, title: String(payload?.title ?? 'Thông báo Thẻ').slice(0, 120) });
        break;
      }
      case 'SET_VISUAL_STATE': {
        if (!payload) break;
        const state = readState(), visualState = { ...state.visualState };
        const aliases = { bg: 'backgroundImage', music: 'musicUrl', class: 'globalClass', sound: 'ambientSoundUrl' };
        const fields = typeof payload === 'object' && 'type' in payload && 'value' in payload ? { [payload.type]: payload.value } : typeof payload === 'object' ? payload : {};
        for (const [key, value] of Object.entries(fields)) {
          if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
          const field = Object.hasOwn(aliases, key) ? aliases[key] : key;
          visualState[field] = value === 'off' && ['backgroundImage', 'musicUrl', 'ambientSoundUrl'].includes(field) ? '' : value;
        }
        state.setSessionData({ visualState });
        event('sillytavern:visual-state', visualState);
        break;
      }
    }
  };
}

export function subscribeRuntimeSession({ store, publish, clone, formatHistory }) {
  let previous = store.getState();
  const event = (eventName, args) => publish({ type: 'CARD_RUNTIME_EVENT', eventName, args });
  const update = payload => publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload });
  return store.subscribe(state => {
    if (state.sessionId !== previous.sessionId) event('chat_id_changed', [state.sessionId || '']);
    if (state.variables !== previous.variables) update({ variableScopes: { chat: clone(state.variables) } });
    if (state.extensionSettings !== previous.extensionSettings) {
      update({ extensionSettings: clone(state.extensionSettings) });
      event('settings_updated', []);
    }
    if (state.messages !== previous.messages) {
      update({ chatHistory: formatHistory(state.messages, state.persona?.name || 'User', state.card?.name || 'Character', true) });
      if (state.messages.length > previous.messages.length) {
        for (let index = previous.messages.length; index < state.messages.length; index++) {
          const user = state.messages[index].role === 'user';
          event(user ? 'message_sent' : 'message_received', [index, 'extension']);
          event(user ? 'user_message_rendered' : 'character_message_rendered', [index, 'extension']);
        }
      } else if (state.messages.length < previous.messages.length) {
        const index = previous.messages.findIndex((message, messageIndex) => state.messages[messageIndex]?.id !== message.id);
        event('message_deleted', [index < 0 ? state.messages.length : index]);
      } else {
        state.messages.forEach((message, index) => {
          const old = previous.messages[index];
          if (!old || (message.id === old.id && message.content === old.content && message.swipe_id === old.swipe_id)) return;
          if (state.isLoading && index === state.messages.length - 1 && message.content !== old.content) event('stream_token_received', [message.content]);
          else event(message.id === old.id && message.swipe_id !== old.swipe_id ? 'message_swiped' : 'message_updated', [index]);
        });
      }
    }
    if (!previous.isLoading && state.isLoading) event('generation_started', ['normal', {}, false]);
    else if (previous.isLoading && !state.isLoading) event('generation_ended', [state.messages.length - 1]);
    previous = state;
  });
}
export function subscribeRuntimeLorebooks({ store, readState, publish }) {
  return store.subscribe(({ lorebooks }) => {
    const { card } = readState();
    const embedded = card?.char_book?.name || (card?.char_book ? card.name : null);
    publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload: { lorebookNames: Array.from(new Set([...embedded ? [embedded] : [], ...lorebooks.map(book => book.name)])) } });
  });
}
