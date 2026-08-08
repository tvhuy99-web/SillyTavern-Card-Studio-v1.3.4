# Patch source and validation material

This directory is included to make the compatibility work auditable even though the uploaded release did not contain its original React/Vite source tree.

- `apply_compat_patch.py`: the structured patch used for the main embedded compatibility runtimes.
- `runtime-*-original.txt`: runtime templates extracted from the uploaded v1.3.4 bundle before patching.
- `runtime-current-*.txt`: runtime templates extracted from the final v1.3.5-compat bundle.
- `validate_package.py`: static package validation.
- `test-jszip.mjs`: runtime JSZip round-trip validation.
- `test-proxy-persistence.mjs`: regression coverage for proxy-profile migration, stale session cache handling, session-only secrets and opt-in remembered secrets.
- `test-chat-send-recovery.mjs`: regression coverage for stuck conversation sending state after HTTP/network failures and for safe composer recovery.

The release bundle also received small direct minified-bundle fixes after the structured patch, including model-response validation, session-only secret storage, basic Worldbook activation, slash-command dispatch, relative deployment paths and packaging metadata. The proxy persistence layer in `assets/proxy-persistence-fix-v1.3.5.js` runs before the main bundle so proxy profile metadata has one persistent source of truth while credentials remain session-only by default. Users can explicitly opt in to remembering proxy credentials on their device.

The chat recovery layer in `assets/chat-send-recovery-v1.3.5.js` also runs before the main bundle. It watches conversation-style Fetch/XHR failures, visible error notifications and long-lived busy composer state. When an error leaves the conversation composer stuck in sending mode, it invokes an explicit stop control when available, dispatches Escape, then clears only composer-local blocking attributes as a fallback. Unrelated asset requests are ignored. The final bundle, compatibility report and runtime compatibility patches are the source of truth.