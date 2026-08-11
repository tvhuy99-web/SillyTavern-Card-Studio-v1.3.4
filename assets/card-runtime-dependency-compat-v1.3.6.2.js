(function cardRuntimeDependencyCompatibilityLayer() {
  'use strict';

  if (window.__STS_CARD_DEPENDENCY_COMPAT__) return;

  const VERSION = '1.0.0';
  const replacements = [
    [
      'https://unpkg.com/vue-router@5.2.0/dist/vue-router.global.js',
      'https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js'
    ],
    [
      'https://cdn.jsdelivr.net/npm/vue-router@5.2.0/dist/vue-router.global.js',
      'https://cdn.jsdelivr.net/npm/vue-router@5.1.0/dist/vue-router.global.js'
    ]
  ];

  const stats = {
    rewrittenMarkup: 0,
    rewrittenUrls: 0,
  };

  function rewriteUrl(value) {
    let next = String(value == null ? '' : value);
    for (const [from, to] of replacements) {
      if (next === from) {
        stats.rewrittenUrls += 1;
        return to;
      }
    }
    return next;
  }

  function rewriteMarkup(value) {
    if (typeof value !== 'string' || value.indexOf('vue-router@5.2.0/dist/vue-router.global.js') < 0) {
      return value;
    }
    let next = value;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    if (next !== value) stats.rewrittenMarkup += 1;
    return next;
  }

  function patchSrcdocSetter() {
    if (typeof HTMLIFrameElement !== 'function' || !HTMLIFrameElement.prototype) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
    if (!descriptor || typeof descriptor.set !== 'function' || typeof descriptor.get !== 'function') return;
    try {
      Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          return descriptor.set.call(this, rewriteMarkup(value));
        },
      });
    } catch (_) {}
  }

  function patchSetAttribute() {
    if (typeof Element !== 'function' || !Element.prototype) return;
    const nativeSetAttribute = Element.prototype.setAttribute;
    if (typeof nativeSetAttribute !== 'function') return;

    Element.prototype.setAttribute = function patchedSetAttribute(name, value) {
      const key = String(name || '').toLowerCase();
      let next = value;
      if (key === 'srcdoc' && typeof HTMLIFrameElement === 'function' && this instanceof HTMLIFrameElement) {
        next = rewriteMarkup(value);
      } else if (
        (key === 'src' && typeof HTMLScriptElement === 'function' && this instanceof HTMLScriptElement) ||
        (key === 'href' && typeof HTMLLinkElement === 'function' && this instanceof HTMLLinkElement)
      ) {
        next = rewriteUrl(value);
      }
      return nativeSetAttribute.call(this, name, next);
    };
  }

  function patchResourceProperty(Ctor, property) {
    if (typeof Ctor !== 'function' || !Ctor.prototype) return;
    const descriptor = Object.getOwnPropertyDescriptor(Ctor.prototype, property);
    if (!descriptor || typeof descriptor.set !== 'function' || typeof descriptor.get !== 'function') return;
    try {
      Object.defineProperty(Ctor.prototype, property, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          return descriptor.set.call(this, rewriteUrl(value));
        },
      });
    } catch (_) {}
  }

  patchSrcdocSetter();
  patchSetAttribute();
  patchResourceProperty(window.HTMLScriptElement, 'src');
  patchResourceProperty(window.HTMLLinkElement, 'href');

  window.__STS_CARD_DEPENDENCY_COMPAT__ = Object.freeze({
    version: VERSION,
    rewriteUrl,
    rewriteMarkup,
    stats,
  });
})();
