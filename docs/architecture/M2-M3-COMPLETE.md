# Mốc 2 + Mốc 3 — Hoàn tất tái cấu trúc preset và Card Runtime

## Mốc 2: Prompt/Preset recovery có owner rõ ràng

### Trước đây

Ứng dụng nạp một compatibility layer trước bundle và monkey-patch toàn cục:

- `JSON.parse`
- `JSON.stringify`
- `structuredClone`
- `Map.prototype.get`

Mục tiêu là chữa dữ liệu `prompts/prompt_order`, nhưng phạm vi tác động là toàn ứng dụng.

### Hiện tại

Owner thật là:

- `src/features/presets/prompt-normalizer.js`
- `build/transforms/preset-boundary.mjs`

Normalizer chỉ chạy tại các biên dữ liệu preset:

1. đọc danh sách preset từ IndexedDB;
2. ghi preset vào IndexedDB;
3. import preset;
4. update preset.

Production bundle import `assets/prompt-normalizer-v1.3.6.js` và không monkey-patch built-in JavaScript.

### Invariant

- Không thay `JSON.parse`, `JSON.stringify`, `structuredClone`, `Map.prototype.get`.
- Preset malformed được chuẩn hóa trước khi đi vào store hoặc persistence.
- Prompt order orphan/invalid bị loại ở đúng domain boundary.

## Mốc 3: Card Runtime có source riêng

### Owner

```text
src/runtime/card-runtime/
  core.template.js
  renderer.js
  compat/
    catalog-characters.jsfrag
    personas-presets.jsfrag
    extensions-imports.jsfrag
    services.jsfrag
    variables-worldbook.jsfrag
    context-exposure.jsfrag
```

### Build outputs

```text
assets/card-runtime-core-builder-v1.3.6.js
assets/card-runtime-renderer-v1.3.6.js
```

`build/build-card-runtime.mjs` ghép 6 compatibility fragment vào core template rồi sinh core builder. Renderer được copy từ source owner.

`build/transforms/card-runtime.mjs` xóa ba khối khỏi legacy application bundle:

- embedded compatibility API;
- inline Card Runtime core generator;
- inline renderer generator.

Sau đó bundle chỉ import các generated Card Runtime modules.

## Production boot

```text
index.html
  -> app-entry-v1.3.6.js
     -> app-production-v1.3.6.js
        -> prompt-normalizer-v1.3.6.js
        -> card-runtime-core-builder-v1.3.6.js
        -> card-runtime-renderer-v1.3.6.js
```

Không còn runtime transform fallback, prompt monkey-patch fallback hay Card Runtime dependency patch fallback.

## Generated-file rule

Không sửa trực tiếp:

- `assets/app-production-v1.3.6.js`
- `assets/prompt-normalizer-v1.3.6.js`
- `assets/card-runtime-core-builder-v1.3.6.js`
- `assets/card-runtime-renderer-v1.3.6.js`

Thay đổi source owner rồi chạy `npm run build:bundle`.

## Những gì còn lại cho các mốc sau

Các global patch khác như proxy persistence, chat recovery, Arena UX guard, model diagnostics và một số UI compatibility script vẫn còn. Chúng không thuộc Mốc 2/3 và sẽ được đưa về module owner ở các mốc tiếp theo.


## Cleanup và regression guard

Các artifact forensic cũ của Card Runtime đã được xóa khỏi nhánh chính:

- `patch-src/runtime-core-original.txt`
- `patch-src/runtime-current-0.txt`
- `patch-src/runtime-current-1.txt`
- `patch-src/runtime-current-2.txt`
- `patch-src/runtime-overlay-original.txt`

Git history vẫn giữ toàn bộ dữ liệu cũ nếu cần forensic.

CI chạy thêm `tests/architecture-m2-m3.mjs` để ngăn tái xuất hiện:

- global prompt monkey-patch;
- legacy Card Runtime dependency patch;
- runtime-transform loader fallback;
- Card Runtime core/renderer bị nhúng trở lại application bundle;
- generated prompt/runtime assets lệch khỏi source owner.
