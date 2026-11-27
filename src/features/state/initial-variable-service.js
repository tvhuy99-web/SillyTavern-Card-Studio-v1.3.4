import {
  cloneValue,
  isRecord,
  mergeRecords,
  parseInitialVariableDocument,
} from './initial-variable-parser.js';
import { inspectInitialVariablePipelineWithHelpers } from './initial-variable-diagnostics.js';

export { parseInitialVariableDocument } from './initial-variable-parser.js';

function parseRecord(value, parseStructured) {
  return parseInitialVariableDocument(value, parseStructured);
}

function extractCardExtensionVariables(card, parseStructured) {
  const extensions = isRecord(card?.extensions) ? card.extensions : {};
  const variables = {};

  function mergeCandidate(value) {
    const parsed = parseRecord(value, parseStructured);
    if (parsed) mergeRecords(variables, parsed);
  }

  mergeCandidate(extensions.TavernHelper_variables);
  mergeCandidate(extensions.tavern_helper_variables);

  if (Array.isArray(extensions.tavern_helper)) {
    extensions.tavern_helper.forEach(entry => {
      if (!Array.isArray(entry)) return;
      if (!/^(variables|variable)$/i.test(String(entry[0] || ''))) return;
      mergeCandidate(entry[1]);
    });
  } else if (isRecord(extensions.tavern_helper)) {
    mergeCandidate(extensions.tavern_helper.variables);
  }

  return variables;
}

export function selectInitialVariableOpening(card, messages, originalContent, explicitOpening) {
  const firstMessage = Array.isArray(messages) && messages.length ? messages[0] || {} : {};
  const candidates = [
    { source: 'message0.originalRawContent', text: firstMessage.originalRawContent },
    { source: 'message0.content', text: firstMessage.content },
    { source: 'runtime.originalContent', text: originalContent },
    { source: 'explicitOpening', text: explicitOpening },
    { source: 'card.first_mes', text: card?.first_mes },
  ];
  const inlineCandidate = candidates.find(candidate =>
    extractInlineInitVariableBlocks(String(candidate.text == null ? '' : candidate.text)).length > 0
  );
  const selected = inlineCandidate || candidates.find(candidate => String(candidate.text == null ? '' : candidate.text).trim()) || candidates[candidates.length - 1];
  return Object.freeze({
    source: selected?.source || 'card.first_mes',
    text: String(selected?.text == null ? '' : selected.text),
    hasInlineInitvar: Boolean(inlineCandidate),
  });
}

export function seedInitialVariablesFromCard(baseVariables, card, openingText, parseStructured) {
  const extensionVariables = extractCardExtensionVariables(card, parseStructured);
  const base = mergeRecords(extensionVariables, isRecord(baseVariables) ? baseVariables : {});
  return mergeInitialVariableSources(
    base,
    card?.char_book?.entries || [],
    openingText == null ? card?.first_mes || '' : openingText,
    parseStructured,
  );
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
  const inlineBlocks = extractInlineInitVariableBlocks(openingText);

  if (inlineBlocks.length > 0) {
    inlineBlocks.forEach((block, index) => {
      const parsed = parseRecord(block, parseStructured);
      if (!parsed) return;
      mergeRecords(variables, parsed);
      sources.push('opening:initvar:' + index);
    });
  } else if (entry?.content) {
    const parsed = parseRecord(entry.content, parseStructured);
    if (parsed) {
      mergeRecords(variables, parsed);
      sources.push('worldbook:initvar');
    }
  }

  return Object.freeze({
    variables,
    sources: Object.freeze(sources),
    worldbookEntryFound: Boolean(entry),
    worldbookSuppressedByInline: inlineBlocks.length > 0 && Boolean(entry),
    inlineBlockCount: inlineBlocks.length,
  });
}

export function hasInitialVariables(value) {
  return isRecord(value) && Object.keys(value).length > 0;
}

export function inspectInitialVariablePipeline(options = {}) {
  return inspectInitialVariablePipelineWithHelpers(options, {
    extractInlineInitVariableBlocks,
    seedInitialVariablesFromCard,
    selectInitialVariableOpening,
  });
}
