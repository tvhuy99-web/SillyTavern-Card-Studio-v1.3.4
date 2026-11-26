import { awaitAbortable } from '../../core/async/cancellation.js';

// Standalone RPG updates are owned by the initiating session and RPG snapshot.
export function createStandaloneMythic(deps) {
  let active = null;
  return async function run(content, messageId) {
    const state = deps.readState(), db = state.card?.rpg_data;
    const message = state.messages.find(item => item.id === messageId);
    if (!db || !message || !state.sessionId) return false;
    const revision = deps.runtime.getSessionRevision();
    if (active?.revision === revision && active.sessionId === state.sessionId) return false;
    const controller = new AbortController(), signal = controller.signal;
    const task = { revision, sessionId: state.sessionId, controller };
    active = task;
    const current = () => {
      const next = deps.readState();
      return !signal.aborted && active === task && deps.runtime.getSessionRevision() === revision && next.sessionId === state.sessionId && next.card?.rpg_data === db && next.messages.find(item => item.id === messageId) === message;
    };
    deps.runtime.add(controller, {source:'mythic'});
    const log = (...args) => { if (current()) deps.log(...args); };
    try {
      log('state','system','Mythic Engine: Đang kích hoạt Medusa (Standalone/Force)...');
      const settings = deps.readSettings();
      const provider = settings.source === 'aistudio' ? 'aistudio' : settings.source === 'proxy' || deps.proxyForTools() ? 'proxy' : 'gemini';
      const model = db.settings?.modelId || (provider === 'aistudio' ? settings.aistudio_tool_model || settings.aistudio_model : provider === 'proxy' ? settings.proxy_tool_model || settings.proxy_model : '') || 'gemini-3.1-flash-lite-preview';
      const prior = state.messages[state.messages.indexOf(message) - 1];
      const transcript = (prior?.role === 'user' ? `User: ${prior.content}\n` : '') + `System/GM: ${content}`;
      const entries = [...(state.card.char_book?.entries || []), ...deps.readLorebooks().flatMap(book => book.book?.entries || [])];
      const selected = entries.filter(entry => entry.uid && message.activeLorebookUids?.includes(entry.uid) && !entry.constant);
      const references = new Map();
      for (const uid of db.settings?.pinnedLorebookUids || []) { const entry = entries.find(item => item.uid === uid); if (entry) references.set(uid, entry); }
      for (const entry of selected) references.set(entry.uid, entry);
      const lore = [...references.values()].filter(entry => !String(entry.uid).startsWith('mythic_')).map(entry => `### [Lore: ${entry.comment || 'Untitled'}]\n${entry.content}\n\n`).join('') || '(Không có dữ liệu tham khảo)';
      const tables = deps.formatTables(db, selected);
      const prompt = deps.buildPrompt(db.settings?.customSystemPrompt || deps.defaultPrompt, tables, transcript, lore);
      const start = Date.now();
      const raw = await awaitAbortable(() => deps.generate({provider,model,prompt,maxTokens:Number(state.preset?.max_tokens)||16384,signal}), signal);
      if (!current()) return false;
      deps.logMythic(prompt, raw, Date.now()-start);
      const actions = deps.parseActions(raw, deps.tableSnapshot(tables));
      if (!actions.length) { log('error','system','Mythic Engine Error: AI không thực hiện cập nhật trạng thái (Empty Action).'); return false; }
      const result = deps.applyActions(db, actions);
      const generated = deps.buildLorebook(result.newDb);
      if (!current()) return false;
      // Commit related state together, before notifications or diagnostic side effects.
      const messages = deps.readState().messages.map(item => item.id === messageId ? {...item,rpgState:result.newDb} : item);
      state.setSessionData({card:{...deps.readState().card,rpg_data:result.newDb},messages,generatedLorebookEntries:generated,rpgNotification:result.notifications?.length ? result.notifications.join('\n') : null});
      if (result.logs?.length) deps.log('script-success','system',`[RPG Update]:\n${result.logs.join('\n')}`);
      if (result.notifications?.length) deps.playSound('rpg');
      return true;
    } catch (error) {
      if (current()) deps.log('error','system',`Mythic Engine Error: ${error.message || error}`);
      return false;
    } finally {
      deps.runtime.remove(controller,{source:'mythic'});
      if (active === task) active = null;
    }
  };
}
