import {
  needsMessageNormalization,
  normalizeMessagesOnLoad,
} from '../../features/arena/state-machine.js';

const NON_PERSISTENT_KEYS = Object.freeze([
  'logs',
  'initialDiagnosticLog',
  'isLoading',
  'isSummarizing',
  'isInputLocked',
  'isAutoLooping',
  'error',
  'abortControllers',
  'quickReplies',
  'scriptButtons',
  'rpgNotification',
]);

const INTERNAL_PIPELINE_RE = /<(basic_confirmation|draft|revision_confirmation)\b[^>]*>[\s\S]*?<\/\1>/gi;
const CONTENT_RE = /<content\b[^>]*>([\s\S]*?)<\/content>/i;

function compactModelContent(value) {
  const text = String(value ?? '');
  const content = text.match(CONTENT_RE);
  if (content) return content[1].trim();
  if (!/<(?:basic_confirmation|draft|revision_confirmation|content)\b/i.test(text)) return text;
  return text
    .replace(INTERNAL_PIPELINE_RE, '')
    .replace(/<\/?content\b[^>]*>/gi, '')
    .trim();
}

function compactArenaSide(side) {
  if (!side || typeof side !== 'object') return side;
  const compacted = compactModelContent(side.content);
  return compacted === String(side.content ?? '') ? side : { ...side, content: compacted };
}

function compactHistoricalMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages: Array.isArray(messages) ? messages : [], changed: false };
  }
  let latestModelIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'model') {
      latestModelIndex = index;
      break;
    }
  }

  let changed = false;
  const next = messages.map((message, index) => {
    if (!message || message.role !== 'model' || index === latestModelIndex) return message;

    const content = compactModelContent(message.content);
    const originalRawContent = Object.prototype.hasOwnProperty.call(message, 'originalRawContent')
      ? compactModelContent(message.originalRawContent)
      : undefined;
    const arena = message.arena ? {
      ...message.arena,
      modelA: compactArenaSide(message.arena.modelA),
      modelB: compactArenaSide(message.arena.modelB),
    } : message.arena;

    const contentChanged = content !== String(message.content ?? '');
    const rawChanged = Object.prototype.hasOwnProperty.call(message, 'originalRawContent') &&
      originalRawContent !== String(message.originalRawContent ?? '');
    const arenaChanged = Boolean(message.arena) &&
      (arena.modelA !== message.arena.modelA || arena.modelB !== message.arena.modelB);

    if (!contentChanged && !rawChanged && !arenaChanged) return message;
    changed = true;
    return {
      ...message,
      content,
      ...(Object.prototype.hasOwnProperty.call(message, 'originalRawContent')
        ? { originalRawContent }
        : {}),
      ...(message.arena ? { arena } : {}),
    };
  });

  return { messages: next, changed };
}

function normalizeVisualState(value) {
  const state = { ...(value || {}) };
  const aliases = {
    bg: 'backgroundImage',
    music: 'musicUrl',
    class: 'globalClass',
    sound: 'ambientSoundUrl',
  };
  for (const [legacy, canonical] of Object.entries(aliases)) {
    if (state[canonical] === undefined && state[legacy] !== undefined) {
      const value = state[legacy];
      state[canonical] = (
        (canonical === 'backgroundImage' || canonical === 'musicUrl' || canonical === 'ambientSoundUrl') &&
        value === 'off'
      ) ? '' : value;
    }
    delete state[legacy];
  }
  return state;
}

export function normalizeLoadedSession(input) {
  const record = input && typeof input === 'object' ? { ...input } : {};
  let needsRewrite = false;

  for (const key of NON_PERSISTENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      delete record[key];
      needsRewrite = true;
    }
  }

  if (needsMessageNormalization(record.chatHistory)) needsRewrite = true;
  record.chatHistory = normalizeMessagesOnLoad(record.chatHistory);
  const compacted = compactHistoricalMessages(record.chatHistory);
  if (compacted.changed) needsRewrite = true;
  record.chatHistory = compacted.messages;

  const visual = normalizeVisualState(record.visualState);
  if (JSON.stringify(visual) !== JSON.stringify(record.visualState || {})) needsRewrite = true;
  record.visualState = visual;

  if (record.arenaUserProfileId !== undefined && record.arenaProfileId === undefined) {
    record.arenaProfileId = record.arenaUserProfileId;
    delete record.arenaUserProfileId;
    needsRewrite = true;
  }

  return { record, needsRewrite };
}

export function createSessionSnapshot(state, overrides = {}, deps = {}) {
  if (!state?.sessionId || !state?.card || !state?.preset) return null;
  const sourceMessages = overrides.messages ?? state.messages;
  const messages = compactHistoricalMessages(sourceMessages).messages;
  const lastContent = messages.length ? messages[messages.length - 1].content : '';
  const snippet = typeof deps.snippet === 'function'
    ? deps.snippet(lastContent, 50)
    : String(lastContent || '').slice(0, 50);
  const now = typeof deps.now === 'function' ? deps.now() : Date.now();

  return {
    sessionId: state.sessionId,
    characterFileName: state.card.fileName || state.card.name,
    presetName: overrides.preset?.name ?? state.preset.name,
    userPersonaId: overrides.persona === undefined ? state.persona?.id || null : overrides.persona?.id || null,
    chatHistory: messages,
    longTermSummaries: overrides.longTermSummaries ?? state.longTermSummaries,
    summaryQueue: overrides.summaryQueue ?? state.summaryQueue,
    storyQueue: overrides.storyQueue ?? state.storyQueue,
    variables: overrides.variables ?? state.variables,
    extensionSettings: overrides.extensionSettings ?? state.extensionSettings,
    worldInfoState: overrides.worldInfoState ?? state.worldInfoState,
    worldInfoPinned: overrides.worldInfoPinned ?? state.worldInfoPinned,
    worldInfoPlacement: overrides.worldInfoPlacement ?? state.worldInfoPlacement,
    worldInfoRuntime: overrides.worldInfoRuntime ?? state.worldInfoRuntime,
    visualState: normalizeVisualState(overrides.visualState ?? state.visualState),
    authorNote: overrides.authorNote ?? state.authorNote,
    lastStateBlock: overrides.lastStateBlock ?? state.lastStateBlock,
    rpgState: overrides.rpgState ?? state.card.rpg_data,
    generatedLorebookEntries: overrides.generatedLorebookEntries ?? state.generatedLorebookEntries,
    isArenaMode: overrides.isArenaMode ?? state.isArenaMode,
    arenaModelId: overrides.arenaModelId ?? state.arenaModelId,
    arenaProvider: overrides.arenaProvider ?? state.arenaProvider,
    arenaProfileId: overrides.arenaProfileId ?? state.arenaUserProfileId,
    lastMessageSnippet: snippet,
    lastUpdated: now,
  };
}

export const sessionStateContract = Object.freeze({
  persistent: Object.freeze([
    'chatHistory',
    'longTermSummaries',
    'summaryQueue',
    'storyQueue',
    'variables',
    'extensionSettings',
    'worldInfoState',
    'worldInfoPinned',
    'worldInfoPlacement',
    'worldInfoRuntime',
    'visualState',
    'authorNote',
    'lastStateBlock',
    'rpgState',
    'generatedLorebookEntries',
    'isArenaMode',
    'arenaModelId',
    'arenaProvider',
    'arenaProfileId',
  ]),
  runtimeOnly: Object.freeze([
    'isLoading',
    'isSummarizing',
    'isInputLocked',
    'isAutoLooping',
    'error',
    'abortControllers',
    'quickReplies',
    'scriptButtons',
    'rpgNotification',
  ]),
  diagnosticsOnly: Object.freeze(['logs', 'initialDiagnosticLog']),
});
