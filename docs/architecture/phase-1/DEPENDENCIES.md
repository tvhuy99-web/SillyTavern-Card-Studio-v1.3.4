# Dependency ownership and build modes

## Supported deployment: portable build

`npm run build` emits the original public asset URLs into `dist/`. It needs only Node.js; legacy bundle input and string-patch transforms were removed in Block C. `npm start` serves the existing `dist/` only. The Android and Netlify release workflows still select this mode. The three modes share the same application source, data formats and Card Runtime assembly.

## Source-native ESM build (verified offline, browser acceptance pending)

```sh
npm run build:source
npm run test:source-bootstrap
npm run start:source
APP_DIST=dist-source npm run test:app-browser
APP_DIST=dist-source npm run test:storage-browser
```

`dist-source/` contains the browser modules under `modules/` in their original source-relative layout, six retained static vendor assets, accessibility CSS and a freshly assembled iframe core. It does not need the historical portable output mapping for module specifiers, a pre-existing `dist/`, or committed generated JavaScript/CSS. The manifest is used to enumerate owners (two build-only JS files are explicitly excluded). `source-build.json` records SHA-256 and bytes for each payload file; the manifest does not hash itself. The server exposes `modules/*.js` only for a source-native deployment. Source/asset checks, deterministic rebuild and the real entry graph reaching the React root lookup with a DOM stub have passed. Actual browser mount has not passed; the mode is not a release default. This is direct JavaScript ESM, not reconstruction of original JSX or a Vite migration.

All internal version-query imports were removed to prevent split module identity (including Arena and turn policy; runtime guard and provider composition use the same unversioned runtime modules as host). Existing portable HTML entry URL and static CSS remain unchanged. `src/platform/library-runtime.js` is the named first-party library contract. The snapshot adapters keep recovered runtime internals out of the host; the npm Map/Set adapter uses the public `enableMapSet()` on the same bundled Immer instance.

## Experimental package-backed runtime build

```sh
npm install --prefix build/npm-runtime
# Once a real lockfile is reviewed and committed, use npm ci --prefix build/npm-runtime.
npm run audit:npm-dependencies
npm run build:npm
npm run test:npm-runtime
APP_DIST=dist-npm npm run test:source-bootstrap
APP_DIST=dist-npm npm run test:app-browser
APP_DIST=dist-npm npm run test:storage-browser
npm run start:npm
```

The isolated manifest pins ten packages. Six adapter entrypoints replace the snapshot modules within the source-native layout in `dist-npm/`; the host has the same first-party contract. React, ReactDOM, Zustand, Immer and JSON5 are bundled together so Map/Set initialization shares the correct instance. The other adapters use the public Google GenAI, Lodash, Marked and DOMPurify APIs; the separate Immer initialization adapter does not ship the snapshot's private plugin. A real npm lockfile is mandatory before building. The dependency audit checks exact direct pins, registry HTTPS origins, SHA-512 integrity entries, installed versions, optional missing platform packages and license metadata/file digests. It does not independently hash every installed file, certify package safety or constitute a legal license audit. The strict policy may require review if a real dependency has a different legitimate integrity format or packaging scheme. No fixture lock is promoted as an installation.

The workflow-dispatch job uses `npm ci` if a lock exists, otherwise creates a candidate via `npm install`; it records actual lock and metadata as a CI artifact before build, then tests package ABI, entry bootstrap and both browser suites. No automatic production promotion. All three output directories are staged before publication; a failed assembly preserves the prior output. An interrupted publish may leave a lock and backup directory; inspect the lock before removing it, then a subsequent build recovers the previous output if needed. Directory publication is not an atomic exchange or a power-loss durability guarantee.

Version strings detected in recovered code: React/ReactDOM 19.2.7, Google GenAI 1.52.0, Lodash 4.18.1, DOMPurify 3.4.12. Exact original Zustand, Immer, JSON5 and Marked versions are not established. The proposed pins and esbuild version are not independently verified equivalents. Registry access still fails EAI_AGAIN; package-backed build fails for missing esbuild, so there is no actual lockfile, installed-package evidence or official-package acceptance yet. Do not change release defaults until real installation and testing have passed.

## Integrity and licensing

`npm run verify:vendor` checks twelve retained file digests, version evidence and partial provenance recorded in `evidence/block-c-vendor-inventory.json`. The source-native manifest separately records the entire deployment payload. Neither proves licensing or provenance. Existing JSZip/EJS/Card iframe compatibility assets and their dynamic loading contracts remain in use. Review provenance, licenses and compatibility before replacement/removal. Do not regenerate a checksum solely to bypass a mismatch.
