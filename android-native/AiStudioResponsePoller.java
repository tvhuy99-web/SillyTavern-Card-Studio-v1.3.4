package com.tvhuy99.cardstudio;

import android.os.Handler;
import android.os.SystemClock;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import org.json.JSONObject;

import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.LongSupplier;
import java.util.function.Predicate;

/**
 * Polls the AI Studio WebView for response text and thinking summary updates,
 * emits replaceable streaming snapshots, and checks terminal completion via
 * {@link AiStudioCompletionPolicy}.
 */
final class AiStudioResponsePoller {
    static final long POLL_MS = 600L;

    interface CompletionCallback {
        void onComplete(long confirmedIdleMs, long stableMs, int consecutiveIdlePolls);
    }

    private final Handler handler;
    private final AiStudioDiagnostics diagnostics;
    private final AiStudioWebViewController webViewController;

    private String baseline = "";
    private String latest = "";
    private String lastStreamSnapshot = "";
    private String latestThinkingSummary = "";
    private String lastStreamedThinkingSummary = "";
    private long lastChanged;
    private long lastCheckpoint;
    private long observedIdleSince;
    private int consecutiveIdlePolls;
    private int polls;
    private int responseNodes;
    private boolean everSawResponse;
    private boolean everSawBusy;

    AiStudioResponsePoller(
        Handler handler,
        AiStudioDiagnostics diagnostics,
        AiStudioWebViewController webViewController
    ) {
        this.handler = handler;
        this.diagnostics = diagnostics;
        this.webViewController = webViewController;
    }

    void reset(long now) {
        baseline = "";
        latest = "";
        lastStreamSnapshot = "";
        latestThinkingSummary = "";
        lastStreamedThinkingSummary = "";
        polls = 0;
        responseNodes = 0;
        observedIdleSince = 0L;
        consecutiveIdlePolls = 0;
        everSawResponse = false;
        everSawBusy = false;
        lastChanged = now;
        lastCheckpoint = now;
    }

    void setBaseline(String baseline) {
        this.baseline = baseline == null ? "" : baseline;
    }

    String getLatest() {
        return latest;
    }

    String getLatestThinkingSummary() {
        return latestThinkingSummary;
    }

    int getResponseChars() {
        return latest.length();
    }

    int getPolls() {
        return polls;
    }

    int getResponseNodes() {
        return responseNodes;
    }

    boolean hasEverSawResponse() {
        return everSawResponse;
    }

    boolean hasEverSawBusy() {
        return everSawBusy;
    }

    void schedulePoll(
        PluginCall call,
        long timeoutMs,
        LongSupplier requestStartSupplier,
        Predicate<PluginCall> isActiveCall,
        BooleanSupplier submitClickedSupplier,
        CompletionCallback onComplete,
        Consumer<String> onFail
    ) {
        handler.postDelayed(
            () -> pollResponse(call, timeoutMs, requestStartSupplier, isActiveCall,
                submitClickedSupplier, onComplete, onFail),
            POLL_MS
        );
    }

    private void pollResponse(
        PluginCall call,
        long timeoutMs,
        LongSupplier requestStartSupplier,
        Predicate<PluginCall> isActiveCall,
        BooleanSupplier submitClickedSupplier,
        CompletionCallback onComplete,
        Consumer<String> onFail
    ) {
        WebView sessionWebView = webViewController.getWebView();
        if (!isActiveCall.test(call) || sessionWebView == null) return;
        long now = SystemClock.elapsedRealtime();
        long requestStart = requestStartSupplier.getAsLong();
        if (now - requestStart > timeoutMs) {
            webViewController.inspect("TIMEOUT_SNAPSHOT");
            String reason = !submitClickedSupplier.getAsBoolean() ? "SUBMIT_NOT_CONFIRMED" :
                !everSawResponse ? "RESPONSE_NODE_NOT_FOUND" : "RESPONSE_NOT_COMPLETED";
            onFail.accept("AI_STUDIO_TIMEOUT_" + reason
                + ": xem bộ lọc AI Studio trong Bảng điều khiển hệ thống.");
            return;
        }
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.read()||{error:'SCRIPT_LOST'})",
            raw -> {
                if (!isActiveCall.test(call)) return;
                polls++;
                try {
                    JSONObject obj = diagnostics.parse(raw);
                    if (obj.has("error")) {
                        diagnostics.trace("warn", "POLL_SCRIPT_ERROR", "Page script unavailable",
                            diagnostics.details("error", obj.optString("error")));
                        schedulePoll(call, timeoutMs, requestStartSupplier, isActiveCall,
                            submitClickedSupplier, onComplete, onFail);
                        return;
                    }
                    responseNodes = Math.max(responseNodes, obj.optInt("responseNodes", 0));
                    boolean busy = obj.optBoolean("busy", false);
                    everSawBusy |= busy;
                    // A brief pause between tokens is not a completed answer.
                    // The old 5s stable-text fallback completed while busy=true.
                    if (busy) {
                        observedIdleSince = 0L;
                        consecutiveIdlePolls = 0;
                    } else {
                        if (observedIdleSince == 0L) observedIdleSince = SystemClock.elapsedRealtime();
                        consecutiveIdlePolls++;
                    }
                    String thought = obj.optString("thinkingSummary", "");
                    boolean thoughtChanged = !thought.equals(latestThinkingSummary);
                    if (thoughtChanged) latestThinkingSummary = thought;
                    String response = obj.optString("text", "");
                    if (!response.isBlank() && !response.equals(baseline)) {
                        everSawResponse = true;
                        if (!response.equals(latest)) {
                            latest = response;
                            lastChanged = SystemClock.elapsedRealtime();
                            diagnostics.trace("state", "RESPONSE_PROGRESS", "AI Studio response text changed",
                                diagnostics.details("responseChars", latest.length(),
                                    "responseNodes", obj.optInt("responseNodes", 0),
                                    "busy", busy, "poll", polls));
                            emitSnapshot(latest);
                        }
                        long stable = SystemClock.elapsedRealtime() - lastChanged;
                        long confirmedIdle = observedIdleSince == 0L ? 0L :
                            SystemClock.elapsedRealtime() - observedIdleSince;
                        // Never finalize while the UI reports generating. For
                        // sites with a Stop control, require the Stop state to
                        // vanish continuously for 7+ seconds and the output to
                        // stop changing. This defeats one-frame idle flickers.
                        // If no busy indicator was ever detected, require a
                        // conservative 15s idle+stable fallback.
                        boolean terminal = AiStudioCompletionPolicy.isTerminal(busy, everSawBusy,
                            confirmedIdle, stable, consecutiveIdlePolls);
                        if (terminal) {
                            onComplete.onComplete(confirmedIdle, stable, consecutiveIdlePolls);
                            return;
                        }
                    }
                    if (thoughtChanged && !latest.isEmpty()) emitSnapshot(latest);
                    long t = SystemClock.elapsedRealtime();
                    if (t - lastCheckpoint >= 5000L) {
                        lastCheckpoint = t;
                        diagnostics.snapshotTrace("POLL_HEARTBEAT", obj);
                        diagnostics.trace("state", "WAITING", "Waiting for AI Studio response",
                            diagnostics.details("elapsedMs", t - requestStartSupplier.getAsLong(),
                                "polls", polls, "maxResponseNodes", responseNodes,
                                "seenResponse", everSawResponse, "seenBusy", everSawBusy,
                                "busy", busy, "stopVisible", obj.optBoolean("stopVisible", false),
                                "loadingIndicators", obj.optInt("loadingIndicators", 0),
                                "idleMs", observedIdleSince == 0L ? 0L : t - observedIdleSince));
                    }
                } catch (Exception e) {
                    diagnostics.trace("warn", "POLL_PARSE_ERROR", "Cannot parse AI Studio page state",
                        diagnostics.details("exception", e.getClass().getSimpleName()));
                }
                schedulePoll(call, timeoutMs, requestStartSupplier, isActiveCall,
                    submitClickedSupplier, onComplete, onFail);
            }
        );
    }

    private void emitSnapshot(String text) {
        // AI Studio updates already-rendered Markdown as it streams. Treat
        // each observation as a replaceable snapshot instead of assuming that
        // each new observation extends the previous one byte-for-byte.
        if (text.equals(lastStreamSnapshot) && latestThinkingSummary.equals(lastStreamedThinkingSummary)) return;
        boolean revision = !text.startsWith(lastStreamSnapshot);
        if (revision && !lastStreamSnapshot.isEmpty()) {
            diagnostics.trace("state", "STREAM_REVISION",
                "AI Studio revised previously rendered text; replacing preview",
                diagnostics.details("previousChars", lastStreamSnapshot.length(), "newChars", text.length()));
        }
        lastStreamSnapshot = text;
        lastStreamedThinkingSummary = latestThinkingSummary;
        JSObject event = new JSObject();
        event.put("requestId", diagnostics.getRequestId());
        event.put("text", text);
        event.put("replace", true);
        event.put("reasoning", latestThinkingSummary);
        event.put("replaceReasoning", true);
        event.put("totalChars", text.length());
        diagnostics.emitEvent("textProgress", event);
    }
}
