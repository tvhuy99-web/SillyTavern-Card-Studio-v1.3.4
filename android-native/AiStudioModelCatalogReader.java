package com.tvhuy99.cardstudio;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.net.Uri;
import android.widget.FrameLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.LinkedHashMap;
import java.util.Collections;

/**
 * Discover Google AI Studio models using the signed-in first-party WebView.
 * Adapted from GeminiLiveTranslate's document-start + DOM + network-response
 * catalog discovery. Never reads/exposes credentials or model response text.
 */
final class AiStudioModelCatalogReader {
    private static final String ORIGIN = "https://aistudio.google.com";
    private static final String PAGE = ORIGIN + "/u/0/prompts/new_chat";
    private static final long TIMEOUT_MS = 18_000L;
    private static final int MAX_ATTEMPTS = 10;
    private final Activity activity;
    private final Handler handler;
    private final PluginCall call;
    private final LinkedHashMap<String, JSONObject> found = new LinkedHashMap<>();
    private WebView view;
    private FrameLayout host;
    private boolean done;
    private boolean pickerOpened;
    private boolean pageLoaded;
    private int scans;
    private String lastPath = "not-loaded";
    private String lastReadiness = "unknown";
    private int domCandidates;
    private int networkHits;
    private String lastScriptError = "";
    private String mainFrameProblem = "";

    interface DiagnosticSink {
        void emit(String level, String stage, String message, JSObject details);
    }
    private final DiagnosticSink sink;

    private void report(String level,String stage,String message,Object... fields) {
        JSObject details=new JSObject();
        for(int i=0;i+1<fields.length;i+=2)details.put(String.valueOf(fields[i]),fields[i+1]);
        if(sink!=null)sink.emit(level,stage,message,details);
    }
    private static String safePath(String raw) {
        try {
            Uri uri=Uri.parse(raw);
            return (uri.getHost()==null?"unknown":uri.getHost())+
                (uri.getPath()==null?"":uri.getPath().substring(0,Math.min(90,uri.getPath().length())));
        } catch(Exception ignored) {return "invalid-url";}
    }

    private static final String DOCUMENT_START = """
        (function(){
          if(window.__STS_MODEL_CATALOG_V2__)return;
          const catalog=new Map();
          const stats={networkHits:0,domCandidates:0,scans:0,lastNetworkSource:'none'};
          const valid=/^gemini-[a-z0-9][a-z0-9._-]{2,110}$/i;
          function remember(raw,source){
            const id=String(raw||'').trim().replace(/^models[/]/i,'');
            if(!valid.test(id)||catalog.size>=200)return;
            if(!catalog.has(id))catalog.set(id,{id:id,name:id,source:source});
          }
          function observe(raw,source){
            const text=String(raw||'').slice(0,350000);
            const ids=text.match(/gemini-[a-z0-9][a-z0-9._-]{2,110}/ig)||[];
            if(ids.length&&source!=='dom'){
              stats.networkHits+=1;
              stats.lastNetworkSource=source;
            }
            for(const id of ids.slice(0,300))remember(id,source);
          }
          function scanDom(){
            const roots=[document],visited=new Set();
            for(let i=0;i<roots.length&&i<80;i++){
              const root=roots[i];if(!root||visited.has(root))continue;
              visited.add(root);
              let nodes=[];
              try{nodes=root.querySelectorAll('mat-option,[role="option"],[role="menuitem"],mat-select,[role="combobox"],button,[data-value],[data-model-id],[title],[aria-label]');}catch(e){}
              stats.domCandidates+=Math.min(nodes.length,2300);
              for(let j=0;j<nodes.length&&j<2300;j++){
                const el=nodes[j];
                const raw=[el.getAttribute('data-model-id')||'',el.getAttribute('value')||'',
                  el.getAttribute('data-value')||'',el.getAttribute('title')||'',
                  el.getAttribute('aria-label')||'',(el.textContent||'').slice(0,300)].join(' ');
                observe(raw,'dom');
              }
              try{for(const el of root.querySelectorAll('*'))if(el.shadowRoot&&!visited.has(el.shadowRoot))roots.push(el.shadowRoot);}catch(e){}
            }
          }
          function openPicker(){
            const nodes=document.querySelectorAll('mat-select,[role="combobox"],button,[role="button"]');
            let best=null,score=-1;
            for(let i=0;i<nodes.length&&i<1800;i++){
              const e=nodes[i];
              if(!e.getClientRects().length)continue;
              const s=[e.getAttribute('aria-label')||'',e.getAttribute('title')||'',
                e.getAttribute('data-testid')||'',(e.textContent||'').slice(0,100)].join(' ').toLowerCase();
              if(/thinking|reasoning/i.test(s))continue;
              let n=0;
              if(s.indexOf('gemini-')>=0)n+=900;
              if(/model|mô hình/i.test(s))n+=600;
              if(e.tagName==='MAT-SELECT')n+=500;
              if(e.getAttribute('role')==='combobox')n+=400;
              if(n>score){best=e;score=n;}
            }
            if(best&&score>=400){best.click();return {opened:true,score:score};}
            return {opened:false};
          }
          const oldFetch=window.fetch;
          if(typeof oldFetch==='function'){
            window.fetch=function(){
              const request=arguments[0],args=arguments;
              const response=oldFetch.apply(this,args);
              Promise.resolve(response).then(function(r){
                try{
                  const url=typeof request==='string'?request:(request&&request.url)||'';
                  // AI Studio loads model catalogs through Google-owned cross-origin
                  // services too. The reference app observes those responses.
                  // Only model IDs are retained, never the response bodies.
                  const mime=r.headers&&r.headers.get('content-type')||'';
                  if(!/image|audio|video|font/.test(mime))r.clone().text().then(x=>observe(x,'fetch-response')).catch(()=>{});
                }catch(e){}
              },()=>{});
              return response;
            };
          }
          const XHR=window.XMLHttpRequest;
          if(XHR&&XHR.prototype){
            const oldOpen=XHR.prototype.open,oldSend=XHR.prototype.send;
            XHR.prototype.open=function(method,url){this.__stsCatalogUrl=String(url||'');return oldOpen.apply(this,arguments);};
            XHR.prototype.send=function(){
              const xhr=this;
              try{xhr.addEventListener('loadend',function(){
                try{
                  if((!xhr.responseType||xhr.responseType==='text')&&xhr.responseText)observe(xhr.responseText,'xhr-response');
                }catch(e){}
              });}catch(e){}
              return oldSend.apply(this,arguments);
            };
          }
          window.__STS_MODEL_CATALOG_V2__={
            discover:function(){
              stats.scans++;scanDom();
              return {models:Array.from(catalog.values()).sort((a,b)=>a.id.localeCompare(b.id)),
                stats:stats,host:location.hostname,path:location.pathname,
                ready:document.readyState,
                loginHint:/(?:sign\\s*in|log\\s*in|đăng\\s*nhập)/i.test((document.body&&document.body.innerText||'').slice(0,5000))};
            },
            openPicker:openPicker
          };
        })();
        """;

    AiStudioModelCatalogReader(Activity activity, Handler handler, PluginCall call, DiagnosticSink sink) {
        this.activity = activity;
        this.handler = handler;
        this.call = call;
        this.sink = sink;
    }

    @SuppressLint("SetJavaScriptEnabled")
    void start() {
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            report("error","MODEL_WEBVIEW_UNSUPPORTED","WebView lacks document-start JavaScript");
            call.reject("AI_STUDIO_MODEL_DISCOVERY_UNSUPPORTED: Android System WebView không hỗ trợ DOCUMENT_START_SCRIPT. Hãy cập nhật Android System WebView.");
            return;
        }
        report("state","MODEL_LOAD_STARTED","Starting AI Studio browser model discovery",
            "target",safePath(PAGE),"timeoutMs",TIMEOUT_MS,"hasCookies",CookieManager.getInstance().hasCookies());
        try {
            ViewGroup root = activity.findViewById(android.R.id.content);
            if(root==null)throw new IllegalStateException("No activity root");
            view = new WebView(activity);
            WebSettings settings=view.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setLoadsImagesAutomatically(false);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(view,true);
            WebViewCompat.addDocumentStartJavaScript(view,DOCUMENT_START,Collections.singleton(ORIGIN));
            int height=Math.max(800,activity.getResources().getDisplayMetrics().heightPixels);
            host=new FrameLayout(activity);
            host.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
            host.setFocusable(false);
            host.addView(view,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,height,Gravity.BOTTOM));
            root.addView(host,new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,height));
            host.setTranslationY(height*2f);
            view.setWebViewClient(new WebViewClient(){
                @Override public void onPageStarted(WebView page,String url,Bitmap icon){
                    lastPath=safePath(url);
                    report("state","MODEL_PAGE_STARTED","AI Studio catalog navigation started","hostPath",lastPath);
                }
                @Override public void onPageFinished(WebView page,String url){
                    if(done)return;
                    lastPath=safePath(url);
                    report("state","MODEL_PAGE_FINISHED","AI Studio catalog navigation finished","hostPath",lastPath);
                    if(pageLoaded||url==null||!url.startsWith(ORIGIN))return;
                    pageLoaded=true;
                    handler.postDelayed(()->scan(0),700L);
                }
                @Override public void onReceivedError(WebView page,WebResourceRequest request,WebResourceError error){
                    if(!request.isForMainFrame())return;
                    mainFrameProblem="network:"+error.getErrorCode();
                    report("error","MODEL_PAGE_NETWORK_ERROR","AI Studio main-frame network error",
                        "errorCode",error.getErrorCode(),"hostPath",safePath(request.getUrl().toString()));
                }
                @Override public void onReceivedHttpError(WebView page,WebResourceRequest request,WebResourceResponse response){
                    if(!request.isForMainFrame())return;
                    mainFrameProblem="http:"+response.getStatusCode();
                    report("warn","MODEL_PAGE_HTTP_ERROR","AI Studio main-frame HTTP error",
                        "status",response.getStatusCode(),"hostPath",safePath(request.getUrl().toString()));
                }
                @Override public void onReceivedSslError(WebView page,SslErrorHandler handler,SslError error){
                    handler.cancel();
                    mainFrameProblem="ssl:"+error.getPrimaryError();
                    report("error","MODEL_PAGE_SSL_ERROR","AI Studio SSL error; navigation blocked",
                        "sslCode",error.getPrimaryError());
                }
            });
            view.loadUrl(PAGE);
            handler.postDelayed(()->{if(!done)finish("timeout");},TIMEOUT_MS);
            handler.postDelayed(()->{if(!done&&!pageLoaded)scan(0);},3500L);
        }catch(Exception e){
            done=true;
            cleanup();
            report("error","MODEL_LOAD_EXCEPTION","Catalog initialization failed","exception",e.getClass().getSimpleName());
            call.reject("AI_STUDIO_MODEL_DISCOVERY_FAILED: "+e.getClass().getSimpleName());
        }
    }

    private void scan(int attempt) {
        if(done||view==null)return;
        scans=attempt+1;
        view.evaluateJavascript("JSON.stringify(window.__STS_MODEL_CATALOG_V2__?.discover()||{models:[],error:'document-start-not-injected',host:location.hostname,ready:document.readyState})",raw->{
            if(done)return;
            try{
                Object value=new JSONTokener(raw==null?"null":raw).nextValue();
                JSONObject data=new JSONObject(value instanceof String?(String)value:String.valueOf(value));
                lastScriptError=data.optString("error","");
                lastReadiness=data.optString("ready","unknown");
                lastPath=safePath("https://"+data.optString("host","aistudio.google.com")+data.optString("path","/"));
                JSONObject stats=data.optJSONObject("stats");
                if(stats!=null){
                    domCandidates=stats.optInt("domCandidates",domCandidates);
                    networkHits=stats.optInt("networkHits",networkHits);
                }
                JSONArray models=data.optJSONArray("models");
                if(models!=null)for(int i=0;i<models.length();i++){
                    JSONObject item=models.optJSONObject(i);if(item==null)continue;
                    String id=item.optString("id","").trim();
                    if(!id.matches("(?i)^gemini-[a-z0-9][a-z0-9._-]{2,110}$") || !isTextGenerationModel(id))continue;
                    found.put(id,new JSONObject().put("id",id).put("name",id));
                }
                if(data.optBoolean("loginHint",false)&&attempt==MAX_ATTEMPTS-1&&found.isEmpty())
                    report("warn","MODEL_LOGIN_HINT","Page may display an authentication prompt");
            }catch(Exception e){
                lastScriptError="eval:"+e.getClass().getSimpleName();
            }
            report("state","MODEL_SCAN","AI Studio model discovery scan",
                "attempt",attempt+1,"usableModels",found.size(),"domCandidates",domCandidates,
                "networkHits",networkHits,"page",lastPath,"ready",lastReadiness,
                "scriptError",lastScriptError);
            if(!pickerOpened){
                pickerOpened=true;
                view.evaluateJavascript("JSON.stringify(window.__STS_MODEL_CATALOG_V2__?.openPicker()||{opened:false,error:'document-start-not-injected'})",pickerRaw->{
                    if(done)return;
                    String pickerResult="unreadable";
                    try{
                        Object decoded=new JSONTokener(pickerRaw==null?"null":pickerRaw).nextValue();
                        JSONObject picker=new JSONObject(decoded instanceof String?(String)decoded:String.valueOf(decoded));
                        pickerResult=picker.optBoolean("opened",false)?"opened":"not-found";
                    }catch(Exception ignored){}
                    report("state","MODEL_PICKER","AI Studio model picker discovery","result",pickerResult);
                    handler.postDelayed(()->scan(attempt+1),900L);
                });
            }else if((found.size()>=2&&attempt>=3)||attempt>=MAX_ATTEMPTS){
                finish("scans-completed");
            }else{
                handler.postDelayed(()->scan(attempt+1),900L);
            }
        });
    }

    // Match the reference app's video/text-generation model filtering. The
    // AI Studio network may also advertise embedding, speech and image models.
    private static boolean isTextGenerationModel(String id){
        String value=id.toLowerCase(java.util.Locale.ROOT);
        return !(value.contains("transcribe") || value.contains("embedding") ||
            value.contains("-tts") || value.contains("tts-") ||
            value.contains("-live") || value.startsWith("gemini-live") ||
            value.contains("imagen") || value.contains("-image") ||
            value.contains("image-") || value.contains("computer-use"));
    }

    private void finish(String reason){
        if(done)return;
        done=true;
        JSONArray models=new JSONArray();
        for(JSONObject item:found.values())models.put(item);
        cleanup();
        report(models.length()>0?"state":"error",models.length()>0?"MODEL_LOAD_OK":"MODEL_LOAD_FAILED",
            "AI Studio model scan finished","reason",reason,"models",models.length(),
            "scans",scans,"networkHits",networkHits,"domCandidates",domCandidates,
            "page",lastPath,"ready",lastReadiness,"scriptError",lastScriptError,
            "mainFrameProblem",mainFrameProblem);
        if(models.length()==0){
            call.reject("AI_STUDIO_NO_MODELS: Không tìm thấy model sau "+scans+
                " lần quét; trang="+lastPath+", ready="+lastReadiness+
                ", DOM="+domCandidates+", phản hồi mạng="+networkHits+
                ", JS="+(lastScriptError.isEmpty()?"OK":lastScriptError)+
                ", mạng="+(mainFrameProblem.isEmpty()?"chưa phát hiện lỗi main-frame":mainFrameProblem)+
                ". Hãy đăng nhập Google AI Studio, kiểm tra WebView/mạng rồi tải lại.");
        }else{
            JSObject result=new JSObject();
            result.put("models",models);
            result.put("scanCount",scans);
            result.put("networkHits",networkHits);
            result.put("domCandidates",domCandidates);
            call.resolve(result);
        }
    }

    void cancel(){
        if(!done){
            done=true;
            report("warn","MODEL_LOAD_CANCELLED","Model catalog load cancelled or superseded",
                "scans",scans,"models",found.size());
            call.reject("AI_STUDIO_MODEL_CANCELLED: Yêu cầu tải model đã bị thay thế hoặc màn hình đã đóng.");
        }
        cleanup();
    }

    private void cleanup(){
        WebView old=view;view=null;
        FrameLayout wrapper=host;host=null;
        if(old!=null){
            try{old.stopLoading();}catch(Exception ignored){}
            try{((ViewGroup)old.getParent()).removeView(old);}catch(Exception ignored){}
            try{old.destroy();}catch(Exception ignored){}
        }
        if(wrapper!=null){
            try{((ViewGroup)wrapper.getParent()).removeView(wrapper);}catch(Exception ignored){}
            wrapper.removeAllViews();
        }
    }
}
