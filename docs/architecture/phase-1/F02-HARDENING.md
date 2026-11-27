# F02 Final Hardening: R01, R02, R03

## Immutable evidence

- F01 accepted baseline: `d7b483fbe6d3663c313a4e4523b208156b801396`.
- Imported F02 baseline: `2abd57d73301389ba00319a8898171ab3bfe0ec8`.
- AST parity / mandatory gate: `414082900cfdfb7a863c336a0c987f0913c6b81e`, `bd5e7ec15c8fdc7a4452bafd990d8c441aca916c` ([CI success](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45912812080)).
- Composition extraction: `71cdfb5cea5de9aedd01529cad3768e221db877c` ([CI success](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45912977965)).
- Moved-helper checks and mandatory F01 retention: `cfcde68cf56cbf0020d63dbf47ac9ba7bfc8d27e` ([CI evidence](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45913160581)). The mandatory audit step succeeded; see the linked run for the remaining jobs.

## R01: actual AST comparison

`tools/audit-f02-factory-parity.cjs` uses TypeScript 5.8.3 to parse whole exported factory declarations. It compares syntax tree kinds and exact leaf tokens, including parameters, properties, operators, literals, callbacks and regex/template tokens. Missing or changed declarations and ambiguous duplicate names fail; movement is allowed. It checks 103 historical UI factories (100 moved), and 247 exported first-party factories against the imported F02 snapshot. Historical comparison normalizes only destructuring reads through a proven identity dependency projection. Its declared properties must be identity mappings and cover every destructured key; other body differences fail. This intentionally permits omission of unused projection reads from ordinary dependency bags, not arbitrary getter side effects. Moved top-level helpers and constants in the historical UI owners are also compared, ignoring only the export modifier of helpers; all matching copies in the relocated owners must match. Negative fixtures cover operator, property, literal, regex, parameter, callback, duplicate, missing and invalid projection mutations.

The F01 historical alpha comparison now compares the two fixed historical commits rather than skipping missing files or pretending the old file layout remains current. The current F01 lexical and embedded-runtime gate also scans composition aliases across the extracted composition owners.

## R02: mandatory quality gates

The Core Quality Gates job installs pinned TypeScript, runs strict module ownership/size, factory and helper parity, ordered UI composition audit, F01 lexical/alias/embedded checks and fixed historical alpha verification. Failure blocks downstream jobs. The gate is not dependent on the optional npm runtime job. Local usage requires Node 22, TypeScript 5.8.3 available via TYPESCRIPT_PATH or module resolution, and both immutable baseline commits in the local git history.

## R03: ordered composition stages

The previous 258-line, 55.2 KB UI composition is now a 28-line orchestrator plus ten stage owners. The largest new stage is about 10.4 KB. The independent AST wiring audit compares 152 ordered initialization statements, module import identity, 151 returned bindings and the single reviewed late model-test dependency with the imported snapshot. Ten static architecture tests were updated to obtain the composition paths from the asset manifest, without changing their assertions. The canonical source and generated portable mirrors are both included.

## Limits and next tasks

These are structural and regression checks, not a proof of every reachable runtime behavior. The historical factory comparison covers the selected UI factories; the imported snapshot comparison covers existing exported factory declarations, not every function or all native methods. The original shared application context and 151 UI outputs remain for R04/F04; no business logic, protocol, storage schema or UI redesign was intended. R05 still requires renderer/repository responsibility review. The last full APK build was for the imported snapshot. The branch-only hardening changes ran Quality Gates, including native contracts and overlay; a new APK build and real device/live provider acceptance are not claimed. Do not mark F02 final acceptance complete until the open items are reviewed.

## R04/R05 follow-up (verified)

The limits above describe the R01–R03 snapshot. R04 and R05 have now been implemented and verified: [composition contracts](F02-R04-COMPOSITION-CONTRACTS.md), [renderer](F02-R05-RENDERER.md), [entity repositories](F02-R05-ENTITY-REPOSITORIES.md). Evidence: [`7e05572`](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/commit/7e05572f3b9527c2131a545844022dd95c59137c), [Quality Gates 45917732574](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45917732574). Historical exact-source/factory parity gates are Phase 1 acceptance witnesses; before intentional future business changes, freeze the accepted comparison to immutable commits and retain behavioral/contract coverage. Do not permanently require new business code to match the historical source. APK and final release acceptance remain open.

## R05C/R08/R09 final closure

Accepted implementation snapshot: [`8f4e688`](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/commit/8f4e6889e9730711d423a1f62e1942d623777490). [Quality Gates 45919483706](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483706) and [Android APK 45919483769](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483769) both completed successfully at this exact commit. [Installable debug APK artifact 15163726713](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45919483769/artifacts/15163726713), ARM64, stable signing certificate verified, exact locked npm runtime checks passed, ZIP artifact SHA-256 `9ca54407102946351c99450f0a1fe7f784f9f570bc609bbd049d1c5f84af84f1`; artifact expires 2026-12-27.

Ten bounded module exceptions are enforced by strict CI; there are zero budget violations. No new blanket exceptions. The source/build snapshot above is the immutable F02 handoff baseline. When F03 intentionally changes a historical factory, preserve the F02 comparison against this accepted snapshot and introduce a corresponding behavioral/contract test and documented change; do not silently disable current architecture, name, dependency or budget checks.

F02 source implementation and automated acceptance are CLOSED (100% of the F02 task weights). This does not establish real Android install/upgrade/device behavior, live Gemini/OpenRouter/Proxy/AI Studio calls, every third-party card, or full Phase 1 release acceptance. Those manual/external checks remain unverified and must not be represented as PASS. F03 may proceed within the source refactoring scope; no Phase 2 promotion is claimed.
