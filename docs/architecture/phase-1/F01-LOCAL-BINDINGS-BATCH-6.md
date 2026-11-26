# F01 — Runtime and settings local names (batch 6)

The local naming pass extends to five modules:

- `src/runtime/card-runtime/host/compatibility-data.js`
- `src/runtime/card-runtime/host/context-adapters.js`
- `src/features/state/feature-settings.js`
- `src/features/world-info/ui/embedding-sync-hook.js`
- `src/diagnostics/card-runtime-diagnostics.js`

Existing factory result keys and dependency keys stay compatible. Portable mirrors use the existing import layout. Representative regressions check range resolution, sampling overrides, message/swipe serialization, runtime context, diagnostics and settings migration. No UI redesign, security policy change, performance optimization or feature change is intended. Full CI and AST inventory are the acceptance evidence.
