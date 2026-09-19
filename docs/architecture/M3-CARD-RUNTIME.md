# Mốc 3 — Card Runtime trở thành source sở hữu riêng

## Trạng thái

Hoàn thành ở cấp ownership/build architecture.

Card Runtime không còn là hai khối JavaScript lớn bị nhúng trực tiếp trong application bundle.

## Trước Mốc 3

```text
app bundle
  -> 41 KB compatibility API String.raw
  -> 131 KB Card Runtime core String.raw
  -> 14 KB renderer/executor String.raw
  -> iframe srcdoc
```

Việc sửa TavernHelper, Worldbook, Variables, HUD hoặc accessibility đồng nghĩa sửa chuỗi lớn nằm trong bundle minify.

## Sau Mốc 3

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
        |
        v
build/build-card-runtime.mjs
        |
        +-> assets/card-runtime-core-v1.3.6.js
        +-> assets/card-runtime-renderer-v1.3.6.js
```

Application bundle chỉ còn:

1. serialize BOOT payload,
2. đặt `window.__CARD_STUDIO_BOOT__`,
3. import Card Runtime core trong iframe,
4. dùng renderer module để tạo script render/execution.

## Vì sao compatibility API dùng source fragments

Các API hiện chia sẻ nhiều lexical runtime state như:

- `BOOT`
- `rpc`
- `chatHistory`
- `extensionSettings`
- `scopeCache`
- event bus
- catalog

Tách ngay thành nhiều ES module runtime độc lập sẽ buộc thêm global bridge hoặc dependency container giả, làm kiến trúc xấu hơn.

Mốc 3 vì vậy tách **ownership source** thành sáu fragment rõ ràng, sau đó build-compose chúng vào **một iframe ES module**. Khi state boundary được tách ở các mốc sau, từng fragment mới có thể trở thành module độc lập mà không tạo coupling mới.

## Runtime dependency compatibility

Patch `card-runtime-dependency-compat-v1.3.6.2.js` trước đây sửa global prototype:

- iframe `srcdoc`
- `Element.setAttribute`
- script `src`
- link `href`

chỉ để đổi Vue Router global 5.2 sang 5.1.

Mốc 3 hấp thụ mapping này vào ownership của Card Runtime:

- built-in runtime dependency URL được build thành 5.1;
- `resolveCardAsset()` normalize đúng hai URL Vue Router legacy.

Patch prototype cũ không còn trong normal boot. Nó chỉ còn phục vụ legacy fallback.

## Accessibility và HUD

Runtime source mới được lấy từ **bundle hiện hành**, không từ các `runtime-current-*.txt` cũ.

Do đó giữ nguyên các tối ưu mới:

- accessibility observer chỉ xử lý node vừa thêm;
- có cleanup khi iframe pagehide;
- HUD observer chỉ tồn tại khi subscribed;
- HUD mirror throttle 750 ms;
- unsubscribe/pagehide disconnect observer.

## Build ownership

- `build/build-card-runtime.mjs` sinh runtime assets.
- `build/transforms/card-runtime.mjs` loại Card Runtime inline khỏi app bundle.
- `build/build-production-bundle.mjs` gọi cả hai trước khi sinh production bundle.
- CI kiểm tra generated runtime assets không lệch source.

## Legacy fallback

Hai file sau vẫn tồn tại vì legacy loader cần chúng khi production boot thất bại trước mount:

- `assets/prompt-order-identifier-fix-v1.3.6.js`
- `assets/card-runtime-dependency-compat-v1.3.6.2.js`

Chúng không còn được nạp từ `index.html`.
