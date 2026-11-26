# Block B – Native recovery and request ownership (87%)

Baseline: `STCS-Phase1-Block-B.zip` (622 files, B 77%, A 94%). This increment preserves the original app ID, schema, model IDs, native library versions, Android configuration, CSS, host, runtime and legacy input. Generated assets are rebuilt from source. No push, APK assembly, emulator or device test.

## Changes

- **Native worker ownership:** `NativeSerialWorker` now reserves a named resource across plugin instances within one process, and releases it only after cleanup. A recreated Activity cannot concurrently use the old ONNX, LiteRT or SAF worker. The new instance receives an unavailable error until ownership is released; no attempt is made to interrupt an executing native inference. This is not an inter-process file lock.
- **JS native bridge:** `awaitNativeDeadline`, `acquireNativeListener`, `releaseNativeListener` unify bounded waiting, cancellation and late listener cleanup. A detached callback is disabled even when native removal hangs. Applied to AI Studio text, stream, opening the session, model catalog, visibility and diagnostics registration. Native generation fallback deadline is 510 seconds (covers readiness plus the 300-second generation watchdog); listener registration and cleanup default to 10 and 2 seconds. Timeout requests scoped cancellation but does not prove a native operation stopped. Persistent diagnostics listeners remain app-lifetime.
- **AI Studio:** `NativeRequestLedger` retains 128 cancelled explicit IDs to prevent cancel-before-generate races. IDs are validated, not truncated; missing IDs get a generated ID for backward compatibility. Explicit cancel reserves the old WebView, immediately rejects the pending generation, attempts one unambiguous Stop control in the first-party document (only after the script clicked submit), and destroys the old WebView on completion or after 1.5 seconds. New generation/catalog is refused during this cleanup. Native watchdog is reset after readiness to match the generation timeout. If generation fails after dispatching submit, the old WebView is released. Neither a clicked Stop nor destroyed WebView guarantees remote cancellation. Actual site selectors, sign-in and foreground behavior require device testing.
- **SAF export:** `NativeExportJournal` records the selected filename and export ID before opening the document. The last uncertain receipt is retained after interruption; confirmation/acknowledgement is ID-scoped. `getInterruptedSave` and `acknowledgeInterruptedSave` expose receipt metadata (no URI); JS emits a diagnostic if recovery is reported. An orphan picker callback rejects instead of attaching to a different export. `expectedBytes` is checked before closing the destination. Failed writes still attempt deletion of their own partial document; restart recovery never deletes or reopens a possibly completed user document. A crash before receipt creation is not covered. A restored picker is not transparently resumed; arbitrary imports still use the existing WebView file input. Receipt is informational, not automatic resumption or validation.
- **ONNX pair import:** `NativeOnnxModelSet` adds sibling `.staged` and `.previous` directories; `beginModelImport`, `commitModelImport`, `abortModelImport` are scoped to one model import ID and both files must pass the existing per-file checks before publication. Existing active `onnx/` directory and marker formats preserved. If interrupted between directory renames, recover the previous directory; if interrupted after publication, keep the complete new pair. No arbitrary directory contents removed. JS detects `modelSetImportVersion: 1`, selects both cached responses from the same cache/origin/revision path/query, stages graph and weights together, verifies byte counts, then commits or aborts. No network fallback. Earlier APKs retain per-file fallback; their existing model pairs are not rehashed or proven to share a revision. A mutable revision path does not prove identical content revision. This handles process interruption under ordinary filesystem semantics, not guaranteed atomic durability under power loss or external disk corruption. It needs space for old and staged model files. LiteRT remains single-file and benefits from the named worker ownership.

## Verification

| Check | Result |
|---|---|
| Build | PASS |
| Regression | 63/63 file suites PASS (added `phase1-block-b-recovery.mjs`) |
| JDK 21 | PASS, 10 pure helper/script classes compiled; all 19 Java files syntax parsed |
| JVM-decoded WebView script syntax | 4/4 PASS |
| Java behavioral tests | worker close and recreation, cancellation ledger, model pair interrupted rename recovery, export journal, old marker format |
| JS behavioral tests | deadlines, abandoned/late listeners, Stop selector negative cases, ONNX staging and cache pair provenance, byte mismatch, export expected bytes |
| Android overlay | PASS (two fixture applications, manifest/config/source parity) |
| Static ESM graph | src 153 nodes / 194 edges; assets 156 nodes / 195 edges; zero parse errors, unresolved literal imports or detected cycles |
| Android SDK/Gradle type-check, APK, physical device | NOT RUN (SDK and Gradle absent) |

Evidence: `evidence/block-b-recovery-{build,tests,native-java,overlay}.txt`, `evidence/block-b-recovery-module-graph.json`. Static graph is not a full dynamic call graph. Pure JDK tests are not Android framework type-checking.

## Progress, using previous B weights

| Area | Weight | Prior | Current |
|---|---:|---:|---:|
| Activity/config/build pipeline | 15 | 15 | 15 |
| Bridge/worker/resources | 15 | 13 | 15 |
| AI Studio/WebView/generation | 25 | 20 | 24 |
| File import/export/SAF | 15 | 12 | 14 |
| Native embedding/storage/inference | 15 | 12 | 14 |
| Local tests and contracts | 5 | 5 | 5 |
| APK/device acceptance | 10 | 0 | 0 |
| Total | 100 | 77 | 87 |

These are weighted engineering estimates, not counts of implemented methods or elapsed time. A stays 94%. Remaining source-level 3 points: AI Studio page/session stop and ownership beyond the current plugin instance; SAF picker restoration/import and user-facing receipt handling; inference lifetime/legacy pair migration and durability. Device acceptance 10 points remain unearned. Recommend start C rather than defer dependency/legacy cleanup until hardware is available; reserve Android validation for D and re-open B if compile or device tests fail.

## Device acceptance additions

- Build with actual Capacitor 8/SDK 36/Gradle, verify four plugin registrations and new ONNX/SAF methods; no claim about Android API signatures from syntax parsing.
- Rapid cancel followed by new generation, cancel before bridge submission, explicit stop visible/hidden, website control absent, renderer death, permission denied, Home and rotation; verify no stale updates and bounded local cancellation, not server billing.
- Start export and rotate/kill process at picker, open, during writes, after close; check `getInterruptedSave`, user file retained, no silent duplicate, byte mismatch and provider errors, import via file input and cancel.
- On compatible device interrupt pair import before/after each publish step; verify old complete model preserved, both new files appear together, stale import ID rejected, no cross-Activity writer or inference, insufficient disk handled, old APK fallback understood. Run ONNX CPU/XNNPACK and LiteRT CPU/GPU with actual supported models and check unload/recreate. No automatic model fallback.
