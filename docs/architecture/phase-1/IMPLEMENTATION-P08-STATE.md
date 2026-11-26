# Phase 1 – P08 Runtime State Ownership

Baseline: STCS-Phase1-P08-Host.zip (cumulative from original commit 398165a0954f98de6c3553f32e6af2308c963260). This is a partial migration, not full P08 completion. No GitHub writes.

## Scope

- Add `src/runtime/card-runtime/host/state-rpc.js`: migrate nine existing RPC methods: `variables.replace`, `storage.set`, `storage.remove`, `storage.clear`, `extension.settings.save`, `character.data.get`, `character.data.save`, `character.extension.write`, `regex.replace`. Keep the same public method names and return shapes. The legacy shell binds explicit dependencies and dispatches these methods; other call sites of extension-settings save use the same implementation.
- Extract storage namespace/key derivation, JSON record read/write, scope normalization and message-index resolution into the existing `src/features/state/variable-scope-service.js`. The host boot snapshot and mutation paths use the same functions; preserve prefix `st-card-studio:card-runtime:v2`, encoding, scope-specific keys and existing global storage key. No database migration or stored-key renaming.
- Guard host mutations before execution and check session lease after awaited saves. For message-scope broadcast, re-read the current message by its index and identity; publish current context state, not the stale input of an earlier completed save. Skip the broadcast if the message at that index changed identity.
- Use a null-prototype temporary record for scoped web storage mutations, so keys such as `__proto__` are treated as ordinary storage keys. Clearing a storage scope does not clear browser-wide storage.
- Replace the iframe's single previous-value rollback with a per-scope pending-write journal, tracking acknowledged writes and host updates. Preserve synchronous optimistic return behavior of `replaceVariables`; an older failure does not overwrite a later optimistic or acknowledged value. Multiple failed writes restore the known confirmed state. A received host scope payload updates the confirmed baseline; pending writes are still presented optimistically. This is not a distributed consistency or transaction protocol.
- Update Asset Manifest and existing transitional Card Runtime transform; no new transform file. Keep existing source fragment architecture and existing output paths.

## Validation executed locally

Node 22.16.0; TypeScript Compiler API 5.8.3. `npm run build` PASS; `npm test` 47/47 test files PASS (previous baseline 46). New `tests/phase1-runtime-state-ownership.mjs` covers all nine RPC routes, seven variable scopes, key format compatibility, storage isolation and special keys, message scope stale completion, invalid scope/index, stale lease, save failure. Expanded `tests/phase1-card-runtime-ownership.mjs` runs actual generated classic runtime in Node VM across safe/full and current/official-local and tests overlapping writes, two failures, out-of-order responses, host updates. All existing tests pass. AST graph: source 47 JS files / 30 literal edges; assets 51 JS files / 65 literal edges; no parse errors, unresolved literal relative dependencies or cycles in this graph. Scope audit: 8 integration identifiers, 20 occurrences, no unresolved identifiers. Prior Embedding/Model Test audit passes. Evidence files `evidence/p08-state-*`.

Production bundle 1,509,769 bytes; runtime core builder 195,279 bytes. Sizes reflect code movement and new state tracking, not performance benchmarks. No CSS, Android Java, legacy input or renderer changes.

## Remaining risks and migration work

- Host session mutation occurs before the save callback in existing UI/store integration. Failure or lease invalidation cannot undo an already-applied in-memory update or guarantee a durable rollback; no claim of atomic state persistence. Existing autosave/deletion and cross-tab races remain.
- Pending-write journal improves local presentation but has no host version/commit sequence or multi-frame conflict resolution; RPC timeouts can occur after a host mutation. Host-authoritative reconciliation, per-frame/session authentication, permission checks and unmount cancellation remain.
- Character/Persona/Preset management, Lorebook and other Legacy RPCs still need migration. In particular, temporary active-selection mutations in old handlers must not be copied into permanent architecture. Remaining Card Runtime fragments share scope. Full compatibility needs real browser/card fixtures, real API and APK tests; Node VM and mocked state are not browser integration tests.
- P09/P10/P11/P12 not completed. Do not remove legacy input or transforms yet. No UI redesign or performance optimization performed.
