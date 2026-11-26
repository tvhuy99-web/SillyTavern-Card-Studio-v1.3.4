/**
 * Isolated EJS Web Worker rendering and referenced lorebook line expansion.
 */

const DEFAULT_EJS_TIMEOUT_MS = 5000;
const MAX_EJS_DEPTH = 5;

/**
 * Generates the isolated Web Worker source used to evaluate EJS templates safely.
 *
 * @param {string} ejsRuntimeSource
 * @returns {string}
 */
function buildIsolatedEjsWorkerSource(ejsRuntimeSource) {
  const sendChannelIdentifier = `__send_${Math.random().toString(36).slice(2)}`;
  return `${ejsRuntimeSource}

const __blocked = function () { throw new Error('Network and persistent storage are unavailable in isolated templates.'); };
['fetch','XMLHttpRequest','WebSocket','WebSocketStream','WebTransport','EventSource','Worker','SharedWorker','BroadcastChannel','importScripts','indexedDB','caches'].forEach(function (name) {
  try { Object.defineProperty(self, name, { value: __blocked, writable: false, configurable: false }); } catch (_) { try { self[name] = __blocked; } catch (_) {} }
});
try { if (self.navigator) Object.defineProperty(self.navigator, 'sendBeacon', { value: __blocked, writable: false, configurable: false }); } catch (_) {}

const ${sendChannelIdentifier} = self.postMessage.bind(self);
try { Object.defineProperty(self, 'postMessage', { value: __blocked, writable: false, configurable: false }); } catch (_) {}
self.onmessage = async function (__event) {
  const input = (__event && __event.data) || {};
  const variables = input.variables && typeof input.variables === 'object' ? input.variables : {};
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const normalizePath = function (path) { return String(path || '').replace(/^stat_data\\./, '').replace(/^variables\\./, '').replace(/\\["([^"]+)"\\]/g, '.$1').replace(/\\['([^']+)'\\]/g, '.$1').replace(/\\[(\\d+)\\]/g, '.$1'); };
  const getvar = function (path) {
    const parts = normalizePath(path).split('.').filter(Boolean);
    let value = variables;
    for (const part of parts) { if (value == null) return undefined; value = value[part]; }
    return Array.isArray(value) && value.length === 2 && typeof value[1] === 'string' ? value[0] : value;
  };
  const render = async function (template, depth) {
    if (depth > 5 || !template) return '';
    const clean = String(template).replace(/^@@[a-z_]+.*$/gm, '').replace(/^\\s*#.*$/gm, '');
    if (!clean.includes('<%')) return clean;
    const getwi = async function (first, second) {
      const hasBook = second !== undefined;
      const bookName = hasBook && first != null ? String(first) : '';
      const key = String(hasBook ? second : first || '');
      const entry = entries.find(function (candidate) {
        if (bookName && candidate.bookName !== bookName) return false;
        return candidate.comment === key || candidate.name === key || (Array.isArray(candidate.keys) && candidate.keys.includes(key));
      });
      return entry ? render(entry.content, depth + 1) : '';
    };
    const context = Object.assign({}, variables, {
      getvar: getvar, getwi: getwi, char: input.characterName || '',
      user: variables.user || 'User', stat_data: variables
    });
    return self.ejs.render(clean, context, { async: true, rmWhitespace: true });
  };
  try {
    const output = await render(input.template, Number(input.depth) || 0);
    ${sendChannelIdentifier}({ ok: true, output: String(output == null ? '' : output) });
  } catch (error) {
    ${sendChannelIdentifier}({ ok: false, error: error && error.message ? error.message : String(error) });
  }
};`;
}

/**
 * Executes an EJS template inside the isolated worker sandbox.
 *
 * @param {string} template
 * @param {Record<string, any>} variables
 * @param {string} characterName
 * @param {Array<Record<string, any>>} flattenedEntries
 * @param {number} depth
 * @param {Record<string, any>} deps
 * @returns {Promise<string>}
 */
async function executeIsolatedEjsWorker(
  template,
  variables,
  characterName,
  flattenedEntries,
  depth,
  deps,
) {
  const ejsModule = await deps.loadOptionalModule(async () => {
    const { default: ejsCode } = await import('../../../../ejs.min-Cthf3_XD.js');
    return { default: ejsCode };
  }, []);
  const workerSource = buildIsolatedEjsWorkerSource(ejsModule.default);
  const workerResponse = await deps.runIsolatedScript(
    workerSource,
    {
      template,
      variables,
      characterName,
      entries: flattenedEntries,
      depth,
    },
    { timeoutMs: DEFAULT_EJS_TIMEOUT_MS },
  );
  if (!workerResponse.ok) {
    throw new Error(workerResponse.error || 'EJS template failed.');
  }
  return String(workerResponse.output || '');
}

/**
 * Renders EJS directives in a prompt or World Info template string.
 *
 * @param {string} template
 * @param {Record<string, any>} variables
 * @param {Record<string, any>} card
 * @param {Array<Record<string, any>>} externalLorebooks
 * @param {number} depth
 * @param {Record<string, any>} deps
 * @returns {Promise<string>}
 */
export async function renderEjsTemplate(template, variables, card, externalLorebooks, depth, deps) {
  if (depth > MAX_EJS_DEPTH || !template) {
    return '';
  }

  const cleanedTemplate = template
    .replace(/^@@[a-z_]+.*$/gm, '')
    .replace(/^\s*#.*$/gm, '');

  if (!cleanedTemplate.includes('<%')) {
    return cleanedTemplate;
  }

  try {
    const flattenedEntries = [
      ...(card.char_book?.entries || []).map(entry => ({
        bookName: card.char_book?.name || card.name,
        name: entry.name,
        comment: entry.comment,
        keys: entry.keys || [],
        content: entry.content || '',
      })),
      ...externalLorebooks.flatMap(bookRecord => (bookRecord.book?.entries || []).map(entry => ({
        bookName: bookRecord.name,
        name: entry.name,
        comment: entry.comment,
        keys: entry.keys || [],
        content: entry.content || '',
      }))),
    ];

    return await executeIsolatedEjsWorker(
      cleanedTemplate,
      variables,
      card.name,
      flattenedEntries,
      depth,
      deps,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`EJS Rendering Error (Depth ${depth}):`, errorMessage);
    return `[SYSTEM ERROR: EJS Processing Failed - ${errorMessage}]`;
  }
}

/**
 * Expands standalone lines that match a non-constant World Info entry key,
 * comment, or name by rendering that entry's content through EJS.
 *
 * @param {string} content
 * @param {Record<string, any>} variables
 * @param {Record<string, any>} card
 * @param {Array<Record<string, any>>} externalLorebooks
 * @param {Record<string, any>} deps
 * @returns {Promise<string>}
 */
export async function expandReferencedLorebookLines(content, variables, card, externalLorebooks, deps) {
  if (!content || !content.trim()) {
    return content;
  }

  const lines = content.split('\n');
  const resolvedLines = await Promise.all(lines.map(async line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return line;
    }

    let allEntries = [];
    if (card.char_book?.entries) {
      allEntries = [...allEntries, ...card.char_book.entries];
    }
    externalLorebooks.forEach(bookRecord => {
      if (bookRecord.book?.entries) {
        allEntries = [...allEntries, ...bookRecord.book.entries];
      }
    });

    const matchedEntry = allEntries.find(entry => {
      const matchesKey = entry.keys && entry.keys.includes(trimmedLine);
      const matchesTitle = (entry.comment && entry.comment === trimmedLine)
        || (entry.name && entry.name === trimmedLine);
      return (matchesKey || matchesTitle) && !entry.constant;
    });

    return matchedEntry
      ? await renderEjsTemplate(matchedEntry.content, variables, card, externalLorebooks, 0, deps)
      : line;
  }));

  return resolvedLines.join('\n');
}
