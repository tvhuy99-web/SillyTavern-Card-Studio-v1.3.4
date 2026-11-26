# Block D continuation: session ownership, provider catalog, history and RPC

Baseline: STCS-Phase1-Block-D.zip (D 52%). This is a local source refactor, not a release or GitHub push. UI design, database version, backup version and Android native files are unchanged.

## Scope and implementation

- Persistence: `entity-repositories.js` assigns a cryptographically random `__stsRecordGeneration` on session creation/replacement/restore, lazily initializes old records through `openSessionForEditing`, and verifies it in `saveExistingSession`. Snapshots and session store carry the generation; backup export strips it. This prevents stale autosave overwriting a replacement with the same identifiers. Concurrent edits to the same generation and older clients bypassing the new policy remain unresolved.
- Provider: `model-catalog.js` adds a bounded in-memory cache keyed by normalized endpoint, protocol, legacy mode, profile and credential. Settings use that cache rather than the persistent URL-only catalog. The old catalog is retained for compatibility; fetched alternatives are not migrated, and catalogs must refresh after reload. Explicit configured model IDs persist. Selecting/applying a profile no longer writes global URL/password/legacy/tool flags. Provider bindings use effective selected profile model/protocol and tool flag. Not every older explicit tool/model callback has been migrated. OpenRouter refresh ignores stale/unmounted results; Proxy catalog errors use the existing redaction helper.
- Conversation: `standalone-mythic.js` owns a cancellable standalone operation, validates session/revision and relevant RPG/message state before committing a combined patch. `use-conversation.js` guards manual Mythic and Arena selection loading. Response pipeline checks ownership following asynchronous variable scripts. `history-policy.js` centralizes rewind, summary invalidation and changed-history detection; `use-message-history.js` restores nearest available RPG/World Info snapshots and invalidates affected summaries, including message edits/deletes. Card RPC history writes share invalidation. Old conversations without usable snapshots cannot be exactly reconstructed.
- Embedding: local query, sync, preparation and deletion share a serial queue. This prevents local runtime teardown during inference/sync in this application instance; operations may wait for a long sync. Cross-tab/native-device behavior is unverified.
- RPC: dispatcher leases include session and frame identity; sweep and teardown abort outstanding work; default deadlines 30 seconds, generation 360 seconds. Generation tasks consume lease cancellation. Frame reader identifies DOM iframe and srcdoc changes, not all same-document or navigation cases. Safe/sandbox frames cannot override generation endpoint or credential; Full retains compatibility for trusted cards. This is not a complete capability policy; noncooperating handlers may still have side effects after timeout, and other network paths need review.
- Cleanup: consolidate history policy, Mythic ownership and effective provider selection instead of maintaining distinct state logic. Full dead-code audit and removal of legacy aliases/cache APIs are outstanding.

## Progress rubric (engineering estimate, not acceptance)

| Area | Weight | Before | Now |
|---|---:|---:|---:|
| Persistence/autosave/backup/migration | 25 | 17 | 22 |
| Provider configuration/catalog | 20 | 13 | 17 |
| Chat/prompt/Arena/RPG/world info | 20 | 10 | 16 |
| Card runtime security/RPC | 15 | 6 | 11 |
| Dead/compatibility code | 10 | 2 | 3 |
| Integration/acceptance | 10 | 4 | 5 |
| Total | 100 | 52 | 74 |

A 94%, B 87%, C 79% unchanged. Remaining: cross-tab/session and restore consistency (3 points), provider cache/legacy routing and persistence (3), historical RPG/world info/prompt/Arena contracts (4), full frame lifecycle/capability/security (4), broader dead-code audit (7), integrated acceptance (5). No overall completion claim.

## Verification

- `npm run build`: PASS; `npm test`: 68/68 files PASS (66 previous, two new: `phase1-block-d2-conversation.mjs`, `phase1-block-d2-rpc-cache.mjs`; existing persistence and browser fixtures extended).
- `npm run build:source`, `npm run test:source-bootstrap`: PASS; root lookup with DOM stub, not React mount.
- `npm run verify:vendor`: 12 files verified; license review remains open.
- `npm run test:native-java`, `npm run test:android-overlay`: PASS; 19 Java files parsed, pure JDK contracts, 4 WebView scripts syntax; no Android SDK compilation.
- TypeScript static module graph: source 156 nodes / 206 edges / 2 computed; assets 159 nodes / 207 edges / 2 computed. Zero parse errors, unresolved literal paths or detected import cycles. Dynamic dependencies, RPC and fragments are not comprehensively analyzed.
- Browser IndexedDB fixture expanded but no actual browser acceptance run in this turn. Live providers, package-backed npm build, lockfile/license review, APK and device acceptance remain open. No changes to CSS, Android Java, vendor snapshots or database version.

Evidence: `evidence/block-d2-*.txt` and `evidence/block-d2-module-graph.json`.
