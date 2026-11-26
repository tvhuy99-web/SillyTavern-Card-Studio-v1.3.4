# Phase 1 Architecture Decisions (ADR)

## ADR-001: Node 18 Test Runner Web Globals Preload
- **Status:** Accepted & Implemented (E00)
- **Context:** CI targets Node 22 where `globalThis.crypto`, `globalThis.File`, and `globalThis.CustomEvent` are standard globals. In Node 18.20.4, 11 of 70 tests failed purely because these standard Web globals are not exposed globally by default.
- **Decision:** Introduce `tools/node-web-globals.mjs` preloaded via `node --import` in `tools/run-tests.mjs` and imported by `tools/test-source-bootstrap.mjs`, binding Node's real `node:crypto.webcrypto`, `node:buffer.File`, and `CustomEvent extends Event` only when absent. Product code and test assertions remain untouched.

## ADR-002: Zero-Dependency Module Graph & Boundary Enforcement
- **Status:** Accepted & Implemented (E00/E03.5)
- **Context:** `tools/audit-module-graph.cjs` previously crashed when the `typescript` npm package was not installed in offline environments, preventing automated boundary checks.
- **Decision:** Retain TypeScript AST parsing when available and add a zero-dependency ESM static/dynamic import & `import.meta.url` scanner fallback, plus automated enforcement of Module Boundary rules (B01 cycles, B08 `src/` → generated `assets/` ban, and layer rules for `core`, `providers`, `persistence`, `diagnostics`, `runtime`) via `--summary` and `--check`.

## ADR-003: Source-Native Card Runtime Core Builder (`src/runtime/card-runtime/core-builder.js`)
- **Status:** Accepted (E08.5)
- **Context:** `src/app/host.js:55` imported `../../assets/card-runtime-core-builder-v1.3.6.js`, violating Rule B08 (`src/` must never import generated application assets).
- **Decision:** Emit the canonical runtime core builder to `src/runtime/card-runtime/core-builder.js`, point `src/app/host.js` and tests to `src/runtime/card-runtime/core-builder.js`, and keep `assets/card-runtime-core-builder-v1.3.6.js` only as a portable build mirror in `build/asset-manifest.mjs`.

## ADR-004: Elimination of Model Test DOM Enhancer (`src/ui/model-connection-test.js`)
- **Status:** Accepted (E05.2 / Gate G07)
- **Context:** `installModelConnectionTestEnhancer` ran a global `MutationObserver` that injected buttons into the DOM and read API keys/proxy settings directly from DOM/storage, causing a false-positive button injection on `SmartScanSettings`'s Embedding Model selector and leaving `window.__STS_MODEL_CONNECTION_TEST__` on `window`.
- **Decision:** Migrate all 7 remaining legitimate model-select consumers (`ArenaSettingsDialog`, `QuickConnectionDialog`, `SmartScanSettings`, `ActionSuggestionSettings`, `LiterarySettings`, `MythicConfigurationDialog`, `ActionSuggestionDialog`) to the React `ModelTestButton` component + `buildSavedProbeTarget` helper, then delete `src/ui/model-connection-test.js`, its bootstrap call in `src/app/entry.js`, and `window.__STS_MODEL_CONNECTION_TEST__` in `src/app/host.js`.

## ADR-005: Provider Legacy Module Consolidation
- **Status:** Accepted (E04)
- **Context:** `legacy-response-utils.js` duplicated `generation-utils.js` 100% (including unused dead class `zs`); `legacy-generation-adapters.js` wrapped `generation-gateway.js` and duplicated Gemini safety settings 3 times; `legacy-transport.js` mixed network redaction and HTTP forwarding with minified identifiers.
- **Decision:** Consolidate Gemini config/builders into `src/providers/gemini/config.js`, HTTP forwarding into `src/providers/common/http-transport.js`, and network redaction into `src/diagnostics/network-redaction.js`, then remove all three `legacy-*.js` files after migrating callers.

## ADR-006: Staged & Journaled Backup/Restore + Cross-Tab Consistency
- **Status:** Accepted (E06)
- **Context:** Backup/restore previously ran inside minified UI (`settings-screens.js`), lacked a persistent recovery journal if IndexedDB committed and Web Storage failed, and had no cross-tab synchronization or catalog optimistic checks.
- **Decision:** Introduce `src/app/persistence/cross-tab-sync.js`, `src/app/persistence/backup-restore-service.js` (validate → stage → journal → apply → finalize/recovery), and `src/app/state/settings-repository.js`, and eliminate direct `Wt`/`sessions.put` bypasses in cleanup and import flows.

## ADR-007: Canonical Prompt Engine Consolidation
- **Status:** Accepted (E07.2)
- **Context:** `src/features/prompts/prompt-service.js` wrapped `legacy-prompt-builder.js` via 20 forwarding getters from `src/app/host.js`.
- **Decision:** Extract `extractStoryContent` and core prompt assembly into canonical modules under `src/features/prompts/`, protect parity with golden fixtures, migrate callers (`use-conversation.js`, `use-card-runtime.js`, `summary-generation.js`), and remove `legacy-prompt-builder.js`.
