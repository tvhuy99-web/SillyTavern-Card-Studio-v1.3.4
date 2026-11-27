# F02 Module Ownership & Conventions

## Naming & Boundary Conventions
1. **Plural domain directories in `src/features/`:** `presets/`, `personas/`, `characters/` (or `catalog/`), `prompts/`, `world-info/`, `chat/`, `rpg/`, `arena/`, `speech/`, `state/`.
2. **Card Runtime UI Boundary (`LAYER-RUNTIME`):** UI components wrapping Card Runtime (`card-frame.js`, `card-preview-dialog.js`) live under `src/ui/card-runtime/` so `src/runtime/card-runtime/` never depends on `src/ui/`, `src/app/state/`, or `src/app/persistence/`.
3. **Android Native Overlay:** All Java classes remain flat at top-level `android-native/*.java` for compatibility with `tools/prepare-android.py` and `tests/native/test-overlay.py`.
4. **Build Dual-Layout Synchronization:** Every new JS module under `src/` is registered in `build/asset-manifest.mjs` (`copiedAssets` -> `assets/recovered/<rel>` or domain target) so `build:portable` and `build:source` (`verifySourceOwnership()`) stay 100% in sync.

## Historical size review (superseded by R05C budgets)
- `src/features/catalog/default-character.js` — Static default character fixture data
- `src/features/presets/default-preset.js` — Static default preset fixture data
- `src/features/rpg/default-database.js` — Static default RPG database fixture data
- `src/runtime/card-runtime/core-builder.js` — Generated Card Runtime core builder output
- `src/features/chat/ui/chat-controls.js` (681 lines) — Cohesive chat toolbar/control primitives (10 small factories)
- `src/features/chat/regex-processing.js` (611 lines) — Cohesive SillyTavern regex engine & placement processor
- `src/ui/components/input-controls.js` (558 lines) — Cohesive shared form/input UI primitive library
- `android-native/EmbeddingGemma2LiteRTPlugin.java` (571 lines) — Cohesive Android LiteRT JNI/Capacitor plugin bridge

## Historical initialization order outline (see final explicit contract below)
1. Platform / library runtime & React/Zustand/Immer setup
2. Persistence layer (IndexedDB, repositories, save coordinator, backup-restore)
3. Application stores (character, preset, persona, lorebook, session, settings)
4. Provider registry, HTTP transport, generation gateway, AI Studio / Gemini / OpenRouter / Proxy adapters
5. Conversation, prompt, world-info/embedding, RPG, smart-state services
6. Card Runtime host (RPC dispatcher, method router, slash commands, frame context)
7. UI components, screens, dialogs, providers & application mount

### Post-Split Single-Responsibility 500–800 Line Modules (Documented for F02-G15)
- `src/features/rpg/ui/mythic/mythic-configuration-dialog.js` (777 lines, 1 factory) — Single cohesive Mythic configuration dialog
- `src/ui/card-runtime/card-frame.js` (716 lines, 1 factory) — Single cohesive Card Frame iframe lifecycle & RPC bridge component
- `src/features/chat/ui/chat-session-screen.js` (572 lines, 1 factory) — Single cohesive ChatSessionScreen orchestration component (further logic extraction deferred to F03)
- `src/features/rpg/ui/actions/action-suggestion-dialog.js` (550 lines, 1 factory) — Single cohesive ActionSuggestionDialog
- `src/features/rpg/ui/database/rpg-database-editor.js` (542 lines, 1 factory) — Single cohesive RpgDatabaseEditor
- `src/features/chat/session/session-list-screen.js` (509 lines, 1 factory) — Single cohesive SessionListScreen

## R03 ordered UI composition ownership

The 55.2 KB imported UI composition has been replaced by a 28-line orchestrator and ten stage owners under `src/app/composition/ui/`. The stage sequence deliberately retains the original initialization order rather than reordering potentially effectful factory calls.

| Stage | Responsibility |
|---|---|
| editor-foundations | Shared primitives, toast context, early character editor sections |
| catalog-editor | Character/RPG editing, dialog focus, lorebook manager and character screen |
| preset-catalog | Preset/prompt configuration, lorebook library, persona screens |
| settings | Connection and feature settings, speech provider, backup/runtime settings |
| session-navigation | Session launch/import, chat header and quick connection |
| message-view | Card frame, message and stream rendering, composer, shared diagnostic controls |
| diagnostics | Log items, panels and diagnostic dialog |
| world-info-dialogs | Relevance, dynamic World Info and chat dialogs |
| rpg-actions | Action proposal/suggestion, variables and RPG table HUD |
| application-shell | Chat HUD, route, lifecycle and top-level shell |

Each stage destructures only its required domain and already initialized UI inputs. The catalog stage receives an explicit late reader for the model-test button initialized in the settings stage. All 151 original internal bindings remain present and in order; R04 publishes only seven of them to the host. All new sources are registered in the asset manifest; static tests use the manifest-derived composition owner list. The historical R03 shared context was replaced by R04 explicit stage input contracts. Deeper feature DI simplification remains F04 scope. The settings stage still has 74 domain inputs; this is a documented remaining dependency-contract concern, not a reason to create arbitrary micro-modules.

## R04/R05 verified ownership

- Composition: the host owns explicit domain wiring, initialization order and ten late reads; each UI stage receives only declared inputs. The internal UI binding set is 151, with seven published mount/toast bindings. No shared cumulative context crosses domain boundaries.
- Renderer: `renderer.js` composes seven responsibility-owned classic script fragments; the emitted script keeps the original lexical scope and is byte-identical across baseline cases. Its former >500-line exception is removed.
- Entity repositories: the facade owns CRUD, editor identity and the shared ordinary-write boundary. `repositories/session-operations.js` owns session writes; `repositories/restore-operations.js` owns multi-store snapshots, marker/merge/rollback; `repositories/cross-entity-operations.js` owns linked entity transactions. Each original transaction body is preserved.

Evidence: [`7e05572`](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/commit/7e05572f3b9527c2131a545844022dd95c59137c), [Quality Gates 45917732574](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45917732574).

## Final R05C ownership budgets and initialization contract

The live ten-owner line/byte budget table is in [F02-R05C-MODULE-BUDGETS.md](F02-R05C-MODULE-BUDGETS.md). Static data and generated files do not require a >500-line exception at the accepted snapshot. Actual initialization sequence is persistence → connections → backup/guards → stores → conversation → generation → Card Runtime → UI → Immer setup → mount; ten explicit late reads preserve lifecycle dependencies. The host and UI orchestrators now contain 338 and 387 lines of explicit wiring, respectively. This is intentional; size alone is not the objective. Feature-level DI simplification remains F04 scope.

Accepted implementation snapshot: [`8f4e688`](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/commit/8f4e6889e9730711d423a1f62e1942d623777490). [Quality Gates 45919483706](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483706) and [Android APK 45919483769](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483769) both completed successfully at this exact commit. [Installable debug APK artifact 15163726713](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483769/artifacts/15163726713), ARM64, stable signing certificate verified, exact locked npm runtime checks passed, ZIP artifact SHA-256 `9ca54407102946351c99450f0a1fe7f784f9f570bc609bbd049d1c5f84af84f1`; artifact expires 2026-12-27.
