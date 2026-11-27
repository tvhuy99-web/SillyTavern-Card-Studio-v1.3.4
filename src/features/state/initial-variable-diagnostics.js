import {
  cleanStructuredText,
  isRecord,
  parseYamlDocument,
} from './initial-variable-parser.js';

function summarizeRecordForDiagnostics(value) {
  const object = isRecord(value) ? value : {};
  const keys = Object.keys(object);
  const statData = isRecord(object.stat_data) ? object.stat_data : null;
  const stateObject = statData || object;
  return {
    inputType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    keyCount: keys.length,
    keys: keys.slice(0, 32),
    hasStatData: Boolean(statData),
    stateKeyCount: Object.keys(stateObject).length,
    stateKeys: Object.keys(stateObject).slice(0, 32),
  };
}

function compactError(error) {
  return String(error && error.message ? error.message : error || '').slice(0, 240);
}

function inspectStructuredCandidate(source, value, parseStructured) {
  const result = {
    source,
    present: value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === ''),
    inputType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    textLength: typeof value === 'string' ? value.length : 0,
    json: { attempted: false, ok: false, error: '' },
    structured: { attempted: false, ok: false, error: '' },
    yaml: { attempted: false, ok: false, error: '' },
    parserUsed: '',
    parsed: summarizeRecordForDiagnostics(null),
  };
  if (!result.present) return result;
  if (isRecord(value)) {
    result.parsed = summarizeRecordForDiagnostics(value);
    result.json.ok = true;
    result.parserUsed = 'object';
    return result;
  }
  const text = cleanStructuredText(value);
  if (!text) return result;
  result.json.attempted = true;
  try {
    const parsed = JSON.parse(text);
    if (isRecord(parsed)) {
      result.json.ok = true;
      result.parserUsed = 'json';
      result.parsed = summarizeRecordForDiagnostics(parsed);
      return result;
    }
    result.json.error = 'parsed-non-record:' + (Array.isArray(parsed) ? 'array' : typeof parsed);
  } catch (error) {
    result.json.error = compactError(error);
  }
  if (typeof parseStructured === 'function') {
    result.structured.attempted = true;
    try {
      const parsed = parseStructured(text);
      if (isRecord(parsed)) {
        result.structured.ok = true;
        result.parserUsed = 'structured-json5';
        result.parsed = summarizeRecordForDiagnostics(parsed);
        return result;
      }
      result.structured.error = 'parsed-non-record:' + (Array.isArray(parsed) ? 'array' : typeof parsed);
    } catch (error) {
      result.structured.error = compactError(error);
    }
  }
  result.yaml.attempted = true;
  try {
    const parsed = parseYamlDocument(text, parseStructured);
    if (isRecord(parsed)) {
      result.yaml.ok = true;
      result.parserUsed = 'yaml';
      result.parsed = summarizeRecordForDiagnostics(parsed);
    } else {
      result.yaml.error = 'parsed-non-record:' + (Array.isArray(parsed) ? 'array' : typeof parsed);
    }
  } catch (error) {
    result.yaml.error = compactError(error);
  }
  return result;
}

function inspectEntryCollection(entries, parseStructured) {
  const list = Array.isArray(entries) ? entries : [];
  const matches = [];
  list.forEach((entry, index) => {
    const label = String(entry?.comment ?? entry?.name ?? '');
    if (!/initvar/i.test(label)) return;
    matches.push({
      index,
      label: label.slice(0, 180),
      enabled: entry?.enabled !== false,
      exactMarker: /\[\s*initvar\s*\]/i.test(label),
      contentLength: String(entry?.content ?? '').length,
      parse: inspectStructuredCandidate('entry:' + index, entry?.content, parseStructured),
    });
  });
  return {
    isArray: Array.isArray(entries),
    entryCount: list.length,
    initvarLikeCount: matches.length,
    exactMarkerCount: matches.filter(item => item.exactMarker).length,
    matches: matches.slice(0, 12),
  };
}

function inspectOpeningSource(
  source,
  text,
  baseVariables,
  card,
  parseStructured,
  extractInlineInitVariableBlocks,
  seedInitialVariablesFromCard,
) {
  const value = String(text == null ? '' : text);
  const blocks = extractInlineInitVariableBlocks(value);
  const seed = seedInitialVariablesFromCard(baseVariables, card, value, parseStructured);
  return {
    source,
    length: value.length,
    hasInitvarToken: /initvar/i.test(value),
    inlineInitvarCount: blocks.length,
    inlineBlocks: blocks.slice(0, 8).map((block, index) => ({
      index,
      length: block.length,
      parse: inspectStructuredCandidate(source + ':inline:' + index, block, parseStructured),
    })),
    seedSources: Array.from(seed.sources || []),
    seedResult: summarizeRecordForDiagnostics(seed.variables),
  };
}

export function inspectInitialVariablePipelineWithHelpers(options = {}, helpers = {}) {
  const {
    extractInlineInitVariableBlocks,
    seedInitialVariablesFromCard,
    selectInitialVariableOpening,
  } = helpers;
  const baseVariables = isRecord(options.baseVariables) ? options.baseVariables : {};
  const card = isRecord(options.card) ? options.card : {};
  const messages = Array.isArray(options.messages) ? options.messages : [];
  const variableScopes = isRecord(options.variableScopes) ? options.variableScopes : {};
  const parseStructured = options.parseStructured;
  const firstMessage = messages[0] || {};
  const extensions = isRecord(card.extensions) ? card.extensions : {};
  const extensionCandidates = [];

  extensionCandidates.push(inspectStructuredCandidate(
    'card.extensions.TavernHelper_variables',
    extensions.TavernHelper_variables,
    parseStructured,
  ));
  extensionCandidates.push(inspectStructuredCandidate(
    'card.extensions.tavern_helper_variables',
    extensions.tavern_helper_variables,
    parseStructured,
  ));
  if (Array.isArray(extensions.tavern_helper)) {
    extensions.tavern_helper.forEach((entry, index) => {
      if (!Array.isArray(entry) || !/^(variables|variable)$/i.test(String(entry[0] || ''))) return;
      extensionCandidates.push(inspectStructuredCandidate(
        'card.extensions.tavern_helper[' + index + ']',
        entry[1],
        parseStructured,
      ));
    });
  } else if (isRecord(extensions.tavern_helper)) {
    extensionCandidates.push(inspectStructuredCandidate(
      'card.extensions.tavern_helper.variables',
      extensions.tavern_helper.variables,
      parseStructured,
    ));
  }

  const openings = [
    inspectOpeningSource(
      'card.first_mes',
      card.first_mes,
      baseVariables,
      card,
      parseStructured,
      extractInlineInitVariableBlocks,
      seedInitialVariablesFromCard,
    ),
    inspectOpeningSource(
      'message0.originalRawContent',
      firstMessage.originalRawContent,
      baseVariables,
      card,
      parseStructured,
      extractInlineInitVariableBlocks,
      seedInitialVariablesFromCard,
    ),
    inspectOpeningSource(
      'message0.content',
      firstMessage.content,
      baseVariables,
      card,
      parseStructured,
      extractInlineInitVariableBlocks,
      seedInitialVariablesFromCard,
    ),
    inspectOpeningSource(
      'runtime.originalContent',
      options.originalContent,
      baseVariables,
      card,
      parseStructured,
      extractInlineInitVariableBlocks,
      seedInitialVariablesFromCard,
    ),
  ];

  const selectedOpening = selectInitialVariableOpening(card, messages, options.originalContent);
  const runtimeSeed = seedInitialVariablesFromCard(baseVariables, card, selectedOpening.text, parseStructured);
  const scopeSummaries = {};
  Object.entries(variableScopes).forEach(([key, value]) => {
    scopeSummaries[key] = summarizeRecordForDiagnostics(value);
  });
  const baseSummary = summarizeRecordForDiagnostics(baseVariables);
  const seedSummary = summarizeRecordForDiagnostics(runtimeSeed.variables);
  const chatSummary = summarizeRecordForDiagnostics(variableScopes.chat);
  const messageIndex = Math.max(0, Number(options.messageId) || 0);
  const messageScopeSummary = summarizeRecordForDiagnostics(variableScopes['message:' + messageIndex]);
  const cardWorldbook = inspectEntryCollection(card?.char_book?.entries, parseStructured);
  const runtimeWorldInfo = inspectEntryCollection(options.worldInfo, parseStructured);
  const alternateOpening = openings.find(item => item.source !== 'card.first_mes' && item.seedResult.keyCount > 0);
  const sourceDetected = extensionCandidates.some(item => item.present)
    || cardWorldbook.initvarLikeCount > 0
    || openings.some(item => item.inlineInitvarCount > 0);

  let classification = 'no-initvar-source-detected';
  if (baseSummary.keyCount > 0 && chatSummary.keyCount === 0) classification = 'base-present-but-final-chat-empty';
  else if (seedSummary.keyCount > 0 && chatSummary.keyCount === 0) classification = 'seed-produced-but-final-chat-empty';
  else if (chatSummary.keyCount > 0) classification = 'final-chat-populated';
  else if (alternateOpening) classification = 'runtime-opening-source-mismatch';
  else if (runtimeWorldInfo.exactMarkerCount > 0 && cardWorldbook.exactMarkerCount === 0) classification = 'initvar-only-in-runtime-worldinfo';
  else if (sourceDetected) classification = 'sources-detected-but-seed-empty';

  return {
    diagnosticVersion: 'initvar-provenance-1',
    classification,
    messageId: messageIndex,
    baseVariables: baseSummary,
    card: {
      present: isRecord(options.card),
      name: String(card.name || '').slice(0, 160),
      fileName: String(card.fileName || '').slice(0, 160),
      firstMesLength: String(card.first_mes || '').length,
      extensionKeys: Object.keys(extensions).slice(0, 48),
      hasCharBook: isRecord(card.char_book),
      charBookName: String(card?.char_book?.name || '').slice(0, 160),
      charBookEntryCount: Array.isArray(card?.char_book?.entries) ? card.char_book.entries.length : 0,
    },
    message0: {
      present: Boolean(messages.length),
      role: String(firstMessage.role || ''),
      contentLength: String(firstMessage.content || '').length,
      originalRawContentLength: String(firstMessage.originalRawContent || '').length,
      contextState: summarizeRecordForDiagnostics(firstMessage.contextState),
    },
    extensionCandidates,
    cardWorldbook,
    runtimeWorldInfo,
    openings,
    actualRuntimeSeed: {
      openingSource: selectedOpening.source,
      openingLength: selectedOpening.text.length,
      hasInlineInitvar: selectedOpening.hasInlineInitvar,
      sources: Array.from(runtimeSeed.sources || []),
      result: seedSummary,
    },
    finalScopes: {
      count: Object.keys(variableScopes).length,
      chat: chatSummary,
      currentMessage: messageScopeSummary,
      scopes: scopeSummaries,
    },
    parserAvailable: typeof parseStructured === 'function',
  };
}
