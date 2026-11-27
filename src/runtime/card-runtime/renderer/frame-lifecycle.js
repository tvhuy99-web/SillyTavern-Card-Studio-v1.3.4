export function renderFrameLifecycle() {
  return String.raw`    window.this_mes = document.querySelector('.mes[mesid="' + window.getMessageId() + '"]') || document.querySelector('.mes') || target;
    window.dispatchEvent(new Event('load'));
    enhanceAccessibility(target);
    let accessibilityObserver = null;
    let accessibilityTimer = 0;
    const pendingAccessibilityNodes = new Set();
    const accessibilityKeyHandler = function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const element = event.target && typeof event.target.closest === 'function' ? event.target.closest('[data-st-keyboard-button="true"]') : null;
        if (!element || !target.contains(element)) return;
        event.preventDefault();
        element.click();
    };
    target.addEventListener('keydown', accessibilityKeyHandler);
    if (window.MutationObserver) {
        accessibilityObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node && node.nodeType === 1) pendingAccessibilityNodes.add(node);
                });
            });
            if (!pendingAccessibilityNodes.size || accessibilityTimer) return;
            accessibilityTimer = setTimeout(function () {
                accessibilityTimer = 0;
                const nodes = Array.from(pendingAccessibilityNodes);
                pendingAccessibilityNodes.clear();
                nodes.forEach(enhanceAccessibility);
            }, 50);
        });
        accessibilityObserver.observe(target, { childList: true, subtree: true });
    }
    await window.eventEmit(
        window.iframe_events.MESSAGE_IFRAME_RENDER_ENDED,
        window._cardStudio?.engineMode === 'official-local' ? window.getIframeName() : 'card-message-' + window.getMessageId(),
    );
    if (window.__cardRuntimeBootState) {
        window.__cardRuntimeBootState.phase = 'renderer-complete';
        window.__cardRuntimeBootState.rendererCompletedAt = Date.now();
    }

    let lastHeight = 0;
    const reportHeight = function () {
        const maximumHeight = window._cardStudio && window._cardStudio.fullCompatibility ? 1000000 : 12000;
        const height = Math.min(maximumHeight, Math.max(120, document.documentElement.scrollHeight, document.body.scrollHeight));
        if (Math.abs(height - lastHeight) > 4) {
            lastHeight = height;
            window.parent.postMessage({ type: 'CARD_STUDIO_IFRAME_RESIZE', height: height }, '*');
        }
    };
    const heightObserver = window.ResizeObserver ? new ResizeObserver(reportHeight) : null;
    if (heightObserver) heightObserver.observe(document.body);
    const heightTimer = heightObserver ? 0 : setInterval(reportHeight, 2500);
    window.addEventListener('pagehide', function () {
        if (heightTimer) clearInterval(heightTimer);
        if (heightObserver) heightObserver.disconnect();
        if (accessibilityTimer) clearTimeout(accessibilityTimer);
        if (accessibilityObserver) accessibilityObserver.disconnect();
        target.removeEventListener('keydown', accessibilityKeyHandler);
        pendingAccessibilityNodes.clear();
        if (typeof window.eventClearAll === 'function') window.eventClearAll();
    }, { once: true });
    reportHeight();
})();`;
}
