# Báo cáo sửa lỗi tương thích

## Thông tin bản phát hành

- **Ứng dụng:** SillyTavern Card Studio
- **Bản đã vá:** `1.3.6`
- **Runtime tương thích:** `4.8.19-compat.11`
- **Mốc đối chiếu SillyTavern:** `1.18.0`, tag chính thức, commit `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8`
- **Mốc đối chiếu TavernHelper:** `4.8.19`, commit `36d8889a99f1cf09d3d1f8aabd0eba33975dc64d`
- **Ngày cập nhật báo cáo:** 08/08/2026

## Tóm tắt kết quả

Bản vá ưu tiên khả năng tương thích API và an toàn dữ liệu trong phạm vi một ứng dụng web tĩnh. Kết quả hiện tại:

- **Đã sửa đầy đủ:** 5/25 mục.
- **Đã sửa một phần hoặc đạt mức tương thích gần đúng:** 18/25 mục.
- **Chưa thể sửa đầy đủ trong kiến trúc tĩnh:** 2/25 mục.

Hai giới hạn lớn còn lại là phụ thuộc CDN/offline parity và các giới hạn dung lượng riêng của Card Studio. Ngoài ra, các mục liên quan backend, extension lifecycle và parser STscript chỉ có thể đạt tương thích hoàn toàn khi chạy trên SillyTavern thật hoặc khi đóng gói lại toàn bộ backend/runtime gốc.

Bản `1.3.6` cũng bổ sung hai lớp tương thích vận hành: lưu proxy profile bền vững mà vẫn giữ secret theo phiên mặc định, và tự khôi phục composer khi request hội thoại lỗi nhưng giao diện bị kẹt ở trạng thái đang gửi.

## Trạng thái 25 lỗi

| # | Vấn đề | Trạng thái | Kết quả sau sửa |
|---:|---|---|---|
| 1 | Thiếu bundle phụ thuộc của JSZip | **Đã sửa** | Bổ sung `assets/index-yS4Vru8B.js`, khôi phục bridge CommonJS/Vite mà bundle JSZip cần. Đã kiểm tra tạo ZIP, nạp lại và đọc nội dung thành công. |
| 2 | Không có backend SillyTavern | **Sửa một phần** | Các endpoint mô phỏng tiếp tục phục vụ chức năng cục bộ; endpoint không hỗ trợ trả **501 rõ ràng** thay vì 403/404 hoặc thành công giả. Chưa có Express, session, CSRF, user storage và toàn bộ router của ST 1.18.0. |
| 3 | Không đóng gói JS-Slash-Runner thật | **Sửa một phần** | Bổ sung đúng cây thư mục, `manifest.json`, `dist/index.js`, `dist/index.css` và metadata 4.8.19 để discovery/version check hoạt động. Native lifecycle của extension chưa thể khởi động ngoài module graph của SillyTavern. |
| 4 | Worldbook API sai kiểu và nguy cơ xóa dữ liệu | **Sửa phần lõi, còn sai lệch thuật toán** | API giờ dùng trực tiếp `WorldbookEntry[]`, `createWorldbook()` trả boolean, updater nhận mảng, create/delete entry trả cấu trúc gần hợp đồng chính thức. Có guard từ chối dữ liệu không phải mảng nên không còn đường ghi nhầm `[]`. Binding được lưu bền vững. Đã thêm scan cơ bản theo enabled, probability, strategy, keys và scan depth. Chưa mô phỏng chính xác recursion, sticky, cooldown, delay, group scoring và vector activation. |
| 5 | Generation API chỉ hỗ trợ một phần | **Sửa một phần** | Sửa trùng `user_input` trong `generateRaw`, truyền `custom_api` cho model list, hỗ trợ alias `images`, theo dõi generation ID và trả đúng hơn cho stop. Model test kiểm tra cả nội dung `OK`. Tool execution, `tool_choice`, structured output thật, toàn bộ provider và preset/proxy parity vẫn chưa đầy đủ. |
| 6 | Extension management là giả | **Sửa một phần, hành vi đã trung thực** | Gỡ phản hồi thành công giả; install/update/reinstall/uninstall trả 501 trong static deployment. `isAdmin()` trả false; installation info theo cấu trúc chính thức; bundled helper được nhận diện. Quản lý extension thật vẫn cần backend SillyTavern. |
| 7 | Regex API không tương thích | **Sửa một phần lớn** | Bổ sung signature `text/source/destination/options`, scope global/character/preset, depth, source, destination, `trim_strings`, `run_on_edit`, trạng thái enable và persistence. Chưa tái hiện đầy đủ renderer/reload lifecycle của ST. |
| 8 | Audio API sai chữ ký và kết quả | **Đã sửa** | Tách `bgm`/`ambient`, sửa chữ ký play/pause/list/settings, trả `{src,title,playing,progress}`, lưu playlist/settings/state trong extension settings. |
| 9 | Script tree chỉ là registry tạm | **Sửa một phần** | Hỗ trợ global/preset/character, giữ folder, enabled, button và data; lưu bền vững; dựng registry character từ tree. Native iframe lifecycle và ghi ngược hoàn toàn vào card/preset gốc chưa tương đương TavernHelper. |
| 10 | Slash command/STscript chỉ hỗ trợ tập lệnh nhỏ | **Sửa một phần** | Command đăng ký bằng `registerSlashCommand()` giờ được thực thi cục bộ trước khi fallback sang parser cha. Bộ parser tích hợp vẫn chỉ hỗ trợ một tập con của SillyTavern 1.18.0. |
| 11 | SillyTavern context là dữ liệu tổng hợp | **Sửa một phần** | Context lấy characters, character index, groups, groupId, metadata, online status và main API từ boot data khi có, thay vì hardcode toàn bộ. Nhiều ngữ cảnh backend/group generation vẫn chỉ là mô phỏng. |
| 12 | Feature detection có thể cho kết quả sai | **Đã sửa** | Không còn tự tạo hàm no-op truthy cho API thiếu. `CAPABILITIES` được hạ xuống theo chức năng thực tế; extension management, structured output và tool execution không còn được quảng cáo là hỗ trợ đầy đủ. |
| 13 | Event bus không giống SillyTavern | **Sửa một phần** | Giữ bridge event giữa iframe/cha, bổ sung event gần nhất cho mutation chat và MVU. Danh mục event đã mở rộng. Payload và thứ tự lifecycle chưa thể giống hoàn toàn ST thật. |
| 14 | Variables và MVU không tương thích hoàn toàn | **Sửa một phần lớn** | Thêm schema validation, parser path hỗ trợ escaped/dotted keys tốt hơn, rollback optimistic state khi RPC lỗi, MVU start/end events và persistence theo scope. Export/import lifecycle và đồng bộ native vẫn chưa hoàn toàn giống TavernHelper. |
| 15 | Chat import làm mất dữ liệu | **Đã sửa** | Giữ name, hidden/system state, data/variables, extra, swipes, swipe data/info, swipe ID, reasoning, tool calls, attachments và toàn bộ bản ghi gốc tại `extra.__sillyTavernRaw`. |
| 16 | Message API sai return type và bỏ qua refresh | **Sửa một phần lớn** | Mutation trả `Promise<void>` và phát event theo `refresh`. Vì không có renderer ST thật, `affected/all` chỉ có thể mô phỏng event và cập nhật UI Card Studio. |
| 17 | Character, persona và preset chưa đầy đủ | **Sửa một phần** | Cải thiện context/catalog, persistence và timing một số thao tác. Blob avatar, `delete_chats`, render options, persona avatar semantics và toàn bộ preset lifecycle vẫn chưa đạt parity. |
| 18 | Storage khác môi trường gốc | **Sửa một phần lớn** | Thay localforage shim bằng lớp IndexedDB có fallback, hỗ trợ Blob/binary, `createInstance`, `iterate`, CRUD và keys/length. Safe mode/full mode vẫn khác mô hình lưu trữ và cô lập của SillyTavern. |
| 19 | Phiên bản runtime tự mâu thuẫn | **Đã sửa** | Đồng bộ `version.json`, HTML và runtime thành `4.8.19-compat.11`; phiên bản ứng dụng thống nhất thành `1.3.6`. |
| 20 | Hai chế độ dùng dependency khác nhau | **Sửa một phần** | Đồng bộ các lệch xác định: Vue 3.5.40, Vue Router 5.2.0 và EJS 3.1.9. Kiến trúc current/official-local vẫn không dùng cùng một module graph hoàn toàn. |
| 21 | Phụ thuộc mạnh vào CDN | **Chưa sửa đầy đủ** | CSP đã khai báo rõ các nguồn cần thiết và lỗi tải được báo chẩn đoán. Chưa vendor toàn bộ Vue/YAML/jQuery/CSS runtime, vì vậy offline parity chưa đạt. |
| 22 | Rủi ro lộ API key ở full mode | **Sửa một phần** | Chuyển Gemini/OpenRouter/proxy secrets từ localStorage sang sessionStorage, xóa key cũ, thêm CSP và đổi framing sang SAMEORIGIN. Trong full same-origin compatibility mode, card script vẫn có thể tiếp cận storage của origin, nên chưa thể coi là cách ly hoàn toàn. |
| 23 | Giới hạn triển khai | **Sửa một phần lớn** | Chuyển asset chính sang relative path, hỗ trợ deploy dưới subpath, đổi `DENY` thành `SAMEORIGIN`, sửa cache cho file không hash, bổ sung manifest/report/source patch. Chưa có source map, lockfile và mã nguồn React gốc đầy đủ để build byte-for-byte. |
| 24 | Model connection test chưa phản ánh đầy đủ | **Sửa một phần lớn** | Kiểm tra output phải chứa `OK`, parse đúng response theo provider và trả preview/latency. Vẫn gửi request thật, có thể tốn quota; DOM heuristic và timeout cố định chưa bị loại bỏ hoàn toàn. |
| 25 | Các giới hạn riêng không có trong hợp đồng gốc | **Chưa sửa đầy đủ** | Các guard dung lượng/bước vẫn tồn tại để bảo vệ tab trình duyệt. Chưa chuyển toàn bộ thành cấu hình và chưa đạt giới hạn tương đương backend ST. |

## Các tệp phiên bản hiện hành

- `assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js`
- `assets/model-connection-test-v1.3.6-v2.js`
- `assets/proxy-persistence-fix-v1.3.6.js`
- `assets/chat-send-recovery-v1.3.6.js`
- `index.html`
- `package.json`
- `version.json`
- `_headers`
- `_redirects`
- `api-unavailable.json`
- `patch-src/*`

## Kiểm thử đã thực hiện

1. Kiểm tra cú pháp tất cả JavaScript thực thi trong gói bằng `node --check`.
2. Kiểm tra parse cho toàn bộ JSON.
3. Kiểm tra tất cả `src`/`href` cục bộ trong HTML đều tồn tại.
4. Quét import tương đối trong JavaScript và xác nhận không còn module bị thiếu.
5. Chạy round-trip JSZip: tạo archive, nạp lại và đọc `hello.txt` thành công.
6. Dựng runtime đã nội suy trong Node VM với DOM/bridge giả lập; kiểm tra khởi tạo, Regex, Audio, slash command đăng ký, Script Tree, Worldbook guard và capability reporting.
7. Kiểm tra các invariant của bản vá: version thống nhất, endpoint static trả 501, manifest TavernHelper tồn tại, guard Worldbook và capability trung thực có trong runtime.
8. Kiểm tra regression proxy persistence và chat-send recovery bằng Node VM.
9. Kiểm tra tính toàn vẹn ZIP sau đóng gói bằng `unzip -t` khi tạo gói phát hành.

### Giới hạn kiểm thử

Thử nghiệm khởi chạy Chromium headless trong môi trường đóng gói trước đây không hoàn tất vì tiến trình Chromium bị treo trước khi gửi request tới máy chủ cục bộ. Do đó gói đã qua kiểm tra tĩnh, module/asset, JSON, ZIP và JSZip runtime bằng Node, cùng smoke test runtime bằng Node VM, nhưng **chưa được xác nhận end-to-end bằng trình duyệt thật trong chính môi trường này**. Cần smoke test thủ công trên Chrome/Edge/Firefox trước khi đưa vào production.

## Kết luận kỹ thuật

Bản vá loại bỏ các lỗi nguy hiểm nhất: JSZip bị hỏng, nguy cơ Worldbook ghi rỗng, mất metadata khi import chat, feature detection giả, version mâu thuẫn, extension operation báo thành công giả, proxy profile bị mất/khôi phục nửa vời và composer bị kẹt sau request lỗi. Các API Regex, Audio, Script Tree, Variables, Chat Message và Generation đã gần hợp đồng TavernHelper 4.8.19 hơn đáng kể.

Tuy vậy, Card Studio vẫn là một runtime tĩnh. Tương thích tuyệt đối với SillyTavern 1.18.0 chỉ có thể đạt bằng một trong hai hướng:

1. chạy Card Studio như extension/tool bên trong SillyTavern thật; hoặc
2. đóng gói backend SillyTavern cùng native TavernHelper và dùng Card Studio như giao diện bổ sung.

Trong phạm vi static deployment, bản `1.3.6` là phiên bản phát hành hiện hành và là nguồn version duy nhất cho metadata ứng dụng.
