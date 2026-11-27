// Classic iframe source fragment; evaluated in the same lexical scope and original sequence.
export function renderBootstrap(optionsJson) {
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
`;
}
