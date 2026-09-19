# Mốc 2 — Preset ownership, không monkey-patch toàn cục

## Trạng thái

Hoàn thành.

Normal boot không còn nạp `prompt-order-identifier-fix-v1.3.6.js`. Các native API sau không còn bị ghi đè trên đường production:

- `JSON.parse`
- `JSON.stringify`
- `structuredClone`
- `Map.prototype.get`

Patch cũ chỉ được nạp nếu M3 production bundle lỗi **trước khi ứng dụng mount** và hệ thống phải chạy legacy fallback.

## Ownership mới

Prompt/prompt-order integrity thuộc feature Preset:

```text
src/features/presets/prompt-normalizer.js
              |
              +-> preset import
              +-> IndexedDB preset read
              +-> IndexedDB preset write
```

Module là pure/non-mutating. Nó không sửa object đầu vào và hoạt động với frozen/sealed state.

## Ranh giới được bảo vệ

### Import preset

Sau khi parser giới hạn kích thước/string field xong, preset được đưa qua `normalizePresetConfig()` trước khi vào store.

### Đọc IndexedDB

Danh sách preset đi qua `normalizePresetList()`. Dữ liệu legacy hỏng được sửa ngay tại ownership boundary thay vì chờ UI chạm vào.

### Ghi IndexedDB

Mọi preset được normalize trước `objectStore.put()`. Vì vậy dữ liệu mới lưu xuống là canonical.

## Quy tắc prompt order

- prompt không phải object bị loại.
- identifier được trim.
- order entry thiếu identifier bị loại.
- custom order entry không còn prompt tương ứng bị loại.
- built-in identifier hợp lệ vẫn được giữ.
- grouped `prompt_order[].order` được hỗ trợ.
- source object/array không bị mutate.

## Deployment

Source:
- `src/features/presets/prompt-normalizer.js`

Generated deployment module:
- `assets/prompt-normalizer-v1.3.6.js`

Build transform:
- `build/transforms/preset-boundary.mjs`

Regression:
- `tests/prompt-normalizer.mjs`

## Legacy fallback

`assets/prompt-order-identifier-fix-v1.3.6.js` vẫn được giữ tạm để loader legacy còn khả năng boot. Nó không còn xuất hiện trong `index.html` và không chạy trong normal production path.
