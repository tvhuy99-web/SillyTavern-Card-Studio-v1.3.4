import { copyFile, readFile, writeFile } from 'node:fs/promises';

const CORE_TEMPLATE_URL = new URL('../src/runtime/card-runtime/core.template.js', import.meta.url);
const RENDERER_SOURCE_URL = new URL('../src/runtime/card-runtime/renderer.js', import.meta.url);
const CORE_BUILDER_OUTPUT_URL = new URL('../assets/card-runtime-core-builder-v1.3.6.js', import.meta.url);
const RENDERER_OUTPUT_URL = new URL('../assets/card-runtime-renderer-v1.3.6.js', import.meta.url);

const CORE_MODULE_FRAGMENTS = [
  { name: "BRIDGE_RPC", token: "/*__STS_MODULE_BRIDGE_RPC__*/", url: new URL("../src/runtime/card-runtime/modules/bridge-rpc.jsfrag", import.meta.url) },
  { name: "EVENTS", token: "/*__STS_MODULE_EVENTS__*/", url: new URL("../src/runtime/card-runtime/modules/events.jsfrag", import.meta.url) },
  { name: "VARIABLES", token: "/*__STS_MODULE_VARIABLES__*/", url: new URL("../src/runtime/card-runtime/modules/variables.jsfrag", import.meta.url) },
  { name: "CHAT", token: "/*__STS_MODULE_CHAT__*/", url: new URL("../src/runtime/card-runtime/modules/chat.jsfrag", import.meta.url) },
  { name: "MACROS", token: "/*__STS_MODULE_MACROS__*/", url: new URL("../src/runtime/card-runtime/modules/macros.jsfrag", import.meta.url) },
  { name: "GENERATION", token: "/*__STS_MODULE_GENERATION__*/", url: new URL("../src/runtime/card-runtime/modules/generation.jsfrag", import.meta.url) },
  { name: "WORLDBOOK", token: "/*__STS_MODULE_WORLDBOOK__*/", url: new URL("../src/runtime/card-runtime/modules/worldbook.jsfrag", import.meta.url) },
  { name: "REGEX", token: "/*__STS_MODULE_REGEX__*/", url: new URL("../src/runtime/card-runtime/modules/regex.jsfrag", import.meta.url) },
  { name: "AUDIO", token: "/*__STS_MODULE_AUDIO__*/", url: new URL("../src/runtime/card-runtime/modules/audio.jsfrag", import.meta.url) },
  { name: "STORAGE", token: "/*__STS_MODULE_STORAGE__*/", url: new URL("../src/runtime/card-runtime/modules/storage.jsfrag", import.meta.url) },
  { name: "BRIDGE_NETWORK", token: "/*__STS_MODULE_BRIDGE_NETWORK__*/", url: new URL("../src/runtime/card-runtime/modules/bridge-network.jsfrag", import.meta.url) },
  { name: "ACCESSIBILITY", token: "/*__STS_MODULE_ACCESSIBILITY__*/", url: new URL("../src/runtime/card-runtime/modules/accessibility.jsfrag", import.meta.url) },
  { name: "SCRIPTS", token: "/*__STS_MODULE_SCRIPTS__*/", url: new URL("../src/runtime/card-runtime/modules/scripts.jsfrag", import.meta.url) },
  { name: "VARIABLES_MVU", token: "/*__STS_MODULE_VARIABLES_MVU__*/", url: new URL("../src/runtime/card-runtime/modules/variables-mvu.jsfrag", import.meta.url) },
  { name: "BRIDGE_CONTEXT", token: "/*__STS_MODULE_BRIDGE_CONTEXT__*/", url: new URL("../src/runtime/card-runtime/modules/bridge-context.jsfrag", import.meta.url) },
  { name: "HUD", token: "/*__STS_MODULE_HUD__*/", url: new URL("../src/runtime/card-runtime/modules/hud.jsfrag", import.meta.url) },
  { name: "BRIDGE_HANDSHAKE", token: "/*__STS_MODULE_BRIDGE_HANDSHAKE__*/", url: new URL("../src/runtime/card-runtime/modules/bridge-handshake.jsfrag", import.meta.url) },
];

const COMPATIBILITY_FRAGMENTS = [
  '../src/runtime/card-runtime/compat/catalog-characters.jsfrag',
  '../src/runtime/card-runtime/compat/personas-presets.jsfrag',
  '../src/runtime/card-runtime/compat/extensions-imports.jsfrag',
  '../src/runtime/card-runtime/compat/services.jsfrag',
  '../src/runtime/card-runtime/compat/variables-worldbook.jsfrag',
  '../src/runtime/card-runtime/compat/context-exposure.jsfrag',
].map(path => new URL(path, import.meta.url));

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[card runtime build] ${label}: token not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[card runtime build] ${label}: token matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function toClassicRuntimeSource(source) {
  return source;
}

function makeCoreBuilderModule(classicCoreSource) {
  const safeCoreSource = classicCoreSource
    .replaceAll('</script', '<\\/script')
    .replaceAll('<!--', '<\\!--');
  const runtimeBootstrapSource = `
(function bootstrapCardRuntime() {
  var state = window.__cardRuntimeBootState = {
    phase: 'core-script-loaded',
    startedAt: Date.now(),
    hasStartFunction: typeof window.__STS_START_CARD_RUNTIME__ === 'function',
    hasEventEmit: false,
    hasIframeEvents: false,
    hasRenderStartedEvent: false,
    hasRenderEndedEvent: false
  };
  function snapshot() {
    return Object.assign({}, state);
  }
  function failure(code, message, cause) {
    var suffix = cause && cause.message ? ': ' + String(cause.message) : '';
    var error = new Error(code + ': ' + message + suffix);
    error.cardRuntimeBootstrapCode = code;
    error.cardRuntimeBootState = snapshot();
    error.__cardRuntimeBootstrapFailure = true;
    if (cause && cause.stack) error.causeStack = String(cause.stack);
    return error;
  }
  window.cardStudioReady = Promise.resolve().then(function () {
    state.hasStartFunction = typeof window.__STS_START_CARD_RUNTIME__ === 'function';
    if (!state.hasStartFunction) {
      state.phase = 'start-function-missing';
      throw failure('CARD_RUNTIME_START_FUNCTION_MISSING', '__STS_START_CARD_RUNTIME__ is unavailable.');
    }
    state.phase = 'start-entered';
    state.startEnteredAt = Date.now();
    return window.__STS_START_CARD_RUNTIME__(window.__CARD_STUDIO_BOOT__);
  }).then(function (result) {
    state.hasEventEmit = typeof window.eventEmit === 'function';
    state.hasIframeEvents = Boolean(window.iframe_events);
    state.hasRenderStartedEvent = Boolean(window.iframe_events && window.iframe_events.MESSAGE_IFRAME_RENDER_STARTED);
    state.hasRenderEndedEvent = Boolean(window.iframe_events && window.iframe_events.MESSAGE_IFRAME_RENDER_ENDED);
    if (!state.hasEventEmit || !state.hasRenderStartedEvent || !state.hasRenderEndedEvent) {
      state.phase = 'event-bridge-missing';
      throw failure('CARD_RUNTIME_EVENT_BRIDGE_NOT_READY', 'Runtime core resolved without a complete iframe event bridge.');
    }
    state.phase = 'runtime-ready';
    state.readyAt = Date.now();
    return result;
  }).catch(function (error) {
    if (!(error && error.__cardRuntimeBootstrapFailure)) {
      var code = state.phase === 'handshake-timeout'
        ? 'CARD_RUNTIME_HANDSHAKE_FAILED'
        : 'CARD_RUNTIME_CORE_START_REJECTED';
      if (state.phase !== 'handshake-timeout') state.phase = 'core-start-rejected';
      error = failure(code, 'Card Runtime core failed before readiness.', error);
    }
    state.errorCode = error.cardRuntimeBootstrapCode || 'CARD_RUNTIME_BOOTSTRAP_FAILED';
    state.errorMessage = String(error.message || error);
    error.cardRuntimeBootState = snapshot();
    throw error;
  });
})();
`;

  // String.raw is intentional: generated source must retain two backslashes
  // in '\\\\u003c' so the generated module emits a literal \\u003c sequence
  // into the inline script instead of reconstructing a raw '<'.
  return String.raw`const CARD_RUNTIME_CORE_SOURCE = ${JSON.stringify(safeCoreSource)};
const CARD_RUNTIME_BOOTSTRAP_SOURCE = ${JSON.stringify(runtimeBootstrapSource)};

function serializeScriptValue(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\\\u003c')
    .replaceAll('>', '\\\\u003e')
    .replaceAll('&', '\\\\u0026');
}

export function buildCardRuntimeCoreScript(boot) {
  if (!boot || typeof boot !== 'object') {
    throw new TypeError('Card Runtime BOOT payload must be an object.');
  }
  return 'window.__CARD_STUDIO_BOOT__ = ' + serializeScriptValue(boot) + ';\\n' + CARD_RUNTIME_CORE_SOURCE + '\\n' + CARD_RUNTIME_BOOTSTRAP_SOURCE + '\\n';
}

export const CARD_RUNTIME_CORE_SOURCE_BYTES = CARD_RUNTIME_CORE_SOURCE.length;
`;
}
export async function buildCardRuntimeAssets() {
  let core = await readFile(CORE_TEMPLATE_URL, 'utf8');
  const coreTemplateBytes = core.length;
  for (const fragment of CORE_MODULE_FRAGMENTS) {
    const source = await readFile(fragment.url, 'utf8');
    core = replaceExactlyOnce(core, fragment.token, source, 'module/' + fragment.name);
  }
  const fragments = [];
  for (const url of COMPATIBILITY_FRAGMENTS) fragments.push(await readFile(url, 'utf8'));

  const token = '/*__STS_COMPATIBILITY_API__*/';
  const first = core.indexOf(token);
  if (first < 0 || core.indexOf(token, first + token.length) >= 0) {
    throw new Error('Card Runtime compatibility API token must appear exactly once.');
  }

  core = core.slice(0, first) + fragments.join('') + core.slice(first + token.length);
  const classicCore = toClassicRuntimeSource(core);
  const coreBuilder = makeCoreBuilderModule(classicCore);

  await writeFile(CORE_BUILDER_OUTPUT_URL, coreBuilder, 'utf8');
  await copyFile(RENDERER_SOURCE_URL, RENDERER_OUTPUT_URL);

  return {
    coreSourceBytes: classicCore.length,
    coreTemplateBytes,
    coreBuilderBytes: coreBuilder.length,
    coreModuleFragments: CORE_MODULE_FRAGMENTS.length,
    compatibilityFragments: fragments.length,
    iframeModuleImportRequired: false,
  };
}
