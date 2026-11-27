export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function cloneValue(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch {}
  }
  try { return JSON.parse(JSON.stringify(value)); } catch {
    if (Array.isArray(value)) return value.map(cloneValue);
    return { ...value };
  }
}

export function mergeRecords(target, source) {
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

export function cleanStructuredText(value) {
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

export function parseYamlDocument(text, parseStructured) {
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
