# Phase 1 / Block D — iteration 3 (85%)

Baseline: STCS-Phase1-Block-D-74.zip. Local implementation only; no upstream push. Scope: architecture and correctness, no visual redesign or performance benchmark.

## Weighted progress (engineering estimate)

| Area | Weight | Previous | Current |
|---|---:|---:|---:|
| Persistence, autosave, backup, migration |25|22|24|
| Provider configuration and model catalog |20|17|19|
| Chat, prompt, Arena, RPG, World Info |20|16|17|
| Card runtime security and RPC |15|11|13|
| Redundant code and compatibility cleanup |10|3|6|
| Integration and acceptance |10|5|6|
| Total |100|74|85|

A 94%, B 87%, C 79% unchanged. No credit for unavailable real-browser, npm package or APK acceptance.

## Implementation

- Session repository grants a new editor token and generation atomically when a different repository instance opens a record for editing. Old writers are rejected even if the session ID is unchanged. Both internal fields are omitted from backups. Autosave reports a conflict for the still-active revision only; in-memory edits are not automatically merged or discarded. No IndexedDB schema bump. This does not arbitrate unmodified old clients or every catalog write across tabs.
- Backup Web Storage restore snapshots the touched keys in both storage areas, including proxy-owned metadata and credentials. On failure it attempts rollback of the settings phase and reports if rollback itself fails. IndexedDB remains a separate transaction and may already be committed. No global cross-tab lock.
- Arena and Quick Connection now resolve their proxy model catalogs by connection (including protocol, credentials and profile), not URL alone. Missing explicit profiles fail instead of falling back to global credentials. Async catalog results are guarded against stale dialog targets. Quick Connection saves profile model selection to the profile. Removed unused URL-cache accessors and backup inclusion of the old cache; existing browser storage is not forcibly cleared. Model suggestions can require refreshing after restart.
- All 53 host RPC methods have explicit Safe (31) or Full-only (22) classifications. Safe restricts catalog and extension lifecycle mutations, raw imports other than regex, slash execution, external lorebook mutations, global/preset/character/extension variable scopes, custom API endpoints and keys. Some formerly working cards require Full mode; use Full only for trusted cards. This is a deliberate compatibility change, not a complete isolation boundary. Existing compatibility-mode default unchanged.
- Frame identity additionally uses srcdoc/src/sandbox attribute changes. Retire pending requests and replay ledgers across frame identity changes. This does not detect every internal navigation. Noncooperative RPC handlers can still finish effects after a deadline. Safe generation suppresses global macro writes; runtime prompt rejects results when captured chat, card, preset or variable references change.
- Smart Context captures live state on invocation and rejects results when chunk sizing changes. Share chunk-size normalization with history invalidation. Old summary records lack complete provenance metadata.
- Audit tool inventories lexical declarations across 156 source modules, literal reachability, generated/template limitations, and Vendor candidates. 51 zero-reference candidates before targeted cleanup and 40 after. Removed verified redundant bindings and a duplicate frame-context function, not all candidates. The two literal-unreachable files are used in generated runtime construction. Vendor implementation and Android Java remain unchanged. Audit evidence is not proof of whole-program dead code.

## Validation

- `npm run build`, `npm test` (69/69 test files), `npm run build:source`, `npm run test:source-bootstrap`, `npm run verify:vendor`, `npm run test:native-java`, `npm run test:android-overlay`: PASS.
- New `tests/phase1-block-d3-ownership.mjs`; expanded persistence, provider and browser persistence cases. Browser test cases written but not executed successfully in the known constrained environment.
- TypeScript 5.8.3: 156 source and 159 asset JS nodes; zero parse errors, unresolved literal imports or detected static cycles. Computed edges remain outside static proof.
- Evidence: `evidence/block-d3-*`. No new CSS, Android Java, Vendor source or DB version change.

## Remaining / release blockers

15 weighted points in D: persistence 1, provider 1, chat 3, runtime security 2, cleanup 4, integration 4. Finish remaining compatibility and dynamic-code audit; cross-tab catalog consistency and recovery UX; historical summary/RPG provenance; frame navigation and handler-level capabilities/cancellation; real browser/IndexedDB, external cards and provider verification. A/B/C pending release gates include browser acceptance, Android SDK/Gradle/APK and device tests, actual npm dependency install/lockfile/license verification and package-backed build. Existing portable deployment remains the default. This is not a production acceptance or a claim of complete security.
