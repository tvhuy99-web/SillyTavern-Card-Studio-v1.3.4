# Source migration workspace

The `src/` tree is the source-of-truth for migrated subsystems. The legacy minified bundle remains a transitional input only for areas that have not yet been extracted.

Current owned areas:
- `features/presets/`: prompt/preset normalization boundaries;
- `providers/proxy/`: proxy metadata/credential persistence and chat generation;
- `providers/openrouter/` + `providers/gemini/` + `providers/common/`: source-owned chat generation gateway;
- `features/chat/`: chat-turn business policy;
- `features/arena/`: Arena state-machine and retry/result invariants;
- `app/state/` + `app/persistence/`: runtime-state and persistent-session ownership;
- `diagnostics/`: diagnostics-only bounded state;
- `ui/runtime-guard.js`: service-driven runtime UI recovery;
- `ui/model-connection-test.js`: source-owned model test control enhancer;
- `ui/styles/accessibility.css`: accessibility/performance presentation policy;
- `runtime/card-runtime/`: modular Card Runtime source and compatibility surface.

Do not copy the whole legacy bundle into `src/`. Move a subsystem only after its ownership/state boundary is explicit and its old patch can be removed.
