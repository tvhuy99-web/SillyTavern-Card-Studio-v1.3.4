# Application source

`src/` is the source of truth for the active application. `app/entry.js` initializes the runtime; `app/host.js` is the transitional composition root with recovered dependency aliases. The named library interface is `platform/library-runtime.js`; recovered third-party snapshots live in `vendor/`. Historical `legacy/` input and `build/transforms/` have been deleted. Do not add host-patching transforms.

- `app/state/`, `app/persistence/`: state and persistence boundaries.
- `providers/`: credentials, provider routing, generation and model catalogs.
- `features/`: domain services and feature UI.
- `ui/components/`, `ui/shell/`, `ui/settings/`: shared UI and navigation.
- `runtime/card-runtime/`: iframe runtime, bridge and host handlers.
- `platform/`: environment and library contracts.
- `diagnostics/`: diagnostics and logging.

Build modes: `npm run build` creates supported `dist/` with the existing portable asset URLs. `npm run build:source` creates direct source-relative ESM in `dist-source/`; no generated input JavaScript is required. `npm run build:npm` creates experimental `dist-npm/` using the installed and locked npm libraries. These new modes are not release defaults until actual browser/package acceptance. See `docs/architecture/phase-1/DEPENDENCIES.md`.

Recovered UI factories share the same React instance; original JSX and full naming recovery are not complete. Do not author application logic in generated `assets/`. Run the portable build, all regressions, and source-native bootstrap before delivery.
