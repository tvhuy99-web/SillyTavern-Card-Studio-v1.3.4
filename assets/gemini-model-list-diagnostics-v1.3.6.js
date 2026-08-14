(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const genericZeroPattern = /Đã tải\s+0\s+models?\s+từ\s+Google Gemini\.?/i;

  let diagnostic = null;
  let requestSerial = 0;

  const isGeminiModelListRequest = (input) => {
    try {
      const rawUrl = typeof input === 'string' || input instanceof URL
        ? String(input)
        : input && typeof input.url === 'string'
          ? input.url
          : '';
      if (!rawUrl) return null;

      const url = new URL(rawUrl, window.location.href);
      const googleHost = url.hostname === 'generativelanguage.googleapis.com';
      const modelListPath = /^\/(?:v1|v1beta)\/models\/?$/.test(url.pathname);
      return googleHost && modelListPath ? url : null;
    } catch {
      return null;
    }
  };

  const messageForHttpStatus = (status) => {
    if (status === 400 || status === 401) {
      return `Không thể tải model Google Gemini: API key không hợp lệ hoặc yêu cầu xác thực bị từ chối (HTTP ${status}).`;
    }
    if (status === 403) {
      return 'Google Gemini từ chối quyền truy cập (HTTP 403). Hãy kiểm tra giới hạn API key, quyền của dự án và việc bật Gemini API.';
    }
    if (status === 404) {
      return 'Không tìm thấy endpoint danh sách model của Google Gemini (HTTP 404). Có thể phiên bản API hoặc endpoint đã thay đổi.';
    }
    if (status === 429) {
      return 'Google Gemini đang giới hạn yêu cầu hoặc đã hết quota (HTTP 429). Hãy kiểm tra quota và giới hạn tốc độ của dự án.';
    }
    if (status >= 500) {
      return `Máy chủ Google Gemini đang gặp lỗi (HTTP ${status}). Hãy thử lại sau.`;
    }
    return `Không thể tải danh sách model từ Google Gemini (HTTP ${status}).`;
  };

  const messageForDiagnostic = () => {
    if (!diagnostic) {
      return 'Không tải được model từ Google Gemini. Ứng dụng chưa nhận được chi tiết lỗi; hãy kiểm tra API key, kết nối mạng và quyền truy cập Gemini API.';
    }

    if (diagnostic.kind === 'network-error') {
      return 'Không thể kết nối tới Google Gemini. Hãy kiểm tra mạng, proxy/CORS hoặc khả năng truy cập máy chủ Google.';
    }

    if (diagnostic.kind === 'http-error') {
      return messageForHttpStatus(diagnostic.status);
    }

    if (diagnostic.kind === 'success') {
      if (diagnostic.rawModelCount > 0) {
        return `Google Gemini đã trả về ${diagnostic.rawModelCount} model, nhưng ứng dụng không giữ lại model nào sau bước lọc tương thích. API key có vẻ hoạt động.`;
      }
      return 'Google Gemini phản hồi thành công nhưng không trả về model nào cho API key/dự án hiện tại.';
    }

    return 'Không tải được model từ Google Gemini. Hãy kiểm tra API key, kết nối mạng và quyền truy cập Gemini API.';
  };

  const replaceGenericMessage = (text) => {
    if (typeof text !== 'string' || !genericZeroPattern.test(text)) return text;
    return text.replace(genericZeroPattern, messageForDiagnostic());
  };

  const cleanNode = (node) => {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.nodeValue || '';
      const next = replaceGenericMessage(current);
      if (next !== current) node.nodeValue = next;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      const current = textNode.nodeValue || '';
      const next = replaceGenericMessage(current);
      if (next !== current) textNode.nodeValue = next;
    }
  };

  window.fetch = async function patchedGeminiDiagnosticFetch(input, init) {
    const geminiUrl = isGeminiModelListRequest(input);
    if (!geminiUrl) return nativeFetch(input, init);

    const serial = ++requestSerial;
    const isFirstPage = !geminiUrl.searchParams.get('pageToken');
    if (isFirstPage) {
      diagnostic = { kind: 'pending', rawModelCount: 0, serial };
    }

    let response;
    try {
      response = await nativeFetch(input, init);
    } catch (error) {
      if (serial >= (diagnostic && diagnostic.serial || 0)) {
        diagnostic = { kind: 'network-error', serial };
      }
      throw error;
    }

    if (!response.ok) {
      if (serial >= (diagnostic && diagnostic.serial || 0)) {
        diagnostic = { kind: 'http-error', status: response.status, serial };
      }
      return response;
    }

    try {
      const payload = await response.clone().json();
      const count = Array.isArray(payload && payload.models) ? payload.models.length : 0;
      const previousCount = diagnostic && diagnostic.kind === 'success' && !isFirstPage
        ? diagnostic.rawModelCount
        : 0;
      diagnostic = {
        kind: 'success',
        rawModelCount: previousCount + count,
        serial,
      };
    } catch {
      diagnostic = { kind: 'success', rawModelCount: 0, serial };
    }

    return response;
  };

  const nativeAlert = typeof window.alert === 'function' ? window.alert.bind(window) : null;
  if (nativeAlert) {
    window.alert = (message) => nativeAlert(replaceGenericMessage(String(message)));
  }

  const startObserver = () => {
    cleanNode(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          cleanNode(record.target);
          continue;
        }
        record.addedNodes.forEach(cleanNode);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
