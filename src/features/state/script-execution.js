// Recovered from the application host. One owner; dependency getters preserve late binding.

const DEFAULT_MAX_BYTES = 2000000;
const DEFAULT_TIMEOUT_MS = 5000;

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function getUtf8ByteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

function normalizeVariablePath(rawPath) {
  if (!rawPath) {
    return '';
  }
  return rawPath
    .replace(/^stat_data\./, '')
    .replace(/^variables\./, '')
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1');
}

function isDescribedTuple(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[1] === 'string';
}

function buildSandboxIframeHtml(channelId, maxBytes, workerSource, serializedPayload) {
  return [
    '<!doctype html><meta charset="utf-8"><script>',
    '(function () {',
    `  const channel = ${serializeForInlineScript(channelId)};`,
    `  const maxBytes = ${maxBytes};`,
    '  let worker = null;',
    "  let workerUrl = '';",
    '  const finish = function (ok, value) {',
    '    try { if (worker) worker.terminate(); } catch (_) {}',
    '    try { if (workerUrl) URL.revokeObjectURL(workerUrl); } catch (_) {}',
    '    let result = value;',
    '    if (ok) {',
    '      try {',
    '        const serialized = JSON.stringify(value === undefined ? null : value);',
    '        if (new TextEncoder().encode(serialized).byteLength > maxBytes) {',
    '          ok = false;',
    "          result = 'Isolated script output exceeds the size limit.';",
    '        }',
    '      } catch (error) {',
    '        ok = false;',
    '        result = error && error.message ? error.message : String(error);',
    '      }',
    '    }',
    "    parent.postMessage({ __stIsolatedWorker: true, channel: channel, ok: ok, value: result }, '*');",
    '  };',
    '  try {',
    `    workerUrl = URL.createObjectURL(new Blob([${serializeForInlineScript(workerSource)}], { type: 'text/javascript' }));`,
    '    worker = new Worker(workerUrl);',
    '    worker.onmessage = function (event) { finish(true, event.data); };',
    "    worker.onerror = function (event) { finish(false, event.message || 'Isolated worker failed.'); };",
    `    worker.postMessage(${serializeForInlineScript(JSON.parse(serializedPayload))});`,
    '  } catch (error) {',
    '    finish(false, error && error.message ? error.message : String(error));',
    '  }',
    '})();</script>',
  ].join('\n');
}

function runIsolatedScript(workerSource, inputPayload, options = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return Promise.reject(new Error('Isolated card scripts require a browser environment.'));
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const serializedPayload = JSON.stringify(inputPayload ?? null);
  if (getUtf8ByteLength(serializedPayload) > maxBytes) {
    return Promise.reject(new Error(`Isolated script input exceeds ${maxBytes} bytes.`));
  }

  const channelId = `st-worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.srcdoc = buildSandboxIframeHtml(channelId, maxBytes, workerSource, serializedPayload);

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanupAndSettle = callback => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      iframe.remove();
      callback();
    };

    const handleMessage = event => {
      if (
        event.source !== iframe.contentWindow
        || !event.data?.__stIsolatedWorker
        || event.data.channel !== channelId
      ) {
        return;
      }
      if (event.data.ok) {
        cleanupAndSettle(() => resolve(event.data.value));
      } else {
        cleanupAndSettle(() => reject(new Error(String(event.data.value || 'Isolated worker failed.'))));
      }
    };

    const timeoutId = window.setTimeout(
      () => cleanupAndSettle(() => reject(new Error('Isolated card script exceeded its execution timeout.'))),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    window.addEventListener('message', handleMessage);
    (document.body || document.documentElement).appendChild(iframe);
  });
}

function extractUpdateVariableScript(responseText) {
  const tagPattern = /<UpdateVariable(?:variable)?>([\s\S]*?)<\/UpdateVariable(?:variable)?>/i;
  const match = responseText.match(tagPattern);
  if (!match || !match[1]) {
    return { script: '', cleanText: responseText };
  }

  const strippedBlock = match[1]
    .replace(/<Analysis>[\s\S]*?<\/Analysis>/gi, '')
    .replace(/<Thinking>[\s\S]*?<\/Thinking>/gi, '')
    .replace(/<Comment>[\s\S]*?<\/Comment>/gi, '')
    .trim();

  const filteredLines = strippedBlock
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return Boolean(
        trimmed
        && !trimmed.startsWith('<')
        && !trimmed.startsWith('```')
        && !/^[A-Za-z0-9_]+:\s*$/i.test(trimmed),
      );
    })
    .join('\n')
    .trim();

  const normalizedScript = filteredLines
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  return {
    script: normalizedScript,
    cleanText: responseText.replace(tagPattern, '').trim(),
  };
}

function buildVariableWorkerSource(userScript, lodashSource) {
  const sendChannelName = `__send_${Math.random().toString(36).slice(2)}`;
  return [
    lodashSource,
    '',
    "const __blocked = function () { throw new Error('Network and persistent storage are unavailable in isolated card scripts.'); };",
    "['fetch','XMLHttpRequest','WebSocket','WebSocketStream','WebTransport','EventSource','Worker','SharedWorker','BroadcastChannel','importScripts','indexedDB','caches'].forEach(function (name) {",
    '  try { Object.defineProperty(self, name, { value: __blocked, writable: false, configurable: false }); } catch (_) { try { self[name] = __blocked; } catch (_) {} }',
    '});',
    "try { if (self.navigator) Object.defineProperty(self.navigator, 'sendBeacon', { value: __blocked, writable: false, configurable: false }); } catch (_) {}",
    '',
    `const ${sendChannelName} = self.postMessage.bind(self);`,
    "try { Object.defineProperty(self, 'postMessage', { value: __blocked, writable: false, configurable: false }); } catch (_) {}",
    'self.onmessage = async function (__event) {',
    '  const variables = JSON.parse(JSON.stringify((__event.data && __event.data.variables) || {}));',
    '  const stat_data = variables;',
    '  const __logs = [];',
    '  const __base = self._;',
    "  const __tuple = function (value) { return Array.isArray(value) && value.length === 2 && typeof value[1] === 'string'; };",
    "  const __path = function (path) { return String(path || '').replace(/^stat_data\\./, '').replace(/^variables\\./, '').replace(/\\[\"([^\"]+)\"\\]/g, '.$1').replace(/\\['([^']+)'\\]/g, '.$1').replace(/\\[(\\d+)\\]/g, '.$1'); };",
    '  const __get = function (path, fallback, unwrap) {',
    '    const value = __base.get(variables, __path(path));',
    '    const actual = unwrap !== false && __tuple(value) ? value[0] : value;',
    '    return actual === undefined ? fallback : actual;',
    '  };',
    '  const __set = function (path, value) {',
    '    const clean = __path(path);',
    '    const current = __base.get(variables, clean);',
    '    __base.set(variables, clean, __tuple(current) ? [value, current[1]] : value);',
    '  };',
    '  const __math = function (path, value, operation) {',
    '    const current = Number(__get(path, 0));',
    '    const operand = Number(value);',
    '    if (!Number.isFinite(operand)) return;',
    '    let result = Number.isFinite(current) ? current : 0;',
    "    if (operation === 'sub') result -= operand;",
    "    if (operation === 'mul') result *= operand;",
    "    if (operation === 'div' && operand !== 0) result /= operand;",
    "    if (operation === 'mod' && operand !== 0) result %= operand;",
    '    __set(path, result);',
    '  };',
    '  const __custom = {',
    '    get: function (path, fallback) { return __get(path, fallback); },',
    '    set: function (path, value) {',
    '      const args = Array.prototype.slice.call(arguments, 2);',
    '      const actual = args.length ? args[args.length - 1] : value;',
    '      __set(path, actual);',
    "      __logs.push('SET ' + path + ' = ' + JSON.stringify(actual));",
    '    },',
    '    add: function (path, value) {',
    '      const current = __get(path);',
    '      if (current === undefined || current === null) __set(path, value);',
    "      else if (typeof current === 'number' && Number.isFinite(Number(value))) __set(path, current + Number(value));",
    '      else if (Array.isArray(current)) current.push(value);',
    '      else __set(path, String(current) + String(value));',
    "      __logs.push('ADD ' + path + ' += ' + JSON.stringify(value));",
    '    },',
    "    sub: function (path, value) { __math(path, value, 'sub'); },",
    "    mul: function (path, value) { __math(path, value, 'mul'); },",
    "    div: function (path, value) { __math(path, value, 'div'); },",
    "    mod: function (path, value) { __math(path, value, 'mod'); },",
    '    insert: function (path, first, second) {',
    '      const target = __get(path);',
    '      if (Array.isArray(target)) {',
    "        if (second !== undefined && typeof first === 'number') target.splice(first, 0, second);",
    '        else target.push(second !== undefined ? second : first);',
    "      } else if (target && typeof target === 'object' && second !== undefined) target[first] = second;",
    '    },',
    '    remove: function (path, value) {',
    '      const target = __get(path);',
    '      if (Array.isArray(target)) {',
    '        const index = target.findIndex(function (item) { return __base.isEqual(item, value) || item === value; });',
    '        if (index >= 0) target.splice(index, 1);',
    "        else if (typeof value === 'number' && value >= 0 && value < target.length) target.splice(value, 1);",
    "      } else if (target && typeof target === 'object') delete target[value];",
    '    },',
    '    push: function (path, value) { const target = __get(path); if (Array.isArray(target)) target.push(value); },',
    '    assign: function (path) {',
    '      const args = Array.prototype.slice.call(arguments, 1);',
    "      if (args.length >= 2) __set(path + '.' + args[0], args[1]);",
    '      else if (args.length === 1) {',
    '        const target = __get(path);',
    '        if (Array.isArray(target)) {',
    "          if (target.length === 1 && target[0] === '$__META_EXTENSIBLE__$') target.pop();",
    '          target.push(args[0]);',
    '        }',
    '      }',
    '    },',
    "    log: function (message) { __logs.push('SCRIPT LOG: ' + String(message)); }",
    '  };',
    '  const _ = Object.assign({}, __base, __custom);',
    '  const console = { log: __custom.log, warn: __custom.log, error: __custom.log };',
    '  try {',
    `    await (async function () { ${userScript}`,
    ' }).call(undefined);',
    `    ${sendChannelName}({ ok: true, variables: variables, logs: __logs });`,
    '  } catch (error) {',
    `    ${sendChannelName}({ ok: false, error: error && error.message ? error.message : String(error), logs: __logs });`,
    '  }',
    '};',
  ].join('\n');
}

export function createScriptExecution(dependencies = {}) {
  const getVariable = (variables, path, fallback = undefined, unwrapTuple = true) => {
    const normalizedPath = normalizeVariablePath(path);
    const rawValue = dependencies.Pu.default.get(variables, normalizedPath);
    if (unwrapTuple && isDescribedTuple(rawValue)) {
      return rawValue[0];
    }
    return rawValue === undefined ? fallback : rawValue;
  };

  const setVariableValue = (variables, path, value) => {
    const normalizedPath = normalizeVariablePath(path);
    const current = dependencies.Pu.default.get(variables, normalizedPath);
    if (isDescribedTuple(current)) {
      dependencies.Pu.default.set(variables, normalizedPath, [value, current[1]]);
    } else {
      dependencies.Pu.default.set(variables, normalizedPath, value);
    }
  };

  const executeUpdateVariableBlock = async (responseText, variables) => {
    const { script, cleanText } = extractUpdateVariableScript(responseText);
    if (!script) {
      return {
        updatedVariables: variables,
        cleanedText: cleanText,
        variableLog: '',
      };
    }

    const logLines = ['[ISOLATED JS ENGINE] Script detected. Executing...'];
    try {
      const lodashModule = await dependencies.nc(async () => {
        const { default: lodashCode } = await import('../../../assets/lodash.min-xZXeUb-0.js');
        return { default: lodashCode };
      });
      const workerSource = buildVariableWorkerSource(script, lodashModule.default);
      const workerResult = await runIsolatedScript(workerSource, { variables });

      if (Array.isArray(workerResult.logs)) {
        logLines.push(...workerResult.logs.map(String));
      }
      if (
        !workerResult.ok
        || !workerResult.variables
        || typeof workerResult.variables !== 'object'
        || Array.isArray(workerResult.variables)
      ) {
        throw new Error(workerResult.error || 'Variable script returned an invalid result.');
      }

      logLines.push('[ISOLATED JS ENGINE] Execution successful.');
      return {
        updatedVariables: workerResult.variables,
        cleanedText: cleanText,
        variableLog: logLines.join('\n'),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logLines.push(`[ISOLATED JS ENGINE ERROR] ${errorMessage}`);
      console.error('Variable Script Error:', error);
      return {
        updatedVariables: variables,
        cleanedText: cleanText,
        variableLog: logLines.join('\n'),
      };
    }
  };

  const mutateVariable = (variables, operation, path, operand) => {
    const clonedVariables = JSON.parse(JSON.stringify(variables));

    if (operation === 'set') {
      setVariableValue(clonedVariables, path, operand);
    } else if (operation === 'delete') {
      dependencies.Pu.default.unset(clonedVariables, normalizeVariablePath(path));
    } else if (operation === 'add') {
      const current = getVariable(clonedVariables, path, undefined, true);
      if (current == null) {
        setVariableValue(clonedVariables, path, operand);
      } else if (typeof current === 'number') {
        const numericOperand = Number(operand);
        if (!Number.isNaN(numericOperand)) {
          setVariableValue(clonedVariables, path, current + numericOperand);
        } else {
          setVariableValue(clonedVariables, path, String(current) + String(operand));
        }
      } else if (Array.isArray(current)) {
        current.push(operand);
      } else {
        setVariableValue(clonedVariables, path, String(current) + String(operand));
      }
    } else if (['sub', 'mul', 'div', 'mod'].includes(operation)) {
      const currentValue = Number(getVariable(clonedVariables, path, 0));
      const numericOperand = Number(operand);
      if (!Number.isNaN(numericOperand)) {
        let nextValue = Number.isNaN(currentValue) ? 0 : currentValue;
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
        setVariableValue(clonedVariables, path, nextValue);
      }
    } else if (operation === 'push' || operation === 'insert') {
      const targetArray = getVariable(clonedVariables, path, undefined, true);
      if (Array.isArray(targetArray)) {
        targetArray.push(operand);
      }
    } else if (operation === 'remove') {
      const targetArray = getVariable(clonedVariables, path, undefined, true);
      if (Array.isArray(targetArray)) {
        const matchIndex = targetArray.indexOf(operand);
        if (matchIndex > -1) {
          targetArray.splice(matchIndex, 1);
        }
      }
    }

    return clonedVariables;
  };

  return {
    runIsolatedScript,
    getVariable,
    $u: executeUpdateVariableBlock,
    mutateVariable,
  };
}
