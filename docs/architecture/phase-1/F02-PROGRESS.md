# F02 Progress Tracker

The original 14 batches below record implementation of the imported F02 snapshot, not final acceptance. See the hardening tracker after the table.

| Batch | Task | Weight | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 1 | F02.01 – Baseline & Audit Tooling | 5% | DONE | `audit-f02-modules.cjs`, docs, dynamic `recovered-host-view.mjs` |
| 2 | F02.02 – Diagnostics | 5% | DONE | Split `diagnostic-panels.js` (1,441 lines) into 8 modules (<285 lines each); 14/14 factories parity PASS |
| 3 | F02.03 – Settings | 6% | DONE | Split `settings-screens.js` (1,571 lines) & `provider-sections.js` into 13 focused modules; 8/8 factories direct DI, 0 legacy keys |
| 4 | F02.04 – Session Screens | 12% | DONE | Split `session-screens.js` (3,598 lines) into 13 domain modules across `chat/`, `arena/`, `speech/`, `ui/settings/`; 13/13 factories parity PASS |
| 5 | F02.05 – RPG Screens | 10% | DONE | Split `rpg-screens.js` (3,232 lines) into 11 single-factory domain modules; 11/11 factories parity PASS |
| 6 | F02.06 – Message Rendering & Card Frame | 12% | DONE | Split `message-rendering.js` (2,132 lines) into 11 modules across `chat/ui/`, `arena/ui/`, and `ui/card-runtime/` (clean `LAYER-RUNTIME`); 11/11 factories parity PASS |
| 7 | F02.07 – Catalog, Character & Preset | 7% | DONE | Split `character-sections.js`, `catalog-screens.js`, `preset-sections.js` (3,205 lines) into 13 modules across `characters/`, `presets/`, `personas/`; 28/28 factories parity PASS |
| 8 | F02.08 – World Info & Lorebook | 6% | DONE | Split `world-info-screens.js`, `lorebook-controls.js` (2,193 lines) into 10 modules (<366 lines each); 15/15 factories parity PASS |
| 9 | F02.09 – Embedding Service | 7% | DONE | Split `embedding-service.js` (1,015 -> 266 lines) into 7 focused modules under `embedding/` (<296 lines each); all exports preserved |
| 10 | F02.10 – Prompt Assembler & Initial Variables | 8% | DONE | Split `prompt-assembler.js` (1,226 -> 319 lines) into 5 `assembler/` modules and `initial-variable-service.js` (676 -> 135 lines) into 2 modules; 91/91 PASS |
| 11 | F02.11 – Persistence & Backup Restore | 10% | DONE | Split `backup-restore-service.js` (1,807 -> 496 lines) into 8 dedicated modules under `backup/`; 100% recovery/rollback/write-guard tests PASS |
| 12 | F02.12 – Android Native | 5% | DONE | Split `AiStudioTextPlugin.java` (1,023 -> 192 lines) into 6 flat controllers; overlay & contract tests PASS |
| 13 | F02.13 – Composition Root | 5% | DONE | Split `src/app/host.js` (460 lines / 74.7 KB / 165 imports -> 26 lines / 1.9 KB / 9 imports) into 6 ordered composition modules under `src/app/composition/`; 91/91 PASS |
| 14 | F02.14 – Final Audit & Acceptance | 2% | OPEN | Full architecture audit, 91/91 tests PASS, 0 >800-line modules, 0 unexplained >500-line modules |

## Final hardening tracker

| Task | Status | Evidence |
|---|---|---|
| F02-R01 AST factory parity | Verified | 103/103 historical UI factories and 247/247 imported F02 factories; zero missing/unexplained body changes; helper AST checks added |
| F02-R02 Mandatory CI | Verified | Core job runs pinned TypeScript 5.8.3, strict module inventory, factory/helper parity, UI wiring and F01 checks; no optional npm-job bypass |
| F02-R03 UI composition | Verified | Ten stages, 28-line orchestrator; ordered AST parity for 152 initialization statements and 151 bindings; 91/91 regression files |
| F02-R04 shared context and initialization | Open | Context ABI retained deliberately; broader DI contract review remains |
| F02-R05 renderer and entity repositories | Open | Responsibility/transaction rationale still requires explicit review |
| F02-R06/R07 npm and browser/storage | Verified for R03 | Package-backed, portable and source browser/IndexedDB acceptance in run 45912977965 |
| F02-R08 Android APK | Verified for imported F02 only | Run 45911595964; fresh APK/device acceptance after hardening not established |
| F02-R09 final acceptance | Open | This tracker distinguishes verified implementation from release acceptance |

See [F02-HARDENING.md](F02-HARDENING.md) for immutable baseline commits and scope.
