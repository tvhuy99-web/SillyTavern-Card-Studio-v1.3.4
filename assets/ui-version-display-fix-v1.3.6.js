(function uiVersionDisplayCompatibilityLayer() {
  'use strict';

  if (window.__STS_UI_VERSION_FIX__) return;

  const APP_VERSION = '1.3.6';
  const DISPLAY_VERSION = `v${APP_VERSION}`;
  const BRAND_TEXT = 'SillyTavern Card Studio';
  const OLD_VERSION_RE = /^v?1\.3\.(?:4|5)$/i;
  const PATCH_ATTR = 'data-sts-ui-version-fixed';
  let observer = null;
  let syncQueued = false;

  const normalize = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

  function elementList(root) {
    if (!root) return [];
    const items = [];
    if (root.nodeType === 1) items.push(root);
    if (typeof root.querySelectorAll === 'function') items.push(...root.querySelectorAll('*'));
    return items;
  }

  function versionElements(root) {
    return elementList(root).filter(element => OLD_VERSION_RE.test(normalize(element.textContent)));
  }

  function syncBrandVersion(brandElement) {
    let node = brandElement && brandElement.parentElement;
    for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
      const versions = versionElements(node);
      if (!versions.length) continue;
      let changed = 0;
      for (const element of versions) {
        element.textContent = DISPLAY_VERSION;
        if (typeof element.setAttribute === 'function') element.setAttribute(PATCH_ATTR, APP_VERSION);
        changed += 1;
      }
      return changed;
    }
    return 0;
  }

  function syncVisibleVersion() {
    syncQueued = false;
    if (!document) return 0;

    try { document.documentElement?.setAttribute('data-app-version', APP_VERSION); } catch (_) {}
    try {
      const meta = document.querySelector?.('meta[name="app-version"]');
      if (meta) meta.setAttribute('content', APP_VERSION);
    } catch (_) {}

    let changed = 0;
    const brands = elementList(document).filter(element => normalize(element.textContent) === BRAND_TEXT);
    for (const brand of brands) changed += syncBrandVersion(brand);
    return changed;
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    const run = () => syncVisibleVersion();
    if (typeof queueMicrotask === 'function') queueMicrotask(run);
    else setTimeout(run, 0);
  }

  function startObserver() {
    if (observer || typeof MutationObserver !== 'function' || !document?.documentElement) return;
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations || []) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          queueSync();
          return;
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  window.__STS_UI_VERSION_FIX__ = Object.freeze({
    version: APP_VERSION,
    displayVersion: DISPLAY_VERSION,
    refresh: syncVisibleVersion
  });

  if (document?.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncVisibleVersion();
      startObserver();
    }, { once: true });
  } else {
    syncVisibleVersion();
    startObserver();
  }
})();
