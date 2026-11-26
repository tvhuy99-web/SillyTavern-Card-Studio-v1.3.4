# R1.3 | Quy chuẩn mã nguồn

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

'
1. Tên file theo chức năng, không theo đợt patch/phiên bản. Hàm đặt tên theo intent. Không tái dùng tên minify như Vs, Ks, xd trong source mới.
2. ESM import/export; dependency explicit; strict types ở hợp đồng mới (TS hoặc JSDoc + checkJs trong migration). Không dùng any để che contract chưa rõ.
3. Một nguồn sở hữu nghiệp vụ. DRY chỉ khi semantics tương đương; tránh generic abstraction vì hai đoạn mã trông giống nhau.
4. IO/DOM/platform ở adapter; use case nhận snapshot/config và AbortSignal; cleanup bằng finally/lifecycle; không nuốt lỗi nghiệp vụ. Cấu trúc error code, cause, retryability khi cần; giữ message hiện hành ở UI adapter.
5. Credentials không log, không đưa vào diagnostics exports; secret persistence phải giữ chính sách người dùng. Không thêm quyền runtime.
6. Test theo hành vi, golden fixtures trước khi sửa; test chuỗi transform chỉ tồn tại trong migration. Test lỗi/cancel và empty result; CI phải fail nếu generated output lệch.
7. Không đổi CSS, UX, timing hoặc thuật toán chỉ vì refactor. Nếu phải sửa lỗi có bằng chứng, PR riêng, test riêng, ghi nhận thay đổi hành vi.
8. Xóa code sau proof; không giữ bản cũ comment-out, file -old/-backup hoặc fallback không dùng. Git là lịch sử. Public API gọi động có contract manifest.
9. Dependency version reproducible, lockfile; nguồn vendor có license/provenance; không tự ý nâng major version trong Phase 1.
10. PR theo lát chức năng, có baseline, migration/rollback, test result, danh sách deleted symbols, boundary exception. Không auto format toàn kho trong PR nghiệp vụ.
