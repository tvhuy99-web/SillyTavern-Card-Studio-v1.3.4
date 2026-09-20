# Mốc 7 — Final cleanup and asset policy

## Status

**Complete when the M7 regression suite passes.**

M7 removes the historical patch workspace from the production repository shape and makes file ownership explicit.

## Final ownership rules

- `src/` owns migrated application/runtime logic.
- `build/` owns deterministic build-time transforms and asset generation.
- `legacy/` contains the single minified bundle that is still required as a **build-only transitional input**.
- `assets/` contains only generated runtime artifacts, compiled/static UI assets, and vendor bundles required by the browser.
- `tests/` contains all active regression tests.
- `patch-src/` no longer exists.

The large legacy bundle is deliberately not deleted yet because the remaining UI and low-level compatibility code still originates there. M7 removes it from the shipped runtime asset tree instead of pretending that migration is complete beyond what the source proves.

## Removed historical layers

- old Arena runtime UX guard;
- old chat-send recovery scripts;
- runtime Gemini model-list patch script;
- build transform sources previously stored under `assets/`;
- obsolete patch workspace/scripts/tests;
- stale 1.3.4 patch report, patch notes, release notes and checksum manifest.

## Gemini model-list diagnostics

The model-list loader now has a source owner at `src/diagnostics/gemini-model-list.js` and is generated to `assets/m7/diagnostics/`.

It no longer monkey-patches `window.fetch`, `window.alert`, or runs a MutationObserver over rendered text. It owns only the Gemini model-list button action and its result notification.

## Guardrail

`tests/architecture-m7.mjs` enforces the final asset-root allowlist, source/generated equality, absence of the old patch workspace, build-only placement of the legacy bundle, and preservation of M4–M6 invariants.
