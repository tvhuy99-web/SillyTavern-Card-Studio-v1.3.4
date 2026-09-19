# Proxy provider persistence

`persistence.js` is the only owner of proxy profile metadata and proxy credentials.

- profile metadata is persistent;
- credentials are session-only by default;
- persistent credentials require explicit opt-in;
- backup/restore calls the service explicitly;
- production does not patch `Storage.prototype` and does not observe the DOM to infer persistence state.

The legacy minified application bundle is wired to this service at build time by `build/transforms/proxy-persistence.mjs` until the settings UI moves to normal source in Mốc 4.
