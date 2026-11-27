package com.tvhuy99.cardstudio;

import android.os.Handler;
import android.webkit.WebView;

import com.getcapacitor.PluginCall;

import org.json.JSONObject;

import java.util.Locale;
import java.util.function.Consumer;
import java.util.function.Predicate;

final class AiStudioThinkingController {
    private final Handler handler;
    private final AiStudioDiagnostics diagnostics;
    private final AiStudioWebViewController webViewController;

    private String pendingThinkingLevel = "default";
    private String confirmedThinkingLevel = "not-verified";

    AiStudioThinkingController(
        Handler handler,
        AiStudioDiagnostics diagnostics,
        AiStudioWebViewController webViewController
    ) {
        this.handler = handler;
        this.diagnostics = diagnostics;
        this.webViewController = webViewController;
    }

    void resetForGeneration(String requestedThinking) {
        pendingThinkingLevel = requestedThinking == null ? "default"
            : requestedThinking.trim().toLowerCase(Locale.ROOT);
        confirmedThinkingLevel = "not-verified";
    }

    String getPendingThinkingLevel() {
        return pendingThinkingLevel;
    }

    String getConfirmedThinkingLevel() {
        return confirmedThinkingLevel;
    }

    void configure(
        PluginCall call,
        Predicate<PluginCall> isActiveCall,
        Runnable onConfigured,
        Consumer<String> onFail
    ) {
        if (!isActiveCall.test(call)) return;
        final String level = pendingThinkingLevel;
        diagnostics.trace("state", "THINKING_REQUESTED", "Requested AI Studio thinking level",
            diagnostics.details("requested", level, "requestId", diagnostics.getRequestId()));
        if ("default".equals(level)) {
            confirmedThinkingLevel = "web-default";
            diagnostics.trace("state", "THINKING_WEB_DEFAULT", "Using thinking level from AI Studio page",
                diagnostics.details("requested", level, "applied", "web-default"));
            onConfigured.run();
            return;
        }
        if (!level.matches("minimal|low|medium|high")) {
            onFail.accept("AI_STUDIO_THINKING_INVALID: " + level);
            return;
        }
        openThinkingControl(call, 0, isActiveCall, onConfigured, onFail);
    }

    private void openThinkingControl(
        PluginCall call,
        int attempt,
        Predicate<PluginCall> isActiveCall,
        Runnable onConfigured,
        Consumer<String> onFail
    ) {
        WebView webView = webViewController.getWebView();
        if (!isActiveCall.test(call) || webView == null) return;
        AiStudioWebViewPolicy.evaluate(webView, AiStudioPageScripts.THINKING_OPEN_JS, raw -> {
            if (!isActiveCall.test(call)) return;
            JSONObject state;
            try {
                state = diagnostics.parse(raw);
            } catch (Exception e) {
                onFail.accept("AI_STUDIO_THINKING_OPEN_ERROR: Không phân tích được giao diện suy nghĩ.");
                return;
            }
            diagnostics.trace("state", "THINKING_CONTROL_SCAN", "Looking for thinking settings control",
                diagnostics.details("requested", pendingThinkingLevel, "found", state.optBoolean("ok", false),
                    "reason", state.optString("reason", "none"), "attempt", attempt + 1));
            if (!state.optBoolean("ok", false)) {
                if (attempt == 0) {

                    AiStudioWebViewPolicy.evaluate(webViewController.getWebView(),
                        AiStudioPageScripts.RUN_SETTINGS_EXPAND_JS,
                        opened -> {
                            if (!isActiveCall.test(call)) return;
                            String openedText = String.valueOf(opened);
                            diagnostics.trace("state", "THINKING_SETTINGS_EXPAND",
                                "Tried expanding AI Studio Run settings",
                                diagnostics.details("result",
                                    openedText.substring(0, Math.min(120, openedText.length()))));
                            handler.postDelayed(
                                () -> openThinkingControl(call, 1, isActiveCall, onConfigured, onFail),
                                650L);
                        });
                    return;
                }
                onFail.accept("AI_STUDIO_THINKING_UNAVAILABLE: Không tìm thấy điều khiển mức suy nghĩ của AI Studio ("
                    + state.optString("reason", "not-found")
                    + "). Hãy bật hiển thị trang AI Studio để kiểm tra Run settings.");
                return;
            }
            handler.postDelayed(() -> {
                WebView current = webViewController.getWebView();
                if (!isActiveCall.test(call) || current == null) return;
                AiStudioWebViewPolicy.evaluate(current,
                    AiStudioPageScripts.THINKING_SELECT_JS.replace("__STS_LEVEL__",
                        JSONObject.quote(pendingThinkingLevel)),
                    out -> {
                        if (!isActiveCall.test(call)) return;
                        JSONObject selected;
                        try {
                            selected = diagnostics.parse(out);
                        } catch (Exception e) {
                            onFail.accept("AI_STUDIO_THINKING_SELECT_ERROR: Không đọc được danh sách mức.");
                            return;
                        }
                        diagnostics.trace(selected.optBoolean("ok", false) ? "state" : "error",
                            "THINKING_OPTION_CLICK", "Thinking level option clicked",
                            diagnostics.details("requested", pendingThinkingLevel,
                                "clicked", selected.optBoolean("ok", false),
                                "choice", selected.optString("choice", "none")));
                        if (!selected.optBoolean("ok", false)) {
                            onFail.accept("AI_STUDIO_THINKING_NOT_SUPPORTED: AI Studio không có mức '"
                                + pendingThinkingLevel + "' trên model này.");
                            return;
                        }
                        verifyThinkingControl(call, 0, isActiveCall, onConfigured, onFail);
                    });
            }, 650L);
        });
    }

    private void verifyThinkingControl(
        PluginCall call,
        int attempt,
        Predicate<PluginCall> isActiveCall,
        Runnable onConfigured,
        Consumer<String> onFail
    ) {
        WebView webView = webViewController.getWebView();
        if (!isActiveCall.test(call) || webView == null) return;
        AiStudioWebViewPolicy.evaluate(webView,
            AiStudioPageScripts.THINKING_VERIFY_JS.replace("__STS_LEVEL__",
                JSONObject.quote(pendingThinkingLevel)),
            raw -> {
                if (!isActiveCall.test(call)) return;
                JSONObject state;
                try {
                    state = diagnostics.parse(raw);
                } catch (Exception e) {
                    onFail.accept("AI_STUDIO_THINKING_VERIFY_ERROR: Không đọc được trạng thái xác nhận.");
                    return;
                }
                if (state.optBoolean("ok", false)) {
                    confirmedThinkingLevel = pendingThinkingLevel;
                    diagnostics.trace("state", "THINKING_VERIFIED",
                        "AI Studio controls confirm thinking level",
                        diagnostics.details("requested", pendingThinkingLevel,
                            "applied", confirmedThinkingLevel,
                            "evidence", state.optString("evidence", "unknown")));
                    onConfigured.run();
                } else if (attempt < 3) {
                    diagnostics.trace("warn", "THINKING_VERIFY_RETRY",
                        "Thinking selection not confirmed yet",
                        diagnostics.details("requested", pendingThinkingLevel,
                            "attempt", attempt + 1,
                            "reason", state.optString("reason", "unverified")));
                    handler.postDelayed(
                        () -> verifyThinkingControl(call, attempt + 1, isActiveCall, onConfigured, onFail),
                        550L);
                } else {
                    diagnostics.trace("error", "THINKING_UNVERIFIED",
                        "Thinking selection was not confirmed by website",
                        diagnostics.details("requested", pendingThinkingLevel,
                            "reason", state.optString("reason", "unverified")));
                    onFail.accept("AI_STUDIO_THINKING_UNVERIFIED: Đã nhấn mức '" + pendingThinkingLevel
                        + "' nhưng chưa xác nhận được AI Studio thực sự áp dụng. Đã dừng trước khi gửi lời nhắc.");
                }
            });
    }
}
