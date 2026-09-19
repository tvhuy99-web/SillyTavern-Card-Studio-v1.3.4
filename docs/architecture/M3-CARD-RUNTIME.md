# Mốc 3 — Modular Card Runtime

Card Runtime is fully source-owned outside the minified application bundle and is no longer maintained as one 100+ KB template.

`core.template.js` is bootstrap/composition glue. Runtime behavior is owned by 17 subsystem fragments under `src/runtime/card-runtime/modules/`, while SillyTavern/TavernHelper compatibility remains under `compat/`.

The fragments are composed at build time into the same classic runtime script, so the iframe still does not need `allow-same-origin`, runtime imports, new CORS access or a new CSP exception.
