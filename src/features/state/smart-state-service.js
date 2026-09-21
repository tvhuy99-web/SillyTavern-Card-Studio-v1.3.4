const DEFAULT_LOGIC_STORE_MAX_CHARS = 65536;
const DEFAULT_VISUAL_STATE_MAX_CHARS = 24576;
const META_EXTENSIBLE = '$__META_EXTENSIBLE__$';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function truncateString(value, limit) {
  const text = String(value ?? '');
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 32)) + '… [truncated]';
}

function cleanValue(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (value.length > 1 && typeof value[1] === 'string') {
      const primary = value[0];
      if (Array.isArray(primary)) {
        return primary
          .filter(item => item !== META_EXTENSIBLE)
          .map(item => cleanValue(item, seen));
      }
      return cleanValue(primary, seen);
    }
    return value
      .filter(item => item !== META_EXTENSIBLE)
      .map(item => cleanValue(item, seen));
  }
  if (!isRecord(value)) return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (String(key).startsWith('$')) continue;
    result[key] = cleanValue(entry, seen);
  }
  seen.delete(value);
  return result;
}

export function normalizeSmartStateVariables(value) {
  return cleanValue(value);
}

function compactValue(value, depth = 0) {
  if (depth > 12) return '[Max depth]';
  if (typeof value === 'string') return truncateString(value, 2048);
  if (Array.isArray(value)) {
    const kept = value.slice(0, 128).map(item => compactValue(item, depth + 1));
    if (value.length > kept.length) kept.push('[+' + (value.length - kept.length) + ' more items]');
    return kept;
  }
  if (!isRecord(value)) return value;
  const result = {};
  for (const [key, entry] of Object.entries(value)) result[key] = compactValue(entry, depth + 1);
  return result;
}

function stringifyJson(value) {
  try { return JSON.stringify(value, null, 2); } catch { return ''; }
}

export function serializeSmartStateVariables(value, options = {}) {
  const maxChars = Math.max(1024, Number(options.maxChars) || DEFAULT_LOGIC_STORE_MAX_CHARS);
  const clean = normalizeSmartStateVariables(value);
  let text = stringifyJson(clean);
  if (!text || text === '{}' || text === '[]') return '';
  if (text.length <= maxChars) return text;

  const compacted = compactValue(clean);
  text = stringifyJson(compacted);
  if (text.length <= maxChars) return text;

  if (!isRecord(compacted)) {
    return stringifyJson({
      __smart_state_meta: { truncated: true, reason: 'state exceeded prompt budget' },
    });
  }

  const output = {};
  const omittedKeys = [];
  for (const [key, entry] of Object.entries(compacted)) {
    const candidate = {
      ...output,
      [key]: entry,
      __smart_state_meta: { truncated: true, omittedKeys: [] },
    };
    if (stringifyJson(candidate).length <= maxChars - 512) output[key] = entry;
    else omittedKeys.push(key);
  }
  output.__smart_state_meta = {
    truncated: true,
    omittedKeys: omittedKeys.slice(0, 128),
    ...(omittedKeys.length > 128 ? { additionalOmittedKeys: omittedKeys.length - 128 } : {}),
  };
  text = stringifyJson(output);
  if (text.length <= maxChars) return text;
  return stringifyJson({
    __smart_state_meta: {
      truncated: true,
      reason: 'state exceeded prompt budget',
      omittedKeyCount: Object.keys(compacted).length,
    },
  });
}

function sanitizeVisualWithRegex(value) {
  return String(value || '')
    .replace(/<(script|style|iframe|object|embed|svg|canvas|link|meta)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|canvas|link|meta)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+(?:on[a-z]+|style|class|src|srcset|href|integrity|crossorigin)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizeVisualInterface(value, options = {}) {
  const maxChars = Math.max(1024, Number(options.maxChars) || DEFAULT_VISUAL_STATE_MAX_CHARS);
  const source = String(value || '').trim();
  if (!source) return '';

  let clean = '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const document = new DOMParser().parseFromString(source, 'text/html');
      document.querySelectorAll('script,style,iframe,object,embed,svg,canvas,link,meta').forEach(node => node.remove());
      document.querySelectorAll('*').forEach(node => {
        for (const attribute of Array.from(node.attributes || [])) {
          if (/^on/i.test(attribute.name) || /^(?:style|class|src|srcset|href|integrity|crossorigin)$/i.test(attribute.name)) {
            node.removeAttribute(attribute.name);
          }
        }
      });
      clean = String(document.body?.innerHTML || '').replace(/\s{2,}/g, ' ').trim();
      if (clean.length > maxChars) {
        const text = String(document.body?.textContent || '').replace(/\s+/g, ' ').trim();
        return truncateString(text, maxChars) + '\n[Visual state reduced to text because it exceeded the prompt budget]';
      }
    } catch {
      clean = sanitizeVisualWithRegex(source);
    }
  } else {
    clean = sanitizeVisualWithRegex(source);
  }

  return clean.length <= maxChars
    ? clean
    : truncateString(clean, maxChars) + '\n[Visual state truncated]';
}

function serializeStructuredVisual(value, maxChars) {
  const normalized = normalizeSmartStateVariables(value);
  const text = stringifyJson(normalized);
  if (!text) return '';
  return text.length <= maxChars
    ? text
    : truncateString(text, maxChars) + '\n[Structured visual state truncated]';
}

export function findLatestVisualState(messages, options = {}) {
  const list = Array.isArray(messages) ? messages : [];
  const maxChars = Math.max(1024, Number(options.maxChars) || DEFAULT_VISUAL_STATE_MAX_CHARS);

  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index];
    if (!message || typeof message !== 'object') continue;
    const structured = message.interactiveState ?? message.visualStateSnapshot;
    if (structured && typeof structured === 'object') {
      const value = serializeStructuredVisual(structured, maxChars);
      if (value) return { value, source: 'structured', messageIndex: index };
    }
    const html = message.interactiveHtml
      || (Array.isArray(message.interactiveHtmlBlocks) ? message.interactiveHtmlBlocks.join('\n') : '');
    if (html) {
      const value = sanitizeVisualInterface(html, { maxChars });
      if (value) return { value, source: 'message-html', messageIndex: index };
    }
  }

  const legacy = sanitizeVisualInterface(options.legacyVisualState || '', { maxChars });
  return legacy
    ? { value: legacy, source: 'legacy-fallback', messageIndex: -1 }
    : { value: '', source: 'none', messageIndex: -1 };
}

export function buildMythicDatabase(card) {
  const rpg = card?.rpg_data;
  if (!rpg || !Array.isArray(rpg.tables)) return '';
  let output = '';
  for (const table of rpg.tables) {
    if (!table?.config?.columns?.length) continue;
    if (table.config.lorebookLink?.enabled) continue;
    if (!table?.data?.rows?.length) continue;
    output += '### ' + String(table.config.name || 'Table') + '\n';
    const headers = table.config.columns.map(column => String(column?.label || ''));
    output += '| ' + headers.join(' | ') + ' |\n';
    output += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    for (const row of table.data.rows) {
      output += '| ' + row.slice(1).map(cell => cell == null
        ? ''
        : String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ') + ' |\n';
    }
    output += '\n';
  }
  return output.trim();
}

export function buildSmartStateBlock(input = {}) {
  const logicStore = serializeSmartStateVariables(input.variables, {
    maxChars: input.logicStoreMaxChars,
  });
  const visual = findLatestVisualState(input.messages, {
    legacyVisualState: input.legacyVisualState,
    maxChars: input.visualStateMaxChars,
  });
  const mythicDatabase = buildMythicDatabase(input.card);
  const blocks = [];
  if (logicStore) blocks.push('<LogicStore>\n' + logicStore + '\n</LogicStore>');
  if (visual.value) blocks.push('<VisualInterface>\n' + visual.value + '\n</VisualInterface>');
  return Object.freeze({
    logicStore,
    visualState: visual.value,
    visualSource: visual.source,
    visualMessageIndex: visual.messageIndex,
    mythicDatabase,
    smartStateBlock: blocks.join('\n\n'),
  });
}

export const smartStateContract = Object.freeze({
  smartStateIncludes: Object.freeze(['LogicStore', 'VisualInterface']),
  smartStateExcludes: Object.freeze(['MythicDatabase']),
  logicStoreMaxChars: DEFAULT_LOGIC_STORE_MAX_CHARS,
  visualStateMaxChars: DEFAULT_VISUAL_STATE_MAX_CHARS,
});
