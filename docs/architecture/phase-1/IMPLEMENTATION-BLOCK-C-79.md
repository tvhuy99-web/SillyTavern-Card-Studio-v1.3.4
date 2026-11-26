# Block C continuation: direct ESM deployment, dependency contract and publication

Baseline: STCS-Phase1-Block-C.zip. Preserve default portable deployment, public HTML/CSS, Android native, Card Runtime source and database schema. A remains 94%; B remains 87%; D not yet separately started.

## Progress estimate: 79/100

| Criterion | Weight | Prior | Now | Evidence |
|---|---:|---:|---:|---|
| Legacy cleanup | 25 | 23 | 24 | All internal query-version imports removed; first-party named library contract; remaining recovered aliases and active compatibility retained |
| Dependency ownership/provenance | 25 | 13 | 16 | Mandatory real lock validation, installed metadata/license digests, CI artifact; registry install, actual lock and license clearance outstanding |
| Package-backed React/runtime build | 25 | 12 | 18 | Direct source-native ESM built and entry bootstrapped; six package adapters use same layout and official Map/Set initializer; package build and original JSX recovery not complete |
| Source/asset/deployment separation | 15 | 14 | 15 | New layout independent of pre-generated assets; stage/rollback all output modes; old layout retained as release default intentionally |
| Regression/acceptance | 10 | 5 | 6 | Two additional regression files; actual entry bootstrap, deterministic manifest and failed build preservation; browser/real packages still unverified |
| Total | 100 | 67 | 79 | Technical scope estimate, not elapsed time or tested-device completion |

## Implemented

- All 28 literal version-query edges in baseline source graph are now canonical unversioned local specifiers. Arena state machine and chat turn-policy had two URL identities; host, runtime UX guard and provider composition now consistently import their owners. Entry refers to `./host.js`; the supported portable emitter translates that path only for the historical output. Portable HTML entry and CSS remain unchanged.
- `build/source-layout.mjs`, `build/build-source.mjs`: build 152 browser modules at `modules/`, retain six vendor assets and accessibility CSS, generate Card Runtime core from source, preserve original module bytes, omit 2 build-only source JS files and historical generated app copies. `source-build.json` covers 167 payload files, 168 files including the manifest. Build from a separate clean copy containing only source, build files and six retained vendor assets (no pre-generated JS/CSS) produced identical manifest. Not a full JSX or package migration.
- `src/platform/library-runtime.js`: named contract for React/ReactDOM/JSX, store creation, Immer, JSON5, module interoperability, GenAI and the three factory runtimes. The host uses the public contract; private snapshot initialization stays behind it. npm mode has a sixth `immer-mapset` adapter using the bundled public `enableMapSet` instead of shipping the old private plugin. No vendor snapshot bytes changed.
- All three build outputs use `publishDirectory`: staged assembly, lock, previous output recovery/rollback on publication failure. This is not an atomic exchange; interrupted jobs may leave lock/backup directories. A test verifies failed assembly preserves the prior output and repeated build produces identical manifest.
- The npm build no longer calls portable build or copies its output. It assembles the source layout, substitutes six esbuild adapter outputs with contract checks and records per-adapter hashes/input paths, lock digest and installed dependency evidence. Real lockfile and exact direct pins required; policy rejects links/unapproved origins/missing integrity, inventories installed license files, permits absent optional packages. Fixture tests prove the policy behavior, not an actual install. CI creates a candidate lock when absent, uses npm ci when present, runs npm ls and uploads actual lock/license evidence. No fabricated lock.
- Static server supports explicit `start:source`/`start:npm` and only serves module JS when that layout exists. Both browser acceptance tools now use the chosen deployed build and actual static handler; storage tests choose its layout without falling back to repository assets. CI adds source-native bootstrap and browser/IndexedDB jobs and extends manual npm acceptance. No CI run or GitHub push performed.

## Validation

- Portable build PASS; source-native build PASS; actual source entry graph reached the deliberate React root sentinel with DOM stub (not a mount). Independent clean source-only build identical manifest. Regression 63/63 PASS, previous 61 plus two files. Vendor integrity 12/12. JDK native contract PASS, syntax 19 files, 4 decoded WebView scripts; overlay fixture PASS. TypeScript graph: 154 source JS nodes, 196 literal edges; 157 asset nodes, 197 edges; zero parse errors, missing relative paths, detected cycles or query edges. Computed and embedded script paths remain outside static graph guarantees.
- Registry `npm view` returned EAI_AGAIN. `npm run build:npm` fails missing esbuild; no actual dependency lock/installation/ABI test. Browser source-native acceptance attempt had no result before the configured 5s smoke deadline, not evidence of a successful mount or conclusive full-timeout failure. No browser E2E, APK or device acceptance. Source/native mode remains opt-in. No CSS, Android Java, Card Runtime source or database format changes.

## Remaining 21 points

Legacy aliases/compatibility 1; verified real dependency install, lock and license/provenance 9; package-backed build, standard JSX/source recovery 7; regression and browser acceptance 4. A/B remaining acceptance remains outstanding and will be tracked with D.
