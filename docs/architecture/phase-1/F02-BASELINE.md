# F02 Baseline Snapshot

- **Branch:** `phase1-latest-2026-11-26`
- **Reference Baseline Commit:** `d7b483fbe6d3663c313a4e4523b208156b801396`
- **Auditor Tool:** `node tools/audit-f02-modules.cjs`

## Quantitative Baseline
- Canonical JS files in `src/` (excluding `src/vendor/`): 155
- Android native Java files in `android-native/`: 19
- Total audited source files: 174
- Modules > 1,000 lines: 12
- Modules 800–1,000 lines: 2
- Modules 500–800 lines: 6 (4 documented cohesive/data exceptions + `initial-variable-service.js` + `renderer.js`)
- `src/app/host.js`: 397 lines, 70.7 KB, 101 imports
- Regression test suite: 91/91 PASS
- Boundaries (`audit:boundaries`): 0 cycles, 0 violations
- Quality (`audit:quality`): PASS (0 unjustified unused exports)
- Builds: `build:portable`, `build:source`, `test:source-bootstrap`, `test:android-overlay`, `verify:vendor` all PASS.
- Environment limitations recorded: `javac` not installed locally (`test:native-java` and Gradle APK build require CI runner); `npm ci` offline (`build:npm` requires CI runner).
