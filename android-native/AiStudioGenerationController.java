package com.tvhuy99.cardstudio;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import org.json.JSONObject;

import java.util.UUID;

final class AiStudioGenerationController {
    private static final long TIMEOUT_MS = 300_000L;

    private final Handler handler;
    private final AiStudioDiagnostics diagnostics;
    private final AiStudioWebViewController webViewController;
    private final AiStudioSessionController sessionController;
    private final AiStudioThinkingController thinkingController;
    private final AiStudioResponsePoller responsePoller;

    private final Handler cancellationHandler = new Handler(Looper.getMainLooper());
    private final NativeRequestLedger cancelledRequests = new NativeRequestLedger();

    private PluginCall pending;
    private PluginCall cancellationCall;
    private Runnable requestWatchdog;

    private int freshChatAttempt = 0;
    private long requestStart;
    private boolean submitClicked;
    private boolean submitDispatched;
    private int bootstrapFailures;

    AiStudioGenerationController(
        Handler handler,
        AiStudioDiagnostics diagnostics,
        AiStudioWebViewController webViewController,
        AiStudioSessionController sessionController,
        AiStudioThinkingController thinkingController
    ) {
        this.handler = handler;
        this.diagnostics = diagnostics;
        this.webViewController = webViewController;
        this.sessionController = sessionController;
        this.thinkingController = thinkingController;
        this.responsePoller = new AiStudioResponsePoller(handler, diagnostics, webViewController);
    }

    boolean hasPending() {
        return pending != null;
    }

    boolean isPending(PluginCall call) {
        return pending == call;
    }

    boolean isCancelling() {
        return cancellationCall != null;
    }

    boolean isBusy() {
        return pending != null || cancellationCall != null;
    }

    int getResponseChars() {
        return responsePoller.getResponseChars();
    }

    int getPolls() {
        return responsePoller.getPolls();
    }

    int getFreshChatAttempt() {
        return freshChatAttempt;
    }

    void startGeneration(
        PluginCall call,
        String prompt,
        String requestedThinking,
        String modelId,
        String chatUrl
    ) {
        if (pending != null || cancellationCall != null) {
            call.reject("AI_STUDIO_BUSY");
            return;
        }
        String requestedId = call.getString("requestId");
        if (requestedId == null || requestedId.isEmpty()) requestedId = "chat-" + UUID.randomUUID().toString();
        if (!NativeRequestLedger.valid(requestedId)) {
            call.reject("AI_STUDIO_INVALID_REQUEST_ID");
            return;
        }
        if (cancelledRequests.isCancelled(requestedId)) {
            call.reject("AI_STUDIO_CANCELLED");
            return;
        }
        sessionController.cancelCatalogReader();
        boolean coldStart = !webViewController.hasWebView();
        try {
            webViewController.createSessionIfNeeded();
        } catch (Exception e) {
            diagnostics.trace("error", "AUTO_START_FAILED", "Unable to open AI Studio automatically",
                diagnostics.details("exception", e.getClass().getSimpleName()));
            call.reject("AI_STUDIO_AUTO_START_FAILED");
            return;
        }
        diagnostics.setRequestId(requestedId);
        pending = call;
        thinkingController.resetForGeneration(requestedThinking);
        diagnostics.trace("state", "GENERATION_SETTINGS", "Native AI Studio generation received settings",
            diagnostics.details("requestedThinking", thinkingController.getPendingThinkingLevel(),
                "requestedModel", modelId.isEmpty() ? "web-default" : modelId,
                "pageManagedModel", chatUrl.equals(AiStudioWebViewController.URL),
                "promptChars", prompt.length()));
        sessionController.startBackgroundGeneration(pending != null);
        requestStart = SystemClock.elapsedRealtime();
        responsePoller.reset(requestStart);
        webViewController.markFreshChatNotLoaded();
        freshChatAttempt = 0;
        submitClicked = false;
        submitDispatched = false;
        bootstrapFailures = 0;
        armWatchdog(call);
        WebView sessionWebView = webViewController.getWebView();
        diagnostics.trace("state", coldStart ? "SESSION_AUTO_START" : "SESSION_REUSE",
            coldStart ? "Created AI Studio WebView automatically" : "Using existing AI Studio WebView",
            diagnostics.details("promptChars", prompt.length(),
                "hasWebViewParent", sessionWebView != null && sessionWebView.getParent() != null));
        webViewController.resumeWebView();
        if (coldStart) {
            diagnostics.trace("state", "NEW_CHAT_INITIAL", "First-use session is loading a new chat page",
                diagnostics.details("showDebugPage", webViewController.isPageDisplayEnabled()));
            if (!chatUrl.equals(AiStudioWebViewController.URL)) webViewController.loadUrl(chatUrl);
        } else {

            diagnostics.trace("state", "NEW_CHAT_NAVIGATE",
                "Opening fresh AI Studio conversation for this turn", null);
            webViewController.loadUrl(chatUrl);
        }

        webViewController.applyPanelPresentation(webViewController.isPageDisplayEnabled(), "generate");
        waitUntilReady(call, prompt, 0);
    }

    private void waitUntilReady(PluginCall call, String prompt, int attempt) {
        if (pending != call) return;
        final long elapsed = SystemClock.elapsedRealtime() - requestStart;
        boolean pageDisplayEnabled = webViewController.isPageDisplayEnabled();
        if (elapsed > (pageDisplayEnabled ? 180_000L : 45_000L)) {
            fail(pageDisplayEnabled
                ? "AI_STUDIO_LOGIN_OR_PAGE_TIMEOUT: Đăng nhập AI Studio rồi thử lại."
                : "AI_STUDIO_NOT_READY_HIDDEN: Bật 'Hiển thị trang web AI Studio' trong Cài đặt để đăng nhập hoặc xem lỗi.");
            return;
        }
        WebView sessionWebView = webViewController.getWebView();
        if (sessionWebView == null) {
            fail("AI_STUDIO_SESSION_LOST");
            return;
        }
        if (!webViewController.isFreshChatLoaded() || !AiStudioOrigin.isStudioUrl(sessionWebView.getUrl())) {
            if (attempt % 7 == 0) diagnostics.trace("state", "NEW_CHAT_WAIT",
                "Waiting for fresh AI Studio page to finish navigation",
                diagnostics.details("elapsedMs", elapsed));
            handler.postDelayed(() -> waitUntilReady(call, prompt, attempt + 1), 750L);
            return;
        }
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            AiStudioPageScripts.NEW_CHAT_READINESS_JS,
            raw -> {
                if (pending != call) return;
                try {
                    JSONObject x = diagnostics.parse(raw);
                    if (x.optBoolean("ok", false)) {
                        diagnostics.trace("state", "NEW_CHAT_CONFIRMED",
                            "Fresh empty AI Studio chat ready for this Card Studio turn",
                            diagnostics.details("waitMs", SystemClock.elapsedRealtime() - requestStart,
                                "editorCount", x.optInt("editors", 0),
                                "oldModelTurns", x.optInt("oldModelTurns", -1)));

                        requestStart = SystemClock.elapsedRealtime();
                        armWatchdog(call);
                        thinkingController.configure(call, c -> pending == c,
                            () -> prepareText(call, prompt), this::fail);
                        return;
                    }
                    if (attempt % 10 == 0) diagnostics.trace("warn", "SESSION_WAIT",
                        "AI Studio new chat not ready",
                        diagnostics.details("host", x.optString("host", "unknown"),
                            "path", x.optString("path", "unknown"),
                            "oldModelTurns", x.optInt("oldModelTurns", -1),
                            "ready", x.optString("ready", "unknown"),
                            "editors", x.optInt("editors", 0), "elapsedMs", elapsed));

                    if (attempt >= 30 && x.optInt("oldModelTurns", 0) > 0) {
                        fail("AI_STUDIO_NEW_CHAT_NOT_EMPTY: AI Studio has prior model turns.");
                        return;
                    }
                    if (attempt == 12) {
                        if (webViewController.isPageDisplayEnabled()) {
                            diagnostics.trace("warn", "OPEN_LOGIN",
                                "AI Studio inline monitor is available for login", null);
                            webViewController.applyPanelPresentation(true, "login-help");
                        } else {
                            diagnostics.trace("warn", "LOGIN_HIDDEN",
                                "AI Studio not ready while debug page is hidden",
                                diagnostics.details("help",
                                    "Bật Hiển thị trang web AI Studio trong Cài đặt để đăng nhập hoặc xem lỗi"));
                        }
                    }
                } catch (Exception e) {
                    if (attempt % 10 == 0) diagnostics.trace("warn", "SESSION_PROBE_ERROR",
                        "Cannot inspect AI Studio readiness",
                        diagnostics.details("exception", e.getClass().getSimpleName(),
                            "rawNull", raw == null || "null".equals(raw)));
                }
                handler.postDelayed(() -> waitUntilReady(call, prompt, attempt + 1), 1000L);
            });
    }

    private void prepareText(PluginCall call, String prompt) {
        WebView sessionWebView = webViewController.getWebView();
        if (pending != call || sessionWebView == null) return;
        AiStudioWebViewPolicy.evaluate(sessionWebView, AiStudioPageScripts.INSTALL_JS, ready -> {
            if (pending != call) return;
            if (ready == null || "null".equals(ready)) {
                bootstrapFailures++;
                diagnostics.trace("warn", "BOOTSTRAP_NULL", "WebView could not execute AI Studio reader",
                    diagnostics.details("rawNull", ready == null, "failureCount", bootstrapFailures,
                        "hostPath", diagnostics.safePath(webViewController.currentUrl())));
                if (bootstrapFailures >= 5) {
                    fail("AI_STUDIO_BOOTSTRAP_FAILED: JavaScript returned null after 5 attempts.");
                    return;
                }

                handler.postDelayed(() -> prepareText(call, prompt), 1500L);
                return;
            }
            if (!("\"installed\"".equals(ready) || "\"ready\"".equals(ready))) {
                diagnostics.trace("error", "BOOTSTRAP_UNEXPECTED",
                    "AI Studio bootstrap returned unexpected result",
                    diagnostics.details("responseLength", ready.length(),
                        "firstChar", ready.substring(0, 1)));
                fail("AI_STUDIO_BOOTSTRAP_UNEXPECTED_RESULT");
                return;
            }
            diagnostics.trace("state", "JS_BOOTSTRAP", "Text-only UI reader installed",
                diagnostics.details("promptChars", prompt.length()));
            transferPromptChunk(call, prompt, 0);
        });
    }

    private void transferPromptChunk(PluginCall call, String prompt, int offset) {
        WebView sessionWebView = webViewController.getWebView();
        if (pending != call || sessionWebView == null) return;
        if (offset < prompt.length()) {
            int end = Math.min(offset + 2000, prompt.length());
            if (end < prompt.length() && Character.isHighSurrogate(prompt.charAt(end - 1))) end--;
            final int next = end;
            String js = "JSON.stringify((function(){try{var prev=" +
                (offset == 0 ? "''" : "(window.__STS_AI_TEXT_INPUT__||'')") +
                ";window.__STS_AI_TEXT_INPUT__=prev+" +
                JSONObject.quote(prompt.substring(offset, end)) +
                ";return {ok:true,length:window.__STS_AI_TEXT_INPUT__.length};" +
                "}catch(e){return {ok:false,errorName:String(e.name||'Error')}}})())";
            AiStudioWebViewPolicy.evaluate(sessionWebView, js, raw -> {
                if (pending != call) return;
                try {
                    JSONObject result = diagnostics.parse(raw);
                    if (!result.optBoolean("ok", false) || result.optInt("length", -1) != next) {
                        diagnostics.trace("error", "INPUT_CHUNK_REJECTED", "AI Studio prompt transfer failed",
                            diagnostics.details("offset", offset, "next", next,
                                "confirmed", result.optInt("length", -1),
                                "errorName", result.optString("errorName", "none")));
                        fail("AI_STUDIO_INPUT_TRANSFER_FAILED");
                        return;
                    }
                    transferPromptChunk(call, prompt, next);
                } catch (Exception e) {
                    diagnostics.trace("error", "INPUT_CHUNK_JS", "Failed to transfer AI Studio prompt chunk",
                        diagnostics.details("offset", offset,
                            "rawNull", raw == null || "null".equals(raw),
                            "exception", e.getClass().getSimpleName()));
                    fail("AI_STUDIO_INPUT_TRANSFER_JS_" + e.getClass().getSimpleName());
                }
            });
            return;
        }
        diagnostics.trace("state", "INPUT_TRANSFER_COMPLETE", "Prompt copied to AI Studio in verified chunks",
            diagnostics.details("promptChars", prompt.length(),
                "chunkCount", (prompt.length() + 1999) / 2000));
        String expression = "(function(){var p=window.__STS_AI_TEXT_INPUT__||'';" +
            "delete window.__STS_AI_TEXT_INPUT__;" +
            "return window.__STS_AI_TEXT_V2__?.prepare(p)})()";
        AiStudioWebViewPolicy.evaluate(sessionWebView, diagnostics.guardJs(expression), raw -> {
            if (pending != call) return;
            try {
                JSONObject obj = diagnostics.unwrapJs(raw, "EDITOR", webViewController.currentUrl());
                JSONObject snapshot = obj.optJSONObject("snapshot");
                if (snapshot != null) diagnostics.snapshotTrace("EDITOR_SNAPSHOT", snapshot);
                if (!obj.optBoolean("ok", false)) {
                    fail("AI_STUDIO_EDITOR_" + obj.optString("error", "UNKNOWN"));
                    return;
                }
                String before = obj.optString("before", "");
                responsePoller.setBaseline(before);
                diagnostics.trace("state", "EDITOR_FILLED", "AI Studio text editor filled",
                    diagnostics.details("editorTag", obj.optString("editorTag", "unknown"),
                        "promptChars", prompt.length(), "baselineChars", before.length()));
                handler.postDelayed(() -> submit(call), 400L);
            } catch (Exception e) {
                fail("AI_STUDIO_EDITOR_JS_" + e.getMessage());
            }
        });
    }

    private void submit(PluginCall call) {
        WebView sessionWebView = webViewController.getWebView();
        if (pending != call || sessionWebView == null) return;
        submitDispatched = true;
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.submit()||{ok:false,error:'SCRIPT_LOST'})",
            raw -> {
                if (pending != call) return;
                try {
                    JSONObject obj = diagnostics.parse(raw);
                    JSONObject s = obj.optJSONObject("snapshot");
                    if (s != null) diagnostics.snapshotTrace("SUBMIT_SNAPSHOT", s);
                    if (!obj.optBoolean("ok")) {
                        fail("AI_STUDIO_SUBMIT: " + obj.optString("error", "Cannot click Run"));
                        return;
                    }
                    submitClicked = true;
                    diagnostics.trace("state", "SUBMIT_CLICKED",
                        "AI Studio send button clicked (server ACK not verified)",
                        diagnostics.details("candidateButtons", obj.optInt("candidates", -1),
                            "buttonScore", obj.optInt("score", 0)));
                    responsePoller.schedulePoll(call, TIMEOUT_MS, () -> requestStart,
                        c -> pending == c, () -> submitClicked,
                        this::completeGeneration, this::fail);
                } catch (Exception e) {
                    fail("AI_STUDIO_SUBMIT_JS: " + e.getClass().getSimpleName());
                }
            }
        );
    }

    private void completeGeneration(long confirmedIdle, long stable, int consecutiveIdlePolls) {
        PluginCall done = pending;
        pending = null;
        clearWatchdog();
        sessionController.stopBackgroundGeneration(true);
        String latest = responsePoller.getLatest();
        String thinkingSummary = responsePoller.getLatestThinkingSummary();
        diagnostics.trace("script-success", "RESPONSE_COMPLETE",
            "Received completed AI Studio text",
            diagnostics.details("responseChars", latest.length(), "polls", responsePoller.getPolls(),
                "idleMs", confirmedIdle, "stableMs", stable,
                "seenBusy", responsePoller.hasEverSawBusy(), "idlePolls", consecutiveIdlePolls,
                "elapsedMs", SystemClock.elapsedRealtime() - requestStart));
        JSObject result = new JSObject();
        result.put("text", latest);
        result.put("appliedThinking", thinkingController.getConfirmedThinkingLevel());
        diagnostics.trace("state", "GENERATION_COMPLETED", "AI Studio generation finished",
            diagnostics.details("requestedThinking", thinkingController.getPendingThinkingLevel(),
                "appliedThinking", thinkingController.getConfirmedThinkingLevel(),
                "responseChars", latest.length()));
        if (!thinkingSummary.isEmpty()) result.put("reasoning", thinkingSummary);
        if (done != null) done.resolve(result);
    }

    void cancel(PluginCall call) {
        String target = call.getString("requestId", "");
        if (target != null && !target.isEmpty()) {
            if (!NativeRequestLedger.valid(target)) {
                call.reject("AI_STUDIO_INVALID_REQUEST_ID");
                return;
            }
            cancelledRequests.cancel(target);
        }
        if (pending == null || (target != null && !target.isEmpty() && !diagnostics.getRequestId().equals(target))) {
            call.resolve();
            return;
        }
        cancelledRequests.cancel(diagnostics.getRequestId());

        cancellationCall = call;
        fail("AI_STUDIO_CANCELLED");
        final WebView view = webViewController.getWebView();
        if (view == null) {
            finishCancellation(call, false);
            return;
        }
        cancellationHandler.postDelayed(() -> finishCancellation(call, false), 1500L);
        AiStudioWebViewPolicy.evaluate(view,
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.stopGeneration()||{ok:false})", raw -> {
                if (cancellationCall != call) return;
                boolean clicked = false;
                try {
                    clicked = diagnostics.parse(raw).optBoolean("ok", false);
                } catch (Exception ignored) {
                }
                finishCancellation(call, clicked);
            });
    }

    void finishCancellation(PluginCall call, boolean clicked) {
        if (cancellationCall != call) return;
        cancellationCall = null;
        cancellationHandler.removeCallbacksAndMessages(null);

        webViewController.releaseWebView();
        JSObject result = new JSObject();
        result.put("stopClicked", clicked);
        call.resolve(result);
    }

    void fail(String message) {
        PluginCall p = pending;
        pending = null;
        clearWatchdog();
        sessionController.stopBackgroundGeneration(false);
        diagnostics.trace("error", "REQUEST_FAILED", message, diagnostics.details(
            "requestedThinking", thinkingController.getPendingThinkingLevel(),
            "appliedThinking", thinkingController.getConfirmedThinkingLevel(),
            "elapsedMs", SystemClock.elapsedRealtime() - requestStart,
            "polls", responsePoller.getPolls(), "maxResponseNodes", responsePoller.getResponseNodes(),
            "seenResponse", responsePoller.hasEverSawResponse(), "seenBusy", responsePoller.hasEverSawBusy(),
            "clicked", submitClicked, "responseChars", responsePoller.getResponseChars()));
        if (p != null) p.reject(message);
        if (submitDispatched && cancellationCall == null) webViewController.releaseWebView();
    }

    void onRenderProcessGone() {
        if (pending != null) fail("AI_STUDIO_RENDERER_GONE");
        if (cancellationCall != null) finishCancellation(cancellationCall, false);
    }

    void destroy() {
        if (pending != null) fail("AI_STUDIO_SESSION_CLOSED");
        if (cancellationCall != null) finishCancellation(cancellationCall, false);
        clearWatchdog();
    }

    private void armWatchdog(PluginCall call) {
        clearWatchdog();
        requestWatchdog = () -> {
            if (pending == call) fail("AI_STUDIO_TIMEOUT: Native WebView did not complete the request.");
        };
        handler.postDelayed(requestWatchdog, TIMEOUT_MS);
    }

    void clearWatchdog() {
        if (requestWatchdog != null) handler.removeCallbacks(requestWatchdog);
        requestWatchdog = null;
    }
}
