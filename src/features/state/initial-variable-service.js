function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch {}
  }
  try { return JSON.parse(JSON.stringify(value)); } catch {
    if (Array.isArray(value)) return value.map(cloneValue);
    return { ...value };
  }
}

function mergeRecords(target, source) {
  if (!isRecord(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (isRecord(value)) {
      if (!isRecord(target[key])) target[key] = {};
      mergeRecords(target[key], value);
    } else {
      target[key] = cloneValue(value);
    }
  }
  return target;
}

function cleanStructuredText(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/^\s*```(?:json|ya?ml)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function parseRecord(value, parseStructured) {
  if (isRecord(value)) return cloneValue(value);
  const text = cleanStructuredText(value);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (isRecord(parsed)) return parsed;
  } catch {}

  if (typeof parseStructured === 'function') {
    try {
      const parsed = parseStructured(text);
      if (isRecord(parsed)) return cloneValue(parsed);
    } catch {}
  }
  return null;
}

export function findInitVariableEntry(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.find(entry => {
    const label = String(entry?.comment ?? entry?.name ?? '');
    return /\[\s*initvar\s*\]/i.test(label);
  }) || null;
}

export function extractInlineInitVariableBlocks(openingText) {
  const text = String(openingText == null ? '' : openingText);
  const blocks = [];
  const pattern = /<initvar\b[^>]*>([\s\S]*?)<\/initvar>/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (String(match[1] || '').trim()) blocks.push(match[1]);
  }
  return blocks;
}

export function mergeInitialVariableSources(baseVariables, entries, openingText, parseStructured) {
  const variables = isRecord(baseVariables) ? cloneValue(baseVariables) : {};
  const sources = [];

  const entry = findInitVariableEntry(entries);
  if (entry?.content) {
    const parsed = parseRecord(entry.content, parseStructured);
    if (parsed) {
      mergeRecords(variables, parsed);
      sources.push('worldbook:initvar');
    }
  }

  const inlineBlocks = extractInlineInitVariableBlocks(openingText);
  inlineBlocks.forEach((block, index) => {
    const parsed = parseRecord(block, parseStructured);
    if (!parsed) return;
    mergeRecords(variables, parsed);
    sources.push('opening:initvar:' + index);
  });

  return Object.freeze({
    variables,
    sources: Object.freeze(sources),
    worldbookEntryFound: Boolean(entry),
    inlineBlockCount: inlineBlocks.length,
  });
}

export function hasInitialVariables(value) {
  return isRecord(value) && Object.keys(value).length > 0;
}
