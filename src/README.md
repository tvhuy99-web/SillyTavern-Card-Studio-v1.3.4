# Source migration workspace

The `src/` tree is the source-of-truth for migrated subsystems. The legacy minified bundle remains a transitional input only for areas that have not yet been extracted.

Current owned areas:
- `features/presets/`: prompt/preset normalization boundaries;
- `providers/proxy/`: proxy metadata and credential persistence;
- `runtime/card-runtime/`: modular Card Runtime source and compatibility surface.

Do not copy the whole legacy bundle into `src/`. Move a subsystem only after its ownership/state boundary is explicit and its old patch can be removed.
