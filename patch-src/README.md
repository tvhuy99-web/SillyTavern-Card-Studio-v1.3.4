# Patch source and validation material

This directory is included to make the compatibility work auditable even though the uploaded release did not contain its original React/Vite source tree.

- `apply_compat_patch.py`: the structured patch used for the main embedded compatibility runtimes.
- `runtime-*-original.txt`: runtime templates extracted from the uploaded v1.3.4 bundle before patching.
- `runtime-current-*.txt`: runtime templates extracted from the final v1.3.5-compat bundle.
- `validate_package.py`: static package validation.
- `test-jszip.mjs`: runtime JSZip round-trip validation.
- `test-proxy-persistence.mjs`: regression coverage for proxy-profile migration, stale session cache handling, session-only secrets and opt-in remembered secrets.

The release bundle also received small direct minified-bundle fixes after the structured patch, including model-response validation, session-only secret storage, basic Worldbook activation, slash-command dispatch, relative deployment paths and packaging metadata. The proxy persistence layer in `assets/proxy-persistence-fix-v1.3.5.js` now runs before the main bundle so proxy profile metadata has one persistent source of truth while credentials remain session-only by default. Users can explicitly opt in to remembering proxy credentials on their device. The final bundle, compatibility report and runtime persistence patch are the source of truth.
