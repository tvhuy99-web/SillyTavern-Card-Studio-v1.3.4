# R1 | Điều kiện nghiệm thu

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

'
| Gate | Tiêu chí đo được | Bằng chứng |
|---|---|---|
| G01 | clean checkout build từ source không cần legacy minified bundle | CI command + artifact |
| G02 | 0 active transforms trên legacy; 0 direct edit generated | build graph + repository scan |
| G03 | 0 known verified dead-code candidates chưa xử lý; every deferred candidate justified | dead code register + AST reports |
| G04 | 0 unintended duplicate business owners; 34 generated copies chỉ còn nếu documented deployment requirement | ownership inventory, generated policy |
| G05 | 0 forbidden module edges/cycles (exceptions closed) | dependency checker |
| G06 | provider contract for chat/tool/test; unknown ID explicitly handled; supported proxy protocols verified | provider matrix regression |
| G07 | no application business logic DOM inference / global patch; compatibility runtime explicitly allowlisted | code scan + UI behavior tests |
| G08 | current UI retained (layout, controls, behavior), no intentional design change | baseline screenshots + E2E |
| G09 | persisted old data imports, schema and credential policy preserved | fixture migration and round trip |
| G10 | Card runtime public APIs/RPC, safe/full/official-local and dynamic script parity | ABI manifest + representative cards |
| G11 | web/Netlify/portable and Android APK workflows reproducible; APK update identity preserved | build, upgrade smoke |
| G12 | unit/integration/behavior regression suite green; baseline failing tests resolved or documented with explicit approval | CI report |
| G13 | dependency manifest/lockfile; module boundaries documented; developer instructions | review |
| G14 | no deliberate performance/UX work or new feature in Phase 1; safety invariants preserved | change scope review |

Gates are targets, not current pass results. No claim of completion before running tests. Phase 2 performance work begins only after stable source foundation. Phase 3 UI design begins after agreed architecture boundaries.
