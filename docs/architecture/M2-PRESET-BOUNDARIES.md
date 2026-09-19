# Mốc 2 — Preset boundaries, không monkey-patch toàn cục

## Mục tiêu

Loại bỏ việc sửa toàn cục `JSON.parse`, `JSON.stringify`, `structuredClone` và `Map.prototype.get` trên đường chạy production.

## Kiến trúc mới

- Preset import được chuẩn hóa ngay sau khi parse.
- Preset đọc từ IndexedDB được chuẩn hóa trước khi vào store.
- Preset ghi xuống IndexedDB được chuẩn hóa trước khi persist.
- Preset update được chuẩn hóa trước cả persistence lẫn thay thế trong memory store.
- `prompt_order` hỏng/orphan bị loại bỏ tại boundary sở hữu dữ liệu, không tác động JSON/Map của phần còn lại ứng dụng.

## Source ownership

- `src/features/presets/prompt-normalizer.js` là source-of-truth.
- `build/transforms/preset-boundary.mjs` gắn normalizer vào legacy bundle chuyển tiếp.
- `assets/prompt-normalizer-v1.3.6.js` là generated asset.
- `assets/prompt-order-identifier-fix-v1.3.6.js` chỉ còn là legacy artifact, không được production boot tải.

## Invariant

Production boot không được ghi đè native JSON, structuredClone hay Map prototype.
