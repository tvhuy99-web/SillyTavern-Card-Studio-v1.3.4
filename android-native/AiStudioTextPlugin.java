package com.tvhuy99.cardstudio;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import java.util.UUID;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Text-only AI Studio browser session, using the user's visible first-party
 * AI Studio UI. Inspired by GeminiLiveTranslate's session lifecycle,
 * diagnostics, partial text output and persistent WebView host.
 *
 * No API key, cookies, OAuth tokens, prompts, or answer texts are logged.
 * Browser UI automation remains experimental and may fail after UI updates.
 */
@CapacitorPlugin(name = "AIStudioText")
public class AiStudioTextPlugin extends Plugin {
    private static final String URL = "https://aistudio.google.com/prompts/new_chat";
    private static final long TIMEOUT_MS = 300_000L;
    private static final long POLL_MS = 600L;
    private static final String LOG_TAG = "CardStudioAIStudio";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView sessionWebView;
    // The reference app keeps a REAL visible WebView at its normal opacity
    // while translating its host completely off-screen. Alpha hiding allows
    // WebView compositor surfaces to bleed through above the app on devices.
    private AiStudioPanel panel;
    private PluginCall pending;
    private String requestId = "";
    private String baseline = "";
    private String latest = "";
    private String lastStreamSnapshot = "";
    private String latestThinkingSummary = "";
    private String lastStreamedThinkingSummary = "";
    private boolean freshChatLoaded = false;
    private AiStudioModelCatalogReader catalogReader;
    private String pendingThinkingLevel = "default";
    private String confirmedThinkingLevel = "not-verified";
    private int freshChatAttempt = 0;
    private long requestStart;
    private long lastChanged;
    private long lastCheckpoint;
    private long observedIdleSince;
    private int consecutiveIdlePolls;
    private int polls;
    private int responseNodes;
    private boolean everSawResponse;
    private boolean everSawBusy;
    private boolean submitClicked;
    private boolean submitDispatched;
    private int bootstrapFailures;
    private boolean foregroundRequestStarted;
    private boolean appInBackground;
    private boolean destroyed;
    private String foregroundToken;
    private Runnable requestWatchdog;
    private final Handler cancellationHandler = new Handler(Looper.getMainLooper());
    private final NativeRequestLedger cancelledRequests = new NativeRequestLedger();
    private PluginCall cancellationCall;


    // The foreground service is started by a user-initiated generation call
    // before the user presses Home. This avoids Android 12+ restrictions on
    // starting foreground services after the app has gone to the background.
    private void startBackgroundGeneration() {
        try {
            foregroundToken = UUID.randomUUID().toString();
            Intent intent = AiStudioGenerationService.startIntent(getContext(), foregroundToken);
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent);
            else getContext().startService(intent);
            foregroundRequestStarted = true;
            trace("state","BACKGROUND_SERVICE_STARTED",
                "AI Studio generation protected by Android foreground dataSync service",
                details("requestActive",pending!=null,"sdk",Build.VERSION.SDK_INT));
            if (Build.VERSION.SDK_INT >= 33 &&
                getActivity().checkSelfPermission("android.permission.POST_NOTIFICATIONS") !=
                    PackageManager.PERMISSION_GRANTED) {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences(
                    PREFS_NAME,android.content.Context.MODE_PRIVATE);
                if(!prefs.getBoolean("notifications_asked",false)) {
                    prefs.edit().putBoolean("notifications_asked",true).apply();
                    getActivity().requestPermissions(
                        new String[]{"android.permission.POST_NOTIFICATIONS"},4088);
                    trace("state","BACKGROUND_NOTIFICATION_PERMISSION",
                        "Requested optional notification visibility permission",null);
                }
            }
        } catch (Exception e) {
            AiStudioGenerationService.finish(getContext(), foregroundToken, false);
            foregroundToken = null;
            foregroundRequestStarted = false;
            trace("warn","BACKGROUND_SERVICE_FAILED",
                "Android cannot guarantee AI Studio will continue after Home",
                details("exception",e.getClass().getSimpleName()));
        }
    }

    private void stopBackgroundGeneration(boolean success) {
        if (foregroundRequestStarted) {
            AiStudioGenerationService.finish(getContext(),foregroundToken,success);
            foregroundToken = null;
            foregroundRequestStarted = false;
            trace("state","BACKGROUND_SERVICE_STOPPED",
                "Foreground generation service stopped",details("success",success));
        }
    }

    @PluginMethod
    public void getBackgroundStatus(PluginCall call) {
        onUi(call, () -> {
        JSObject result=new JSObject();
        result.put("active",pending!=null);
        result.put("cancelling",cancellationCall!=null);
        result.put("inBackground",appInBackground);
        result.put("foregroundService",AiStudioGenerationService.isActive(foregroundToken));
        result.put("requestId",requestId);
        result.put("responseChars",latest.length());
        call.resolve(result);
        });
    }

    @Override
    protected void handleOnPause() {
        appInBackground = true;
        if (pending != null) {
            // WebView.onPause() is not a JavaScript hard-stop; nevertheless
            // keep both WebView and Chromium timers resumed for UI polling.
            if (sessionWebView != null) {
                sessionWebView.onResume();
                sessionWebView.resumeTimers();
            }
            trace("state","APP_BACKGROUND",
                "Card Studio left foreground; native AI Studio polling continues",
                details("foregroundService",foregroundRequestStarted,
                    "responseChars",latest.length(),"polls",polls));
        }
        super.handleOnPause();
    }

    @Override
    protected void handleOnResume() {
        appInBackground = false;
        if(sessionWebView != null) {
            sessionWebView.onResume();
            sessionWebView.resumeTimers();
        }
        if(pending != null) {
            trace("state","APP_RETURNED",
                "Card Studio foreground restored during active AI Studio generation",
                details("foregroundService",foregroundRequestStarted,
                    "responseChars",latest.length(),"polls",polls));
        }
        super.handleOnResume();
    }
    private static final String PREFS_NAME = "ai_studio_page_preferences";
    private static final String PREFS_SHOW_PAGE = "show_ai_studio_page";

    // Default OFF: the AI Studio WebView runs behind the Card Studio UI.
    private boolean isPageDisplayEnabled() {
        return getContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
            .getBoolean(PREFS_SHOW_PAGE, false);
    }

    @PluginMethod
    public void getVisibility(PluginCall call) {
        JSObject result = new JSObject();
        result.put("visible", isPageDisplayEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void setVisibility(PluginCall call) {
        final boolean visible = Boolean.TRUE.equals(call.getBoolean("visible", false));
        onUi(call, () -> {
            getContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
                .edit().putBoolean(PREFS_SHOW_PAGE, visible).apply();
            trace("state","PAGE_VISIBILITY_CHANGED",
                visible ? "AI Studio debug page enabled" : "AI Studio debug page hidden",
                details("visible",visible));
            try {
                createSessionIfNeeded();
                applyPanelPresentation(visible, "settings-toggle");
                JSObject event = new JSObject();
                event.put("visible", visible);
                notifyListeners("pageVisibilityChanged", event);
                JSObject result = new JSObject();
                result.put("visible", visible);
                call.resolve(result);
            } catch (Exception e) {
                trace("error","PAGE_VISIBILITY_FAILED","Unable to change AI Studio visibility",
                    details("exception",e.getClass().getSimpleName()));
                call.reject("AI_STUDIO_VISIBILITY_FAILED");
            }
        });
    }

    private void onUi(PluginCall call, Runnable action) {
        android.app.Activity activity = getActivity();
        if (activity == null) { call.reject("AI_STUDIO_SESSION_CLOSED"); return; }
        activity.runOnUiThread(() -> {
            if (destroyed || activity.isDestroyed()) { call.reject("AI_STUDIO_SESSION_CLOSED"); return; }
            try { action.run(); }
            catch (Exception error) {
                if (pending == call) fail("AI_STUDIO_NATIVE_ERROR: " + error.getClass().getSimpleName());
                else call.reject("AI_STUDIO_NATIVE_ERROR: " + error.getClass().getSimpleName());
            }
        });
    }

    // Probe the UI without reading credentials. The JS returns model text
    // only to the plugin method. Log records always contain metadata only.


    private String safePath(String value) {
        try {
            Uri uri = Uri.parse(value);
            return (uri.getHost() == null ? "unknown" : uri.getHost()) +
                (uri.getPath() == null ? "" : uri.getPath()).substring(0,
                    Math.min(130, uri.getPath() == null ? 0 : uri.getPath().length()));
        } catch (Exception e) {
            return "unknown";
        }
    }
    private void trace(String level, String stage, String message, JSObject details) {
        JSObject event = new JSObject();
        event.put("level", level);
        event.put("stage", stage);
        event.put("requestId", requestId);
        event.put("message", message);
        event.put("details", details == null ? new JSObject() : details);
        notifyListeners("diagnostic", event);
        // Do not print prompt/response, credentials or raw URLs to Android logs.
        Log.i(LOG_TAG, "[" + stage + "] #" + requestId + " " + message);
    }
    private JSObject details(Object... parts) {
        JSObject d = new JSObject();
        for (int i=0; i+1<parts.length; i+=2) d.put(String.valueOf(parts[i]), parts[i+1]);
        return d;
    }
    private void snapshotTrace(String stage, JSONObject o) {
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
            "stopVisible",o.optBoolean("stopVisible",false),
            "loadingIndicators",o.optInt("loadingIndicators",0),
            "elapsedClickMs", o.optLong("elapsedSinceClickMs", -1L)
        ));
    }

    private void createSessionIfNeeded() {
        if (sessionWebView == null) {
            sessionWebView = new WebView(getActivity());
            try {
                AiStudioWebViewPolicy.configure(sessionWebView, false);
                sessionWebView.setWebViewClient(new WebViewClient() {
                    @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                        if (view != sessionWebView || destroyed) return;
                        freshChatLoaded = false;
                        trace("state","PAGE_STARTED","AI Studio page navigation",
                            details("hostPath",safePath(url)));
                    }
                    @Override public void onPageFinished(WebView view, String url) {
                        if (view != sessionWebView || destroyed) return;
                        trace("state","PAGE_FINISHED","AI Studio page loaded",
                            details("hostPath",safePath(url)));
                        if(pending!=null && view == sessionWebView && AiStudioOrigin.isStudioUrl(url) && url.equals(view.getUrl())){
                            freshChatLoaded = true;
                            trace("state","NEW_CHAT_PAGE_LOADED","New-chat page loaded; checking for old model turns",
                                details("attempt",freshChatAttempt,"hostPath",safePath(url)));
                        }
                        if (view == sessionWebView && AiStudioOrigin.isStudioUrl(url)) inspect("PAGE_UI");
                    }
                    @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e) {
                        if (r.isForMainFrame())
                            trace("error","MAIN_FRAME_ERROR","WebView connection failed",
                                details("errorCode",e.getErrorCode(),"hostPath",safePath(r.getUrl().toString())));
                    }
                    @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse e) {
                        if (r.isForMainFrame())
                            trace("warn","HTTP_ERROR","AI Studio main frame returned an HTTP error",
                                details("status",e.getStatusCode(),"hostPath",safePath(r.getUrl().toString())));
                    }
                    @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                        if (view == sessionWebView) {
                            if (pending != null) fail("AI_STUDIO_RENDERER_GONE");
                            if (cancellationCall != null) finishCancellation(cancellationCall, false);
                            releaseWebView();
                        }
                        return true;
                    }
                    @Override public void onReceivedSslError(WebView v,SslErrorHandler h,SslError e) {
                        h.cancel();
                        trace("error","SSL_ERROR","AI Studio SSL certificate rejected",
                            details("sslCode",e.getPrimaryError()));
                    }
                });
                sessionWebView.setWebChromeClient(new WebChromeClient() {
                    @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                        if(m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR)
                            trace("warn","PAGE_JS_ERROR","AI Studio website reported JS error (contents hidden)",
                                details("line",m.lineNumber(),"source",safePath(m.sourceId())));
                        return false;
                    }
                });
                trace("state","SESSION_CREATE","Creating persistent WebView session",details(
                    "androidSdk",android.os.Build.VERSION.SDK_INT));
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

    @PluginMethod
    public void openSession(PluginCall call) {
        onUi(call, () -> {
            try {
                createSessionIfNeeded();
                showInlinePanel("manual-open");
                JSObject result = new JSObject();
                result.put("opened", true);
                call.resolve(result);
            } catch (Exception e) {
                trace("error","OPEN_ERROR","Cannot initialize AI Studio WebView",details(
                    "exception",e.getClass().getSimpleName()));
                call.reject("AI_STUDIO_OPEN_FAILED: " + e.getClass().getSimpleName());
            }
        });
    }

    private void retainWebView() {
        if (sessionWebView == null || getActivity() == null) return;
        if (panel == null) panel = new AiStudioPanel(getActivity(), sessionWebView, () -> {
            getContext().getSharedPreferences(PREFS_NAME,android.content.Context.MODE_PRIVATE)
                .edit().putBoolean(PREFS_SHOW_PAGE,false).apply();
            applyPanelPresentation(false,"panel-hide-button");
            JSObject event = new JSObject();
            event.put("visible",false);
            notifyListeners("pageVisibilityChanged",event);
            trace("state","PAGE_VISIBILITY_CHANGED","AI Studio debug panel hidden",details("visible",false));
        });
        if (!panel.attach()) { trace("warn","WEBVIEW_HOST_MISSING","No content root",null); throw new IllegalStateException("No content root"); }
        applyPanelPresentation(isPageDisplayEnabled(),"retain");
        sessionWebView.onResume();
        sessionWebView.resumeTimers();
        trace("state","WEBVIEW_RETAIN","AI Studio WebView attached without modal",details(
            "hasParent",panel.isAttached(),"visiblePreference",isPageDisplayEnabled()));
    }
    private void applyPanelPresentation(boolean visible,String reason) {
        if (panel == null) return;
        int panelHeight = panel.present(visible);
        if (panelHeight < 0) return;
        trace("state",visible?"WEBVIEW_INLINE_VISIBLE":"WEBVIEW_HIDDEN_OFFSCREEN",
            visible?"Non-modal AI Studio monitor remains beside Card Studio chat":
                    "AI Studio WebView kept fully off-screen and running",
            details("reason",reason,"visible",visible,"modal",false,"panelHeight",panelHeight));
    }
    private void showInlinePanel(String reason) {
        retainWebView();
        applyPanelPresentation(true,reason);
    }

    private void inspect(String stage) {
        final WebView inspected = sessionWebView;
        if(inspected==null || !AiStudioOrigin.isStudioUrl(inspected.getUrl())) return;
        AiStudioWebViewPolicy.evaluate(inspected, AiStudioPageScripts.INSTALL_JS, raw -> {
            if(inspected!=sessionWebView || destroyed)return;
            AiStudioWebViewPolicy.evaluate(inspected,
                "JSON.stringify(window.__STS_AI_TEXT_V2__?.snapshot()||{error:'NO_SCRIPT'})",
                value -> {
                    if (inspected != sessionWebView || destroyed) return;
                    try {snapshotTrace(stage,parse(value));}
                    catch(Exception e) {trace("warn","INSPECT_FAILED","Cannot inspect AI Studio page",
                        details("error",e.getClass().getSimpleName()));}
                });
        });
    }

    // JS exceptions and page navigations must not be disguised as JSONException.
    // Android evaluateJavascript passes an outer JSON-encoded string. The
    // inner payload is always an object with ok/value or ok/errorCode.
    private String guardJs(String expression) {
        return "JSON.stringify((function(){try{" +
            "var v=(" + expression + ");" +
            "return {ok:true,value:v};" +
            "}catch(e){return {ok:false,errorCode:'JS_EXCEPTION'," +
            "errorName:String(e&&e.name||'Error').slice(0,60)};}})())";
    }
    private JSONObject unwrapJs(String raw, String stage) throws Exception {
        if(raw==null || raw.isBlank() || "null".equals(raw)) {
            trace("error",stage+"_NO_RESULT","WebView returned null (navigation or JavaScript exception)",details(
                "rawNull",raw==null,"rawChars",raw==null?0:raw.length(),
                "hostPath",safePath(sessionWebView==null?null:sessionWebView.getUrl())));
            throw new IllegalStateException("JS_NULL_RESULT");
        }
        JSONObject envelope;
        try {envelope=parse(raw);}
        catch(Exception e) {
            trace("error",stage+"_PARSE","WebView returned non-JSON value",details(
                "exception",e.getClass().getSimpleName(),"rawChars",raw.length(),
                "firstCharacter",raw.isEmpty()?"empty":String.valueOf(raw.charAt(0))));
            throw new IllegalStateException("JS_NON_JSON_RESULT");
        }
        if(!envelope.optBoolean("ok",false)) {
            trace("error",stage+"_EXCEPTION","JavaScript evaluation threw",details(
                "errorCode",envelope.optString("errorCode","UNKNOWN"),
                "errorName",envelope.optString("errorName","Error")));
            throw new IllegalStateException("JS_EXCEPTION_"+envelope.optString("errorName","Error"));
        }
        JSONObject value=envelope.optJSONObject("value");
        if(value==null) {
            trace("error",stage+"_INVALID","JavaScript returned no response object",
                details("valueType",envelope.isNull("value")?"null":"nonObject"));
            throw new IllegalStateException("JS_INVALID_RESPONSE");
        }
        return value;
    }

    // A cold app launch must never require Settings -> Open AI Studio first.
    // Show the real first-party WebView for login/model selection only if the
    // user has no live session, then resume the original text request.
    private void waitUntilReady(PluginCall call, String prompt, int attempt) {
        if(pending!=call)return;
        final long elapsed=SystemClock.elapsedRealtime()-requestStart;
        if(elapsed>(isPageDisplayEnabled()?180_000L:45_000L)){
            fail(isPageDisplayEnabled()
                ? "AI_STUDIO_LOGIN_OR_PAGE_TIMEOUT: Đăng nhập AI Studio rồi thử lại."
                : "AI_STUDIO_NOT_READY_HIDDEN: Bật 'Hiển thị trang web AI Studio' trong Cài đặt để đăng nhập hoặc xem lỗi.");
            return;
        }
        if(sessionWebView==null){fail("AI_STUDIO_SESSION_LOST");return;}
        if(!freshChatLoaded || !AiStudioOrigin.isStudioUrl(sessionWebView.getUrl())) {
            if(attempt%7==0)trace("state","NEW_CHAT_WAIT","Waiting for fresh AI Studio page to finish navigation",
                details("elapsedMs",elapsed));
            handler.postDelayed(()->waitUntilReady(call,prompt,attempt+1),750L);
            return;
        }
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            AiStudioPageScripts.NEW_CHAT_READINESS_JS,
            raw->{
                if(pending!=call)return;
                try {
                    JSONObject x=parse(raw);
                    if(x.optBoolean("ok",false)) {
                        trace("state","NEW_CHAT_CONFIRMED","Fresh empty AI Studio chat ready for this Card Studio turn",
                            details("waitMs",SystemClock.elapsedRealtime()-requestStart,
                                "editorCount",x.optInt("editors",0),
                                "oldModelTurns",x.optInt("oldModelTurns",-1)));
                        // Reset generation timeout after login/network startup.
                        requestStart=SystemClock.elapsedRealtime();
                        armWatchdog(call);
                        configureThinking(call,prompt);
                        return;
                    }
                    if(attempt%10==0)trace("warn","SESSION_WAIT","AI Studio new chat not ready",
                        details("host",x.optString("host","unknown"),
                            "path",x.optString("path","unknown"),
                            "oldModelTurns",x.optInt("oldModelTurns",-1),
                            "ready",x.optString("ready","unknown"),
                            "editors",x.optInt("editors",0),"elapsedMs",elapsed));
                    // Do not inadvertently send into a prior Google thread.
                    if(attempt>=30 && x.optInt("oldModelTurns",0)>0){
                        fail("AI_STUDIO_NEW_CHAT_NOT_EMPTY: AI Studio has prior model turns.");
                        return;
                    }
                    if(attempt==12) {
                        if (isPageDisplayEnabled()) {
                            trace("warn","OPEN_LOGIN","AI Studio inline monitor is available for login",null);
                            applyPanelPresentation(true,"login-help");
                        } else if (!isPageDisplayEnabled()) {
                            trace("warn","LOGIN_HIDDEN","AI Studio not ready while debug page is hidden",
                                details("help","Bật Hiển thị trang web AI Studio trong Cài đặt để đăng nhập hoặc xem lỗi"));
                        }
                    }
                }catch(Exception e){
                    if(attempt%10==0)trace("warn","SESSION_PROBE_ERROR","Cannot inspect AI Studio readiness",
                        details("exception",e.getClass().getSimpleName(),
                            "rawNull",raw==null || "null".equals(raw)));
                }
                handler.postDelayed(()->waitUntilReady(call,prompt,attempt+1),1000L);
            });
    }


    @PluginMethod
    public void listModels(PluginCall call) {
        onUi(call, () -> {
            if(pending!=null || cancellationCall!=null){
                trace("warn","MODEL_LOAD_BUSY","Cannot list models during an active chat generation",
                    details("activeThinking",pendingThinkingLevel,"activeRequestId",requestId));
                call.reject("AI_STUDIO_BUSY: Đang tạo câu trả lời. Hãy hủy hoặc hoàn thành lượt chat trước khi tải model.");
                return;
            }
            if(catalogReader!=null)catalogReader.cancel();
            requestId="catalog-"+SystemClock.elapsedRealtime();
            trace("state","MODEL_LOAD_CLICK","Native model catalog load invoked",details("busy",false));
            catalogReader=new AiStudioModelCatalogReader(getActivity(),handler,call,
                (level,stage,message,extra)->trace(level,stage,message,extra));
            catalogReader.start();
        });
    }




    private void configureThinking(PluginCall call,String prompt) {
        if(pending!=call)return;
        final String level=pendingThinkingLevel;
        trace("state","THINKING_REQUESTED","Requested AI Studio thinking level",
            details("requested",level,"requestId",requestId));
        if("default".equals(level)){
            confirmedThinkingLevel="web-default";
            trace("state","THINKING_WEB_DEFAULT","Using thinking level from AI Studio page",
                details("requested",level,"applied","web-default"));
            prepareText(call,prompt);return;
        }
        if(!level.matches("minimal|low|medium|high")){
            fail("AI_STUDIO_THINKING_INVALID: "+level);return;
        }
        openThinkingControl(call,prompt,0);
    }

    private void openThinkingControl(PluginCall call,String prompt,int attempt){
        if(pending!=call||sessionWebView==null)return;
        AiStudioWebViewPolicy.evaluate(sessionWebView, AiStudioPageScripts.THINKING_OPEN_JS,raw->{
            if(pending!=call)return;
            JSONObject state;
            try{state=parse(raw);}
            catch(Exception e){fail("AI_STUDIO_THINKING_OPEN_ERROR: Không phân tích được giao diện suy nghĩ.");return;}
            trace("state","THINKING_CONTROL_SCAN","Looking for thinking settings control",
                details("requested",pendingThinkingLevel,"found",state.optBoolean("ok",false),
                    "reason",state.optString("reason","none"),"attempt",attempt+1));
            if(!state.optBoolean("ok",false)){
                if(attempt==0){
                    // Many AI Studio layouts hide thinking under Run settings.
                    AiStudioWebViewPolicy.evaluate(sessionWebView,
                        AiStudioPageScripts.RUN_SETTINGS_EXPAND_JS,
                        opened->{
                            if(pending!=call)return;
                            trace("state","THINKING_SETTINGS_EXPAND","Tried expanding AI Studio Run settings",
                                details("result",String.valueOf(opened).substring(0,Math.min(120,String.valueOf(opened).length()))));
                            handler.postDelayed(()->openThinkingControl(call,prompt,1),650L);
                        });
                    return;
                }
                fail("AI_STUDIO_THINKING_UNAVAILABLE: Không tìm thấy điều khiển mức suy nghĩ của AI Studio ("
                    +state.optString("reason","not-found")+"). Hãy bật hiển thị trang AI Studio để kiểm tra Run settings.");return;
            }
            handler.postDelayed(()->{
                if(pending!=call||sessionWebView==null)return;
                AiStudioWebViewPolicy.evaluate(sessionWebView,
                    AiStudioPageScripts.THINKING_SELECT_JS.replace("__STS_LEVEL__",JSONObject.quote(pendingThinkingLevel)),out->{
                    if(pending!=call)return;
                    JSONObject selected;
                    try{selected=parse(out);}
                    catch(Exception e){fail("AI_STUDIO_THINKING_SELECT_ERROR: Không đọc được danh sách mức.");return;}
                    trace(selected.optBoolean("ok",false)?"state":"error",
                        "THINKING_OPTION_CLICK","Thinking level option clicked",
                        details("requested",pendingThinkingLevel,"clicked",selected.optBoolean("ok",false),
                            "choice",selected.optString("choice","none")));
                    if(!selected.optBoolean("ok",false)){
                        fail("AI_STUDIO_THINKING_NOT_SUPPORTED: AI Studio không có mức '"
                            +pendingThinkingLevel+"' trên model này.");return;
                    }
                    verifyThinkingControl(call,prompt,0);
                });
            },650L);
        });
    }
    private void verifyThinkingControl(PluginCall call,String prompt,int attempt){
        if(pending!=call||sessionWebView==null)return;
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            AiStudioPageScripts.THINKING_VERIFY_JS.replace("__STS_LEVEL__",JSONObject.quote(pendingThinkingLevel)),raw->{
            if(pending!=call)return;
            JSONObject state;
            try{state=parse(raw);}
            catch(Exception e){fail("AI_STUDIO_THINKING_VERIFY_ERROR: Không đọc được trạng thái xác nhận.");return;}
            if(state.optBoolean("ok",false)){
                confirmedThinkingLevel=pendingThinkingLevel;
                trace("state","THINKING_VERIFIED","AI Studio controls confirm thinking level",
                    details("requested",pendingThinkingLevel,"applied",confirmedThinkingLevel,
                        "evidence",state.optString("evidence","unknown")));
                prepareText(call,prompt);
            }else if(attempt<3){
                trace("warn","THINKING_VERIFY_RETRY","Thinking selection not confirmed yet",
                    details("requested",pendingThinkingLevel,"attempt",attempt+1,
                        "reason",state.optString("reason","unverified")));
                handler.postDelayed(()->verifyThinkingControl(call,prompt,attempt+1),550L);
            }else{
                trace("error","THINKING_UNVERIFIED","Thinking selection was not confirmed by website",
                    details("requested",pendingThinkingLevel,"reason",state.optString("reason","unverified")));
                fail("AI_STUDIO_THINKING_UNVERIFIED: Đã nhấn mức '"+pendingThinkingLevel+
                    "' nhưng chưa xác nhận được AI Studio thực sự áp dụng. Đã dừng trước khi gửi lời nhắc.");
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt=call.getString("prompt","");
        final String requestedThinking=call.getString("thinkingLevel","default");
        final String preferredModel=call.getString("model","");
        final String modelId=preferredModel==null ? "" : preferredModel.trim().replaceFirst("^models/", "");
        final String chatUrl=(!"default".equalsIgnoreCase(modelId) && !"web_default".equalsIgnoreCase(modelId) && modelId.matches("[A-Za-z0-9._-]{1,100}"))
            ? URL+"?model="+android.net.Uri.encode(modelId) : URL;
        if(prompt==null || prompt.isBlank()){
            call.reject("AI_STUDIO_PROMPT_EMPTY");return;
        }
        onUi(call, () -> {
            if(pending!=null || cancellationCall!=null){call.reject("AI_STUDIO_BUSY");return;}
            String requestedId = call.getString("requestId");
            if (requestedId == null || requestedId.isEmpty()) requestedId = "chat-" + UUID.randomUUID().toString();
            if (!NativeRequestLedger.valid(requestedId)) {call.reject("AI_STUDIO_INVALID_REQUEST_ID");return;}
            if (cancelledRequests.isCancelled(requestedId)) {call.reject("AI_STUDIO_CANCELLED");return;}
            if (catalogReader != null) { catalogReader.cancel(); catalogReader = null; }
            boolean coldStart=sessionWebView==null;
            try {createSessionIfNeeded();}
            catch(Exception e){
                trace("error","AUTO_START_FAILED","Unable to open AI Studio automatically",
                    details("exception",e.getClass().getSimpleName()));
                call.reject("AI_STUDIO_AUTO_START_FAILED");return;
            }
            requestId=requestedId;
            pending=call;
            pendingThinkingLevel=requestedThinking==null?"default":requestedThinking.trim().toLowerCase(java.util.Locale.ROOT);
            confirmedThinkingLevel="not-verified";
            trace("state","GENERATION_SETTINGS","Native AI Studio generation received settings",
                details("requestedThinking",pendingThinkingLevel,
                    "requestedModel",modelId.isEmpty()?"web-default":modelId,
                    "pageManagedModel",chatUrl.equals(URL),"promptChars",prompt.length()));
            startBackgroundGeneration();
            baseline="";latest="";lastStreamSnapshot="";latestThinkingSummary="";lastStreamedThinkingSummary="";polls=0;responseNodes=0;
            observedIdleSince=0L;consecutiveIdlePolls=0;
            freshChatLoaded=false;freshChatAttempt=0;
            everSawResponse=false;everSawBusy=false;submitClicked=false;submitDispatched=false;bootstrapFailures=0;
            requestStart=SystemClock.elapsedRealtime();lastChanged=requestStart;
            lastCheckpoint=requestStart;
            armWatchdog(call);
            trace("state",coldStart?"SESSION_AUTO_START":"SESSION_REUSE",
                coldStart?"Created AI Studio WebView automatically":"Using existing AI Studio WebView",
                details("promptChars",prompt.length(),"hasWebViewParent",sessionWebView.getParent()!=null));
            sessionWebView.onResume();sessionWebView.resumeTimers();
            if(coldStart) {
                trace("state","NEW_CHAT_INITIAL","First-use session is loading a new chat page",
                    details("showDebugPage",isPageDisplayEnabled()));
                if(!chatUrl.equals(URL)) sessionWebView.loadUrl(chatUrl);
            } else {
                // Each Card Studio model turn has its OWN AI Studio chat.
                // Request a model through AI Studio\'s public new-chat URL; Google controls its availability.
                trace("state","NEW_CHAT_NAVIGATE","Opening fresh AI Studio conversation for this turn",null);
                sessionWebView.loadUrl(chatUrl);
            }
            // Keep the inline monitor in place. Never hijack the chat with a modal.
            applyPanelPresentation(isPageDisplayEnabled(),"generate");
            waitUntilReady(call,prompt,0);
        });
    }

    private void prepareText(PluginCall call,String prompt) {
        if(pending!=call||sessionWebView==null)return;
        AiStudioWebViewPolicy.evaluate(sessionWebView, AiStudioPageScripts.INSTALL_JS,ready->{
            if(pending!=call)return;
            if(ready==null || "null".equals(ready)){
                bootstrapFailures++;
                trace("warn","BOOTSTRAP_NULL","WebView could not execute AI Studio reader",details(
                    "rawNull",ready==null,"failureCount",bootstrapFailures,
                    "hostPath",safePath(sessionWebView==null?null:sessionWebView.getUrl())));
                if(bootstrapFailures>=5){
                    fail("AI_STUDIO_BOOTSTRAP_FAILED: JavaScript returned null after 5 attempts.");
                    return;
                }
                // A navigation race is transient. Do not restart the session
                // watchdog or flood console with an unbounded retry loop.
                handler.postDelayed(()->prepareText(call,prompt),1500L);
                return;
            }
            if(!("\"installed\"".equals(ready) || "\"ready\"".equals(ready))){
                trace("error","BOOTSTRAP_UNEXPECTED","AI Studio bootstrap returned unexpected result",
                    details("responseLength",ready.length(),"firstChar",ready.substring(0,1)));
                fail("AI_STUDIO_BOOTSTRAP_UNEXPECTED_RESULT");
                return;
            }
            trace("state","JS_BOOTSTRAP","Text-only UI reader installed",details("promptChars",prompt.length()));
            transferPromptChunk(call,prompt,0);
        });
    }

    // A ~66,000-character roleplay prompt should not be embedded into one
    // evaluateJavascript call. Transfer it as 2,000-UTF16-unit chunks, verify
    // each acknowledgement, and never log any prompt content.
    private void transferPromptChunk(PluginCall call,String prompt,int offset) {
        if(pending!=call||sessionWebView==null)return;
        if(offset<prompt.length()) {
            int end=Math.min(offset+2000,prompt.length());
            if(end<prompt.length() && Character.isHighSurrogate(prompt.charAt(end-1)))end--;
            final int next=end;
            String js="JSON.stringify((function(){try{var prev="+
                (offset==0?"''":"(window.__STS_AI_TEXT_INPUT__||'')")+
                ";window.__STS_AI_TEXT_INPUT__=prev+"+
                JSONObject.quote(prompt.substring(offset,end))+
                ";return {ok:true,length:window.__STS_AI_TEXT_INPUT__.length};"+
                "}catch(e){return {ok:false,errorName:String(e.name||'Error')}}})())";
            AiStudioWebViewPolicy.evaluate(sessionWebView, js,raw->{
                if(pending!=call)return;
                try{
                    JSONObject result=parse(raw);
                    if(!result.optBoolean("ok",false)||result.optInt("length",-1)!=next){
                        trace("error","INPUT_CHUNK_REJECTED","AI Studio prompt transfer failed",details(
                            "offset",offset,"next",next,"confirmed",result.optInt("length",-1),
                            "errorName",result.optString("errorName","none")));
                        fail("AI_STUDIO_INPUT_TRANSFER_FAILED");
                        return;
                    }
                    transferPromptChunk(call,prompt,next);
                }catch(Exception e){
                    trace("error","INPUT_CHUNK_JS","Failed to transfer AI Studio prompt chunk",details(
                        "offset",offset,"rawNull",raw==null||"null".equals(raw),
                        "exception",e.getClass().getSimpleName()));
                    fail("AI_STUDIO_INPUT_TRANSFER_JS_"+e.getClass().getSimpleName());
                }
            });
            return;
        }
        trace("state","INPUT_TRANSFER_COMPLETE","Prompt copied to AI Studio in verified chunks",
            details("promptChars",prompt.length(),
                "chunkCount",(prompt.length()+1999)/2000));
        String expression="(function(){var p=window.__STS_AI_TEXT_INPUT__||'';"+
            "delete window.__STS_AI_TEXT_INPUT__;"+
            "return window.__STS_AI_TEXT_V2__?.prepare(p)})()";
        AiStudioWebViewPolicy.evaluate(sessionWebView, guardJs(expression),raw->{
                if(pending!=call)return;
                try {
                    JSONObject obj=unwrapJs(raw,"EDITOR");
                    JSONObject snapshot=obj.optJSONObject("snapshot");
                    if(snapshot!=null)snapshotTrace("EDITOR_SNAPSHOT",snapshot);
                    if(!obj.optBoolean("ok",false)){
                        fail("AI_STUDIO_EDITOR_"+obj.optString("error","UNKNOWN"));
                        return;
                    }
                    baseline=obj.optString("before","");
                    trace("state","EDITOR_FILLED","AI Studio text editor filled",details(
                        "editorTag",obj.optString("editorTag","unknown"),
                        "promptChars",prompt.length(),"baselineChars",baseline.length()));
                    handler.postDelayed(()->submit(call),400L);
                }catch(Exception e){
                    fail("AI_STUDIO_EDITOR_JS_"+e.getMessage());
                }
            });
    }

    private void submit(PluginCall call) {
        if(pending!=call||sessionWebView==null)return;
        submitDispatched = true;
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.submit()||{ok:false,error:'SCRIPT_LOST'})",
            raw -> {
                if(pending!=call)return;
                try{
                    JSONObject obj=parse(raw);
                    JSONObject s=obj.optJSONObject("snapshot");
                    if(s!=null)snapshotTrace("SUBMIT_SNAPSHOT",s);
                    if(!obj.optBoolean("ok")) {
                        fail("AI_STUDIO_SUBMIT: "+obj.optString("error","Cannot click Run"));return;
                    }
                    submitClicked=true;
                    trace("state","SUBMIT_CLICKED","AI Studio send button clicked (server ACK not verified)",
                        details("candidateButtons",obj.optInt("candidates",-1),
                            "buttonScore",obj.optInt("score",0)));
                    handler.postDelayed(()->pollResponse(call),POLL_MS);
                }catch(Exception e){fail("AI_STUDIO_SUBMIT_JS: "+e.getClass().getSimpleName());}
            }
        );
    }
    private void pollResponse(PluginCall call) {
        if(pending!=call||sessionWebView==null)return;
        long now=SystemClock.elapsedRealtime();
        if(now-requestStart>TIMEOUT_MS) {
            inspect("TIMEOUT_SNAPSHOT");
            String reason=!submitClicked?"SUBMIT_NOT_CONFIRMED":
                !everSawResponse?"RESPONSE_NODE_NOT_FOUND":"RESPONSE_NOT_COMPLETED";
            fail("AI_STUDIO_TIMEOUT_"+reason+": xem bộ lọc AI Studio trong Bảng điều khiển hệ thống.");
            return;
        }
        AiStudioWebViewPolicy.evaluate(sessionWebView,
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.read()||{error:'SCRIPT_LOST'})",
            raw -> {
                if(pending!=call)return;
                polls++;
                try{
                    JSONObject obj=parse(raw);
                    if(obj.has("error")) {
                        trace("warn","POLL_SCRIPT_ERROR","Page script unavailable",
                            details("error",obj.optString("error")));
                        handler.postDelayed(()->pollResponse(call),POLL_MS);
                        return;
                    }
                    responseNodes=Math.max(responseNodes,obj.optInt("responseNodes",0));
                    boolean busy=obj.optBoolean("busy",false);
                    everSawBusy|=busy;
                    // A brief pause between tokens is not a completed answer.
                    // The old 5s stable-text fallback completed while busy=true.
                    if(busy){
                        observedIdleSince=0L;
                        consecutiveIdlePolls=0;
                    }else{
                        if(observedIdleSince==0L)observedIdleSince=SystemClock.elapsedRealtime();
                        consecutiveIdlePolls++;
                    }
                    String thought=obj.optString("thinkingSummary","");
                    boolean thoughtChanged=!thought.equals(latestThinkingSummary);
                    if(thoughtChanged)latestThinkingSummary=thought;
                    String response=obj.optString("text","");
                    if(!response.isBlank()&&!response.equals(baseline)){
                        everSawResponse=true;
                        if(!response.equals(latest)){
                            latest=response;lastChanged=SystemClock.elapsedRealtime();
                            trace("state","RESPONSE_PROGRESS","AI Studio response text changed",
                                details("responseChars",latest.length(),"responseNodes",
                                    obj.optInt("responseNodes",0),"busy",busy,"poll",polls));
                            emitSnapshot(latest);
                        }
                        long stable=SystemClock.elapsedRealtime()-lastChanged;
                        long confirmedIdle=observedIdleSince==0L?0L:
                            SystemClock.elapsedRealtime()-observedIdleSince;
                        // Never finalize while the UI reports generating. For
                        // sites with a Stop control, require the Stop state to
                        // vanish continuously for 7+ seconds and the output to
                        // stop changing. This defeats one-frame idle flickers.
                        // If no busy indicator was ever detected, require a
                        // conservative 15s idle+stable fallback.
                        boolean terminal = AiStudioCompletionPolicy.isTerminal(busy, everSawBusy,
                            confirmedIdle, stable, consecutiveIdlePolls);
                        if(terminal) {
                            PluginCall done=pending;
                            pending=null;
                            clearWatchdog();
                            stopBackgroundGeneration(true);
                            trace("script-success","RESPONSE_COMPLETE","Received completed AI Studio text",
                                details("responseChars",latest.length(),"polls",polls,
                                    "idleMs",confirmedIdle,"stableMs",stable,
                                    "seenBusy",everSawBusy,"idlePolls",consecutiveIdlePolls,
                                    "elapsedMs",SystemClock.elapsedRealtime()-requestStart));
                            JSObject result=new JSObject();
                            result.put("text",latest);
                            result.put("appliedThinking",confirmedThinkingLevel);
                            trace("state","GENERATION_COMPLETED","AI Studio generation finished",
                                details("requestedThinking",pendingThinkingLevel,
                                    "appliedThinking",confirmedThinkingLevel,
                                    "responseChars",latest.length()));
                            if(!latestThinkingSummary.isEmpty())result.put("reasoning",latestThinkingSummary);
                            done.resolve(result);
                            return;
                        }
                    }
                    if(thoughtChanged && !latest.isEmpty())emitSnapshot(latest);
                    long t=SystemClock.elapsedRealtime();
                    if(t-lastCheckpoint>=5000L){
                        lastCheckpoint=t;
                        snapshotTrace("POLL_HEARTBEAT",obj);
                        trace("state","WAITING","Waiting for AI Studio response",
                            details("elapsedMs",t-requestStart,"polls",polls,
                                "maxResponseNodes",responseNodes,"seenResponse",everSawResponse,
                                "seenBusy",everSawBusy,"busy",busy,
                                "stopVisible",obj.optBoolean("stopVisible",false),
                                "loadingIndicators",obj.optInt("loadingIndicators",0),
                                "idleMs",observedIdleSince==0L?0L:t-observedIdleSince));
                    }
                } catch(Exception e){
                    trace("warn","POLL_PARSE_ERROR","Cannot parse AI Studio page state",
                        details("exception",e.getClass().getSimpleName()));
                }
                handler.postDelayed(()->pollResponse(call),POLL_MS);
            }
        );
    }
    private void emitSnapshot(String text){
        // AI Studio updates already-rendered Markdown as it streams. Treat
        // each observation as a replaceable snapshot instead of assuming that
        // each new observation extends the previous one byte-for-byte.
        if(text.equals(lastStreamSnapshot)&&latestThinkingSummary.equals(lastStreamedThinkingSummary))return;
        boolean revision=!text.startsWith(lastStreamSnapshot);
        if(revision && !lastStreamSnapshot.isEmpty()){
            trace("state","STREAM_REVISION","AI Studio revised previously rendered text; replacing preview",
                details("previousChars",lastStreamSnapshot.length(),"newChars",text.length()));
        }
        lastStreamSnapshot=text;
        lastStreamedThinkingSummary=latestThinkingSummary;
        JSObject event=new JSObject();
        event.put("requestId",requestId);
        event.put("text",text);
        event.put("replace",true);
        event.put("reasoning",latestThinkingSummary);
        event.put("replaceReasoning",true);
        event.put("totalChars",text.length());
        notifyListeners("textProgress",event);
    }
    @PluginMethod
    public void cancel(PluginCall call){
        onUi(call, () -> {
            String target = call.getString("requestId", "");
            if (target != null && !target.isEmpty()) {
                if (!NativeRequestLedger.valid(target)) { call.reject("AI_STUDIO_INVALID_REQUEST_ID"); return; }
                cancelledRequests.cancel(target);
            }
            if (pending == null || (target != null && !target.isEmpty() && !requestId.equals(target))) {call.resolve(); return;}
            cancelledRequests.cancel(requestId);
            // Reject the generation immediately, but reserve the old WebView
            // until the best-effort Stop click completes or times out. No new
            // generation can start on this document during cleanup.
            cancellationCall = call;
            fail("AI_STUDIO_CANCELLED");
            final WebView view = sessionWebView;
            if (view == null) { finishCancellation(call, false); return; }
            cancellationHandler.postDelayed(() -> finishCancellation(call, false), 1500L);
            AiStudioWebViewPolicy.evaluate(view,
                "JSON.stringify(window.__STS_AI_TEXT_V2__?.stopGeneration()||{ok:false})", raw -> {
                    if (cancellationCall != call) return;
                    boolean clicked = false;
                    try { clicked = parse(raw).optBoolean("ok", false); } catch (Exception ignored) {}
                    finishCancellation(call, clicked);
                });
        });
    }
    private void finishCancellation(PluginCall call, boolean clicked) {
        if (cancellationCall != call) return;
        cancellationCall = null;
        cancellationHandler.removeCallbacksAndMessages(null);
        // A queued submit/evaluate callback must not survive into the next
        // request. Cookies are retained by Android's CookieManager.
        releaseWebView();
        JSObject result = new JSObject(); result.put("stopClicked", clicked);
        call.resolve(result);
    }
    private JSONObject parse(String raw)throws Exception{
        Object first=new JSONTokener(raw==null?"null":raw).nextValue();
        return new JSONObject(first instanceof String?(String)first:String.valueOf(first));
    }
    private void fail(String message){
        PluginCall p=pending;
        pending=null;
        clearWatchdog();
        stopBackgroundGeneration(false);
        trace("error","REQUEST_FAILED",message,details(
            "requestedThinking",pendingThinkingLevel,"appliedThinking",confirmedThinkingLevel,
            "elapsedMs",SystemClock.elapsedRealtime()-requestStart,
            "polls",polls,"maxResponseNodes",responseNodes,
            "seenResponse",everSawResponse,"seenBusy",everSawBusy,
            "clicked",submitClicked,"responseChars",latest.length()));
        if(p!=null)p.reject(message);
        if (submitDispatched && cancellationCall == null) releaseWebView();
    }
    private void armWatchdog(PluginCall call) {
        clearWatchdog();
        requestWatchdog = () -> {
            if (pending == call) fail("AI_STUDIO_TIMEOUT: Native WebView did not complete the request.");
        };
        handler.postDelayed(requestWatchdog, TIMEOUT_MS);
    }
    private void clearWatchdog() {
        if (requestWatchdog != null) handler.removeCallbacks(requestWatchdog);
        requestWatchdog = null;
    }
    private void releaseWebView() {
        WebView old = sessionWebView;
        sessionWebView = null;
        AiStudioPanel oldPanel = panel; panel = null;
        try { if (oldPanel != null) oldPanel.detach(); }
        catch (RuntimeException failure) { Log.w(LOG_TAG, "AI Studio panel cleanup failed", failure); }
        try { AiStudioWebViewPolicy.destroy(old); }
        catch (RuntimeException failure) { Log.w(LOG_TAG, "AI Studio WebView cleanup failed", failure); }
    }
    @Override protected void handleOnDestroy(){
        destroyed = true;
        if(catalogReader!=null){catalogReader.cancel();catalogReader=null;}
        if(pending!=null)fail("AI_STUDIO_SESSION_CLOSED");
        if(cancellationCall!=null)finishCancellation(cancellationCall,false);
        clearWatchdog();
        releaseWebView();
        super.handleOnDestroy();
    }
}
