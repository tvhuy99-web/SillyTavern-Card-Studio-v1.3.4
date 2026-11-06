package com.tvhuy99.cardstudio;

import android.os.SystemClock;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
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
    private String activeBackend = "CPU";
    private int activeCpuThreads = 4;
    private int selectedBatch = 2;
    private String lastBackendNote = "";
    // Profiles are computed on the user's actual Lorebook input once per app
    // install/model version. A GPU crash leaves a guard flag on disk, preventing
    // the next session from automatically repeating a driver crash.
    private static final String PROFILE_PREFS = "embeddinggemma2-litert-profiler-v2";
    private static final int PROFILE_VERSION = 2;
    private static final int[] TRIAL_BATCHES = { 1, 2, 4 };

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

    private SharedPreferences profilePrefs() {
        return getContext().getSharedPreferences(PROFILE_PREFS, Context.MODE_PRIVATE);
    }

    private void protectAgainstPreviousGpuCrash() {
        SharedPreferences settings = profilePrefs();
        if (settings.getBoolean("gpuTrialInProgress", false)) {
            settings.edit().putBoolean("gpuBlocked", true)
                .putBoolean("gpuTrialInProgress", false).putBoolean("tuned", false).commit();
            lastBackendNote = "Phát hiện GPU từng làm gián đoạn ứng dụng; vô hiệu hóa GPU, giữ CPU";
            Log.w(TAG, lastBackendNote);
        }
    }

    private boolean isOpenClAccessible() {
        try {
            // AndroidManifest declares this optional vendor native library.
            // Successfully opening it is a necessary, not sufficient, GPU test.
            System.loadLibrary("OpenCL");
            return true;
        } catch (UnsatisfiedLinkError | SecurityException unavailable) {
            return false;
        }
    }

    private void initializeEngine(String backend, int cpuThreads) throws Exception {
        closeEngine(); // Do not retain two 165 MB native sessions simultaneously.
        final boolean gpu = "GPU".equals(backend);
        Backend selected = gpu ? new Backend.GPU()
            : new Backend.CPU(Integer.valueOf(cpuThreads), null);
        if (gpu) profilePrefs().edit().putBoolean("gpuTrialInProgress", true).commit();
        EmbeddingEngineConfig config = new EmbeddingEngineConfig(
            model().getAbsolutePath(), selected,
            null, null, getContext().getCacheDir().getAbsolutePath(),
            null, Integer.valueOf(MAX_INPUT_TOKENS), null, null);
        EmbeddingEngine candidate = new EmbeddingEngine(config);
        try {
            candidate.initialize();
            engine = candidate;
            activeBackend = backend;
            activeCpuThreads = cpuThreads;
            if (gpu) profilePrefs().edit().putBoolean("gpuTrialInProgress", false).commit();
        } catch (Throwable failure) {
            try { candidate.close(); } catch (Throwable ignored) {}
            if (gpu) profilePrefs().edit()
                .putBoolean("gpuTrialInProgress", false).putBoolean("gpuBlocked", true).commit();
            if (failure instanceof Exception) throw (Exception) failure;
            throw new IllegalStateException("LiteRT engine init failed: " + failure.getMessage(), failure);
        }
    }

    private List<List<InputData>> wrapInputs(List<String> text, int count) {
        List<List<InputData>> inputs = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            inputs.add(Collections.singletonList(new InputData.Text(text.get(i % text.size()))));
        }
        return inputs;
    }

    private EmbeddingOptions options() {
        return new EmbeddingOptions(Boolean.TRUE, Boolean.TRUE, Integer.valueOf(VECTOR_SIZE), null);
    }

    private static double cosine(float[] left, float[] right) {
        if (left.length != VECTOR_SIZE || right.length != VECTOR_SIZE) return -1;
        double dot = 0, x = 0, y = 0;
        for (int i = 0; i < VECTOR_SIZE; i++) {
            if (!Float.isFinite(left[i]) || !Float.isFinite(right[i])) return -1;
            dot += left[i] * (double) right[i];
            x += left[i] * (double) left[i];
            y += right[i] * (double) right[i];
        }
        return x > 0 && y > 0 ? dot / Math.sqrt(x * y) : -1;
    }

    private static class Trial {
        final String backend;
        final int threads;
        final int batch;
        final long latencyMs;
        final double segmentsPerSecond;
        Trial(String backend, int threads, int batch, long latencyMs) {
            this.backend = backend;
            this.threads = threads;
            this.batch = batch;
            this.latencyMs = Math.max(1, latencyMs);
            this.segmentsPerSecond = batch * 1000.0 / this.latencyMs;
        }
    }

    private Trial bestTrialForSession(List<String> examples, String backend,
                                      int threads, JSArray results, float[] cpuReference) {
        EmbeddingOptions opts = options();
        // Warm up the delegate before measuring steady-state throughput.
        List<EmbeddingResponse> warm = engine.computeEmbeddingBatch(wrapInputs(examples, 1), opts);
        float[] sample = warm.get(0).getEmbedding();
        if (sample == null || sample.length != VECTOR_SIZE) {
            throw new IllegalStateException("LiteRT benchmark output has wrong vector dimensions");
        }
        if (cpuReference != null && cosine(cpuReference, sample) < 0.999) {
            throw new IllegalStateException("GPU results differ from CPU embeddings (cosine < 0.999)");
        }
        Trial best = null;
        for (int size : TRIAL_BATCHES) {
            long begin = SystemClock.elapsedRealtimeNanos();
            List<EmbeddingResponse> vectors =
                engine.computeEmbeddingBatch(wrapInputs(examples, size), opts);
            long durationMs = Math.max(1,
                (SystemClock.elapsedRealtimeNanos() - begin + 999999) / 1000000);
            if (vectors.size() != size) throw new IllegalStateException("LiteRT benchmark wrong batch size");
            for (EmbeddingResponse vector : vectors) {
                if (vector.getEmbedding() == null || vector.getEmbedding().length != VECTOR_SIZE)
                    throw new IllegalStateException("LiteRT benchmark bad vector shape");
            }
            Trial trial = new Trial(backend, threads, size, durationMs);
            JSObject row = new JSObject();
            row.put("backend", "GPU".equals(backend) ? "GPU (OpenCL, yêu cầu)" : "CPU " + threads + " luồng");
            row.put("batch", size);
            row.put("ms", durationMs);
            row.put("segmentsPerSecond", Math.round(trial.segmentsPerSecond * 100.0) / 100.0);
            results.put(row);
            if (best == null || trial.segmentsPerSecond > best.segmentsPerSecond) best = trial;
        }
        return best;
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
            protectAgainstPreviousGpuCrash();
            reply.put("backend", "LiteRT-LM " + activeBackend + ("CPU".equals(activeBackend) ? " " + activeCpuThreads + " luồng" : " (yêu cầu)"));
            reply.put("gpuOpenClAccessible", isOpenClAccessible());
            reply.put("gpuBlocked", profilePrefs().getBoolean("gpuBlocked", false));
            reply.put("tuned", profilePrefs().getBoolean("tuned", false));
            reply.put("preferredBatch", profilePrefs().getInt("preferredBatch", 2));
            reply.put("backendNote", lastBackendNote);
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
            protectAgainstPreviousGpuCrash();
            if (engine != null) {
                JSObject reused = new JSObject();
                reused.put("reused", true);
                reused.put("backend", "LiteRT-LM " + activeBackend);
                reused.put("preferredBatch", selectedBatch);
                reused.put("backendNote", lastBackendNote);
                call.resolve(reused);
                return;
            }
            SharedPreferences prefs = profilePrefs();
            String backend = prefs.getBoolean("tuned", false) ? prefs.getString("backend", "CPU") : "CPU";
            int threads = prefs.getBoolean("tuned", false) ? prefs.getInt("threads", 4) : 4;
            if ("GPU".equals(backend) && (prefs.getBoolean("gpuBlocked", false) || !isOpenClAccessible())) {
                backend = "CPU";
                threads = 4;
                lastBackendNote = "GPU không sẵn sàng; tiếp tục cùng model với CPU 4 luồng";
            }
            long started = SystemClock.elapsedRealtime();
            try {
                initializeEngine(backend, threads);
            } catch (Throwable failure) {
                if (!"GPU".equals(backend)) {
                    if (failure instanceof Exception) throw (Exception) failure;
                    throw new IllegalStateException("Native LiteRT failed", failure);
                }
                lastBackendNote = "GPU khởi tạo lỗi (" + failure.getClass().getSimpleName()
                    + "); chuyển backend sang CPU 4 luồng, không đổi model";
                Log.w(TAG, lastBackendNote);
                initializeEngine("CPU", 4);
            }
            selectedBatch = prefs.getBoolean("tuned", false) ? prefs.getInt("preferredBatch", 2) : 2;
            JSObject result = new JSObject();
            result.put("backend", "LiteRT-LM " + activeBackend);
            result.put("threads", activeCpuThreads);
            result.put("loadMs", SystemClock.elapsedRealtime() - started);
            result.put("reused", false);
            result.put("preferredBatch", selectedBatch);
            result.put("backendNote", lastBackendNote);
            call.resolve(result);
        });
    }

    /**
     * Benchmark the actual Lorebook text, CPU 2/4 threads and GPU (only
     * when Android exposes OpenCL). Run once per model/profile version and
     * persist the winning backend+batch. Never switch models or scan mode.
     */
    @PluginMethod
    public void tune(PluginCall call) {
        dispatch(call, () -> {
            if (engine == null) throw new IllegalStateException("Load LiteRT model before tuning");
            SharedPreferences prefs = profilePrefs();
            protectAgainstPreviousGpuCrash();
            if (prefs.getBoolean("tuned", false)) {
                JSObject reused = new JSObject();
                reused.put("reused", true);
                reused.put("backend", "LiteRT-LM " + activeBackend);
                reused.put("preferredBatch", selectedBatch);
                reused.put("note", lastBackendNote.isEmpty()
                    ? "Dùng cấu hình đã đo từ lần đồng bộ trước" : lastBackendNote);
                call.resolve(reused);
                return;
            }
            JSArray input = call.getArray("texts");
            if (input == null || input.length() == 0) {
                throw new IllegalArgumentException("Need real Lorebook input for LiteRT benchmark");
            }
            List<String> sample = new ArrayList<>();
            for (int i = 0; i < Math.min(2, input.length()); i++) {
                String value = input.getString(i);
                if (value == null || value.trim().isEmpty() || value.length() > MAX_TEXT_CHARS) {
                    throw new IllegalArgumentException("Invalid benchmark document");
                }
                sample.add(value);
            }
            long started = SystemClock.elapsedRealtime();
            JSArray measurements = new JSArray();
            JSArray failures = new JSArray();
            boolean gpuPossible = !prefs.getBoolean("gpuBlocked", false) && isOpenClAccessible();
            // CPU 4 is the known-working baseline. Candidate engines are always
            // closed before creating the next, avoiding multiple large sessions.
            if (!"CPU".equals(activeBackend) || activeCpuThreads != 4) initializeEngine("CPU", 4);
            float[] cpuReference = engine.computeEmbeddingBatch(wrapInputs(sample, 1), options())
                .get(0).getEmbedding();
            Trial best = bestTrialForSession(sample, "CPU", 4, measurements, cpuReference);
            try {
                initializeEngine("CPU", 2);
                Trial cpu2 = bestTrialForSession(sample, "CPU", 2, measurements, cpuReference);
                if (cpu2.segmentsPerSecond > best.segmentsPerSecond * 1.06) best = cpu2;
            } catch (Throwable error) {
                failures.put("CPU 2 luồng: " + error.getClass().getSimpleName());
                Log.w(TAG, "CPU2 benchmarking unavailable", error);
            }
            if (gpuPossible) {
                // Persist synchronously before entering vendor GPU native code.
                // If a driver kills the process, next launch disables GPU trial.
                prefs.edit().putBoolean("gpuTrialInProgress", true).commit();
                try {
                    initializeEngine("GPU", 4);
                    Trial gpu = bestTrialForSession(sample, "GPU", 4, measurements, cpuReference);
                    if (gpu.segmentsPerSecond > best.segmentsPerSecond * 1.12) {
                        best = gpu;
                    }
                } catch (Throwable error) {
                    prefs.edit().putBoolean("gpuBlocked", true).commit();
                    failures.put("GPU/OpenCL: " + error.getClass().getSimpleName());
                    Log.w(TAG, "GPU embedding benchmark failed; preserving CPU", error);
                } finally {
                    prefs.edit().putBoolean("gpuTrialInProgress", false).commit();
                }
            } else {
                failures.put(prefs.getBoolean("gpuBlocked", false)
                    ? "GPU/OpenCL đã bị chặn do lỗi trước đó"
                    : "GPU/OpenCL không khả dụng trên điện thoại");
            }
            try {
                if (!best.backend.equals(activeBackend)
                    || ("CPU".equals(best.backend) && best.threads != activeCpuThreads)) {
                    initializeEngine(best.backend, best.threads);
                }
            } catch (Throwable error) {
                prefs.edit().putBoolean("gpuBlocked", true).commit();
                failures.put("Không thể áp dụng GPU, giữ CPU 4 luồng: " + error.getClass().getSimpleName());
                initializeEngine("CPU", 4);
                best = new Trial("CPU", 4, 2, Math.max(1, best.latencyMs));
            }
            selectedBatch = best.batch;
            prefs.edit()
                .putBoolean("tuned", true)
                .putString("backend", activeBackend)
                .putInt("threads", activeCpuThreads)
                .putInt("preferredBatch", selectedBatch)
                .putInt("profileVersion", PROFILE_VERSION)
                .commit();
            JSObject result = new JSObject();
            result.put("reused", false);
            result.put("backend", "LiteRT-LM " + activeBackend + ("CPU".equals(activeBackend) ? " " + activeCpuThreads + " luồng" : " (yêu cầu)"));
            result.put("preferredBatch", selectedBatch);
            result.put("gpuOpenClAccessible", gpuPossible);
            result.put("benchmarks", measurements);
            result.put("warnings", failures);
            result.put("totalMs", SystemClock.elapsedRealtime() - started);
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
            long started = SystemClock.elapsedRealtimeNanos();
            List<EmbeddingResponse> vectors = engine.computeEmbeddingBatch(batches, options());
            long nativeMs = Math.max(1, (SystemClock.elapsedRealtimeNanos() - started + 999999) / 1000000);
            if (vectors.size() != batches.size()) {
                throw new IllegalStateException("Native embedding batch count mismatch");
            }
            // Transfer 4 x 768 float32 as one little-endian base64 buffer
            // rather than 3072 JSON numbers. Significantly lowers WebView
            // JSON serialization and GC overhead without changing vectors.
            ByteBuffer binary = ByteBuffer.allocate(vectors.size() * VECTOR_SIZE * Float.BYTES)
                .order(ByteOrder.LITTLE_ENDIAN);
            for (EmbeddingResponse item : vectors) {
                float[] vector = item.getEmbedding();
                if (vector == null || vector.length != VECTOR_SIZE) {
                    throw new IllegalStateException("EmbeddingGemma 2 returned wrong vector dimension");
                }
                for (float value : vector) {
                    if (!Float.isFinite(value)) throw new IllegalStateException("Embedding has NaN/Infinity");
                    binary.putFloat(value);
                }
            }
            JSObject result = new JSObject();
            result.put("vectorBytes", Base64.encodeToString(binary.array(), Base64.NO_WRAP));
            result.put("count", vectors.size());
            result.put("dimensions", VECTOR_SIZE);
            result.put("format", "float32le");
            result.put("onnxMs", nativeMs);
            result.put("backend", "LiteRT-LM " + activeBackend + ("CPU".equals(activeBackend) ? " " + activeCpuThreads + " luồng" : " (yêu cầu)"));
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
            profilePrefs().edit().clear().commit();
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
