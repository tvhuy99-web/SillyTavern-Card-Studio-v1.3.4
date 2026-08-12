(() => {
  'use strict';

  const selector = '[role="switch"][aria-label^="Bật lời nhắc "]';

  const cleanPresetSwitchLabels = (root) => {
    if (root instanceof Element && root.matches(selector)) {
      root.removeAttribute('aria-label');
    }

    if (root && typeof root.querySelectorAll === 'function') {
      root.querySelectorAll(selector).forEach((element) => {
        element.removeAttribute('aria-label');
      });
    }
  };

  const start = () => {
    cleanPresetSwitchLabels(document);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          cleanPresetSwitchLabels(record.target);
          continue;
        }

        record.addedNodes.forEach((node) => {
          cleanPresetSwitchLabels(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
