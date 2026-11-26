# Phase 1 / Block A continuation: host composition and state ownership

**Status: estimated 90% of Block A, not final acceptance.** Based on the same rubric as the previous Block A report. Work starts from STCS-Phase1-Block-A.zip. No GitHub push. This is architecture/source recovery, not a redesign or a performance benchmark.

| Rubric | Weight | Previous | Current |
|---|---:|---:|---:|
| UI candidates and wrappers | 40 | 40 | 40 |
| Extract main stores and hooks | 20 | 20 | 20 |
| Decompose internal store/hook logic and improve naming | 10 | 0 | 7 |
| Vendor/default-data ownership | 10 | 10 | 10 |
| Host composition root | 10 | 0 | 8 |
| Build/regression/bootstrap | 5 | 5 | 5 |
| Browser acceptance | 5 | 0 | 0 |
| Total | 100 | 75 | 90 |

The 7/10 and 8/10 entries are engineering estimates, not measured task counts. The remaining 3+2 points cover long recovered hooks (especially Card Runtime), catalog store internals, legacy identifiers/dependency contracts, residual provider helpers/preloader, and composition wiring. Browser acceptance remains uncredited. The overall Phase 1 completion percentage is not inferred from Block A.

## Implemented

- Recovered 42 groups of declarations into owner modules: character/preset/lorebook file codecs, macro and prompt processing, regex, RPG tables, keyword matching, script execution, speech, settings/defaults, network helpers, backup codecs, diagnostic and RPC adapters, frame context, lifecycle, and others. Lodash, Markdown and HTML sanitizer code now has vendor owners. No library upgrade or second React instance. Public asset paths and entry bridge remain stable.
- Removed 200 unused host-facing bindings from factory interfaces (the internal implementations are retained where needed). Gave 52 retained boundary outputs descriptive names, while preserving existing compatibility aliases in the host. Remaining minified local names are technical debt, not claimed fully restored original source.
- Split 3 hook factories into independent owners, extracted 7 custom hooks in their original unconditional call order: response pipeline, Smart Scan, session persistence, Smart Context, message history, slash commands and Card Runtime. Split 5 store factories into separate files and preserve compatibility barrel exports. Rewrote Session Store with explicit state actions, diagnostics/Arena action groups and an independent session RPG action module. All still use the existing Zustand/Immer instance.
- Smart Context now guards summary completion, failure, regeneration and finalization with session ID and session revision. It rejects stale callbacks and avoids duplicate summary starts while the current store is busy. This is a local state guard, not remote API cancellation or a complete same-session concurrency protocol.
- Added an explicit mountApplication composition entry with the original StrictMode and provider order. Extracted Immer Map/Set installation to its vendor owner, preserving installation order. Remaining host wiring uses getters for late dependencies; still not native React JSX/npm build.

## Verification

- Production host: 323,729 -> 50,488 bytes (84.40% smaller host, not total download size or performance). Source JS modules: 86 -> 146. 60 new source modules. 140 recovered UI components from previous milestone; 0 remaining top-level JSX candidates under the existing AST heuristic (not proof of absence of nested UI).
- 59/59 test files passed; build passed. Build also passed with legacy/ and build/transforms/ temporarily removed. No historical transforms run. New tests exercise Lorebook/Preset codecs, macros, keyword matching, regex modes, Markdown, actual React element provider order, Smart Context stale results (including same-ID revision change), and real Zustand/Immer RPG/Arena actions. Original 58 test files pass; location-sensitive architecture tests now inspect emitted owners. Sticky resolver test calls actual module rather than a minified substring.
- AST parity: 365 named declarations across 42 groups match prior host text after reversing external dependency qualification and dynamic import path relocation. Standalone setup statements and deliberate rewrites (mount, Smart Context, Session Store) excluded. See evidence/block-a-completion-parity.json and tools/verify-block-a-completion.cjs. This is not proof of runtime equivalence.
- Literal import graph: source 146 nodes/166 edges, assets 149 nodes/167 edges; each has 3 computed imports; no parse errors, unresolved literal imports, bare imports, or detected cycles. AST legacy embedding audit: no removed top-level candidates or unresolved removed symbols, no Vs call. Bootstrap imports emitted ESM up to root lookup under a DOM stub.
- CSS, Android Java, Card Runtime core fragments and renderer, historical input and transforms unchanged. No storage schema migration.

## Limitations / next work

No real browser React mount, IndexedDB, Android APK, live provider API, or external Card E2E verified this iteration. The previous environment blocker remains unresolved. Module extraction is largely preservation of recovered code, not a full rewrite. Native dependency package/build conversion belongs to Block C. The remaining 10% of Block A is the 3-point internal cleanup, 2-point residual host composition and 5-point browser acceptance. Smart Context still needs transport cancellation and broader same-session conflict handling; large Card Runtime hook and catalog store internals need further decomposition. Historical tools/evidence refer to earlier checkpoints. No remote repository change.
