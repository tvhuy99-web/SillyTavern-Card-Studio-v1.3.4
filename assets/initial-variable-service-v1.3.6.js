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

function stripYamlComment(line) {
  let quote = '';
  let depth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === quote) {
        if (quote === "'" && line[index + 1] === "'") { index += 1; continue; }
        if (line[index - 1] !== '\\') quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{' || char === '(') { depth += 1; continue; }
    if (char === ']' || char === '}' || char === ')') { depth = Math.max(0, depth - 1); continue; }
    if (char === '#' && depth === 0 && (index === 0 || /\s/.test(line[index - 1]))) return line.slice(0, index).trimEnd();
  }
  return line.trimEnd();
}

function splitYamlTopLevel(text, separator) {
  const parts = [];
  let quote = '';
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") { index += 1; continue; }
        if (text[index - 1] !== '\\') quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{' || char === '(') { depth += 1; continue; }
    if (char === ']' || char === '}' || char === ')') { depth = Math.max(0, depth - 1); continue; }
    if (char === separator && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function findYamlMappingColon(text) {
  let quote = '';
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") { index += 1; continue; }
        if (text[index - 1] !== '\\') quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{' || char === '(') { depth += 1; continue; }
    if (char === ']' || char === '}' || char === ')') { depth = Math.max(0, depth - 1); continue; }
    if (char === ':' && depth === 0 && (index === text.length - 1 || /\s/.test(text[index + 1]))) return index;
  }
  return -1;
}

function parseYamlQuoted(text) {
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  if (text.startsWith('"') && text.endsWith('"')) {
    try { return JSON.parse(text); } catch {
      return text.slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }
  return null;
}

function parseYamlScalar(text, parseStructured) {
  const value = String(text == null ? '' : text).trim();
  if (!value) return null;
  const quoted = parseYamlQuoted(value);
  if (quoted !== null) return quoted;
  if (/^(?:null|~)$/i.test(value)) return null;
  if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^(?:\.nan)$/i.test(value)) return NaN;
  if (/^[+-]?\.inf$/i.test(value)) return value.startsWith('-') ? -Infinity : Infinity;
  if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)) return Number(value);
  if (/^0x[0-9a-f]+$/i.test(value)) return Number.parseInt(value.slice(2), 16);

  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try { return JSON.parse(value); } catch {}
    if (typeof parseStructured === 'function') {
      try { return cloneValue(parseStructured(value)); } catch {}
    }
    if (value.startsWith('[')) {
      const body = value.slice(1, -1).trim();
      if (!body) return [];
      return splitYamlTopLevel(body, ',').map(part => parseYamlScalar(part, parseStructured));
    }
    const body = value.slice(1, -1).trim();
    if (!body) return {};
    const object = {};
    for (const part of splitYamlTopLevel(body, ',')) {
      const colon = findYamlMappingColon(part);
      if (colon < 0) throw new Error('YAML flow mapping entry is missing a colon: ' + part.trim().slice(0, 80));
      const rawKey = part.slice(0, colon).trim();
      const decodedKey = parseYamlQuoted(rawKey);
      const key = decodedKey === null ? rawKey : decodedKey;
      object[String(key)] = parseYamlScalar(part.slice(colon + 1), parseStructured);
    }
    return object;
  }

  return value;
}

function yamlIndentWidth(line) {
  const match = String(line).match(/^[ ]*/);
  return match ? match[0].length : 0;
}

function parseYamlKey(text) {
  const raw = String(text || '').trim();
  const quoted = parseYamlQuoted(raw);
  return String(quoted === null ? raw : quoted);
}

function parseYamlDocument(text, parseStructured) {
  const source = cleanStructuredText(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!source.trim()) return null;
  const rawLines = source.split('\n');
  const lines = [];
  rawLines.forEach((raw, index) => {
    if (/^\s*\t/.test(raw)) throw new Error('YAML indentation cannot use tabs (line ' + (index + 1) + ').');
    const withoutComment = stripYamlComment(raw);
    const trimmed = withoutComment.trim();
    if (!trimmed || trimmed === '---' || trimmed === '...') return;
    lines.push({ number: index + 1, indent: yamlIndentWidth(withoutComment), text: withoutComment.trim() });
  });
  if (!lines.length) return null;

  function blockScalar(startIndex, parentIndent, marker) {
    let end = startIndex;
    while (end < lines.length && lines[end].indent > parentIndent) end += 1;
    if (end === startIndex) return { value: '', next: end };
    const contentIndent = Math.min(...lines.slice(startIndex, end).map(line => line.indent));
    const content = lines.slice(startIndex, end).map(line => {
      const original = rawLines[line.number - 1] || '';
      return original.slice(Math.min(contentIndent, original.length));
    });
    const folded = marker.startsWith('>');
    let value = folded
      ? content.reduce((out, line, index) => {
          if (index === 0) return line;
          const previousBlank = content[index - 1].trim() === '';
          const blank = line.trim() === '';
          return out + (previousBlank || blank ? '\n' : ' ') + line;
        }, '')
      : content.join('\n');
    if (!marker.endsWith('-')) value += '\n';
    if (marker.endsWith('+')) value += '\n';
    return { value, next: end };
  }

  function parseBlock(startIndex, indent) {
    if (startIndex >= lines.length) return { value: {}, next: startIndex };
    const sequence = lines[startIndex].indent === indent && /^-(?:\s|$)/.test(lines[startIndex].text);
    const container = sequence ? [] : {};
    let index = startIndex;

    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new Error('Unexpected YAML indentation at line ' + line.number + '.');

      if (sequence) {
        if (!/^-(?:\s|$)/.test(line.text)) break;
        const itemText = line.text.replace(/^-(?:\s|$)/, '').trim();
        if (!itemText) {
          if (index + 1 < lines.length && lines[index + 1].indent > indent) {
            const nested = parseBlock(index + 1, lines[index + 1].indent);
            container.push(nested.value);
            index = nested.next;
          } else {
            container.push(null);
            index += 1;
          }
          continue;
        }

        const colon = findYamlMappingColon(itemText);
        if (colon >= 0) {
          const item = {};
          const key = parseYamlKey(itemText.slice(0, colon));
          const rest = itemText.slice(colon + 1).trim();
          if (/^[|>][+-]?$/.test(rest)) {
            const scalar = blockScalar(index + 1, indent, rest);
            item[key] = scalar.value;
            index = scalar.next;
          } else if (rest) {
            item[key] = parseYamlScalar(rest, parseStructured);
            index += 1;
          } else if (index + 1 < lines.length && lines[index + 1].indent > indent) {
            const nested = parseBlock(index + 1, lines[index + 1].indent);
            item[key] = nested.value;
            index = nested.next;
          } else {
            item[key] = null;
            index += 1;
          }

          while (index < lines.length && lines[index].indent > indent) {
            const childIndent = lines[index].indent;
            if (/^-(?:\s|$)/.test(lines[index].text)) break;
            const nestedMap = parseBlock(index, childIndent);
            if (!isRecord(nestedMap.value)) break;
            Object.assign(item, nestedMap.value);
            index = nestedMap.next;
          }
          container.push(item);
          continue;
        }

        container.push(parseYamlScalar(itemText, parseStructured));
        index += 1;
        continue;
      }

      if (/^-(?:\s|$)/.test(line.text)) break;
      const colon = findYamlMappingColon(line.text);
      if (colon < 0) throw new Error('YAML mapping entry is missing a colon at line ' + line.number + '.');
      const key = parseYamlKey(line.text.slice(0, colon));
      const rest = line.text.slice(colon + 1).trim();

      if (/^[|>][+-]?$/.test(rest)) {
        const scalar = blockScalar(index + 1, indent, rest);
        container[key] = scalar.value;
        index = scalar.next;
      } else if (rest) {
        container[key] = parseYamlScalar(rest, parseStructured);
        index += 1;
      } else if (index + 1 < lines.length && lines[index + 1].indent > indent) {
        const nested = parseBlock(index + 1, lines[index + 1].indent);
        container[key] = nested.value;
        index = nested.next;
      } else {
        container[key] = null;
        index += 1;
      }
    }
    return { value: container, next: index };
  }

  const parsed = parseBlock(0, lines[0].indent);
  if (parsed.next !== lines.length) throw new Error('YAML document contains an unparsed block near line ' + lines[parsed.next].number + '.');
  return parsed.value;
}

export function parseInitialVariableDocument(value, parseStructured) {
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

  try {
    const parsed = parseYamlDocument(text, parseStructured);
    if (isRecord(parsed)) return parsed;
  } catch {}

  return null;
}

function parseRecord(value, parseStructured) {
  return parseInitialVariableDocument(value, parseStructured);
}

export function extractCardExtensionVariables(card, parseStructured) {
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

function inspectOpeningSource(source, text, baseVariables, card, parseStructured) {
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

export function inspectInitialVariablePipeline(options = {}) {
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
    inspectOpeningSource('card.first_mes', card.first_mes, baseVariables, card, parseStructured),
    inspectOpeningSource('message0.originalRawContent', firstMessage.originalRawContent, baseVariables, card, parseStructured),
    inspectOpeningSource('message0.content', firstMessage.content, baseVariables, card, parseStructured),
    inspectOpeningSource('runtime.originalContent', options.originalContent, baseVariables, card, parseStructured),
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
