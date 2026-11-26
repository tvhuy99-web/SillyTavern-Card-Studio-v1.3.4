package com.tvhuy99.cardstudio;

import android.net.Uri;
import android.util.Log;

import com.getcapacitor.JSObject;

import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Shared diagnostics, safe URL path formatting, and guarded JavaScript
 * evaluation envelope helpers for the AI Studio WebView plugin.
 *
 * No API key, cookies, OAuth tokens, prompts, or answer texts are logged.
 */
final class AiStudioDiagnostics {
    static final String LOG_TAG = "CardStudioAIStudio";

    interface EventEmitter {
        void emit(String eventName, JSObject data);
    }

    private final EventEmitter emitter;
    private String requestId = "";

    AiStudioDiagnostics(EventEmitter emitter) {
        this.emitter = emitter;
    }

    String getRequestId() {
        return requestId;
    }

    void setRequestId(String requestId) {
        this.requestId = requestId == null ? "" : requestId;
    }

    void emitEvent(String eventName, JSObject data) {
        emitter.emit(eventName, data);
    }

    String safePath(String value) {
        try {
            Uri uri = Uri.parse(value);
            return (uri.getHost() == null ? "unknown" : uri.getHost()) +
                (uri.getPath() == null ? "" : uri.getPath()).substring(0,
                    Math.min(130, uri.getPath() == null ? 0 : uri.getPath().length()));
        } catch (Exception e) {
            return "unknown";
        }
    }

    void trace(String level, String stage, String message, JSObject details) {
        JSObject event = new JSObject();
        event.put("level", level);
        event.put("stage", stage);
        event.put("requestId", requestId);
        event.put("message", message);
        event.put("details", details == null ? new JSObject() : details);
        emitter.emit("diagnostic", event);
        // Do not print prompt/response, credentials or raw URLs to Android logs.
        Log.i(LOG_TAG, "[" + stage + "] #" + requestId + " " + message);
    }

    JSObject details(Object... parts) {
        JSObject d = new JSObject();
        for (int i = 0; i + 1 < parts.length; i += 2) {
            d.put(String.valueOf(parts[i]), parts[i + 1]);
        }
        return d;
    }

    void snapshotTrace(String stage, JSONObject o) {
        trace("state", stage, "Browser UI diagnostic snapshot", details(
            "path", o.optString("path", ""), "ready", o.optString("ready", ""),
            "editors", o.optInt("editors", -1), "visibleEditors", o.optInt("visibleEditors", -1),
            "buttons", o.optInt("buttons", -1), "responseNodes", o.optInt("responseNodes", -1),
            "outputChars", o.optInt("outputChars", -1),
            "modelTurns", o.optInt("modelTurns", -1), "cmarkNodes", o.optInt("cmarkNodes", -1),
            "rawModelNodes", o.optInt("rawModelNodes", -1),
            "responseMethod", o.optString("responseMethod", "none"),
            "responseIframes", o.optInt("responseIframes", -1),
            "responseShadows", o.optInt("responseShadows", -1),
            "inaccessibleFrames", o.optInt("inaccessibleFrames", -1),
            "shadows", o.optInt("shadows", -1), "frames", o.optInt("frames", -1),
            "scanned", o.optInt("scanned", -1), "busy", o.optBoolean("busy", false),
            "authGate", o.optBoolean("authGate", false),
            "clicked", o.optBoolean("clicked", false),
            "stopVisible", o.optBoolean("stopVisible", false),
            "loadingIndicators", o.optInt("loadingIndicators", 0),
            "elapsedClickMs", o.optLong("elapsedSinceClickMs", -1L)
        ));
    }

    // JS exceptions and page navigations must not be disguised as JSONException.
    // Android evaluateJavascript passes an outer JSON-encoded string. The
    // inner payload is always an object with ok/value or ok/errorCode.
    String guardJs(String expression) {
        return "JSON.stringify((function(){try{" +
            "var v=(" + expression + ");" +
            "return {ok:true,value:v};" +
            "}catch(e){return {ok:false,errorCode:'JS_EXCEPTION'," +
            "errorName:String(e&&e.name||'Error').slice(0,60)};}})())";
    }

    JSONObject parse(String raw) throws Exception {
        Object first = new JSONTokener(raw == null ? "null" : raw).nextValue();
        return new JSONObject(first instanceof String ? (String) first : String.valueOf(first));
    }

    JSONObject unwrapJs(String raw, String stage, String currentUrl) throws Exception {
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            trace("error", stage + "_NO_RESULT", "WebView returned null (navigation or JavaScript exception)", details(
                "rawNull", raw == null, "rawChars", raw == null ? 0 : raw.length(),
                "hostPath", safePath(currentUrl)));
            throw new IllegalStateException("JS_NULL_RESULT");
        }
        JSONObject envelope;
        try {
            envelope = parse(raw);
        } catch (Exception e) {
            trace("error", stage + "_PARSE", "WebView returned non-JSON value", details(
                "exception", e.getClass().getSimpleName(), "rawChars", raw.length(),
                "firstCharacter", raw.isEmpty() ? "empty" : String.valueOf(raw.charAt(0))));
            throw new IllegalStateException("JS_NON_JSON_RESULT");
        }
        if (!envelope.optBoolean("ok", false)) {
            trace("error", stage + "_EXCEPTION", "JavaScript evaluation threw", details(
                "errorCode", envelope.optString("errorCode", "UNKNOWN"),
                "errorName", envelope.optString("errorName", "Error")));
            throw new IllegalStateException("JS_EXCEPTION_" + envelope.optString("errorName", "Error"));
        }
        JSONObject value = envelope.optJSONObject("value");
        if (value == null) {
            trace("error", stage + "_INVALID", "JavaScript returned no response object",
                details("valueType", envelope.isNull("value") ? "null" : "nonObject"));
            throw new IllegalStateException("JS_INVALID_RESPONSE");
        }
        return value;
    }
}
