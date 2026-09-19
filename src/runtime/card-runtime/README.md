# Card Runtime source

Mốc 3 moves Card Runtime ownership out of the minified application bundle.

## Runtime assets

- `core.template.js`: portable runtime registration source. The build inserts compatibility fragments at one explicit token.
- `renderer.js`: builds the per-card render/execution script.
- `compat/*.jsfrag`: compatibility APIs grouped by ownership while preserving one lexical runtime scope.

The build step produces:

- `assets/card-runtime-core-builder-v1.3.6.js`
- `assets/card-runtime-renderer-v1.3.6.js`

The application bundle no longer embeds the 130+ KB core runtime or renderer implementation.

## Safe-mode design

Safe mode intentionally keeps the card iframe opaque-origin and does not grant `allow-same-origin`.

The parent application imports the generated core builder. The builder serializes the BOOT payload and returns an inline classic-script payload for `srcDoc`. The iframe therefore does not fetch/import the runtime itself, avoiding CORS/CSP dependence while preserving the sandbox boundary.

## Compatibility fragment boundaries

1. catalog + characters
2. personas + presets
3. extension management + raw imports
4. runtime services: regex/audio/scripts/generation
5. variables + worldbook
6. context + SillyTavern/TavernHelper exposure

These fragments are deliberately composed into one iframe runtime scope because they share runtime-local state. They can become independent ES modules later only after those state dependencies are made explicit.

## Ownership rule

Changes to Card Runtime behavior belong under `src/runtime/card-runtime/`. Never patch generated production/runtime assets directly.
