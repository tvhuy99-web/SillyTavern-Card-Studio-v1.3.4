package com.tvhuy99.cardstudio;

import android.annotation.SuppressLint;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import android.view.ViewGroup;

final class AiStudioWebViewPolicy {
    static final String ORIGIN = AiStudioOrigin.ORIGIN;
    private AiStudioWebViewPolicy() {}
    @SuppressLint("SetJavaScriptEnabled")
    static void configure(WebView view, boolean catalog) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (catalog) {
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(false);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        }
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);
    }
    static void evaluate(WebView view, String expression, ValueCallback<String> callback) {
        if (!isStudioView(view)) {
            callback.onReceiveValue(null);
            return;
        }

        String guarded = "(location.origin === '" + ORIGIN + "' ? (" + expression + ") : null)";
        try {
            view.evaluateJavascript(guarded, result -> callback.onReceiveValue(
                isStudioView(view) ? result : null));
        } catch (IllegalStateException gone) { callback.onReceiveValue(null); }
    }
    private static boolean isStudioView(WebView view) {
        try { return view != null && AiStudioOrigin.isStudioUrl(view.getUrl()); }
        catch (RuntimeException gone) { return false; }
    }
    static void destroy(WebView view) {
        if (view == null) return;
        if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
        try { view.stopLoading(); } catch (RuntimeException ignored) {}
        view.destroy();
    }
}
