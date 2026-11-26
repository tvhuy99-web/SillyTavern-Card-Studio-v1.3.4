# Block C: Legacy cleanup, dependency ownership and package-backed build

Baseline: STCS-Phase1-Block-B-87.zip. This delivery continues phase 1 architecture work; UI redesign, performance optimization, data-format migration and APK acceptance are outside the verified changes.

## Progress estimate: 67/100

| Criterion | Weight | Earned | Reason |
| --- | ---: | ---: | --- |
| Legacy cleanup | 25 | 23 | Twelve obsolete transforms and input deleted; active transitional compatibility remains |
| Dependency ownership and provenance | 25 | 13 | Isolated pinned package manifest and SHA-256 inventory; no verified registry installation, lockfile or license review |
| Package-backed React/runtime build | 25 | 12 | Five public-API adapters and isolated esbuild pipeline, but unexecuted with real npm dependencies and no full JSX source build |
| Source/asset/deployment separation | 15 | 14 | Node-only portable build and restricted static server; historical public asset URLs and generated copies retained |
| Regression and acceptance | 10 | 5 | Portable regression, graph and JDK checks passed; package build/browser acceptance unverified |
| Total | 100 | 67 | Technical scope estimate, not elapsed time |

A remains 94%, B remains 87%. D has not started as a separate block.

## Implemented

- Removed all 12 files in `build/transforms/` and `legacy/app-bundle-input-v1.3.6.js` (the old 1,718,630-byte source input), plus three tests solely for historical patch matching. Retained the Card Runtime extraction test's actual assembly, script escaping and renderer syntax assertions. Migrated five legacy-dependent tests to current ownership. Historical evidence documents remain, not build inputs.
- Introduced an isolated npm package manifest (ten exact candidate pins) and five adapter entrypoints under `build/npm-runtime/`. `build/build-npm-runtime.mjs` emits into a staging directory, checks exported ABI and external imports, then publishes `dist-npm/`. It never overwrites committed assets with package output. Kept the default portable build unchanged apart from selecting public Immer Map/Set initialization if the alternate runtime exposes it.
- Introduced a manual CI package-runtime acceptance job and a package-backed ABI behavior test. Neither has run against installed real packages in this environment. No lockfile was generated. Existing source and Android CI jobs do not switch release runtime.
- Vendor inventory records 12 retained file hashes, version evidence and incomplete provenance/licensing. See DEPENDENCIES.md.
- Replaced Express server with built-in Node HTTP, serves only whitelisted public deployment routes from `dist/`, 501 API fallback, 404 missing asset, GET/HEAD, MIME/cache policy, universal headers from `_headers`, no source or Git exposure. Tests use a synthetic HTTP request/response object, not a real network binding. Root npm manifest no longer has runtime dependencies; experimental packages are isolated.
- Public asset paths and CSS remain unchanged; Android native source, database schema, Card Runtime source and original vendor snapshots remain byte-identical to the baseline.

## Validation

- `npm run build`: pass, application host 45,042 bytes, zero historical transforms executed.
- `npm test`: 61/61 current test files passed (63 baseline minus 3 obsolete transform-only tests plus 1 new test). The mixed Card Runtime extraction test is retained with its live assembly checks. The new test covers source inventory, adapter declarations, vendor hashes, module interop and public server route/response handling.
- `npm run verify:vendor`: 12/12 inventory checks passed.
- `npm run test:native-java`: 19 Java files parsed, JDK contract tests passed, 4/4 decoded WebView script syntax checks passed. Not Android framework compilation.
- `npm run test:android-overlay`: fixture and idempotence passed.
- TypeScript 5.8.3 literal source graph: 153 nodes, 195 edges; generated assets: 156 nodes, 196 edges. Zero parse errors, unresolved relative paths or detected static cycles. This does not prove computed imports or embedded scripts safe. Experimental package adapters are checked syntactically by the new test, not part of the default source/asset graph.
- Legacy candidate audit: zero syntax errors or unresolved removed embedding symbols in host.
- `npm run build:npm`: failed due to missing esbuild; `npm view` confirmed EAI_AGAIN for npm registry. Official package versions/exports, lockfile, npm build, browser mounting and Android APK remain unverified. No live provider calls or UI image comparisons. No GitHub push.

## Remaining C work

Validate package registry pins and API behavior, commit actual lockfile, review package licenses and original retained assets, run package-backed and browser acceptance, then switch release builds if validated. Continue removing recovered aliases/private fallback and standardize the full source build (including JSX and asset ownership) without losing iframe compatibility. Retain A/B acceptance obligations for final block D.

Delivery inventory: 640 tracked files, excluding local build directories and node_modules.
