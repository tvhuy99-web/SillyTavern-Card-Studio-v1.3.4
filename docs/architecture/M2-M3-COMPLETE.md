# Mốc 2 + Mốc 3 — Ownership boundaries complete

## Mốc 2

Prompt/preset repair is scoped to preset boundaries. Proxy persistence is owned by `src/providers/proxy/persistence.js`. Production no longer patches `JSON.parse`, `JSON.stringify`, `structuredClone`, `Map.prototype.get` or `Storage.prototype` for these features.

## Mốc 3

Card Runtime is source-owned and split into 17 build-time subsystem fragments. They are composed into one classic iframe runtime during build so the existing opaque-origin sandbox and CSP/CORS behavior do not change.

The former 100+ KB `core.template.js` is now bootstrap/composition glue.

Production boot uses generated prompt normalizer, proxy persistence service, Card Runtime core builder and renderer. CI guards against reintroducing the removed global patches or Card Runtime monolith.
