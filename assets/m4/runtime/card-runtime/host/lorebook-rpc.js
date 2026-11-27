export const LOREBOOK_RPC_METHODS = Object.freeze([
  'lorebook.names', 'lorebook.entries.get', 'lorebook.entries.replace',
  'lorebook.entries.create', 'lorebook.entries.delete', 'lorebook.create', 'lorebook.delete',
  'raw.import.worldbook',
]);
export function createLorebookRpcHandlers({ readState, lorebooks, saveSession, resolveRange,
  validatePayload, clone, publish, maxEntries, importWorldbook }) {
  let embeddedTail = Promise.resolve();
  function resolve(name) {
    const { card } = readState();
    const defaultName = card?.char_book?.name || card?.name || 'Character Lorebook';
    const resolvedName = String(name || defaultName);
    const isCharacterBook = Boolean(card?.char_book && (resolvedName === defaultName || resolvedName === card.name));
    return { resolvedName, isCharacterBook, characterKey: card?.fileName || card?.name,
      lorebook: lorebooks().lorebooks.find(item => item.name === resolvedName) || null };
  }
  function entriesFor(target) {
    if (target.isCharacterBook) return clone(readState().card?.char_book?.entries || []);
    if (!target.lorebook) throw Error(`Lorebook not found: ${target.resolvedName}`);
    return clone(target.lorebook.book.entries || []);
  }
  function checked(entries) {
    if (!Array.isArray(entries) || entries.length > maxEntries) throw Error('Invalid or oversized lorebook entry list.');
    validatePayload(entries);
    return clone(entries);
  }
  async function mutate(target, update, guard) {
    let result;
    const apply = current => {
      result = update(clone(current));
      result.entries = checked(result.entries);
      return result.entries;
    };
    if (target.isCharacterBook) {
      const job = embeddedTail.then(async () => {
        guard();
        const state = readState();
        const current = resolve(target.resolvedName);
        if (!current.isCharacterBook || current.characterKey !== target.characterKey) throw Error('Character lorebook is no longer active.');
        const entries = apply(state.card.char_book.entries || []);
        const card = { ...state.card, char_book: { ...state.card.char_book, entries } };
        const extensionSettings = { ...state.extensionSettings, __cardRuntimeCharacterBook: card.char_book };
        state.setSessionData({ card, extensionSettings });
        await saveSession?.({ extensionSettings });
        guard();
        const latest = readState().card;
        if ((latest?.fileName || latest?.name) !== target.characterKey || latest?.char_book !== card.char_book) {

          return;
        }
        publish({ type: 'CARD_RUNTIME_STATE_UPDATE', payload: { worldInfo: entries } });
        publish({ type: 'CARD_RUNTIME_EVENT', eventName: 'worldinfo_updated', args: [target.resolvedName, { entries }] });
      });
      embeddedTail = job.catch(() => {});
      await job;
    } else {
      await lorebooks().updateLorebookStrict(target.resolvedName, current => ({ ...current,
        book: { ...current.book, entries: apply(current.book.entries || []) } }), guard);
      guard();
      publish({ type: 'CARD_RUNTIME_EVENT', eventName: 'worldinfo_updated', args: [target.resolvedName, { entries: result.entries }] });
    }
    return result;
  }
  return async function dispatch(method, args, lease) {
    const guard = () => lease?.assertCurrent();
    guard();
    switch (method) {
      case 'lorebook.names': {
        const { card } = readState();
        const name = card?.char_book?.name || (card?.char_book ? card.name : null);
        const names = lorebooks().lorebooks.map(item => item.name);
        return [...new Set(name ? [name, ...names] : names)];
      }
      case 'lorebook.entries.get': return entriesFor(resolve(args.name));
      case 'lorebook.entries.replace': return (await mutate(resolve(args.name), () => ({ entries: args.entries || [] }), guard)).entries;
      case 'lorebook.entries.create': return mutate(resolve(args.name), current => {
        const input = (Array.isArray(args.entries) ? args.entries : [args.entries]).filter(Boolean).slice(0, maxEntries);
        const numeric = current.map(entry => Number(entry.uid ?? entry.id)).filter(Number.isSafeInteger);
        let nextUid = numeric.length ? Math.max(...numeric) + 1 : 0;

        const explicit = new Set(input.filter(entry => entry.uid != null).map(entry => String(entry.uid)));
        const added = input.map(entry => {
          let uid = entry.uid;
          if (uid == null) { while (Number.isSafeInteger(nextUid) && explicit.has(String(nextUid))) nextUid++; if (!Number.isSafeInteger(nextUid)) throw Error("No safe automatic lorebook UID available."); uid = nextUid++; }
          return { ...entry, uid: String(uid), keys: Array.isArray(entry.keys) ? entry.keys : [], content: String(entry.content || '') };
        });
        return { entries: current.concat(added), new_uids: added.map(entry => Number(entry.uid)).filter(Number.isFinite) };
      }, guard);
      case 'lorebook.entries.delete': return mutate(resolve(args.name), current => {
        let indexes;
        if (Array.isArray(args.range)) {
          const ids = new Set(args.range.map(String));
          indexes = new Set(current.map((entry, index) => ids.has(String(entry.uid ?? entry.id ?? index)) ? index : -1).filter(index => index >= 0));
        } else indexes = new Set(resolveRange(args.range, current.length));
        return { entries: current.filter((_, index) => !indexes.has(index)), delete_occurred: indexes.size > 0 };
      }, guard);
      case 'lorebook.create': {
        const name = String(args.name || '').trim().slice(0, 200);
        if (!name) throw Error('Lorebook name is required.');
        const entries = checked((Array.isArray(args.entries) ? args.entries : []).slice(0, maxEntries));
        await lorebooks().saveLorebookStrict({ name, book: { name, entries } }, guard);
        guard(); return name;
      }
      case 'lorebook.delete': return lorebooks().deleteLorebookStrict(String(args.name || ''), guard);
      case 'raw.import.worldbook': {
        const record = await importWorldbook(args);
        guard(); await lorebooks().saveLorebookStrict(record, guard);
        guard(); return { ok: true, name: record.name };
      }
      default: throw Error(`Unsupported lorebook RPC: ${method}`);
    }
  };
}
