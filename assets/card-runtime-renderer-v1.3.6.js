import { renderBootstrap } from './renderer/bootstrap.js';
import { renderMarkup } from './renderer/markup.js';
import { renderAccessibilityDefinitions } from './renderer/accessibility.js';
import { renderScriptDescriptors } from './renderer/script-descriptors.js';
import { renderVariableReadiness } from './renderer/variable-readiness.js';
import { renderScriptExecution } from './renderer/script-execution.js';
import { renderFrameLifecycle } from './renderer/frame-lifecycle.js';

const CARD_RUNTIME_URL_REPLACEMENTS = Object.freeze([
  [
    'https://unpkg.com/vue-router@5.2.0/dist/vue-router.global.js',
    'https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js',
  ],
  [
    'https://cdn.jsdelivr.net/npm/vue-router@5.2.0/dist/vue-router.global.js',
    'https://cdn.jsdelivr.net/npm/vue-router@5.1.0/dist/vue-router.global.js',
  ],
]);

export function normalizeCardRuntimeMarkup(value) {
  let next = String(value == null ? '' : value);
  for (const [sourceUrl, targetUrl] of CARD_RUNTIME_URL_REPLACEMENTS) {
    next = next.split(sourceUrl).join(targetUrl);
  }
  return next;
}

function serializeScriptValue(value) {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

export function buildCardRuntimeRendererScript(html, descriptors, options = {}) {
  const htmlJson = serializeScriptValue(html);
  const descriptorsJson = serializeScriptValue(Array.isArray(descriptors) ? descriptors : []);
  const optionsJson = serializeScriptValue({
    executeScripts: options.executeScripts !== false,
    runtimeMode: options.runtimeMode || 'active',
  });

  return [
    renderBootstrap(optionsJson),
    renderMarkup(htmlJson),
    renderAccessibilityDefinitions(),
    renderScriptDescriptors(descriptorsJson),
    renderVariableReadiness(),
    renderScriptExecution(),
    renderFrameLifecycle(),
  ].join('');
}
