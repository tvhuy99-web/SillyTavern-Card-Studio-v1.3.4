# Phase 1 – Block D: Technical debt and regression, iteration 1

Baseline: STCS-Phase1-Block-C-79.zip (661 tracked files). Local source edits only; no GitHub push. No UI redesign, performance benchmark, database version change, Android Java or vendor snapshot change.

## Weighted progress (engineering estimate, not time spent)

| Workstream | Weight | Earned | Evidence and residual scope |
|---|---:|---:|---|
| Persistence, autosave, backup and migration | 25 | 17 | Non-resurrecting existing-session save, five-store snapshot, duplicate-key preflight, historical preset rename transaction. Same-ID replacement, multi-tab conflicts and cross-storage restore remain open. |
| Provider configuration and catalogs | 20 | 13 | Proxy credential ownership, rollback on storage failure, selected profile hydration, target change invalidation, tool protocol, backup roundtrip. Full cross-key apply atomicity, account/protocol scoped model cache and other tool routes remain open. |
| Chat/Prompt/Arena/RPG/World Info | 20 | 10 | Smart Context cancellation/history checks and same-index sync exclusion. Mythic, other tool callbacks, full rewind consistency and sync/delete/query interactions remain open. |
| Card Runtime security and ownership | 15 | 6 | Pending RPC quotas, context/payload validation and visual keys. Frame nonce, per-method capability policy, timeout of hanging domain handlers and complete sandbox audit remain open. |
| Redundant code and compatibility cleanup | 10 | 2 | Reuse existing repository, controller and cancellation owners; remove duplicated summary routing logic. Full dead-code audit and remaining compatibility aliases are not complete. |
| Integrated verification | 10 | 4 | Portable and source build, 66/66 test files, ESM bootstrap, Java and overlay checks. Browser, real APIs, npm package build and APK/device acceptance remain open. |
| Total | 100 | 52 | Estimated 52% of Block D. A 94%, B 87%, C 79% unchanged. |

## Implemented changes

- `entity-repositories.js`: existing-session writes atomically check session, character and preset. Unknown record fields survive, runtime diagnostics removed. Autosave uses this write through the existing queue; it cannot recreate a deleted session. The check is not a full record generation token, so same-ID replacement with the same character and multi-tab writes remain possible. Explicit creation/import/overwrite routes remain distinct.
- `renamePreset`: add destination, delete source and migrate all matching session preset references in one IndexedDB transaction. The active RPC session updates its preset after commit; stale snapshots with missing old preset names retain the persisted name. No database schema or version change.
- `exportRecords`: read five stores in a single readonly transaction. `mergeRecords`: reject malformed or duplicate primary keys before writing. Preserve merge semantics; not a destructive replace.
- `backup-codec`: same v1 backup shape, actual session credential ownership for Gemini/OpenRouter/rotation, proxy service for profile/password. Validate recognized values and limits before IDB merge, including duplicate proxy profile IDs. Full backup can contain plaintext credentials as before, so keep private. Missing settings do not erase existing values. If Web Storage fails after database commit, reload catalog and report partial completion. Cannot guarantee transaction across IDB and Web Storage.
- `proxy/persistence`: report errors instead of swallowing writes; best-effort rollback of owned keys; validate profile list; prototype-safe secret maps; no implicit inherited secret on URL/protocol changes. Legacy migration attempts rollback if storage errors. Explicit supplied secrets remain accepted; no encryption at rest.
- `settings-controller` and `provider-sections`: hydrate actual selected profile (no global credential fallback for missing profile), clear draft password on URL/protocol change, keep draft password separate until apply or explicit profile save, publish profile changes only after persistence, clear old list on target change, cache under edited URL. URL-only catalog keys remain a limitation. The remember toggle applies to already saved credentials. Apply across settings and repositories is still not atomic. Profile selection and explicit profile save retain existing UX.
- `host-provider-bindings`, `generation-gateway`, `proxy/generation`: reject missing selected profile or explicit empty URL, resolve protocol from selected saved profile for ordinary and tool generation. Explicit other endpoint never inherits unrelated credentials; no comprehensive routing overhaul of all specialized tools.
- `use-smart-context` / `summary-generation`: cancellation registered in runtime state; propagate signal through Gemini, Proxy and AI Studio; consume late response even if provider ignores cancellation. Validate session revision, message identity/content and previous summaries before publishing; no concurrent regeneration; bound chunk size. User cancellation marks automatic summary failed for explicit retry. Cannot guarantee provider server canceled or a full summary dependency/version history.
- `embedding-service`: reject overlapping sync of same online index or simultaneous sync of shared local runtime; release lock on failure. Does not serialize other model lifecycle operations or across tabs.
- `rpc-dispatcher`, `runtime-events`, chat hooks: enforce 32 pending requests per source and 128 globally; validate context and non-RPC payloads using existing validator; ignore prototype-sensitive visual field names; catch message handler rejection. These are guardrails, not a comprehensive permission/sandbox model. Hung handlers may still occupy a slot.

## Verification

- `npm run build`, `npm test`: 66/66 test files pass (63 baseline, 3 new). New tests are deterministic doubles for transaction/transport; no actual IndexedDB commit is asserted from these mocks.
- `npm run build:source`, `npm run test:source-bootstrap`: pass, ESM runs to root lookup in DOM stub, deliberately not React mount.
- `npm run verify:vendor`: 12/12 files verified; `npm run test:native-java`: JDK tests and 19 syntax parses / 4 JS syntax passes; `npm run test:android-overlay`: fixture passes. No APK compilation.
- TypeScript literal graph: 154 source JS modules, 200 edges; 157 assets, 201 edges; zero parse errors, unresolved literal imports or detected cycles. No claim for dynamic dependencies.
- Real IndexedDB fixture expanded in `tests/browser/persistence.js`, quick Chromium attempt terminated at 12 seconds (exit 124), no test result. npm registry still not resolved by quick DNS check; no package-backed build. No Android SDK/Gradle or live provider credentials tested.
- `tests/phase1-block-d-{persistence,provider,runtime}.mjs`: new regressions for snapshot, rollback, missing/duplicate keys, preset migration, deleted sessions, credential roundtrip, target isolation, RPC limits, hostile visual keys, sync conflict and summary edits/abort. Existing settings golden test preserves 6 unchanged scenarios; selected-profile behavior is intentionally corrected and separately asserted rather than rewriting the original fixture.

## Remaining work

Prioritize same-ID session ownership and deletion/import/restore coordination, fully scoped model cache and atomic configuration apply, dedicated Card RPC capability and frame identity protocol, Mythic/rewind/tool callbacks, and comprehensive dead-code audit. Then run browser/IndexedDB, native npm dependency, live provider and Android acceptance in a suitable environment. No new acceptance credit for A/B/C without evidence.
