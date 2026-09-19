# Mốc 3 — Card Runtime có source riêng

## Mục tiêu

Tách Card Runtime khỏi legacy minified bundle để runtime có nơi sở hữu source rõ ràng, giữ sandbox và accessibility hiện tại.

## Source

- `src/runtime/card-runtime/core.template.js`
- `src/runtime/card-runtime/renderer.js`
- `src/runtime/card-runtime/compat/*.jsfrag`

## Build

`build/build-card-runtime.mjs` ghép sáu compatibility fragment vào core template và tạo:

- `assets/card-runtime-core-builder-v1.3.6.js`
- `assets/card-runtime-renderer-v1.3.6.js`

`build/transforms/card-runtime.mjs` loại core/renderer nhúng khỏi legacy application bundle và thay bằng hai builder import có ownership rõ.

## Sandbox

Safe mode tiếp tục không có `allow-same-origin`. Core builder chạy ở parent, serialize BOOT và trả về classic script để chèn inline trong `srcDoc`. Iframe không cần tự fetch/import runtime, vì vậy không tạo phụ thuộc CORS/CSP mới.

## Compatibility boundaries

1. catalog + characters
2. personas + presets
3. extensions + raw imports
4. services: regex/audio/scripts/generation
5. variables + worldbook
6. context + SillyTavern/TavernHelper exposure

## Invariant

- Không sửa generated runtime asset bằng tay.
- Card Runtime behavior phải được sửa dưới `src/runtime/card-runtime/`.
- Production bundle không còn chứa inline core runtime hoặc inline renderer cũ.
