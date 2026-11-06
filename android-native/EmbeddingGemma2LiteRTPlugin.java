package com.tvhuy99.cardstudio;

import android.os.SystemClock;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ai.edge.litertlm.EmbeddingEngine;
import com.google.ai.edge.litertlm.EmbeddingEngineConfig;
import com.google.ai.edge.litertlm.EmbeddingOptions;
import com.google.ai.edge.litertlm.EmbeddingResponse;
import com.google.ai.edge.litertlm.InputData;
import com.google.ai.edge.litertlm.Backend;

import org.json.JSONArray;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** EmbeddingGemma 2 Text 270M: explicit user download, offline-only inference.
 * Separate from the EmbeddingGemma 300M ONNX plugin, its model files and index.
 * Never selects a different model or an alternate inference backend on errors.
 */
@CapacitorPlugin(name = "EmbeddingGemma2LiteRT")
public class EmbeddingGemma2LiteRTPlugin extends Plugin {
    private static final String TAG = "CardStudioGemma2LiteRT";
    private static final String FILE_NAME = "embeddinggemma-2-text-270m.litertlm";
    private static final String URL = "https://huggingface.co/litert-community/embeddinggemma-2-text-270m-litert-lm/resolve/main/" + FILE_NAME;
    // SHA-256 published by the model repository; do not accept a different file silently.
    private static final String SHA256 = "2d079ee2f6f066b1f368e8d7c819f55214eaef1d0513b312321901f30ab286fb";
    private static final int MAX_BATCH = 4;
    private static final int VECTOR_SIZE = 768;
    private static final int MAX_INPUT_TOKENS = 2048;
    private static final int MAX_TEXT_CHARS = 20000;
    private static final long MIN_MODEL_BYTES = 120L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private EmbeddingEngine engine;

    private interface Work { void run() throws Exception; }

    private void dispatch(PluginCall call, Work task) {
        worker.execute(() -> {
            try { task.run(); }
            catch (Throwable failure) {
                Log.e(TAG, "LiteRT-LM embedding failed", failure);
                String message = failure.getMessage() == null ? failure.getClass().getSimpleName() : failure.getMessage();
                call.reject(message, new Exception(failure));
            }
        });
    }

    private File directory() {
        File dir = new File(getContext().getFilesDir(), "embeddinggemma2-text-270m-v1");
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IllegalStateException("Cannot create private LiteRT model directory");
        }
        return dir;
    }

    private File model() { return new File(directory(), FILE_NAME); }
    private File partial() { return new File(directory(), FILE_NAME + ".part"); }
    private File marker() { return new File(directory(), FILE_NAME + ".ok"); }

    private boolean downloaded() {
        File file = model();
        return file.isFile() && file.length() >= MIN_MODEL_BYTES && marker().isFile();
    }

    private void closeEngine() {
        if (engine != null) {
            try { engine.close(); } catch (Exception e) { Log.w(TAG, "Error closing LiteRT engine", e); }
            engine = null;
        }
    }

    private String hex(byte[] value) {
        StringBuilder out = new StringBuilder(value.length * 2);
        for (byte b : value) out.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return out.toString();
    }

    private void announce(long bytes, long total) {
        JSObject progress = new JSObject();
        progress.put("loaded", bytes);
        progress.put("total", total);
        progress.put("progress", total > 0 ? Math.min(99, (int) (bytes * 100L / total)) : 0);
        notifyListeners("downloadProgress", progress);
    }

    @PluginMethod
    public void status(PluginCall call) {
        dispatch(call, () -> {
            JSObject reply = new JSObject();
            reply.put("modelReady", downloaded());
            reply.put("sessionReady", engine != null);
            reply.put("downloadBytes", partial().isFile() ? partial().length() : 0);
            reply.put("freeBytes", directory().getUsableSpace());
            reply.put("backend", "LiteRT-LM CPU");
            call.resolve(reply);
        });
    }

    /** Called only by the user's explicit Smart Scan model download action.
     * HTTP Range reuses an incomplete part file; a final SHA mismatch is an error.
     * Sync and query methods NEVER download weights or fall back to the cloud.
     */
    @PluginMethod
    public void download(PluginCall call) {
        dispatch(call, () -> {
            if (downloaded()) {
                JSObject result = new JSObject(); result.put("alreadyReady", true); call.resolve(result);
                return;
            }
            closeEngine();
            File target = partial();
            long existing = target.isFile() ? target.length() : 0;
            if (existing > 300L * 1024 * 1024) {
                if (!target.delete()) throw new IllegalStateException("Corrupted partial download");
                existing = 0;
            }
            if (directory().getUsableSpace() < 180L * 1024 * 1024 && existing == 0) {
                throw new IllegalStateException("Not enough free storage for 165 MB LiteRT model");
            }
            HttpURLConnection connection = (HttpURLConnection) new URL(URL).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(60000);
            connection.setRequestProperty("Accept-Encoding", "identity");
            if (existing > 0) connection.setRequestProperty("Range", "bytes=" + existing + "-");
            long received = existing;
            try {
                int code = connection.getResponseCode();
                if (code != 200 && code != 206) throw new IllegalStateException("Model download HTTP " + code);
                boolean resume = existing > 0 && code == 206
                    && connection.getHeaderField("Content-Range") != null
                    && connection.getHeaderField("Content-Range").startsWith("bytes " + existing + "-");
                if (code == 206 && !resume) throw new IllegalStateException("Invalid Content-Range from model server");
                if (!resume) received = 0;
                long contentLength = connection.getContentLengthLong();
                long total = contentLength < 0 ? -1 : contentLength + received;
                announce(received, total);
                try (InputStream input = new BufferedInputStream(connection.getInputStream(), 131072);
                     OutputStream output = new BufferedOutputStream(new FileOutputStream(target, resume), 131072)) {
                    byte[] bytes = new byte[131072];
                    long lastEvent = received;
                    int n;
                    while ((n = input.read(bytes)) != -1) {
                        output.write(bytes, 0, n);
                        received += n;
                        if (received - lastEvent >= 1024L * 1024) {
                            announce(received, total);
                            lastEvent = received;
                        }
                    }
                }
                if (total > 0 && received != total) throw new IllegalStateException("Model download incomplete");
                if (received < MIN_MODEL_BYTES) throw new IllegalStateException("LiteRT model file too small");
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                try (InputStream input = new BufferedInputStream(new FileInputStream(target))) {
                    byte[] bytes = new byte[131072];
                    int n;
                    while ((n = input.read(bytes)) != -1) md.update(bytes, 0, n);
                }
                String digest = hex(md.digest());
                if (!SHA256.equalsIgnoreCase(digest)) {
                    if (!target.delete()) Log.w(TAG, "Failed to remove invalid model download");
                    throw new IllegalStateException("LiteRT model SHA256 mismatch; refusing unverified weights");
                }
                File verified = model();
                if (verified.exists() && !verified.delete()) throw new IllegalStateException("Cannot overwrite old model");
                if (!target.renameTo(verified)) throw new IllegalStateException("Cannot commit LiteRT model download");
                try (FileOutputStream output = new FileOutputStream(marker())) {
                    output.write((digest + "\n").getBytes(StandardCharsets.US_ASCII));
                    output.getFD().sync();
                }
                announce(received, received);
                JSObject result = new JSObject();
                result.put("alreadyReady", false);
                result.put("bytes", received);
                result.put("sha256", digest);
                call.resolve(result);
            } finally {
                connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        dispatch(call, () -> {
            if (!downloaded()) throw new IllegalStateException("EmbeddingGemma 2 has not been downloaded in Settings");
            if (engine != null) {
                JSObject reused = new JSObject();
                reused.put("reused", true); reused.put("backend", "LiteRT-LM CPU"); call.resolve(reused);
                return;
            }
            long start = SystemClock.elapsedRealtime();
            // No silent CPU/GPU switch: CPU is explicitly selected for stable Android operation.
            EmbeddingEngineConfig config = new EmbeddingEngineConfig(
                model().getAbsolutePath(), new Backend.CPU(Integer.valueOf(4), null),
                null, null, getContext().getCacheDir().getAbsolutePath(),
                null, Integer.valueOf(MAX_INPUT_TOKENS), null, null);
            EmbeddingEngine instance = new EmbeddingEngine(config);
            try {
                instance.initialize();
                engine = instance;
            } catch (Exception error) {
                try { instance.close(); } catch (Exception ignored) {}
                throw error;
            }
            JSObject result = new JSObject();
            result.put("backend", "LiteRT-LM CPU");
            result.put("loadMs", SystemClock.elapsedRealtime() - start);
            result.put("reused", false);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void embed(PluginCall call) {
        dispatch(call, () -> {
            if (engine == null) throw new IllegalStateException("LiteRT embedding engine is not loaded");
            JSArray texts = call.getArray("texts");
            if (texts == null || texts.length() == 0 || texts.length() > MAX_BATCH)
                throw new IllegalArgumentException("Invalid EmbeddingGemma 2 batch size");
            List<List<InputData>> batches = new ArrayList<>();
            for (int i = 0; i < texts.length(); i++) {
                String text = texts.getString(i);
                if (text == null || text.trim().isEmpty() || text.length() > MAX_TEXT_CHARS) {
                    throw new IllegalArgumentException("Invalid embedding input text");
                }
                batches.add(Collections.singletonList(new InputData.Text(text)));
            }
            long start = SystemClock.elapsedRealtime();
            EmbeddingOptions options = new EmbeddingOptions(
                Boolean.TRUE, Boolean.TRUE, Integer.valueOf(VECTOR_SIZE), null);
            List<EmbeddingResponse> output = engine.computeEmbeddingBatch(batches, options);
            if (output.size() != batches.size()) throw new IllegalStateException("Native embedding batch count mismatch");
            JSArray vectors = new JSArray();
            for (EmbeddingResponse item : output) {
                float[] vector = item.getEmbedding();
                if (vector == null || vector.length != VECTOR_SIZE)
                    throw new IllegalStateException("EmbeddingGemma 2 returned wrong vector dimension");
                JSArray values = new JSArray();
                for (float value : vector) {
                    if (!Float.isFinite(value)) throw new IllegalStateException("Embedding has NaN/Infinity");
                    values.put(value);
                }
                vectors.put(values);
            }
            JSObject result = new JSObject();
            result.put("vectors", vectors);
            result.put("onnxMs", SystemClock.elapsedRealtime() - start);
            result.put("backend", "LiteRT-LM CPU");
            call.resolve(result);
        });
    }

    @PluginMethod
    public void unload(PluginCall call) {
        dispatch(call, () -> { closeEngine(); call.resolve(); });
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        dispatch(call, () -> {
            closeEngine();
            for (File file : Arrays.asList(model(), partial(), marker())) {
                if (file.exists() && !file.delete()) throw new IllegalStateException("Cannot delete " + file.getName());
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        worker.execute(this::closeEngine);
        worker.shutdown();
        super.handleOnDestroy();
    }
}
