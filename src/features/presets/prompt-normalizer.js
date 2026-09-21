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

const WORLD_INFO_MARKER_CONTENT = Object.freeze({
  worldInfoBefore: '{{worldInfo_before}}',
  worldInfoAfter: '{{worldInfo_after}}',
});

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

function normalizePromptOrder(promptOrder, knownPromptIds) {
  if (!Array.isArray(promptOrder)) return promptOrder;

  const grouped = promptOrder.some(entry => isRecord(entry) && Array.isArray(entry.order));
  if (!grouped) return normalizeOrderArray(promptOrder, knownPromptIds);

  return promptOrder
    .filter(entry => isRecord(entry) && Array.isArray(entry.order))
    .map(entry => ({
      ...entry,
      order: normalizeOrderArray(entry.order, knownPromptIds),
    }));
}

function getEffectivePromptOrder(promptOrder) {
  if (!Array.isArray(promptOrder)) return [];

  const grouped = promptOrder.filter(entry => isRecord(entry) && Array.isArray(entry.order));
  if (grouped.length > 0) {
    const globalOrder = grouped.find(entry => String(entry.character_id ?? '') === '100000');
    return (globalOrder || grouped[0]).order;
  }

  return promptOrder;
}

function materializePromptOrder(prompts, promptOrder) {
  const effectiveOrder = getEffectivePromptOrder(promptOrder);
  if (effectiveOrder.length === 0) return prompts;

  const byIdentifier = new Map();
  for (const prompt of prompts) {
    const identifier = normalizedIdentifier(prompt);
    if (identifier && !byIdentifier.has(identifier)) {
      byIdentifier.set(identifier, prompt);
    }
  }

  const ordered = [];
  const consumed = new Set();

  for (const orderEntry of effectiveOrder) {
    const identifier = normalizedIdentifier(orderEntry);
    const prompt = byIdentifier.get(identifier);
    if (!identifier || !prompt || consumed.has(identifier)) continue;

    const markerContent = WORLD_INFO_MARKER_CONTENT[identifier];
    const content = markerContent && !String(prompt.content || '').trim()
      ? markerContent
      : prompt.content;
    const enabled = typeof orderEntry.enabled === 'boolean'
      ? orderEntry.enabled
      : typeof prompt.enabled === 'boolean'
        ? prompt.enabled
        : true;

    ordered.push({ ...prompt, content, enabled });
    consumed.add(identifier);
  }

  for (const prompt of prompts) {
    const identifier = normalizedIdentifier(prompt);
    if (identifier && consumed.has(identifier)) continue;
    ordered.push({ ...prompt, enabled: false });
  }

  return ordered;
}

export function normalizePresetConfig(value) {
  if (!isRecord(value)) return value;

  const sourcePrompts = Array.isArray(value.prompts) ? value.prompts : [];
  let prompts = sourcePrompts
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

  const promptOrder = normalizePromptOrder(value.prompt_order, knownPromptIds);
  if (Array.isArray(value.prompt_order)) {
    prompts = materializePromptOrder(prompts, promptOrder);
  }

  const normalized = {
    ...value,
    ...(Object.prototype.hasOwnProperty.call(value, 'prompts') ? { prompts } : {}),
  };

  // Card Studio owns runtime prompt ordering and enablement in preset.prompts.
  // SillyTavern prompt_order is converted once at the import/read boundary.
  if (Array.isArray(value.prompt_order)) delete normalized.prompt_order;

  return normalized;
}

export function normalizePresetList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter(isRecord)
    .map(normalizePresetConfig);
}

export function getPromptOrderIntegrity(value) {
  if (!isRecord(value)) return { promptCount: 0, orderCount: 0 };

  const normalized = normalizePresetConfig(value);
  const prompts = Array.isArray(normalized.prompts) ? normalized.prompts : [];
  const knownPromptIds = new Set(prompts.map(normalizedIdentifier).filter(Boolean));
  const promptOrder = normalizePromptOrder(value.prompt_order, knownPromptIds);
  const order = Array.isArray(promptOrder) ? promptOrder : [];

  const grouped = order.some(entry => isRecord(entry) && Array.isArray(entry.order));
  const orderCount = grouped
    ? order.reduce((count, entry) => count + (Array.isArray(entry.order) ? entry.order.length : 0), 0)
    : order.length;

  return {
    promptCount: prompts.length,
    orderCount,
  };
}
