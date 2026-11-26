# R1.1 | Bản đồ chức năng

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

| ID | Miền | Chủ sở hữu hiện tại | Chủ sở hữu đích |
|---|---|---|---|
| F01–02 | Boot, shell, navigation | entry + legacy | app |
| F03–04 | App state, session | legacy + app/state, persistence | app composition + features/chat + platform/storage |
| F05–07 | Connection settings, catalog, credential | legacy, diagnostics, proxy persistence | features/connections + providers + platform/storage |
| F08 | Generation | gateway + legacy helpers | providers |
| F09–10 | Chat, streaming | conversation-service, live-stream-store | features/chat |
| F11 | Arena | state-machine + transform | features/arena |
| F12–13 | Character, persona | legacy + runtime compatibility | features/characters, personas |
| F14–15 | Preset, prompt | normalizer + prompt-service + legacy core | features/presets, prompts |
| F16–17 | Lorebook, Smart Scan | legacy + smart-scan-service | features/world-info |
| F18 | Embedding | embedding-service + bridges | features/world-info/embedding + platform/android |
| F19 | Variables | features/state + runtime mirror | features/variables |
| F20 | RPG/Mythic | legacy + response-processor | features/rpg |
| F21 | Story, summary, co-pilot | legacy + transforms | features/tools (tách theo use case khi cần) |
| F22 | Regex | legacy + runtime | features/regex + runtime adapters |
| F23–25 | Card HTML, TavernHelper/MVU, slash/extension | runtime template, jsfrag + host legacy | runtime/card, runtime/host, runtime/compat |
| F26 | Audio/HUD/visual state | runtime + legacy | features/media, variables + runtime adapters |
| F27 | Logs/diagnostics | diagnostics + legacy | diagnostics |
| F28 | Native/export | Java + JS bridges | platform/android, platform/export |

Mỗi ID phải có fixture/characterization test và chủ sở hữu trước khi di chuyển. Đây là bản đồ cấp miền, chưa phải danh mục mọi màn hình/nút. Không bỏ chức năng chỉ vì không có import tĩnh.
