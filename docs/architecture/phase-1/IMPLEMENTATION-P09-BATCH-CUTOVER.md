# P09 major batch: source cutover and UI recovery

Baseline: STCS-Phase1-P09-Settings.zip. Scope: structural migration and regression safety, not a UI redesign or performance optimization.

## Completed

1. The active production build reads `src/app/host.js` instead of replaying 12 historical transformations against the old minified input. Before additional recovery, the new build reproduced the baseline production body byte-for-byte excluding its generated banner. Build also succeeds with both `legacy/` and `build/transforms/` temporarily removed. They remain in the repository for historical regression tests, not production build inputs. This is a source cutover, not a full source reconstruction: the residual host still contains minified app/vendor code.
2. Recovered 51 further top-level JSX-producing functions into six modules. Factories take explicit lazy dependencies and share the existing React instance. The binding aliases and props were renamed where mechanically verified; some internal locals remain minified. The baseline fixture records hashes of 53 normalized element-tree cases generated from the previous production implementations. This does not exercise actual React rendering, all branches or all callbacks.
3. API Settings now owns model test buttons in React, using explicit unsaved draft credentials, common gateway, cancellation and bounded timeout. AI Studio standalone generation probe remains disabled because native cancellation is not request-scoped. The old generic DOM model-test enhancer remains for other screens but skips the owned settings subtree.
4. Removed AI Studio model-button DOM interceptor and generated asset. React owns model status, visibility and loading. Completed diagnostic status retains the existing sessionStorage key; a shared in-flight native catalog prevents duplicate scans across controller instances; cache clear invalidates pending results. Native work may continue after timeout.
5. Proxy Ping uses the protocol-specific models endpoint and strict HTTP success instead of accepting opaque or unsuccessful responses. It verifies model-endpoint reachability/auth, not the entire generation path. Edits invalidate pending UI results; credential error text is redacted. Model cache remains URL-keyed.

## UI batch

| Owner | Recovered |
|---|---:|
| Shared input controls | 8 |
| Character sections | 11 |
| Preset sections | 12 |
| Lorebook controls/library | 9 |
| Chat controls | 10 |
| File name dialog | 1 |
| Total | 51 |

Cumulative recovered UI functions: 69. AST candidates remaining in production host: 62 (not a complete component census). Previous 113.

## Validation

- `npm run build` passes, including a separate run with archived inputs removed.
- `npm test`: 56/56 test files pass (54 old + 2 new). New tests cover 53 element-tree comparisons across 51 functions, explicit model probe targets, protocol-specific Ping, rejection on non-success HTTP, cancellation, redaction, and stale result handling. Existing catalog and settings tests also expanded.
- TypeScript 5.8.3 audit: 0 syntax diagnostics in production; 0 unresolved references to previously removed embedding symbols; no missing literal dependencies or detected cycles in the analyzed graphs. Recovery dependency audit: 51 functions, zero dependency mismatches or external binding assignments found.
- CSS, Android Java, Card Runtime source and original legacy input unchanged.
- Chromium launches, but local application navigation was blocked by the execution environment. No full browser E2E, actual provider requests, Android APK build or device testing. IndexedDB browser regression remains unverified.

## Remaining architectural debt

- 62 remaining top-level JSX candidates and the residual minified host (includes bundled vendors); not the original source. Standard React/JSX build, package dependency recovery and extraction of application store still pending.
- Historical transform sources/tests retained; asset relocation uses limited literal-import syntax rather than a general module bundler. Do not confuse removing them from production build with deleting all historical code.
- Other screens still have DOM-based recovery/model-test paths; Card Runtime retains shared fragments and some legacy callbacks, native authorization/cancellation limits remain.
- No URL+protocol/account cache partition migration or cross-storage atomic settings save; no claim of complete P03-P08 remediation.
- P10 Android not started, P11 production build cutover achieved but full cleanup incomplete, P12 final integration acceptance pending.

Evidence: `evidence/p09-major-*`, `tests/fixtures/p09-batch-ui-baseline.json` and test sources. The baseline fixture regeneration accepts `P09_BATCH_BASELINE` and `TYPESCRIPT_PATH`; normal tests require neither the old ZIP nor TypeScript.
