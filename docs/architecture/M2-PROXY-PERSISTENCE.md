# Mốc 2 — Proxy persistence boundary

Mốc 2 is complete when prompt/preset normalization and proxy persistence both have domain owners and no global built-in monkey patch is required.

## Owner

- `src/features/presets/prompt-normalizer.js`
- `src/providers/proxy/persistence.js`
- `build/transforms/preset-boundary.mjs`
- `build/transforms/proxy-persistence.mjs`

Proxy profile metadata is persistent. Password/API-key fields are session-only by default and are persisted only after explicit opt-in. The legacy application bundle now calls this service directly for profile reads/writes, password reads/writes, remember-secrets state and full backup/restore.

The old `Storage.prototype` interception and DOM-observer persistence layer are removed from production.
