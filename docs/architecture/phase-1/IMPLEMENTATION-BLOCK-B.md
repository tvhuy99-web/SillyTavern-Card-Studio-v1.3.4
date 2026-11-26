# Khối B – Android Native Architecture (77%)

## Baseline and scope

Baseline: `STCS-Phase1-Block-A-94.zip`, 597 files, 6 native Java source files.
Block A remains 94%. This release changes all four native Capacitor plugins, AI Studio catalog reader and foreground service; adds ten Java owners, a platform bridge, source-owned Android overlay, JVM and JS tests. No changes to CSS, legacy input, Card Runtime source, vendor source, app host, database schema, package ID, signing certificate, native model IDs, private directories or marker formats. No APK assembled and no GitHub push.

## Implementation

- `MainActivity.java`, `capacitor.config.json`, `config/native-dependencies.gradle`, `tools/prepare-android.py`: canonical native project overlay; all Java sources copied, manifest edited structurally, idempotent Gradle apply. Existing ARM64, Capacitor 8, Android SDK 36, ONNX/LiteRT/WebKit dependencies, optional OpenCL libraries and public debug signing preserved. CI runs all regression tests, JDK tests and overlay fixture before APK assembly.
- `NativeSerialWorker`: owner for export, LiteRT and ONNX tasks; admission rejected after close; queued work rejected, cleanup after in-flight operation; LiteRT download/hash checks closure. No claim of interruptible native inference.
- AI Studio: `AiStudioPageScripts`, `AiStudioPanel`, `AiStudioWebViewPolicy`, `AiStudioOrigin`, `AiStudioCompletionPolicy`, `NativeGenerationLease`. Separate display, selectors, exact HTTPS origin checks (before evaluation and in executing JS), renderer-loss handling, response completion policy, service token and wake lock lifecycle. Every poll captures its original PluginCall; watchdog independent of evaluateJavascript callback; local cancellation scoped by requestId and late listener cleanup. Removed two unused model-catalog scripts and one unused offscreen helper. Preserve legacy cancel with omitted ID. No credential extraction or login bypass. Website stop is not guaranteed.
- Export: `NativeExportSession` reserves picker/open/writes until terminal state; internal revision and optional externally returned `exportId` guard append/finish/abort. Worker owns output/URI; write/open failures best-effort delete partial SAF document; successful file commit not coupled to toast. JS reader cleanup, serialized queue and reference-counted blob URL holds. Native file import of arbitrary user documents remains on the existing WebView/file input route, not a new plugin.
- Embedding: `NativeModelFiles` stages per-file markers, syncs partial files, avoids pre-deleting old model before rename; old ONNX marker size/hash syntax and LiteRT hash marker validated. `importId` scopes ONNX begin/append/finish/abort, reader cleanup on JS failure. Two-file ONNX commit and cross-Activity/model-process concurrency not fully transactional. Full file hash not recomputed on status. Native inference/driver tests not run.
- `src/platform/android/native-bridge.js`: common plugin names, explicit Android capability discovery; applied to provider settings, AI Studio, export, ONNX, LiteRT. Explicit web/iOS rejected; compatibility fallback for nativePromise-only bridges retained. Old APKs ignore optional ownership fields; rebuild APK with new assets for end-to-end ownership protection.

## Acceptance evidence (local)

| Check | Result |
|---|---|
| `npm run build` | PASS |
| `npm test` | 62/62 test files PASS |
| `npm run test:native-java` | PASS: 7 pure JDK helper/script classes compiled, 16 Java files syntax parsed; 4 JVM-decoded script expressions parsed in Node |
| `npm run test:android-overlay` | PASS: two applications to disposable project fixture, permissions/manifest/Gradle/source parity/4 plugin registrations |
| AST graph (TypeScript) | src 153 nodes/193 edges; assets 156 nodes/194 edges; 0 parse errors, unresolved literal imports or detected cycles |
| Full Android SDK type-check, Gradle compile, APK, emulator/physical Android | NOT RUN: Android SDK/android.jar/Gradle absent locally |
| Live Google sign-in, website DOM, model inference GPU/CPU, SAF provider, lifecycle/notification on device | NOT RUN |

See `evidence/block-b-{build,tests,native-java,overlay}.txt` and `block-b-module-graph.json`. Graph is limited to literal ESM imports, not complete call graph. Node and JDK tests simulate bridge and pure native state; no Android framework runtime.

## Progress (estimated weighted scope)

| Area | Weight | Earned |
|---|---:|---:|
| Activity / config / pipeline source ownership | 15 | 15 |
| Bridge / worker / resource lifecycle | 15 | 13 |
| AI Studio / WebView / generation | 25 | 20 |
| File import/export / SAF | 15 | 12 |
| Native embedding / storage / inference | 15 | 12 |
| Local regression and contracts | 5 | 5 |
| APK/device acceptance | 10 | 0 |
| Total | 100 | 77 |

The remaining 23 points are 13 source/contract points (lifecycle across Activity recreation, permission/UI and picker recovery, explicit website cancellation where safely supported, native file import boundary, multi-file ONNX integrity and engine lifetime) and 10 APK/device acceptance points. Ratings are engineering estimates, not measured elapsed time. A remains 94%.

## Device acceptance matrix (pending)

1. Generate/sync Capacitor, apply overlay, assemble debug, verify package ABI and stable signature using the existing CI checks. Verify generated APK actually registers all four plugins and exported service is false.
2. Test AI Studio login on real Android; open/hide panel; select models and thinking level; test cancel followed immediately by a new request, stale polls, renderer failure, screen rotation and activity/process recreation. Do not bypass blocked sign-in.
3. Test Home/return while generation runs, notification permission denied and granted, foreground service timeout/stop, wake lock cleanup, battery restrictions.
4. Export JSON/PNG/ZIP (including large files), cancel SAF picker, disk full, duplicate clicks, provider write failure, rotate/kill while picking. Confirm browser import behavior and no broad storage permission.
5. Import cached ONNX graph/weights, interrupt and retry, check old valid model/marker, load/unload CPU and XNNPACK; download/check LiteRT hash, run CPU/GPU tests; close Activity during download or inference. Verify no wrong model fallback and no model re-download on a valid existing marker.
