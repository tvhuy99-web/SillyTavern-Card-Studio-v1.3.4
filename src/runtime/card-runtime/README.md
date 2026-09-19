# Card Runtime source

Mốc 3 moves Card Runtime ownership out of the minified application bundle.

## Runtime assets

- `core.template.js`: iframe runtime bootstrap and bridge. A build token receives compatibility API fragments.
- `renderer.js`: builds the per-card render/execution script.
- `compat/*.jsfrag`: compatibility APIs grouped by ownership while preserving one lexical runtime scope.

The build step produces:

- `assets/card-runtime-core-v1.3.6.js`
- `assets/card-runtime-renderer-v1.3.6.js`

The application bundle no longer embeds the 130 KB core runtime or the renderer implementation. It only serializes the BOOT payload and imports the core module inside the iframe.

## Compatibility fragment boundaries

1. catalog + characters
2. personas + presets
3. extension management + raw imports
4. runtime services: regex/audio/scripts/generation
5. variables + worldbook
6. context + SillyTavern/TavernHelper exposure

These fragments are deliberately composed into one iframe module because they share runtime-local state. Later refactors may turn individual fragments into runtime ES modules after their state dependencies are made explicit.
