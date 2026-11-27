package com.tvhuy99.cardstudio;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.SystemClock;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import java.util.UUID;
import java.util.function.Supplier;

final class AiStudioSessionController {
    private final Supplier<Activity> activitySupplier;
    private final Supplier<Context> contextSupplier;
    private final Handler handler;
    private final AiStudioDiagnostics diagnostics;
    private final AiStudioWebViewController webViewController;

    private AiStudioModelCatalogReader catalogReader;
    private boolean foregroundRequestStarted;
    private boolean appInBackground;
    private String foregroundToken;

    AiStudioSessionController(
        Supplier<Activity> activitySupplier,
        Supplier<Context> contextSupplier,
        Handler handler,
        AiStudioDiagnostics diagnostics,
        AiStudioWebViewController webViewController
    ) {
        this.activitySupplier = activitySupplier;
        this.contextSupplier = contextSupplier;
        this.handler = handler;
        this.diagnostics = diagnostics;
        this.webViewController = webViewController;
    }

    void startBackgroundGeneration(boolean requestActive) {
        try {
            foregroundToken = UUID.randomUUID().toString();
            Context context = contextSupplier.get();
            Intent intent = AiStudioGenerationService.startIntent(context, foregroundToken);
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
            else context.startService(intent);
            foregroundRequestStarted = true;
            diagnostics.trace("state", "BACKGROUND_SERVICE_STARTED",
                "AI Studio generation protected by Android foreground dataSync service",
                diagnostics.details("requestActive", requestActive, "sdk", Build.VERSION.SDK_INT));
            Activity activity = activitySupplier.get();
            if (Build.VERSION.SDK_INT >= 33 &&
                activity.checkSelfPermission("android.permission.POST_NOTIFICATIONS") !=
                    PackageManager.PERMISSION_GRANTED) {
                SharedPreferences prefs = context.getSharedPreferences(
                    AiStudioWebViewController.PREFS_NAME, Context.MODE_PRIVATE);
                if (!prefs.getBoolean("notifications_asked", false)) {
                    prefs.edit().putBoolean("notifications_asked", true).apply();
                    activity.requestPermissions(
                        new String[]{"android.permission.POST_NOTIFICATIONS"}, 4088);
                    diagnostics.trace("state", "BACKGROUND_NOTIFICATION_PERMISSION",
                        "Requested optional notification visibility permission", null);
                }
            }
        } catch (Exception e) {
            AiStudioGenerationService.finish(contextSupplier.get(), foregroundToken, false);
            foregroundToken = null;
            foregroundRequestStarted = false;
            diagnostics.trace("warn", "BACKGROUND_SERVICE_FAILED",
                "Android cannot guarantee AI Studio will continue after Home",
                diagnostics.details("exception", e.getClass().getSimpleName()));
        }
    }

    void stopBackgroundGeneration(boolean success) {
        if (foregroundRequestStarted) {
            AiStudioGenerationService.finish(contextSupplier.get(), foregroundToken, success);
            foregroundToken = null;
            foregroundRequestStarted = false;
            diagnostics.trace("state", "BACKGROUND_SERVICE_STOPPED",
                "Foreground generation service stopped", diagnostics.details("success", success));
        }
    }

    JSObject buildBackgroundStatus(boolean active, boolean cancelling, int responseChars) {
        JSObject result = new JSObject();
        result.put("active", active);
        result.put("cancelling", cancelling);
        result.put("inBackground", appInBackground);
        result.put("foregroundService", AiStudioGenerationService.isActive(foregroundToken));
        result.put("requestId", diagnostics.getRequestId());
        result.put("responseChars", responseChars);
        return result;
    }

    void handleOnPause(boolean active, int responseChars, int polls) {
        appInBackground = true;
        if (active) {

            webViewController.resumeWebView();
            diagnostics.trace("state", "APP_BACKGROUND",
                "Card Studio left foreground; native AI Studio polling continues",
                diagnostics.details("foregroundService", foregroundRequestStarted,
                    "responseChars", responseChars, "polls", polls));
        }
    }

    void handleOnResume(boolean active, int responseChars, int polls) {
        appInBackground = false;
        webViewController.resumeWebView();
        if (active) {
            diagnostics.trace("state", "APP_RETURNED",
                "Card Studio foreground restored during active AI Studio generation",
                diagnostics.details("foregroundService", foregroundRequestStarted,
                    "responseChars", responseChars, "polls", polls));
        }
    }

    void listModels(PluginCall call, boolean busy, String activeThinking) {
        if (busy) {
            diagnostics.trace("warn", "MODEL_LOAD_BUSY",
                "Cannot list models during an active chat generation",
                diagnostics.details("activeThinking", activeThinking,
                    "activeRequestId", diagnostics.getRequestId()));
            call.reject("AI_STUDIO_BUSY: Đang tạo câu trả lời. Hãy hủy hoặc hoàn thành lượt chat trước khi tải model.");
            return;
        }
        if (catalogReader != null) catalogReader.cancel();
        diagnostics.setRequestId("catalog-" + SystemClock.elapsedRealtime());
        diagnostics.trace("state", "MODEL_LOAD_CLICK", "Native model catalog load invoked",
            diagnostics.details("busy", false));
        catalogReader = new AiStudioModelCatalogReader(activitySupplier.get(), handler, call,
            diagnostics::trace);
        catalogReader.start();
    }

    void cancelCatalogReader() {
        if (catalogReader != null) {
            catalogReader.cancel();
            catalogReader = null;
        }
    }
}
