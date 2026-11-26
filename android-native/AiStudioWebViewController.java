package com.tvhuy99.cardstudio;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.os.Build;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import java.util.function.BooleanSupplier;
import java.util.function.IntSupplier;
import java.util.function.Supplier;

/**
 * Owns the persistent AI Studio WebView, its WebViewClient/WebChromeClient
 * callbacks, non-modal panel attachment/presentation, visibility preferences,
 * and diagnostic UI inspection.
 */
final class AiStudioWebViewController {
    static final String URL = "https://aistudio.google.com/prompts/new_chat";
    static final String PREFS_NAME = "ai_studio_page_preferences";
    private static final String PREFS_SHOW_PAGE = "show_ai_studio_page";

    private final Supplier<Activity> activitySupplier;
    private final Supplier<Context> contextSupplier;
    private final AiStudioDiagnostics diagnostics;
    private final BooleanSupplier isDestroyed;
    private final BooleanSupplier isGenerationActive;
    private final IntSupplier freshChatAttemptSupplier;
    private final Runnable onRenderProcessGone;

    private WebView sessionWebView;
    // The reference app keeps a REAL visible WebView at its normal opacity
    // while translating its host completely off-screen. Alpha hiding allows
    // WebView compositor surfaces to bleed through above the app on devices.
    private AiStudioPanel panel;
    private boolean freshChatLoaded = false;

    AiStudioWebViewController(
        Supplier<Activity> activitySupplier,
        Supplier<Context> contextSupplier,
        AiStudioDiagnostics diagnostics,
        BooleanSupplier isDestroyed,
        BooleanSupplier isGenerationActive,
        IntSupplier freshChatAttemptSupplier,
        Runnable onRenderProcessGone
    ) {
        this.activitySupplier = activitySupplier;
        this.contextSupplier = contextSupplier;
        this.diagnostics = diagnostics;
        this.isDestroyed = isDestroyed;
        this.isGenerationActive = isGenerationActive;
        this.freshChatAttemptSupplier = freshChatAttemptSupplier;
        this.onRenderProcessGone = onRenderProcessGone;
    }

    WebView getWebView() {
        return sessionWebView;
    }

    boolean hasWebView() {
        return sessionWebView != null;
    }

    String currentUrl() {
        return sessionWebView == null ? null : sessionWebView.getUrl();
    }

    boolean isFreshChatLoaded() {
        return freshChatLoaded;
    }

    void markFreshChatNotLoaded() {
        freshChatLoaded = false;
    }

    // Default OFF: the AI Studio WebView runs behind the Card Studio UI.
    boolean isPageDisplayEnabled() {
        return contextSupplier.get().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(PREFS_SHOW_PAGE, false);
    }

    void setVisibility(PluginCall call, boolean visible) {
        contextSupplier.get().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(PREFS_SHOW_PAGE, visible).apply();
        diagnostics.trace("state", "PAGE_VISIBILITY_CHANGED",
            visible ? "AI Studio debug page enabled" : "AI Studio debug page hidden",
            diagnostics.details("visible", visible));
        try {
            createSessionIfNeeded();
            applyPanelPresentation(visible, "settings-toggle");
            JSObject event = new JSObject();
            event.put("visible", visible);
            diagnostics.emitEvent("pageVisibilityChanged", event);
            JSObject result = new JSObject();
            result.put("visible", visible);
            call.resolve(result);
        } catch (Exception e) {
            diagnostics.trace("error", "PAGE_VISIBILITY_FAILED", "Unable to change AI Studio visibility",
                diagnostics.details("exception", e.getClass().getSimpleName()));
            call.reject("AI_STUDIO_VISIBILITY_FAILED");
        }
    }

    void openSession(PluginCall call) {
        try {
            createSessionIfNeeded();
            showInlinePanel("manual-open");
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            diagnostics.trace("error", "OPEN_ERROR", "Cannot initialize AI Studio WebView",
                diagnostics.details("exception", e.getClass().getSimpleName()));
            call.reject("AI_STUDIO_OPEN_FAILED: " + e.getClass().getSimpleName());
        }
    }

    void createSessionIfNeeded() {
        if (sessionWebView == null) {
            sessionWebView = new WebView(activitySupplier.get());
            try {
                AiStudioWebViewPolicy.configure(sessionWebView, false);
                sessionWebView.setWebViewClient(new WebViewClient() {
                    @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                        if (view != sessionWebView || isDestroyed.getAsBoolean()) return;
                        freshChatLoaded = false;
                        diagnostics.trace("state", "PAGE_STARTED", "AI Studio page navigation",
                            diagnostics.details("hostPath", diagnostics.safePath(url)));
                    }

                    @Override public void onPageFinished(WebView view, String url) {
                        if (view != sessionWebView || isDestroyed.getAsBoolean()) return;
                        diagnostics.trace("state", "PAGE_FINISHED", "AI Studio page loaded",
                            diagnostics.details("hostPath", diagnostics.safePath(url)));
                        if (isGenerationActive.getAsBoolean() && view == sessionWebView
                            && AiStudioOrigin.isStudioUrl(url) && url.equals(view.getUrl())) {
                            freshChatLoaded = true;
                            diagnostics.trace("state", "NEW_CHAT_PAGE_LOADED",
                                "New-chat page loaded; checking for old model turns",
                                diagnostics.details("attempt", freshChatAttemptSupplier.getAsInt(),
                                    "hostPath", diagnostics.safePath(url)));
                        }
                        if (view == sessionWebView && AiStudioOrigin.isStudioUrl(url)) inspect("PAGE_UI");
                    }

                    @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                        if (r.isForMainFrame())
                            diagnostics.trace("error", "MAIN_FRAME_ERROR", "WebView connection failed",
                                diagnostics.details("errorCode", e.getErrorCode(),
                                    "hostPath", diagnostics.safePath(r.getUrl().toString())));
                    }

                    @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
                        if (r.isForMainFrame())
                            diagnostics.trace("warn", "HTTP_ERROR", "AI Studio main frame returned an HTTP error",
                                diagnostics.details("status", e.getStatusCode(),
                                    "hostPath", diagnostics.safePath(r.getUrl().toString())));
                    }

                    @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                        if (view == sessionWebView) {
                            onRenderProcessGone.run();
                            releaseWebView();
                        }
                        return true;
                    }

                    @Override public void onReceivedSslError(WebView v, SslErrorHandler h, SslError e) {
                        h.cancel();
                        diagnostics.trace("error", "SSL_ERROR", "AI Studio SSL certificate rejected",
                            diagnostics.details("sslCode", e.getPrimaryError()));
                    }
                });
                sessionWebView.setWebChromeClient(new WebChromeClient() {
                    @Override public boolean onConsoleMessage(ConsoleMessage m) {
                        if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
                            diagnostics.trace("warn", "PAGE_JS_ERROR",
                                "AI Studio website reported JS error (contents hidden)",
                                diagnostics.details("line", m.lineNumber(),
                                    "source", diagnostics.safePath(m.sourceId())));
                        return false;
                    }
                });
                diagnostics.trace("state", "SESSION_CREATE", "Creating persistent WebView session",
                    diagnostics.details("androidSdk", Build.VERSION.SDK_INT));
                // Attach BELOW Capacitor's app WebView before the first load.
                // Without a parent, Android may postpone WebView rendering/JS.
                // This backing view does not intercept Card Studio's touch input.
                retainWebView();
                sessionWebView.loadUrl(URL);
            } catch (RuntimeException failure) {
                releaseWebView();
                throw failure;
            }
        }
    }

    void retainWebView() {
        Activity activity = activitySupplier.get();
        if (sessionWebView == null || activity == null) return;
        if (panel == null) panel = new AiStudioPanel(activity, sessionWebView, () -> {
            contextSupplier.get().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putBoolean(PREFS_SHOW_PAGE, false).apply();
            applyPanelPresentation(false, "panel-hide-button");
            JSObject event = new JSObject();
            event.put("visible", false);
            diagnostics.emitEvent("pageVisibilityChanged", event);
            diagnostics.trace("state", "PAGE_VISIBILITY_CHANGED", "AI Studio debug panel hidden",
                diagnostics.details("visible", false));
        });
        if (!panel.attach()) {
            diagnostics.trace("warn", "WEBVIEW_HOST_MISSING", "No content root", null);
            throw new IllegalStateException("No content root");
        }
        applyPanelPresentation(isPageDisplayEnabled(), "retain");
        resumeWebView();
        diagnostics.trace("state", "WEBVIEW_RETAIN", "AI Studio WebView attached without modal",
            diagnostics.details("hasParent", panel.isAttached(), "visiblePreference", isPageDisplayEnabled()));
    }

    void applyPanelPresentation(boolean visible, String reason) {
        if (panel == null) return;
        int panelHeight = panel.present(visible);
        if (panelHeight < 0) return;
        diagnostics.trace("state", visible ? "WEBVIEW_INLINE_VISIBLE" : "WEBVIEW_HIDDEN_OFFSCREEN",
            visible ? "Non-modal AI Studio monitor remains beside Card Studio chat" :
                "AI Studio WebView kept fully off-screen and running",
            diagnostics.details("reason", reason, "visible", visible, "modal", false, "panelHeight", panelHeight));
    }

    void showInlinePanel(String reason) {
        retainWebView();
        applyPanelPresentation(true, reason);
    }

    void resumeWebView() {
        if (sessionWebView != null) {
            sessionWebView.onResume();
            sessionWebView.resumeTimers();
        }
    }

    void loadUrl(String url) {
        if (sessionWebView != null) {
            sessionWebView.loadUrl(url);
        }
    }

    void inspect(String stage) {
        final WebView inspected = sessionWebView;
        if (inspected == null || !AiStudioOrigin.isStudioUrl(inspected.getUrl())) return;
        AiStudioWebViewPolicy.evaluate(inspected, AiStudioPageScripts.INSTALL_JS, raw -> {
            if (inspected != sessionWebView || isDestroyed.getAsBoolean()) return;
            AiStudioWebViewPolicy.evaluate(inspected,
                "JSON.stringify(window.__STS_AI_TEXT_V2__?.snapshot()||{error:'NO_SCRIPT'})",
                value -> {
                    if (inspected != sessionWebView || isDestroyed.getAsBoolean()) return;
                    try {
                        diagnostics.snapshotTrace(stage, diagnostics.parse(value));
                    } catch (Exception e) {
                        diagnostics.trace("warn", "INSPECT_FAILED", "Cannot inspect AI Studio page",
                            diagnostics.details("error", e.getClass().getSimpleName()));
                    }
                });
        });
    }

    void releaseWebView() {
        WebView old = sessionWebView;
        sessionWebView = null;
        AiStudioPanel oldPanel = panel;
        panel = null;
        try {
            if (oldPanel != null) oldPanel.detach();
        } catch (RuntimeException failure) {
            Log.w(AiStudioDiagnostics.LOG_TAG, "AI Studio panel cleanup failed", failure);
        }
        try {
            AiStudioWebViewPolicy.destroy(old);
        } catch (RuntimeException failure) {
            Log.w(AiStudioDiagnostics.LOG_TAG, "AI Studio WebView cleanup failed", failure);
        }
    }
}
