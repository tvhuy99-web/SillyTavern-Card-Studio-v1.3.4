package com.tvhuy99.cardstudio;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.nio.LongBuffer;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OnnxValue;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

/**
 * Runs the existing EmbeddingGemma Q4 ONNX graph on Android native threads.
 * The web tokenizer and model selection remain unchanged. JS supplies padded
 * input_ids and attention_mask. Only the sentence_embedding output is accepted,
 * so no semantic search, pooling, or model fallback is introduced.
 *
 * Cache API is owned by the WebView. The existing model is copied in small
 * base64 chunks into private native files before the first native session.
 * Neither the model's content nor any Lorebook text is sent to a network API.
 */
@CapacitorPlugin(name = "WorldInfoEmbeddingNative")
public class WorldInfoEmbeddingNativePlugin extends Plugin {
    private static final String TAG = "CardStudioWorldInfoOrt";
    private static final String GRAPH = "model_q4.onnx";
    private static final String WEIGHTS = "model_q4.onnx_data";
    private static final int MAX_CHUNK_BYTES = 768 * 1024;
    private static final int MAX_INPUT_TOKENS = 2048;
    private static final int MAX_BATCH = 4;
    private static final int DIMENSIONS = 768;

    private final NativeSerialWorker background = new NativeSerialWorker("WorldInfoEmbeddingNativePlugin");
    private OrtEnvironment environment;
    private OrtSession session;
    private String sessionBackend;
    private OutputStream writer;
    private String activeName;
    private String activeImportId;
    private long bytesWritten;
    private MessageDigest importDigest;
    private String modelImportId;
    private NativeOnnxModelSet modelSet;

    private interface Job { void run() throws Exception; }

    private void execute(PluginCall call, Job job) {
        background.submit(() -> {
            try { job.run(); }
            catch (Throwable error) {
                Log.e(TAG, "Native embedding operation failed", error);
                call.reject(error.getMessage() == null ? error.getClass().getSimpleName()
                    : error.getMessage(), new Exception(error));
            }
        }, () -> call.reject(background.isClosed() ? "NATIVE_PLUGIN_CLOSED" : "NATIVE_PLUGIN_UNAVAILABLE"));
    }

    private NativeOnnxModelSet modelFiles() {
        if (modelSet == null) modelSet = new NativeOnnxModelSet(new File(getContext().getFilesDir(), "worldinfo-ort/embeddinggemma-q4-v1/onnx"));
        return modelSet;
    }
    private File modelDir() throws IOException { return modelFiles().recover(); }
    private File importDir() throws IOException { return modelImportId == null ? modelDir() : modelFiles().staging(); }
    private void requireModelOwner(PluginCall call) {
        if (!java.util.Objects.equals(modelImportId, call.getString("modelImportId"))) throw new IllegalStateException("No matching native model import");
    }

    @PluginMethod
    public void beginModelImport(PluginCall call) {
        execute(call, () -> {
            String id = call.getString("modelImportId");
            if (id == null || !id.matches("[A-Za-z0-9_-]{1,80}")) throw new IllegalArgumentException("Invalid model import ID");
            if (modelImportId != null || writer != null || session != null) throw new IllegalStateException("Another native model operation is active");
            modelFiles().begin();
            modelImportId = id;
            call.resolve();
        });
    }
    @PluginMethod
    public void commitModelImport(PluginCall call) {
        execute(call, () -> {
            requireModelOwner(call);
            if (modelImportId == null || activeName != null) throw new IllegalStateException("Finish both model files first");
            modelFiles().commit(); modelImportId = null; call.resolve();
        });
    }
    @PluginMethod
    public void abortModelImport(PluginCall call) {
        execute(call, () -> {
            if (modelImportId != null && modelImportId.equals(call.getString("modelImportId"))) {
                closeWriter(); modelFiles().abort(); modelImportId = null;
            }
            call.resolve();
        });
    }

    private String checkedName(PluginCall call) {
        String name = call.getString("fileName");
        if (!GRAPH.equals(name) && !WEIGHTS.equals(name)) {
            throw new IllegalArgumentException("Unsupported model file: " + name);
        }
        return name;
    }

    private boolean fileReady(File dir, String name) {
        File file = new File(dir, name);
        File marker = new File(dir, name + ".ok");
        return NativeModelFiles.onnxReady(file, marker, GRAPH.equals(name) ? 1024 : 1024 * 1024);
    }

    private void closeWriter() {
        if (writer != null) try { writer.close(); } catch (IOException ignored) {}
        writer = null;
        activeName = null;
        activeImportId = null;
        bytesWritten = 0;
        importDigest = null;
    }

    private void closeSession() {
        if (session != null) try { session.close(); } catch (Exception ignored) {}
        session = null;
        sessionBackend = null;
    }

    @PluginMethod
    public void status(PluginCall call) {
        execute(call, () -> {
            File dir = modelDir();
            JSObject result = new JSObject();
            boolean graph = fileReady(dir, GRAPH);
            boolean weights = fileReady(dir, WEIGHTS);
            result.put("modelSetImportVersion", 1);
            result.put("modelImportActive", modelImportId != null);
            result.put("graphReady", graph);
            result.put("weightsReady", weights);
            result.put("modelReady", graph && weights);
            result.put("sessionReady", session != null);
            result.put("backend", sessionBackend == null ? "" : sessionBackend);
            result.put("usableBytes", dir.getUsableSpace());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void beginFile(PluginCall call) {
        execute(call, () -> {
            requireModelOwner(call);
            String name = checkedName(call);
            if (session != null) throw new IllegalStateException("Unload ONNX before replacing model files");
            File dir = importDir();
            if (dir.getUsableSpace() < 4L * 1024 * 1024) {
                throw new IOException("Not enough storage space to import ONNX model");
            }
            String importId = call.getString("importId");
            if (importId != null && !importId.matches("[A-Za-z0-9_-]{1,80}")) throw new IllegalArgumentException("Invalid native import ID");
            if (activeName != null && (activeImportId != null || importId != null)) throw new IllegalStateException("Another native model import is active");
            closeWriter();
            File target = new File(dir, name + ".part");
            if (target.exists() && !target.delete()) throw new IOException("Cannot clear stale native import");
            writer = new BufferedOutputStream(new FileOutputStream(target), 128 * 1024);
            importDigest = MessageDigest.getInstance("SHA-256");
            activeName = name;
            activeImportId = importId;
            bytesWritten = 0;
            call.resolve();
        });
    }

    @PluginMethod
    public void appendChunk(PluginCall call) {
        execute(call, () -> {
            requireModelOwner(call);
            String name = checkedName(call);
            if (writer == null || !name.equals(activeName) || !java.util.Objects.equals(activeImportId, call.getString("importId"))) {
                throw new IllegalStateException("No active native import for " + name);
            }
            String encoded = call.getString("base64");
            if (encoded == null || encoded.isEmpty() || encoded.length() > 1100000) {
                throw new IllegalArgumentException("Invalid native model chunk");
            }
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            if (bytes.length > MAX_CHUNK_BYTES || bytes.length == 0) {
                throw new IllegalArgumentException("Native model chunk too large");
            }
            writer.write(bytes);
            importDigest.update(bytes);
            bytesWritten += bytes.length;
            JSObject result = new JSObject();
            result.put("writtenBytes", bytesWritten);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void finishFile(PluginCall call) {
        execute(call, () -> {
            requireModelOwner(call);
            String name = checkedName(call);
            if (writer == null || !name.equals(activeName) || !java.util.Objects.equals(activeImportId, call.getString("importId"))) {
                throw new IllegalStateException("No active native import for " + name);
            }
            long size = bytesWritten;
            Long expected = call.getLong("expectedBytes");
            if (expected != null && expected != size) throw new IOException("Native model byte count mismatch");
            if (size < (GRAPH.equals(name) ? 1024 : 1024 * 1024)) {
                throw new IOException("Native model file appears incomplete (" + size + " bytes)");
            }
            writer.flush();
            writer.close();
            writer = null;
            File dir = importDir();
            File partial = new File(dir, name + ".part");
            File target = new File(dir, name);
            byte[] hash = importDigest.digest();
            StringBuilder sha = new StringBuilder(hash.length * 2);
            for (byte value : hash) sha.append(String.format(java.util.Locale.ROOT, "%02x", value & 0xff));
            NativeModelFiles.commit(partial, target, new File(dir, name + ".ok"), size + ":" + sha, size);
            closeWriter();
            JSObject result = new JSObject();
            result.put("bytes", size);
            result.put("sha256", sha.toString());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void abortFile(PluginCall call) {
        execute(call, () -> {
            requireModelOwner(call);
            String name = checkedName(call);
            if (name.equals(activeName) && java.util.Objects.equals(activeImportId, call.getString("importId"))) {
                closeWriter();
                File partial = new File(importDir(), name + ".part");
                if (partial.exists() && !partial.delete()) throw new IOException("Cannot remove partial model import");
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        execute(call, () -> {
            String backend = call.getString("backend");
            if (backend == null || backend.isEmpty()) backend = "CPU";
            if (!"CPU".equals(backend) && !"XNNPACK".equals(backend)) {
                throw new IllegalArgumentException("Native backend must be CPU or XNNPACK");
            }
            if (activeName != null || modelImportId != null) throw new IllegalStateException("Finish native model import before loading");
            File dir = modelDir();
            if (!fileReady(dir, GRAPH) || !fileReady(dir, WEIGHTS)) {
                throw new IOException("Native model missing: copy cached Q4 graph and weights first");
            }
            if (session != null && backend.equals(sessionBackend)) {
                JSObject result = new JSObject();
                result.put("backend", sessionBackend);
                result.put("reused", true);
                call.resolve(result);
                return;
            }
            closeSession();
            if (environment == null) environment = OrtEnvironment.getEnvironment();
            long started = android.os.SystemClock.elapsedRealtime();
            try (OrtSession.SessionOptions options = new OrtSession.SessionOptions()) {
                options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                if ("XNNPACK".equals(backend)) {
                    options.setIntraOpNumThreads(1);
                    Map<String, String> config = new HashMap<>();
                    config.put("intra_op_num_threads",
                        Integer.toString(Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors()))));
                    options.addXnnpack(config);
                } else {
                    options.setIntraOpNumThreads(
                        Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors())));
                }
                session = environment.createSession(new File(dir, GRAPH).getAbsolutePath(), options);
                Set<String> inputs = session.getInputNames();
                if (!inputs.contains("input_ids") || !inputs.contains("attention_mask")
                    || !session.getOutputNames().contains("sentence_embedding")) {
                    closeSession();
                    throw new IOException("ONNX model I/O mismatch: expected input_ids, attention_mask and sentence_embedding");
                }
                sessionBackend = backend;
            }
            JSObject result = new JSObject();
            result.put("backend", backend);
            result.put("reused", false);
            result.put("loadMs", android.os.SystemClock.elapsedRealtime() - started);
            call.resolve(result);
        });
    }

    private long[] unpackRows(JSONArray rows, int batch, int sequence, String label) throws Exception {
        if (rows == null || rows.length() != batch) {
            throw new IllegalArgumentException("Invalid " + label + " row count");
        }
        long[] values = new long[batch * sequence];
        for (int row = 0; row < batch; row++) {
            JSONArray data = rows.getJSONArray(row);
            if (data.length() != sequence) throw new IllegalArgumentException("Uneven " + label + " shape");
            for (int token = 0; token < sequence; token++) {
                values[row * sequence + token] = data.getLong(token);
            }
        }
        return values;
    }

    @PluginMethod
    public void embed(PluginCall call) {
        execute(call, () -> {
            if (session == null || environment == null) {
                throw new IllegalStateException("Native ONNX session has not been loaded");
            }
            JSArray idsRows = call.getArray("inputIds");
            JSArray masksRows = call.getArray("attentionMask");
            if (idsRows == null || masksRows == null) {
                throw new IllegalArgumentException("Missing tokenized ONNX inputs");
            }
            int batch = idsRows.length();
            if (batch < 1 || batch > MAX_BATCH) throw new IllegalArgumentException("Invalid native batch: " + batch);
            int sequence = idsRows.getJSONArray(0).length();
            if (sequence < 1 || sequence > MAX_INPUT_TOKENS) {
                throw new IllegalArgumentException("Invalid sequence length: " + sequence);
            }
            long[] ids = unpackRows(idsRows, batch, sequence, "input_ids");
            long[] masks = unpackRows(masksRows, batch, sequence, "attention_mask");
            long[] shape = new long[] { batch, sequence };
            long started = android.os.SystemClock.elapsedRealtime();
            JSArray outputRows = new JSArray();
            try (OnnxTensor tokens = OnnxTensor.createTensor(environment, LongBuffer.wrap(ids), shape);
                 OnnxTensor attention = OnnxTensor.createTensor(environment, LongBuffer.wrap(masks), shape)) {
                Map<String, OnnxTensor> inputs = new HashMap<>();
                inputs.put("input_ids", tokens);
                inputs.put("attention_mask", attention);
                OnnxTensor tokenTypes = null;
                try {
                    if (session.getInputNames().contains("token_type_ids")) {
                        tokenTypes = OnnxTensor.createTensor(environment,
                            LongBuffer.wrap(new long[batch * sequence]), shape);
                        inputs.put("token_type_ids", tokenTypes);
                    }
                    try (OrtSession.Result results = session.run(inputs)) {
                        OnnxValue value = results.get("sentence_embedding").orElse(null);
                        if (!(value instanceof OnnxTensor)) {
                            throw new IOException("ONNX did not return sentence_embedding tensor");
                        }
                        Object raw = ((OnnxTensor) value).getValue();
                        if (!(raw instanceof float[][])) {
                            throw new IOException("Unexpected sentence_embedding dimensions");
                        }
                        float[][] vectors = (float[][]) raw;
                        if (vectors.length != batch) {
                            throw new IOException("ONNX returned mismatched batch size");
                        }
                        for (float[] vector : vectors) {
                            if (vector.length != DIMENSIONS) {
                                throw new IOException("Unexpected ONNX embedding dimension: " + vector.length);
                            }
                            JSArray row = new JSArray();
                            for (float element : vector) {
                                if (!Float.isFinite(element)) throw new IOException("Non-finite ONNX embedding");
                                row.put(element);
                            }
                            outputRows.put(row);
                        }
                    }
                } finally {
                    if (tokenTypes != null) tokenTypes.close();
                }
            }
            JSObject result = new JSObject();
            result.put("vectors", outputRows);
            result.put("onnxMs", android.os.SystemClock.elapsedRealtime() - started);
            result.put("backend", sessionBackend);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void unload(PluginCall call) {
        execute(call, () -> {
            closeSession();
            call.resolve();
        });
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        execute(call, () -> {
            closeSession();
            closeWriter();
            modelFiles().delete(); modelImportId = null;
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        background.close(() -> {
            closeWriter(); closeSession();
            if (modelImportId != null) {
                try { modelFiles().abort(); } catch (IOException failure) { Log.w(TAG, "Cannot remove staged model", failure); }
                modelImportId = null;
            }
        });
        super.handleOnDestroy();
    }
}
