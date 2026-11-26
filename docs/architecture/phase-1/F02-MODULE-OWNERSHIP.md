# F02 Module Ownership & Conventions

## Naming & Boundary Conventions
1. **Plural domain directories in `src/features/`:** `presets/`, `personas/`, `characters/` (or `catalog/`), `prompts/`, `world-info/`, `chat/`, `rpg/`, `arena/`, `speech/`, `state/`.
2. **Card Runtime UI Boundary (`LAYER-RUNTIME`):** UI components wrapping Card Runtime (`card-frame.js`, `card-preview-dialog.js`) live under `src/ui/card-runtime/` so `src/runtime/card-runtime/` never depends on `src/ui/`, `src/app/state/`, or `src/app/persistence/`.
3. **Android Native Overlay:** All Java classes remain flat at top-level `android-native/*.java` for compatibility with `tools/prepare-android.py` and `tests/native/test-overlay.py`.
4. **Build Dual-Layout Synchronization:** Every new JS module under `src/` is registered in `build/asset-manifest.mjs` (`copiedAssets` -> `assets/recovered/<rel>` or domain target) so `build:portable` and `build:source` (`verifySourceOwnership()`) stay 100% in sync.

## Documented >500-Line Exceptions (F02-G15)
- `src/features/catalog/default-character.js` — Static default character fixture data
- `src/features/presets/default-preset.js` — Static default preset fixture data
- `src/features/rpg/default-database.js` — Static default RPG database fixture data
- `src/runtime/card-runtime/core-builder.js` — Generated Card Runtime core builder output
- `src/features/chat/ui/chat-controls.js` (681 lines) — Cohesive chat toolbar/control primitives (10 small factories)
- `src/features/chat/regex-processing.js` (611 lines) — Cohesive SillyTavern regex engine & placement processor
- `src/ui/components/input-controls.js` (558 lines) — Cohesive shared form/input UI primitive library
- `android-native/EmbeddingGemma2LiteRTPlugin.java` (571 lines) — Cohesive Android LiteRT JNI/Capacitor plugin bridge

## `src/app/host.js` Initialization Order Baseline (for F02.13)
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
- `src/runtime/card-runtime/renderer.js` (594 lines) — Canonical Card Runtime iframe renderer source emitted directly by `build/build-card-runtime.mjs`
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

Each stage destructures only its required domain and already initialized UI inputs. The catalog stage receives an explicit late reader for the model-test button initialized in the settings stage. All 151 original output bindings remain present and in order. All new sources are registered in the asset manifest; static tests use the manifest-derived composition owner list. The shared context and overall DI ABI are intentionally retained for R04/F04. The settings stage still has 74 domain inputs; this is a documented remaining dependency-contract concern, not a reason to create arbitrary micro-modules.
