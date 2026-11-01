package com.tvhuy99.cardstudio;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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
    private static final long TIMEOUT_MS = 120_000L;
    private static final long POLL_MS = 600L;
    private static final String LOG_TAG = "CardStudioAIStudio";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView sessionWebView;
    private AlertDialog sessionDialog;
    private PluginCall pending;
    private String requestId = "";
    private String baseline = "";
    private String latest = "";
    private String lastStreamSnapshot = "";
    private boolean freshChatLoaded = false;
    private int freshChatAttempt = 0;
    private long requestStart;
    private long lastChanged;
    private long lastCheckpoint;
    private int polls;
    private int responseNodes;
    private boolean everSawResponse;
    private boolean everSawBusy;
    private boolean submitClicked;
    private int bootstrapFailures;

    // Probe the UI without reading credentials. The JS returns model text
    // only to the plugin method. Log records always contain metadata only.
    private static final String INSTALL_JS = """
        (function() {
          if (window.__STS_AI_TEXT_V2__?.version === 3) return "ready";
          const S = {
            version: 3, submitted: false, clicked: false, lastSubmitAt: 0,
            walk() {
              const out=[], todo=[document.documentElement], seen=new Set();
              let shadows=0, frames=0;
              while (todo.length && out.length < 3500) {
                const root=todo.shift();
                if (!root || seen.has(root)) continue;
                seen.add(root);
                if (root.nodeType===1) out.push(root);
                if (root.shadowRoot) {shadows++;todo.push(root.shadowRoot);}
                if (root.tagName==="IFRAME") {
                  try {if(root.contentDocument?.documentElement) {frames++;todo.push(root.contentDocument.documentElement);}} catch(e) {}
                }
                if (root.children) for(const ch of root.children) todo.push(ch);
              }
              return {elements:out, shadows, frames};
            },
            info(e) {
              return [
                e.getAttribute?.("aria-label")||"",
                e.getAttribute?.("title")||"",
                e.getAttribute?.("data-testid")||"",
                e.getAttribute?.("data-tooltip")||"",
                e.getAttribute?.("name")||"",
                e.querySelector?.("mat-icon")?.textContent||"",
                e.querySelector?.("[class*='icon']")?.textContent||"",
                (e.textContent||"").slice(0,55)
              ].join(" ").toLowerCase();
            },
            visible(e) {
              try {const r=e.getBoundingClientRect();return r.width>0&&r.height>0;} catch(e) {return false;}
            },
            editors(els) {
              return els.filter(e=>e.matches?.("textarea,input[type='text'],[contenteditable='true'],[role='textbox'],.ProseMirror,[data-placeholder]"));
            },
            buttons(els) {
              return els.filter(e=>e.matches?.("button,[role='button'],input[type='submit']"));
            },
            // Extract directly from AI Studio model turns, independently of
            // walk()'s 3500-element limit. AI Studio uses Angular components
            // ms-chat-turn / ms-cmark-node for assistant replies.
            output(_ignored) {
              const roots=[document], visited=new Set();
              let seenFrames=0, seenShadows=0, crossOriginFrames=0;
              for(let pos=0;pos<roots.length && pos<60;pos++){
                const root=roots[pos];
                if(!root||visited.has(root))continue;
                visited.add(root);
                try {
                  for(const frame of root.querySelectorAll('iframe')) {
                    try {
                      if(frame.contentDocument) {roots.push(frame.contentDocument);seenFrames++;}
                      else crossOriginFrames++;
                    }catch(e){crossOriginFrames++;}
                  }
                  // Open shadow roots only; never evade closed-root boundaries.
                  const hosts=root.querySelectorAll('*');
                  let limit=0;
                  for(const host of hosts){
                    if(host.shadowRoot){seenShadows++;roots.push(host.shadowRoot);}
                    if(++limit>=18000)break;
                  }
                }catch(e){}
              }
              const unique=roots.filter(r=>r && visited.has(r));
              const selectors=[
                'ms-chat-turn .chat-turn-container.model',
                'ms-chat-turn .chat-turn-container[class*="model"]',
                '.chat-turn-container.model',
                'ms-chat-turn .model-response',
                '[data-role="model"]',
                '[data-message-role="model"]',
                '[data-testid*="model-output"]',
                '[data-testid*="response"]'
              ];
              let modelTurns=0, cmarkNodes=0, rawNodes=0, fallbackNodes=0;
              let answer='', method='none', count=0;
              for(const root of unique){
                try{
                  modelTurns+=root.querySelectorAll('ms-chat-turn').length;
                  cmarkNodes+=root.querySelectorAll('ms-cmark-node').length;
                  rawNodes+=root.querySelectorAll('.chat-turn-container.model').length;
                  for(const selector of selectors){
                    const containers=Array.from(root.querySelectorAll(selector));
                    if(!containers.length)continue;
                    count+=containers.length;
                    const container=containers[containers.length-1];
                    const textNodes=container.querySelectorAll(
                      'ms-cmark-node.cmark-node,ms-cmark-node,[class*="cmark-node"],'+
                      'markdown-renderer,.markdown,.response-content'
                    );
                    const output=Array.from(textNodes)
                      .filter(e=>!e.parentElement?.closest('ms-cmark-node'))
                      .map(e=>String(e.innerText||e.textContent||'').trim()).filter(Boolean);
                    const value=(output.length?output.join('\\n'):String(container.innerText||container.textContent||'')).trim();
                    if(value && !answer){
                      answer=value;method=selector;
                    }
                  }
                  if(!answer){
                    // Some AI Studio versions render cmark nodes without the
                    // .model container class. Only accept model-associated turns.
                    const globalCmark=root.querySelectorAll('ms-cmark-node');
                    for(const node of globalCmark){
                      const turn=node.closest('ms-chat-turn');
                      if(!turn)continue;
                      const cls=String(turn.className||'')+' '+String(turn.querySelector('.chat-turn-container')?.className||'');
                      if(!/model/i.test(cls))continue;
                      const value=String(node.innerText||node.textContent||'').trim();
                      if(value){answer=value;method='ms-cmark-node/model-turn';fallbackNodes++;}
                    }
                  }
                }catch(e){}
              }
              return {text:answer,count:Math.max(count,fallbackNodes),
                method,modelTurns,cmarkNodes,rawNodes,
                shadowRoots:seenShadows,iframeRoots:seenFrames,crossOriginFrames};
            },
            snapshot(prefetched) {
              const a=this.walk(), ed=this.editors(a.elements), btn=this.buttons(a.elements), out=prefetched||this.output();
              const stop=btn.some(e=>this.visible(e)&&!e.disabled&&/(stop generating|stop response|stop|cancel)/i.test(this.info(e)));
              const login=/(accounts.google.com|signin|login)/i.test(location.hostname+location.pathname);
              return {
                path:location.pathname.slice(0,150), ready:document.readyState,
                editors:ed.length, visibleEditors:ed.filter(e=>this.visible(e)).length,
                buttons:btn.length, responseNodes:out.count, outputChars:out.text.length,
                modelTurns:out.modelTurns, cmarkNodes:out.cmarkNodes,
                rawModelNodes:out.rawNodes, responseMethod:out.method,
                responseIframes:out.iframeRoots, responseShadows:out.shadowRoots,
                inaccessibleFrames:out.crossOriginFrames,
                shadows:a.shadows, frames:a.frames, scanned:a.elements.length,
                busy:stop, authGate:login, clicked:this.clicked,
                elapsedSinceClickMs:this.lastSubmitAt?Date.now()-this.lastSubmitAt:-1
              };
            },
            prepare(text) {
              const a=this.walk();
              const ed=this.editors(a.elements).filter(e=>this.visible(e)&&!e.disabled);
              const ranked=ed.map(e=>{
                const name=this.info(e);
                const score=/(prompt|message|type|chat|enter|nhập)/i.test(name)?12:0;
                return {e,score:score+(e.tagName==="TEXTAREA"?6:0)+(e.isContentEditable?4:0)};
              }).sort((x,y)=>y.score-x.score);
              if(!ranked.length)return {ok:false,error:"EDITOR_NOT_FOUND",snapshot:this.snapshot()};
              const el=ranked[0].e;
              const previous=this.output(a).text;
              try{
                el.focus();
                if(el.tagName==="TEXTAREA"||el.tagName==="INPUT"){
                  const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
                  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
                  if(setter)setter.call(el,text);else el.value=text;
                } else {
                  if(el.isContentEditable) {el.textContent=text;}
                  else {el.setAttribute("data-unsupported-editor","true");return {ok:false,error:"EDITOR_TYPE_UNSUPPORTED",snapshot:this.snapshot()};}
                }
                el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:null}));
                el.dispatchEvent(new Event("change",{bubbles:true}));
                this.submitted=false;this.clicked=false;this.lastSubmitAt=0;
                return {ok:true,before:previous,editorTag:el.tagName,editorEditable:el.isContentEditable,snapshot:this.snapshot()};
              }catch(e){return{ok:false,error:"EDITOR_INPUT_ERROR",errorName:String(e.name||"Error"),snapshot:this.snapshot()};}
            },
            submit() {
              const a=this.walk(), all=this.buttons(a.elements).filter(e=>this.visible(e)&&!e.disabled);
              const scored=all.map(e=>{
                const s=this.info(e);
                let score=0;
                if(/(^|[^a-z])(run|send|generate|submit|gửi|chạy)([^a-z]|$)/i.test(s))score+=20;
                if(/play_arrow|arrow_upward|send|run_prompt|sparkle/i.test(s))score+=15;
                if(/chat|prompt|model/i.test(s))score+=2;
                if(/stop|cancel|share|copy|save|delete|edit|settings|history/i.test(s))score-=50;
                return {e,score};
              }).filter(x=>x.score>=15).sort((x,y)=>y.score-x.score);
              if(!scored.length)return {ok:false,error:"SEND_BUTTON_NOT_FOUND",snapshot:this.snapshot()};
              try{
                const button=scored[0].e;
                button.click();
                this.submitted=true;this.clicked=true;this.lastSubmitAt=Date.now();
                return {ok:true,score:scored[0].score,candidates:scored.length,snapshot:this.snapshot()};
              }catch(e){return {ok:false,error:"SEND_CLICK_FAILED",snapshot:this.snapshot()};}
            },
            read() {
              const output=this.output();
              const snap=this.snapshot(output);
              return {text:output.text,...snap};
            }
          };
          window.__STS_AI_TEXT_V2__=S;
          return "installed";
        })()
        """;

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
            "elapsedClickMs", o.optLong("elapsedSinceClickMs", -1L)
        ));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createSessionIfNeeded() {
        if (sessionWebView == null) {
            sessionWebView = new WebView(getActivity());
            WebSettings settings = sessionWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(sessionWebView, true);
            sessionWebView.setWebViewClient(new WebViewClient() {
                @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                    trace("state","PAGE_STARTED","AI Studio page navigation",
                        details("hostPath",safePath(url)));
                }
                @Override public void onPageFinished(WebView view, String url) {
                    trace("state","PAGE_FINISHED","AI Studio page loaded",
                        details("hostPath",safePath(url)));
                    if(pending!=null && url!=null &&
                        url.startsWith("https://aistudio.google.com/prompts/")){
                        freshChatLoaded = true;
                        trace("state","NEW_CHAT_PAGE_LOADED","New-chat page loaded; checking for old model turns",
                            details("attempt",freshChatAttempt,"hostPath",safePath(url)));
                    }
                    inspect("PAGE_UI");
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
            sessionWebView.loadUrl(URL);
        }
    }

    @PluginMethod
    public void openSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                createSessionIfNeeded();
                showWindow();
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
        if (sessionWebView.getParent() instanceof ViewGroup) {
            ((ViewGroup)sessionWebView.getParent()).removeView(sessionWebView);
        }
        FrameLayout root=getActivity().findViewById(android.R.id.content);
        if(root!=null) {
            FrameLayout.LayoutParams params=new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT,Gravity.END|Gravity.BOTTOM);
            sessionWebView.setAlpha(0.01f);
            root.addView(sessionWebView,0,params);
            sessionWebView.onResume();
            sessionWebView.resumeTimers();
            trace("state","WEBVIEW_RETAIN","AI Studio session attached to small keep-alive host",
                details("parent",true,"fullViewport",true,"behindApp",true));
        }
    }
    private void showWindow() {
        if (sessionDialog != null && sessionDialog.isShowing()) return;
        if (sessionWebView.getParent() instanceof ViewGroup)
            ((ViewGroup)sessionWebView.getParent()).removeView(sessionWebView);
        sessionWebView.setAlpha(1f);
        sessionDialog = new AlertDialog.Builder(getActivity())
            .setTitle("Google / AI Studio (tài khoản)")
            .setView(sessionWebView)
            .setPositiveButton("Quay lại Card Studio", (dialog, which) -> {})
            .create();
        sessionDialog.setOnDismissListener(dialog -> retainWebView());
        sessionDialog.show();
        if (sessionDialog.getWindow() != null)
            sessionDialog.getWindow().setLayout(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        trace("state","SESSION_VISIBLE","Showing AI Studio for Google login / model selection",
            details("hostPath",safePath(sessionWebView.getUrl())));
    }
    private void inspect(String stage) {
        if(sessionWebView==null) return;
        sessionWebView.evaluateJavascript(INSTALL_JS, raw -> {
            if(sessionWebView==null)return;
            sessionWebView.evaluateJavascript(
                "JSON.stringify(window.__STS_AI_TEXT_V2__?.snapshot()||{error:'NO_SCRIPT'})",
                value -> {
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
        if(elapsed>180_000L){
            fail("AI_STUDIO_LOGIN_OR_PAGE_TIMEOUT: Đăng nhập AI Studio và thử gửi lại.");
            return;
        }
        if(sessionDialog!=null && sessionDialog.isShowing()){
            if(attempt%8==0)trace("state","WAIT_FOR_LOGIN","Waiting for user to close AI Studio window",
                details("seconds",elapsed/1000));
            handler.postDelayed(()->waitUntilReady(call,prompt,attempt+1),1000L);
            return;
        }
        if(sessionWebView==null){fail("AI_STUDIO_SESSION_LOST");return;}
        if(!freshChatLoaded) {
            if(attempt%7==0)trace("state","NEW_CHAT_WAIT","Waiting for fresh AI Studio page to finish navigation",
                details("elapsedMs",elapsed));
            handler.postDelayed(()->waitUntilReady(call,prompt,attempt+1),750L);
            return;
        }
        sessionWebView.evaluateJavascript(
            "JSON.stringify((function(){try{var h=location.hostname;var p=location.pathname;var n=document.querySelectorAll('textarea,[contenteditable=\"true\"],[role=\"textbox\"]');var turns=document.querySelectorAll('ms-chat-turn .chat-turn-container.model,.chat-turn-container.model').length;return {ok:h==='aistudio.google.com'&&p.indexOf('/prompts/new_chat')===0&&n.length>0&&turns===0,host:h,path:p,editors:n.length,oldModelTurns:turns,ready:document.readyState};}catch(e){return {ok:false,errorName:String(e.name)}}})())",
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
                        prepareText(call,prompt);
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
                    if(attempt==12 && (sessionDialog==null || !sessionDialog.isShowing())){
                        trace("warn","OPEN_LOGIN","Showing AI Studio for login or loading problem",null);
                        showWindow();
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
    public void generate(PluginCall call) {
        final String prompt=call.getString("prompt","");
        if(prompt==null || prompt.isBlank()){
            call.reject("AI_STUDIO_PROMPT_EMPTY");return;
        }
        getActivity().runOnUiThread(() -> {
            if(pending!=null){call.reject("AI_STUDIO_BUSY");return;}
            boolean coldStart=sessionWebView==null;
            try {createSessionIfNeeded();}
            catch(Exception e){
                trace("error","AUTO_START_FAILED","Unable to open AI Studio automatically",
                    details("exception",e.getClass().getSimpleName()));
                call.reject("AI_STUDIO_AUTO_START_FAILED");return;
            }
            requestId=call.getString("requestId","chat").replaceAll("[^a-zA-Z0-9_-]","");
            if(requestId.length()>35)requestId=requestId.substring(0,35);
            pending=call;
            baseline="";latest="";lastStreamSnapshot="";polls=0;responseNodes=0;
            freshChatLoaded=false;freshChatAttempt=0;
            everSawResponse=false;everSawBusy=false;submitClicked=false;bootstrapFailures=0;
            requestStart=SystemClock.elapsedRealtime();lastChanged=requestStart;
            lastCheckpoint=requestStart;
            trace("state",coldStart?"SESSION_AUTO_START":"SESSION_REUSE",
                coldStart?"Created AI Studio WebView automatically":"Using existing AI Studio WebView",
                details("promptChars",prompt.length(),"hasWebViewParent",sessionWebView.getParent()!=null));
            sessionWebView.onResume();sessionWebView.resumeTimers();
            if(coldStart) {
                // Let the user sign in to Google's actual website and pick a
                // model. No credentials are read by this plugin.
                showWindow();
                trace("state","NEW_CHAT_INITIAL","First-use session is loading a new chat page",null);
            } else {
                // Each Card Studio model turn has its OWN AI Studio chat.
                // Never append to the previously generated Google conversation.
                trace("state","NEW_CHAT_NAVIGATE","Opening fresh AI Studio conversation for this turn",null);
                sessionWebView.loadUrl(URL);
            }
            waitUntilReady(call,prompt,0);
        });
    }

    private void prepareText(PluginCall call,String prompt) {
        if(pending!=call||sessionWebView==null)return;
        sessionWebView.evaluateJavascript(INSTALL_JS,ready->{
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
            sessionWebView.evaluateJavascript(js,raw->{
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
        sessionWebView.evaluateJavascript(guardJs(expression),raw->{
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
        sessionWebView.evaluateJavascript(
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
                    handler.postDelayed(this::pollResponse,POLL_MS);
                }catch(Exception e){fail("AI_STUDIO_SUBMIT_JS: "+e.getClass().getSimpleName());}
            }
        );
    }
    private void pollResponse() {
        if(pending==null||sessionWebView==null)return;
        long now=SystemClock.elapsedRealtime();
        if(now-requestStart>TIMEOUT_MS) {
            inspect("TIMEOUT_SNAPSHOT");
            String reason=!submitClicked?"SUBMIT_NOT_CONFIRMED":
                !everSawResponse?"RESPONSE_NODE_NOT_FOUND":"RESPONSE_NOT_COMPLETED";
            fail("AI_STUDIO_TIMEOUT_"+reason+": xem bộ lọc AI Studio trong Bảng điều khiển hệ thống.");
            return;
        }
        sessionWebView.evaluateJavascript(
            "JSON.stringify(window.__STS_AI_TEXT_V2__?.read()||{error:'SCRIPT_LOST'})",
            raw -> {
                if(pending==null)return;
                polls++;
                try{
                    JSONObject obj=parse(raw);
                    if(obj.has("error")) {
                        trace("warn","POLL_SCRIPT_ERROR","Page script unavailable",
                            details("error",obj.optString("error")));
                        handler.postDelayed(this::pollResponse,POLL_MS);
                        return;
                    }
                    responseNodes=Math.max(responseNodes,obj.optInt("responseNodes",0));
                    boolean busy=obj.optBoolean("busy",false);
                    everSawBusy|=busy;
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
                        // Prefer a completed Run/Stop state; 5s fallback for
                        // interfaces without a recognizable Stop control.
                        if(stable>(everSawBusy&&!busy?1700L:5000L)) {
                            PluginCall done=pending;
                            pending=null;
                            trace("script-success","RESPONSE_COMPLETE","Received completed AI Studio text",
                                details("responseChars",latest.length(),"polls",polls,
                                    "elapsedMs",SystemClock.elapsedRealtime()-requestStart));
                            JSObject result=new JSObject();
                            result.put("text",latest);
                            done.resolve(result);
                            return;
                        }
                    }
                    long t=SystemClock.elapsedRealtime();
                    if(t-lastCheckpoint>=5000L){
                        lastCheckpoint=t;
                        snapshotTrace("POLL_HEARTBEAT",obj);
                        trace("state","WAITING","Waiting for AI Studio response",
                            details("elapsedMs",t-requestStart,"polls",polls,
                                "maxResponseNodes",responseNodes,"seenResponse",everSawResponse,
                                "seenBusy",everSawBusy));
                    }
                } catch(Exception e){
                    trace("warn","POLL_PARSE_ERROR","Cannot parse AI Studio page state",
                        details("exception",e.getClass().getSimpleName()));
                }
                handler.postDelayed(this::pollResponse,POLL_MS);
            }
        );
    }
    private void emitSnapshot(String text){
        // AI Studio updates already-rendered Markdown as it streams. Treat
        // each observation as a replaceable snapshot instead of assuming that
        // each new observation extends the previous one byte-for-byte.
        if(text.equals(lastStreamSnapshot))return;
        boolean revision=!text.startsWith(lastStreamSnapshot);
        if(revision && !lastStreamSnapshot.isEmpty()){
            trace("state","STREAM_REVISION","AI Studio revised previously rendered text; replacing preview",
                details("previousChars",lastStreamSnapshot.length(),"newChars",text.length()));
        }
        lastStreamSnapshot=text;
        JSObject event=new JSObject();
        event.put("requestId",requestId);
        event.put("text",text);
        event.put("replace",true);
        event.put("totalChars",text.length());
        notifyListeners("textProgress",event);
    }
    @PluginMethod
    public void cancel(PluginCall call){
        getActivity().runOnUiThread(() -> {
            if(pending!=null)fail("AI_STUDIO_CANCELLED");
            call.resolve();
        });
    }
    private JSONObject parse(String raw)throws Exception{
        Object first=new JSONTokener(raw==null?"null":raw).nextValue();
        return new JSONObject(first instanceof String?(String)first:String.valueOf(first));
    }
    private void fail(String message){
        PluginCall p=pending;
        pending=null;
        trace("error","REQUEST_FAILED",message,details(
            "elapsedMs",SystemClock.elapsedRealtime()-requestStart,
            "polls",polls,"maxResponseNodes",responseNodes,
            "seenResponse",everSawResponse,"seenBusy",everSawBusy,
            "clicked",submitClicked,"responseChars",latest.length()));
        if(p!=null)p.reject(message);
    }
    @Override
    protected void handleOnDestroy(){
        if(pending!=null)fail("AI_STUDIO_SESSION_CLOSED");
        if(sessionDialog!=null){sessionDialog.setOnDismissListener(null);sessionDialog.dismiss();}
        if(sessionWebView!=null){
            if(sessionWebView.getParent() instanceof ViewGroup)
                ((ViewGroup)sessionWebView.getParent()).removeView(sessionWebView);
            sessionWebView.destroy();
        }
        sessionWebView=null;
        super.handleOnDestroy();
    }
}
