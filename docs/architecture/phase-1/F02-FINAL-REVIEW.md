# F02 – Imported Snapshot Architecture Review & Acceptance Report

The metrics below describe the imported F02 snapshot, not the later hardening commits or unconditional final acceptance. See [F02-HARDENING.md](F02-HARDENING.md) for current evidence.

- **Project:** SillyTavern Card Studio
- **Phase:** Phase 1 – F02 Module Decomposition & Architecture Reorganization
- **Target Branch:** `phase1-latest-2026-11-26`
- **Baseline Reference:** `d7b483fbe6d3663c313a4e4523b208156b801396`

## 1. Before vs. After Architecture Metrics

| Metric | Baseline (F01) | After F02 | Delta |
| :--- | :---: | :---: | :---: |
| Audited source files (`src/` non-vendor JS + `android-native/*.java`) | 174 | 276 | +102 focused modules |
| Modules > 1,000 lines | 12 | **0** | -12 (100% eliminated) |
| Modules 800–1,000 lines | 2 | **0** | -2 (100% eliminated) |
| Modules < 300 lines | 134 | **231** | +97 |
| Unexplained > 500-line modules (F02-G15) | 16 | **0** | -16 |
| `src/app/host.js` size | 397 lines / 70.7 KB / 101 imports | **26 lines / 1.9 KB / 9 imports** | Orchestrator-only |
| Circular dependencies (`audit:boundaries`) | 0 | **0** | Preserved |
| Architecture boundary violations (`audit:boundaries`) | 0 | **0** | Preserved |
| Unjustified unused exports (`audit:quality`) | 0 | **0** | Preserved |
| Transitional legacy-key UI factories | 0 | **0** | Preserved |
| F01 short-name regression delta | 0 | **0** | Preserved |
| Regression test suite (`npm test`) | 91/91 PASS | **91/91 PASS** | 100% PASS |

## 2. Quality Gate Verification Summary (F02-G01 .. F02-G16)
- **F02-G01 (Module ownership):** PASS (`F02-MODULE-OWNERSHIP.md`, 11/11 domains verified by `audit:quality`).
- **F02-G02 (Circular dependency):** PASS (0 cycles across `src/` and `assets/`).
- **F02-G03 (Boundary violations):** PASS (0 violations; Card Runtime UI placed in `src/ui/card-runtime/` to preserve `LAYER-RUNTIME`).
- **F02-G04 (Unresolved imports):** PASS (0 unresolved).
- **F02-G05 (Unused exports):** PASS (0 unjustified unused exports).
- **F02-G06 (Generated asset drift):** PASS (`build:portable` and `build:source` verified clean).
- **F02-G07 (F01 minified-name regression):** Historical heuristic check: delta 0. Current mandatory evidence is `audit-f01-names.cjs` (AST).
- **F02-G08 / G09 / G10 / G11 / G12:** PASS (91/91 regression, UI element-tree parity, durable recovery/rollback/write-guard, and Card Runtime tests PASS).
- **F02-G13 (Source Bootstrap & npm Runtime Build):** Source-native ESM bootstrap PASS; `npm ci` / `build:npm` requires online CI runner (offline sandbox limitation).
- **F02-G14 (Android Overlay & APK Build):** `test:android-overlay` PASS (25 flat Java files, idempotent); `test:native-java` (`javac`) and Gradle APK build + real Android AI Studio device check require CI/Android environment.
- **F02-G15 (Unexplained large modules > 500 lines):** PASS (`audit-f02-modules.cjs --strict`: 0 unexplained).
- **F02-G16 (Out-of-scope changes):** PASS (zero UI redesign, zero schema/API/protocol changes).

## Connected CI and hardening evidence

- Imported snapshot `2abd57d73301389ba00319a8898171ab3bfe0ec8`: [Quality Gates](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45911595936), [bundle regression](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45911595960) and [Android APK](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45911595964) succeeded.
- UI composition extraction `71cdfb5cea5de9aedd01529cad3768e221db877c`: [Quality Gates](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45912977965) succeeded, including package-backed npm build and real Chromium/IndexedDB acceptance. Native contract and overlay checks passed. The Android APK workflow is not automatically triggered by a direct phase-branch push.
- R01/R02/R03 are implemented and verified; R04/R05/R09 remain open. Fresh Gradle APK/device checks and live provider acceptance are separate from AST, unit tests and browser CI.

## R04/R05 follow-up

The previously open composition, renderer and repository work is implemented and verified at [`7e05572`](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/commit/7e05572f3b9527c2131a545844022dd95c59137c), [Quality Gates 45917732574](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45917732574). Current audit: 296 first-party JS/Java files, 251 below 300 lines, 91/91 regression files, no unresolved F01 lexical/embedded or composition alias candidates. R09 remains open pending final acceptance; the most recent proven APK remains the imported F02 snapshot, not this commit.
