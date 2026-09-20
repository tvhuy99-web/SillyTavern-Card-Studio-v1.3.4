# Mốc 6 — UI and accessibility ownership

Mốc 6 removes post-render accessibility repair from the normal boot path.

The shared switch is emitted as a native `button type="button" role="switch"`, so Enter/Space behavior comes from the platform instead of a manual keyboard handler. Lorebook entries are emitted as labelled `article` elements and expose one real title button for editing instead of a clickable `div role="button"` plus a duplicate edit icon.

Visible version text is corrected during the production build. Lorebook accessibility, preset-switch cleanup and version display no longer require MutationObservers.

UI ownership now lives under `src/ui/`: the model-connection enhancer and accessibility/performance CSS are copied to generated `assets/m6/` outputs. The model enhancer receives the M2 proxy persistence service instead of relying on the obsolete proxy-profile storage key.

M6 keeps the existing low-motion/performance presentation while moving it to source ownership.
