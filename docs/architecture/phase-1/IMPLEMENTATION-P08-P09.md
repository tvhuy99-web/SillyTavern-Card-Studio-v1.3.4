# Phase 1 — P08 RPC completion / P09 source recovery pilot

## Baseline and scope

- Input: `STCS-Phase1-P08-World.zip`, 312 files, original upstream baseline `398165a0954f98de6c3553f32e6af2308c963260`.
- Goal: remove the remaining business implementations from the Host RPC switch and begin recoverable React source. No CSS redesign, performance tuning, Android Java change, database schema change or legacy input edit.
- A switch still exists as transitional wiring. All 53 case labels are covered by extracted service handlers or thin generation bindings. This is not a claim that 53 independent domain implementations are fully migrated; slash execution and preset loading still invoke legacy callbacks, and some other handlers depend on legacy store actions.

## Remaining eight RPC methods

`src/runtime/card-runtime/host/utility-rpc.js` owns routing/argument conversion for `raw.import.character`, `raw.import.preset`, `raw.import.chat`, `slash.execute`, `generation.models`, `preset.get`, `preset.load`, `scripts.buttons`.

- Character and preset import now share strict mutation actions with the main UI. Character parser and preset parser remain injected legacy adapters. Parsing and preparation are followed by lease validation before the write. Same-name failed character imports no longer return an existing record as if the import had succeeded. Newly prepared avatar URL is released on failed import. On successful commit, global catalog reflects the committed record; stale requests do not override a changed selection. Already started transactions may still commit after a lease expires.
- Preset imports preserve the distinction between UI import (select on success, unless selection changed) and runtime import (do not select). Imported records are normalized using the existing normalizer. UI error reporting remains separate from strict exceptions.
- `src/features/chat/chat-import.js` owns JSON/JSONL normalization, preserving raw record, swipe data, reasoning, tool calls, attachments, variables and message metadata. Malformed/non-record rows are skipped; previous permissive empty-import behavior is retained. Session identity is captured before asynchronous decode; a lease check precedes storage. Uses `sessions.add`, so a same-ID conflict rejects rather than overwrites.
- Model listing uses `GenerationGateway.getCurrentModel()` for the active provider, including AI Studio. Custom endpoint model discovery still delegates to the existing Proxy Model Catalog adapter and retains the OpenAI-compatible default. Removed obsolete `Qh` resolver and custom-model-list transform entry.
- Slash and preset load are explicit injected legacy callbacks; internal side effects and error handling need later migration. `preset.load` retains its old success convention.

## P09 recovery pilot

`tools/audit-ui-components.cjs` uses TypeScript 5.8.3 AST and lexical symbol resolution to inventory top-level functions containing JSX factory calls. Output before extraction: 131 candidates; after extraction: 128. This heuristic is not a count of every React component. `Nd` (connection settings) has 132 JSX factory calls and 37 external lexical bindings, so it is not a safe first leaf extraction.

Three low-dependency components now live in `src/ui/components/recovered-primitives.js`: `ImmersiveContainer`, `LoadOlderButton`, `LoadingIndicator` (legacy names `lf`, `df`, `mn`). Named functions receive the existing JSX runtime through factories, preserving the React instance and stable component identity. The source uses readable JavaScript factory calls, not native JSX yet. The existing M6 transform file contains a temporary exact-anchor integration at build time; the normal host still depends on legacy. No new transform file. This is intentionally a reversible pilot, not a new permanent patch strategy.

Next recovery order: extract leaf UI without store access, then common control/field components, then feature views with explicit data/action contracts, then app navigation and composition. Recover React runtime dependencies into a standard package manifest/lockfile and native JSX build only after resolving vendor dependency provenance and verifying behavior in a browser. Keep Card Runtime iframe contract and public asset URLs until supported migration.

## Verification

- Node 22.16.0; npm 10.9.2; TypeScript 5.8.3.
- `npm run build`: PASS. `npm test`: 51/51 files PASS.
- Two new suites: `phase1-runtime-import-ownership.mjs`, `phase1-recovered-ui-primitives.mjs`. Existing runtime surface test updated from obsolete string assertion to new routing assertion.
- Render tree baseline comparison: 8 fixtures identical with callbacks normalized; separate tests check click behavior and accessibility props. No screenshots or browser E2E run.
- AST: 54 JS source modules, 58 JS deployed asset modules, 0 syntax parse errors, 0 unresolved literal relative paths, 0 cycles in literal import graph. 15 references to five new integration identifiers resolve; Qh has no references. The AST audit does not cover runtime/embedded dynamic dependencies.
- Production bundle 1,501,578 → 1,497,578 bytes; generated assets include the extracted code, so this is not a performance or total-size claim. CSS, Android Native, legacy input, runtime core and renderer unchanged.
- Evidence: `evidence/p08-final-*`, `evidence/p09-ui-inventory-{before,after}.json`, `evidence/p09-ui-parity.txt`.

## Outstanding limitations

No actual IndexedDB browser, real API, Android APK, real card compatibility or visual tests. No full rollback across IndexedDB and localStorage, no all-path shared mutation queue or cross-tab guarantees. No full recovery of React/JSX source, removal of legacy input, original vendor dependency restoration or P08/P09 acceptance. Security/permissions for frame RPC and lifecycle of in-flight host side effects remain incomplete. This snapshot is local, not pushed to GitHub.
