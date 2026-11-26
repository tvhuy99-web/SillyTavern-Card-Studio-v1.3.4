# R1.4 | Kế hoạch chuyển đổi

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

'
Không bắt đầu bằng rewrite UI hoặc xóa legacy. Thực hiện vertical slices nhỏ; giữ behavior cũ và thay từng ownership boundary. Branch riêng đề xuất `refactor/phase-1-source-architecture`; chưa tạo.

| PR | Công việc | Dependency | Gate trước merge |
|---|---|---|---|
| P01 | Baseline clone/AST, build/test, characterize fixtures, contract manifest | none | snapshot test baseline, failing tests được ghi rõ |
| P02 | Tooling/lockfile, source entry, build/output boundary, CI M8 | P01 | web dev/build, portable/static/APK smoke, generated diff |
| P03 | Connection settings, registry, model catalog, credential port | P01–02 | Gemini/OR/Proxy/AI Studio config parity; no UI redesign |
| P04 | Move connection test + chat/tool generation to provider adapters | P03 | BUG-001–004 regression, OpenAI/Google Native routing, stream/cancel |
| P05 | Session and storage ownership, schema migrations | P01–02 | old session/import/export/credentials fixtures, rollback |
| P06 | Chat/prompt/arena/tool use cases, reduce callback coupling | P03–05 | chat/retry/stop, prompt golden, story/RPG parity |
| P07 | World Info/embedding cleanup (12 symbols, Gc/zc/qc) | P01,P05 | AST proof, hash/index parity, scan tests |
| P08 | Runtime contracts, 21 overwritten APIs, host/iframe module split | P01,P05–06 | safe/full/official-local, real cards, RPC/event parity |
| P09 | Reconstruct remaining UI components from baseline, preserve look/behavior | P02–08 | screenshot/behavior parity, import/CRUD |
| P10 | Android boundaries and native project reproducibility | P02–04,P07–08 | APK upgrade/install, foreground, export, embedding |
| P11 | Remove legacy and retired transforms, generated copies from Git when deployment ready | P01–10 | clean build without legacy; all deployment targets |
| P12 | Re-audit, architecture rules enforced | P11 | ACCEPTANCE-CRITERIA satisfied |

P03–P10 can interleave when their actual dependency contracts permit. Avoid a giant migration PR. Each old implementation has a named replacement and removal ticket. Temporary dual path is only permitted while parity is being demonstrated; no permanent fallback. Rollback via revert of slice/branch; for storage migrations backup or reversible reader, do not roll back schema blindly.

Blocker: container cannot resolve github.com, so no AST/build execution yet. User can provide repository ZIP or use local clone/CI to run gates. Need identify original React source/source maps if available; otherwise recover readable application code from bundle with AST, characterize behavior, and extract carefully. Do not claim automated deminification restores original source names/comments.
