package com.tvhuy99.cardstudio;

import android.app.Activity;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final AiStudioDiagnostics diagnostics;
    private final AiStudioWebViewController webViewController;
    private final AiStudioSessionController sessionController;
    private final AiStudioThinkingController thinkingController;
    private final AiStudioGenerationController generationController;
    private boolean destroyed;

    public AiStudioTextPlugin() {
        this.diagnostics = new AiStudioDiagnostics((eventName, data) -> notifyListeners(eventName, data));
        this.webViewController = new AiStudioWebViewController(
            this::getActivity,
            this::getContext,
            diagnostics,
            this::isDestroyed,
            this::isGenerationActive,
            this::getFreshChatAttempt,
            this::handleRenderProcessGone
        );
        this.sessionController = new AiStudioSessionController(
            this::getActivity,
            this::getContext,
            handler,
            diagnostics,
            webViewController
        );
        this.thinkingController = new AiStudioThinkingController(
            handler,
            diagnostics,
            webViewController
        );
        this.generationController = new AiStudioGenerationController(
            handler,
            diagnostics,
            webViewController,
            sessionController,
            thinkingController
        );
    }

    private boolean isDestroyed() {
        return destroyed;
    }

    private boolean isGenerationActive() {
        return generationController != null && generationController.hasPending();
    }

    private int getFreshChatAttempt() {
        return generationController == null ? 0 : generationController.getFreshChatAttempt();
    }

    private void handleRenderProcessGone() {
        if (generationController != null) generationController.onRenderProcessGone();
    }

    private void onUi(PluginCall call, Runnable action) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("AI_STUDIO_SESSION_CLOSED");
            return;
        }
        activity.runOnUiThread(() -> {
            if (destroyed || activity.isDestroyed()) {
                call.reject("AI_STUDIO_SESSION_CLOSED");
                return;
            }
            try {
                action.run();
            } catch (Exception error) {
                if (generationController.isPending(call)) {
                    generationController.fail("AI_STUDIO_NATIVE_ERROR: " + error.getClass().getSimpleName());
                } else {
                    call.reject("AI_STUDIO_NATIVE_ERROR: " + error.getClass().getSimpleName());
                }
            }
        });
    }

    @PluginMethod
    public void getBackgroundStatus(PluginCall call) {
        onUi(call, () -> call.resolve(sessionController.buildBackgroundStatus(
            generationController.hasPending(),
            generationController.isCancelling(),
            generationController.getResponseChars()
        )));
    }

    @PluginMethod
    public void getVisibility(PluginCall call) {
        JSObject result = new JSObject();
        result.put("visible", webViewController.isPageDisplayEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void setVisibility(PluginCall call) {
        final boolean visible = Boolean.TRUE.equals(call.getBoolean("visible", false));
        onUi(call, () -> webViewController.setVisibility(call, visible));
    }

    @PluginMethod
    public void openSession(PluginCall call) {
        onUi(call, () -> webViewController.openSession(call));
    }

    @PluginMethod
    public void listModels(PluginCall call) {
        onUi(call, () -> sessionController.listModels(
            call,
            generationController.isBusy(),
            thinkingController.getPendingThinkingLevel()
        ));
    }

    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt = call.getString("prompt", "");
        final String requestedThinking = call.getString("thinkingLevel", "default");
        final String preferredModel = call.getString("model", "");
        final String modelId = preferredModel == null ? "" : preferredModel.trim().replaceFirst("^models/", "");
        final String chatUrl = (!"default".equalsIgnoreCase(modelId)
            && !"web_default".equalsIgnoreCase(modelId)
            && modelId.matches("[A-Za-z0-9._-]{1,100}"))
            ? AiStudioWebViewController.URL + "?model=" + Uri.encode(modelId)
            : AiStudioWebViewController.URL;
        if (prompt == null || prompt.isBlank()) {
            call.reject("AI_STUDIO_PROMPT_EMPTY");
            return;
        }
        onUi(call, () -> generationController.startGeneration(
            call, prompt, requestedThinking, modelId, chatUrl
        ));
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        onUi(call, () -> generationController.cancel(call));
    }

    @Override
    protected void handleOnPause() {
        sessionController.handleOnPause(
            generationController.hasPending(),
            generationController.getResponseChars(),
            generationController.getPolls()
        );
        super.handleOnPause();
    }

    @Override
    protected void handleOnResume() {
        sessionController.handleOnResume(
            generationController.hasPending(),
            generationController.getResponseChars(),
            generationController.getPolls()
        );
        super.handleOnResume();
    }

    @Override
    protected void handleOnDestroy() {
        destroyed = true;
        sessionController.cancelCatalogReader();
        generationController.destroy();
        webViewController.releaseWebView();
        super.handleOnDestroy();
    }
}
