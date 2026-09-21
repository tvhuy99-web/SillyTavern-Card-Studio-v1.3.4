// Build-time template. The compatibility API token is replaced by build/build-card-runtime.mjs.
(function registerCardRuntimeCore(root) {
  if (root.__STS_START_CARD_RUNTIME__) return;

  root.__STS_START_CARD_RUNTIME__ = function startCardRuntimeCore(boot) {
    if (!boot || typeof boot !== 'object') throw new TypeError('Card Runtime BOOT payload must be an object.');

(function () {
    'use strict';
    const BOOT = boot;
    const HELPER_VERSION = '4.8.19';
    const TAVERN_VERSION = '1.18.0';
    const IMPLEMENTATION_VERSION = '4.8.19-compat.12';
    const root = window;
    const FULL_COMPATIBILITY_MODE = BOOT.context.compatibilityMode !== 'safe';
    const OFFICIAL_LOCAL_ENGINE = BOOT.context.engineMode === 'official-local';
    root.global = root;
    root.process = { env: { NODE_ENV: 'production' } };
    root.setImmediate = root.setImmediate || function (fn) { return setTimeout(fn, 0); };
    root.clearImmediate = root.clearImmediate || clearTimeout;
    root.is_mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    root.is_colab = false;
    root.power_user = { allow_local_fetch: FULL_COMPATIBILITY_MODE, markdown_escape_strings: '' };

    function updateOfficialViewportHeight() {
        if (!OFFICIAL_LOCAL_ENGINE || !document || !document.documentElement?.style?.setProperty) return;
        let height = root.innerHeight || 0;
        try { height = root.parent && root.parent.innerHeight || height; } catch (_) {}
        document.documentElement.style.setProperty('--TH-viewport-height', Math.max(1, Number(height) || 1) + 'px');
    }
    updateOfficialViewportHeight();
    root.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'TH_UPDATE_VIEWPORT_HEIGHT') updateOfficialViewportHeight();
    });

    if (document && typeof document.addEventListener === 'function') {
        const nativeDocumentAddEventListener = document.addEventListener.bind(document);
        document.addEventListener = function (type, listener, options) {
            if (type === 'DOMContentLoaded' && document.readyState !== 'loading' && typeof listener === 'function') {
                setTimeout(function () { listener.call(document, new Event('DOMContentLoaded')); }, 0);
                return;
            }
            return nativeDocumentAddEventListener(type, listener, options);
        };
    }

    function clone(value) {
        if (value === undefined) return value;
        try { return structuredClone(value); } catch (_) {}
        try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
    }

    function asObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function safeString(value, max) {
        return String(value == null ? '' : value).slice(0, max || 2000000);
    }

    function uuid() {
        if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });
    }

    function log(level, message, payload) {
        try {
            root.parent.postMessage({
                type: 'iframe-log',
                payload: {
                    level: level || 'log',
                    source: 'card-runtime',
                    message: safeString(message, 20000),
                    payload: payload === undefined ? undefined : clone(payload),
                    timestamp: Date.now()
                }
            }, '*');
        } catch (_) {}
    }

    const DIAGNOSTIC_SUGGESTIONS = {
        CARD_RUNTIME_BOOTSTRAP_FAILED: 'Kiểm tra phần bootstrap của runtime và thư viện được nạp trước khi script thẻ bắt đầu chạy.',
        CARD_RUNTIME_DEPENDENCY_MISSING: 'Kiểm tra kết nối mạng/CDN hoặc ánh xạ thư viện. Tên thư viện thiếu nằm trong trường chi tiết của báo cáo.',
        CARD_RUNTIME_COMPAT_API_MISSING: 'API tương thích mà thẻ đang gọi chưa tồn tại trong runtime. Kiểm tra missingIdentifier và phiên bản tương thích, sau đó bổ sung hoặc ánh xạ API tương ứng.',
        CARD_RUNTIME_HTML_PARSE_FAILED: 'Kiểm tra cấu trúc HTML đầu vào, đặc biệt là thẻ chưa đóng hoặc thuộc tính hỏng.',
        CARD_RUNTIME_IMPORTMAP_INVALID: 'Kiểm tra JSON trong import map. Runtime sẽ bỏ qua import map hỏng và tiếp tục bằng ánh xạ mặc định.',
        CARD_RUNTIME_EJS_RENDER_FAILED: 'Kiểm tra cú pháp EJS và các biến được truy cập trong template.',
        CARD_RUNTIME_SCRIPT_FAILED: 'Kiểm tra scriptId, scriptName và stack trace để tìm dòng lỗi trong card-runtime-*.js.',
        CARD_RUNTIME_CALLBACK_EXPECTED_FUNCTION: 'Một API hoặc callback mà script truyền vào không phải hàm. Xem lodashMethod, argumentTypes, scriptId và scriptName để xác định chính xác callback hoặc API tương thích bị thiếu.',
        CARD_RUNTIME_RESOURCE_LOAD_FAILED: 'Kiểm tra URL tài nguyên, <base href>, kết nối mạng, CORS và tài nguyên nhúng của CHARX.',
        CARD_RUNTIME_PROMISE_REJECTION: 'Kiểm tra promise không có catch trong script thẻ.',
        CARD_RUNTIME_RPC_TIMEOUT: 'Kiểm tra phương thức RPC và xem luồng xử lý phía ứng dụng có bị treo hay không.',
        CARD_RUNTIME_RPC_FAILED: 'Kiểm tra tên phương thức RPC, tham số và lỗi gốc phía ứng dụng.',
        CARD_RUNTIME_RPC_UNSUPPORTED: 'API này chưa được môi trường hỗ trợ. Kiểm tra TavernHelper.capabilities trước khi gọi.',
        CARD_RUNTIME_PAYLOAD_TOO_LARGE: 'Giảm kích thước dữ liệu gửi qua cầu nối hoặc chia thành nhiều phần nhỏ hơn.',
        CARD_RUNTIME_STORAGE_FAILED: 'Kiểm tra quota bộ nhớ và dữ liệu có thể tuần tự hóa thành JSON hay không.',
        CARD_RUNTIME_RENDER_FAILED: 'Kiểm tra HTML được render, script khởi tạo giao diện và lỗi DOM xuất hiện trước báo cáo này.',
        CARD_RUNTIME_SANDBOX_BLOCKED: 'Dùng API cầu nối thay vì truy cập trực tiếp cửa sổ cha hoặc backend SillyTavern.',
        CARD_RUNTIME_HUD_SNAPSHOT_FAILED: 'Kiểm tra iframe nguồn còn hoạt động hay không rồi đóng/mở lại HUD.',
        CARD_RUNTIME_STREAM_PREVIEW_FAILED: 'HTML đang stream chưa hoàn chỉnh. Runtime đầy đủ vẫn sẽ được dựng khi AI trả lời xong.',
        CARD_RUNTIME_UNKNOWN_ERROR: 'Gửi toàn bộ báo cáo chẩn đoán để khoanh vùng chính xác.'
    };

    function diagnostic(code, phase, component, message, details) {
        const payload = Object.assign({
            id: 'card-diagnostic-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            code: code || 'CARD_RUNTIME_UNKNOWN_ERROR',
            severity: details && details.severity || 'error',
            phase: phase || 'unknown',
            component: component || 'card-runtime',
            message: safeString(message || 'Unknown card runtime error', 20000),
            suggestion: DIAGNOSTIC_SUGGESTIONS[code] || DIAGNOSTIC_SUGGESTIONS.CARD_RUNTIME_UNKNOWN_ERROR,
            timestamp: Date.now(),
            messageId: BOOT.context.messageId,
            characterId: BOOT.context.characterKey,
            chatId: BOOT.context.chatId
        }, clone(details || {}));
        try { root.parent.postMessage({ type: 'CARD_RUNTIME_DIAGNOSTIC', payload: payload }, '*'); } catch (_) {}
        return payload;
    }

    root._cardStudio = { log: log, diagnostic: diagnostic, version: HELPER_VERSION, implementationVersion: IMPLEMENTATION_VERSION, engineMode: BOOT.context.engineMode || 'current', sandboxed: !FULL_COMPATIBILITY_MODE, fullCompatibility: FULL_COMPATIBILITY_MODE };
    root.__cardRuntimeDiagnosticsReady = true;
    if (root.__cardRuntimeBootState) {
        root.__cardRuntimeBootState.phase = 'diagnostics-ready';
        root.__cardRuntimeBootState.diagnosticsReadyAt = Date.now();
    }

    const missingDependencies = [];
    if (!root.Vue) missingDependencies.push('Vue');
    if (!root.Pinia) missingDependencies.push('Pinia');
    if (!root.VueRouter) missingDependencies.push('VueRouter');
    if (!root.PIXI) missingDependencies.push('PIXI');
    if (!root._) missingDependencies.push('lodash');
    if (!root.jQuery) missingDependencies.push('jQuery');
    if (!root.jQuery || !root.jQuery.ui) missingDependencies.push('jQuery UI');
    if (!root.ejs) missingDependencies.push('EJS');
    if (!root.showdown) missingDependencies.push('showdown');
    if (!root.toastr) missingDependencies.push('toastr');
    if (missingDependencies.length) {
        diagnostic('CARD_RUNTIME_DEPENDENCY_MISSING', 'bootstrap', 'dependency-loader', 'Thiếu thư viện runtime bắt buộc: ' + missingDependencies.join(', '), { details: { missingDependencies: missingDependencies } });
    }
    // Preserve Lodash behavior while enriching its otherwise vague "Expected a function" error.
    if (root._) {
        ['debounce','throttle','once','negate','memoize','unary','ary','before','after','delay','defer','flow','flowRight','over','overEvery','overSome'].forEach(function (methodName) {
            const original = root._[methodName];
            if (typeof original !== 'function' || original.__cardRuntimeWrapped) return;
            const wrapped = function () {
                try { return original.apply(this, arguments); }
                catch (error) {
                    if (error && String(error.message || error).includes('Expected a function')) {
                        diagnostic('CARD_RUNTIME_CALLBACK_EXPECTED_FUNCTION', 'script-execution', 'lodash.' + methodName, String(error.message || error), {
                            stack: error.stack, scriptId: activeScriptId, scriptName: activeScriptName, method: 'lodash.' + methodName,
                            details: { lodashMethod: methodName, argumentTypes: Array.prototype.map.call(arguments, function (value) { return value === null ? 'null' : typeof value; }), undefinedArgumentIndexes: Array.prototype.reduce.call(arguments, function (indexes, value, index) { if (value === undefined) indexes.push(index); return indexes; }, []), runtimeVersion: IMPLEMENTATION_VERSION }
                        });
                        try { error.__cardRuntimeCallbackDiagnosed = true; } catch (_) {}
                    }
                    throw error;
                }
            };
            try { Object.defineProperty(wrapped, '__cardRuntimeWrapped', { value: true }); } catch (_) { wrapped.__cardRuntimeWrapped = true; }
            root._[methodName] = wrapped;
        });
    }
    root.sendMessageToParent = function (type, payload) { root.parent.postMessage({ type: type, payload: payload }, '*'); };
    root.receiveMessageFromParent = function (handler) {
        const wrapped = function (event) { if (event.source === root.parent) handler(event.data); };
        root.addEventListener('message', wrapped);
        return function () { root.removeEventListener('message', wrapped); };
    };

    root.addEventListener('error', function (event) {
        const target = event.target;
        if (target && target.tagName && !target.getAttribute('data-card-runtime-fallback')) {
            const tag = String(target.tagName).toUpperCase();
            if (tag === 'IMG') {
                target.setAttribute('data-card-runtime-fallback', 'true');
                const label = safeString((target.getAttribute('src') || 'image').split('/').pop(), 40);
                const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" fill="#cbd5e1" text-anchor="middle" font-family="sans-serif">' + label.replace(/[<>&]/g, '') + '</text></svg>';
                target.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
                return;
            }
        }
        const resourceUrl = target && (target.src || target.href) || undefined;
        if (target && target.tagName && resourceUrl) {
            diagnostic('CARD_RUNTIME_RESOURCE_LOAD_FAILED', 'resource-load', String(target.tagName).toLowerCase(), 'Không thể tải tài nguyên của thẻ.', { resourceUrl: resourceUrl, details: { tagName: String(target.tagName) } });
        }
        if (event.error || event.message) {
            const stack = event.error && event.error.stack;
            const message = event.message || 'Card script failed';
            const missingMatch = safeString(message, 10000).match(/(?:ReferenceError:\s*)?([A-Za-z_$][\w$]*) is not defined/);
            const missingIdentifier = missingMatch && missingMatch[1];
            const libraryGlobals = ['Vue','VueRouter','Pinia','PIXI','YAML','jsyaml','jQuery','$','_','z','Zod','showdown','toastr','ejs'];
            const compatibilityGlobals = ['getAllVariables','getVariables','replaceVariables','updateVariablesWith','insertVariables','insertOrAssignVariables','deleteVariable','reloadIframe','getIframeName','getMessageId','getCurrentMessageId','getScriptId','getScriptName','getScriptInfo','getScriptButtons','substitudeMacros','substituteMacros','TavernHelper','SillyTavern','eventSource','eventOn','eventEmit'];
            log('script-error', message, { stack: stack, missingIdentifier: missingIdentifier });
            if (missingIdentifier && libraryGlobals.indexOf(missingIdentifier) >= 0) {
                diagnostic('CARD_RUNTIME_DEPENDENCY_MISSING', 'script-execution', 'dependency-global', message, { stack: stack, scriptId: activeScriptId, scriptName: activeScriptName, details: { missingIdentifier: missingIdentifier, runtimeVersion: IMPLEMENTATION_VERSION } });
            } else if (missingIdentifier && compatibilityGlobals.indexOf(missingIdentifier) >= 0) {
                diagnostic('CARD_RUNTIME_COMPAT_API_MISSING', 'script-execution', 'compatibility-api', message, { stack: stack, scriptId: activeScriptId, scriptName: activeScriptName, details: { missingIdentifier: missingIdentifier, targetTavernHelperVersion: HELPER_VERSION, runtimeVersion: IMPLEMENTATION_VERSION } });
            } else if (String(message).includes('Expected a function') && !(event.error && event.error.__cardRuntimeCallbackDiagnosed)) {
                diagnostic('CARD_RUNTIME_CALLBACK_EXPECTED_FUNCTION', 'script-execution', 'callback', message, { stack: stack, scriptId: activeScriptId, scriptName: activeScriptName, details: { runtimeVersion: IMPLEMENTATION_VERSION, hint: 'A callback or TavernHelper compatibility API was undefined/non-callable.' } });
            } else if (!(event.error && event.error.__cardRuntimeCallbackDiagnosed)) {
                diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'script-execution', 'window-error', message, { stack: stack, scriptId: activeScriptId, scriptName: activeScriptName, details: missingIdentifier ? { missingIdentifier: missingIdentifier } : undefined });
            }
        }
    }, true);
    root.addEventListener('unhandledrejection', function (event) {
        const reason = event.reason;
        if (String(reason && reason.message || reason).includes('play() request was interrupted')) return;
        if (reason && reason.__cardRuntimeBootstrapFailure) {
            if (!reason.__cardRuntimeBootstrapReported) {
                diagnostic('CARD_RUNTIME_BOOTSTRAP_FAILED', 'bootstrap-promise', 'runtime-bootstrap', safeString(reason.message || reason, 10000), {
                    stack: reason.stack,
                    details: {
                        bootstrapCode: reason.cardRuntimeBootstrapCode || 'CARD_RUNTIME_BOOTSTRAP_FAILED',
                        bootState: clone(reason.cardRuntimeBootState || root.__cardRuntimeBootState || {})
                    }
                });
            }
            return;
        }
        const message = 'Unhandled promise rejection: ' + safeString(reason && reason.message || reason, 10000);
        log('script-error', message, { stack: reason && reason.stack });
        diagnostic('CARD_RUNTIME_PROMISE_REJECTION', 'async-execution', 'promise', message, { stack: reason && reason.stack, scriptId: activeScriptId });
    });

/*__STS_MODULE_BRIDGE_RPC__*//*__STS_MODULE_EVENTS__*//*__STS_MODULE_VARIABLES__*//*__STS_MODULE_CHAT__*//*__STS_MODULE_MACROS__*//*__STS_MODULE_GENERATION__*/    const CAPABILITIES = Object.freeze({
        runtime: FULL_COMPATIBILITY_MODE ? 'full-card-runtime' : 'isolated-card-runtime',
        targetTavernHelperVersion: '4.8.19',
        compatibilityVersion: IMPLEMENTATION_VERSION,
        piniaMajor: 3,
        vueRouterMajor: 5,
        zodMajor: 4,
        chat: true,
        variables: true,
        generation: true,
        lorebook: true,
        regex: true,
        presetReadLoad: true,
        presetWrite: true,
        characterRead: true,
        characterWrite: true,
        personaRead: true,
        personaWrite: true,
        groupChat: false,
        extensionManagement: false,
        rawImport: OFFICIAL_LOCAL_ENGINE,
        scriptButtons: true,
        scriptTrees: true,
        hudMirror: true,
        streamingPreview: true,
        toolCalling: false,
        structuredOutput: false,
        providerParity: false,
        parentDomCompatibility: FULL_COMPATIBILITY_MODE,
        fullCompatibility: FULL_COMPATIBILITY_MODE
    });
    function unsupported(name) {
        return function () {
            const message = name + ' is unavailable in the isolated card runtime.';
            diagnostic('CARD_RUNTIME_RPC_UNSUPPORTED', 'api-call', 'TavernHelper', message, { method: name, scriptId: activeScriptId, details: { capabilities: CAPABILITIES } });
            return Promise.reject(new Error(message));
        };
    }
    root.isAdmin = function () { return false; };
    root.getExtensionType = function () { return 'third-party'; };
    root.getExtensionStatus = function (id) { return { id: id, installed: id === 'third-party/JS-Slash-Runner', enabled: id === 'third-party/JS-Slash-Runner', type: 'third-party' }; };
    root.getExtensionInstallationInfo = root.getExtensionStatus;
    root.isInstalledExtension = function (id) { return id === 'third-party/JS-Slash-Runner' || id === 'JS-Slash-Runner'; };
    ['installExtension', 'uninstallExtension', 'reinstallExtension', 'updateExtension', 'importRawCharacter', 'importRawChat', 'importRawPreset', 'importRawWorldbook', 'importRawTavernRegex'].forEach(function (name) { root[name] = unsupported(name); });
    root.getCharacterNames = function () { return [BOOT.context.name2]; };
    root.getCharacterIds = function () { return [0]; };
    root.getCurrentCharacterName = function () { return BOOT.context.name2; };
    root.getCurrentCharacterId = function () { return 0; };
    root.getCharacter = function (idOrName) {
        if (idOrName === undefined || idOrName === 0 || idOrName === BOOT.context.name2) return Promise.resolve(clone(BOOT.characterCard));
        return Promise.resolve(null);
    };
    root.getCharData = function () { return clone(BOOT.characterCard); };
    root.getCharAvatarPath = function () { return BOOT.characterAvatar; };
    root.RawCharacter = class RawCharacter { constructor(data) { Object.assign(this, clone(data || BOOT.characterCard)); } };
    root.getChatHistoryBrief = function () { return Promise.resolve([{ file_name: BOOT.context.chatId, last_mes: chatHistory.length ? chatHistory[chatHistory.length - 1].message : '' }]); };
    root.getChatHistoryDetail = function () { return Promise.resolve(clone(chatHistory)); };
    ['createCharacter', 'createOrReplaceCharacter', 'deleteCharacter', 'replaceCharacter', 'updateCharacterWith'].forEach(function (name) { root[name] = unsupported(name); });

    root.getPersonaNames = function () { return [BOOT.context.name1]; };
    root.getPersonaIds = function () { return [BOOT.context.personaId || 'current']; };
    root.getCurrentPersonaName = function () { return BOOT.context.name1; };
    root.getCurrentPersonaId = function () { return BOOT.context.personaId || 'current'; };
    root.getPersonaAvatarPath = function () { return BOOT.userAvatar; };
    root.getPersona = function () { return Promise.resolve({ id: root.getCurrentPersonaId(), name: BOOT.context.name1, avatar: BOOT.userAvatar }); };
    ['createPersona', 'createOrReplacePersona', 'deletePersona', 'replacePersona', 'updatePersonaWith'].forEach(function (name) { root[name] = unsupported(name); });

    root.getPresetNames = function () { return BOOT.context.presetName ? [BOOT.context.presetName] : []; };
    root.getLoadedPresetName = function () { return BOOT.context.presetName || ''; };
    root.getPreset = function () { return rpc('preset.get', {}, 30000); };
    root.loadPreset = function (name) { return rpc('preset.load', { name: name }, 60000); };
    root.default_preset = {};
    root.isPresetNormalPrompt = function () { return true; };
    root.isPresetSystemPrompt = function (prompt) { return Boolean(prompt && prompt.role === 'system'); };
    root.isPresetPlaceholderPrompt = function (prompt) { return Boolean(prompt && prompt.marker); };
    ['createPreset', 'createOrReplacePreset', 'deletePreset', 'renamePreset', 'replacePreset', 'updatePresetWith', 'setPreset'].forEach(function (name) { root[name] = unsupported(name); });

/*__STS_MODULE_WORLDBOOK__*//*__STS_MODULE_REGEX__*//*__STS_MODULE_AUDIO__*//*__STS_MODULE_STORAGE__*//*__STS_MODULE_BRIDGE_NETWORK__*//*__STS_MODULE_ACCESSIBILITY__*//*__STS_MODULE_SCRIPTS__*//*__STS_MODULE_VARIABLES_MVU__*//*__STS_MODULE_BRIDGE_CONTEXT__*//*__STS_MODULE_HUD__*//*__STS_MODULE_BRIDGE_HANDSHAKE__*/    root.EjsTemplate = { setFeatures: function() {} };
/*__STS_COMPATIBILITY_API__*/
    if (root.z && root.z.ZodType) {
        root.z.ZodType.prototype.prefault = root.z.ZodType.prototype.default;
    }
    
    root.parent.postMessage({ type: 'HANDSHAKE_INIT', payload: { messageId: BOOT.context.messageId } }, '*');
    handshakeTimeout = setTimeout(function () {
        if (handshakeSettled) return;
        handshakeSettled = true;
        handshakeTimeout = 0;
        const message = 'Card Runtime handshake timed out before HANDSHAKE_ACK.';
        if (root.__cardRuntimeBootState) {
            root.__cardRuntimeBootState.phase = 'handshake-timeout';
            root.__cardRuntimeBootState.handshakeTimeoutAt = Date.now();
        }
        diagnostic('CARD_RUNTIME_RPC_TIMEOUT', 'handshake', 'bridge', message, { method: 'HANDSHAKE_INIT' });
        readyReject(new Error(message));
    }, 5000);
})();
    return root.__cardRuntimeHandshakeReady;
  };
})(window);
