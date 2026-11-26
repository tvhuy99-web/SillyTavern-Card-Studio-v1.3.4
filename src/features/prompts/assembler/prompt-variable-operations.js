/**
 * Variable path helpers, default getter/mutator, and prompt variable macro
 * evaluation (`addvar`, `setglobalvar`, `setvar`, `getvar`, `getglobalvar`).
 */

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
export function defaultGetVariable(variables, path, fallback = undefined, unwrapTuple = true) {
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
export function defaultMutateVariable(variables, operation, path, operand) {
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
 * Evaluates prompt variable read/write macros in canonical order and returns
 * the updated section content and variable scopes.
 *
 * @param {string} sectionContent
 * @param {Record<string, any>} chatVariables
 * @param {Record<string, any>} globalVariables
 * @param {Record<string, any>} deps
 * @returns {{
 *   content: string,
 *   chatVariables: Record<string, any>,
 *   globalVariables: Record<string, any>,
 * }}
 */
export function applyPromptVariableMacros(sectionContent, chatVariables, globalVariables, deps) {
  let nextContent = sectionContent;

  nextContent = nextContent.replace(
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

  nextContent = nextContent.replace(
    /{{setglobalvar::([^:]+)::([\s\S]*?)}}/gi,
    (_match, rawKey, rawValue) => {
      const variableKey = rawKey.trim();
      const { parsedValue } = parseMacroVariableValue(rawValue);
      globalVariables = deps.mutateVariable(globalVariables, 'set', variableKey, parsedValue);
      return '';
    },
  );

  nextContent = nextContent.replace(
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

  nextContent = nextContent.replace(
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

  nextContent = nextContent.replace(
    /{{getglobalvar::([^}]+)}}/gi,
    (_match, rawKey) => {
      const variableKey = rawKey.trim();
      const value = deps.getVariable(globalVariables, variableKey);
      return value === undefined ? '' : String(value);
    },
  );

  return {
    content: nextContent,
    chatVariables: chatVariables,
    globalVariables: globalVariables,
  };
}
