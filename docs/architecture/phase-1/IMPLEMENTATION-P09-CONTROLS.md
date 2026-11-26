# Phase 1 – P09 Shared UI Controls

Baseline: STCS-Phase1-P08-P09.zip (330 files), derived from original repository commit 398165a0954f98de6c3553f32e6af2308c963260. This is a local, cumulative migration; no GitHub push.

## Changes

Six named components were recovered into three source modules, preserving their public props, rendered element structure, classes, text, accessibility attributes, React keys and callbacks:

| Legacy | Component | Owner |
|---|---|---|
| Bf | TableCellInput | src/ui/components/form-controls.js |
| Ed | ModelSelect | src/ui/components/form-controls.js |
| cn | Tooltip | src/ui/components/section-controls.js |
| ln | CollapsibleSection | src/ui/components/section-controls.js |
| St | SectionNavigator | src/ui/components/section-controls.js |
| kf | GenerateEntryButton | src/features/world-info/ui/generate-entry-button.js |

The model control retains the `data-sts-provider` attribute, known and custom model IDs, option keys, and the existing useMemo contract. It does not read storage or call providers. The navigator retains UI-local DOM traversal and does not perform business logic. The world-info button delegates generation to its caller. The existing M6 transform file contains exact-anchor transitional bindings; no new transform file or dependency was introduced. The Asset Manifest owns the three copied outputs. Factories use the same bundled React/JSX instance; these are readable JS components, not a native JSX build.

## Verification

- Node 22.16.0, TypeScript Compiler API 5.8.3. `npm run build`: PASS. `npm test`: 52/52 PASS. All old suites still pass; one obsolete string check in phase1-model-catalog now checks wiring and source output, with behavioral coverage in the new suite.
- `tests/phase1-recovered-ui-controls.mjs` compares 13 element trees against `tests/fixtures/p09-controls-baseline.json`, captured by executing the six exact old component definitions from the input ZIP in Node VM with a minimal JSX/hook stub. Callbacks normalized for tree comparison and independently exercised for table editing, known/custom model selection, section navigation and generation button. This is not actual React/browser execution or screenshot parity.
- AST inventory: 128 -> 122 top-level JSX-call candidates; 9 recovered cumulatively. This is a heuristic, not the full component count. Source graph: 57 JS nodes, 31 literal edges, 2 computed references; deployed graph: 61 JS nodes, 75 literal edges, 3 computed references. Both: 0 parse errors, unresolved literal relative imports, or cycles. Dynamic dependencies and fragments excluded.
- Production bundle: 1,497,578 -> 1,493,938 bytes. Code relocated to generated modules, not an overall size or performance improvement claim.
- No change to CSS, Android Java, legacy input, Card Runtime core/renderer, provider logic or storage schema.
- Evidence in `docs/architecture/phase-1/evidence/p09-controls-*`.

## Limits and next step

The original React source is not available; the existing host and build still depend on the legacy bundle and transforms. A native React/JSX build, official vendor dependency restoration, feature screen decomposition, browser E2E/visual regression, IndexedDB browser tests, real API and APK tests remain outstanding. ModelSelect still uses the existing provider/test UI integration; this is not a redesign or removal of its DOM enhancer. P09 and prior partially completed milestones are not accepted as complete. Next recover shared field controls and layout/navigation components with explicit props, then isolate API Settings dependencies before migrating the whole screen. Keep visual behavior and public contracts intact.
