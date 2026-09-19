# Card Runtime modules

These files are source-owned build fragments composed into one classic iframe script at build time.

They are not runtime ES-module imports. Safe-mode iframes remain opaque-origin and therefore acquire no new CORS, CSP or `allow-same-origin` dependency.

The split is an ownership boundary: edit the subsystem module, rebuild, and never patch the generated core builder directly.
