// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRuntimeDiagnostics(dependencies = {}) {
  var diagnosticStorageKey = "st-card-studio:card-runtime:diagnostics:v1";
  var diagnosticSuggestions={CARD_RUNTIME_BOOTSTRAP_FAILED:"Kiểm tra phần bootstrap của runtime và thư viện được nạp trước khi script thẻ bắt đầu chạy.",CARD_RUNTIME_DEPENDENCY_MISSING:"Kiểm tra kết nối mạng/CDN hoặc ánh xạ thư viện. Tên thư viện thiếu nằm trong trường chi tiết của báo cáo.",CARD_RUNTIME_COMPAT_API_MISSING:"API tương thích mà thẻ đang gọi chưa tồn tại trong runtime. Kiểm tra missingIdentifier và phiên bản tương thích, sau đó bổ sung hoặc ánh xạ API tương ứng.",CARD_RUNTIME_HTML_PARSE_FAILED:"Kiểm tra cấu trúc HTML đầu vào, đặc biệt là thẻ chưa đóng, thuộc tính hỏng hoặc tài liệu HTML lồng nhau.",CARD_RUNTIME_IMPORTMAP_INVALID:'Kiểm tra JSON trong thẻ <script type="importmap">. Runtime sẽ bỏ qua import map hỏng và tiếp tục bằng ánh xạ mặc định.',CARD_RUNTIME_EJS_RENDER_FAILED:"Kiểm tra cú pháp EJS và các biến được truy cập trong template. Xem script/vị trí được ghi trong báo cáo.",CARD_RUNTIME_SCRIPT_FAILED:"Kiểm tra scriptId, scriptName và stack trace. Lỗi thường nằm ngay tại dòng đầu tiên thuộc card-runtime-*.js trong stack.",CARD_RUNTIME_CALLBACK_EXPECTED_FUNCTION:"Một API hoặc callback mà script truyền vào không phải hàm. Xem lodashMethod, argumentTypes, scriptId và scriptName để biết chính xác lời gọi cần sửa hoặc API tương thích còn thiếu.",CARD_RUNTIME_RESOURCE_LOAD_FAILED:"Kiểm tra URL tài nguyên, <base href>, kết nối mạng, CORS và tài nguyên nhúng của CHARX.",CARD_RUNTIME_PROMISE_REJECTION:"Kiểm tra promise không có catch trong script thẻ. Stack trace sẽ chỉ ra script gây lỗi khi trình duyệt cung cấp được.",CARD_RUNTIME_RPC_TIMEOUT:"Kiểm tra phương thức RPC được ghi trong báo cáo và xem luồng xử lý phía ứng dụng có bị treo hay không.",CARD_RUNTIME_RPC_FAILED:"Kiểm tra tên phương thức RPC, tham số và lỗi gốc phía ứng dụng trong phần chi tiết.",CARD_RUNTIME_RPC_UNSUPPORTED:"API này chưa được môi trường hỗ trợ. Dùng TavernHelper.capabilities để kiểm tra trước hoặc bổ sung handler tương ứng.",CARD_RUNTIME_PAYLOAD_TOO_LARGE:"Giảm kích thước dữ liệu gửi qua cầu nối hoặc chia dữ liệu thành nhiều phần nhỏ hơn.",CARD_RUNTIME_STORAGE_FAILED:"Kiểm tra quota/bộ nhớ trình duyệt và dữ liệu có thể tuần tự hóa thành JSON hay không.",CARD_RUNTIME_RENDER_FAILED:"Kiểm tra HTML được render, script khởi tạo giao diện và lỗi DOM xuất hiện ngay trước báo cáo này.",CARD_RUNTIME_SANDBOX_BLOCKED:"Thao tác bị sandbox chặn vì lý do an toàn. Dùng API cầu nối thay vì truy cập trực tiếp cửa sổ cha hoặc backend SillyTavern.",CARD_RUNTIME_HUD_SNAPSHOT_FAILED:"Kiểm tra iframe nguồn còn hoạt động hay không. Đóng và mở lại HUD để yêu cầu ảnh chụp DOM mới.",CARD_RUNTIME_STREAM_PREVIEW_FAILED:"HTML đang stream chưa hoàn chỉnh hoặc không thể parse. Bản runtime đầy đủ vẫn sẽ được dựng khi AI trả lời xong.",CARD_RUNTIME_UNKNOWN_ERROR:"Gửi toàn bộ báo cáo chẩn đoán, đặc biệt là mã lỗi, giai đoạn, thành phần và stack trace để khoanh vùng chính xác."};
  var limitText = (value, maxLength = 2e4) => String(value ?? "").slice(0,maxLength);
  var sanitizeDetails = value => {
    if (value && "object" == typeof value && !Array.isArray(value)) try {
      let serialized = JSON.parse(JSON.stringify(value, (key, item) => "string" == typeof item ? item.slice(0,4e3) : item));
      return serialized && "object" == typeof serialized && !Array.isArray(serialized) ? serialized : void 0;
    } catch { return {serializationError: limitText(value,1e3)}; }
  };
  var createDiagnostic = input => ({
    id: input.id || `card-diagnostic-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    code: input.code || "CARD_RUNTIME_UNKNOWN_ERROR", severity: input.severity || "error",
    phase: limitText(input.phase || "unknown",200), component: limitText(input.component || "card-runtime",200),
    message: limitText(input.message || "Unknown card runtime error"),
    suggestion: limitText(input.suggestion || diagnosticSuggestions[input.code] || diagnosticSuggestions.CARD_RUNTIME_UNKNOWN_ERROR),
    timestamp: input.timestamp || Date.now(),
    ...input.stack ? {stack:limitText(input.stack,5e4)} : {},
    ...input.scriptId ? {scriptId:limitText(input.scriptId,300)} : {},
    ...input.scriptName ? {scriptName:limitText(input.scriptName,500)} : {},
    ...input.resourceUrl ? {resourceUrl:limitText(input.resourceUrl,4e3)} : {},
    ...input.method ? {method:limitText(input.method,300)} : {},
    ...Number.isFinite(input.messageId) ? {messageId:Number(input.messageId)} : {},
    ...input.characterId ? {characterId:limitText(input.characterId,500)} : {},
    ...input.chatId ? {chatId:limitText(input.chatId,500)} : {},
    ...sanitizeDetails(input.details) ? {details:sanitizeDetails(input.details)} : {}
  });
  var normalizeDiagnostic = (value, defaults = {}) => {
    let input = value && "object" == typeof value && !Array.isArray(value) ? value : {};
    return createDiagnostic({
      code:input.code||defaults.code||"CARD_RUNTIME_UNKNOWN_ERROR",severity:input.severity||defaults.severity||"error",
      phase:input.phase||defaults.phase||"unknown",component:input.component||defaults.component||"card-runtime",
      message:input.message||defaults.message||"Unknown card runtime error",suggestion:input.suggestion||defaults.suggestion,
      stack:input.stack||defaults.stack,scriptId:input.scriptId||defaults.scriptId,scriptName:input.scriptName||defaults.scriptName,
      resourceUrl:input.resourceUrl||defaults.resourceUrl,method:input.method||defaults.method,messageId:input.messageId??defaults.messageId,
      characterId:input.characterId||defaults.characterId,chatId:input.chatId||defaults.chatId,details:input.details||defaults.details,
      id:input.id,timestamp:input.timestamp
    });
  };
  var formatDiagnostic = diagnostic => {
    let lines = ["BÁO CÁO CHẨN ĐOÁN THẺ HTML","",`Mã lỗi: ${diagnostic.code}`,`Mức độ: ${diagnostic.severity}`,`Giai đoạn: ${diagnostic.phase}`,`Thành phần: ${diagnostic.component}`,`Thời gian: ${new Date(diagnostic.timestamp).toLocaleString()}`];
    if (diagnostic.method) lines.push(`RPC/API: ${diagnostic.method}`);
    if (diagnostic.scriptId) lines.push(`Script ID: ${diagnostic.scriptId}`);
    if (diagnostic.scriptName) lines.push(`Script: ${diagnostic.scriptName}`);
    if (void 0 !== diagnostic.messageId) lines.push(`Message ID: ${diagnostic.messageId}`);
    if (diagnostic.resourceUrl) lines.push(`Tài nguyên: ${diagnostic.resourceUrl}`);
    lines.push("","NGUYÊN NHÂN",diagnostic.message,"","GỢI Ý SỬA",diagnostic.suggestion);
    if (diagnostic.stack) lines.push("","STACK TRACE",diagnostic.stack);
    if (diagnostic.details && Object.keys(diagnostic.details).length) lines.push("","CHI TIẾT KỸ THUẬT",JSON.stringify(diagnostic.details,null,2));
    return lines.join("\n");
  };
  var appendDiagnostic = diagnostic => {
    if (!(typeof window > "u")) try {
      let saved = JSON.parse(window.localStorage.getItem(diagnosticStorageKey) || "[]");
      let diagnostics = Array.isArray(saved) ? saved : [];
      diagnostics.unshift(diagnostic);
      window.localStorage.setItem(diagnosticStorageKey, JSON.stringify(diagnostics.slice(0,120)));
    } catch {}
  };
  return { storageKey: diagnosticStorageKey, createDiagnostic, normalizeDiagnostic, formatDiagnostic, appendDiagnostic };
}
