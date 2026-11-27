export const CHAT_RPC_METHODS = Object.freeze(['chat.get', 'chat.set', 'chat.create', 'chat.delete', 'chat.rotate']);
export const CHAT_SESSION_RPC_METHODS = Object.freeze([
  'chat.refresh', 'chat.reload', 'chat.save', 'chat.rename',
]);
export function createChatRpcHandlers({ readState, persistMessages, resolveIndex, resolveRange,
  toChatMessage, normalizeRole, isRecord, clone, saveSession, saveExtensionSettings, formatHistory, safeName, publish, now = Date.now,
  makeId = () => `card-runtime-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }) {
  const boundedMessages = value => (Array.isArray(value) ? value : [value]).filter(Boolean).slice(0, 500);
  const has = (value, key) => value[key] !== undefined;
  const swipeId = value => Math.max(0, Math.trunc(Number(value) || 0));
  function applyFields(target, input) {
    if (input.role) target.role = normalizeRole(input.role);
    if (has(input, 'message')) target.content = String(input.message);
    if (has(input, 'name')) target.name = String(input.name);
    if (has(input, 'is_hidden')) target.is_hidden = Boolean(input.is_hidden);
    if (isRecord(input.data)) target.contextState = clone(input.data);
    if (isRecord(input.extra)) target.extra = clone(input.extra);
    if (Array.isArray(input.swipes)) target.swipes = input.swipes.map(String);
    if (Array.isArray(input.swipes_data)) target.swipes_data = clone(input.swipes_data);
    if (Array.isArray(input.swipes_info)) target.swipes_info = clone(input.swipes_info);
    if (has(input, 'swipe_id')) target.swipe_id = swipeId(input.swipe_id);
    return target;
  }
  const handlers = {
    'chat.get'(args, state) {
      const option = args.option, indexes = new Set(resolveRange(args.range, state.messages.length));
      return state.messages.map((message, index) => toChatMessage(message, index, state.persona?.name || 'User', state.card?.name || 'Character', Boolean(option?.include_swipes)))
        .filter(message => indexes.has(message.message_id))
        .filter(message => !option?.role || option.role === 'all' || option.role === message.role)
        .filter(message => !option?.hide_state || option.hide_state === 'all' || (option.hide_state === 'hidden' ? message.is_hidden : !message.is_hidden));
    },
    async 'chat.set'(args, state, persist) {
      const updates = boundedMessages(args.messages), messages = state.messages.slice();
      updates.forEach((update, offset) => {
        const start = args.option?.message_id ?? args.option?.range;
        const index = resolveIndex(update.message_id ?? (typeof start === 'number' ? start + offset : undefined), messages.length);
        if (index < 0 || index >= messages.length) return;
        const original = messages[index];
        const next = applyFields({ ...original }, update);
        if (Array.isArray(next.swipes)) next.swipe_id = Math.min(Math.max(0, Number(next.swipe_id) || 0), Math.max(0, next.swipes.length - 1));
        next.timestamp = original.timestamp || now();
        messages[index] = next;
      });
      return { chatHistory: await persist(messages), messages: updates, messageId: updates[0]?.message_id };
    },
    async 'chat.create'(args, state, persist) {
      const inserted = boundedMessages(args.messages).map(input => {
        const message = applyFields({ id: makeId(), role: normalizeRole(input.role), content: String(input.message ?? ''), contextState: {}, timestamp: now() }, input);

        message.content = String(input.message ?? '');
        return message;
      });
      const messages = state.messages.slice();
      const position = args.option?.insert_before ?? args.option?.insert_at;
      const number = position === 'end' ? NaN : Number(position);
      const index = Number.isInteger(number) && number >= 0 && number <= messages.length ? number : messages.length;
      messages.splice(index, 0, ...inserted);
      const chatHistory = await persist(messages);
      return { chatHistory, messages: chatHistory.slice(index, index + inserted.length), messageId: index };
    },
    async 'chat.delete'(args, state, persist) {
      const indexes = Array.isArray(args.messageIds)
        ? new Set(args.messageIds.map(value => resolveIndex(Number(value), state.messages.length)).filter(index => index >= 0 && index < state.messages.length))
        : new Set(resolveRange(args.range ?? args.messageIds, state.messages.length));
      return { chatHistory: await persist(state.messages.filter((_, index) => !indexes.has(index))), messageId: indexes.size ? Math.min(...indexes) : -1 };
    },
    async 'chat.rotate'(args, state, persist) {
      const begin = resolveIndex(Number(args.begin), state.messages.length), middle = resolveIndex(Number(args.middle), state.messages.length);
      const endValue = Math.trunc(Number(args.end)), end = endValue < 0 ? state.messages.length + endValue : endValue;
      if (![begin, middle, end].every(Number.isInteger) || begin < 0 || middle < begin || end < middle || end > state.messages.length) throw new Error('Invalid chat rotation bounds.');
      const messages = state.messages.slice();
      messages.splice(begin, end - begin, ...messages.slice(middle, end), ...messages.slice(begin, middle));
      return { chatHistory: await persist(messages), messageId: begin };
    },
  };
  return async function execute(method, args, lease) {
    lease?.assertCurrent();
    if (CHAT_SESSION_RPC_METHODS.includes(method)) {
      const state = readState();
      if (method === 'chat.save') await saveSession?.();
      else if (method === 'chat.rename') await saveExtensionSettings({ ...state.extensionSettings, __cardRuntimeChatName: safeName(args.name, state.sessionId || 'Chat') }, lease);
      else {
        if (method === 'chat.refresh') state.setMessages(state.messages.slice());
        publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload: { chatHistory: formatHistory(state.messages, state.persona?.name || 'User', state.card?.name || 'Character', true) } });
      }
      lease?.assertCurrent();
      return true;
    }
    if (!Object.hasOwn(handlers, method)) throw new Error(`Unsupported chat runtime method: ${method}`);
    lease?.assertCurrent();
    const persist = messages => { lease?.assertCurrent(); return persistMessages(messages); };
    return handlers[method](args, readState(), persist);
  };
}
