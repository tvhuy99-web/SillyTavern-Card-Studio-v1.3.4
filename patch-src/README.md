# Patch source and validation material

This directory is included to make the compatibility work auditable even though the uploaded release did not contain its original React/Vite source tree.

- `apply_compat_patch.py`: the structured patch used for the main embedded compatibility runtimes.
- `runtime-*-original.txt`: runtime templates preserved from the pre-1.3.6 bundle before patching.
- `runtime-current-*.txt`: runtime templates extracted from the final v1.3.6 bundle.
- `validate_package.py`: static package validation.
- `test-jszip.mjs`: runtime JSZip round-trip validation.
- `test-proxy-persistence.mjs`: regression coverage for proxy-profile migration, stale session cache handling, session-only secrets and opt-in remembered secrets.
- `test-chat-send-recovery.mjs`: regression coverage for stuck conversation sending state after HTTP/network failures and for safe composer recovery.
- `test-chat-send-recovery-v1.3.6.2.mjs`: regression coverage for intentional abort suppression, real network recovery, and Arena side-error isolation.
- `test-ui-version-display.mjs`: regression coverage for repairing the hard-coded visible application version without changing unrelated historical version text.
- `test-prompt-order-identifier-fix.mjs`: regression coverage for malformed/orphan prompt-order entries, frozen/read-only prompt arrays during serialization, and reorder lookups that would otherwise return `undefined` before `.identifier` is read.
- `test-card-runtime-dependency-compat.mjs`: regression coverage for the Vue Router 5.2.0 global-build bootstrap compatibility rewrite across iframe srcdoc and script resource assignment paths.
- `AUDIT-ARENA-UX-2026-08-15.md`: detailed Arena/chat user-experience audit and remaining bundle-level issues.

The release bundle also received small direct minified-bundle fixes after the structured patch, including model-response validation, session-only secret storage, basic Worldbook activation, slash-command dispatch, relative deployment paths and packaging metadata. The proxy persistence layer in `assets/proxy-persistence-fix-v1.3.6.js` runs before the main bundle so proxy profile metadata has one persistent source of truth while credentials remain session-only by default. Users can explicitly opt in to remembering proxy credentials on their device.

The chat recovery layer in `assets/chat-send-recovery-v1.3.6.2.js` runs before the main bundle. It watches conversation-style Fetch/XHR failures, visible error notifications and long-lived busy composer state. Intentional cancellation (`AbortError`, user-abort text, or XHR abort) is never treated as a fresh network failure, and while Arena still has an active side, a side-local fetch/HTTP failure cannot trigger the global Stop action. Real network failures, offline state and the long busy watchdog remain recoverable.

The UI version display layer in `assets/ui-version-display-fix-v1.3.6.js` runs before the main React bundle and watches the rendered application shell. Because the uploaded release has no original React/Vite source tree, the bundle can still render an older hard-coded `v1.3.4`/`v1.3.5` branding label even when release metadata is current. The layer only updates an old version label located in the nearest rendered container for the exact `SillyTavern Card Studio` brand, and leaves unrelated historical version text untouched.

The prompt-order identifier recovery layer in `assets/prompt-order-identifier-fix-v1.3.6.js` runs before the main bundle. It repairs malformed prompt/prompt-order data during JSON parsing, serialization and structured cloning, removes orphan custom prompt-order references, and narrowly recovers missing `Map.get(identifier)` results for maps whose entries match the Prompt Manager order schema. This prevents intermittent `Cannot read properties of undefined (reading 'identifier')` failures caused by a rendered prompt list temporarily containing an identifier that is absent from the in-memory prompt-order map. Hotfix `1.3.6.1` makes the serialization path non-mutating: frozen React/Immer character state is copied and filtered for JSON output instead of being edited with `splice()`. In-place sanitization also skips sealed/frozen arrays, preventing `Cannot delete property '<index>' of [object Array]` errors when default character data is read-only.

The card dependency compatibility layer in `assets/card-runtime-dependency-compat-v1.3.6.2.js` runs before the main bundle. It narrowly rewrites the development global build URL `vue-router@5.2.0/dist/vue-router.global.js` to the API-compatible 5.1.0 global build when card runtime HTML or script resources are assigned. Vue Router 5.2.0 introduced the `nostics` diagnostics dependency, while 5.1.0 did not include it; this avoids the observed `ReferenceError: nostics is not defined` bootstrap failure that otherwise leaves `window.VueRouter` missing and causes dependent card scripts such as MVUbeta to fail. Other resource URLs are left untouched.

The final bundle, compatibility report and runtime compatibility patches are the source of truth.
