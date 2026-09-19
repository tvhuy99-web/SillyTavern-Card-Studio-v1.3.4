function clone(value) {
  if (value === undefined) return value;
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch {}
  }
  return JSON.parse(JSON.stringify(value));
}

function modelContextContent(message) {
  if (message?.role !== 'model') return String(message?.content ?? '');
  const content = String(message?.content ?? '');
  const match = content.match(/<content>([\s\S]*?)<\/content>/);
  return match ? match[1].trim() : content;
}

export function createChatTurnPolicy(options = {}) {
  const now = options.now || (() => Date.now());
  const random = options.random || (() => Math.random());

  function beginTurn({ state, content, sequence }) {
    const variables = clone(state.variables);
    const rpgState = state.card?.rpg_data ? clone(state.card.rpg_data) : undefined;
    const worldInfoRuntime = clone(state.worldInfoRuntime);
    const worldInfoState = clone(state.worldInfoState);
    const timestamp = now();
    const id = 'u-' + timestamp + '-' + random().toString(36).substring(2, 9);
    return {
      sequence,
      variables,
      rpgState,
      worldInfoRuntime,
      worldInfoState,
      userMessage: {
        id,
        role: 'user',
        content,
        timestamp,
        contextState: variables,
        rpgState,
        worldInfoRuntime,
        worldInfoState,
      },
    };
  }

  function buildContext(messages, userContent, forcedContent) {
    const history = Array.isArray(messages) ? messages : [];
    const recentText = history.slice(-3).map(modelContextContent).join('\n');
    const scanInput = forcedContent
      ? recentText + '\n' + userContent + '\n' + forcedContent
      : recentText + '\n' + userContent;
    return {
      recentText,
      scanInput,
      promptHistory: history.slice(-3).map(message => ({
        role: message.role,
        content: message.content,
      })),
    };
  }

  function createArenaState(connection, state) {
    const mainModel = (
      connection.source === 'gemini'
        ? connection.gemini_model
        : connection.source === 'proxy'
          ? connection.proxy_model
          : connection.openrouter_model
    ) || 'Model A';
    const challengerProvider = state.arenaProvider || 'gemini';
    return {
      enabled: true,
      modelA: {
        name: mainModel,
        modelId: mainModel === 'Model A' ? null : mainModel,
        provider: connection.source,
        profileId: connection.source === 'proxy' ? connection.proxy_profile_id || null : null,
        content: '',
        status: 'pending',
        completed: false,
      },
      modelB: {
        name: state.arenaModelId,
        modelId: state.arenaModelId,
        provider: challengerProvider,
        profileId: challengerProvider === 'proxy' ? state.arenaUserProfileId || null : null,
        content: '',
        status: 'pending',
        completed: false,
      },
      selected: null,
    };
  }

  function isAbortLike(error, signal) {
    if (signal?.aborted) return true;
    if (error?.name === 'AbortError' || error?.message === 'Aborted') return true;
    return /(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i.test(
      String(error?.message || error || ''),
    );
  }

  function generationStatus(content, signal) {
    if (signal?.aborted) return 'stopped';
    return String(content || '').trim() ? 'success' : 'error';
  }

  return Object.freeze({
    beginTurn,
    buildContext,
    createArenaState,
    isAbortLike,
    generationStatus,
  });
}

export const chatTurnPolicy = createChatTurnPolicy();
