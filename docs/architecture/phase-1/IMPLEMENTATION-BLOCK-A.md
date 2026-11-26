# Phase 1 / Block A: application source ownership and host decomposition

Baseline: STCS-Phase1-P09-Major.zip. Scope: recover remaining UI, move application stores and orchestration out of host, separate embedded dependencies/default data. Preserve current UX, public contracts, storage schemas and Android/Card Runtime implementation. No GitHub push.

## Delivered
- All 62 candidates from the previous AST inventory plus nine `memo`/`forwardRef`-wrapped components are moved into eight feature-oriented UI modules (71 components total in this delivery; cumulative 140 using prior counts). Host JSX candidate count is now zero according to the original top-level JSX factory heuristic. Nested functions and alternate render patterns are not covered by the count.
- Five stores (Character, Persona, Preset, Lorebook, Session) are owned by `src/app/state/application-stores.js`; three hooks (diagnostics, conversation, chat session) are owned by `src/features/chat/hooks/session-hooks.js`. Host creates one store of each type. Live dependency getters preserve original initialization and access timing. This is extraction, not a complete decomposition of the hooks or store internals.
- Three default data objects moved into dedicated catalog, preset and RPG modules. Literal contents are unchanged.
- React/ReactDOM/Immer/Zustand/YAML embedded region and Google GenAI SDK region are separated into `src/vendor/react-state-runtime.js` and `src/vendor/google-genai-runtime.js`. AST found no app dependencies or external lexical writes in these regions. Original runtime instances are reused. These are recovered bundled dependencies, not newly installed or upgraded packages; the vendor code is still minified and dependency replacement belongs to block C. Other embedded libraries remain in the host.
- Host is now 323,356 bytes vs 1,368,517 bytes. Generated host is 323,729 bytes vs 1,368,750 bytes (about 76.35% smaller). Code was relocated, not claimed to be eliminated from the full deployment. Historical transforms remain inactive.
- Portable build rejects unmapped bare module specifiers. Bootstrap testing caught an omitted `./` on an import and this was corrected.

## Ownership map
- `src/ui/shell/providers.js`: Toast, Speech and Card popup providers
- `src/features/catalog/ui/catalog-screens.js`: Character, Preset and Persona screens and tools
- `src/features/rpg/ui/rpg-screens.js`: RPG/Mythic dialogs, HUD and table UI
- `src/features/world-info/ui/world-info-screens.js`: Lorebook manager, embedding provider state and relevance UI
- `src/ui/settings/settings-screens.js`: Settings navigation, backup, TTS, memory, smart scan, literary/action settings, card runtime settings
- `src/features/chat/ui/session-screens.js`: Chat session/list/header/composer/dialogs
- `src/features/chat/ui/message-rendering.js`: card frame, message rendering, streaming, arena and HUD
- `src/diagnostics/ui/diagnostic-panels.js`: diagnostic panels and log items

## Verification
- Build PASS; 58/58 test files PASS (56 prior + 2 new).
- Read-only TypeScript parity audit verified 82 declarations against the previous host: 71 UI bodies and parameter lists (including original wrapper arguments and two memo comparators), 8 store/hook initializers with inverse lexical binding qualification, 3 exact data literals. See `evidence/block-a-recovery-parity.json`. This is source-level equivalence, not full render equivalence.
- `tests/phase1-block-a-bootstrap.mjs` imports actual emitted module graph using a DOM stub, reaches root lookup, checks shared React runtime and all 71 factories, including original memo comparators. It intentionally stops before React mounts; no browser E2E claim.
- `tests/phase1-block-a-stores.mjs` uses recovered Zustand/Immer with in-memory repositories, verifies five store reloads, subscription, live dependency access, session invalidation and message/variable changes.
- Architecture assertions updated to check emitted owners; historical regression tests remain enabled. Production syntax test now checks each emitted module.
- TypeScript import graph: source 86 nodes/106 literal edges; assets 89 nodes/107 literal edges. No parse errors, unresolved literal imports, unexpected bare imports or detected literal-import cycles.
- Chromium file URL headless attempt produced no DOM output before timeout. Browser mount, IndexedDB integration, API traffic, Android APK and real card interaction remain unverified.

## Block A completion: estimated 75% by weighted acceptance rubric
This is a transparent scope estimate, not a precise measurement of remaining labor or whole Phase 1.

| Criterion | Weight | Earned | Evidence / remainder |
|---|---:|---:|---|
| Recover inventoried UI and wrappers into feature owners | 40 | 40 | 62/62 plus 9 wrapped candidates, no remaining candidate by the old heuristic |
| Separate five stores and three major hooks from host | 20 | 20 | 8/8 source owners; existing state instance and contracts preserved |
| Further decompose store/hook internal responsibilities and improve readable naming | 10 | 0 | Large recovered bodies and short local names remain |
| Separate large vendor/default regions | 10 | 10 | Two vendor runtime modules and three defaults |
| Reduce host to a clean composition root | 10 | 0 | Remaining 323 KB host includes domain helpers, third-party code and transitional wiring |
| Build, regression, source parity and pre-mount initialization | 5 | 5 | All automated gates above pass |
| Browser UI/session integration and acceptance | 5 | 0 | Environment prevented real browser validation |
| Total | 100 | 75 | Block A incomplete |

Next A work: split `session-hooks.js` by persistence/session lifecycle, runtime RPC composition, generation, summary/rewind and effects; recover remaining host domain helpers and nested rendering, name/format locals; establish a composition root with explicit dependency contracts and verify browser workflows. Block B (Android), C (dependency/native React build and legacy deletion), D (debt/acceptance) are not completed in this delivery.

## Reproduce
```
npm run build
npm test
TYPESCRIPT_PATH=/path/to/typescript node tools/verify-block-a-recovery.cjs /path/to/P09-Major/src/app/host.js
TYPESCRIPT_PATH=/path/to/typescript node tools/audit-ui-components.cjs src/app/host.js
TYPESCRIPT_PATH=/path/to/typescript node tools/audit-module-graph.cjs
```
