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

    private static final String DOCUMENT_START = """
        (function(){
          if(window.__STS_MODEL_CATALOG_V2__)return;
          const catalog=new Map();
          const valid=/^gemini-[a-z0-9][a-z0-9._-]{2,110}$/i;
          function remember(raw,source){
            const id=String(raw||'').trim().replace(/^models[/]/i,'');
            if(!valid.test(id)||catalog.size>=200)return;
            if(!catalog.has(id))catalog.set(id,{id:id,name:id,source:source});
          }
          function observe(raw,source){
            const text=String(raw||'').slice(0,350000);
            const ids=text.match(/gemini-[a-z0-9][a-z0-9._-]{2,110}/ig)||[];
            for(const id of ids.slice(0,300))remember(id,source);
          }
          function scanDom(){
            const roots=[document],visited=new Set();
            for(let i=0;i<roots.length&&i<80;i++){
              const root=roots[i];if(!root||visited.has(root))continue;
              visited.add(root);
              let nodes=[];
              try{nodes=root.querySelectorAll('mat-option,[role="option"],[role="menuitem"],mat-select,[role="combobox"],button,[data-value],[data-model-id],[title],[aria-label]');}catch(e){}
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
                  if(url&&new URL(url,location.href).origin!==location.origin)return;
                  const mime=r.headers&&r.headers.get('content-type')||'';
                  if(/json|text|javascript/.test(mime))r.clone().text().then(x=>observe(x,'fetch-response')).catch(()=>{});
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
                  if(xhr.__stsCatalogUrl&&new URL(xhr.__stsCatalogUrl,location.href).origin!==location.origin)return;
                  if((!xhr.responseType||xhr.responseType==='text')&&xhr.responseText)observe(xhr.responseText,'xhr-response');
                }catch(e){}
              });}catch(e){}
              return oldSend.apply(this,arguments);
            };
          }
          window.__STS_MODEL_CATALOG_V2__={
            discover:function(){scanDom();return {models:Array.from(catalog.values()).sort((a,b)=>a.id.localeCompare(b.id))};},
            openPicker:openPicker
          };
        })();
        """;

    AiStudioModelCatalogReader(Activity activity, Handler handler, PluginCall call) {
        this.activity = activity;
        this.handler = handler;
        this.call = call;
    }

    @SuppressLint("SetJavaScriptEnabled")
    void start() {
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            call.reject("AI_STUDIO_MODEL_DISCOVERY_UNSUPPORTED: Android System WebView cần hỗ trợ document-start.");
            return;
        }
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
                @Override public void onPageFinished(WebView page,String url){
                    if(done||pageLoaded||url==null||!url.startsWith(ORIGIN))return;
                    pageLoaded=true;
                    handler.postDelayed(()->scan(0),800L);
                }
                @Override public void onPageStarted(WebView page,String url,Bitmap icon){}
            });
            view.loadUrl(PAGE);
            handler.postDelayed(()->{if(!done)finish();},TIMEOUT_MS);
            handler.postDelayed(()->{if(!done&&!pageLoaded)scan(0);},3500L);
        }catch(Exception e){
            cancel();
            call.reject("AI_STUDIO_MODEL_DISCOVERY_FAILED: "+e.getClass().getSimpleName());
        }
    }

    private void scan(int attempt) {
        if(done||view==null)return;
        view.evaluateJavascript("JSON.stringify(window.__STS_MODEL_CATALOG_V2__?.discover()||{models:[]})",raw->{
            if(done)return;
            try{
                Object value=new JSONTokener(raw==null?"null":raw).nextValue();
                JSONObject data=new JSONObject(value instanceof String?(String)value:String.valueOf(value));
                JSONArray models=data.optJSONArray("models");
                if(models!=null)for(int i=0;i<models.length();i++){
                    JSONObject item=models.optJSONObject(i);if(item==null)continue;
                    String id=item.optString("id","").trim();
                    if(!id.matches("(?i)^gemini-[a-z0-9][a-z0-9._-]{2,110}$"))continue;
                    found.put(id,new JSONObject().put("id",id).put("name",id));
                }
            }catch(Exception ignored){}
            if(!pickerOpened){
                pickerOpened=true;
                view.evaluateJavascript("JSON.stringify(window.__STS_MODEL_CATALOG_V2__?.openPicker()||{opened:false})",ignored->
                    handler.postDelayed(()->scan(attempt+1),900L));
            }else if((found.size()>=2&&attempt>=3)||attempt>=MAX_ATTEMPTS){
                finish();
            }else{
                handler.postDelayed(()->scan(attempt+1),1100L);
            }
        });
    }

    private void finish(){
        if(done)return;
        done=true;
        JSONArray models=new JSONArray();
        for(JSONObject item:found.values())models.put(item);
        cleanup();
        if(models.length()==0){
            call.reject("AI_STUDIO_NO_MODELS: Chưa đọc được Model ID thật từ trang Google. Hãy đăng nhập AI Studio rồi nhấn Tải lại.");
        }else{
            JSObject result=new JSObject();result.put("models",models);call.resolve(result);
        }
    }

    void cancel(){
        done=true;
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
