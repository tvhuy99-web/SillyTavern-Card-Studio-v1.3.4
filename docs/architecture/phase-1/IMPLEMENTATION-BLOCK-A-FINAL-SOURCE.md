# Block A continuation: runtime, catalog and composition boundaries

Baseline: STCS-Phase1-Block-A-Continuation.zip (573 files, Block A 90%).
Scope: Phase 1 architecture, not UI redesign or performance optimization. Android and npm dependency migration remain outside this batch.

## Changes

- Split `use-card-runtime.js` into a readable hook with a transitional dependency adapter, `host/method-router.js`, `host/runtime-prompt.js`, and `host/runtime-events.js`. The router derives its 53 methods from domain inventories; duplicate names are rejected. Prompt completion checks its lease before writing variables. Frame message dispatch and store subscriptions are independently testable. Public method names and iframe protocol remain unchanged.
- Rewrite four catalog stores (`character-store`, `persona-store`, `preset-store`, `lorebook-store`) with named dependencies and one serial queue per catalog. The existing catalog/lorebook mutation services accept the same queue. Reloads and supported writes no longer race within one catalog owner. Failed tasks do not poison the queue. Creation and duplication use add instead of silently replacing hidden records; failed Character reloads release newly allocated avatar URLs. Existing database identity and schema remain unchanged.
- Extract `host-provider-bindings.js` to compose connection repository, model catalog, profile helpers and generation gateway. Keep positional compatibility wrappers and existing display model fallback. Remove unused preload machinery: all three call sites passed empty preload arrays. `optional-module.js` retains cancellable import-error notification.
- Rewrite the session coordination hook with readable local names and `createStoryAdvance`: captures expected session revision and queue, checks before starting and after the asynchronous generation. Old callbacks, same-ID reopened sessions and replaced queues cannot advance the new queue.
- Add behavioral tests running emitted assets, including all 53 routes, raw and normal prompt paths, stale leases, frame events, subscriptions, Story Mode, real Zustand/Immer catalog stores, serial ordering, storage failures, collision protection, provider composition and optional-module failure behavior. Update older source-location assertions to inspect canonical owners.
- Add `npm run test:app-browser` and a separate GitHub Actions browser-acceptance job. The harness serves the real portable build with a fresh profile, checks React mount, default catalog persistence, tab navigation and provider-specific rendered sections. No real provider calls are submitted. Existing IndexedDB browser test is included in CI.

## Evidence

Build PASS, 61/61 test files PASS (previous 59/59). Emitted host 44,816 bytes (previous 50,488); 152 source JS modules (previous 146). TypeScript 5.8.3 literal module audit: src 152 nodes, 185 edges, 2 computed references; assets 155 nodes, 186 edges, 2 computed references. Zero parse errors, missing literal imports, bare import specifiers, or detected literal import cycles. UI heuristic finds zero top-level JSX candidates in host. No CSS, Java, historical transform or legacy input edits; iframe core and fragments unchanged. The source build executes zero historical transforms. These are scoped checks, not full runtime or performance claims.

Browser acceptance **not passed**. Chromium failed to return DOM even for a minimal HTML probe in this execution environment; the real-app harness also timed out without a result (10 s local attempt). CI workflow has been authored, not run on GitHub. Browser harness assertions are unverified in an actual browser. No real API, Android APK, or external card acceptance. See evidence logs `block-a-final-*`.

## Progress (same rubric as prior Block A)

| Criterion | Weight | Previous | Current |
|---|---:|---:|---:|
| UI and wrapper recovery | 40 | 40 | 40 |
| Store and hook extraction | 20 | 20 | 20 |
| Internal decomposition/naming | 10 | 7 | 9 |
| Vendor/default data boundaries | 10 | 10 | 10 |
| Composition root | 10 | 8 | 10 |
| Build/regression/bootstrap | 5 | 5 | 5 |
| Real browser acceptance | 5 | 0 | 0 |
| Total | 100 | 90 | 94 |

Engineering estimate using the established weights, not measured elapsed work. Composition is scored complete for Block A's wiring boundary, not for universal dependency-contract cleanup: transitional aliases and factory adapters remain. One point of internal cleanup remains (conversation/persistence/slash hooks and recovered names). Five points are withheld until actual browser acceptance. Catalog serialization is per owner in one JS context, not a solution for multiple tabs, backup/restore, or autosave-versus-delete. Card runtime authorization and end-to-end cancellation are not fully resolved. No schema change. Block B may proceed independently while A acceptance remains open. C retains dependency replacement and historical-source cleanup; D retains cross-cutting debt and final validation. No GitHub push.

Independent build with legacy/ and build/transforms/ temporarily absent: PASS.
