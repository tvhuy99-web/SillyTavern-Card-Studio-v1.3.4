# Mốc 0 — Bản đồ kiến trúc hiện tại

> **Historical snapshot:** This document describes the pre-M1 architecture. M2/M3 removed the prompt/card global patches from production and moved Card Runtime ownership under `src/runtime/card-runtime/`.


## Kết luận

Dự án hiện không có cây mã nguồn React/Vite gốc đầy đủ. Nguồn chạy thực tế là một bundle minify lớn cộng với nhiều lớp patch/transform. Vì vậy việc tái cấu trúc phải đi theo hướng **ổn định source-of-truth trước, sau đó tách module dần**, không viết lại toàn bộ một lần.

## Luồng khởi động trước Mốc 1

```text
index.html
  -> các global patch
  -> arena-state-bundle-loader
     -> fetch bundle lõi
     -> Arena transform
     -> Core Reliability transform
     -> Cancellation transform
     -> Blob URL
     -> dynamic import
```

Đây là nguyên nhân chính khiến build artifact bị dùng như source code và logic production bị phân tán.

## Source-of-truth hiện tại

| Khu vực | Nguồn hiện tại | Vai trò | Đích tái cấu trúc |
|---|---|---|---|
| React/UI + app logic | `assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js` | Legacy source bundle | `src/app`, `src/features`, `src/ui` |
| Card Runtime | nhúng trong legacy bundle | iframe/TavernHelper compatibility | `src/runtime/card-runtime` |
| Arena state | `arena-state-bundle-transform-v1.3.6.4.js` | strict source transform | `src/features/arena` |
| Core reliability | `core-reliability-bundle-transform-v1.3.6.4.js` | strict source transform | module sở hữu logic tương ứng |
| Arena cancellation | `arena-cancellation-bundle-transform-v1.3.6.5.js` | strict source transform | `src/features/arena` + provider cancellation |
| Proxy persistence | `proxy-persistence-fix-v1.3.6.js` | global pre-bundle patch | `src/providers/proxy` |
| Chat recovery | `chat-send-recovery-v1.3.6.5.js` | global recovery layer | `src/features/chat` |
| Prompt-order recovery | `prompt-order-identifier-fix-v1.3.6.js` | global monkey patch | `src/features/presets` |
| Runtime dependency compatibility | `card-runtime-dependency-compat-v1.3.6.2.js` | compatibility shim | `src/runtime/card-runtime/dependencies` |
| Diagnostics/model list | `gemini-model-list-diagnostics-v1.3.6.js` | diagnostics patch | `src/diagnostics` + provider |
| Lorebook accessibility | `lorebook-item-accessibility-v1.3.6.js` | UI accessibility patch | `src/ui/accessibility` |
| UI version repair | `ui-version-display-fix-v1.3.6.js` | branding repair | loại bỏ khi UI source được tách |

## Các subsystem nằm trong legacy bundle

- IndexedDB/session persistence
- application store
- chat/generation pipeline
- prompt builder
- World Info + Smart Scan
- Mythic/RPG
- summaries
- Arena
- provider dispatch
- Card Runtime iframe bootstrap
- TavernHelper compatibility bridge
- debug/diagnostics UI
- interactive HTML rendering
- accessibility enhancement
- card/persona/preset/lorebook management

## Nợ kiến trúc cần loại bỏ

1. Runtime fetch + string patch + Blob import.
2. Global monkey patch của `JSON.parse`, `JSON.stringify`, `structuredClone`, `Map.prototype.get`.
3. DOM observers dùng để sửa state/application behavior.
4. Nhiều phiên bản patch cũ cùng nằm trong `assets/`.
5. `patch-src/runtime-current-*.txt` vừa là forensic material vừa dễ bị hiểu nhầm như source.
6. Runtime Card HTML là một khối string lớn nằm bên trong bundle.
7. State bền vững, runtime state và diagnostics state còn trộn nhau.
8. UI event handler vẫn sở hữu nhiều business logic.

## Quy tắc từ Mốc 1 trở đi

- Không thêm runtime bundle transform mới nếu có thể đưa vào build-time hoặc module source.
- `assets/app-production-*.js` là generated artifact, không sửa trực tiếp.
- Legacy bundle là nguồn chuyển tiếp duy nhất cho đến khi từng subsystem được trích sang `src/`.
- Mỗi subsystem chuyển xong phải xóa patch tương ứng, không giữ hai implementation song song.
- Accessibility là yêu cầu lõi, không phải lớp vá sau UI.
- Diagnostics không được sở hữu state cần thiết để rewind/play lại chat.

## Thứ tự tách module sau Mốc 1

1. persistence/state boundaries
2. providers + cancellation
3. chat/generation pipeline
4. prompts/presets
5. World Info/Smart Scan
6. Arena
7. Card Runtime
8. debug/diagnostics
9. UI source
