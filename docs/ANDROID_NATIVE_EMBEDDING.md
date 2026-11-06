# Android EmbeddingGemma: ONNX Runtime native (Q4)

## Runtime routing

- **Android APK (Capacitor), EmbeddingGemma 300M Q4, offline:** ONNX Runtime Android 1.29.0 native plugin, mandatory. Selected provider/model remains `huggingworld/embeddinggemma-300m-ONNX`. The model's `sentence_embedding` output produces 768 values normalized in JS before indexing.
- **Android browser:** existing WASM code path, because no Android plugin exists outside the APK.
- **Desktop browser:** existing WebGPU/WASM path.
- **Qwen3 0.6B:** existing offline WASM path. Gemini: existing online path. No implicit provider/mode switching.

## Reusing previously downloaded model

The native engine cannot directly open files inside the browser's Cache API. On the first offline sync in the Android APK:

1. Check that `onnx/model_q4.onnx` and `onnx/model_q4.onnx_data` are present in the Transformers.js Cache API.
2. Stream each cached response from WebView JS in bounded 512 KiB chunks into `WorldInfoEmbeddingNative.appendChunk`, without network requests or `response.arrayBuffer()`.
3. Save an additional private copy under `files/worldinfo-ort/embeddinggemma-q4-v1/onnx`. Only mark a file complete after the last chunk is closed. Reuse completed native files on later syncs. Keep existing web cache untouched for the tokenizer and Settings download UI.
4. Initialize ONNX Runtime native on a dedicated Java worker thread; tokenize with the same Transformers.js `AutoTokenizer`, padding and max_length as before.
5. Feed `input_ids` and `attention_mask` into native ORT, optionally `token_type_ids` if required by the graph. Require output `sentence_embedding`. No replacement model or alternative algorithm is selected on failure.

The first migration may take time and require an *additional* ~200 MB private storage. Do not uninstall/clear app data: this would erase the existing cache. If cache files are missing, the error tells the user to download the **same model** via Smart Scan Settings; there is **no network download fallback during sync**.

A native model can be deleted from Smart Scan Settings along with its browser cache using `deleteModel`. The normal end-of-sync unload closes the ONNX session but retains the native model files for next time.

## Console markers

Logs already use the existing `[WI-SYNC #…]` journal in **1. BẢNG ĐIỀU KHIỂN HỆ THỐNG (CONSOLE)**:

- Transfer from browser cache (graph / external Q4 data), in MiB.
- Load native ONNX runtime: backend `CPU` and elapsed ms.
- Per-batch tokenization and `ONNX` ms, together with vectors/s.
- IndexedDB write and failure checkpoints.

The native class also contains XNNPACK support, but **CPU is the explicit initial backend** pending real-device benchmarks, since the user has already experienced WebView crashes. XNNPACK is not automatically selected and is not a fallback.

## Verification limits

GitHub CI checks JavaScript behavior and compiles a debug APK with `com.microsoft.onnxruntime:onnxruntime-android:1.29.0`, verifying `libonnxruntime.so` is packaged. GitHub Actions **does not run the 200 MB Q4 model inside an Android phone**. The user should validate the native graph and vector throughput on the target phone before treating the feature as production-ready. If native loading fails, the embedding sync must fail explicitly without switching to WASM, keyword scan, another embedding model or online service.
