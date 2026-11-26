# Phase 1 / Block D iteration 4 (92%)

Baseline: STCS-Phase1-Block-D-85.zip. Local only. No CSS, Android Java, vendor snapshot or database version changes. No performance claims.

| Area | Weight | Before | Now |
|---|---:|---:|---:|
| Persistence, autosave, backup and migration | 25 | 24 | 24 |
| Provider configuration and model catalog | 20 | 19 | 19 |
| Chat, prompt, Arena, RPG and World Info | 20 | 17 | 19 |
| Card Runtime security and RPC | 15 | 13 | 14 |
| Redundant code and compatibility cleanup | 10 | 6 | 9 |
| Integration and acceptance | 10 | 6 | 7 |
| Total | 100 | 85 | 92 |

Engineering estimates; remaining points not earned by static checks. A 94%, B 87%, C 79% unchanged. No automatic promotion or device/browser credit.

## Changes

- Catalog-level refresh tickets arbitrate concurrent requests to the same connection across Settings, Arena and Quick Connection. Clearing a target invalidates pending refreshes. Latest successful eligible request replaces the discovered model list; manually configured IDs are separate, and Settings saves only explicit model IDs to that list. A discarded request does not publish into the dialog. Network requests that ignore cancellation may still finish. Per-connection cache remains memory-only; manually configured IDs stay in normal settings.
- `openSessionForEditing` accepts a synchronous guard checked during the readwrite transaction before claiming ownership; an already abandoned route does not take another editor's lease. A route abandoned after the write has been queued is not guaranteed to roll back. Cross-tab catalog writes and cross-storage restore atomicity remain open.
- Persist optional `summaryChunkSize` alongside existing summary strings. Existing summaries with known width keep it after global settings change; when no summaries remain, new generation uses the current setting. Old records with unknown width fall back to current settings until a successful summary generation/regeneration pins the width. No DB schema bump or backup version bump. Rewind cannot retain a summary spanning an incomplete removed chunk. Prompt build, runtime prompt, history policy, UI stats, diagnostic view, load and autosave use consistent width. Custom or truncated Card prompt histories do not inherit summaries indexed against a different prefix. Historical RPG and summary provenance remain incomplete.
- Validate message origin at host RPC, non-RPC message, handshake, resize and mirror receiver boundaries. For Full/non-opaque frames target the app origin when posting; opaque Safe sandbox still requires `*`. Frame `load` invalidates its token even if src/srcdoc attributes did not change. A load event can invalidate requests begun before initial load, which needs real-browser card regression. Same-origin/opaque malicious content is not fully isolated; this is defense in depth and does not guarantee cancellation of handler side effects.
- Removed 22 unused object bindings (7 settings plus 15 checked by AST), retaining public props and hook calls. Audit 40 -> 18 zero-reference candidates. Four template names are referenced by assembled JS fragments; four object-rest exclusions are intentional; ten are Vendor snapshot candidates. All 18 retained deliberately, see `evidence/block-d4-ownership-disposition.json`. No claim of whole-program dead-code proof.
- Consolidated release gates in `PHASE-1-RELEASE-GATES.md`. The 70th regression file covers cache overlap/clear/failure/refresh and manual IDs, frame origin and navigation, non-RPC rejection, pinned summary width, snapshot and partial history prompt. Persistence tests cover abandoned editor claim.

## Validation

Portable build, 70/70 regression files, direct source build, root lookup bootstrap, 12/12 vendor integrity, JDK native contract tests, 19 Java syntax checks, 4 WebView script checks, Android overlay: PASS. Static graph and ownership audit evidence under `evidence/block-d4-*`. Browser app test returned timeout; IndexedDB browser runner exceeded 15 seconds; npm build failed due missing esbuild, registry lookup unavailable. No APK, Android SDK compile, live API or full real-browser acceptance. See consolidated gates for outstanding work.
