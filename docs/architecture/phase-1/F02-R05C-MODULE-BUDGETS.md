# R05C: Bounded module size exceptions

Baseline: `09076a5`, [Quality Gates 45917958410](https://github.com/tvhuy99-web/SillyTavern-Card-Studio-v1.3.4/actions/runs/45917958410). The ten actual >500-line owners have reviewed line and byte ceilings; ordinary modules must not exceed 500 lines without an explicit review. Line headroom is the greater of 20 lines or 5%, capped at 800; byte headroom is 10%. The four old exceptions for small static/generated files are removed. A budget violation or missing exception owner fails strict CI. Inline self-tests check boundary conditions and bypass attempts using long lines. Static import/re-export dependency hotspots are reported as review evidence, not arbitrary hard caps; exact domain/UI composition contract gates independently preserve wiring.

| Owner | Baseline lines | Maximum lines | Baseline bytes | Maximum bytes |
|---|---:|---:|---:|---:|
| `src/features/chat/ui/chat-controls.js` | 681 | 716 | 28354 | 31190 |
| `src/features/chat/regex-processing.js` | 612 | 643 | 20127 | 22140 |
| `src/ui/components/input-controls.js` | 558 | 586 | 18045 | 19850 |
| `android-native/EmbeddingGemma2LiteRTPlugin.java` | 571 | 600 | 28611 | 31473 |
| `src/features/rpg/ui/mythic/mythic-configuration-dialog.js` | 777 | 800 | 38478 | 42326 |
| `src/ui/card-runtime/card-frame.js` | 716 | 752 | 29683 | 32652 |
| `src/features/chat/ui/chat-session-screen.js` | 572 | 601 | 23613 | 25975 |
| `src/features/rpg/ui/actions/action-suggestion-dialog.js` | 550 | 578 | 26457 | 29103 |
| `src/features/rpg/ui/database/rpg-database-editor.js` | 542 | 570 | 28348 | 31183 |
| `src/features/chat/session/session-list-screen.js` | 509 | 535 | 19359 | 21295 |

A budget change requires documented responsibility review, not an automatic increase. This is a size/ownership regression guard, not a claim that every short module is cohesive. The Phase 1 Android workflow now also builds this exact acceptance branch. No application source, data schema or public runtime interface changes in this batch.
