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
  for (const [from, to] of CARD_RUNTIME_URL_REPLACEMENTS) {
    next = next.split(from).join(to);
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

  return String.raw`
(async function () {
    const START_OPTIONS = ${optionsJson};

    function bootstrapStateSnapshot() {
        const state = window.__cardRuntimeBootState && typeof window.__cardRuntimeBootState === 'object'
            ? window.__cardRuntimeBootState
            : {};
        return Object.assign({
            phase: state.phase || 'renderer-bootstrap',
            hasReadyPromise: Boolean(window.cardStudioReady && typeof window.cardStudioReady.then === 'function'),
            hasStartFunction: typeof window.__STS_START_CARD_RUNTIME__ === 'function',
            hasEventEmit: typeof window.eventEmit === 'function',
            hasIframeEvents: Boolean(window.iframe_events),
            hasRenderStartedEvent: Boolean(window.iframe_events && window.iframe_events.MESSAGE_IFRAME_RENDER_STARTED),
            hasRenderEndedEvent: Boolean(window.iframe_events && window.iframe_events.MESSAGE_IFRAME_RENDER_ENDED)
        }, state);
    }

    function bootstrapError(code, message, cause) {
        const suffix = cause && cause.message ? ': ' + String(cause.message) : '';
        const error = new Error(code + ': ' + message + suffix);
        error.cardRuntimeBootstrapCode = code;
        error.cardRuntimeBootState = bootstrapStateSnapshot();
        error.__cardRuntimeBootstrapFailure = true;
        if (cause && cause.stack) error.causeStack = String(cause.stack);
        return error;
    }

    function reportBootstrapError(error) {
        if (!error || error.__cardRuntimeBootstrapReported) return;
        error.__cardRuntimeBootstrapReported = true;
        try {
            if (window._cardStudio && typeof window._cardStudio.diagnostic === 'function') {
                window._cardStudio.diagnostic(
                    'CARD_RUNTIME_BOOTSTRAP_FAILED',
                    'renderer-bootstrap',
                    'runtime-bootstrap-contract',
                    String(error.message || error),
                    {
                        stack: error.stack,
                        details: {
                            bootstrapCode: error.cardRuntimeBootstrapCode || 'CARD_RUNTIME_BOOTSTRAP_FAILED',
                            bootState: error.cardRuntimeBootState || bootstrapStateSnapshot()
                        }
                    },
                );
            }
        } catch (_) {}
    }

    async function requireCardRuntimeReady() {
        if (!window.cardStudioReady || typeof window.cardStudioReady.then !== 'function') {
            const error = bootstrapError(
                'CARD_RUNTIME_READY_PROMISE_MISSING',
                'cardStudioReady was not created before the renderer started.',
            );
            reportBootstrapError(error);
            throw error;
        }
        try {
            await window.cardStudioReady;
        } catch (cause) {
            const error = cause && cause.__cardRuntimeBootstrapFailure
                ? cause
                : bootstrapError('CARD_RUNTIME_READY_REJECTED', 'cardStudioReady rejected before renderer startup.', cause);
            reportBootstrapError(error);
            throw error;
        }

        const missing = [];
        if (typeof window.eventEmit !== 'function') missing.push('eventEmit');
        if (!window.iframe_events) missing.push('iframe_events');
        if (!window.iframe_events?.MESSAGE_IFRAME_RENDER_STARTED) missing.push('iframe_events.MESSAGE_IFRAME_RENDER_STARTED');
        if (!window.iframe_events?.MESSAGE_IFRAME_RENDER_ENDED) missing.push('iframe_events.MESSAGE_IFRAME_RENDER_ENDED');
        if (window._cardStudio?.engineMode === 'official-local') {
            if (typeof window.getIframeName !== 'function') missing.push('getIframeName');
        } else {
            if (typeof window.getCurrentMessageId !== 'function') missing.push('getCurrentMessageId');
            if (typeof window.getMessageId !== 'function') missing.push('getMessageId');
        }
        if (missing.length) {
            if (window.__cardRuntimeBootState) window.__cardRuntimeBootState.phase = 'renderer-contract-missing';
            const error = bootstrapError(
                'CARD_RUNTIME_RENDERER_CONTRACT_NOT_READY',
                'Runtime readiness contract is incomplete: ' + missing.join(', '),
            );
            reportBootstrapError(error);
            throw error;
        }
        if (window.__cardRuntimeBootState) {
            window.__cardRuntimeBootState.phase = 'renderer-ready';
            window.__cardRuntimeBootState.rendererReadyAt = Date.now();
        }
    }

    await requireCardRuntimeReady();
    try {
        if (window.__cardRuntimeCoreLibrariesReady) await window.__cardRuntimeCoreLibrariesReady;
        if (window.builtin) {
            window.builtin.zod = window.z;
            window.builtin.yaml = window.YAML || window.jsyaml;
            window.builtin.vueRouter = window.VueRouter;
            window.builtin.pinia = window.Pinia;
        }
        if (window.SillyTavern && window.SillyTavern.libs) {
            window.SillyTavern.libs.zod = window.z;
            window.SillyTavern.libs.yaml = window.YAML || window.jsyaml;
            window.SillyTavern.libs.VueRouter = window.VueRouter;
            window.SillyTavern.libs.Pinia = window.Pinia;
        }
        const delayedMissing = [];
        if (!window.z) delayedMissing.push('zod@4.4.3');
        if (!window.YAML) delayedMissing.push('yaml@2.9.0');
        if (delayedMissing.length) throw new Error('Missing asynchronous runtime libraries: ' + delayedMissing.join(', '));
    } catch (error) {
        window._cardStudio.diagnostic('CARD_RUNTIME_DEPENDENCY_MISSING', 'dependency-load', 'core-library-loader', 'Không thể tải đầy đủ thư viện tương thích TavernHelper 4.8.19: ' + error.message, { stack: error.stack, details: { required: ['zod@4.4.3', 'yaml@2.9.0'] } });
    }
    await window.eventEmit(
        window.iframe_events.MESSAGE_IFRAME_RENDER_STARTED,
        window._cardStudio?.engineMode === 'official-local' ? window.getIframeName() : 'card-message-' + window.getCurrentMessageId(),
    );
    if (window.__cardRuntimeBootState) {
        window.__cardRuntimeBootState.phase = 'renderer-started';
        window.__cardRuntimeBootState.rendererStartedAt = Date.now();
    }
    const target = window._cardStudio?.engineMode === 'official-local'
        ? document.body
        : document.getElementById('target_mes_text') || document.getElementById('chat') || document.body;
    let html = ${htmlJson};
    try {
        if (typeof window.substitudeMacros === 'function') html = window.substitudeMacros(html);
    } catch (error) {
        window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'macro-render', 'macro-engine', 'Không thể thay thế macro trong HTML: ' + error.message, { stack: error.stack });
    }
    try {
        if (window.ejs && typeof window.ejs.render === 'function' && /<%[=-]?/.test(html)) {
            html = await window.ejs.render(html, { getvar: window.getvar, getwi: window.getwi, toastr: window.toastr, stat_data: window.stat_data }, { async: true });
        }
    } catch (error) {
        window._cardStudio.log('error', 'EJS rendering failed: ' + error.message, { stack: error.stack });
        window._cardStudio.diagnostic('CARD_RUNTIME_EJS_RENDER_FAILED', 'render', 'EJS', 'EJS rendering failed: ' + error.message, { stack: error.stack });
    }

    try {
        target.innerHTML = html;
    } catch (error) {
        window._cardStudio.diagnostic('CARD_RUNTIME_RENDER_FAILED', 'render', 'DOM', 'Không thể gắn HTML của thẻ vào DOM: ' + error.message, { stack: error.stack });
        target.textContent = 'Không thể hiển thị giao diện HTML. Hãy mở Bảng Gỡ Lỗi để xem mã chẩn đoán.';
    }

    let accessibilitySequence = 0;
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

    const dynamicDescriptors = [];
    Array.from(target.querySelectorAll('script')).forEach(function (script, index) {
        const type = String(script.type || '').toLowerCase();
        if (type === 'importmap' || type === 'importmap-shim') {
            try {
                const importMap = document.createElement('script');
                importMap.type = type;
                importMap.textContent = script.textContent || '';
                document.head.appendChild(importMap);
            } catch (error) {
                window._cardStudio.diagnostic('CARD_RUNTIME_IMPORTMAP_INVALID', 'script-prepare', 'importmap', 'Không thể cài import map được render: ' + error.message, { stack: error.stack });
            }
            script.remove();
            return;
        }
        if (type && !['module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes(type)) return;
        dynamicDescriptors.push({
            id: script.id || 'rendered-script-' + index,
            name: 'Rendered HTML script ' + (index + 1),
            type: type === 'module' ? 'module' : 'classic',
            src: script.getAttribute('src') || undefined,
            content: script.textContent || '',
            async: script.hasAttribute('async'),
            defer: script.hasAttribute('defer'),
            noModule: script.noModule,
            crossOrigin: script.crossOrigin || undefined,
            integrity: script.integrity || undefined,
            referrerPolicy: script.referrerPolicy || undefined
        });
        script.remove();
    });
    const descriptors = dynamicDescriptors.concat(${descriptorsJson});
    if (typeof window.__registerCardRuntimeScripts === 'function') window.__registerCardRuntimeScripts(descriptors);

    async function runScript(info) {
        window.__setActiveCardScript(info.id, info.name, info.info, info.buttons);
        let scriptContent = String(info.content || '');
        try {
            if (scriptContent.indexOf('{{') >= 0 && typeof window.substitudeMacros === 'function') scriptContent = window.substitudeMacros(scriptContent);
        } catch (error) {
            window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'macro-render', 'macro-engine', 'Không thể thay thế macro trong script: ' + error.message, { stack: error.stack, scriptId: info.id, scriptName: info.name });
        }
        if (window.ejs && typeof window.ejs.render === 'function' && /<%[=-]?/.test(scriptContent)) {
            try {
                scriptContent = await window.ejs.render(scriptContent, { getvar: window.getvar, getwi: window.getwi, toastr: window.toastr, stat_data: window.stat_data }, { async: true });
            } catch (error) {
                window._cardStudio.log('script-error', 'EJS script rendering failed: ' + (info.name || info.id), { stack: error.stack });
                window._cardStudio.diagnostic('CARD_RUNTIME_EJS_RENDER_FAILED', 'script-render', 'EJS', 'EJS script rendering failed: ' + (info.name || info.id), { stack: error.stack, scriptId: info.id, scriptName: info.name });
                return;
            }
        }
        return new Promise(function (resolve) {
            const element = document.createElement('script');
            if (info.type === 'module') element.type = 'module';
            if (info.noModule) element.noModule = true;
            if (info.crossOrigin) element.crossOrigin = info.crossOrigin;
            if (info.integrity) element.integrity = info.integrity;
            if (info.referrerPolicy) element.referrerPolicy = info.referrerPolicy;
            if (info.src) element.src = window.resolveCardAsset(info.src);
            else element.textContent = scriptContent + '\n//# sourceURL=card-runtime-' + encodeURIComponent(info.name || info.id) + '.js';
            let finished = false;
            const finish = function (error) {
                if (finished) return;
                finished = true;
                if (error) {
                    const message = 'Card script failed: ' + (info.name || info.id);
                    window._cardStudio.log('script-error', message, { src: info.src || null, scriptId: info.id });
                    window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'script-execution', 'script-loader', message, { resourceUrl: info.src || undefined, scriptId: info.id, scriptName: info.name });
                }
                resolve();
            };
            element.onload = function () { finish(); };
            element.onerror = function () { finish(true); };
            document.body.appendChild(element);
            if (!info.src && info.type !== 'module') finish();
            else setTimeout(function () { finish(); }, 30000);
        });
    }

    if (START_OPTIONS.executeScripts) {
        const deferred = [];
        const asyncTasks = [];
        for (const descriptor of descriptors) {
            if (descriptor.async) {
                asyncTasks.push(runScript(descriptor));
            } else if (descriptor.defer || descriptor.type === 'module') {
                deferred.push(descriptor);
            } else {
                await runScript(descriptor);
            }
        }
        for (const descriptor of deferred) await runScript(descriptor);
        Promise.allSettled(asyncTasks);
    }

    window.this_mes = document.querySelector('.mes[mesid="' + window.getMessageId() + '"]') || document.querySelector('.mes') || target;
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
