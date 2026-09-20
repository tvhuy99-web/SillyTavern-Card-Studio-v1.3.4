export async function processAIResponse(input, deps) {
  const state = deps.getState();
  const message = state.messages.find(item => item.id === input.messageId);
  if (!message) return;

  const content = input.content ? String(input.content).trim() : '';
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  if (!content || (content.length < 100 && wordCount < 10)) {
    deps.logSystemMessage('warn', 'system', `Phản hồi ngắn (${wordCount} từ). Mythic Engine có thể không hoạt động chính xác.`);
  }

  await deps.processOutput(content, input.messageId);
  deps.logResponse(content);
  if (!input.forced) deps.playSound('ai');

  const executionMode = state.card?.rpg_data?.settings?.executionMode || 'standalone';
  const snapshot = message.rpgSnapshot;
  const turn = deps.nextSequence(state.messages);

  if (state.card?.rpg_data && executionMode === 'integrated') {
    const actions = deps.parseRpgActions(content, snapshot);
    if (actions.length > 0) {
      deps.logSystemMessage('state', 'system', `[Integrated RPG] Detected ${actions.length} actions.`);
      const { newDb, notifications, logs } = deps.applyRpgActions(state.card.rpg_data, actions);
      const card = { ...state.card, rpg_data: newDb };
      deps.setSessionData({ card });
      deps.updateMessage(input.messageId, { rpgState: newDb });
      if (logs.length > 0) {
        deps.logSystemMessage('script-success', 'system', `[RPG Update]:\n${logs.join('\n')}`);
      }
      if (notifications.length > 0) {
        deps.setRpgNotification(notifications.join('\n'));
        deps.playSound('rpg');
      } else {
        deps.setRpgNotification(null);
      }
      deps.setGeneratedLorebookEntries(deps.buildGeneratedLorebookEntries(newDb));

      const runtime = { ...state.worldInfoRuntime };
      for (const action of actions) {
        if (action.type === 'UPDATE' && action.rowId && typeof action.tableIndex === 'number') {
          const table = newDb.tables[action.tableIndex];
          if (table) {
            const uid = `mythic_${table.config.id}_${action.rowId}`;
            if (runtime[uid]) runtime[uid] = { ...runtime[uid], lastActiveTurn: turn };
          }
        }
      }
      deps.setSessionData({ worldInfoRuntime: runtime });
    } else {
      deps.logSystemMessage('log', 'system', '[Integrated RPG] No actions found in response.');
    }
  } else if (state.card?.rpg_data && executionMode === 'standalone') {
    await deps.runStandaloneMythic(content, input.messageId);
  }
}
