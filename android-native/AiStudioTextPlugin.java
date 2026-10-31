package com.tvhuy99.cardstudio;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Android-only experimental text integration with the authenticated AI Studio
 * website. Authentication stays inside the WebView. No cookie, credential,
 * session token, or undocumented Google API is extracted.
 *
 * AI Studio does not expose a supported web automation API. All selectors are
 * intentionally best-effort and fail closed when the page changes.
 */
@CapacitorPlugin(name = "AIStudioText")
public class AiStudioTextPlugin extends Plugin {
    private static final String URL = "https://aistudio.google.com/prompts/new_chat";
    private static final long TIMEOUT_MS = 90000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView sessionWebView;
    private AlertDialog sessionDialog;
    private PluginCall pending;
    private String baseline = "";
    private String lastCandidate = "";
    private long lastCandidateAt;
    private long requestStart;

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void openSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (sessionWebView == null) {
                    sessionWebView = new WebView(getActivity());
                    WebSettings settings = sessionWebView.getSettings();
                    settings.setJavaScriptEnabled(true);
                    settings.setDomStorageEnabled(true);
                    settings.setAllowFileAccess(false);
                    settings.setAllowContentAccess(false);
                    CookieManager.getInstance().setAcceptCookie(true);
                    CookieManager.getInstance().setAcceptThirdPartyCookies(sessionWebView, true);
                    sessionWebView.setWebViewClient(new WebViewClient());
                    sessionWebView.setWebChromeClient(new WebChromeClient());
                    sessionWebView.loadUrl(URL);
                }
                showWindow();
                JSObject result = new JSObject();
                result.put("opened", true);
                result.put("note", "Log in and choose a text model inside AI Studio. Google may block embedded-WebView login.");
                call.resolve(result);
            } catch (Exception e) {
                call.reject("AI_STUDIO_OPEN_FAILED: " + e.getMessage());
            }
        });
    }

    private void showWindow() {
        if (sessionDialog != null && sessionDialog.isShowing()) return;
        if (sessionWebView.getParent() instanceof ViewGroup) {
            ((ViewGroup) sessionWebView.getParent()).removeView(sessionWebView);
        }
        sessionDialog = new AlertDialog.Builder(getActivity())
            .setTitle("Google / AI Studio (tài khoản)")
            .setView(sessionWebView)
            .setPositiveButton("Quay lại Card Studio", (dialog, which) -> {})
            .create();
        sessionDialog.setOnDismissListener(dialog -> {
            if (sessionWebView.getParent() instanceof ViewGroup) {
                ((ViewGroup) sessionWebView.getParent()).removeView(sessionWebView);
            }
        });
        sessionDialog.show();
        if (sessionDialog.getWindow() != null) {
            sessionDialog.getWindow().setLayout(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            );
        }
    }

    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt = call.getString("prompt", "");
        if (prompt == null || prompt.isBlank()) {
            call.reject("AI_STUDIO_PROMPT_EMPTY");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (pending != null) {
                call.reject("AI_STUDIO_BUSY");
                return;
            }
            if (sessionWebView == null) {
                call.reject("AI_STUDIO_NOT_OPEN: Open Google / AI Studio from Settings first.");
                return;
            }
            String url = sessionWebView.getUrl();
            if (url == null || !url.startsWith("https://aistudio.google.com/")) {
                call.reject("AI_STUDIO_NOT_READY: Finish signing in to AI Studio first.");
                return;
            }
            pending = call;
            baseline = "";
            lastCandidate = "";
            requestStart = SystemClock.elapsedRealtime();
            lastCandidateAt = requestStart;
            final String input = JSONObject.quote(prompt);
            // This script manipulates the visible Google AI Studio UI. It does
            // not read authentication state or call Google's private endpoints.
            String js = "(function(){try{" +
                "const answer=()=>{const q=document.querySelectorAll('[data-role=\"model\"],"+
                "[data-message-role=\"model\"],[data-testid*=\"response\"],"+
                "[data-testid*=\"model-output\"],markdown-renderer,.markdown');"+
                "return q.length?String(q[q.length-1].innerText||q[q.length-1].textContent||'').trim():''};"+
                "const before=answer();"+
                "const nodes=[...document.querySelectorAll('textarea,[contenteditable=\"true\"],"+
                "[role=\"textbox\"]')];"+
                "const el=nodes.find(e=>{const r=e.getBoundingClientRect();"+
                "return r.width>0&&r.height>0&&!e.disabled})||nodes[0];"+
                "if(!el)return JSON.stringify({ok:false,error:'AI_STUDIO_EDITOR_NOT_FOUND'});"+
                "el.focus();"+
                "if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){"+
                "const setter=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?"+
                "HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')?.set;"+
                "if(setter)setter.call(el," + input + ");else el.value=" + input + ";"+
                "}else{el.textContent=" + input + ";}"+
                "el.dispatchEvent(new Event('input',{bubbles:true}));"+
                "el.dispatchEvent(new Event('change',{bubbles:true}));"+
                "const buttons=[...document.querySelectorAll('button,[role=\"button\"]')];"+
                "const send=buttons.find(b=>{const r=b.getBoundingClientRect();"+
                "const text=[b.getAttribute('aria-label'),b.getAttribute('title'),"+
                "b.textContent].filter(Boolean).join(' ');"+
                "return r.width>0&&r.height>0&&!b.disabled&&"+
                "/(^|\\s)(run|send|submit|generate|gửi|chạy)(\\s|$)/i.test(text)});"+
                "if(!send)return JSON.stringify({ok:false,error:'AI_STUDIO_SEND_BUTTON_NOT_FOUND'});"+
                "send.click();return JSON.stringify({ok:true,before:before});"+
                "}catch(e){return JSON.stringify({ok:false,error:String(e.message||e)})}})()";
            sessionWebView.evaluateJavascript(js, raw -> {
                if (pending != call) return;
                try {
                    JSONObject result = parse(raw);
                    if (!result.optBoolean("ok", false)) {
                        fail("AI Studio UI: " + result.optString("error", "Cannot submit prompt"));
                        return;
                    }
                    baseline = result.optString("before", "");
                    handler.postDelayed(this::pollResponse, 1200);
                } catch (Exception e) {
                    fail("AI_STUDIO_JS_ERROR: " + e.getMessage());
                }
            });
        });
    }

    private void pollResponse() {
        if (pending == null || sessionWebView == null) return;
        if (SystemClock.elapsedRealtime() - requestStart > TIMEOUT_MS) {
            fail("AI_STUDIO_TIMEOUT: No usable text response was detected. Check the AI Studio window.");
            return;
        }
        // Check only AI-output containers; never mistake UI labels or echoed
        // user prompts for a successful model answer.
        String script = "(function(){try{const q=document.querySelectorAll(" +
            "'[data-role=\"model\"],[data-message-role=\"model\"],"+
            "[data-testid*=\"response\"],[data-testid*=\"model-output\"],"+
            "markdown-renderer,.markdown');"+
            "const last=q.length?q[q.length-1]:null;"+
            "return JSON.stringify({text:last?String(last.innerText||last.textContent||'').trim():''});"+
            "}catch(e){return JSON.stringify({error:String(e)})}})()";
        sessionWebView.evaluateJavascript(script, raw -> {
            if (pending == null) return;
            try {
                String value = parse(raw).optString("text", "");
                if (!value.isBlank() && !value.equals(baseline)) {
                    if (!value.equals(lastCandidate)) {
                        lastCandidate = value;
                        lastCandidateAt = SystemClock.elapsedRealtime();
                    } else if (SystemClock.elapsedRealtime() - lastCandidateAt > 2500L) {
                        PluginCall done = pending;
                        pending = null;
                        JSObject response = new JSObject();
                        response.put("text", value);
                        done.resolve(response);
                        return;
                    }
                }
            } catch (Exception ignored) {
                // Keep polling until a verifiable answer or timeout.
            }
            handler.postDelayed(this::pollResponse, 950);
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null) fail("AI_STUDIO_CANCELLED");
            call.resolve();
        });
    }

    private JSONObject parse(String raw) throws Exception {
        Object parsed = new JSONTokener(raw == null ? "null" : raw).nextValue();
        return new JSONObject(parsed instanceof String ? (String) parsed : String.valueOf(parsed));
    }

    private void fail(String message) {
        PluginCall p = pending;
        pending = null;
        if (p != null) p.reject(message);
    }

    @Override
    protected void handleOnDestroy() {
        if (pending != null) fail("AI_STUDIO_SESSION_CLOSED");
        if (sessionDialog != null) sessionDialog.dismiss();
        if (sessionWebView != null) sessionWebView.destroy();
        sessionWebView = null;
        super.handleOnDestroy();
    }
}
