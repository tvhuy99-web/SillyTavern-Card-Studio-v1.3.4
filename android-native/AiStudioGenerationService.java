package com.tvhuy99.cardstudio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

public class AiStudioGenerationService extends Service {
    public static final String ACTION_BEGIN = "com.tvhuy99.cardstudio.AISTUDIO_BEGIN";
    private static final String CHANNEL_WORK = "ai_studio_generation";
    private static final String CHANNEL_DONE = "ai_studio_finished";
    private static final int NOTIFICATION_RUNNING = 40932;
    private static final int NOTIFICATION_FINISHED = 40933;
    private static final String TAG = "CardStudioAIStudioBg";
    private static final NativeGenerationLease LEASE = new NativeGenerationLease();
    private static final String EXTRA_TOKEN = "generationToken";
    private static AiStudioGenerationService instance;
    private String activeToken;
    private PowerManager.WakeLock wakeLock;

    public static Intent startIntent(Context context, String token) {
        LEASE.request(token);
        return new Intent(context, AiStudioGenerationService.class).setAction(ACTION_BEGIN)
            .putExtra(EXTRA_TOKEN, token);
    }

    public static void finish(Context context, String token, boolean successful) {
        if (!LEASE.release(token)) return;
        AiStudioGenerationService current = instance;
        if (current != null && token.equals(current.activeToken)) current.finishRequest(successful);

    }

    public static boolean isActive(String token) {
        return LEASE.owns(token) && instance != null && token.equals(instance.activeToken);
    }

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        NotificationManager manager = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL_WORK, "AI Studio đang trả lời", NotificationManager.IMPORTANCE_LOW));
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL_DONE, "AI Studio hoàn thành", NotificationManager.IMPORTANCE_DEFAULT));
        }
    }

    private PendingIntent openCardStudio() {
        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, intent, flags);
    }

    private Notification buildNotification(boolean active, boolean success) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, active ? CHANNEL_WORK : CHANNEL_DONE)
            : new Notification.Builder(this);
        return builder
            .setSmallIcon(active ? android.R.drawable.stat_sys_upload : android.R.drawable.stat_sys_download_done)
            .setContentTitle(active ? "AI Studio đang trả lời" :
                success ? "AI Studio đã trả lời xong" : "AI Studio đã dừng")
            .setContentText(active ? "Bạn có thể dùng ứng dụng khác. Chạm để quay về Card Studio." :
                "Chạm để quay lại Card Studio.")
            .setContentIntent(openCardStudio())
            .setOngoing(active)
            .setOnlyAlertOnce(true)
            .setAutoCancel(!active)
            .build();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_BEGIN.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String token = intent.getStringExtra(EXTRA_TOKEN);
        if (!LEASE.owns(token) && LEASE.owns(activeToken)) return START_NOT_STICKY;
        try {
            Notification notification = buildNotification(true, false);
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFICATION_RUNNING, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(NOTIFICATION_RUNNING, notification);
            }
            if (!LEASE.owns(token)) {
                if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
                else stopForeground(true);
                stopSelf(startId);
                return START_NOT_STICKY;
            }
            activeToken = token;
            PowerManager pm = (PowerManager)getSystemService(POWER_SERVICE);
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CardStudio:AiStudioReply");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(6 * 60 * 1000L);
            }
        } catch (RuntimeException e) {
            Log.w(TAG, "Unable to start background AI Studio mode: " + e.getClass().getSimpleName());
            LEASE.release(token);
            activeToken = null;
            stopSelf(startId);
        }
        return START_NOT_STICKY;
    }

    private void finishRequest(boolean successful) {
        activeToken = null;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        try {
            NotificationManager manager = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.notify(NOTIFICATION_FINISHED,
                buildNotification(false, successful));
        } catch (RuntimeException e) {
            Log.w(TAG, "Completion notification unavailable: " + e.getClass().getSimpleName());
        }
        stopSelf();
    }

    @Override public void onDestroy() {
        LEASE.release(activeToken);
        activeToken = null;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (instance == this) instance = null;
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onTimeout(int startId, int fgsType) {
        Log.w(TAG, "Android FGS dataSync time limit reached");
        LEASE.release(activeToken);
        activeToken = null;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf(startId);
    }
}
