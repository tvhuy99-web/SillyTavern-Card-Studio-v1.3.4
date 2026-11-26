/**
 * Canonical prompt assembly engine for SillyTavern Card Studio.
 *
 * Clean extraction of `buildBaseSections` and `assemblePrompt` from
 * `legacy-prompt-builder.js` with full behavioral parity across preset ordering,
 * character/persona overrides, World Info before/after injection, variable scopes,
 * prompt macros, official-local prompt regex scripts, RPG hybrid tables, and
 * isolated EJS worker rendering.
 */

import { extractStoryContent } from './story-content.js';
import { createMacroProcessing } from '../../../recovered/features/prompts/macro-processing.js';
import { createRegexProcessing } from '../../../recovered/features/chat/regex-processing.js';
import { createTableProcessing } from '../../../recovered/features/rpg/table-processing.js';
import { buildSmartStateBlock } from '../../../smart-state-service-v1.3.6.js';
import {
  normalizePromptVariableScopes,
  readGlobalVariables,
} from '../../../variable-scope-service-v1.3.6.js';

const DEFAULT_EJS_TIMEOUT_MS = 5000;
const MAX_EJS_DEPTH = 5;
const VALID_DEPTH_PROMPT_ROLES = ['system', 'user', 'assistant'];

const defaultMacroHelpers = createMacroProcessing({});
const defaultTableHelpers = createTableProcessing({
  HarmCategory: {},
  HarmBlockThreshold: {},
  parseRelaxedJson: text => JSON.parse(text),
});

/**
 * Normalizes a variable path by stripping `stat_data.`/`variables.` prefixes
 * and converting bracket notation into dot notation.
 *
 * @param {string} rawPath
 * @returns {string}
 */
function normalizeVariablePath(rawPath) {
  if (!rawPath) return '';
  return String(rawPath)
    .replace(/^stat_data\./, '')
    .replace(/^variables\./, '')
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1');
}

/**
 * Checks whether a stored variable value is a `[value, description]` tuple.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isDescribedTuple(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[1] === 'string';
}

/**
 * Splits a normalized dot-path into non-empty path segments.
 *
 * @param {string} normalizedPath
 * @returns {string[]}
 */
function splitPathSegments(normalizedPath) {
  return normalizedPath.split('.').filter(Boolean);
}

/**
 * Reads a nested property from an object using dot notation.
 *
 * @param {Record<string, any>} target
 * @param {string} normalizedPath
 * @returns {any}
 */
function getNestedProperty(target, normalizedPath) {
  const segments = splitPathSegments(normalizedPath);
  if (segments.length === 0) return undefined;
  let current = target;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Writes a nested property on an object using dot notation, creating intermediate
 * objects/arrays as needed.
 *
 * @param {Record<string, any>} target
 * @param {string} normalizedPath
 * @param {any} value
 */
function setNestedProperty(target, normalizedPath, value) {
  const segments = splitPathSegments(normalizedPath);
  if (segments.length === 0 || target == null || typeof target !== 'object') return;
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    if (current[segment] == null || typeof current[segment] !== 'object') {
      current[segment] = /^\d+$/.test(nextSegment) ? [] : {};
    }
    current = current[segment];
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Removes a nested property from an object using dot notation.
 *
 * @param {Record<string, any>} target
 * @param {string} normalizedPath
 */
function unsetNestedProperty(target, normalizedPath) {
  const segments = splitPathSegments(normalizedPath);
  if (segments.length === 0 || target == null || typeof target !== 'object') return;
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (current[segment] == null || typeof current[segment] !== 'object') return;
    current = current[segment];
  }
  delete current[segments[segments.length - 1]];
}

/**
 * Default variable getter matching `script-execution.js` (`getVariable`).
 *
 * @param {Record<string, any>} variables
 * @param {string} path
 * @param {any} [fallback]
 * @param {boolean} [unwrapTuple=true]
 * @returns {any}
 */
function defaultGetVariable(variables, path, fallback = undefined, unwrapTuple = true) {
  const normalizedPath = normalizeVariablePath(path);
  const rawValue = getNestedProperty(variables, normalizedPath);
  if (unwrapTuple && isDescribedTuple(rawValue)) {
    return rawValue[0];
  }
  return rawValue === undefined ? fallback : rawValue;
}

/**
 * Writes a value while preserving `[value, description]` tuple metadata.
 *
 * @param {Record<string, any>} variables
 * @param {string} path
 * @param {any} value
 */
function writeVariableWithTuple(variables, path, value) {
  const normalizedPath = normalizeVariablePath(path);
  const existing = getNestedProperty(variables, normalizedPath);
  if (isDescribedTuple(existing)) {
    setNestedProperty(variables, normalizedPath, [value, existing[1]]);
  } else {
    setNestedProperty(variables, normalizedPath, value);
  }
}

/**
 * Default immutable variable mutator matching `script-execution.js` (`mutateVariable`).
 *
 * @param {Record<string, any>} variables
 * @param {string} operation
 * @param {string} path
 * @param {any} operand
 * @returns {Record<string, any>}
 */
function defaultMutateVariable(variables, operation, path, operand) {
  const clonedVariables = JSON.parse(JSON.stringify(variables));

  if (operation === 'set') {
    writeVariableWithTuple(clonedVariables, path, operand);
  } else if (operation === 'delete') {
    unsetNestedProperty(clonedVariables, normalizeVariablePath(path));
  } else if (operation === 'add') {
    const current = defaultGetVariable(clonedVariables, path, undefined, true);
    if (current == null) {
      writeVariableWithTuple(clonedVariables, path, operand);
    } else if (typeof current === 'number') {
      const numericOperand = Number(operand);
      if (!Number.isNaN(numericOperand)) {
        writeVariableWithTuple(clonedVariables, path, current + numericOperand);
      } else {
        writeVariableWithTuple(clonedVariables, path, String(current) + String(operand));
      }
    } else if (Array.isArray(current)) {
      current.push(operand);
    } else {
      writeVariableWithTuple(clonedVariables, path, String(current) + String(operand));
    }
  } else if (['sub', 'mul', 'div', 'mod'].includes(operation)) {
    const currentNumber = Number(defaultGetVariable(clonedVariables, path, 0));
    const numericOperand = Number(operand);
    if (!Number.isNaN(numericOperand)) {
      let nextValue = Number.isNaN(currentNumber) ? 0 : currentNumber;
      switch (operation) {
        case 'sub':
          nextValue -= numericOperand;
          break;
        case 'mul':
          nextValue *= numericOperand;
          break;
        case 'div':
          nextValue = numericOperand === 0 ? nextValue : nextValue / numericOperand;
          break;
        case 'mod':
          nextValue = numericOperand === 0 ? nextValue : nextValue % numericOperand;
          break;
        default:
          break;
      }
      writeVariableWithTuple(clonedVariables, path, nextValue);
    }
  } else if (operation === 'push' || operation === 'insert') {
    const targetArray = defaultGetVariable(clonedVariables, path, undefined, true);
    if (Array.isArray(targetArray)) {
      targetArray.push(operand);
    }
  } else if (operation === 'remove') {
    const targetArray = defaultGetVariable(clonedVariables, path, undefined, true);
    if (Array.isArray(targetArray)) {
      const matchIndex = targetArray.indexOf(operand);
      if (matchIndex > -1) {
        targetArray.splice(matchIndex, 1);
      }
    }
  }

  return clonedVariables;
}

/**
 * Resolves semantic or legacy dependency bindings into a single normalized table.
 *
 * @param {Record<string, any>} [rawDependencies={}]
 * @returns {Record<string, any>}
 */
function resolveAssemblerDependencies(rawDependencies = {}) {
  const deps = rawDependencies && typeof rawDependencies === 'object' ? rawDependencies : {};

  const getRegexEngineMode = deps.getRegexEngineMode
    || deps.Co
    || (() => 'official-local');

  const defaultRegexProcessor = createRegexProcessing({
    get readCardRuntimeEngineMode() {
      return getRegexEngineMode;
    },
  });

  return {
    getRegexEngineMode,
    processRegex: deps.processRegex || deps.gd || defaultRegexProcessor.processRegex,
    extractRegexScripts: deps.extractRegexScripts || deps.Zu || defaultMacroHelpers.extractRegexScripts,
    resolveCharacterName: deps.resolveCharacterName || deps.Vu || defaultMacroHelpers.resolveCharacterName,
    resolvePromptOverride: deps.resolvePromptOverride || deps.Ku || defaultMacroHelpers.resolvePromptOverride,
    expandBasicMacros: deps.expandBasicMacros || deps.Ju || defaultMacroHelpers.expandBasicMacros,
    expandRandomMacros: deps.expandRandomMacros || deps.Xu || defaultMacroHelpers.expandRandomMacros,
    getVariable: deps.getVariable || deps.Uu || defaultGetVariable,
    mutateVariable: deps.mutateVariable || deps.Gu || defaultMutateVariable,
    filterRpgDatabaseByActiveEntries: deps.filterRpgDatabaseByActiveEntries || deps.el || defaultTableHelpers.filterRpgDatabaseByActiveEntries,
    formatRpgHybridTable: deps.formatRpgHybridTable || deps.Xs || defaultTableHelpers.formatRpgHybridTable,
    createRpgRowSnapshot: deps.createRpgRowSnapshot || deps.Qs || defaultTableHelpers.createRpgRowSnapshot,
    buildMythicPrompt: deps.buildMythicPrompt || deps.Zs || defaultTableHelpers.buildMythicPrompt,
    defaultMythicSystemPrompt: deps.defaultMythicSystemPrompt ?? deps.Js ?? defaultTableHelpers.defaultMythicSystemPrompt,
    normalizePromptVariableScopes: deps.normalizePromptVariableScopes
      || deps.__stsNormalizePromptVariableScopes
      || normalizePromptVariableScopes,
    readGlobalVariables: deps.readGlobalVariables
      || deps.__stsReadGlobalVariables
      || readGlobalVariables,
    buildSmartStateBlock: deps.buildSmartStateBlock
      || deps.__stsBuildSmartStateBlock
      || buildSmartStateBlock,
    loadOptionalModule: deps.loadOptionalModule || deps.nc || (async loader => loader()),
    runIsolatedScript: deps.runIsolatedScript
      || deps.Lu
      || (() => Promise.reject(new Error('Isolated card scripts require a browser environment.'))),
    logSystemMessage: deps.logSystemMessage || deps.qu || (() => {}),
  };
}

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
    const { default: ejsCode } = await import('../../../ejs.min-Cthf3_XD.js');
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
async function renderEjsTemplate(template, variables, card, externalLorebooks, depth, deps) {
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
async function expandReferencedLorebookLines(content, variables, card, externalLorebooks, deps) {
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

/**
 * Partitions active World Info entries into `before` and `after` groups sorted
 * by `insertion_order`.
 *
 * @param {Record<string, any>} card
 * @param {Record<string, boolean> | undefined} worldInfoState
 * @param {Array<Record<string, any>> | undefined} activeEntries
 * @param {Record<string, string> | undefined} worldInfoPlacement
 * @returns {{ before: Array<Record<string, any>>, after: Array<Record<string, any>> }}
 */
function partitionWorldInfoEntries(card, worldInfoState, activeEntries, worldInfoPlacement) {
  const entries = activeEntries
    ? [...activeEntries]
    : [...(card.char_book?.entries || [])].filter(entry => {
        if (!entry.content || !entry.content.trim() || !entry.uid) {
          return false;
        }
        const defaultEnabled = entry.enabled !== false;
        return worldInfoState ? (worldInfoState[entry.uid] ?? defaultEnabled) : defaultEnabled;
      });

  entries.sort((left, right) => (left.insertion_order || 0) - (right.insertion_order || 0));

  const before = [];
  const after = [];
  entries.forEach(entry => {
    const placementOverride = entry.uid && worldInfoPlacement ? worldInfoPlacement[entry.uid] : undefined;
    if (placementOverride === 'before') {
      before.push(entry);
    } else if (placementOverride === 'after') {
      after.push(entry);
    } else if ((entry.position || '').toLowerCase().includes('after')) {
      after.push(entry);
    } else {
      before.push(entry);
    }
  });

  return { before, after };
}

/**
 * Finds the first message index in `historyMessages` that belongs to the current
 * unsummarized page after `summarizedModelTurns` turns have been summarized.
 *
 * @param {Array<Record<string, any>>} historyMessages
 * @param {number} summarizedModelTurns
 * @returns {number}
 */
function findCurrentPageStartIndex(historyMessages, summarizedModelTurns) {
  if (summarizedModelTurns <= 0) {
    return 0;
  }
  let countedTurns = 0;
  for (let index = 0; index < historyMessages.length; index += 1) {
    if (index === 0 || historyMessages[index].role === 'model') {
      countedTurns += 1;
      if (countedTurns === summarizedModelTurns) {
        return index + 1;
      }
    }
  }
  return historyMessages.length;
}

/**
 * Selects the preferred raw or rendered content for a conversation message.
 *
 * @param {Record<string, any>} message
 * @param {boolean} [preferOriginalRaw=false]
 * @returns {string}
 */
function selectMessageSourceContent(message, preferOriginalRaw = false) {
  if (preferOriginalRaw && message.originalRawContent) {
    return message.originalRawContent;
  }
  if (message.content && message.content.trim()) {
    return message.content;
  }
  return message.originalRawContent || '';
}

/**
 * Parses a macro variable value string into a number when numeric, or keeps it
 * as a trimmed string otherwise.
 *
 * @param {string} rawValue
 * @returns {{ trimmedValue: string, parsedValue: string | number }}
 */
function parseMacroVariableValue(rawValue) {
  const trimmedValue = rawValue.trim();
  const numericValue = Number(trimmedValue);
  const parsedValue = trimmedValue === '' || Number.isNaN(numericValue) ? trimmedValue : numericValue;
  return { trimmedValue, parsedValue };
}

/**
 * Yields briefly to the event loop to keep long prompt builds responsive.
 *
 * @returns {Promise<void>}
 */
function yieldMacrotask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Builds the ordered list of base prompt sections from a character card and
 * preset configuration, injecting card-level system prompt, depth prompt, and
 * post-history instructions when not already referenced by preset macros.
 *
 * @param {Record<string, any>} card
 * @param {Record<string, any>} preset
 * @param {Record<string, any>} [dependencies]
 * @returns {{ baseSections: Array<{ id: string, name: string, content: string, role: string }> }}
 */
export function buildBaseSections(card, preset, dependencies) {
  const resolvedDeps = dependencies && typeof dependencies === 'object'
    && ('resolvePromptOverride' in dependencies || 'Ku' in dependencies)
    ? resolveAssemblerDependencies(dependencies)
    : resolveAssemblerDependencies();

  let baseSections = (preset.prompts || [])
    .filter(promptItem => promptItem.enabled === true && promptItem.content)
    .map((promptItem, index) => ({
      id: promptItem.identifier || `prompt_${index}`,
      name: promptItem.name || 'Untitled Prompt',
      content: promptItem.content,
      role: promptItem.role || 'system',
    }));

  const resolvedSystemPrompt = resolvedDeps.resolvePromptOverride(
    card.system_prompt,
    preset.system_prompt,
  );
  const resolvedPostHistoryInstructions = resolvedDeps.resolvePromptOverride(
    card.post_history_instructions,
    preset.post_history_instructions,
  );

  const hasSystemPromptPlaceholder = baseSections.some(
    section => /{{\s*system_prompt\s*}}/i.test(section.content),
  );
  const hasPostHistoryPlaceholder = baseSections.some(
    section => /{{\s*post_history_instructions\s*}}/i.test(section.content),
  );

  baseSections = baseSections.map(section => ({
    ...section,
    content: section.content
      .replace(/{{\s*system_prompt\s*}}/gi, resolvedSystemPrompt)
      .replace(/{{\s*post_history_instructions\s*}}/gi, resolvedPostHistoryInstructions),
  }));

  if (resolvedSystemPrompt.trim() && !hasSystemPromptPlaceholder) {
    baseSections.unshift({
      id: 'character_system_prompt',
      name: 'Character System Prompt',
      content: resolvedSystemPrompt,
      role: 'system',
    });
  }

  const depthPrompt = card.extensions?.depth_prompt;
  if (depthPrompt && typeof depthPrompt.prompt === 'string' && depthPrompt.prompt.trim()) {
    const depthSuffix = Number.isFinite(Number(depthPrompt.depth))
      ? ` (depth ${depthPrompt.depth})`
      : '';
    baseSections.push({
      id: 'character_depth_prompt',
      name: `Character Depth Prompt${depthSuffix}`,
      content: depthPrompt.prompt,
      role: VALID_DEPTH_PROMPT_ROLES.includes(depthPrompt.role) ? depthPrompt.role : 'system',
    });
  }

  if (resolvedPostHistoryInstructions.trim() && !hasPostHistoryPlaceholder) {
    baseSections.push({
      id: 'character_post_history_instructions',
      name: 'Character Post-History Instructions',
      content: resolvedPostHistoryInstructions,
      role: 'system',
    });
  }

  return { baseSections };
}

/**
 * Assembles the final prompt text, structured sections, RPG snapshot, and
 * updated chat/global variable scopes.
 *
 * @param {Array<{ id: string, name: string, content: string, role: string }>} baseSections
 * @param {Array<Record<string, any>>} messages
 * @param {string} authorNote
 * @param {Record<string, any>} card
 * @param {string[]} longTermSummaries
 * @param {number} summaryChunkSize
 * @param {Record<string, any>} variables
 * @param {string} legacyVisualState
 * @param {Array<Record<string, any>>} [externalLorebooks=[]]
 * @param {string} [contextMode='standard']
 * @param {string} [userName='User']
 * @param {Record<string, boolean>} [worldInfoState]
 * @param {Array<Record<string, any>>} [activeEntries]
 * @param {Record<string, string>} [worldInfoPlacement]
 * @param {Record<string, any>} [preset]
 * @param {boolean} [disableInteractiveMode]
 * @param {string} [userPersonaDescription='']
 * @param {Record<string, any>} [dependencies]
 * @returns {Promise<{
 *   fullPrompt: string,
 *   structuredPrompt: Array<Record<string, any>>,
 *   rpgSnapshot: any,
 *   updatedVariables: Record<string, any>,
 *   updatedGlobalVariables: Record<string, any>,
 * }>}
 */
export async function assemblePrompt(
  baseSections,
  messages,
  authorNote,
  card,
  longTermSummaries,
  summaryChunkSize,
  variables,
  legacyVisualState,
  externalLorebooks = [],
  contextMode = 'standard',
  userName = 'User',
  worldInfoState,
  activeEntries,
  worldInfoPlacement,
  preset,
  disableInteractiveMode,
  userPersonaDescription = '',
  dependencies,
) {
  const deps = resolveAssemblerDependencies(dependencies);

  if (messages.length === 0) {
    throw new Error('Không thể tạo phản hồi cho một lịch sử trống.');
  }

  deps.logSystemMessage(
    'log',
    'system',
    `[PROMPT-DEBUG] Start constructing prompt. Variable count: ${Object.keys(variables).length}`,
  );

  let rpgSnapshot;
  const historyMessages = messages.slice(0, -1);
  const currentUserInput = messages[messages.length - 1].content;
  const characterName = deps.resolveCharacterName(card);
  const resolvedSystemPrompt = deps.resolvePromptOverride(card.system_prompt, preset?.system_prompt);
  const resolvedPostHistoryInstructions = deps.resolvePromptOverride(
    card.post_history_instructions,
    preset?.post_history_instructions,
  );
  const allDefinitions = [
    card.description,
    card.personality,
    card.scenario,
    card.mes_example,
  ].filter(Boolean).join('\n\n');

  const expandMacros = text => deps.expandBasicMacros(text, {
    card,
    userName,
    userPersonaDescription,
    userInput: currentUserInput,
    messages,
    systemPrompt: resolvedSystemPrompt,
    postHistoryInstructions: resolvedPostHistoryInstructions,
  });

  const { before: beforeEntries, after: afterEntries } = partitionWorldInfoEntries(
    card,
    worldInfoState,
    activeEntries,
    worldInfoPlacement,
  );

  const worldInfoFormat = preset?.wi_format || '[{{keys}}: {{content}}]';
  let rpgHybridTable = '';
  if (card.rpg_data) {
    const combinedEntries = [...beforeEntries, ...afterEntries];
    const filteredRpgData = deps.filterRpgDatabaseByActiveEntries(card.rpg_data, combinedEntries);
    rpgHybridTable = deps.formatRpgHybridTable(filteredRpgData);
    rpgSnapshot = deps.createRpgRowSnapshot(filteredRpgData);
  }

  const nonMythicBeforeEntries = beforeEntries.filter(
    entry => !String(entry.uid || '').startsWith('mythic_'),
  );
  const nonMythicAfterEntries = afterEntries.filter(
    entry => !String(entry.uid || '').startsWith('mythic_'),
  );

  const formatWorldInfoEntries = async entries => {
    const formattedEntries = [];
    let processedCount = 0;
    for (const entry of entries) {
      const templateVariables = { ...variables, user: userName };
      let renderedContent = await renderEjsTemplate(
        entry.content,
        templateVariables,
        card,
        externalLorebooks,
        0,
        deps,
      );
      renderedContent = await expandReferencedLorebookLines(
        renderedContent,
        variables,
        card,
        externalLorebooks,
        deps,
      );

      if (renderedContent && !renderedContent.trim() && !renderedContent.includes('[SYSTEM ERROR')) {
        processedCount += 1;
        if (processedCount % 4 === 0) await yieldMacrotask();
        continue;
      }
      if (!renderedContent) {
        processedCount += 1;
        if (processedCount % 4 === 0) await yieldMacrotask();
        continue;
      }

      renderedContent = expandMacros(renderedContent);
      const formattedEntry = worldInfoFormat
        .replace(/{{keys}}/g, (entry.keys || []).join(', '))
        .replace(/{{content}}/g, renderedContent.trim());
      formattedEntries.push(formattedEntry);

      processedCount += 1;
      if (processedCount % 4 === 0) await yieldMacrotask();
    }
    return formattedEntries;
  };

  const worldInfoBeforeItems = await formatWorldInfoEntries(nonMythicBeforeEntries);
  const worldInfoAfterItems = await formatWorldInfoEntries(nonMythicAfterEntries);
  const allWorldInfoItems = [...worldInfoBeforeItems, ...worldInfoAfterItems];
  const worldInfoBeforeText = worldInfoBeforeItems.join('\n');
  const worldInfoAfterText = worldInfoAfterItems.join('\n');
  const allWorldInfoText = allWorldInfoItems.join('\n');

  const normalizedScopes = deps.normalizePromptVariableScopes(
    variables,
    deps.readGlobalVariables(),
  );
  let chatVariables = normalizedScopes.chat;
  let globalVariables = normalizedScopes.global;

  const smartStatePayload = deps.buildSmartStateBlock({
    variables: chatVariables,
    messages,
    card,
    legacyVisualState,
  });
  const mythicDatabase = smartStatePayload.mythicDatabase;
  const visualState = smartStatePayload.visualState;
  const smartStateBlock = smartStatePayload.smartStateBlock;
  const logicStore = smartStatePayload.logicStore;

  let mythicInstructionBlock = '';
  if (card.rpg_data?.settings?.executionMode === 'integrated' && card.rpg_data) {
    const filteredRpgData = deps.filterRpgDatabaseByActiveEntries(card.rpg_data, activeEntries || []);
    const combinedLorebookText = [...allWorldInfoItems].join('\n');
    mythicInstructionBlock = deps.buildMythicPrompt(
      card.rpg_data.settings.customSystemPrompt || deps.defaultMythicSystemPrompt,
      filteredRpgData,
      '',
      combinedLorebookText,
    );
  }

  const longTermSummaryText = longTermSummaries.length > 0
    ? `${longTermSummaries.join('\n\n---\n\n')}`
    : 'Đây là khởi đầu của cuộc trò chuyện.';

  const pageStartIndex = findCurrentPageStartIndex(
    historyMessages,
    longTermSummaries.length * summaryChunkSize,
  );
  let currentPageMessages = historyMessages.slice(pageStartIndex);
  if (contextMode === 'ai_only') {
    currentPageMessages = currentPageMessages.filter(
      message => message.role === 'model' || message.role === 'system',
    );
  }

  const useOfficialPromptRegex = deps.getRegexEngineMode() === 'official-local' && !disableInteractiveMode;
  const regexMacros = {
    user: userName,
    char: characterName,
    bot: characterName,
    first_mes: card.first_mes || '',
    persona: userPersonaDescription,
    persona_description: userPersonaDescription,
  };
  const promptRegexCache = new WeakMap();

  const applyPromptRegex = (message, sourceText) => {
    if (!useOfficialPromptRegex) {
      return sourceText;
    }
    const messageIndex = historyMessages.indexOf(message);
    const depth = messageIndex >= 0
      ? Math.max(0, historyMessages.length - 1 - messageIndex)
      : undefined;
    const cachedResult = promptRegexCache.get(message);
    if (cachedResult && cachedResult.source === sourceText && cachedResult.depth === depth) {
      return cachedResult.value;
    }
    const placement = message.role === 'user' ? [1] : [2];
    const processed = deps.processRegex(
      sourceText,
      card.extensions?.regex_scripts || [],
      placement,
      {
        engineMode: 'official-local',
        isMarkdown: false,
        isPrompt: true,
        depth,
        ...deps.extractRegexScripts(undefined, preset),
        macros: regexMacros,
      },
    ).displayContent;
    promptRegexCache.set(message, { source: sourceText, depth, value: processed });
    return processed;
  };

  const currentPageLines = [];
  for (let messageIndex = 0; messageIndex < currentPageMessages.length; messageIndex += 1) {
    const message = currentPageMessages[messageIndex];
    const rawContent = selectMessageSourceContent(
      message,
      useOfficialPromptRegex || Boolean(disableInteractiveMode),
    );
    const regexProcessedContent = applyPromptRegex(message, rawContent);
    const storyContent = extractStoryContent(regexProcessedContent);
    const expandedContent = expandMacros(storyContent);

    let formattedLine = null;
    if (expandedContent.trim()) {
      if (message.role === 'user') {
        formattedLine = `${userName}: ${expandedContent}`;
      } else if (message.role === 'system') {
        formattedLine = `System: ${expandedContent}`;
      } else {
        formattedLine = `${characterName}: ${expandedContent}`;
      }
    }

    if (formattedLine) {
      currentPageLines.push(formattedLine);
    }
    if (messageIndex > 0 && messageIndex % 4 === 0) {
      await yieldMacrotask();
    }
  }

  if (currentPageLines.length === 0) {
    currentPageLines.push(
      contextMode === 'ai_only'
        ? 'Bắt đầu phần tự thuật mới.'
        : 'Bắt đầu trang hội thoại mới.',
    );
  }
  const currentPageHistoryText = currentPageLines.join('\n');

  const lastTurnLines = [];
  let lastModelIndex = -1;
  for (let index = historyMessages.length - 1; index >= 0; index -= 1) {
    if (historyMessages[index].role === 'model') {
      lastModelIndex = index;
      break;
    }
  }

  if (lastModelIndex !== -1) {
    let turnStartIndex = lastModelIndex;
    for (let index = lastModelIndex - 1; index >= 0; index -= 1) {
      const role = historyMessages[index].role;
      if (role === 'user') {
        turnStartIndex = index;
        if (index > 0 && historyMessages[index - 1].role === 'model') {
          break;
        }
      } else if (role === 'model') {
        break;
      }
    }

    historyMessages.slice(turnStartIndex, lastModelIndex + 1).forEach(message => {
      const rawContent = selectMessageSourceContent(message, true);
      const expandedContent = expandMacros(applyPromptRegex(message, rawContent));
      if (expandedContent.trim()) {
        const speakerName = message.role === 'user' ? userName : characterName;
        lastTurnLines.push(`${speakerName}: ${expandedContent}`);
      }
    });
  } else {
    lastTurnLines.push('Chưa có lượt nào gần đây.');
  }
  const lastTurnText = lastTurnLines.join('\n');

  const structuredPrompt = [];
  for (const section of baseSections) {
    let subSections;
    let sectionContent = section.content;
    const appendSubSections = items => {
      if (!subSections) {
        subSections = [];
      }
      subSections.push(...items);
    };

    if (sectionContent.includes('{{worldInfo_before}}')) {
      appendSubSections(worldInfoBeforeItems);
    }
    if (sectionContent.includes('{{worldInfo_after}}')) {
      appendSubSections(worldInfoAfterItems);
    }
    if (sectionContent.includes('{{worldInfo}}')) {
      appendSubSections(allWorldInfoItems);
    }
    if (sectionContent.includes('{{long_term_summary}}')) {
      appendSubSections(longTermSummaries.length > 0 ? longTermSummaries : ['Chưa có tóm tắt dài hạn.']);
    }
    if (sectionContent.includes('{{current_page_history}}')) {
      appendSubSections(currentPageLines);
    }
    if (sectionContent.includes('{{last_turn}}')) {
      appendSubSections(lastTurnLines);
    }

    sectionContent = expandMacros(sectionContent);
    sectionContent = sectionContent.replace(/{{(\/\/|#).*?}}/gi, '');
    sectionContent = sectionContent.replace(/\s*{{trim}}\s*/gi, '');
    sectionContent = deps.expandRandomMacros(sectionContent);

    sectionContent = sectionContent.replace(
      /{{addvar::([^:]+)::([\s\S]*?)}}/gi,
      (_match, rawKey, rawValue) => {
        const variableKey = rawKey.trim();
        const { trimmedValue, parsedValue } = parseMacroVariableValue(rawValue);
        deps.logSystemMessage(
          'log',
          'variable',
          `[PROMPT-DEBUG] Found addvar: Key="${variableKey}", Val="${trimmedValue}" (Parsed: ${parsedValue})`,
        );
        chatVariables = deps.mutateVariable(chatVariables, 'add', variableKey, parsedValue);
        return '';
      },
    );

    sectionContent = sectionContent.replace(
      /{{setglobalvar::([^:]+)::([\s\S]*?)}}/gi,
      (_match, rawKey, rawValue) => {
        const variableKey = rawKey.trim();
        const { parsedValue } = parseMacroVariableValue(rawValue);
        globalVariables = deps.mutateVariable(globalVariables, 'set', variableKey, parsedValue);
        return '';
      },
    );

    sectionContent = sectionContent.replace(
      /{{setvar::([^:]+)::([\s\S]*?)}}/gi,
      (_match, rawKey, rawValue) => {
        const variableKey = rawKey.trim();
        const { trimmedValue, parsedValue } = parseMacroVariableValue(rawValue);
        deps.logSystemMessage(
          'log',
          'variable',
          `[PROMPT-DEBUG] Found setvar: Key="${variableKey}", Val="${trimmedValue}"`,
        );
        chatVariables = deps.mutateVariable(chatVariables, 'set', variableKey, parsedValue);
        return '';
      },
    );

    sectionContent = sectionContent.replace(
      /{{getvar::([^}]+)}}/gi,
      (_match, rawKey) => {
        const variableKey = rawKey.trim();
        const value = deps.getVariable(chatVariables, variableKey);
        deps.logSystemMessage(
          'log',
          'variable',
          `[PROMPT-DEBUG] Executing getvar: "${variableKey}" -> Result: ${value}`,
        );
        return value === undefined ? '' : String(value);
      },
    );

    sectionContent = sectionContent.replace(
      /{{getglobalvar::([^}]+)}}/gi,
      (_match, rawKey) => {
        const variableKey = rawKey.trim();
        const value = deps.getVariable(globalVariables, variableKey);
        return value === undefined ? '' : String(value);
      },
    );

    sectionContent = sectionContent
      .replace(/{{worldInfo_before}}/g, worldInfoBeforeText)
      .replace(/{{worldInfo_after}}/g, worldInfoAfterText)
      .replace(/{{worldInfo}}/g, allWorldInfoText)
      .replace(/{{char}}/g, card.name || '')
      .replace(/{{user}}/g, userName)
      .replace(/<user>/g, userName)
      .replace(/{{smart_state_block}}/g, smartStateBlock)
      .replace(/{{current_variables_state}}/g, logicStore)
      .replace(/{{mythic_database}}/g, mythicDatabase)
      .replace(/{{rpg_hybrid_table}}/g, rpgHybridTable)
      .replace(/{{mythic_instruction_block}}/g, mythicInstructionBlock)
      .replace(/{{last_state}}/g, visualState)
      .replace(/{{author_note}}/g, authorNote || '')
      .replace(/{{long_term_summary}}/g, longTermSummaryText)
      .replace(/{{current_page_history}}/g, currentPageHistoryText)
      .replace(/{{last_turn}}/g, lastTurnText)
      .replace(/{{user_input}}/g, currentUserInput)
      .replace(/{{prompt}}/g, currentUserInput)
      .replace(/{{get_message_variable::([^}]+)}}/gi, (_match, rawKey) => {
        const variableKey = rawKey.trim();
        const value = deps.getVariable(chatVariables, variableKey);
        if (value === undefined) {
          return '';
        }
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      })
      .replace(/{{all_definitions}}/g, allDefinitions)
      .replace(/{{description}}/g, card.description || '')
      .replace(/{{personality}}/g, card.personality || '')
      .replace(/{{scenario}}/g, card.scenario || '')
      .replace(/{{mes_example}}/g, card.mes_example || '');

    if (!disableInteractiveMode) {
      const templateVariables = { ...chatVariables, user: userName };
      sectionContent = await renderEjsTemplate(
        sectionContent,
        templateVariables,
        card,
        externalLorebooks,
        0,
        deps,
      );
      sectionContent = expandMacros(sectionContent);
    }

    sectionContent = sectionContent.trim();
    if (sectionContent) {
      structuredPrompt.push({
        ...section,
        content: sectionContent,
        subSections,
      });
    }
  }

  return {
    fullPrompt: structuredPrompt
      .map(section => section.content)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    structuredPrompt,
    rpgSnapshot,
    updatedVariables: chatVariables,
    updatedGlobalVariables: globalVariables,
  };
}

/**
 * Creates a prompt assembler bound to a shared dependency container (supporting
 * both semantic dependency names and legacy host bindings).
 *
 * @param {Record<string, any>} [dependencies={}]
 * @returns {{
 *   extractStoryContent: typeof extractStoryContent,
 *   buildBaseSections: (card: Record<string, any>, preset: Record<string, any>) => { baseSections: Array<Record<string, any>> },
 *   assemblePrompt: (...args: any[]) => Promise<Record<string, any>>,
 * }}
 */
export function createPromptAssembler(dependencies = {}) {
  const boundDeps = resolveAssemblerDependencies(dependencies);

  return {
    extractStoryContent,
    buildBaseSections(card, preset) {
      return buildBaseSections(card, preset, boundDeps);
    },
    assemblePrompt(
      baseSections,
      messages,
      authorNote,
      card,
      longTermSummaries,
      summaryChunkSize,
      variables,
      legacyVisualState,
      externalLorebooks = [],
      contextMode = 'standard',
      userName = 'User',
      worldInfoState,
      activeEntries,
      worldInfoPlacement,
      preset,
      disableInteractiveMode,
      userPersonaDescription = '',
    ) {
      return assemblePrompt(
        baseSections,
        messages,
        authorNote,
        card,
        longTermSummaries,
        summaryChunkSize,
        variables,
        legacyVisualState,
        externalLorebooks,
        contextMode,
        userName,
        worldInfoState,
        activeEntries,
        worldInfoPlacement,
        preset,
        disableInteractiveMode,
        userPersonaDescription,
        boundDeps,
      );
    },
  };
}
