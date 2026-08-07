# Patch source and validation material

This directory is included to make the compatibility work auditable even though the uploaded release did not contain its original React/Vite source tree.

- `apply_compat_patch.py`: the structured patch used for the main embedded compatibility runtimes.
- `runtime-*-original.txt`: runtime templates extracted from the uploaded v1.3.4 bundle before patching.
- `runtime-current-*.txt`: runtime templates extracted from the final v1.3.5-compat bundle.
- `validate_package.py`: static package validation.
- `test-jszip.mjs`: runtime JSZip round-trip validation.

The release bundle also received small direct minified-bundle fixes after the structured patch, including model-response validation, session-only secret storage, basic Worldbook activation, slash-command dispatch, relative deployment paths and packaging metadata. The final bundle and the compatibility report are the source of truth.
