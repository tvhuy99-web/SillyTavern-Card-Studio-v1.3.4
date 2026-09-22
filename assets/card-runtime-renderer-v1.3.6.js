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

    function compactVariableSnippet(content, index) {
        const start = Math.max(0, index - 120);
        const end = Math.min(content.length, index + 220);
        return content.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 360);
    }

    function collectLiteralVariablePaths(content) {
        const found = [];
        const seen = new Set();
        function push(kind, path) {
            const normalized = String(path || '').trim().replace(/^stat_data\./, '');
            if (!normalized) return;
            const key = kind + ':' + normalized;
            if (seen.has(key)) return;
            seen.add(key);
            found.push({ kind: kind, path: normalized.slice(0, 240) });
        }

        let match;
        const getvarPattern = /\bgetvar\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
        while ((match = getvarPattern.exec(content)) !== null) push('getvar', match[2]);

        const statDotPattern = /\b(?:window\s*\.\s*)?stat_data(?:\?\.|\.)([A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*(?:(?:\?\.|\.)[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*)*)/g;
        while ((match = statDotPattern.exec(content)) !== null) push('stat_data', match[1].replace(/\?\./g, '.'));

        const statBracketPattern = /\b(?:window\s*\.\s*)?stat_data\s*\[\s*(['"])([^'"]+)\1\s*\]/g;
        while ((match = statBracketPattern.exec(content)) !== null) push('stat_data', match[2]);

        return found.slice(0, 48);
    }

    function buildVariableDependencyProfile(items) {
        const profile = {
            usesVariables: false,
            usesVariableApi: false,
            requiresChatState: false,
            scripts: [],
            literalPaths: [],
            accessSnippets: [],
            readinessTextLiterals: []
        };
        const pathSeen = new Set();
        const snippetSeen = new Set();
        const readinessSeen = new Set();
        items.forEach(function (info) {
            const content = String(info && info.content || '');
            if (!content) return;
            const usesVariableApi = /\b(?:getVariables|getAllVariables|replaceVariables|updateVariablesWith|insertVariables|insertOrAssignVariables|deleteVariable|registerVariableSchema)\b/.test(content);
            const requiresChatState = /\b(?:stat_data|__st_live_data|getvar|setvar)\b/.test(content);
            if (!usesVariableApi && !requiresChatState) return;
            profile.usesVariables = true;
            profile.usesVariableApi = profile.usesVariableApi || usesVariableApi;
            profile.requiresChatState = profile.requiresChatState || requiresChatState;
            const scriptName = String(info.name || info.id || 'script').slice(0, 120);
            profile.scripts.push(scriptName);

            collectLiteralVariablePaths(content).forEach(function (entry) {
                const key = entry.kind + ':' + entry.path;
                if (pathSeen.has(key)) return;
                pathSeen.add(key);
                profile.literalPaths.push(Object.assign({ script: scriptName }, entry));
            });

            const accessPattern = /\b(?:getVariables|getAllVariables|getvar|setvar|stat_data|__st_live_data|registerVariableSchema)\b/g;
            let match;
            while ((match = accessPattern.exec(content)) !== null && profile.accessSnippets.length < 24) {
                const snippet = compactVariableSnippet(content, match.index);
                const key = scriptName + ':' + snippet;
                if (!snippet || snippetSeen.has(key)) continue;
                snippetSeen.add(key);
                profile.accessSnippets.push({ script: scriptName, token: match[0], snippet: snippet });
            }

            const readinessPattern = /(['"])([^\n\r'"]{0,140}(?:Biến\s+chưa\s+sẵn\s+sàng|variables?\s+(?:are\s+)?not\s+ready|waiting\s+for\s+variables?)[^\n\r'"]{0,140})\1/gi;
            while ((match = readinessPattern.exec(content)) !== null && profile.readinessTextLiterals.length < 12) {
                const marker = String(match[2] || '').replace(/\s+/g, ' ').trim().slice(0, 280);
                if (!marker || readinessSeen.has(marker)) continue;
                readinessSeen.add(marker);
                profile.readinessTextLiterals.push({ script: scriptName, text: marker });
            }
        });
        profile.literalPaths = profile.literalPaths.slice(0, 48);
        return profile;
    }

    function readPathState(rootValue, path) {
        const parts = String(path || '').replace(/\[(?:'|")([^'"]+)(?:'|")\]/g, '.$1').split('.').filter(Boolean);
        let current = rootValue;
        const traversed = [];
        for (let index = 0; index < parts.length; index += 1) {
            const part = parts[index];
            traversed.push(part);
            if (current == null || (typeof current !== 'object' && typeof current !== 'function') || !Object.prototype.hasOwnProperty.call(current, part)) {
                return {
                    exists: false,
                    path: String(path || ''),
                    missingSegment: part,
                    resolvedPrefix: traversed.slice(0, -1).join('.'),
                    depth: index
                };
            }
            current = current[part];
        }
        return {
            exists: true,
            path: String(path || ''),
            valueType: current === null ? 'null' : Array.isArray(current) ? 'array' : typeof current,
            depth: parts.length
        };
    }

    function probeLiteralVariablePaths(profile) {
        const probes = [];
        const chatRoot = window.__st_live_data && window.__st_live_data.stat_data
            ? window.__st_live_data.stat_data
            : window.stat_data || window.__st_live_data || {};
        (profile.literalPaths || []).forEach(function (entry) {
            const probe = readPathState(chatRoot, entry.path);
            probes.push(Object.assign({ kind: entry.kind, script: entry.script }, probe));
        });
        return probes;
    }

    function detectVariableReadinessUi() {
        const text = String(target && target.textContent || '').replace(/\s+/g, ' ').trim();
        const patterns = [
            /Biến\s+chưa\s+sẵn\s+sàng/i,
            /variables?\s+(?:are\s+)?not\s+ready/i,
            /waiting\s+for\s+variables?/i
        ];
        for (let index = 0; index < patterns.length; index += 1) {
            const match = text.match(patterns[index]);
            if (!match) continue;
            const at = Math.max(0, match.index || 0);
            return {
                found: true,
                marker: match[0],
                textSample: text.slice(Math.max(0, at - 160), Math.min(text.length, at + 320))
            };
        }
        return { found: false, marker: '', textSample: '' };
    }

    const variableDependencyProfile = buildVariableDependencyProfile(descriptors);
    let lastVariableDiagnosticSignature = '';

    function reportVariableReadinessIfNeeded(trigger) {
        if (!variableDependencyProfile.usesVariables) return;
        if (typeof window.__cardRuntimeVariableReadinessSnapshot !== 'function') return;
        const snapshot = window.__cardRuntimeVariableReadinessSnapshot();
        const chat = snapshot && snapshot.chat || {};
        const missingReads = Array.isArray(snapshot && snapshot.missingPaths) ? snapshot.missingPaths : [];
        const missingChatState = variableDependencyProfile.requiresChatState && Number(chat.stateKeyCount || 0) === 0;
        const missingAllVariables = variableDependencyProfile.usesVariableApi && Number(snapshot && snapshot.totalKeyCount || 0) === 0;
        const literalPathProbes = probeLiteralVariablePaths(variableDependencyProfile);
        const missingLiteralPaths = literalPathProbes.filter(function (probe) { return probe.exists === false; });
        const uiReadiness = detectVariableReadinessUi();
        if (!missingChatState && !missingAllVariables && missingReads.length === 0 && missingLiteralPaths.length === 0 && !uiReadiness.found) return;

        const signature = JSON.stringify({
            missingChatState: missingChatState,
            missingAllVariables: missingAllVariables,
            missingReads: missingReads,
            missingLiteralPaths: missingLiteralPaths.map(function (probe) { return probe.kind + ':' + probe.path; }),
            uiMarker: uiReadiness.marker,
            chatKeys: chat.stateKeyCount || 0
        });
        if (signature === lastVariableDiagnosticSignature) return;
        lastVariableDiagnosticSignature = signature;

        window._cardStudio.diagnostic(
            'CARD_RUNTIME_VARIABLES_NOT_READY',
            'post-script-readiness',
            'variables',
            uiReadiness.found
                ? 'Giao diện của thẻ vẫn báo biến chưa sẵn sàng dù runtime đã có dữ liệu biến.'
                : 'Thẻ đã chạy nhưng dữ liệu biến mà script cần vẫn chưa sẵn sàng.',
            {
                severity: 'warning',
                scriptId: window.getScriptId ? window.getScriptId() : undefined,
                scriptName: window.getScriptName ? window.getScriptName() : undefined,
                details: {
                    trigger: trigger || 'unspecified',
                    dependencyProfile: variableDependencyProfile,
                    missingChatState: missingChatState,
                    missingAllVariables: missingAllVariables,
                    missingLiteralPaths: missingLiteralPaths,
                    literalPathProbes: literalPathProbes,
                    uiReportedNotReady: uiReadiness.found,
                    uiReadiness: uiReadiness,
                    variableState: snapshot,
                    parentVariableDiagnostics: window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableDiagnostics
                        ? window.__CARD_STUDIO_BOOT__.variableDiagnostics
                        : null,
                    bootVariableScopesPresent: Boolean(window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableScopes),
                    bootVariableScopeNames: window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableScopes
                        ? Object.keys(window.__CARD_STUDIO_BOOT__.variableScopes)
                        : []
                }
            }
        );
    }

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
        Promise.allSettled(asyncTasks).then(function () { reportVariableReadinessIfNeeded('post-async-scripts'); });
    }
    reportVariableReadinessIfNeeded('post-sync-scripts');
    setTimeout(function () { reportVariableReadinessIfNeeded('post-script-settle-250ms'); }, 250);
    setTimeout(function () { reportVariableReadinessIfNeeded('post-script-settle-1200ms'); }, 1200);

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
