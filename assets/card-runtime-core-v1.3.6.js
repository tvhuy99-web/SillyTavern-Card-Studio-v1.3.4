// Build-time template. The compatibility API token is replaced by build/build-card-runtime.mjs.
export function startCardRuntimeCore(boot) {
  if (!boot || typeof boot !== 'object') throw new TypeError('Card Runtime BOOT payload must be an object.');

(function () {
    'use strict';
    const BOOT = boot;
    const HELPER_VERSION = '4.8.19';
    const TAVERN_VERSION = '1.18.0';
    const IMPLEMENTATION_VERSION = '4.8.19-compat.11';
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
        const message = 'Unhandled promise rejection: ' + safeString(reason && reason.message || reason, 10000);
        log('script-error', message, { stack: reason && reason.stack });
        diagnostic('CARD_RUNTIME_PROMISE_REJECTION', 'async-execution', 'promise', message, { stack: reason && reason.stack, scriptId: activeScriptId });
    });

    const pendingRpc = new Map();
    function rpc(method, args, timeoutMs) {
        const requestId = uuid();
        return new Promise(function (resolve, reject) {
            const timeout = setTimeout(function () {
                pendingRpc.delete(requestId);
                const message = 'Card runtime request timed out: ' + method;
                diagnostic('CARD_RUNTIME_RPC_TIMEOUT', 'rpc', 'bridge', message, { method: method, scriptId: activeScriptId });
                reject(new Error(message));
            }, Math.max(1000, timeoutMs || 30000));
            pendingRpc.set(requestId, { resolve: resolve, reject: reject, timeout: timeout });
            root.parent.postMessage({
                type: 'CARD_RUNTIME_RPC',
                requestId: requestId,
                method: method,
                args: clone(args || {}),
                context: clone(BOOT.context)
            }, '*');
        });
    }
    root.cardRuntimeRpc = rpc;

    const eventListeners = new Map();
    const eventListenerWrappers = new Map();
    function listenersFor(name) {
        if (!eventListeners.has(name)) eventListeners.set(name, []);
        return eventListeners.get(name);
    }
    function wrappersFor(name) {
        if (!eventListenerWrappers.has(name)) eventListenerWrappers.set(name, new Map());
        return eventListenerWrappers.get(name);
    }
    function normalizeEventName(name) {
        return String(name == null ? '' : name);
    }
    function makeEventSubscription(name, listener) {
        let stopped = false;
        return {
            stop: function () {
                if (stopped) return;
                stopped = true;
                root.eventRemoveListener(name, listener);
            }
        };
    }
    async function emitEvent(name) {
        name = normalizeEventName(name);
        const args = Array.prototype.slice.call(arguments, 1);
        const listeners = (eventListeners.get(name) || []).slice();
        for (const listener of listeners) {
            try { await listener.apply(root, args); } catch (error) { log('script-error', 'Event listener failed: ' + name, { stack: error && error.stack, scriptId: activeScriptId }); }
        }
        try { root.dispatchEvent(new CustomEvent(name, { detail: args.length <= 1 ? args[0] : args })); } catch (_) {}
    }
    function addEvent(name, listener, position, once) {
        name = normalizeEventName(name);
        if (typeof listener !== 'function') {
            log('script-error', 'Ignored invalid event listener for "' + name + '": expected a function, received ' + typeof listener, { scriptId: activeScriptId });
            return { stop: function () {} };
        }
        const wrapperMap = wrappersFor(name);
        let wrapped = wrapperMap.get(listener);
        if (!wrapped) {
            wrapped = async function () {
                if (once) root.eventRemoveListener(name, listener);
                return listener.apply(root, arguments);
            };
            wrapperMap.set(listener, wrapped);
        }
        const list = listenersFor(name);
        const existingIndex = list.indexOf(wrapped);
        if (existingIndex >= 0 && position) list.splice(existingIndex, 1);
        if (!list.includes(wrapped)) position === 'first' ? list.unshift(wrapped) : list.push(wrapped);
        return makeEventSubscription(name, listener);
    }
    root.eventOn = function (name, listener) { return addEvent(name, listener); };
    root.eventMakeFirst = function (name, listener) { return addEvent(name, listener, 'first'); };
    root.eventMakeLast = function (name, listener) { return addEvent(name, listener, 'last'); };
    root.eventOnce = function (name, listener) { return addEvent(name, listener, undefined, true); };
    root.eventWaitOnce = function (name) { return new Promise(function (resolve) { root.eventOnce(name, resolve); }); };
    root.eventRemoveListener = function (name, listener) {
        if (typeof name === 'function' && listener === undefined) return root.eventClearListener(name);
        name = normalizeEventName(name);
        const list = eventListeners.get(name);
        const wrapperMap = eventListenerWrappers.get(name);
        if (!list || !wrapperMap) return;
        const wrapped = wrapperMap.get(listener) || listener;
        let index;
        while ((index = list.indexOf(wrapped)) >= 0) list.splice(index, 1);
        wrapperMap.forEach(function (candidate, original) {
            if (candidate === wrapped || original === listener) wrapperMap.delete(original);
        });
        if (list.length === 0) eventListeners.delete(name);
        if (wrapperMap.size === 0) eventListenerWrappers.delete(name);
    };
    root.eventClearEvent = function (name) {
        name = normalizeEventName(name);
        eventListeners.delete(name);
        eventListenerWrappers.delete(name);
    };
    root.eventClearListener = function (listener) {
        Array.from(eventListenerWrappers.keys()).forEach(function (name) { root.eventRemoveListener(name, listener); });
    };
    root.eventClearAll = function (name) {
        if (name !== undefined) return root.eventClearEvent(name);
        eventListeners.clear();
        eventListenerWrappers.clear();
    };
    root.addEventListener('pagehide', function () { root.eventClearAll(); }, { once: true });
    root.eventEmit = emitEvent;
    root.eventEmitAndWait = emitEvent;
    root.eventOnButton = function (buttonName, listener) { return root.eventOn(root.getButtonEvent ? root.getButtonEvent(buttonName) : 'btn_click_' + buttonName, listener); };

    root.iframe_events = Object.freeze({
        MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
        MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
        GENERATION_STARTED: 'js_generation_started',
        STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully',
        STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally',
        GENERATION_ENDED: 'js_generation_ended'
    });
    root.tavern_events = Object.freeze({
        APP_READY: 'app_ready', EXTRAS_CONNECTED: 'extras_connected', MESSAGE_SWIPED: 'message_swiped',
        MESSAGE_SENT: 'message_sent', MESSAGE_RECEIVED: 'message_received', MESSAGE_EDITED: 'message_edited',
        MESSAGE_DELETED: 'message_deleted', MESSAGE_UPDATED: 'message_updated', MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
        MESSAGE_REASONING_EDITED: 'message_reasoning_edited', MESSAGE_REASONING_DELETED: 'message_reasoning_deleted',
        MESSAGE_SWIPE_DELETED: 'message_swipe_deleted', MORE_MESSAGES_LOADED: 'more_messages_loaded',
        IMPERSONATE_READY: 'impersonate_ready', CHAT_CHANGED: 'chat_id_changed', GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
        GENERATION_STARTED: 'generation_started', GENERATION_STOPPED: 'generation_stopped', GENERATION_ENDED: 'generation_ended',
        SD_PROMPT_PROCESSING: 'sd_prompt_processing', EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
        EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded', SETTINGS_LOADED: 'settings_loaded', SETTINGS_UPDATED: 'settings_updated',
        MOVABLE_PANELS_RESET: 'movable_panels_reset', SETTINGS_LOADED_BEFORE: 'settings_loaded_before', SETTINGS_LOADED_AFTER: 'settings_loaded_after',
        CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed', CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',
        OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before', OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',
        OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready', OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',
        WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated', WORLDINFO_UPDATED: 'worldinfo_updated',
        CHARACTER_EDITOR_OPENED: 'character_editor_opened', CHARACTER_EDITED: 'character_edited', CHARACTER_PAGE_LOADED: 'character_page_loaded',
        USER_MESSAGE_RENDERED: 'user_message_rendered', CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
        FORCE_SET_BACKGROUND: 'force_set_background', CHAT_DELETED: 'chat_deleted', CHAT_CREATED: 'chat_created',
        GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts', GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
        GENERATE_AFTER_DATA: 'generate_after_data', WORLD_INFO_ACTIVATED: 'world_info_activated',
        TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready', CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
        CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready', CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
        CHARACTER_DELETED: 'characterDeleted', CHARACTER_DUPLICATED: 'character_duplicated', CHARACTER_RENAMED: 'character_renamed',
        CHARACTER_RENAMED_IN_PAST_CHAT: 'character_renamed_in_past_chat', SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',
        STREAM_TOKEN_RECEIVED: 'stream_token_received', STREAM_REASONING_DONE: 'stream_reasoning_done',
        FILE_ATTACHMENT_DELETED: 'file_attachment_deleted', WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
        OPEN_CHARACTER_LIBRARY: 'open_character_library', ONLINE_STATUS_CHANGED: 'online_status_changed', IMAGE_SWIPED: 'image_swiped',
        CONNECTION_PROFILE_LOADED: 'connection_profile_loaded', CONNECTION_PROFILE_CREATED: 'connection_profile_created',
        CONNECTION_PROFILE_DELETED: 'connection_profile_deleted', CONNECTION_PROFILE_UPDATED: 'connection_profile_updated',
        TOOL_CALLS_PERFORMED: 'tool_calls_performed', TOOL_CALLS_RENDERED: 'tool_calls_rendered',
        CHARACTER_MANAGEMENT_DROPDOWN: 'charManagementDropdown', SECRET_WRITTEN: 'secret_written', SECRET_DELETED: 'secret_deleted',
        SECRET_ROTATED: 'secret_rotated', SECRET_EDITED: 'secret_edited', PRESET_CHANGED: 'preset_changed', PRESET_DELETED: 'preset_deleted',
        PRESET_RENAMED: 'preset_renamed', PRESET_RENAMED_BEFORE: 'preset_renamed_before', MAIN_API_CHANGED: 'main_api_changed',
        WORLDINFO_ENTRIES_LOADED: 'worldinfo_entries_loaded', WORLDINFO_SCAN_DONE: 'worldinfo_scan_done', MEDIA_ATTACHMENT_DELETED: 'media_attachment_deleted'
    });
    root.event_types = root.tavern_events;
    root.eventSource = {
        on: root.eventOn,
        once: root.eventOnce,
        makeFirst: root.eventMakeFirst,
        makeLast: root.eventMakeLast,
        emit: root.eventEmit,
        emitAndWait: root.eventEmitAndWait,
        removeListener: root.eventRemoveListener,
        removeAllListeners: root.eventClearAll
    };

    let chatHistory = clone(BOOT.chatHistory || []);
    let worldInfo = clone(BOOT.worldInfo || []);
    let extensionSettings = clone(BOOT.extensionSettings || {});
    const scopeCache = new Map(Object.entries(BOOT.variableScopes || {}).map(function (entry) { return [entry[0], clone(asObject(entry[1]))]; }));
    const schemaCache = new Map();
    let activeScriptId = 'default';
    let activeScriptName = 'default';
    let activeScriptInfo = '';
    let activeScriptButtons = [];
    const scriptRegistry = new Map();

    function resolveIndex(messageId) {
        if (!chatHistory.length) return -1;
        if (messageId === undefined || messageId === 'latest') return chatHistory.length - 1;
        const id = Math.trunc(Number(messageId));
        return id < 0 ? chatHistory.length + id : id;
    }
    function normalizeOption(option) { return Object.assign({ type: 'chat' }, option || {}); }
    function scopeKey(option) {
        const normalized = normalizeOption(option);
        if (normalized.type === 'message') return 'message:' + resolveIndex(normalized.message_id);
        if (normalized.type === 'script') return 'script:' + (normalized.script_id || activeScriptId || 'default');
        if (normalized.type === 'extension') return 'extension:' + (normalized.extension_id || 'unknown');
        return normalized.type;
    }
    function scopeValue(option) {
        const key = scopeKey(option);
        if (!scopeCache.has(key)) scopeCache.set(key, {});
        return scopeCache.get(key);
    }
    function validateScopeValue(key, variables) {
        const schema = schemaCache.get(key);
        if (!schema) return clone(asObject(variables));
        try {
            if (typeof schema.parse === 'function') return clone(asObject(schema.parse(variables)));
            if (typeof schema.safeParse === 'function') {
                const result = schema.safeParse(variables);
                if (!result || result.success !== true) throw new Error('Variable schema validation failed for ' + key);
                return clone(asObject(result.data));
            }
        } catch (error) {
            diagnostic('CARD_RUNTIME_STORAGE_FAILED', 'variables', 'schema-validation', error && error.message || String(error), { method: 'replaceVariables', details: { scope: key } });
            throw error;
        }
        return clone(asObject(variables));
    }
    function persistScope(option, variables) {
        const normalized = normalizeOption(option);
        if (normalized.type === 'script' && !normalized.script_id) normalized.script_id = activeScriptId || 'default';
        if (normalized.type === 'message' && normalized.message_id === undefined) normalized.message_id = 'latest';
        const key = scopeKey(normalized);
        const previous = clone(scopeValue(normalized));
        const clean = validateScopeValue(key, variables);
        scopeCache.set(key, clean);
        if (normalized.type === 'chat') {
            root.__st_live_data = clean;
            root.stat_data = clean && clean.stat_data ? clean.stat_data : clean;
        }
        emitEvent('mvu-variable-update-started', { scope: normalized, variables: clone(clean) });
        rpc('variables.replace', { option: normalized, variables: clean }, 30000).then(function () {
            emitEvent('mvu-variable-update-ended', { scope: normalized, variables: clone(clean), stat_data: root.stat_data });
        }).catch(function (error) {
            scopeCache.set(key, previous);
            if (normalized.type === 'chat') {
                root.__st_live_data = previous;
                root.stat_data = previous && previous.stat_data ? previous.stat_data : previous;
            }
            emitEvent('mvu-variable-update-ended', { scope: normalized, variables: clone(previous), error: error && error.message });
            log('warn', 'Could not persist ' + key + ' variables; local state was rolled back: ' + error.message);
        });
        return clone(clean);
    }
    root.getVariables = function (option) { return clone(scopeValue(option)); };
    function getNearestMessageVariables(messageId) {
        let index = resolveIndex(messageId === undefined ? BOOT.context.messageId : messageId);
        if (index < 0) return {};
        for (; index >= 0; index -= 1) {
            const key = 'message:' + index;
            const value = scopeCache.get(key);
            if (value && Object.keys(asObject(value)).length > 0) return clone(value);
        }
        return {};
    }
    root.getAllVariables = function () {
        // TavernHelper 4.8.19: global -> character -> (script outside message iframes)
        // -> chat -> every message-variable layer up to the current message.
        // Preset variables are intentionally not merged by the upstream API.
        const merged = {};
        deepMerge(merged, root.getVariables({ type: 'global' }), false);
        deepMerge(merged, root.getVariables({ type: 'character' }), false);
        const isMessageIframe = String(root.getIframeName ? root.getIframeName() : '').startsWith('TH-message');
        if (!isMessageIframe) deepMerge(merged, root.getVariables({ type: 'script', script_id: activeScriptId || 'default' }), false);
        deepMerge(merged, root.getVariables({ type: 'chat' }), false);
        if (isMessageIframe) {
            const currentMessageId = Math.max(-1, Math.min(resolveIndex(BOOT.context.messageId), chatHistory.length - 1));
            for (let index = 0; index <= currentMessageId; index += 1) {
                deepMerge(merged, root.getVariables({ type: 'message', message_id: index }), false);
            }
        }
        return clone(merged);
    };
    root.replaceVariables = function (variables, option) { return persistScope(option, variables); };
    function requireFunctionCallback(apiName, callback) {
        if (typeof callback === 'function') return callback;
        const receivedType = callback === null ? 'null' : typeof callback;
        const message = apiName + ' expected a function callback, received ' + receivedType;
        diagnostic('CARD_RUNTIME_CALLBACK_EXPECTED_FUNCTION', 'api-call', apiName, message, {
            method: apiName, scriptId: activeScriptId, scriptName: activeScriptName,
            details: { receivedType: receivedType, runtimeVersion: IMPLEMENTATION_VERSION }
        });
        const error = new TypeError(message);
        try { error.__cardRuntimeCallbackDiagnosed = true; } catch (_) {}
        throw error;
    }
    root.updateVariablesWith = function (updater, option) {
        updater = requireFunctionCallback('updateVariablesWith', updater);
        const current = root.getVariables(option);
        const result = updater(current);
        if (result && typeof result.then === 'function') {
            return result.then(function (updated) { return persistScope(option, updated === undefined ? current : updated); });
        }
        return persistScope(option, result === undefined ? current : result);
    };
    function deepMerge(target, source, onlyMissing) {
        Object.keys(asObject(source)).forEach(function (key) {
            const next = source[key];
            if (asObject(next) === next) {
                if (asObject(target[key]) !== target[key]) target[key] = {};
                deepMerge(target[key], next, onlyMissing);
            } else if (!onlyMissing || !(key in target)) target[key] = clone(next);
        });
        return target;
    }
    root.insertOrAssignVariables = function (variables, option) {
        return persistScope(option, deepMerge(root.getVariables(option), variables, false));
    };
    root.insertVariables = function (variables, option) {
        return persistScope(option, deepMerge(root.getVariables(option), variables, true));
    };
    function pathParts(path) {
        if (Array.isArray(path)) return path.map(String).filter(function (part) { return part !== ''; });
        const source = String(path == null ? '' : path);
        const parts = [];
        let token = '';
        let quote = '';
        let escaped = false;
        let bracket = false;
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (escaped) { token += char; escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (quote) {
                if (char === quote) quote = '';
                else token += char;
                continue;
            }
            if (bracket && (char === '"' || char === "'")) { quote = char; continue; }
            if (!bracket && char === '.') { if (token !== '') parts.push(token); token = ''; continue; }
            if (!bracket && char === '[') { if (token !== '') parts.push(token); token = ''; bracket = true; continue; }
            if (bracket && char === ']') { if (token !== '') parts.push(token.trim()); token = ''; bracket = false; continue; }
            token += char;
        }
        if (escaped) token += '\\';
        if (token !== '') parts.push(token);
        return parts.filter(function (part) { return part !== ''; });
    }
    function deepGet(object, path, fallback) {
        let current = object;
        for (const key of pathParts(path)) {
            if (current == null || !(key in Object(current))) return fallback;
            current = current[key];
        }
        return current === undefined ? fallback : current;
    }
    function deepSet(object, path, value) {
        const parts = pathParts(path);
        if (!parts.length) return object;
        let current = object;
        parts.forEach(function (key, index) {
            if (index === parts.length - 1) current[key] = clone(value);
            else {
                if (!current[key] || typeof current[key] !== 'object') current[key] = /^\d+$/.test(parts[index + 1]) ? [] : {};
                current = current[key];
            }
        });
        return object;
    }
    function deepDelete(object, path) {
        const parts = pathParts(path);
        if (!parts.length) return false;
        const key = parts.pop();
        const parent = deepGet(object, parts.join('.'));
        if (!parent || !Object.prototype.hasOwnProperty.call(parent, key)) return false;
        if (Array.isArray(parent) && /^\d+$/.test(key)) parent.splice(Number(key), 1); else delete parent[key];
        return true;
    }
    root.deleteVariable = function (path, option) {
        const variables = root.getVariables(option);
        const occurred = deepDelete(variables, path);
        persistScope(option, variables);
        return { variables: variables, delete_occurred: occurred };
    };
    root.registerVariableSchema = function (schema, option) { schemaCache.set(scopeKey(option), schema); };
    root.getvar = function (path) {
        const chat = root.getVariables({ type: 'chat' });
        return deepGet(chat && chat.stat_data ? chat.stat_data : chat, String(path || '').replace(/^stat_data\./, ''));
    };
    root.setvar = function (path, value) {
        const variables = root.getVariables({ type: 'chat' });
        const target = variables && variables.stat_data ? variables.stat_data : variables;
        deepSet(target, String(path || '').replace(/^stat_data\./, ''), value);
        return persistScope({ type: 'chat' }, variables);
    };
    root.__st_live_data = scopeValue({ type: 'chat' });
    root.stat_data = root.__st_live_data && root.__st_live_data.stat_data ? root.__st_live_data.stat_data : root.__st_live_data;

    function parseRange(range) {
        if (!chatHistory.length) return [];
        if (range === undefined || range === null || range === '') return chatHistory.map(function (_, index) { return index; });
        if (typeof range === 'number') {
            const index = resolveIndex(range);
            return index >= 0 && index < chatHistory.length ? [index] : [];
        }
        const normalized = String(range).replace(/{{\s*lastMessageId\s*}}/gi, String(chatHistory.length - 1)).trim();
        const match = normalized.match(/^(-?\d+)\s*-\s*(-?\d+)$/);
        if (!match) {
            const index = resolveIndex(Number(normalized));
            return Number.isFinite(Number(normalized)) && index >= 0 && index < chatHistory.length ? [index] : [];
        }
        const start = resolveIndex(Number(match[1]));
        const end = resolveIndex(Number(match[2]));
        const low = Math.max(0, Math.min(start, end));
        const high = Math.min(chatHistory.length - 1, Math.max(start, end));
        const result = [];
        for (let index = low; index <= high; index += 1) result.push(index);
        return result;
    }
    root.getChatMessages = function (range, option) {
        option = option || {};
        const includeSwipes = Boolean(option.include_swipes);
        return parseRange(range).map(function (index) {
            const message = clone(chatHistory[index]);
            if (!includeSwipes) {
                delete message.swipe_id; delete message.swipes; delete message.swipes_data; delete message.swipes_info;
            } else {
                message.swipes = Array.isArray(message.swipes) && message.swipes.length ? message.swipes : [message.message];
                message.swipe_id = Math.max(0, Math.min(message.swipes.length - 1, Number(message.swipe_id) || 0));
                message.swipes_data = Array.isArray(message.swipes_data) ? message.swipes_data : message.swipes.map(function () { return {}; });
                message.swipes_info = Array.isArray(message.swipes_info) ? message.swipes_info : message.swipes.map(function () { return {}; });
            }
            return message;
        }).filter(function (message) {
            if (option.role && option.role !== 'all' && message.role !== option.role) return false;
            if (option.hide_state === 'hidden' && !message.is_hidden) return false;
            if (option.hide_state === 'unhidden' && message.is_hidden) return false;
            return true;
        });
    };
    async function applyChatMutation(method, args) {
        const result = await rpc(method, args, 60000);
        if (result && Array.isArray(result.chatHistory)) chatHistory = clone(result.chatHistory);
        syncContext();
        const refresh = args && args.option && args.option.refresh || 'affected';
        if (method === 'chat.create') await emitEvent(root.tavern_events.MESSAGE_RECEIVED, result && result.messageId);
        if (method === 'chat.set') await emitEvent(root.tavern_events.MESSAGE_UPDATED, result && result.messageId);
        if (method === 'chat.delete') await emitEvent(root.tavern_events.MESSAGE_DELETED, result && result.messageId);
        if (refresh === 'all') await emitEvent(root.tavern_events.CHAT_CHANGED, BOOT.context.chatId);
        else if (refresh === 'affected') await emitEvent(root.tavern_events.CHARACTER_MESSAGE_RENDERED, result && result.messageId);
        return undefined;
    }
    root.setChatMessages = function (messages, option) { return applyChatMutation('chat.set', { messages: messages, option: option }); };
    root.setChatMessage = function (message, option) { return root.setChatMessages([message], option); };
    root.createChatMessages = function (messages, option) { return applyChatMutation('chat.create', { messages: messages, option: option }); };
    root.deleteChatMessages = function (messageIds, option) { return applyChatMutation('chat.delete', { messageIds: messageIds, option: option }); };
    root.rotateChatMessages = function (begin, middle, end, option) { return applyChatMutation('chat.rotate', { begin: begin, middle: middle, end: end, option: option }); };
    root.getLastMessageId = function () { return chatHistory.length - 1; };
    const fallbackIframeName = 'TH-message--' + BOOT.context.messageId + '--' + (Number(BOOT.context.iframeIndex) || 0);
    if (OFFICIAL_LOCAL_ENGINE) {
        try {
            root.__TH_IFRAME_ID = root.frameElement && root.frameElement.id || root.name || fallbackIframeName;
            if (!root.name) root.name = root.__TH_IFRAME_ID;
        } catch (_) { root.__TH_IFRAME_ID = root.name || fallbackIframeName; }
        root.getIframeName = function () {
            try {
                const frameId = root.frameElement && root.frameElement.id;
                if (frameId) {
                    root.__TH_IFRAME_ID = frameId;
                    if (!root.name) root.name = frameId;
                    return frameId;
                }
            } catch (_) {}
            return root.__TH_IFRAME_ID || root.name || fallbackIframeName;
        };
    } else {
        root.getIframeName = function () { return 'TH-message--' + BOOT.context.messageId + '--0'; };
    }
    root.getCurrentMessageId = function () { return BOOT.context.messageId; };
    root.getMessageId = function (iframeName) {
        if (iframeName === undefined || iframeName === null || iframeName === '') return BOOT.context.messageId;
        const match = String(iframeName).match(OFFICIAL_LOCAL_ENGINE
            ? /^TH-message--(\d+)--\d+(?:_\d+)?$/
            : /^TH-message--(-?\d+)--\d+$/);
        if (!match) throw new Error('Invalid TavernHelper message iframe name: ' + iframeName);
        return Number(match[1]);
    };
    root.reloadIframe = function () { root.location.reload(); };

    const macroHandlers = [];
    function stripPrivateVariableKeys(value) {
        if (Array.isArray(value)) return value.map(stripPrivateVariableKeys);
        if (!value || typeof value !== 'object') return value;
        const result = {};
        Object.keys(value).forEach(function (key) {
            if (String(key).startsWith('$')) return;
            result[key] = stripPrivateVariableKeys(value[key]);
        });
        return result;
    }
    function macroScopeVariables(type) {
        if (type === 'message') return root.getVariables({ type: 'message', message_id: BOOT.context.messageId });
        return root.getVariables({ type: type });
    }
    function normalizeSmartStateVariables(value) {
        if (Array.isArray(value)) {
            if (value.length > 1 && typeof value[1] === 'string') {
                const mainValue = value[0];
                return Array.isArray(mainValue)
                    ? mainValue.filter(function (item) { return item !== '$__META_EXTENSIBLE__$'; }).map(normalizeSmartStateVariables)
                    : [normalizeSmartStateVariables(mainValue)];
            }
            return value.map(normalizeSmartStateVariables);
        }
        if (!value || typeof value !== 'object') return value;
        const result = {};
        Object.keys(value).forEach(function (key) {
            if (key === '$meta' || String(key).startsWith('$')) return;
            result[key] = normalizeSmartStateVariables(value[key]);
        });
        return result;
    }
    function buildRuntimeSmartStateBlock() {
        const base = safeString(BOOT.smartStateBlock || '');
        const cleanVariables = normalizeSmartStateVariables(root.getVariables({ type: 'chat' }));
        let logicStore = '';
        try {
            if (cleanVariables && Object.keys(asObject(cleanVariables)).length) logicStore = '<LogicStore>\n' + JSON.stringify(cleanVariables, null, 2) + '\n</LogicStore>';
        } catch (_) {}
        const remainder = base.replace(/<LogicStore>[\s\S]*?<\/LogicStore>\s*/i, '').trim();
        return [logicStore, remainder].filter(Boolean).join('\n\n');
    }
    function stringifyVariableMacro(value, format) {
        if (value === undefined) return '';
        const clean = stripPrivateVariableKeys(value);
        if (format === 'format' && root.YAML && typeof root.YAML.stringify === 'function') {
            try { return safeString(root.YAML.stringify(clean)).replace(/\s+$/, ''); } catch (_) {}
        }
        if (typeof clean === 'string') return clean;
        try { return JSON.stringify(clean); } catch (_) { return safeString(clean); }
    }
    root.registerMacroLike = function (pattern, handler) { macroHandlers.push({ pattern: pattern, handler: handler }); };
    root.unregisterMacroLike = function (pattern) {
        const source = pattern instanceof RegExp ? pattern.toString() : String(pattern || '');
        let removed = false;
        for (let index = macroHandlers.length - 1; index >= 0; index -= 1) {
            const candidate = macroHandlers[index] && macroHandlers[index].pattern;
            const candidateSource = candidate instanceof RegExp ? candidate.toString() : String(candidate || '');
            if (candidateSource === source) { macroHandlers.splice(index, 1); removed = true; }
        }
        return removed;
    };
    root.substitudeMacros = root.substituteMacros = function (input) {
        let text = safeString(input);
        const now = new Date();
        text = text.replace(/{{\s*char\s*}}/gi, BOOT.context.name2)
            .replace(/{{\s*user\s*}}/gi, BOOT.context.name1)
            .replace(/{{\s*lastMessageId\s*}}/gi, String(root.getLastMessageId()))
            .replace(/{{\s*messageId\s*}}/gi, String(BOOT.context.messageId))
            .replace(/{{\s*time\s*}}/gi, now.toLocaleTimeString())
            .replace(/{{\s*date\s*}}/gi, now.toLocaleDateString())
            .replace(/{{\s*smart_state_block\s*}}/gi, buildRuntimeSmartStateBlock())
            .replace(/{{(get|format)_(global|preset|character|chat|message)_variable::([^}]+)}}/gi, function (_, format, scope, path) {
                return stringifyVariableMacro(deepGet(macroScopeVariables(String(scope).toLowerCase()), String(path).trim()), String(format).toLowerCase());
            })
            .replace(/{{getvar::([^}]+)}}/gi, function (_, path) { const value = root.getvar(path); return value == null ? '' : String(value); })
            .replace(/{{getglobalvar::([^}]+)}}/gi, function (_, path) { const value = deepGet(root.getVariables({ type: 'global' }), path); return value == null ? '' : String(value); })
            .replace(/{{random:([^}]+)}}/gi, function (_, values) { const list = values.split(','); return list[Math.floor(Math.random() * list.length)].trim(); });
        macroHandlers.forEach(function (entry) { try { text = text.replace(entry.pattern, entry.handler); } catch (_) {} });
        return text;
    };
    root.substituteParams = root.substitudeMacros;

    const promptInjects = new Map();
    root.injectPrompts = function (injects) {
        const list = Array.isArray(injects) ? injects : [injects];
        list.filter(Boolean).forEach(function (inject, index) {
            const id = String(inject.id || inject.identifier || 'card-inject-' + index);
            promptInjects.set(id, Object.assign({}, clone(inject), { id: id }));
        });
        return Array.from(promptInjects.keys());
    };
    root.uninjectPrompts = function (ids) {
        (Array.isArray(ids) ? ids : [ids]).forEach(function (id) { promptInjects.delete(String(id)); });
    };
    root.builtin_prompt_default_order = Object.freeze(['world_info_before', 'persona_description', 'char_description', 'char_personality', 'scenario', 'chat_history', 'world_info_after', 'user_input']);
    root.placeholder_prompt_default_order = root.builtin_prompt_default_order;
    const activeGenerationIds = new Set();
    function prepareGenerationOptions(options) {
        const merged = Object.assign({}, options || {});
        if (!merged.generation_id) merged.generation_id = uuid();
        merged.injects = Array.from(promptInjects.values()).concat(Array.isArray(merged.injects) ? merged.injects : []);
        if (merged.images !== undefined && merged.image === undefined) merged.image = merged.images;
        return merged;
    }
    function runGeneration(raw, options) {
        const merged = prepareGenerationOptions(options);
        activeGenerationIds.add(String(merged.generation_id));
        return rpc('generation.generate', { raw: raw, options: merged }, 360000).finally(function () { activeGenerationIds.delete(String(merged.generation_id)); });
    }
    root.generate = function (options) { return runGeneration(false, options); };
    root.generateRaw = function (options) { return runGeneration(true, options); };
    root.stopGenerationById = function (generationId) {
        const id = String(generationId || '');
        if (!activeGenerationIds.has(id)) return false;
        activeGenerationIds.delete(id);
        rpc('generation.stop', { generationId: id }, 10000).catch(function (error) { log('warn', 'Could not stop generation ' + id + ': ' + error.message); });
        return true;
    };
    root.stopAllGeneration = function () {
        const hadActive = activeGenerationIds.size > 0;
        activeGenerationIds.clear();
        if (hadActive) rpc('generation.stopAll', {}, 10000).catch(function (error) { log('warn', 'Could not stop all generations: ' + error.message); });
        return hadActive;
    };
    root.getModelList = function (customApi) { return rpc('generation.models', { custom_api: customApi || null }, 30000).then(function (models) { return Array.from(new Set((Array.isArray(models) ? models : []).map(String).filter(Boolean))).sort(); }); };
    root.getProxyPresetNames = function () {
        const profiles = BOOT.proxyProfiles || BOOT.catalog && BOOT.catalog.proxyProfiles || [];
        return Array.from(new Set((Array.isArray(profiles) ? profiles : []).map(function (profile) { return String(profile && (profile.name || profile.id) || ''); }).filter(Boolean)));
    };

    root.executeSlashCommands = root.triggerSlash = function (command) {
        return rpc('slash.execute', { command: safeString(command, 200000) }, 120000);
    };
    root.triggerSlashWithResult = root.triggerSlash;
    root.sendMessageAsUser = function (text) { root.sendMessageToParent('SEND_USER_MESSAGE', safeString(text, 200000)); };
    root.sendMessageAsCharacter = function (text) { root.sendMessageToParent('SEND_CHARACTER_MESSAGE', safeString(text, 200000)); };
    root.appendMessage = function (text) { root.sendMessageToParent('APPEND_MESSAGE', safeString(text, 200000)); };

    const CAPABILITIES = Object.freeze({
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

    let lorebookNames = Array.from(new Set(BOOT.lorebookNames || []));
    let globalWorldbookNames = clone(extensionSettings.__cardRuntimeGlobalWorldbooks || []);
    let chatWorldbookName = extensionSettings.__cardRuntimeChatWorldbook || null;
    let charWorldbooks = clone(extensionSettings.__cardRuntimeCharWorldbooks || null);
    root.getLorebooks = root.getWorldbookNames = function () { return clone(lorebookNames); };
    root.getGlobalWorldbookNames = function () { return clone(globalWorldbookNames); };
    root.getCharWorldbookNames = function () {
        if (charWorldbooks && typeof charWorldbooks === 'object') return { primary: charWorldbooks.primary || null, additional: clone(Array.isArray(charWorldbooks.additional) ? charWorldbooks.additional : []) };
        const primary = root.getCurrentCharPrimaryLorebook();
        return { primary: primary, additional: [] };
    };
    root.getChatWorldbookName = root.getChatLorebook = function () { return chatWorldbookName; };
    root.getLorebookEntries = function (name) { return rpc('lorebook.entries.get', { name: name }, 30000).then(function (entries) { return clone(Array.isArray(entries) ? entries : []); }); };
    root.replaceLorebookEntries = function (name, entries) {
        if (!Array.isArray(entries)) return Promise.reject(new TypeError('replaceLorebookEntries expected an array'));
        return rpc('lorebook.entries.replace', { name: name, entries: clone(entries) }, 60000).then(function (result) { return clone(Array.isArray(result) ? result : entries); });
    };
    root.updateLorebookEntriesWith = root.updatelorebookEntriesWith = async function (name, updater) {
        updater = requireFunctionCallback('updateLorebookEntriesWith', updater);
        const entries = await root.getLorebookEntries(name);
        const updated = await updater(clone(entries));
        const next = updated === undefined ? entries : updated;
        if (!Array.isArray(next)) throw new TypeError('Worldbook updater must return an array');
        await root.replaceLorebookEntries(name, next);
        return await root.getLorebookEntries(name);
    };
    root.setLorebookEntries = async function (name, patches) {
        const current = await root.getLorebookEntries(name);
        const patchMap = new Map((Array.isArray(patches) ? patches : []).map(function (entry) { return [String(entry.uid), entry]; }));
        const updated = current.map(function (entry) { return patchMap.has(String(entry.uid)) ? Object.assign({}, entry, clone(patchMap.get(String(entry.uid)))) : entry; });
        await root.replaceLorebookEntries(name, updated);
        return updated;
    };
    root.createLorebookEntries = async function (name, entries) {
        const additions = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
        const result = await rpc('lorebook.entries.create', { name: name, entries: additions }, 60000);
        const worldbook = await root.getLorebookEntries(name);
        let newEntries = [];
        if (result && Array.isArray(result.new_entries)) newEntries = result.new_entries;
        else if (result && Array.isArray(result.new_uids)) {
            const ids = new Set(result.new_uids.map(String));
            newEntries = worldbook.filter(function (entry) { return ids.has(String(entry.uid)); });
        } else newEntries = worldbook.slice(Math.max(0, worldbook.length - additions.length));
        return { worldbook: worldbook, new_entries: clone(newEntries) };
    };
    root.deleteLorebookEntries = async function (name, predicateOrRange) {
        const current = await root.getLorebookEntries(name);
        let deleted = [];
        let next = current;
        if (typeof predicateOrRange === 'function') {
            deleted = current.filter(function (entry) { return Boolean(predicateOrRange(clone(entry))); });
            const deletedIds = new Set(deleted.map(function (entry) { return String(entry.uid); }));
            next = current.filter(function (entry) { return !deletedIds.has(String(entry.uid)); });
        } else {
            const result = await rpc('lorebook.entries.delete', { name: name, range: predicateOrRange }, 60000);
            const worldbook = await root.getLorebookEntries(name);
            const remainingIds = new Set(worldbook.map(function (entry) { return String(entry.uid); }));
            deleted = current.filter(function (entry) { return !remainingIds.has(String(entry.uid)); });
            return { worldbook: worldbook, deleted_entries: deleted, delete_occurred: Boolean(result && result.delete_occurred || deleted.length) };
        }
        await root.replaceLorebookEntries(name, next);
        return { worldbook: next, deleted_entries: deleted, delete_occurred: deleted.length > 0 };
    };
    root.createLorebook = root.createWorldbook = async function (name, entries) {
        const existed = lorebookNames.includes(String(name));
        if (existed) return false;
        await rpc('lorebook.create', { name: name, entries: Array.isArray(entries) ? entries : [] }, 60000);
        if (!lorebookNames.includes(String(name))) lorebookNames.push(String(name));
        return true;
    };
    root.deleteLorebook = root.deleteWorldbook = async function (name) { const result = await rpc('lorebook.delete', { name: name }, 60000); lorebookNames = lorebookNames.filter(function (item) { return item !== name; }); return Boolean(result); };
    root.getWorldbook = function (name) { return root.getLorebookEntries(name); };
    root.replaceWorldbook = async function (name, worldbook, options) {
        if (!Array.isArray(worldbook)) throw new TypeError('replaceWorldbook expected WorldbookEntry[]; refusing to overwrite data with an invalid value');
        await root.replaceLorebookEntries(name, worldbook);
        await emitEvent(root.tavern_events.WORLDINFO_UPDATED, name, options || {});
    };
    root.updateWorldbookWith = async function (name, updater, options) {
        updater = requireFunctionCallback('updateWorldbookWith', updater);
        const current = await root.getWorldbook(name);
        const updated = await updater(clone(current));
        const next = updated === undefined ? current : updated;
        if (!Array.isArray(next)) throw new TypeError('Worldbook updater must return WorldbookEntry[]');
        await root.replaceWorldbook(name, next, options);
        return await root.getWorldbook(name);
    };
    root.createOrReplaceWorldbook = async function (name, worldbook, options) {
        const existed = lorebookNames.includes(String(name));
        if (!existed) await root.createWorldbook(name, []);
        await root.replaceWorldbook(name, Array.isArray(worldbook) ? worldbook : [], options);
        return !existed;
    };
    root.getOrCreateChatLorebook = root.getOrCreateChatWorldbook = async function (requestedName) {
        const name = requestedName || chatWorldbookName || BOOT.context.chatId + '-chat-lorebook';
        if (!lorebookNames.includes(name)) await root.createLorebook(name, []);
        await root.rebindChatWorldbook('current', name);
        return name;
    };
    root.getCurrentCharPrimaryLorebook = function () { return BOOT.characterCard && BOOT.characterCard.char_book ? (BOOT.characterCard.char_book.name || BOOT.context.name2) : null; };
    root.getCharLorebooks = root.getCharWorldbookNames;
    root.setCurrentCharLorebooks = root.rebindCharWorldbooks = async function (characterName, bindings) {
        if (arguments.length === 1 && characterName && typeof characterName === 'object') { bindings = characterName; characterName = 'current'; }
        if (characterName !== 'current') throw new Error('Only the current character can be rebound in Card Studio');
        charWorldbooks = { primary: bindings && bindings.primary || null, additional: clone(bindings && Array.isArray(bindings.additional) ? bindings.additional : []) };
        extensionSettings.__cardRuntimeCharWorldbooks = clone(charWorldbooks);
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, clone(charWorldbooks));
    };
    root.rebindGlobalWorldbooks = async function (names) {
        globalWorldbookNames = Array.from(new Set((Array.isArray(names) ? names : []).map(String)));
        extensionSettings.__cardRuntimeGlobalWorldbooks = clone(globalWorldbookNames);
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, clone(globalWorldbookNames));
    };
    root.rebindChatWorldbook = async function (_chatName, name) {
        chatWorldbookName = name || null;
        extensionSettings.__cardRuntimeChatWorldbook = chatWorldbookName;
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, chatWorldbookName);
    };
    root.createWorldbookEntries = root.createLorebookEntries;
    root.deleteWorldbookEntries = root.deleteLorebookEntries;
    root.createLorebookEntry = async function (name, entry) {
        const result = await root.createLorebookEntries(name, [entry]);
        return result.new_entries.length ? result.new_entries[0].uid : null;
    };
    root.deleteLorebookEntry = async function (name, uid) { const result = await root.deleteLorebookEntries(name, function (entry) { return String(entry.uid) === String(uid); }); return result.delete_occurred; };
    root.setChatLorebook = function (name) { return root.rebindChatWorldbook('current', name).then(function () { return chatWorldbookName; }); };
    let lorebookSettings = { scan_depth: 2, context_percentage: 25, budget_cap: 0, min_activations: 0, max_depth: 0, max_recursion_steps: 0 };
    root.getLorebookSettings = function () { return clone(lorebookSettings); };
    root.setLorebookSettings = function (settings) { lorebookSettings = Object.assign(lorebookSettings, clone(settings || {})); return clone(lorebookSettings); };
    root.getwi = async function (bookOrKey, maybeKey) {
        const key = maybeKey === undefined ? bookOrKey : maybeKey;
        const book = maybeKey === undefined ? null : bookOrKey;
        let entries = worldInfo;
        if (book) { try { entries = await root.getLorebookEntries(book); } catch (_) {} }
        if (!key) return entries.map(function (entry) { return entry.content || ''; }).join('\n');
        const found = entries.find(function (entry) {
            return entry && (entry.comment === key || entry.name === key || (Array.isArray(entry.keys) && entry.keys.includes(key)));
        });
        return found ? found.content || '' : '';
    };

    function compileRegex(source) {
        if (source instanceof RegExp) return source;
        const match = String(source || '').match(/^\/(.*)\/([dgimsuvy]*)$/s);
        try { return match ? new RegExp(match[1], match[2]) : new RegExp(String(source || ''), 'g'); } catch (_) { return null; }
    }
    const regexScopes = {
        global: clone(extensionSettings.__cardRuntimeGlobalRegexes || []),
        preset: clone(extensionSettings.__cardRuntimePresetRegexes || []),
        character: clone(BOOT.characterCard && BOOT.characterCard.extensions && (BOOT.characterCard.extensions.regex_scripts || BOOT.characterCard.extensions.RegexScripts) || [])
    };
    function regexScope(option) { return option && option.type === 'global' ? 'global' : option && option.type === 'preset' ? 'preset' : 'character'; }
    function normalizeRegex(script) {
        const source = script && script.source || {};
        const destination = script && script.destination || {};
        return Object.assign({}, clone(script || {}), {
            id: String(script && script.id || uuid()),
            script_name: String(script && (script.script_name || script.scriptName) || ''),
            enabled: script && script.enabled !== undefined ? Boolean(script.enabled) : !(script && script.disabled),
            find_regex: String(script && (script.find_regex || script.findRegex) || ''),
            replace_string: String(script && (script.replace_string || script.replaceString) || ''),
            trim_strings: clone(script && (script.trim_strings || script.trimStrings) || []),
            source: { user_input: source.user_input !== false, ai_output: source.ai_output !== false, slash_command: Boolean(source.slash_command), world_info: Boolean(source.world_info), reasoning: Boolean(source.reasoning) },
            destination: { display: destination.display !== false, prompt: destination.prompt !== false },
            run_on_edit: Boolean(script && (script.run_on_edit || script.runOnEdit)),
            min_depth: (script && (script.min_depth ?? script.minDepth)) ?? null,
            max_depth: (script && (script.max_depth ?? script.maxDepth)) ?? null
        });
    }
    root.getTavernRegexes = function (option) { return clone(regexScopes[regexScope(option)].map(normalizeRegex)); };
    root.replaceTavernRegexes = async function (regexes, option) {
        const scope = regexScope(option);
        regexScopes[scope] = clone((Array.isArray(regexes) ? regexes : []).map(normalizeRegex));
        if (scope === 'character') await rpc('regex.replace', { regexes: regexScopes.character }, 60000);
        else {
            extensionSettings[scope === 'global' ? '__cardRuntimeGlobalRegexes' : '__cardRuntimePresetRegexes'] = clone(regexScopes[scope]);
            await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        }
        return undefined;
    };
    root.updateTavernRegexesWith = async function (updater, option) {
        updater = requireFunctionCallback('updateTavernRegexesWith', updater);
        const current = root.getTavernRegexes(option);
        const result = await updater(clone(current));
        const next = result === undefined ? current : result;
        if (!Array.isArray(next)) throw new TypeError('Regex updater must return TavernRegex[]');
        await root.replaceTavernRegexes(next, option);
        return root.getTavernRegexes(option);
    };
    root.isCharacterTavernRegexesEnabled = function () { return extensionSettings.__cardRuntimeCharacterRegexEnabled !== false; };
    root.formatAsTavernRegexedString = function (input, source, destination, options) {
        if (typeof source === 'number' || Array.isArray(source)) { options = destination || {}; destination = source === 1 ? 'prompt' : 'display'; source = 'ai_output'; }
        source = source || 'ai_output';
        destination = destination || 'display';
        options = options || {};
        let output = safeString(input);
        const lists = regexScopes.global.concat(regexScopes.preset, root.isCharacterTavernRegexesEnabled() ? regexScopes.character : []);
        lists.map(normalizeRegex).forEach(function (script) {
            if (!script.enabled) return;
            if (!script.source[source]) return;
            if (!script.destination[destination]) return;
            if (options.isEdit && !script.run_on_edit) return;
            if (typeof options.depth === 'number' && ((typeof script.min_depth === 'number' && options.depth < script.min_depth) || (typeof script.max_depth === 'number' && options.depth > script.max_depth))) return;
            const regex = compileRegex(script.find_regex);
            if (!regex) return;
            output = output.replace(regex, function (match) {
                const captures = Array.prototype.slice.call(arguments, 1, -2);
                let replacement = script.replace_string;
                (script.trim_strings || []).forEach(function (text) { replacement = replacement.split(String(text)).join(''); });
                return replacement.replace(/\$(\d+)/g, function (_, index) { const number = Number(index); return number === 0 ? match : (captures[number - 1] == null ? '' : String(captures[number - 1])); });
            });
        });
        return output;
    };

    function defaultAudioSettings() { return { enabled: true, mode: 'repeat_all', muted: false, volume: 50 }; }
    const persistedAudioState = clone(extensionSettings.__cardRuntimeAudioState || {});
    const audioState = { bgm: clone(persistedAudioState.bgm || []), ambient: clone(persistedAudioState.ambient || []), current: { bgm: null, ambient: null }, settings: { bgm: Object.assign(defaultAudioSettings(), clone(persistedAudioState.settings && persistedAudioState.settings.bgm || {})), ambient: Object.assign(defaultAudioSettings(), clone(persistedAudioState.settings && persistedAudioState.settings.ambient || {})) } };
    function persistAudioState() { extensionSettings.__cardRuntimeAudioState = { bgm: clone(audioState.bgm), ambient: clone(audioState.ambient), settings: clone(audioState.settings) }; rpc('extension.settings.save', { settings: extensionSettings }, 30000).catch(function (error) { log('warn', 'Could not persist audio settings: ' + error.message); }); }
    function audioType(value) { return value === 'ambient' ? 'ambient' : 'bgm'; }
    function normalizeAudio(item) { if (!item) return null; const url = String(item.url || item.src || ''); if (!url) return null; const title = String(item.title || url.split('/').pop() || url); return { title: title, url: url }; }
    root.getAudioList = function (type) { return clone(audioState[audioType(type)]); };
    root.replaceAudioList = function (type, list) { audioState[audioType(type)] = (Array.isArray(list) ? list : []).map(normalizeAudio).filter(Boolean); persistAudioState(); return undefined; };
    root.appendAudioList = function (type, list) {
        const kind = audioType(type);
        (Array.isArray(list) ? list : [list]).map(normalizeAudio).filter(Boolean).forEach(function (item) {
            if (!audioState[kind].some(function (existing) { return existing.title === item.title || existing.url === item.url; })) audioState[kind].push(item);
        });
        persistAudioState();
        return undefined;
    };
    root.getAudioSettings = function (type) { return clone(audioState.settings[audioType(type)]); };
    root.setAudioSettings = function (type, settings) {
        if (settings === undefined && type && typeof type === 'object') { settings = type; type = 'bgm'; }
        const kind = audioType(type);
        Object.assign(audioState.settings[kind], clone(settings || {}));
        audioState.settings[kind].volume = Math.max(0, Math.min(100, Number(audioState.settings[kind].volume) || 0));
        const current = audioState.current[kind];
        if (current && current.element) { current.element.volume = audioState.settings[kind].volume / 100; current.element.muted = audioState.settings[kind].muted; }
        persistAudioState();
        return undefined;
    };
    root.getCurrentAudio = function (type) {
        const current = audioState.current[audioType(type)];
        if (!current) return { src: '', title: '', playing: false, progress: 0 };
        const element = current.element;
        const progress = element && Number.isFinite(element.duration) && element.duration > 0 ? Math.max(0, Math.min(100, element.currentTime / element.duration * 100)) : 0;
        return { src: current.item.url, title: current.item.title, playing: Boolean(element && !element.paused), progress: progress };
    };
    root.playAudio = function (type, audio) {
        if (audio === undefined) { audio = type; type = 'bgm'; }
        const kind = audioType(type);
        const item = normalizeAudio(typeof audio === 'string' ? { url: audio } : (audio || audioState[kind][0]));
        if (!item) return;
        root.appendAudioList(kind, [item]);
        const previous = audioState.current[kind];
        if (previous && previous.element) previous.element.pause();
        const element = new Audio(root.resolveCardAsset(item.url));
        const settings = audioState.settings[kind];
        element.volume = settings.volume / 100;
        element.muted = settings.muted;
        element.loop = settings.mode === 'repeat_one';
        audioState.current[kind] = { item: item, element: element };
        element.play().catch(function (error) { log('warn', 'Audio autoplay was blocked: ' + error.message); });
    };
    root.pauseAudio = function (type) { const current = audioState.current[audioType(type)]; if (current && current.element) current.element.pause(); };
    root.play_audio = function (url) { return root.playAudio('bgm', url); };

    const storageState = { local: new Map(Object.entries(BOOT.storage.local || {})), session: new Map(Object.entries(BOOT.storage.session || {})) };
    function storageMock(type) {
        const map = storageState[type];
        return {
            getItem: function (key) { key = String(key); return map.has(key) ? map.get(key) : null; },
            setItem: function (key, value) { key = String(key); value = String(value); map.set(key, value); rpc('storage.set', { storageType: type, key: key, value: value }).catch(function () {}); },
            removeItem: function (key) { key = String(key); map.delete(key); rpc('storage.remove', { storageType: type, key: key }).catch(function () {}); },
            clear: function () { map.clear(); rpc('storage.clear', { storageType: type }).catch(function () {}); },
            key: function (index) { return Array.from(map.keys())[index] || null; },
            get length() { return map.size; }
        };
    }
    if (!FULL_COMPATIBILITY_MODE) {
        try {
            Object.defineProperty(root, 'localStorage', { configurable: true, value: storageMock('local') });
            Object.defineProperty(root, 'sessionStorage', { configurable: true, value: storageMock('session') });
        } catch (error) { log('warn', 'Storage shim could not be installed: ' + error.message); }
    }
    function createLocalForageInstance(config) {
        config = Object.assign({ name: 'card-studio', storeName: 'keyvaluepairs' }, config || {});
        let databasePromise = null;
        function openDatabase() {
            if (!root.indexedDB) return Promise.resolve(null);
            if (databasePromise) return databasePromise;
            databasePromise = new Promise(function (resolve, reject) {
                const request = root.indexedDB.open(String(config.name), 1);
                request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(config.storeName)) request.result.createObjectStore(config.storeName); };
                request.onsuccess = function () { resolve(request.result); };
                request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
            }).catch(function () { return null; });
            return databasePromise;
        }
        function transaction(mode, operation) {
            return openDatabase().then(function (database) {
                if (!database) return operation(null);
                return new Promise(function (resolve, reject) {
                    const tx = database.transaction(config.storeName, mode);
                    const store = tx.objectStore(config.storeName);
                    let result;
                    try { result = operation(store, resolve, reject); } catch (error) { reject(error); }
                    tx.onerror = function () { reject(tx.error || new Error('IndexedDB transaction failed')); };
                    if (result !== undefined && !(result && typeof result.onsuccess === 'function')) resolve(result);
                });
            });
        }
        const fallbackPrefix = '__localforage__:' + config.name + ':' + config.storeName + ':';
        const api = {
            config: function (next) { if (next) Object.assign(config, next); return true; },
            ready: function () { return openDatabase().then(function () { return api; }); },
            getItem: function (key) { return transaction('readonly', function (store, resolve) { if (!store) { const raw = root.localStorage.getItem(fallbackPrefix + key); if (raw == null) return null; try { return JSON.parse(raw); } catch (_) { return raw; } } const request = store.get(String(key)); request.onsuccess = function () { resolve(request.result === undefined ? null : request.result); }; }); },
            setItem: function (key, value) { return transaction('readwrite', function (store, resolve) { if (!store) { root.localStorage.setItem(fallbackPrefix + key, JSON.stringify(value)); return value; } const request = store.put(value, String(key)); request.onsuccess = function () { resolve(value); }; }); },
            removeItem: function (key) { return transaction('readwrite', function (store, resolve) { if (!store) { root.localStorage.removeItem(fallbackPrefix + key); return; } const request = store.delete(String(key)); request.onsuccess = function () { resolve(); }; }); },
            clear: function () { return transaction('readwrite', function (store, resolve) { if (!store) { const keys = []; for (let i = 0; i < root.localStorage.length; i += 1) { const key = root.localStorage.key(i); if (key && key.indexOf(fallbackPrefix) === 0) keys.push(key); } keys.forEach(function (key) { root.localStorage.removeItem(key); }); return; } const request = store.clear(); request.onsuccess = function () { resolve(); }; }); },
            keys: function () { return transaction('readonly', function (store, resolve) { if (!store) { const keys = []; for (let i = 0; i < root.localStorage.length; i += 1) { const key = root.localStorage.key(i); if (key && key.indexOf(fallbackPrefix) === 0) keys.push(key.slice(fallbackPrefix.length)); } return keys; } const request = store.getAllKeys(); request.onsuccess = function () { resolve(request.result.map(String)); }; }); },
            length: function () { return api.keys().then(function (keys) { return keys.length; }); },
            key: function (index) { return api.keys().then(function (keys) { return keys[index] === undefined ? null : keys[index]; }); },
            iterate: function (iterator) { return api.keys().then(async function (keys) { for (let i = 0; i < keys.length; i += 1) { const value = await api.getItem(keys[i]); const result = await iterator(value, keys[i], i + 1); if (result !== undefined) return result; } }); },
            createInstance: function (next) { return createLocalForageInstance(Object.assign({}, config, next || {})); },
            driver: function () { return root.indexedDB ? 'asyncStorage' : 'localStorageWrapper'; },
            setDriver: function () { return Promise.resolve(); },
            defineDriver: function () { return Promise.resolve(); }
        };
        return api;
    }
    root.localforage = createLocalForageInstance({ name: 'sillytavern-card-studio', storeName: 'card-runtime' });

    root.__st_embedded_assets = clone(BOOT.embeddedAssets || {});
    function normalizeRuntimeDependencyUrl(uri) {
        const value = String(uri || '');
        if (value === 'https://unpkg.com/vue-router@5.2.0/dist/vue-router.global.js') return 'https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js';
        if (value === 'https://cdn.jsdelivr.net/npm/vue-router@5.2.0/dist/vue-router.global.js') return 'https://cdn.jsdelivr.net/npm/vue-router@5.1.0/dist/vue-router.global.js';
        return value;
    }
    root.resolveCardAsset = function (uri) {
        const embedded = root.__st_embedded_assets[String(uri)];
        return normalizeRuntimeDependencyUrl(embedded || uri);
    };
    const originalFetch = root.fetch.bind(root);
    function localJsonResponse(value, status) {
        return new Response(JSON.stringify(value), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'x-card-runtime': 'official-local' } });
    }
    async function localRequestBody(resource, options) {
        try {
            if (options && typeof options.body === 'string') return JSON.parse(options.body || '{}');
            if (resource && typeof resource !== 'string' && typeof resource.clone === 'function') return await resource.clone().json();
        } catch (_) {}
        return {};
    }
    function localApiFetch(resource, options, url) {
        if (!OFFICIAL_LOCAL_ENGINE) return null;
        let pathname = String(url || '');
        try { pathname = new URL(pathname, root.location.href).pathname; } catch (_) {}
        if (!/^\/?api\//i.test(pathname)) return null;
        pathname = pathname.replace(/\/+$/, '');
        const catalog = BOOT.catalog || { characters: [], personas: [], presets: [], extensions: {} };
        if (pathname === '/api/characters/all') return Promise.resolve(localJsonResponse((catalog.characters || []).map(function (entry) { return clone(entry.card || entry); })));
        if (pathname === '/api/groups/all') return Promise.resolve(localJsonResponse(clone(root.groups || [])));
        if (pathname === '/api/chats/get') return Promise.resolve(localJsonResponse(clone(chatHistory)));
        if (pathname === '/api/worldinfo/get') return Promise.resolve(localJsonResponse({ entries: clone(BOOT.worldInfo || []) }));
        if (pathname === '/api/presets/list') return Promise.resolve(localJsonResponse(clone(catalog.presets || [])));
        if (pathname === '/api/extensions/discover') return Promise.resolve(localJsonResponse(clone(catalog.extensions || {})));
        if (pathname === '/api/extensions/version') {
            return localRequestBody(resource, options).then(function (body) {
                const id = String(body.extensionName || body.id || body.name || 'third-party/JS-Slash-Runner');
                const info = catalog.extensions && catalog.extensions[id] || { id: id, installed: id === 'third-party/JS-Slash-Runner', enabled: id === 'third-party/JS-Slash-Runner' };
                return localJsonResponse(Object.assign({ isUpToDate: true }, clone(info)));
            });
        }
        if (pathname === '/api/extensions/install' || pathname === '/api/extensions/delete' || pathname === '/api/extensions/update') {
            return Promise.resolve(localJsonResponse({ ok: false, error: 'Extension mutation is unavailable in a static Card Studio deployment.' }, 501));
        }
        return Promise.resolve(localJsonResponse({ error: 'SillyTavern endpoint is not implemented by the browser-local runtime.', path: pathname }, 501));
    }
    root.fetch = function (resource, options) {
        const url = typeof resource === 'string' ? resource : resource && resource.url;
        const resolved = root.resolveCardAsset(url);
        if (resolved !== url) return originalFetch(resolved, options);
        const localApiResult = localApiFetch(resource, options, url);
        if (localApiResult) return localApiResult;
        if (/^(?:https?:|data:|blob:)/i.test(String(url))) return originalFetch(resource, options);
        if (!FULL_COMPATIBILITY_MODE && /^\/?api\//i.test(String(url))) {
            return Promise.resolve(new Response(JSON.stringify({ error: 'Direct SillyTavern backend endpoints are unavailable; use TavernHelper.generate or cardRuntimeRpc.' }), { status: 403, headers: { 'content-type': 'application/json' } }));
        }
        return originalFetch(resource, options);
    };
    if (OFFICIAL_LOCAL_ENGINE && root.axios && root.axios.defaults) {
        // Axios otherwise prefers XMLHttpRequest in a browser and would miss
        // the local endpoint bridge above.
        root.axios.defaults.adapter = 'fetch';
    }
    const NativeXHR = root.XMLHttpRequest;
    if (!OFFICIAL_LOCAL_ENGINE) {
        root.XMLHttpRequest = function () {
            const xhr = new NativeXHR();
            const nativeOpen = xhr.open;
            xhr.open = function (method, url) {
                const args = Array.prototype.slice.call(arguments);
                args[1] = root.resolveCardAsset(url);
                return nativeOpen.apply(xhr, args);
            };
            return xhr;
        };
    } else {
        function RuntimeXHR() {
            this._native = new NativeXHR();
            this._listeners = new Map();
            this._headers = {};
            this._responseHeaders = new Headers();
            this._local = false;
            this._aborted = false;
            this._readyState = 0;
            this._status = 0;
            this._statusText = '';
            this._response = null;
            this._responseText = '';
            this._responseURL = '';
            this._responseXML = null;
            this.responseType = '';
            this.timeout = 0;
            this.withCredentials = false;
            this.upload = this._native.upload || {};
            const self = this;
            if (this._native && typeof this._native.addEventListener === 'function') {
                ['readystatechange','loadstart','progress','abort','error','load','timeout','loadend'].forEach(function (type) {
                    self._native.addEventListener(type, function (event) {
                        self._syncNative();
                        self._emit(type, event);
                    });
                });
            }
        }
        RuntimeXHR.prototype._syncNative = function () {
            const native = this._native;
            ['readyState','status','statusText','response','responseText','responseURL','responseXML'].forEach(function (key) {
                try { this['_' + key] = native[key]; } catch (_) {}
            }, this);
        };
        RuntimeXHR.prototype._emit = function (type, nativeEvent) {
            const event = nativeEvent || { type: type };
            const listeners = Array.from(this._listeners.get(type) || []);
            listeners.forEach(function (listener) {
                try { if (typeof listener === 'function') listener.call(this, event); else listener && listener.handleEvent && listener.handleEvent(event); } catch (error) { setTimeout(function () { throw error; }, 0); }
            }, this);
            const handler = this['on' + type];
            if (typeof handler === 'function') handler.call(this, event);
        };
        RuntimeXHR.prototype.addEventListener = function (type, listener) {
            const list = this._listeners.get(type) || [];
            if (!list.includes(listener)) list.push(listener);
            this._listeners.set(type, list);
        };
        RuntimeXHR.prototype.removeEventListener = function (type, listener) {
            const list = this._listeners.get(type) || [];
            this._listeners.set(type, list.filter(function (candidate) { return candidate !== listener; }));
        };
        RuntimeXHR.prototype.dispatchEvent = function (event) { this._emit(event && event.type || '', event); return true; };
        RuntimeXHR.prototype.open = function (method, url, async, user, password) {
            this._method = String(method || 'GET').toUpperCase();
            this._url = root.resolveCardAsset(url);
            this._async = async !== false;
            let pathname = String(this._url || '');
            try { pathname = new URL(pathname, root.location.href).pathname; } catch (_) {}
            this._local = /^\/?api\//i.test(pathname);
            if (!this._local) {
                const result = this._native.open(this._method, this._url, this._async, user, password);
                this._native.responseType = this.responseType;
                this._native.timeout = this.timeout;
                this._native.withCredentials = this.withCredentials;
                return result;
            }
            if (!this._async) throw new Error('Synchronous XMLHttpRequest is unavailable for browser-local SillyTavern endpoints.');
            this._readyState = 1;
            this._emit('readystatechange');
        };
        RuntimeXHR.prototype.setRequestHeader = function (name, value) {
            if (!this._local) return this._native.setRequestHeader(name, value);
            const key = String(name).toLowerCase();
            this._headers[key] = this._headers[key] ? this._headers[key] + ', ' + value : String(value);
        };
        RuntimeXHR.prototype.getResponseHeader = function (name) {
            if (!this._local) return this._native.getResponseHeader(name);
            return this._responseHeaders.get(String(name));
        };
        RuntimeXHR.prototype.getAllResponseHeaders = function () {
            if (!this._local) return this._native.getAllResponseHeaders();
            let output = '';
            this._responseHeaders.forEach(function (value, key) { output += key + ': ' + value + '\r\n'; });
            return output;
        };
        RuntimeXHR.prototype.overrideMimeType = function (mime) {
            this._overrideMimeType = String(mime || '');
            if (!this._local && this._native.overrideMimeType) this._native.overrideMimeType(mime);
        };
        RuntimeXHR.prototype.send = function (body) {
            if (!this._local) {
                this._native.responseType = this.responseType;
                this._native.timeout = this.timeout;
                this._native.withCredentials = this.withCredentials;
                return this._native.send(body);
            }
            const self = this;
            self._emit('loadstart');
            const requestOptions = { method: self._method, headers: self._headers };
            if (!['GET', 'HEAD'].includes(self._method) && body !== undefined && body !== null) requestOptions.body = body;
            root.fetch(self._url, requestOptions).then(async function (response) {
                if (self._aborted) return;
                self._status = response.status;
                self._statusText = response.statusText;
                self._responseURL = response.url || String(self._url || '');
                self._responseHeaders = response.headers;
                self._readyState = 2;
                self._emit('readystatechange');
                const text = await response.text();
                if (self._aborted) return;
                self._readyState = 3;
                self._emit('readystatechange');
                self._responseText = text;
                if (self.responseType === 'json') {
                    try { self._response = text ? JSON.parse(text) : null; } catch (_) { self._response = null; }
                } else if (self.responseType === 'blob') {
                    self._response = new Blob([text], { type: response.headers.get('content-type') || 'text/plain' });
                } else if (self.responseType === 'arraybuffer') {
                    self._response = new TextEncoder().encode(text).buffer;
                } else if (self.responseType === 'document') {
                    self._responseXML = new DOMParser().parseFromString(text, 'text/html');
                    self._response = self._responseXML;
                } else {
                    self._response = text;
                }
                self._readyState = 4;
                self._emit('readystatechange');
                self._emit('load');
                self._emit('loadend');
            }).catch(function (error) {
                if (self._aborted) return;
                self._readyState = 4;
                self._status = 0;
                self._statusText = error && error.message || 'Network Error';
                self._emit('readystatechange');
                self._emit('error');
                self._emit('loadend');
            });
        };
        RuntimeXHR.prototype.abort = function () {
            this._aborted = true;
            if (!this._local) return this._native.abort();
            this._readyState = 0;
            this._emit('abort');
            this._emit('loadend');
        };
        Object.defineProperties(RuntimeXHR.prototype, {
            readyState: { get: function () { return this._local ? this._readyState : Number(this._native.readyState || 0); } },
            status: { get: function () { return this._local ? this._status : Number(this._native.status || 0); } },
            statusText: { get: function () { return this._local ? this._statusText : String(this._native.statusText || ''); } },
            response: { get: function () { return this._local ? this._response : this._native.response; } },
            responseText: { get: function () { return this._local ? this._responseText : this._native.responseText; } },
            responseURL: { get: function () { return this._local ? this._responseURL : this._native.responseURL; } },
            responseXML: { get: function () { return this._local ? this._responseXML : this._native.responseXML; } },
        });
        ['UNSENT','OPENED','HEADERS_RECEIVED','LOADING','DONE'].forEach(function (name, index) { RuntimeXHR[name] = index; RuntimeXHR.prototype[name] = index; });
        root.XMLHttpRequest = RuntimeXHR;
    }

    const noopClassList = { add: function () {}, remove: function () {}, toggle: function () { return false; }, contains: function () { return false; } };
    const phantomInput = {
        _value: '', style: {}, dataset: {}, classList: noopClassList,
        get value() { return this._value; },
        set value(value) { this._value = String(value); root.sendMessageToParent('SET_INPUT_VALUE', this._value); },
        focus: function () {}, blur: function () {}, click: function () {}, addEventListener: function () {}, removeEventListener: function () {},
        dispatchEvent: function (event) { if (event && (event.type === 'click' || event.type === 'submit')) root.sendMessageAsUser(this._value); return true; },
        setAttribute: function () {}, getAttribute: function () { return null; }
    };
    const phantomButton = {
        style: {}, dataset: {}, classList: noopClassList,
        click: function () { root.sendMessageAsUser(phantomInput.value); },
        submit: function () { root.sendMessageAsUser(phantomInput.value); },
        focus: function () {}, blur: function () {}, addEventListener: function () {}, removeEventListener: function () {},
        dispatchEvent: function (event) { if (event && (event.type === 'click' || event.type === 'submit')) this.click(); return true; },
        setAttribute: function () {}, getAttribute: function () { return null; }
    };
    function safeParentQuery(selector) {
        selector = String(selector || '');
        if (selector === '#send_textarea' || selector === '#chat_input' || selector === 'textarea[name="chat"]' || selector === 'textarea#send_textarea') return phantomInput;
        if (selector === '#send_but' || selector === '#send_form' || selector === 'button#send_but') return phantomButton;
        if (selector === '#chat') return document.getElementById('chat');
        if (selector === 'body' || selector === '#app' || selector === '#content' || selector === '#main') return document.body;
        try { return document.querySelector(selector); } catch (error) {
            diagnostic('CARD_RUNTIME_SANDBOX_BLOCKED', 'parent-dom', 'querySelector', 'Selector không hợp lệ hoặc không thể ánh xạ trong DOM tương thích: ' + selector, { details: { selector: selector, error: error && error.message } });
            return null;
        }
    }
    root.__st_parent_mock = {
        querySelector: safeParentQuery,
        querySelectorAll: function (selector) { try { return document.querySelectorAll(selector); } catch (_) { return []; } },
        getElementById: function (id) { return safeParentQuery('#' + String(id || '').replace(/[^A-Za-z0-9_:-]/g, '')); },
        getElementsByClassName: function (name) { return document.getElementsByClassName(name); },
        getElementsByTagName: function (name) { return document.getElementsByTagName(name); },
        createElement: function (tag) { return document.createElement(tag); },
        createTextNode: function (text) { return document.createTextNode(text); },
        addEventListener: function (name, handler, options) { document.addEventListener(name, handler, options); },
        removeEventListener: function (name, handler, options) { document.removeEventListener(name, handler, options); },
        dispatchEvent: function (event) { return document.dispatchEvent(event); },
        get activeElement() { return document.activeElement; },
        get body() { return document.body; },
        get head() { return document.head; },
        get documentElement() { return document.documentElement; },
        get location() { return root.location; },
        readyState: 'complete'
    };

    if (!root.toastr) {
        root.toastr = {
            info: function (message) { root.sendMessageToParent('SHOW_TOAST', { type: 'info', message: safeString(message, 20000) }); },
            success: function (message) { root.sendMessageToParent('SHOW_TOAST', { type: 'success', message: safeString(message, 20000) }); },
            warning: function (message) { root.sendMessageToParent('SHOW_TOAST', { type: 'warning', message: safeString(message, 20000) }); },
            error: function (message) { root.sendMessageToParent('SHOW_TOAST', { type: 'error', message: safeString(message, 20000) }); },
            clear: function () {}, remove: function () {}, options: {}
        };
    }
    root.callPopup = root.showPopup = function (content, type, title) {
        root.sendMessageToParent('SHOW_POPUP', { html: safeString(content, 500000), type: type || 'text', title: safeString(title || 'Thông báo Thẻ', 120) });
        return Promise.resolve(true);
    };
    if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { value: { writeText: function (text) { root.sendMessageToParent('COPY_TO_CLIPBOARD', safeString(text, 1000000)); return Promise.resolve(); } } });

    root.setBackground = function (url) {
        const element = document.getElementById('sheld');
        if (element) element.style.backgroundImage = url ? 'url("' + root.resolveCardAsset(url).replace(/"/g, '') + '")' : 'none';
        root.sendMessageToParent('SET_VISUAL_STATE', { type: 'bg', value: url || '' });
    };
    root.PlaySound = root.play_audio;
    root.ClickSound = function () {};
    root.hide_mes = function (id) { const element = document.querySelector('.mes[mesid="' + id + '"], #message-' + id); if (element) element.style.display = 'none'; };
    root.show_mes = function (id) { const element = document.querySelector('.mes[mesid="' + id + '"], #message-' + id); if (element) element.style.display = ''; };
    root.formatAsDisplayedMessage = function (text) {
        const processed = root.formatAsTavernRegexedString(root.substitudeMacros(text));
        return root.marked && root.marked.parse ? root.marked.parse(processed) : processed;
    };
    root.retrieveDisplayedMessage = function (messageId) { return document.querySelector('.mes[mesid="' + messageId + '"] .mes_text, #message-' + messageId + ' .mes_text'); };
    root.refreshOneMessage = function () { return Promise.resolve(); };

    const globalInitializers = new Map([['Mvu', true], ['TavernHelper', true]]);
    root.initializeGlobal = function (name, value) { if (!(name in root)) root[name] = value; globalInitializers.set(name, true); emitEvent('global_initialized_' + name, root[name]); return root[name]; };
    root.waitGlobalInitialized = async function (name) {
        if (name in root || globalInitializers.has(name)) return root[name] === undefined ? true : root[name];
        await root.eventWaitOnce('global_initialized_' + name);
        return root[name];
    };
    const scriptTreeScopes = clone(extensionSettings.__cardRuntimeScriptTrees || { global: [], preset: [], character: [] });
    function flattenScripts(trees, output) {
        output = output || [];
        (Array.isArray(trees) ? trees : []).forEach(function (tree) {
            if (!tree) return;
            if (tree.type === 'folder') flattenScripts(tree.scripts, output);
            else if (tree.type === 'script') output.push(tree);
        });
        return output;
    }
    function rebuildCharacterRegistry() {
        scriptRegistry.clear();
        flattenScripts(scriptTreeScopes.character).forEach(function (script, index) {
            const id = String(script.id || 'script-' + index);
            const buttons = script.button && Array.isArray(script.button.buttons) ? script.button.buttons : (Array.isArray(script.buttons) ? script.buttons : []);
            scriptRegistry.set(id, { type: 'script', enabled: script.enabled !== false, id: id, name: String(script.name || id), content: String(script.content || ''), info: String(script.info || ''), buttons: clone(buttons), data: clone(script.data || {}), export_with: clone(script.export_with || { data: true, button: true }) });
        });
    }
    root.__registerCardRuntimeScripts = function (scripts) {
        scriptTreeScopes.character = (Array.isArray(scripts) ? scripts : []).map(function (script, index) {
            const id = String(script && script.id || 'script-' + index);
            const buttons = Array.isArray(script && script.buttons) ? clone(script.buttons) : [];
            return { type: 'script', enabled: script && script.enabled !== false, id: id, name: String(script && script.name || id), content: String(script && script.content || ''), info: String(script && script.info || ''), button: { enabled: buttons.length > 0, buttons: buttons }, data: clone(script && script.data || {}), export_with: clone(script && script.export_with || { data: true, button: true }) };
        });
        rebuildCharacterRegistry();
    };
    root.getScriptId = function () { return activeScriptId; };
    root.getScriptName = function () { return activeScriptName; };
    root.getScriptInfo = function () { return activeScriptInfo; };
    root.getScriptButtons = function () { return clone(activeScriptButtons); };
    root.__setActiveCardScript = function (id, name, info, buttons) {
        activeScriptId = String(id || 'default');
        const registered = scriptRegistry.get(activeScriptId) || {};
        activeScriptName = String(name || registered.name || id || 'default');
        activeScriptInfo = String(info === undefined ? (registered.info || '') : (info || ''));
        activeScriptButtons = Array.isArray(buttons) ? clone(buttons) : clone(registered.buttons || []);
    };
    root.getButtonEvent = function (name) { return 'btn_click_' + name; };
    root.replaceScriptButtons = function (param1, param2) {
        const hasExplicitId = typeof param1 === 'string' && arguments.length > 1;
        const resolvedId = hasExplicitId ? String(param1) : String(activeScriptId || 'default');
        const buttons = hasExplicitId ? param2 : param1;
        const cleanButtons = Array.isArray(buttons) ? clone(buttons) : [];
        const registered = scriptRegistry.get(resolvedId);
        if (registered) registered.buttons = cleanButtons;
        if (resolvedId === activeScriptId) activeScriptButtons = clone(cleanButtons);
        flattenScripts(scriptTreeScopes.character).forEach(function (script) { if (String(script.id) === resolvedId) script.button = { enabled: cleanButtons.length > 0, buttons: clone(cleanButtons) }; });
        root.sendMessageToParent('UPDATE_SCRIPT_BUTTONS', { scriptId: resolvedId, buttons: cleanButtons });
    };
    root.updateScriptButtonsWith = function (updater) {
        updater = requireFunctionCallback('updateScriptButtonsWith', updater);
        const current = root.getScriptButtons();
        const result = updater(current);
        if (result && typeof result.then === 'function') return result.then(function (buttons) { root.replaceScriptButtons(buttons); return root.getScriptButtons(); });
        root.replaceScriptButtons(result);
        return root.getScriptButtons();
    };
    root.appendInexistentScriptButtons = function (param1, param2) {
        const hasExplicitId = typeof param1 === 'string' && arguments.length > 1;
        const resolvedId = hasExplicitId ? String(param1) : String(activeScriptId || 'default');
        const additions = hasExplicitId ? param2 : param1;
        const registered = scriptRegistry.get(resolvedId);
        const current = resolvedId === activeScriptId ? root.getScriptButtons() : clone(registered && registered.buttons || []);
        const next = current.slice();
        (Array.isArray(additions) ? additions : []).forEach(function (button) { if (button && !next.some(function (existing) { return existing && existing.name === button.name; })) next.push(clone(button)); });
        root.replaceScriptButtons(resolvedId, next);
        return next;
    };
    root.replaceScriptInfo = function (info) {
        const cleanInfo = String(info == null ? '' : info);
        activeScriptInfo = cleanInfo;
        const registered = scriptRegistry.get(activeScriptId);
        if (registered) registered.info = cleanInfo;
        flattenScripts(scriptTreeScopes.character).forEach(function (script) { if (String(script.id) === activeScriptId) script.info = cleanInfo; });
    };
    root.getAllEnabledScriptButtons = function () {
        const result = {};
        scriptRegistry.forEach(function (script, scriptId) {
            if (script.enabled === false) return;
            const buttons = (script.buttons || []).filter(function (button) { return button && button.visible !== false; }).map(function (button, index) { return { button_id: scriptId + '--' + index, button_name: String(button.name || '') }; }).filter(function (button) { return Boolean(button.button_name); });
            if (buttons.length) result[scriptId] = buttons;
        });
        return result;
    };
    root.getScriptTrees = function (option) { const type = option && option.type || 'character'; return clone(Array.isArray(scriptTreeScopes[type]) ? scriptTreeScopes[type] : []); };
    root.replaceScriptTrees = function (trees, option) {
        const type = option && option.type || 'character';
        if (!['global','preset','character'].includes(type)) throw new Error('Unknown script-tree scope: ' + type);
        scriptTreeScopes[type] = clone(Array.isArray(trees) ? trees : []);
        extensionSettings.__cardRuntimeScriptTrees = clone(scriptTreeScopes);
        if (type === 'character') rebuildCharacterRegistry();
        rpc('extension.settings.save', { settings: extensionSettings }, 30000).catch(function (error) { log('warn', 'Could not persist script trees: ' + error.message); });
        return root.getScriptTrees(option);
    };
    root.updateScriptTreesWith = function (updater, option) {
        updater = requireFunctionCallback('updateScriptTreesWith', updater);
        const current = root.getScriptTrees(option);
        const result = updater(current);
        if (result && typeof result.then === 'function') return result.then(function (trees) { return root.replaceScriptTrees(trees, option); });
        return root.replaceScriptTrees(result, option);
    };

    const Mvu = {
        events: { VARIABLE_UPDATE_STARTED: 'mvu-variable-update-started', VARIABLE_UPDATE_ENDED: 'mvu-variable-update-ended' },
        getMvuData: function (option) { const variables = root.getVariables(option || { type: 'chat' }); return variables && variables.stat_data ? variables : { stat_data: variables }; },
        getMvuVariable: function (target, path, option) { return deepGet(target || Mvu.getMvuData(option), path, option && option.default_value); },
        set: function (target, path, value) {
            if (typeof target === 'string') { value = path; path = target; const variables = root.getVariables({ type: 'chat' }); deepSet(variables, path, value); return root.replaceVariables(variables, { type: 'chat' }); }
            deepSet(target, path, value); return target;
        },
        insert: function (target, path, value) {
            const list = deepGet(target, path, []); if (Array.isArray(list)) list.push(clone(value)); else deepSet(target, path, value); return target;
        },
        remove: function (target, path) { deepDelete(target, path); return target; },
        extensions: {}
    };
    root.Mvu = Mvu;

    function buildLegacyChat() {
        return chatHistory.map(function (message) {
            return {
                name: message.name, is_user: message.role === 'user', is_system: message.role === 'system',
                is_name: true, send_date: Date.now(), mes: message.message, extra: clone(message.extra || {}),
                swipe_id: message.swipe_id || 0, swipes: clone(message.swipes || [message.message]), swipes_data: clone(message.swipes_data || [{}])
            };
        });
    }
    const bootCharacters = BOOT.catalog && Array.isArray(BOOT.catalog.characters) ? BOOT.catalog.characters.map(function (entry) { return clone(entry.card || entry); }) : [clone(BOOT.characterCard)];
    const currentCharacterIndex = Math.max(0, bootCharacters.findIndex(function (entry) { return entry && entry.name === BOOT.context.name2; }));
    const context = {
        chat: buildLegacyChat(), characters: bootCharacters, characterId: currentCharacterIndex, groups: clone(BOOT.catalog && BOOT.catalog.groups || []), groupId: BOOT.context.groupId || null,
        name1: BOOT.context.name1, name2: BOOT.context.name2, chatId: BOOT.context.chatId, onlineStatus: BOOT.context.onlineStatus || 'Connected',
        eventSource: root.eventSource, event_types: root.tavern_events, extensionSettings: extensionSettings,
        powerUserSettings: root.power_user, chatMetadata: clone(BOOT.chatMetadata || {}), worldInfo: worldInfo,
        getCurrentChatId: function () { return BOOT.context.chatId; },
        saveMetadata: function () { return Promise.resolve(); }, saveSettingsDebounced: function () { return Promise.resolve(); },
        executeSlashCommands: root.executeSlashCommands, substituteParams: root.substitudeMacros,
        sendMessageAsUser: root.sendMessageAsUser, addOneMessage: function (message) { return root.createChatMessages([message]); },
        deleteLastMessage: function () { return root.deleteChatMessages(-1); },
        writeExtensionField: function (_characterId, key, value) { return rpc('character.extension.write', { key: key, value: value }, 30000); },
        getThumbnailUrl: function (_type, url) { return root.resolveCardAsset(url); }
    };
    function syncContext() {
        context.chat = buildLegacyChat();
        context.extensionSettings = extensionSettings;
        context.worldInfo = worldInfo;
        root.__st_chat_history = chatHistory;
        root.__st_world_info = worldInfo;
        if (root.SillyTavern) {
            root.SillyTavern.extensionSettings = extensionSettings;
            if (root.SillyTavern.chat) root.SillyTavern.chat.history = chatHistory;
        }
    }
    root.__st_context = context;
    root.__st_chat_history = chatHistory;
    root.__st_world_info = worldInfo;
    root.getContext = function () { return context; };

    const SillyTavern = {
        version: TAVERN_VERSION, status: 'ready', getContext: root.getContext, extensionSettings: extensionSettings,
        user: { name: BOOT.context.name1, avatar: BOOT.userAvatar },
        libs: {
            lodash: root._, Fuse: root.Fuse, DOMPurify: root.DOMPurify, hljs: root.hljs, localforage: root.localforage,
            Handlebars: root.Handlebars, showdown: root.showdown, moment: root.moment, seedrandom: Math.seedrandom,
            yaml: root.YAML || root.jsyaml, YAML: root.YAML || root.jsyaml, jQuery: root.jQuery, Vue: root.Vue, VueRouter: root.VueRouter, Pinia: root.Pinia, PIXI: root.PIXI, axios: root.axios, marked: root.marked,
            Popper: root.Popper, Bowser: root.bowser || root.Bowser, DiffMatchPatch: root.diff_match_patch, morphdom: root.morphdom
        },
        config: { main_api: BOOT.context.mainApi || 'openai', visual_novel_mode: Boolean(BOOT.context.visualNovelMode) },
        chat: { history: chatHistory, send: root.sendMessageAsUser, lastMessage: function () { return chatHistory[chatHistory.length - 1] || null; }, getHistory: function () { return clone(chatHistory); }, delete: function (range) { return root.deleteChatMessages(range); } },
        worldInfo: { get: function () { return clone(worldInfo); } },
        util: { isMobile: function () { return root.is_mobile; }, delay: function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }, uuidv4: uuid, renderMarkdown: root.formatAsDisplayedMessage },
        markdown: { render: root.formatAsDisplayedMessage }, files: { url: root.resolveCardAsset },
        commands: { registerCommand: function (name, callback) { root.eventOn('slash_' + name, callback); }, runCommand: root.executeSlashCommands },
        modules: { quickReply: {}, expression: {}, characterSelect: {} }, extensions: { quickReply: { enabled: true }, expression: { enabled: true }, characterSelect: { enabled: true } },
        saveExtensionSettings: function (settings) {
            extensionSettings = Object.assign(extensionSettings, clone(settings || {}));
            context.extensionSettings = extensionSettings;
            rpc('extension.settings.save', { settings: extensionSettings }, 30000).catch(function () {});
            return Promise.resolve(clone(extensionSettings));
        },
        loadExtensionSettings: function () { return clone(extensionSettings); },
        loadCharacterData: function () { return rpc('character.data.get', {}, 30000); },
        saveCharacterData: function (data) { return rpc('character.data.save', { data: data }, 30000); },
        event: root.eventSource
    };
    root.ST = root.SillyTavern = SillyTavern;
    root.saveSettingsDebounced = SillyTavern.saveExtensionSettings;
    root.user_avatar = BOOT.userAvatar;
    root.humanized_iso_date = function (value) { return new Date(value || Date.now()).toLocaleString(); };
    if (root.Zod) { root.z = root.Zod; try { if (!root.z.z) root.z.z = root.z; } catch (_) {} }

    root.builtin = {
        lodash: root._, jquery: root.jQuery, vue: root.Vue, vueRouter: root.VueRouter, pinia: root.Pinia, pixi: root.PIXI, axios: root.axios,
        zod: root.z, ejs: root.ejs, yaml: root.YAML || root.jsyaml, localforage: root.localforage
    };
    const helperNames = [
        'audioEnable','audioImport','audioMode','audioPlay','audioSelect','playAudio','pauseAudio','getAudioList','replaceAudioList','appendAudioList','getAudioSettings','setAudioSettings','getCurrentAudio',
        'getCharacterNames','getCharacterIds','getCurrentCharacterName','getCurrentCharacterId','createCharacter','createOrReplaceCharacter','deleteCharacter','getCharacter','replaceCharacter','updateCharacterWith',
        'getChatMessages','setChatMessages','setChatMessage','createChatMessages','deleteChatMessages','rotateChatMessages','formatAsDisplayedMessage','retrieveDisplayedMessage','refreshOneMessage',
        'isAdmin','getExtensionType','getExtensionStatus','getExtensionInstallationInfo','isInstalledExtension','installExtension','uninstallExtension','reinstallExtension','updateExtension',
        'generate','generateRaw','getModelList','getProxyPresetNames','stopGenerationById','stopAllGeneration','initializeGlobal','waitGlobalInitialized',
        'importRawCharacter','importRawChat','importRawPreset','importRawWorldbook','importRawTavernRegex',
        'injectPrompts','uninjectPrompts','getLorebookEntries','replaceLorebookEntries','updateLorebookEntriesWith','updatelorebookEntriesWith','setLorebookEntries','createLorebookEntries','createLorebookEntry','deleteLorebookEntries','deleteLorebookEntry',
        'getLorebookSettings','setLorebookSettings','getLorebooks','deleteLorebook','createLorebook','getCharLorebooks','setCurrentCharLorebooks','getCurrentCharPrimaryLorebook','getChatLorebook','setChatLorebook','getOrCreateChatLorebook',
        'registerMacroLike','unregisterMacroLike','isPresetNormalPrompt','isPresetSystemPrompt','isPresetPlaceholderPrompt','getPresetNames','getLoadedPresetName','loadPreset','createPreset','createOrReplacePreset','deletePreset','renamePreset','getPreset','replacePreset','updatePresetWith','setPreset',
        'getPersonaNames','getPersonaIds','getCurrentPersonaName','getCurrentPersonaId','getPersonaAvatarPath','createPersona','createOrReplacePersona','deletePersona','getPersona','replacePersona','updatePersonaWith',
        'getCharData','getCharAvatarPath','getChatHistoryBrief','getChatHistoryDetail','getScriptTrees','replaceScriptTrees','updateScriptTreesWith','getAllEnabledScriptButtons','getButtonEvent','getScriptButtons','replaceScriptButtons','updateScriptButtonsWith','appendInexistentScriptButtons','getScriptName','getScriptInfo','replaceScriptInfo','eventOnButton','triggerSlash','triggerSlashWithResult','formatAsTavernRegexedString','isCharacterTavernRegexesEnabled',
        'getTavernRegexes','replaceTavernRegexes','updateTavernRegexesWith','reloadIframe','substitudeMacros','substituteMacros','getLastMessageId','getIframeName','getScriptId','getCurrentMessageId','getMessageId','errorCatched','getVariables','getAllVariables','replaceVariables','updateVariablesWith',
        'insertOrAssignVariables','insertVariables','deleteVariable','registerVariableSchema','getWorldbookNames','getGlobalWorldbookNames','rebindGlobalWorldbooks','getCharWorldbookNames',
        'rebindCharWorldbooks','getChatWorldbookName','rebindChatWorldbook','getOrCreateChatWorldbook','createWorldbook','createOrReplaceWorldbook','deleteWorldbook','getWorldbook','replaceWorldbook','updateWorldbookWith','createWorldbookEntries','deleteWorldbookEntries','getFrontendVersion','updateTavernHelper','updateFrontendVersion'
    ];
    root.getFrontendVersion = root.getTavernHelperVersion || function () { return HELPER_VERSION; };
    root.updateTavernHelper = root.updateTavernHelper || unsupported('updateTavernHelper');
    root.updateFrontendVersion = root.updateTavernHelper;
    const officialFunctionSurface = [
        'audioEnable','audioImport','audioMode','audioPlay','audioSelect','setChatMessage','eventOnButton','getButtonEvent','replaceScriptButtons','updateScriptButtonsWith','appendInexistentScriptButtons','replaceScriptInfo',
        'createLorebookEntry','deleteLorebookEntry','getChatLorebook','setChatLorebook','unregisterMacroLike','replaceScriptTrees','updateScriptTreesWith','triggerSlashWithResult',
        'getFrontendVersion','updateTavernHelper','updateFrontendVersion','getExtensionInstallationInfo'
    ];
    officialFunctionSurface.forEach(function (name) { if (typeof root[name] !== 'function') root[name] = unsupported(name); });
    const TavernHelper = { builtin: root.builtin, builtin_prompt_default_order: root.builtin_prompt_default_order, default_preset: root.default_preset, RawCharacter: root.RawCharacter };
    helperNames.forEach(function (name) { if (typeof root[name] === 'function') TavernHelper[name] = root[name]; });
    TavernHelper.capabilities = CAPABILITIES;
    TavernHelper.getCapabilities = function () { return clone(CAPABILITIES); };
    TavernHelper.hasCapability = function (name) { return Boolean(CAPABILITIES[name]); };
    TavernHelper.getTavernHelperVersion = function () { return HELPER_VERSION; };
    TavernHelper.getRuntimeCompatibilityVersion = function () { return IMPLEMENTATION_VERSION; };
    TavernHelper.getTargetTavernHelperVersion = function () { return '4.8.19'; };
    TavernHelper.getTavernHelperExtensionId = function () { return 'third-party/JS-Slash-Runner'; };
    TavernHelper.getTavernVersion = function () { return TAVERN_VERSION; };
    TavernHelper.getFrontendVersion = TavernHelper.getTavernHelperVersion;
    TavernHelper.errorCatched = function (fn, fallback) {
        if (typeof fn !== 'function') {
            log('script-error', 'errorCatched expected a function, received ' + typeof fn, { scriptId: activeScriptId });
            return async function () { return fallback; };
        }
        return async function () { try { return await fn.apply(this, arguments); } catch (error) { log('error', error.message, { stack: error.stack, scriptId: activeScriptId }); return fallback; } };
    };
    root.getTavernHelperVersion = TavernHelper.getTavernHelperVersion;
    root.getTavernHelperExtensionId = TavernHelper.getTavernHelperExtensionId;
    root.getTavernVersion = TavernHelper.getTavernVersion;
    root.errorCatched = TavernHelper.errorCatched;
    root.TavernHelper = TavernHelper;
    Mvu.extensions.TavernHelper = TavernHelper;

    root.module = { exports: {} };
    root.exports = root.module.exports;
    root.require = function (name) {
        const modules = { lodash: root._, jquery: root.jQuery, vue: root.Vue, 'vue-router': root.VueRouter, pinia: root.Pinia, 'pixi.js': root.PIXI, axios: root.axios, zod: root.z, ejs: root.ejs, yaml: root.YAML || root.jsyaml, handlebars: root.Handlebars, dompurify: root.DOMPurify, 'js-yaml': root.jsyaml };
        if (modules[name]) return modules[name];
        throw new Error('Module is not exposed in the isolated card runtime: ' + name);
    };

    let mirrorSubscribed = false;
    let mirrorSnapshotTimer = 0;
    let mirrorObserver = null;
    function buildMirrorSnapshot() {
        try {
            const cloneRoot = document.documentElement.cloneNode(true);
            Array.from(cloneRoot.querySelectorAll('script')).forEach(function (node) { node.remove(); });
            Array.from(cloneRoot.querySelectorAll('#st-loading-overlay')).forEach(function (node) { node.remove(); });
            Array.from(cloneRoot.querySelectorAll('[autofocus]')).forEach(function (node) { node.removeAttribute('autofocus'); });
            return '<!doctype html>' + cloneRoot.outerHTML;
        } catch (error) {
            diagnostic('CARD_RUNTIME_HUD_SNAPSHOT_FAILED', 'hud-mirror', 'snapshot', 'Không thể tạo bản sao giao diện HUD: ' + (error && error.message || error), { stack: error && error.stack });
            return '';
        }
    }
    function sendMirrorSnapshot() {
        if (!mirrorSubscribed) return;
        const html = buildMirrorSnapshot();
        if (!html) return;
        if (html.length > 2000000) {
            diagnostic('CARD_RUNTIME_PAYLOAD_TOO_LARGE', 'hud-mirror', 'snapshot', 'Bản sao HUD vượt quá giới hạn 2 MB.', { details: { size: html.length } });
            return;
        }
        root.parent.postMessage({ type: 'CARD_RUNTIME_MIRROR_SNAPSHOT', payload: { messageId: BOOT.context.messageId, html: html, timestamp: Date.now() } }, '*');
    }
    function scheduleMirrorSnapshot() {
        if (!mirrorSubscribed || mirrorSnapshotTimer) return;
        mirrorSnapshotTimer = setTimeout(function () { mirrorSnapshotTimer = 0; sendMirrorSnapshot(); }, 750);
    }
    function startMirrorObserver() {
        if (!mirrorSubscribed || mirrorObserver || !root.MutationObserver || !document.documentElement) return;
        mirrorObserver = new root.MutationObserver(scheduleMirrorSnapshot);
        mirrorObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    }
    function stopMirrorObserver() {
        if (mirrorSnapshotTimer) { clearTimeout(mirrorSnapshotTimer); mirrorSnapshotTimer = 0; }
        if (mirrorObserver) { mirrorObserver.disconnect(); mirrorObserver = null; }
    }
    root.addEventListener('pagehide', stopMirrorObserver, { once: true });

    let readyResolve;
    root.cardStudioReady = new Promise(function (resolve) { readyResolve = resolve; });
    root.addEventListener('message', function (event) {
        if (event.source !== root.parent || !event.data) return;
        const data = event.data;
        if (data.type === 'CARD_RUNTIME_MIRROR_SUBSCRIBE') {
            mirrorSubscribed = true;
            startMirrorObserver();
            setTimeout(sendMirrorSnapshot, 0);
            return;
        }
        if (data.type === 'CARD_RUNTIME_MIRROR_UNSUBSCRIBE') {
            mirrorSubscribed = false;
            stopMirrorObserver();
            return;
        }
        if (data.type === 'CARD_RUNTIME_MIRROR_REQUEST') {
            mirrorSubscribed = true;
            startMirrorObserver();
            sendMirrorSnapshot();
            return;
        }
        if (data.type === 'CARD_RUNTIME_RPC_RESULT') {
            const pending = pendingRpc.get(data.requestId);
            if (!pending) return;
            clearTimeout(pending.timeout);
            pendingRpc.delete(data.requestId);
            if (data.ok) pending.resolve(data.result);
            else {
                pending.reject(new Error(data.error || 'Card runtime request failed.'));
            }
            return;
        }
        if (data.type === 'CARD_RUNTIME_EVENT') {
            emitEvent.apply(null, [data.eventName].concat(Array.isArray(data.args) ? data.args : []));
            return;
        }
        if (data.type === 'CARD_RUNTIME_STATE_UPDATE') {
            if (data.payload && data.payload.chatHistory) chatHistory = clone(data.payload.chatHistory);
            if (data.payload && data.payload.extensionSettings) extensionSettings = clone(data.payload.extensionSettings);
            if (data.payload && Array.isArray(data.payload.worldInfo)) worldInfo = clone(data.payload.worldInfo);
            if (data.payload && Array.isArray(data.payload.lorebookNames)) lorebookNames = Array.from(new Set(data.payload.lorebookNames.map(String)));
            if (data.payload && data.payload.variableScopes) {
                Object.entries(data.payload.variableScopes).forEach(function (entry) { scopeCache.set(entry[0], clone(asObject(entry[1]))); });
                if (Object.prototype.hasOwnProperty.call(data.payload.variableScopes, 'chat')) {
                    root.__st_live_data = scopeCache.get('chat') || {};
                    root.stat_data = root.__st_live_data && root.__st_live_data.stat_data ? root.__st_live_data.stat_data : root.__st_live_data;
                    emitEvent('mvu-variable-update-ended', { stat_data: root.stat_data, variables: root.__st_live_data });
                }
            }
            syncContext();
            return;
        }
        if (data.type === 'HANDSHAKE_ACK') {
            if (data.payload && Array.isArray(data.payload.chatHistory)) chatHistory = clone(data.payload.chatHistory);
            if (data.payload && data.payload.extensionSettings) extensionSettings = clone(data.payload.extensionSettings);
            if (data.payload && Array.isArray(data.payload.worldInfo)) worldInfo = clone(data.payload.worldInfo);
            if (data.payload && Array.isArray(data.payload.lorebookNames)) lorebookNames = Array.from(new Set(data.payload.lorebookNames.map(String)));
            if (data.payload && data.payload.variableScopes) Object.entries(data.payload.variableScopes).forEach(function (entry) { scopeCache.set(entry[0], clone(asObject(entry[1]))); });
            if (data.payload && Array.isArray(data.payload.worldInfo)) worldInfo = clone(data.payload.worldInfo);
            syncContext();
            readyResolve(true);
            setTimeout(function () {
                emitEvent(root.tavern_events.CHAT_CHANGED, BOOT.context.chatId);
                emitEvent(root.tavern_events.EXTENSION_SETTINGS_LOADED);
                emitEvent(root.tavern_events.SETTINGS_LOADED);
                emitEvent(root.tavern_events.APP_READY);
            }, 0);
        }
                if (data.type === 'EXECUTE_BUTTON_SCRIPT') emitEvent('btn_click_' + data.payload.buttonName);
    });

    root.EjsTemplate = { setFeatures: function() {} };

    const catalog = BOOT.catalog || { characters: [], personas: [], presets: [], extensions: {} };
    catalog.characters = Array.isArray(catalog.characters) ? catalog.characters : [];
    catalog.personas = Array.isArray(catalog.personas) ? catalog.personas : [];
    catalog.presets = Array.isArray(catalog.presets) ? catalog.presets : [];
    catalog.extensions = asObject(catalog.extensions);

    function responseFromRpc(result, status) {
        const responseStatus = Number(status || result && result.status || 200);
        try {
            return new Response(JSON.stringify(result && result.body !== undefined ? result.body : result || {}), {
                status: responseStatus,
                headers: { 'content-type': 'application/json' }
            });
        } catch (_) {
            return { ok: responseStatus >= 200 && responseStatus < 300, status: responseStatus, json: function () { return Promise.resolve(clone(result)); }, text: function () { return Promise.resolve(JSON.stringify(result || {})); } };
        }
    }

    function currentCharacterRecord() {
        return catalog.characters.find(function (entry) { return entry && (entry.current || entry.fileName === BOOT.context.characterKey || entry.name === BOOT.context.name2 || entry.card && entry.card.name === BOOT.context.name2); })
            || { fileName: BOOT.context.characterKey, name: BOOT.context.name2, avatar: BOOT.characterAvatar, card: BOOT.characterCard, current: true };
    }
    function characterNameOf(entry) { return String(entry && (entry.name || entry.card && entry.card.name) || ''); }
    function characterIdOf(entry) { return String(entry && (entry.avatar || entry.fileName || entry.id || characterNameOf(entry)) || ''); }
    function toOfficialCharacter(entry) {
        const card = clone(entry && entry.card || entry || {});
        const firstMessages = [String(card.first_mes || '')].concat(Array.isArray(card.alternate_greetings) ? card.alternate_greetings.map(String) : []);
        return {
            avatar: entry && (entry.avatar || entry.avatarUrl || entry.fileName) || BOOT.characterAvatar || characterNameOf(entry) + '.png',
            version: String(card.character_version || card.spec_version || ''),
            creator: String(card.creator || ''),
            creator_notes: String(card.creator_notes || card.creatorcomment || ''),
            worldbook: card.char_book && (card.char_book.name || characterNameOf(entry)) || null,
            description: String(card.description || ''),
            first_messages: firstMessages,
            extensions: clone(card.extensions || {}),
            personality: String(card.personality || ''),
            scenario: String(card.scenario || ''),
            mes_example: String(card.mes_example || ''),
            raw: card
        };
    }
    function updateCatalogRecord(list, predicate, value) {
        const index = list.findIndex(predicate);
        if (index >= 0) list[index] = clone(value);
        else list.push(clone(value));
    }

    root.getCharacterNames = function () { return catalog.characters.map(characterNameOf).filter(Boolean); };
    root.getCharacterIds = function () { return catalog.characters.map(characterIdOf).filter(Boolean); };
    root.getCurrentCharacterName = function () { return characterNameOf(currentCharacterRecord()) || null; };
    root.getCurrentCharacterId = function () { return characterIdOf(currentCharacterRecord()) || null; };
    root.getCharacter = function (name) {
        const target = !name || name === 'current' ? currentCharacterRecord() : catalog.characters.find(function (entry) { return characterNameOf(entry) === String(name) || characterIdOf(entry) === String(name); });
        if (!target) return Promise.reject(new Error("Character '" + name + "' does not exist"));
        return Promise.resolve(toOfficialCharacter(target));
    };
    root.createCharacter = async function (name, character) {
        if (name === 'current' || root.getCharacterNames().includes(String(name))) return false;
        const result = await rpc('character.create', { name: name, character: character || {} }, 120000);
        catalog.characters.push(clone(result));
        return true;
    };
    root.createOrReplaceCharacter = async function (name, character, options) {
        const exists = root.getCharacterNames().includes(String(name));
        if (exists) await root.replaceCharacter(name, character || {}, options || {});
        else await root.createCharacter(name, character || {});
        return !exists;
    };
    root.deleteCharacter = async function (name, options) {
        const targetName = !name || name === 'current' ? root.getCurrentCharacterName() : String(name);
        if (!targetName || !root.getCharacterNames().includes(targetName)) return false;
        await rpc('character.delete', { name: targetName, options: options || {} }, 120000);
        catalog.characters = catalog.characters.filter(function (entry) { return characterNameOf(entry) !== targetName; });
        return true;
    };
    root.replaceCharacter = async function (name, character, options) {
        const targetName = !name || name === 'current' ? root.getCurrentCharacterName() : String(name);
        const result = await rpc('character.replace', { name: targetName, character: character || {}, options: options || {} }, 120000);
        updateCatalogRecord(catalog.characters, function (entry) { return characterNameOf(entry) === targetName; }, result);
    };
    root.updateCharacterWith = async function (name, updater) {
        updater = requireFunctionCallback('updateCharacterWith', updater);
        const next = await updater(await root.getCharacter(name));
        await root.replaceCharacter(name, next);
        return next;
    };

    function personaIdOf(persona) { return String(persona && (persona.avatar_id || persona.id) || ''); }
    function personaNameOf(persona) { return String(persona && persona.name || ''); }
    function currentPersonaRecord() {
        return catalog.personas.find(function (persona) { return persona && (persona.current || personaIdOf(persona) === BOOT.context.personaId || personaNameOf(persona) === BOOT.context.name1); })
            || { id: BOOT.context.personaId || 'current', avatar_id: BOOT.context.personaId || 'current', name: BOOT.context.name1, description: '', avatar: BOOT.userAvatar, current: true };
    }
    function toOfficialPersona(persona) {
        return Object.assign({
            avatar_id: personaIdOf(persona), avatar: persona && persona.avatar || BOOT.userAvatar || personaIdOf(persona),
            name: personaNameOf(persona), title: '', description: '', position: 0, depth: 2, role: 0,
            lorebook: '', connections: [], is_default: false
        }, clone(persona || {}));
    }
    root.getPersonaNames = function () { return catalog.personas.map(personaNameOf).filter(Boolean); };
    root.getPersonaIds = function () { return catalog.personas.map(personaIdOf).filter(Boolean); };
    root.getCurrentPersonaName = function () { return personaNameOf(currentPersonaRecord()) || null; };
    root.getCurrentPersonaId = function () { return personaIdOf(currentPersonaRecord()) || null; };
    root.getPersonaAvatarPath = function (id) { const target = !id || id === 'current' ? currentPersonaRecord() : catalog.personas.find(function (persona) { return personaIdOf(persona) === String(id) || personaNameOf(persona) === String(id); }); return target && (target.avatar || target.avatarUrl) || null; };
    root.getPersona = function (id) { const target = !id || id === 'current' ? currentPersonaRecord() : catalog.personas.find(function (persona) { return personaIdOf(persona) === String(id) || personaNameOf(persona) === String(id); }); if (!target) throw new Error("Persona '" + id + "' does not exist"); return toOfficialPersona(target); };
    root.createPersona = async function (name, persona) {
        if (name === 'current' || root.getPersonaNames().includes(String(name))) return false;
        const result = await rpc('persona.create', { name: name, persona: persona || {} }, 120000);
        catalog.personas.push(clone(result));
        return true;
    };
    root.createOrReplacePersona = async function (name, persona, options) {
        const match = catalog.personas.find(function (entry) { return personaNameOf(entry) === String(name); });
        if (match) await root.replacePersona(personaIdOf(match), persona || {}, options || {});
        else await root.createPersona(name, persona || {});
        return !match;
    };
    root.deletePersona = async function (id) {
        const target = !id || id === 'current' ? currentPersonaRecord() : catalog.personas.find(function (persona) { return personaIdOf(persona) === String(id) || personaNameOf(persona) === String(id); });
        if (!target) return false;
        await rpc('persona.delete', { id: personaIdOf(target) }, 120000);
        catalog.personas = catalog.personas.filter(function (persona) { return personaIdOf(persona) !== personaIdOf(target); });
        return true;
    };
    root.replacePersona = async function (id, persona, options) {
        const target = !id || id === 'current' ? currentPersonaRecord() : catalog.personas.find(function (entry) { return personaIdOf(entry) === String(id) || personaNameOf(entry) === String(id); });
        if (!target) throw new Error("Persona '" + id + "' does not exist");
        const result = await rpc('persona.replace', { id: personaIdOf(target), persona: persona || {}, options: options || {} }, 120000);
        updateCatalogRecord(catalog.personas, function (entry) { return personaIdOf(entry) === personaIdOf(target); }, result);
    };
    root.updatePersonaWith = async function (id, updater, options) { updater = requireFunctionCallback('updatePersonaWith', updater); const next = await updater(root.getPersona(id)); await root.replacePersona(id, next, options); return next; };

    function presetNameOf(preset) { return String(preset && preset.name || ''); }
    function currentPresetRecord() { return catalog.presets.find(function (preset) { return presetNameOf(preset) === BOOT.context.presetName; }) || catalog.presets[0] || {}; }
    root.getPresetNames = function () { return catalog.presets.map(presetNameOf).filter(Boolean); };
    root.getLoadedPresetName = function () { return BOOT.context.presetName || presetNameOf(currentPresetRecord()); };
    root.getPreset = function (name) {
        const target = !name || name === 'in_use' ? currentPresetRecord() : catalog.presets.find(function (preset) { return presetNameOf(preset) === String(name); });
        if (!target) throw new Error("Preset '" + name + "' does not exist");
        return clone(target);
    };
    root.loadPreset = function (name) { if (!root.getPresetNames().includes(String(name))) return false; BOOT.context.presetName = String(name); rpc('preset.load', { name: name }, 60000).catch(function (error) { log('error', error.message); }); return true; };
    root.createPreset = async function (name, preset) { if (name === 'in_use' || root.getPresetNames().includes(String(name))) return false; const result = await rpc('preset.create', { name: name, preset: preset || root.default_preset }, 120000); catalog.presets.push(clone(result)); return true; };
    root.createOrReplacePreset = async function (name, preset, options) { const targetName = name === 'in_use' ? root.getLoadedPresetName() : String(name); const exists = root.getPresetNames().includes(targetName); if (exists) await root.replacePreset(targetName, preset, options); else await root.createPreset(targetName, preset); return !exists; };
    root.deletePreset = async function (name) { if (!root.getPresetNames().includes(String(name))) return false; await rpc('preset.delete', { name: name }, 120000); catalog.presets = catalog.presets.filter(function (preset) { return presetNameOf(preset) !== String(name); }); return true; };
    root.renamePreset = async function (name, newName) { if (!root.getPresetNames().includes(String(name)) || root.getPresetNames().includes(String(newName))) return false; const result = await rpc('preset.rename', { name: name, newName: newName }, 120000); updateCatalogRecord(catalog.presets, function (preset) { return presetNameOf(preset) === String(name); }, result); return true; };
    root.replacePreset = async function (name, preset, options) { const targetName = name === 'in_use' ? root.getLoadedPresetName() : String(name); const result = await rpc('preset.replace', { name: targetName, preset: preset || {}, options: options || {} }, 120000); updateCatalogRecord(catalog.presets, function (entry) { return presetNameOf(entry) === targetName; }, result); };
    root.updatePresetWith = async function (name, updater, options) { updater = requireFunctionCallback('updatePresetWith', updater); const next = await updater(root.getPreset(name)); await root.replacePreset(name, next, options); return next; };
    root.setPreset = async function (name, partial, options) { const current = root.getPreset(name); const next = Object.assign({}, current, clone(partial || {})); await root.replacePreset(name, next, options); return next; };

    root.isAdmin = function () { return false; };
    function isBundledHelper(id) { return /(?:^|\/)JS-Slash-Runner$/i.test(String(id || '')); }
    root.getExtensionType = function (id) { const item = catalog.extensions[String(id)]; return item && (item.type === 'global' || item.type === 'local' || item.type === 'system') ? item.type : (isBundledHelper(id) ? 'local' : null); };
    root.getExtensionInstallationInfo = async function (id) {
        const item = catalog.extensions[String(id)];
        if (!item && !isBundledHelper(id)) return null;
        return { current_branch_name: String(item && item.current_branch_name || 'bundled'), current_commit_hash: String(item && item.current_commit_hash || '36d8889a99f1cf09d3d1f8aabd0eba33975dc64d'), is_up_to_date: true, remote_url: String(item && (item.remote_url || item.url) || 'https://github.com/N0VI028/JS-Slash-Runner') };
    };
    root.getExtensionStatus = root.getExtensionInstallationInfo;
    root.isInstalledExtension = function (id) { return Boolean(catalog.extensions[String(id)]) || isBundledHelper(id); };
    function unsupportedExtensionMutation(action) { return async function () { return responseFromRpc({ ok: false, error: action + ' is unavailable in a static Card Studio deployment' }, 501); }; }
    root.installExtension = unsupportedExtensionMutation('Extension installation');
    root.uninstallExtension = unsupportedExtensionMutation('Extension removal');
    root.reinstallExtension = unsupportedExtensionMutation('Extension reinstallation');
    root.updateExtension = unsupportedExtensionMutation('Extension update');

    async function readRawContent(content) {
        if (typeof content === 'string') return content;
        if (content && typeof content.text === 'function') return await content.text();
        if (content instanceof ArrayBuffer) return new TextDecoder().decode(content);
        return JSON.stringify(content || {});
    }
    root.importRawCharacter = async function (name, content) { const result = await rpc('raw.import.character', { name: name, content: content }, 180000); if (result && result.character) catalog.characters.push(clone(result.character)); return responseFromRpc(result); };
    root.importRawChat = async function (name, content) { return responseFromRpc(await rpc('raw.import.chat', { name: name, content: await readRawContent(content) }, 180000)); };
    root.importRawPreset = async function (name, content) { const result = await rpc('raw.import.preset', { name: name, content: await readRawContent(content) }, 180000); if (result && result.preset) updateCatalogRecord(catalog.presets, function (preset) { return presetNameOf(preset) === presetNameOf(result.preset); }, result.preset); return Boolean(result && result.ok !== false); };
    root.importRawWorldbook = async function (name, content) { const result = await rpc('raw.import.worldbook', { name: name, content: await readRawContent(content) }, 180000); if (result && result.name && !lorebookNames.includes(result.name)) lorebookNames.push(result.name); return Boolean(result && result.ok !== false); };
    root.importRawTavernRegex = function (name, content) { try { const regex = JSON.parse(String(content)); const list = Array.isArray(regex) ? regex : [regex]; root.replaceTavernRegexes(root.getTavernRegexes().concat(list)); rpc('raw.import.regex', { name: name, content: String(content) }, 60000).catch(function () {}); return true; } catch (_) { return false; } };

    root.audioEnable = function (_args, value) { const settings = root.getAudioSettings(_args && _args.type || 'bgm'); const normalized = String(value === undefined ? _args && (_args.state || _args._) || 'toggle' : value).toLowerCase(); settings.enabled = normalized === 'toggle' ? !settings.enabled : !['off', 'false', '0', 'disable', 'disabled'].includes(normalized); root.setAudioSettings(_args && _args.type || 'bgm', settings); return settings.enabled ? 'on' : 'off'; };
    root.audioPlay = function (args, value) { const source = value || args && (args.url || args.src || args._); if (String(source || '').toLowerCase() === 'pause' || String(source || '').toLowerCase() === 'stop') { root.pauseAudio(args && args.type); return ''; } root.playAudio(args && args.type || 'bgm', source); return String(source || ''); };
    root.audioMode = function (args) { const settings = root.getAudioSettings(args && args.type || 'bgm'); if (args && args.mode) settings.mode = args.mode; root.setAudioSettings(args && args.type || 'bgm', settings); return String(settings.mode || 'repeat_all'); };
    root.audioImport = function (args, value) { let items = value || args && (args.value || args._) || []; try { if (typeof items === 'string') items = JSON.parse(items); } catch (_) { items = [{ url: String(items) }]; } const type = args && args.type || 'bgm'; root.appendAudioList(type, Array.isArray(items) ? items : [items]); return root.getAudioList(type); };
    root.audioSelect = function (args, value) { const type = args && args.type || 'bgm'; const list = root.getAudioList(type); const index = Math.max(0, Number(value !== undefined ? value : args && args.index) || 0); const selected = list[index] || null; if (selected) root.playAudio(type, selected); return selected; };

    const ejsDefaultFeatures = Object.freeze({ enabled: true, generate_enabled: true, generate_loader_enabled: true, inject_loader_enabled: true, render_enabled: true, render_loader_enabled: true, code_blocks_enabled: true, raw_message_evaluation_enabled: true, filter_message_enabled: false, depth_limit: -1, autosave_enabled: true, preload_worldinfo_enabled: true, with_context_disabled: false, debug_enabled: false, invert_enabled: false, compile_workers: false, sandbox: !FULL_COMPATIBILITY_MODE, cache_enabled: 1, cache_size: 100, cache_hasher: 'h32ToString' });
    let ejsFeatures = clone(ejsDefaultFeatures);
    root.EjsTemplate = {
        evaltemplate: async function (code, suppliedContext, options) { if (!root.ejs || typeof root.ejs.render !== 'function') return root.substitudeMacros(String(code || '')); const environment = suppliedContext || await root.EjsTemplate.prepareContext(); return await root.ejs.render(String(code || ''), environment, Object.assign({ async: true }, options || {})); },
        prepareContext: async function (additionalContext, lastMessageId) { return Object.assign({}, root.getAllVariables(lastMessageId), { SillyTavern: root.SillyTavern, TavernHelper: root.TavernHelper, Mvu: root.Mvu, stat_data: root.stat_data, getvar: root.getvar, getwi: root.getwi, toastr: root.toastr, _: root._, YAML: root.YAML, z: root.z }, clone(additionalContext || {})); },
        getSyntaxErrorInfo: async function (code) { try { if (root.ejs && typeof root.ejs.compile === 'function') root.ejs.compile(String(code || ''), { async: true }); return ''; } catch (error) { return String(error && error.message || error); } },
        allVariables: function (endMessageId) { return root.getAllVariables(endMessageId); },
        getFeatures: function () { return clone(ejsFeatures); },
        setFeatures: function (features) { ejsFeatures = Object.assign(ejsFeatures, clone(features || {})); },
        resetFeatures: function () { ejsFeatures = clone(ejsDefaultFeatures); }
    };

    const toolRegistry = new Map();
    const slashRegistry = new Map();
    const nativeSlashExecutor = root.executeSlashCommands;
    async function executeRegisteredSlash(command) {
        const text = String(command || '').trim();
        const match = text.match(/^\/?([^\s|]+)(?:\s+([\s\S]*))?$/);
        if (!match) return nativeSlashExecutor(command);
        const registered = slashRegistry.get(match[1]);
        if (!registered) return nativeSlashExecutor(command);
        const callback = registered.callback || registered.execute || registered.handler;
        if (typeof callback !== 'function') throw new Error('Registered slash command has no callback: ' + match[1]);
        return await callback({}, match[2] || '');
    }
    root.executeSlashCommands = root.triggerSlash = root.triggerSlashWithResult = executeRegisteredSlash;
    root.registerSlashCommand = function (name, callback) { slashRegistry.set(String(name).replace(/^\//, ''), { name: name, callback: callback }); return callback; };
    const dataBankScrapers = new Map();
    const localeData = {};
    const ARGUMENT_TYPE = Object.freeze({ STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean', RANGE: 'range', CLOSURE: 'closure', SUBCOMMAND: 'subcommand', VARIABLE_NAME: 'variable_name', ENUM: 'enum', LIST: 'list', DICTIONARY: 'dictionary' });
    function SlashCommand(definition) { Object.assign(this, definition || {}); }
    function SlashCommandArgument(definition) { Object.assign(this, definition || {}); }
    function SlashCommandNamedArgument(definition) { Object.assign(this, definition || {}); }
    function SlashCommandEnumValue(value, description) { this.value = value; this.description = description || ''; }
    const SlashCommandParser = { commands: slashRegistry, addCommandObject: function (command) { const name = String(command && (command.name || command.command) || ''); if (name) slashRegistry.set(name, command); return command; }, getCommand: function (name) { return slashRegistry.get(String(name)); } };
    class Popup {
        constructor(content, type, options) { this.content = content; this.type = type; this.options = options || {}; }
        show() { return root.callPopup(this.content, this.type, this.options && this.options.title); }
        complete(result) { return Promise.resolve(result); }
    }
    class ModuleWorkerWrapper {
        constructor(url, options) { this.worker = new Worker(url, Object.assign({ type: 'module' }, options || {})); }
        postMessage() { return this.worker.postMessage.apply(this.worker, arguments); }
        terminate() { return this.worker.terminate(); }
        addEventListener() { return this.worker.addEventListener.apply(this.worker, arguments); }
        removeEventListener() { return this.worker.removeEventListener.apply(this.worker, arguments); }
    }
    class ChatCompletionService { static processRequest(options) { return root.generate(options || {}); } }
    class TextCompletionService { static processRequest(options) { return root.generate(options || {}); } }
    class ConnectionManagerRequestService { static sendRequest(options) { return root.generate(options || {}); } }

    const compatContext = {
        accountStorage: root.localStorage || {},
        characters: catalog.characters,
        groups: [],
        getRequestHeaders: function (options) { return options && options.omitContentType ? {} : { 'Content-Type': 'application/json' }; },
        reloadCurrentChat: function () { return rpc('chat.reload', {}, 60000); },
        renameChat: function (name) { return rpc('chat.rename', { name: name }, 60000); },
        maxContext: Number(currentPresetRecord().truncation_length || currentPresetRecord().max_context || 0),
        saveMetadataDebounced: function () { return context.saveMetadata(); },
        streamingProcessor: null,
        eventTypes: root.tavern_events,
        deleteMessage: root.deleteChatMessages,
        generate: root.generate,
        sendStreamingRequest: function (options) { return root.generate(Object.assign({}, options || {}, { should_stream: true })); },
        sendGenerationRequest: function (options) { return root.generate(options || {}); },
        stopGeneration: root.stopAllGeneration,
        tokenizers: {},
        getTextTokens: function (text) { return Array.from(String(text || '')).map(function (value) { return value.codePointAt(0); }); },
        getTokenCount: function (text) { return Math.ceil(String(text || '').length / 4); },
        getTokenCountAsync: function (text) { return Promise.resolve(Math.ceil(String(text || '').length / 4)); },
        extensionPrompts: promptInjects,
        setExtensionPrompt: function (key, value, position, depth, scan) { if (value === undefined || value === null || value === '') root.uninjectPrompts(key); else root.injectPrompts({ id: key, content: value, position: position, depth: depth, scan: scan }); },
        updateChatMetadata: function (value) { Object.assign(context.chatMetadata, clone(value || {})); return context.saveMetadata(); },
        saveChat: function () { return rpc('chat.save', {}, 60000); },
        openCharacterChat: function (id) { return rpc('character.select', { id: id }, 60000); },
        openGroupChat: function (id) { return rpc('group.select', { id: id }, 60000); },
        sendSystemMessage: function (type, text) { return root.createChatMessages([{ role: 'system', message: text || type || '' }]); },
        activateSendButtons: function () { root.sendMessageToParent('SET_INPUT_LOCKED', false); },
        deactivateSendButtons: function () { root.sendMessageToParent('SET_INPUT_LOCKED', true); },
        saveReply: function (messageId, text) { return root.setChatMessage({ message_id: messageId, message: text }); },
        substituteParamsExtended: root.substitudeMacros,
        SlashCommandParser: SlashCommandParser,
        SlashCommand: SlashCommand,
        SlashCommandArgument: SlashCommandArgument,
        SlashCommandNamedArgument: SlashCommandNamedArgument,
        SlashCommandEnumValue: SlashCommandEnumValue,
        ARGUMENT_TYPE: ARGUMENT_TYPE,
        executeSlashCommandsWithOptions: async function (command) { const pipe = await root.executeSlashCommands(command); return { pipe: pipe, isAborted: false }; },
        registerSlashCommand: root.registerSlashCommand,
        timestampToMoment: function (value) { return root.moment ? root.moment(value) : new Date(value); },
        registerHelper: function (name, helper) { if (root.Handlebars && root.Handlebars.registerHelper) root.Handlebars.registerHelper(name, helper); return helper; },
        registerMacro: root.registerMacroLike,
        unregisterMacro: root.unregisterMacroLike,
        registerFunctionTool: function (tool) { const name = String(tool && (tool.name || tool.function && tool.function.name) || uuid()); toolRegistry.set(name, tool); return name; },
        unregisterFunctionTool: function (name) { return toolRegistry.delete(String(name)); },
        isToolCallingSupported: function () { return true; },
        canPerformToolCalls: function () { return true; },
        ToolManager: { tools: toolRegistry, registerFunctionTool: function (tool) { return compatContext.registerFunctionTool(tool); }, unregisterFunctionTool: function (name) { return toolRegistry.delete(String(name)); } },
        registerDebugFunction: function (name, fn) { root[String(name)] = fn; return fn; },
        renderExtensionTemplate: function (_extension, templateId, data) { const template = typeof templateId === 'string' && templateId.includes('<') ? templateId : ''; return root.ejs && template ? root.ejs.render(template, data || {}) : template; },
        renderExtensionTemplateAsync: async function (extension, templateId, data) { return await compatContext.renderExtensionTemplate(extension, templateId, data); },
        registerDataBankScraper: function (name, scraper) { dataBankScrapers.set(String(name), scraper); return scraper; },
        callPopup: root.callPopup,
        callGenericPopup: root.callPopup,
        showLoader: function () { const element = document.getElementById('st-loading-overlay'); if (element) element.style.display = ''; },
        hideLoader: function () { const element = document.getElementById('st-loading-overlay'); if (element) element.style.display = 'none'; },
        mainApi: 'openai',
        ModuleWorkerWrapper: ModuleWorkerWrapper,
        getTokenizerModel: function () { return root.getModelList().then(function (models) { return models[0] || ''; }); },
        generateQuietPrompt: root.generate,
        generateRaw: root.generateRaw,
        generateRawData: async function (options) { return { text: await root.generateRaw(options || {}) }; },
        writeExtensionField: context.writeExtensionField,
        writeExtensionFieldBulk: async function (characterId, values) { const entries = Object.entries(values || {}); await Promise.all(entries.map(function (entry) { return context.writeExtensionField(characterId, entry[0], entry[1]); })); return true; },
        selectCharacterById: function (id) { return rpc('character.select', { id: id }, 60000); },
        messageFormatting: root.formatAsDisplayedMessage,
        shouldSendOnEnter: function () { return true; },
        isMobile: function () { return root.is_mobile; },
        t: function (text) { return String(text || ''); },
        translate: function (text) { return String(text || ''); },
        getCurrentLocale: function () { return navigator.language || 'en'; },
        addLocaleData: function (locale, data) { localeData[String(locale)] = Object.assign(localeData[String(locale)] || {}, clone(data || {})); },
        tags: [], tagMap: {}, menuType: 'character_edit',
        createCharacterData: function (name) { return { name: name || 'Character', description: '', first_mes: '', mes_example: '', extensions: {} }; },
        Popup: Popup,
        POPUP_TYPE: Object.freeze({ TEXT: 'text', HTML: 'html', INPUT: 'input', CONFIRM: 'confirm', DISPLAY: 'display' }),
        POPUP_RESULT: Object.freeze({ AFFIRMATIVE: 1, NEGATIVE: 0, CANCELLED: null }),
        chatCompletionSettings: currentPresetRecord(),
        textCompletionSettings: currentPresetRecord(),
        getCharacters: function () { return Promise.resolve(clone(catalog.characters)); },
        getOneCharacter: function (id) { return root.getCharacter(id); },
        getCharacterCardFields: function (card) { return clone(card && card.raw || card || BOOT.characterCard); },
        getCharacterSource: function (card) { return clone(card && card.source || []); },
        importFromExternalUrl: async function (url) { const response = await fetch(url); return await response.json(); },
        importTags: function (tags) { compatContext.tags = Array.from(new Set(compatContext.tags.concat(Array.isArray(tags) ? tags : []))); return compatContext.tags; },
        uuidv4: uuid,
        humanizedDateTime: function (value) { return new Date(value || Date.now()).toLocaleString(); },
        updateMessageBlock: function (messageId, message) { return root.setChatMessage(Object.assign({ message_id: messageId }, message || {})); },
        appendMediaToMessage: function (message, media) { const next = clone(message || {}); next.extra = next.extra || {}; next.extra.media = Array.isArray(next.extra.media) ? next.extra.media : []; next.extra.media.push(clone(media)); return next; },
        ensureMessageMediaIsArray: function (message) { message.extra = message.extra || {}; if (!Array.isArray(message.extra.media)) message.extra.media = message.extra.media ? [message.extra.media] : []; return message.extra.media; },
        getMediaDisplay: function (media) { return media && (media.url || media.src || media.path) || ''; },
        getMediaIndex: function (message, media) { return compatContext.ensureMessageMediaIsArray(message).indexOf(media); },
        scrollChatToBottom: function () { const chatElement = document.getElementById('chat'); if (chatElement) chatElement.scrollTop = chatElement.scrollHeight; },
        scrollOnMediaLoad: function () { return compatContext.scrollChatToBottom(); },
        macros: { register: root.registerMacroLike, unregister: root.unregisterMacroLike, substitute: root.substitudeMacros },
        loader: { show: function () { return compatContext.showLoader(); }, hide: function () { return compatContext.hideLoader(); } },
        swipe: { get: function (id) { return root.getChatMessages(id, { include_swipes: true }); }, set: function (id, swipeId) { return root.setChatMessage({ message_id: id, swipe_id: swipeId }); } },
        variables: { get: root.getVariables, getAll: root.getAllVariables, replace: root.replaceVariables, update: root.updateVariablesWith, insert: root.insertVariables, delete: root.deleteVariable },
        loadWorldInfo: function (name) { return root.getWorldbook(name); },
        saveWorldInfo: function (name, book) { return root.replaceWorldbook(name, book); },
        reloadWorldInfoEditor: function () { return Promise.resolve(); },
        updateWorldInfoList: function () { return rpc('lorebook.names', {}, 30000); },
        convertCharacterBook: function (book) { return clone(book || {}); },
        getWorldInfoPrompt: function () { return worldInfo.map(function (entry) { return entry.content || ''; }).join('\n'); },
        getWorldInfoNames: root.getWorldbookNames,
        CONNECT_API_MAP: {},
        getTextGenServer: function () { return ''; },
        extractMessageFromData: function (data) { return String(data && (data.message || data.text || data.content) || ''); },
        getPresetManager: function () { return { getAllPresets: function () { return clone(catalog.presets); }, getPreset: root.getPreset, selectPreset: root.loadPreset, savePreset: root.replacePreset, deletePreset: root.deletePreset }; },
        getChatCompletionModel: function () { return root.getModelList().then(function (models) { return models[0] || ''; }); },
        printMessages: function () { return Promise.resolve(); },
        clearChat: function () { return root.deleteChatMessages('0-' + root.getLastMessageId()); },
        ChatCompletionService: ChatCompletionService,
        TextCompletionService: TextCompletionService,
        ConnectionManagerRequestService: ConnectionManagerRequestService,
        updateReasoningUI: function () { return Promise.resolve(); },
        parseReasoningFromString: function (text) { const match = String(text || '').match(/<thinking>([\s\S]*?)<\/thinking>/i); return { reasoning: match ? match[1] : '', content: match ? String(text).replace(match[0], '') : String(text || '') }; },
        getReasoningTemplateByName: function (name) { return { name: name || 'default', prefix: '<thinking>', suffix: '</thinking>' }; },
        unshallowCharacter: function (id) { return root.getCharacter(id); },
        unshallowGroupMembers: function () { return Promise.resolve([]); },
        getExtensionManifest: function (id) { return root.getExtensionInstallationInfo(id); },
        openThirdPartyExtensionMenu: function (id) { return root.eventEmit('extension_menu_opened', id); },
        symbols: Object.freeze({}), constants: Object.freeze({})
    };

    Object.assign(context, compatContext);
    const officialContextKeys = ["accountStorage","chat","characters","groups","name1","name2","characterId","groupId","chatId","getCurrentChatId","getRequestHeaders","reloadCurrentChat","renameChat","saveSettingsDebounced","onlineStatus","maxContext","chatMetadata","saveMetadataDebounced","streamingProcessor","eventSource","eventTypes","addOneMessage","deleteLastMessage","deleteMessage","generate","sendStreamingRequest","sendGenerationRequest","stopGeneration","tokenizers","getTextTokens","getTokenCount","getTokenCountAsync","extensionPrompts","setExtensionPrompt","updateChatMetadata","saveChat","openCharacterChat","openGroupChat","saveMetadata","sendSystemMessage","activateSendButtons","deactivateSendButtons","saveReply","substituteParams","substituteParamsExtended","SlashCommandParser","SlashCommand","SlashCommandArgument","SlashCommandNamedArgument","SlashCommandEnumValue","ARGUMENT_TYPE","executeSlashCommandsWithOptions","registerSlashCommand","executeSlashCommands","timestampToMoment","registerHelper","registerMacro","unregisterMacro","registerFunctionTool","unregisterFunctionTool","isToolCallingSupported","canPerformToolCalls","ToolManager","registerDebugFunction","renderExtensionTemplate","renderExtensionTemplateAsync","registerDataBankScraper","callPopup","callGenericPopup","showLoader","hideLoader","mainApi","extensionSettings","ModuleWorkerWrapper","getTokenizerModel","generateQuietPrompt","generateRaw","generateRawData","writeExtensionField","writeExtensionFieldBulk","getThumbnailUrl","selectCharacterById","messageFormatting","shouldSendOnEnter","isMobile","t","translate","getCurrentLocale","addLocaleData","tags","tagMap","menuType","createCharacterData","event_types","Popup","POPUP_TYPE","POPUP_RESULT","chatCompletionSettings","textCompletionSettings","powerUserSettings","getCharacters","getOneCharacter","getCharacterCardFields","getCharacterSource","importFromExternalUrl","importTags","uuidv4","humanizedDateTime","updateMessageBlock","appendMediaToMessage","ensureMessageMediaIsArray","getMediaDisplay","getMediaIndex","scrollChatToBottom","scrollOnMediaLoad","macros","loader","swipe","variables","loadWorldInfo","saveWorldInfo","reloadWorldInfoEditor","updateWorldInfoList","convertCharacterBook","getWorldInfoPrompt","getWorldInfoNames","CONNECT_API_MAP","getTextGenServer","extractMessageFromData","getPresetManager","getChatCompletionModel","printMessages","clearChat","ChatCompletionService","TextCompletionService","ConnectionManagerRequestService","updateReasoningUI","parseReasoningFromString","getReasoningTemplateByName","unshallowCharacter","unshallowGroupMembers","getExtensionManifest","openThirdPartyExtensionMenu","symbols","constants"];

    const runtimeSillyTavern = root.SillyTavern;
    const officialSillyTavern = {};
    Object.keys(runtimeSillyTavern || {}).forEach(function (key) { if (key !== 'chat') officialSillyTavern[key] = runtimeSillyTavern[key]; });
    officialContextKeys.forEach(function (key) {
        Object.defineProperty(officialSillyTavern, key, {
            configurable: true, enumerable: true,
            get: function () { return context[key]; },
            set: function (value) { context[key] = value; }
        });
    });
    officialSillyTavern.getContext = root.getContext;
    officialSillyTavern.runtime = runtimeSillyTavern;

    const officialLibrarySources = {
        lodash: function () { return root._; }, Fuse: function () { return root.Fuse; }, DOMPurify: function () { return root.DOMPurify; },
        hljs: function () { return root.hljs; }, localforage: function () { return root.localforage; }, Handlebars: function () { return root.Handlebars; },
        css: function () { return root.css || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.css; }, Bowser: function () { return root.bowser || root.Bowser; },
        DiffMatchPatch: function () { return root.diff_match_patch || root.DiffMatchPatch; }, Readability: function () { return root.Readability || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.Readability; },
        isProbablyReaderable: function () { return root.isProbablyReaderable || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.isProbablyReaderable; },
        SVGInject: function () { return root.SVGInject || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.SVGInject; }, showdown: function () { return root.showdown; },
        moment: function () { return root.moment; }, seedrandom: function () { return Math.seedrandom; }, Popper: function () { return root.Popper; },
        droll: function () { return root.droll || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.droll; }, morphdom: function () { return root.morphdom; },
        slideToggle: function () { return root.slideToggle || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.slideToggle; }, chalk: function () { return root.chalk || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.chalk; },
        yaml: function () { return root.YAML || root.jsyaml; }, chevrotain: function () { return root.chevrotain || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.chevrotain; },
        gzipSync: function () { return root.gzipSync || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.gzipSync; }, gzip: function () { return root.gzip || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.gzip; },
        sha256: function () { return root.sha256 || root.__ST_OFFICIAL_LIBS && root.__ST_OFFICIAL_LIBS.sha256; }
    };
    const officialLibraries = Object.assign({}, runtimeSillyTavern && runtimeSillyTavern.libs || {});
    Object.keys(officialLibrarySources).forEach(function (key) { Object.defineProperty(officialLibraries, key, { configurable: true, enumerable: true, get: officialLibrarySources[key] }); });
    officialSillyTavern.libs = officialLibraries;
    root.SillyTavern = officialSillyTavern;
    root.ST = officialSillyTavern;

    root.TavernHelper.tavern_events = root.tavern_events;
    root.TavernHelper.iframe_events = root.iframe_events;
    [
        'audioEnable','audioImport','audioMode','audioPlay','audioSelect','getCharacterNames','getCharacterIds','getCurrentCharacterName','getCurrentCharacterId','createCharacter','createOrReplaceCharacter','deleteCharacter','getCharacter','replaceCharacter','updateCharacterWith',
        'getPersonaNames','getPersonaIds','getCurrentPersonaName','getCurrentPersonaId','getPersonaAvatarPath','createPersona','createOrReplacePersona','deletePersona','getPersona','replacePersona','updatePersonaWith',
        'getPresetNames','getLoadedPresetName','loadPreset','createPreset','createOrReplacePreset','deletePreset','renamePreset','getPreset','replacePreset','updatePresetWith','setPreset',
        'isAdmin','getExtensionType','getExtensionStatus','getExtensionInstallationInfo','isInstalledExtension','installExtension','uninstallExtension','reinstallExtension','updateExtension',
        'importRawCharacter','importRawChat','importRawPreset','importRawWorldbook','importRawTavernRegex'
    ].forEach(function (name) { root.TavernHelper[name] = root[name]; });
    root.updateTavernHelper = root.updateFrontendVersion = function () { return Promise.resolve(HELPER_VERSION); };
    root.TavernHelper.updateTavernHelper = root.updateTavernHelper;
    root.TavernHelper.updateFrontendVersion = root.updateFrontendVersion;
    if (FULL_COMPATIBILITY_MODE && root.parent && root.parent !== root) {
        [
            'SillyTavern','ST','TavernHelper','Mvu','eventSource','event_types','tavern_events','iframe_events',
            'getContext','getVariables','getAllVariables','replaceVariables','updateVariablesWith','insertVariables',
            'insertOrAssignVariables','deleteVariable','getMessageId','getCurrentMessageId','getLastMessageId',
            'substitudeMacros','substituteMacros','triggerSlash','triggerSlashWithResult','generate','generateRaw',
            'jQuery','$','_','toastr','YAML','z','Zod','EjsTemplate'
        ].forEach(function (name) {
            try {
                Object.defineProperty(root.parent, name, {
                    configurable: true,
                    enumerable: false,
                    get: function () { return root[name]; },
                    set: function (value) { root[name] = value; }
                });
            } catch (_) {}
        });
        try { root.parent.__cardRuntimeFullCompatibility = { version: IMPLEMENTATION_VERSION, targetSillyTavern: TAVERN_VERSION, targetTavernHelper: HELPER_VERSION }; } catch (_) {}
    }

    if (root.z && root.z.ZodType) {
        root.z.ZodType.prototype.prefault = root.z.ZodType.prototype.default;
    }
    
    root.parent.postMessage({ type: 'HANDSHAKE_INIT', payload: { messageId: BOOT.context.messageId } }, '*');
    setTimeout(function () { readyResolve(true); }, 5000);
})();
  return window.cardStudioReady;
}
