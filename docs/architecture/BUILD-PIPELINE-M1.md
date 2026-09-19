# Mốc 1 — Build-time bundle pipeline

> **Superseded transition note:** The M1 legacy fallback described below was removed when M2/M3 completed. Production now boots only the generated owned-source bundle.


## Mục tiêu

Loại runtime patching khỏi đường khởi động bình thường mà chưa thay đổi hành vi ứng dụng.

## Luồng build

```text
legacy source bundle
  -> 19 Arena replacements
  -> 18 Core Reliability replacements
  -> 7 Arena Cancellation replacements
  -> assets/app-production-v1.3.6.js
```

Tổng cộng **44 strict replacements**. Mỗi pattern bắt buộc xuất hiện đúng một lần; thiếu hoặc trùng pattern làm build thất bại.

## Luồng runtime mới

```text
index.html
  -> các compatibility layer chưa di chuyển
  -> app-entry-v1.3.6.js
     -> app-production-v1.3.6.js
```

Đường chạy bình thường không còn fetch legacy bundle, patch text, tạo Blob URL rồi import.

## Trạng thái fallback sau Mốc 3

Fallback runtime loader của Mốc 1 đã được **gỡ bỏ hoàn toàn** khi Mốc 2/Mốc 3 hoàn tất.

`app-entry-v1.3.6.js` hiện chỉ nạp production bundle đã build sẵn. Nếu production bundle lỗi, ứng dụng báo lỗi và dừng thay vì quay lại chuỗi runtime patch cũ.

## Vì sao build-time không dùng patchArenaBundleSource()

Loader cũ phải rewrite `import.meta.url` và relative imports vì code chạy từ Blob URL.

Bundle production mới là file module thật trong `assets/`, vì vậy phải giữ nguyên module URL semantics. Builder chỉ áp dụng `ARENA_CORE_REPLACEMENTS`, sau đó Core Reliability và Cancellation.

## Source ownership

- Input chuyển tiếp: `assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js`
- Patch specifications: ba transform module hiện hành
- Builder: `build/build-production-bundle.mjs`
- Generated output: `assets/app-production-v1.3.6.js`
- Runtime entry: `assets/app-entry-v1.3.6.js`

## CI invariant

CI phải chạy builder rồi kiểm tra generated bundle không khác file đã commit. Sau đó mới chạy regression tests của các transform.

## Chưa thuộc Mốc 1

Proxy persistence, prompt-order recovery, chat recovery và các compatibility patch khác vẫn còn. Chúng sẽ được di chuyển vào module source ở các mốc tiếp theo.
