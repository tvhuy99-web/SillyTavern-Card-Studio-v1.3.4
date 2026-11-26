# Phase 1 release gates (Block D iteration 4)

This is a local architecture candidate, not production acceptance. Do not promote the package-backed build, publish an APK, or begin the performance/UI redesign as though every gate had passed. The portable deployment remains the default. Keep a known-good data backup before testing migrations. Tests involving credentials must use a dedicated test account and must not publish secrets in evidence.

## Consolidated gates

| Gate | Blocks | Current evidence | Required action / pass criterion |
|---|---|---|---|
| Portable source build and generated asset parity | A, C, D | PASS locally | `npm run build && npm test`, 70 test files in this candidate; committed generated assets must match build |
| Source-native ESM graph | A, C | PASS locally (root lookup only) | `npm run build:source && npm run test:source-bootstrap`; verify source manifest and browser mount independently |
| Static dependency and ownership audit | A, C, D | PASS for the measured literal graph; 18 lexical candidates dispositioned | Run `tools/audit-module-graph.cjs` and `tools/audit-source-ownership.cjs` with TypeScript 5.8.3; computed imports and assembled runtime require separate tests |
| Real React mount and navigation | A, D | BLOCKED: Chromium returned no acceptance result | Run `npm run test:app-browser` on a working Chrome runner; repeat with `APP_DIST=dist-source` and package build once available |
| IndexedDB transactions, migration and multi-tab ownership | A, D | BLOCKED: real browser runner timed out | `npm run test:storage-browser`; run two-tab scenario with a real chat, ensure stale tab reports a failed save and can export unsaved edits; verify backups and recovery UX |
| External Card/runtime compatibility and isolation | A, D | OPEN: VM tests and host permission tests passed only | Test representative trusted/untrusted cards for both compatibility modes and engines; verify handshake, popup, iframe reload/navigation, timeout and state updates; ensure initial load cancellation does not regress working cards. Opaque-origin frame navigation and noncooperative domain side effects are not fully isolated |
| Real provider configuration and generation | D | OPEN: mock transport only | Test Gemini, OpenRouter, both Proxy protocols, AI Studio with dedicated test accounts. Check custom model, tool calls, streaming, cancellation, Model Test, profile switching, overlapping catalog refreshes and redaction |
| Historical summaries / RPG restoration | D | PARTIAL: pinned summary width, rewind tests | Verify older backups without chunk metadata, edited historical messages, imported RPG without snapshots, regen/swipes, arena and lorebook snapshots; do not promise exact historical reconstruction when records lack metadata |
| Android Java contracts and overlay | B | PASS locally (JDK only) | `npm run test:native-java && npm run test:android-overlay`; not an Android compilation |
| Android SDK/Gradle compile and APK | B | BLOCKED: SDK and Gradle unavailable | Run `.github/workflows/android-apk.yml` on supported build runner, inspect compile and signing output; install on device and validate lifecycle, foreground/wake lock, WebView/AI Studio cancellation, SAF picker/recovery, ONNX pair and LiteRT inference |
| Official npm dependencies and licensing | C | BLOCKED: registry DNS failure / missing esbuild | Run `npm install --prefix build/npm-runtime` in connected environment, review and commit actual lockfile and license provenance, then `npm ci --prefix build/npm-runtime`, `npm run audit:npm-dependencies && npm run build:npm && npm run test:npm-runtime`; run package-backed bootstrap and browser acceptance before switching defaults |
| Vendor snapshot integrity | C | PASS (12 files), licenses not certified | `npm run verify:vendor`; track provenance and legal review separately |

## Remaining architecture (not hidden in the acceptance score)

- A: recovered names and dependency getters still exist; browser mount and interaction not accepted.
- B: device-only lifecycle, SAF picker restoration, native inference migration and Android build remain open.
- C: verified npm install, lockfile, licenses, package-backed React build and removal of vendor snapshots remain open.
- D: cross-tab catalog mutations and fully atomic cross-storage restore are not solved; old Model Test DOM enhancer is still active outside API Settings; old summaries and RPG records lack full historical provenance; Safe opaque frames cannot be distinguished from every remote navigation by origin alone; a noncooperative RPC may complete a side effect after timeout. Full compatibility mode remains trusted-only.
- Historical audit/parity tools document prior migrations and may require exact historical inputs. Do not treat them as acceptance for the current source; use the current graph and source ownership tools instead.

## Release decision

A 94%, B 87%, C 79%, D 92% are engineering estimates under the previously established separate weighted rubrics, not a single product-completion percentage. No credit for failed/unexecuted real-browser, APK or npm acceptance. The local candidate is suitable for source review and controlled regression testing; promotion requires the gates above. No GitHub push or CI execution performed here.
