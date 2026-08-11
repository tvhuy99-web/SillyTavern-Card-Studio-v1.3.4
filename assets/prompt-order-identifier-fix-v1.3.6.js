(function promptOrderIdentifierCompatibilityLayer() {
  'use strict';

  if (window.__STS_PROMPT_ORDER_FIX__) return;

  const APP_VERSION = '1.3.6';
  const nativeJsonParse = JSON.parse.bind(JSON);
  const nativeJsonStringify = JSON.stringify.bind(JSON);
  const nativeMapGet = Map.prototype.get;
  const nativeStructuredClone = typeof window.structuredClone === 'function'
    ? window.structuredClone.bind(window)
    : null;

  const builtInPromptIds = new Set([
    'main',
    'nsfw',
    'jailbreak',
    'enhanceDefinitions',
    'dialogueExamples',
    'chatHistory',
    'worldInfoBefore',
    'worldInfoAfter',
    'charDescription',
    'charPersonality',
    'scenario',
    'personaDescription',
  ]);

  const stats = {
    removedInvalidPrompts: 0,
    removedInvalidOrderEntries: 0,
    removedOrphanOrderEntries: 0,
    recoveredMapLookups: 0,
  };

  const isObject = value => value !== null && typeof value === 'object';
  const hasIdentifier = value => isObject(value) && typeof value.identifier === 'string' && value.identifier.trim().length > 0;

  function looksLikePromptConfig(value) {
    if (!isObject(value) || !Array.isArray(value.prompts)) return false;
    if (Array.isArray(value.prompt_order)) return true;
    return value.prompts.some(prompt => isObject(prompt) && (
      'identifier' in prompt ||
      'system_prompt' in prompt ||
      'marker' in prompt ||
      'role' in prompt ||
      'content' in prompt
    ));
  }

  function sanitizeOrderArray(order, knownPromptIds) {
    if (!Array.isArray(order)) return;
    for (let index = order.length - 1; index >= 0; index -= 1) {
      const entry = order[index];
      if (!hasIdentifier(entry)) {
        order.splice(index, 1);
        stats.removedInvalidOrderEntries += 1;
        continue;
      }

      const identifier = entry.identifier.trim();
      if (!knownPromptIds.has(identifier) && !builtInPromptIds.has(identifier)) {
        order.splice(index, 1);
        stats.removedOrphanOrderEntries += 1;
      }
    }
  }

  function sanitizePromptConfig(config) {
    if (!looksLikePromptConfig(config)) return;

    for (let index = config.prompts.length - 1; index >= 0; index -= 1) {
      if (!isObject(config.prompts[index])) {
        config.prompts.splice(index, 1);
        stats.removedInvalidPrompts += 1;
      }
    }

    const knownPromptIds = new Set(
      config.prompts
        .filter(hasIdentifier)
        .map(prompt => prompt.identifier.trim()),
    );

    if (!Array.isArray(config.prompt_order)) return;

    const groupedOrder = config.prompt_order.some(entry => isObject(entry) && Array.isArray(entry.order));
    if (groupedOrder) {
      for (let index = config.prompt_order.length - 1; index >= 0; index -= 1) {
        const list = config.prompt_order[index];
        if (!isObject(list) || !Array.isArray(list.order)) {
          config.prompt_order.splice(index, 1);
          stats.removedInvalidOrderEntries += 1;
          continue;
        }
        sanitizeOrderArray(list.order, knownPromptIds);
      }
      return;
    }

    sanitizeOrderArray(config.prompt_order, knownPromptIds);
  }

  function sanitizeTree(root) {
    if (!isObject(root)) return root;
    const seen = new WeakSet();
    const stack = [root];

    while (stack.length) {
      const value = stack.pop();
      if (!isObject(value) || seen.has(value)) continue;
      seen.add(value);

      if (looksLikePromptConfig(value)) sanitizePromptConfig(value);

      if (Array.isArray(value)) {
        for (const item of value) if (isObject(item)) stack.push(item);
      } else {
        for (const item of Object.values(value)) if (isObject(item)) stack.push(item);
      }
    }

    return root;
  }

  function isPromptOrderMap(map) {
    if (!(map instanceof Map) || map.size === 0) return false;
    for (const [key, value] of map.entries()) {
      if (typeof key !== 'string' || !hasIdentifier(value)) return false;
      if (value.identifier !== key || typeof value.enabled !== 'boolean') return false;
    }
    return true;
  }

  JSON.parse = function patchedJsonParse(text, reviver) {
    return sanitizeTree(nativeJsonParse(text, reviver));
  };

  JSON.stringify = function patchedJsonStringify(value, replacer, space) {
    sanitizeTree(value);
    return nativeJsonStringify(value, replacer, space);
  };

  if (nativeStructuredClone) {
    window.structuredClone = function patchedStructuredClone(value, options) {
      return sanitizeTree(nativeStructuredClone(value, options));
    };
  }

  Map.prototype.get = function patchedMapGet(key) {
    const value = nativeMapGet.call(this, key);
    if (value !== undefined || typeof key !== 'string' || !isPromptOrderMap(this)) return value;

    stats.recoveredMapLookups += 1;
    return { identifier: key, enabled: false };
  };

  window.__STS_PROMPT_ORDER_FIX__ = Object.freeze({
    version: APP_VERSION,
    sanitize: sanitizeTree,
    stats,
  });
})();
