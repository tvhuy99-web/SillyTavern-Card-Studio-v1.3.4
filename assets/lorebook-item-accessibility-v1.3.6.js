(() => {
  'use strict';

  const editorSelector = '[role="button"][aria-label^="Chỉnh sửa mục "]';
  const switchSelector = '[role="switch"][aria-label^="Bật mục "]';
  const editButtonSelector = 'button[aria-label^="Chỉnh sửa mục "]';
  let headingSequence = 0;

  const makeSlug = (value) =>
    String(value || 'muc-so-tay')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 64) || 'muc-so-tay';

  const ensureHeadingKeyboardEdit = (heading, editor) => {
    if (!heading || heading.dataset.lorebookKeyboardEdit === 'true') return;

    heading.dataset.lorebookKeyboardEdit = 'true';
    heading.tabIndex = 0;
    heading.style.cursor = 'pointer';

    heading.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      editor.click();
    });
  };

  const fixLorebookItem = (editor) => {
    if (!(editor instanceof Element)) return;

    const originalLabel = editor.getAttribute('aria-label') || '';
    const title = originalLabel.replace(/^Chỉnh sửa mục\s*/, '').trim() || 'Mục sổ tay';
    const heading = editor.querySelector('h3');
    const root = editor.parentElement;

    if (heading) {
      if (!heading.id) {
        heading.id = `lorebook-heading-${makeSlug(title)}-${++headingSequence}`;
      }
      heading.dataset.lorebookHeading = 'true';
      ensureHeadingKeyboardEdit(heading, editor);
    }

    if (root && heading) {
      root.setAttribute('role', 'article');
      root.setAttribute('aria-labelledby', heading.id);
    }

    editor.removeAttribute('role');
    editor.removeAttribute('aria-label');
    editor.removeAttribute('aria-disabled');
    editor.removeAttribute('tabindex');

    const statusSwitch = root?.querySelector(switchSelector);
    if (statusSwitch) {
      statusSwitch.removeAttribute('aria-label');
    }

    const redundantEditButton = root?.querySelector(editButtonSelector);
    if (redundantEditButton) {
      redundantEditButton.hidden = true;
      redundantEditButton.setAttribute('aria-hidden', 'true');
      redundantEditButton.tabIndex = -1;
    }
  };

  const cleanLorebookItems = (root = document) => {
    const editors = [];

    if (root instanceof Element && root.matches(editorSelector)) {
      editors.push(root);
    }

    if (root && typeof root.querySelectorAll === 'function') {
      root.querySelectorAll(editorSelector).forEach((editor) => editors.push(editor));
    }

    editors.forEach((editor) => fixLorebookItem(editor));

    if (root instanceof Element && root.matches(switchSelector)) {
      root.removeAttribute('aria-label');
    }

    if (root && typeof root.querySelectorAll === 'function') {
      root.querySelectorAll(switchSelector).forEach((element) => {
        element.removeAttribute('aria-label');
      });
    }
  };

  const start = () => {
    cleanLorebookItems(document);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          cleanLorebookItems(record.target);
          continue;
        }

        record.addedNodes.forEach((node) => {
          cleanLorebookItems(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['role', 'aria-label', 'aria-disabled', 'tabindex'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
