# Source migration workspace

Thư mục `src/` là đích của quá trình tách dần logic ra khỏi legacy minified bundle.

Không copy toàn bộ bundle vào đây. Chỉ đưa một subsystem vào `src/` khi:

1. ownership/state boundary đã xác định;
2. hành vi hiện tại đã được ghi lại;
3. patch tương ứng có thể bị xóa sau migration;
4. module mới có entry rõ ràng và không phụ thuộc DOM heuristic nếu không cần thiết.

Cây đích:

```text
src/
  app/
  features/
    chat/
    arena/
    prompts/
    world-info/
    smart-scan/
    mythic/
    summaries/
    cards/
    personas/
    presets/
    settings/
    debug/
  providers/
  runtime/card-runtime/
  compatibility/
  diagnostics/
  ui/
```

Trong Mốc 1, legacy source vẫn nằm trong `assets/` để giữ deployment ổn định. Việc di chuyển code thật sang `src/` bắt đầu ở các mốc tiếp theo.
