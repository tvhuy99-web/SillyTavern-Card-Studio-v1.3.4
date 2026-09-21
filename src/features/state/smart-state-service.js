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
  return serializeSmartStateVariables(value, { maxChars });
}

function cleanSemanticText(value, limit = 8192) {
  return truncateString(String(value || '').replace(/\s+/g, ' ').trim(), limit);
}

function semanticAttributeName(name) {
  const value = String(name || '').toLowerCase();
  return value.startsWith('data-')
    || value.startsWith('aria-')
    || ['role', 'name', 'value', 'title', 'alt', 'checked', 'selected', 'disabled', 'open'].includes(value);
}

function semanticAttributeValue(value) {
  if (value === '' || value === true) return true;
  return truncateString(String(value), 256);
}

function buildSemanticVisualObjectFromDom(source) {
  const document = new DOMParser().parseFromString(source, 'text/html');
  document.querySelectorAll('script,style,iframe,object,embed,svg,canvas,link,meta').forEach(node => node.remove());
  const text = cleanSemanticText(document.body?.textContent || '');
  const elements = [];
  for (const node of Array.from(document.body?.querySelectorAll('*') || [])) {
    if (elements.length >= 128) break;
    const attrs = {};
    for (const attribute of Array.from(node.attributes || [])) {
      if (!semanticAttributeName(attribute.name)) continue;
      attrs[attribute.name] = semanticAttributeValue(attribute.value);
    }
    const tag = String(node.tagName || '').toLowerCase();
    const isControl = ['button', 'input', 'select', 'option', 'textarea', 'progress', 'meter', 'details', 'summary'].includes(tag);
    if (!isControl && Object.keys(attrs).length === 0) continue;
    const item = { tag };
    if (Object.keys(attrs).length) item.attributes = attrs;
    const label = cleanSemanticText(node.textContent || '', 512);
    if (label) item.text = label;
    elements.push(item);
  }
  return { text, elements };
}

function buildSemanticVisualObjectWithRegex(source) {
  const sanitized = sanitizeVisualWithRegex(source);
  const text = cleanSemanticText(
    sanitized.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' '),
  );
  const elements = [];
  const tagPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  let match;
  while ((match = tagPattern.exec(sanitized)) && elements.length < 128) {
    const tag = String(match[1] || '').toLowerCase();
    const attrs = {};
    const attrPattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attr;
    while ((attr = attrPattern.exec(match[2] || ''))) {
      const name = String(attr[1] || '').toLowerCase();
      if (!semanticAttributeName(name)) continue;
      attrs[name] = semanticAttributeValue(attr[2] ?? attr[3] ?? attr[4] ?? true);
    }
    const isControl = ['button', 'input', 'select', 'option', 'textarea', 'progress', 'meter', 'details', 'summary'].includes(tag);
    if (isControl || Object.keys(attrs).length) {
      elements.push({ tag, ...(Object.keys(attrs).length ? { attributes: attrs } : {}) });
    }
  }
  return { text, elements };
}

function serializeSemanticVisualObject(value, maxChars) {
  const normalized = {
    text: cleanSemanticText(value?.text || ''),
    elements: Array.isArray(value?.elements) ? value.elements : [],
  };
  for (const count of [128, 96, 64, 32, 16, 8, 0]) {
    const candidate = stringifyJson({
      ...(normalized.text ? { text: normalized.text } : {}),
      ...(count > 0 && normalized.elements.length ? { elements: normalized.elements.slice(0, count) } : {}),
      ...(normalized.elements.length > count ? { meta: { omittedElements: normalized.elements.length - count } } : {}),
    });
    if (candidate && candidate.length <= maxChars) return candidate;
  }
  const textOnly = stringifyJson({ text: cleanSemanticText(normalized.text, Math.max(512, maxChars - 128)) });
  return textOnly && textOnly.length <= maxChars ? textOnly : '';
}

export function deriveSemanticVisualState(value, options = {}) {
  const maxChars = Math.max(1024, Number(options.maxChars) || DEFAULT_VISUAL_STATE_MAX_CHARS);
  const source = String(value || '').trim();
  if (!source) return '';
  try {
    const semantic = typeof DOMParser !== 'undefined'
      ? buildSemanticVisualObjectFromDom(source)
      : buildSemanticVisualObjectWithRegex(source);
    if (!semantic.text && (!semantic.elements || semantic.elements.length === 0)) return '';
    return serializeSemanticVisualObject(semantic, maxChars);
  } catch {
    return '';
  }
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
      const semantic = deriveSemanticVisualState(html, { maxChars });
      if (semantic) return { value: semantic, source: 'derived-html', messageIndex: index };
      const value = sanitizeVisualInterface(html, { maxChars });
      if (value) return { value, source: 'message-html-fallback', messageIndex: index };
    }
  }

  const legacySource = options.legacyVisualState || '';
  const semanticLegacy = deriveSemanticVisualState(legacySource, { maxChars });
  if (semanticLegacy) return { value: semanticLegacy, source: 'legacy-derived-html', messageIndex: -1 };
  const legacy = sanitizeVisualInterface(legacySource, { maxChars });
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
