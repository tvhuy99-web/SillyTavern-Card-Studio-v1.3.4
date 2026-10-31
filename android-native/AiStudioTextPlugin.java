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
    private String sentPrefix = "";
    private long requestStart;
    private long lastChanged;
    private long lastCheckpoint;
    private int polls;
    private int responseNodes;
    private boolean everSawResponse;
    private boolean everSawBusy;
    private boolean submitClicked;

    // Probe the UI without reading credentials. The JS returns model text
    // only to the plugin method. Log records always contain metadata only.
    private static final String INSTALL_JS = """
        (function() {
          if (window.__STS_AI_TEXT_V2__?.version === 2) return "ready";
          const S = {
            version: 2, submitted: false, clicked: false, lastSubmitAt: 0,
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
            responses(els) {
              return els.filter(e=>e.matches?.(
                "markdown-renderer,.markdown,[data-role='model'],[data-message-role='model'],"+
                "[data-testid*='response'],[data-testid*='model-output'],.model-response,"+
                ".model-output,[class*='model-response'],[class*='modelResponse'],"+
                "[class*='response-content'],.response-container"
              ));
            },
            output(snapshot) {
              const nodes=this.responses(snapshot.elements);
              const arr=nodes.map(e=>String(e.innerText||e.textContent||"").trim()).filter(Boolean);
              return {text:arr.length?arr[arr.length-1]:"", count:nodes.length};
            },
            snapshot() {
              const a=this.walk(), ed=this.editors(a.elements), btn=this.buttons(a.elements), out=this.output(a);
              const stop=btn.some(e=>this.visible(e)&&!e.disabled&&/(stop generating|stop response|stop|cancel)/i.test(this.info(e)));
              const login=/(accounts.google.com|signin|login)/i.test(location.hostname+location.pathname);
              return {
                path:location.pathname.slice(0,150), ready:document.readyState,
                editors:ed.length, visibleEditors:ed.filter(e=>this.visible(e)).length,
                buttons:btn.length, responseNodes:out.count, outputChars:out.text.length,
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
              const snap=this.snapshot(), a=this.walk(), output=this.output(a);
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
            "shadows", o.optInt("shadows", -1), "frames", o.optInt("frames", -1),
            "scanned", o.optInt("scanned", -1), "busy", o.optBoolean("busy", false),
            "authGate", o.optBoolean("authGate", false),
            "clicked", o.optBoolean("clicked", false),
            "elapsedClickMs", o.optLong("elapsedSinceClickMs", -1L)
        ));
    }

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
                    sessionWebView.setWebViewClient(new WebViewClient() {
                        @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                            trace("state","PAGE_STARTED","AI Studio page navigation",
                                details("hostPath",safePath(url)));
                        }
                        @Override public void onPageFinished(WebView view, String url) {
                            trace("state","PAGE_FINISHED","AI Studio page loaded",
                                details("hostPath",safePath(url)));
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
                showWindow();
                JSObject result = new JSObject();
                result.put("opened", true);
                call.resolve(result);
            } catch (Exception e) {
                trace("error","OPEN_ERROR","Cannot initialize AI Studio WebView",details(
                    "exception",e.getClass().getSimpleName()));
                call.reject("AI_STUDIO_OPEN_FAILED: "+e.getMessage());
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

    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt=call.getString("prompt", "");
        if(prompt==null || prompt.isBlank()) {
            call.reject("AI_STUDIO_PROMPT_EMPTY");return;
        }
        getActivity().runOnUiThread(() -> {
            if(pending!=null) {call.reject("AI_STUDIO_BUSY");return;}
            if(sessionWebView==null) {
                trace("error","SESSION_MISSING","Open Google / AI Studio from Settings first",null);
                call.reject("AI_STUDIO_NOT_OPEN");return;
            }
            Uri current=Uri.parse(sessionWebView.getUrl()==null?"":sessionWebView.getUrl());
            if(!"aistudio.google.com".equalsIgnoreCase(current.getHost())) {
                trace("error","LOGIN_OR_HOST","AI Studio session not at expected host",
                    details("hostPath",safePath(sessionWebView.getUrl())));
                call.reject("AI_STUDIO_AUTH_OR_HOST: Check Google login in the AI Studio window.");
                return;
            }
            requestId=call.getString("requestId", "chat");
            requestId=requestId.replaceAll("[^a-zA-Z0-9_-]","").substring(0,
                Math.min(35,requestId.replaceAll("[^a-zA-Z0-9_-]","").length()));
            pending=call;
            baseline="";latest="";sentPrefix="";polls=0;responseNodes=0;
            everSawResponse=false;everSawBusy=false;submitClicked=false;
            requestStart=SystemClock.elapsedRealtime();lastChanged=requestStart;
            lastCheckpoint=requestStart;
            trace("state","REQUEST_START","Sending text through authenticated AI Studio UI",
                details("promptChars",prompt.length(),"modelSetInAiStudio",true,
                    "hasWebViewParent",sessionWebView.getParent()!=null));
            sessionWebView.onResume();sessionWebView.resumeTimers();
            sessionWebView.evaluateJavascript(INSTALL_JS, ready -> {
                if(pending!=call)return;
                trace("state","JS_BOOTSTRAP","Installed text-only UI observer",null);
                String js="JSON.stringify(window.__STS_AI_TEXT_V2__.prepare("+JSONObject.quote(prompt)+"))";
                sessionWebView.evaluateJavascript(js, raw -> {
                    if(pending!=call)return;
                    try {
                        JSONObject obj=parse(raw);
                        JSONObject snapshot=obj.optJSONObject("snapshot");
                        if(snapshot!=null)snapshotTrace("EDITOR_SNAPSHOT",snapshot);
                        if(!obj.optBoolean("ok")) {
                            fail("AI_STUDIO_EDITOR: "+obj.optString("error","Cannot enter prompt"));return;
                        }
                        baseline=obj.optString("before","");
                        trace("state","EDITOR_FILLED","Text entered (text content not logged)",
                            details("editorTag",obj.optString("editorTag","unknown"),"promptChars",prompt.length(),
                                "baselineChars",baseline.length()));
                        handler.postDelayed(() -> submit(call),400L);
                    }catch(Exception e){
                        fail("AI_STUDIO_EDITOR_JS: "+e.getClass().getSimpleName());
                    }
                });
            });
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
                            emitDelta(latest);
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
    private void emitDelta(String text){
        if(!text.startsWith(sentPrefix)){
            trace("warn","STREAM_NON_PREFIX","UI changed already observed output; skipping duplicate chunks",
                details("oldChars",sentPrefix.length(),"newChars",text.length()));
            return;
        }
        String delta=text.substring(sentPrefix.length());
        if(delta.isEmpty())return;
        sentPrefix=text;
        JSObject chunk=new JSObject();
        chunk.put("requestId",requestId);
        chunk.put("text",delta);
        chunk.put("totalChars",sentPrefix.length());
        notifyListeners("textProgress",chunk);
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
