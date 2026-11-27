// Classic iframe source fragment; evaluated in the same lexical scope and original sequence.
export function renderAccessibilityDefinitions() {
  return String.raw`    let accessibilitySequence = 0;
    function enhanceAccessibility(rootNode) {
        try {
            if (!rootNode) return;
            const selector = 'button, [role="button"], input, select, textarea, a[href], [onclick]';
            const interactive = [];
            if (rootNode.nodeType === 1 && typeof rootNode.matches === 'function' && rootNode.matches(selector)) interactive.push(rootNode);
            if (typeof rootNode.querySelectorAll === 'function') rootNode.querySelectorAll(selector).forEach(function (element) { interactive.push(element); });
            interactive.forEach(function (element) {
                if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
                    const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
                    const title = element.getAttribute('title') || element.getAttribute('data-label') || element.getAttribute('name') || element.getAttribute('id');
                    if (!text && title) element.setAttribute('aria-label', title);
                    else if (!text && (element.querySelector('svg, i, img') || element.matches('[onclick]'))) {
                        accessibilitySequence += 1;
                        element.setAttribute('aria-label', 'Nút tương tác ' + accessibilitySequence);
                    }
                }
                if (element.matches('[onclick]') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(element.tagName)) {
                    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0');
                    if (!element.hasAttribute('role')) element.setAttribute('role', 'button');
                    element.setAttribute('data-st-keyboard-button', 'true');
                }
            });
            const images = [];
            if (rootNode.nodeType === 1 && typeof rootNode.matches === 'function' && rootNode.matches('img:not([alt])')) images.push(rootNode);
            if (typeof rootNode.querySelectorAll === 'function') rootNode.querySelectorAll('img:not([alt])').forEach(function (image) { images.push(image); });
            images.forEach(function (image) {
                const src = image.getAttribute('src') || '';
                const name = src.split('/').pop() || 'Hình ảnh trong thẻ';
                image.setAttribute('alt', name.slice(0, 120));
            });
            if (!document.getElementById('st-card-announcer')) {
                const announcer = document.createElement('div');
                announcer.id = 'st-card-announcer';
                announcer.setAttribute('aria-live', 'polite');
                announcer.setAttribute('aria-atomic', 'true');
                announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
                document.body.appendChild(announcer);
                window.cardStudioAnnounce = function (message) { announcer.textContent = String(message || ''); };
            }
        } catch (error) {
            window._cardStudio.log('warn', 'Accessibility enhancement failed: ' + error.message);
        }
    }

`;
}
