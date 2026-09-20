const ABORT_RE = /(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i;

export function sideStatus(side) {
  if (!side || typeof side !== 'object') return 'stopped';
  if (side.status === 'pending' || side.completed === false) return 'pending';
  if (side.status === 'success' || side.status === 'error' || side.status === 'stopped') return side.status;
  if (/^\[Lỗi:\s*/i.test(String(side.content || ''))) return 'error';
  return String(side.content || '').trim() ? 'success' : 'stopped';
}

export function canSelect(side) {
  return sideStatus(side) === 'success' && Boolean(String(side?.content || '').trim());
}

export function normalizeSideOnLoad(side) {
  if (!side || typeof side !== 'object') return side;
  let status = sideStatus(side);
  if (status === 'pending') status = 'stopped';
  return {
    ...side,
    modelId: side.modelId || side.name || null,
    status,
    completed: true,
  };
}

export function normalizeMessagesOnLoad(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(message => message?.arena ? {
    ...message,
    arena: {
      ...message.arena,
      modelA: normalizeSideOnLoad(message.arena.modelA),
      modelB: normalizeSideOnLoad(message.arena.modelB),
    },
  } : message);
}

export function needsMessageNormalization(messages) {
  return Array.isArray(messages) && messages.some(message => message?.arena && ['modelA', 'modelB'].some(key => {
    const side = message.arena[key];
    if (!side) return false;
    return sideStatus(side) === 'pending' ||
      !['success', 'error', 'stopped'].includes(side.status) ||
      side.completed !== true ||
      !side.modelId;
  }));
}

export function select(arena, sideName) {
  const side = sideName === 'A' ? arena?.modelA : arena?.modelB;
  if (!canSelect(side)) return { ok: false, status: sideStatus(side), side };
  return {
    ok: true,
    status: 'success',
    side,
    content: String(side.content || ''),
    name: side.name || side.modelId || sideName,
  };
}

function mainModel(connection) {
  return connection.source === 'gemini'
    ? connection.gemini_model
    : connection.source === 'proxy'
      ? connection.proxy_model
      : connection.openrouter_model;
}

export function prepareRetry(arena, sideName, connection, arenaSettings = {}) {
  const slot = sideName === 'A' ? 'modelA' : 'modelB';
  const previous = arena?.[slot] || {};
  const hasSnapshot = Boolean(previous.provider && previous.modelId);
  const provider = hasSnapshot
    ? previous.provider
    : sideName === 'A'
      ? connection.source
      : arenaSettings.provider || 'gemini';
  const model = hasSnapshot
    ? previous.modelId
    : sideName === 'A'
      ? mainModel(connection)
      : arenaSettings.modelId || 'gemini-3-flash-preview';
  const profileId = Object.prototype.hasOwnProperty.call(previous, 'profileId')
    ? previous.profileId
    : provider === 'proxy'
      ? sideName === 'A'
        ? connection.proxy_profile_id || null
        : arenaSettings.userProfileId || null
      : null;
  const side = {
    ...previous,
    name: model || previous.name || sideName,
    modelId: model || null,
    provider,
    profileId,
    content: '',
    status: 'pending',
    completed: false,
  };
  return {
    slot,
    side,
    model,
    provider,
    profileId,
    arena: { ...arena, [slot]: side },
  };
}

export function describePair(arena, fallbackState = {}) {
  const main = arena?.modelA || {};
  const challenger = arena?.modelB || {};
  return {
    main: {
      model: main.modelId || undefined,
      provider: main.provider || fallbackState.source,
      profileId: main.profileId || null,
    },
    challenger: {
      model: challenger.modelId || challenger.name || fallbackState.arenaModelId,
      provider: challenger.provider || fallbackState.arenaProvider || 'gemini',
      profileId: challenger.profileId || null,
    },
  };
}

export function resolveProxyConfig(provider, profileId, profiles) {
  if (provider !== 'proxy' || !profileId) return undefined;
  const profile = (Array.isArray(profiles) ? profiles : []).find(item => item.id === profileId);
  if (!profile) throw new Error('Cấu hình Proxy Arena không còn tồn tại: ' + profileId);
  return { url: profile.url, password: profile.password, legacyMode: profile.legacyMode };
}

export function isAbortLike(error, signal) {
  return Boolean(
    signal?.aborted ||
    error?.name === 'AbortError' ||
    error?.message === 'Aborted' ||
    ABORT_RE.test(String(error?.message || error || '')),
  );
}

export function withContent(arena, slot, content) {
  return { ...arena, [slot]: { ...arena?.[slot], content } };
}

export function withResult(arena, slot, content, signal) {
  return {
    ...arena,
    [slot]: {
      ...arena?.[slot],
      content,
      status: signal?.aborted ? 'stopped' : String(content || '').trim() ? 'success' : 'error',
    },
  };
}

export function withError(arena, slot, error, signal, content = '') {
  if (isAbortLike(error, signal)) {
    return { ...arena, [slot]: { ...arena?.[slot], content, status: 'stopped' } };
  }
  return {
    ...arena,
    [slot]: {
      ...arena?.[slot],
      content: '[Lỗi: ' + String(error?.message || error || 'unknown') + ']',
      status: 'error',
    },
  };
}

export function complete(arena, slot) {
  return { ...arena, [slot]: { ...arena?.[slot], completed: true } };
}
