# Phase 1 | P01 & P02 implementation report

Baseline: upstream `398165a0954f98de6c3553f32e6af2308c963260`, supplied ZIP, 191 tracked files. Local Git snapshot created for comparison only; no upstream commit or branch was created. The ten architecture documents alongside this report are historical planning documents; this report supersedes their old statements about missing ZIP/build/AST access.

## P01: evidence

- Node 22.16.0, npm 10.9.2, TypeScript 5.8.3 (preinstalled external audit tool).
- Verified Git blob IDs: legacy `f7a7edb05ff23ca007a0837660da1bdbc993c27c`, production `c459dce446b8d37e8808b1615e2cc64ecdb4082c`.
- Original build passes, original 36/36 test files pass, no tracked asset changed.
- Lexical scope audit: `Ac Ic jc Dc Oc Rc Pc Mc Bc Uc Hc Wc` have no references reachable from outside the candidate group; `Gc zc qc` are still used. Scope audit does not prove dynamic behavior or absence of side effects; deletion remains P07. Model test call `Vs` has no resolved declaration (P04 fix, no application logic altered here).
- Literal ESM/import.meta.url dependency inventory: source 34 JS nodes / 20 literal edges / 2 computed references; assets 39 JS nodes / 46 literal edges / 3 computed references. No missing relative references, parser errors, or discovered cycles in either literal graph. This is not a full runtime or call graph; fragments, generated strings, callbacks and RPC remain separate contracts.

Reproduce read-only audits with `TYPESCRIPT_PATH=$(npm root -g)/typescript node tools/audit-legacy.cjs` and `TYPESCRIPT_PATH=$(npm root -g)/typescript node tools/audit-module-graph.cjs` if TypeScript 5.8.3 is installed globally, or install that version locally and omit the environment variable. Audit scripts are optional and not required to build/test; they intentionally flag a changed baseline anchor.

## P02: implemented

- `build/asset-manifest.mjs` centralizes ownership of 36 generated assets and 6 pre-existing static/vendor assets. Existing paths retained for compatibility. All copies and inventory are verified; unexpected files cause failure. Card Runtime builder remains the emitter of its core and renderer.
- `src/app/entry.js` imports canonical source paths, not M4–M8 output paths. Build relocates the entry's static module specifiers and explicit temporary production URL to existing public URLs; no business logic transformation. Generated entry and production bundle are byte-identical to baseline.
- `build/build-portable.mjs` stages the existing seven allowlisted deployment roots using Node's filesystem API, replacing shell-only copy commands. Portable output contains 49 files byte-identical to baseline deployment inputs.
- `npm test` discovers every `tests/*.mjs` file, runs each in a separate Node process, and fails when any test fails. CI checks all assets, including M8 and untracked nonignored assets; runs all tests instead of a manually maintained list. New test validates inventory, source/output import resolution, unmapped dependencies and JS syntax for all generated files. Three existing structural assertions were adapted to the manifest, preserving their intended ownership checks.
- Post-change `npm run build` and 37/37 test files pass. `git diff --exit-code -- assets index.html legacy android-native` passed; no runtime, visual or native artifact changes. No application source has been removed.

## Pending gates / limitations

- P01: no browser E2E, native APK, actual provider requests, dynamic card fixtures, or complete call graph/runtime coverage. Scope candidates are not authorization to delete without P07 tests.
- P02: Express is not installed in the offline environment; package lock creation failed with ENOTCACHED. Do not fabricate a lockfile. `npm install`, dev/start server, Node 20 deployment, GitHub Actions and Android APK have not been verified here. Dev server configuration is unchanged. Existing generated assets and legacy transforms must remain until later migration. No Vite/TypeScript application conversion in this slice.
- P03/P04 next: Connection Service, Provider Registry and Model Test contract; characterize/fix BUG-001–004. Do not claim Phase 1 finished.

## Usage

From the source root, `npm run build`, `npm test`. To run the existing Express server, install dependencies in an environment with registry access. Use a separate branch when applying the supplied patch. Review before merge. Keep upstream `main` intact until gates are complete.
