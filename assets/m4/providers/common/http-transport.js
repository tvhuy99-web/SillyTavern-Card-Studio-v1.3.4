import { redactUrl } from '../../../m8/diagnostics/network-redaction.js';

const ABORT_MESSAGE_PATTERN = /(?:the user aborted a request|generation was stopped|operation was aborted|signal is aborted)/i;
const PROXY_ERROR_STATUSES = new Set([500, 502, 504]);
const MAX_ERROR_DETAIL_LENGTH = 20000;

function serializeHeaders(headers) {
  return headers ? Object.fromEntries(new Headers(headers).entries()) : {};
}

function isAbortError(error, signal) {
  return Boolean(
    signal?.aborted
    || error?.name === 'AbortError'
    || ABORT_MESSAGE_PATTERN.test(String(error?.message || '')),
  );
}

function extractForwardErrorDetail(rawText) {
  if (!rawText) return '';
  try {
    const parsed = JSON.parse(rawText);
    const detail = parsed?.error?.message ?? parsed?.error ?? parsed?.message;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
    return rawText;
  } catch {
    return rawText;
  }
}

export function createHttpTransport(deps = {}) {
  const getConnectionSettings = deps.getConnectionSettings || (() => ({ directFetchBypass: true }));
  const fetchFn = deps.fetch || deps.fetchImpl || ((...args) => globalThis.fetch(...args));
  const logger = deps.logger ?? console;
  const forwardPath = deps.forwardPath || '/api/forward';

  async function request(url, init = {}) {
    const targetUrl = String(url ?? '');
    if (targetUrl.startsWith('/api/') || !targetUrl.startsWith('http')) {
      return fetchFn(targetUrl, init);
    }

    const { directFetchBypass } = getConnectionSettings() || {};
    if (directFetchBypass ?? true) {
      try {
        logger?.log?.(`[Direct Fetch] Connecting directly to API: ${redactUrl(targetUrl)}`);
        return await fetchFn(targetUrl, init);
      } catch (error) {
        if (isAbortError(error, init?.signal)) throw error;
        logger?.warn?.(`[Direct Fetch] Direct connection to ${redactUrl(targetUrl)} failed:`, error);
        throw new Error(
          `Kết nối trực tiếp thất bại. Lỗi gốc: ${error?.message || error}. (Gợi ý: Nếu API của bạn chặn CORS hoặc mạng có vấn đề, bạn có thể thử tắt "Tự động Kết nối Trực tiếp" trong Cài đặt API để sử dụng Proxy dự phòng)`,
        );
      }
    }

    const forwardPayload = {
      url: targetUrl,
      method: init?.method || 'GET',
      headers: serializeHeaders(init?.headers),
      body: init?.body,
    };

    const response = await fetchFn(forwardPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload),
      signal: init?.signal,
    });

    if (PROXY_ERROR_STATUSES.has(response.status)) {
      const readable = typeof response.clone === 'function' ? response.clone() : response;
      const rawText = await readable.text().catch(() => '');
      const detail = extractForwardErrorDetail(rawText).slice(0, MAX_ERROR_DETAIL_LENGTH);
      if (response.status === 504 || /tim(?:e|ed)[ -]?out|timeout/i.test(detail)) {
        throw new Error(
          "Máy chủ trung gian (Proxy) đã quá thời gian phản hồi. Hãy thử bật 'Tự động Kết nối Trực tiếp' hoặc kiểm tra API đích.",
        );
      }
      throw new Error(
        `Proxy Error (${response.status}): ${detail || response.statusText || 'Yêu cầu chuyển tiếp thất bại.'}`,
      );
    }

    return response;
  }

  return Object.freeze({ request });
}
