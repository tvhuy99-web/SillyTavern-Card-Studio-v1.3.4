package com.tvhuy99.cardstudio;

import android.app.Activity;
import android.graphics.Color;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;

/** Owns only the non-modal AI Studio panel and its view hierarchy. */
final class AiStudioPanel {
    private final Activity activity;
    private final WebView sessionWebView;
    private final Runnable onHide;
    private FrameLayout offscreenHost;
    private Button hidePanelButton;

    AiStudioPanel(Activity activity, WebView view, Runnable onHide) {
        this.activity = activity;
        sessionWebView = view;
        this.onHide = onHide;
    }
    boolean attach() {
        FrameLayout root = activity.findViewById(android.R.id.content);
        if (root == null) return false;
        if (offscreenHost == null) {
            offscreenHost = new FrameLayout(activity);
            offscreenHost.setBackgroundColor(Color.WHITE);
            float dp = activity.getResources().getDisplayMetrics().density;
            int height = Math.max((int)(activity.getResources().getDisplayMetrics().heightPixels*.42f), (int)(260f*dp));
            FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,height,Gravity.TOP);
            root.addView(offscreenHost,0,p);
            hidePanelButton = new Button(activity);
            hidePanelButton.setText("Ẩn AI Studio");
            hidePanelButton.setTextSize(12f);
            hidePanelButton.setAllCaps(false);
            hidePanelButton.setOnClickListener(v -> onHide.run());
            FrameLayout.LayoutParams bp = new FrameLayout.LayoutParams((int)(132f*dp),(int)(42f*dp),Gravity.TOP|Gravity.END);
            bp.setMargins(0,(int)(4f*dp),(int)(4f*dp),0);
            offscreenHost.addView(hidePanelButton,bp);
        } else if (offscreenHost.getParent() == null) root.addView(offscreenHost,0,offscreenHost.getLayoutParams());
        if (!isAttached()) {
            if (sessionWebView.getParent() instanceof ViewGroup) ((ViewGroup)sessionWebView.getParent()).removeView(sessionWebView);
            offscreenHost.addView(sessionWebView,0,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
        }
        return true;
    }
    boolean isAttached() { return offscreenHost != null && sessionWebView.getParent() == offscreenHost; }
    int present(boolean visible) {
        if (offscreenHost == null) return -1;
        int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
        int panelHeight = offscreenHost.getLayoutParams()==null ? offscreenHost.getHeight():offscreenHost.getLayoutParams().height;
        offscreenHost.setVisibility(android.view.View.VISIBLE);
        sessionWebView.setVisibility(android.view.View.VISIBLE);
        offscreenHost.setAlpha(1f);
        sessionWebView.setAlpha(1f);
        offscreenHost.setTranslationY(visible?0f:screenHeight+Math.max(1,panelHeight));
        offscreenHost.setEnabled(visible);
        offscreenHost.setClickable(visible);
        offscreenHost.setFocusable(visible);
        offscreenHost.setFocusableInTouchMode(visible);
        sessionWebView.setFocusable(visible);
        int accessibility = visible ? android.view.View.IMPORTANT_FOR_ACCESSIBILITY_AUTO : android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS;
        offscreenHost.setImportantForAccessibility(accessibility);
        sessionWebView.setImportantForAccessibility(accessibility);
        if (hidePanelButton != null) hidePanelButton.setVisibility(visible?android.view.View.VISIBLE:android.view.View.GONE);
        if (visible) { offscreenHost.bringToFront(); offscreenHost.requestLayout(); }
        return panelHeight;
    }
    void detach() {
        if (offscreenHost != null) {
            if (offscreenHost.getParent() instanceof ViewGroup) ((ViewGroup)offscreenHost.getParent()).removeView(offscreenHost);
            offscreenHost.removeAllViews();
            offscreenHost = null;
        }
        hidePanelButton = null;
    }
}
