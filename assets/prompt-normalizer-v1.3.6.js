const BUILT_IN_PROMPT_IDS = new Set([
  'main',
  'nsfw',
  'jailbreak',
  'enhanceDefinitions',
  'dialogueExamples',
  'chatHistory',
  'worldInfoBefore',
  'worldInfoAfter',
  'charDescription',
  'charPersonality',
  'scenario',
  'personaDescription',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizedIdentifier(value) {
  if (!isRecord(value) || typeof value.identifier !== 'string') return '';
  return value.identifier.trim();
}

function normalizeOrderArray(order, knownPromptIds) {
  if (!Array.isArray(order)) return [];
  const result = [];

  for (const entry of order) {
    const identifier = normalizedIdentifier(entry);
    if (!identifier) continue;
    if (!knownPromptIds.has(identifier) && !BUILT_IN_PROMPT_IDS.has(identifier)) continue;
    result.push(identifier === entry.identifier ? entry : { ...entry, identifier });
  }

  return result;
}

export function normalizePresetConfig(value) {
  if (!isRecord(value)) return value;

  const sourcePrompts = Array.isArray(value.prompts) ? value.prompts : [];
  const prompts = sourcePrompts
    .filter(isRecord)
    .map(prompt => {
      const identifier = normalizedIdentifier(prompt);
      return identifier && identifier !== prompt.identifier
        ? { ...prompt, identifier }
        : prompt;
    });

  const knownPromptIds = new Set(
    prompts.map(normalizedIdentifier).filter(Boolean),
  );

  let promptOrder = value.prompt_order;
  if (Array.isArray(promptOrder)) {
    const grouped = promptOrder.some(entry => isRecord(entry) && Array.isArray(entry.order));

    if (grouped) {
      promptOrder = promptOrder
        .filter(entry => isRecord(entry) && Array.isArray(entry.order))
        .map(entry => ({
          ...entry,
          order: normalizeOrderArray(entry.order, knownPromptIds),
        }));
    } else {
      promptOrder = normalizeOrderArray(promptOrder, knownPromptIds);
    }
  }

  return {
    ...value,
    ...(Object.prototype.hasOwnProperty.call(value, 'prompts') ? { prompts } : {}),
    ...(Array.isArray(value.prompt_order) ? { prompt_order: promptOrder } : {}),
  };
}

export function normalizePresetList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter(isRecord)
    .map(normalizePresetConfig);
}

export function getPromptOrderIntegrity(value) {
  const normalized = normalizePresetConfig(value);
  if (!isRecord(normalized)) return { promptCount: 0, orderCount: 0 };

  const order = Array.isArray(normalized.prompt_order)
    ? normalized.prompt_order
    : [];

  const grouped = order.some(entry => isRecord(entry) && Array.isArray(entry.order));
  const orderCount = grouped
    ? order.reduce((count, entry) => count + (Array.isArray(entry.order) ? entry.order.length : 0), 0)
    : order.length;

  return {
    promptCount: Array.isArray(normalized.prompts) ? normalized.prompts.length : 0,
    orderCount,
  };
}
