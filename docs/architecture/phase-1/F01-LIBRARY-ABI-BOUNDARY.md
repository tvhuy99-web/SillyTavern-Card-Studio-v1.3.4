# F01: Retained library ABI boundary

The first-party composition root now uses descriptive dependency names for Lodash and DOMPurify. The existing platform library adapter alone translates the three old keys required by the portable vendor snapshots. No vendor source bytes, version claims, license files or checksums are altered. The npm-backed adapters keep their existing factory ABI. Legacy public host exports `n` and `t` remain untouched for compatibility; this is an explicitly excluded public surface, not a private dependency bag.

`--check-host-aliases` prevents short-key/long-binding pairs in the composition root; it is a scoped structural gate, not a property-name ban for all JavaScript or public protocols. CI must verify zero candidates and both portable/package-backed boot paths.
