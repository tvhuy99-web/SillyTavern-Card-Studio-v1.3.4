# F01 — Local binding cleanup (batch 5)

The previous commit's AST report measured 2,250 baseline short bindings, 1,794 remaining, and 359/359 top-level host bindings restored (20.27% reduction in all short-name candidates). All three baseline workflows passed. This batch restores local names and expands minified control flow in 12 first-party modules, preserving factory result keys, dependency keys, error strings, file formats and existing runtime semantics. Portable mirrors are kept synchronized, including the different EPUB asset import path.

- `src/core/parse-relaxed-json.js`
- `src/ui/components/display-formatting.js`
- `src/ui/components/radio-navigation.js`
- `src/ui/components/dialog-focus.js`
- `src/ui/settings/gemini-catalog-hook.js`
- `src/features/rpg/table-lorebook-links.js`
- `src/features/presets/preset-file.js`
- `src/features/speech/audio-conversion.js`
- `src/features/rpg/rpg-import.js`
- `src/features/chat/epub-import.js`
- `src/features/world-info/lorebook-file.js`
- `src/features/speech/speech-engine.js`

The new regression test exercises radio navigation, lorebook UID collision handling, preset parsing, linked RPG data and PCM decoding. Latest AST and CI results are required; no claim of full repository-wide F01 completion.
