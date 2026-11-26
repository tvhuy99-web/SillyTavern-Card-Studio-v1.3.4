# P09: Application shell, shared navigation and switch recovery

Baseline: STCS-Phase1-P09-Controls.zip. Scope: architecture only, no visual redesign.

## Source ownership

| Legacy symbol | Source owner | Factory / implementation |
|---|---|---|
| kt | src/ui/components/icon.js | createIcon / Icon |
| Ct | src/ui/shell/application-shell.js | createAppHeader / AppHeader |
| yl | src/ui/components/form-controls.js | createToggleSwitch / ToggleSwitch |
| _u | src/ui/components/tab-controls.js | createPresetTab / PresetTab |
| eh | src/ui/components/tab-controls.js | createSettingsTab / SettingsTab |
| ay | src/ui/components/tab-controls.js | createMainTab / MainTab |
| iy | src/ui/shell/application-shell.js | createApplicationShell / ApplicationShell |
| Yf | src/features/chat/ui/chat-route.js | createChatRoute / ChatRoute |
| vu | src/ui/components/tab-controls.js | handleTabKeyDown |

Eight component implementations and the keyboard handler moved to source. Three tab variants share the existing keyboard navigation algorithm; distinct markup and classes remain intentional. Shell owns active tab and active chat selection, and receives feature screens as dependencies. Chat route does not own a second store. Icon paths and fallback retained; hook order of ToggleSwitch preserved, including useId. Header's version text unchanged. Existing single React instance is injected; no additional React dependency or new transform file.

## Validation

- npm run build: passed; npm test: 53/53 test files passed (52 previously).
- tests/phase1-recovered-ui-shell.mjs: 60 trees compared with fixture generated from exact prior production bundle definitions extracted using TypeScript AST, Node VM and the same mocked JSX runtime. Includes all named icon paths, unknown fallback, switch states, three tab styles, all shell routes and chat route variants.
- Behavior checks: switch disabled and event propagation; tab activation and disabled main tab; all six navigation keys, wrap-around, non-navigation keys and missing tablist; chat selection persists across tab changes and clears on back. Hook calls use a test double, not mounted React.
- Existing M6/M7 assertions now check source ownership rather than obsolete minified implementations. 52 prior test files pass.
- AST UI inventory: 122 -> 114 heuristic candidates; 17 components recovered cumulatively. Zero syntax diagnostics. Scope audit: 8 integrations, zero unresolved references to removed vu and zero initialization-order errors for passed bindings. Module graph: see evidence; only literal imports analyzed.
- Production bundle bytes: 1,493,938 -> 1,486,364. Not a benchmark or total deployment size reduction. 57 -> 61 JS source files. CSS, Android Java, Card Runtime and original legacy input unchanged.

## Remaining constraints

Not a restoration of the original React source. Still depends on legacy React runtime, factory integration in existing transform, and legacy feature screens. No browser E2E, visual parity, live provider calls or APK verification. API Settings Nd remains in bundle; its provider settings dependencies need separation before recovery. No GitHub push. Existing phase-1 residuals remain open.

Next recommended work: inventory provider settings UI state and split provider-specific sections, replacing DOM-injected Model Test only after parity tests. Continue feature screens and remove build-time string transforms after migrating host/store and recovering a standalone React build.

Evidence: p09-shell-build.txt, p09-shell-tests.txt, p09-shell-ui-inventory.json, p09-shell-module-graph.json, p09-shell-scope.json in evidence/.
