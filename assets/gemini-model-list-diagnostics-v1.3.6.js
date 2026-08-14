(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const STORAGE_KEY = 'sillyTavernStudio_apiSettings';
  const MODEL_CACHE_KEY = 'sillyTavernStudio_geminiModels';
  const RESULT_KEY = 'stsGeminiModelLoadResult';
  const LOAD_BUTTON_SELECTOR = 'button[title="Tải danh sách Model từ Google Gemini"]';
  const genericZeroPattern = /Đã tải\s+0\s+models?\s+từ\s+Google Gemini\.?/i;

  let diagnostic = null;
  let requestSerial = 0;
  let activeLoad = false;

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

  const notify = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
  };

  const safeJson = (value, fallback = null) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const readApiSettings = () => {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    const parsed = safeJson(raw, { useDefault: true, keys: [] });
    return {
      useDefault: parsed && typeof parsed.useDefault === 'boolean' ? parsed.useDefault : true,
      keys: Array.isArray(parsed && parsed.keys)
        ? parsed.keys.map((key) => String(key || '').trim()).filter(Boolean).slice(0, 100)
        : [],
    };
  };

  const readVisibleManualKeys = () => {
    const field = document.querySelector('textarea[aria-label="API Key Gemini"]');
    if (!(field instanceof HTMLTextAreaElement)) return [];
    return String(field.value || '')
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 100);
  };

  const resolveGeminiKey = () => {
    const visibleKeys = readVisibleManualKeys();
    if (visibleKeys.length > 0) {
      return { key: visibleKeys[0], keys: visibleKeys, source: 'visible' };
    }

    const settings = readApiSettings();
    if (!settings.useDefault && settings.keys.length > 0) {
      return { key: settings.keys[0], keys: settings.keys, source: 'stored' };
    }

    try {
      const environmentKey = window.process && window.process.env && window.process.env.GEMINI_API_KEY;
      if (typeof environmentKey === 'string' && environmentKey.trim()) {
        return { key: environmentKey.trim(), keys: [], source: 'environment' };
      }
    } catch {}

    return { key: '', keys: [], source: 'missing' };
  };

  const persistVisibleKeysForReload = (resolved) => {
    if (resolved.source !== 'visible' || resolved.keys.length === 0) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ useDefault: false, keys: resolved.keys }));
    localStorage.removeItem(STORAGE_KEY);
  };

  const messageForHttpStatus = (status, detail = '') => {
    const suffix = detail ? ` Chi tiết: ${detail}` : '';
    if (status === 400 || status === 401) {
      return `Không thể tải model Google Gemini: API key không hợp lệ hoặc yêu cầu xác thực bị từ chối (HTTP ${status}).${suffix}`;
    }
    if (status === 403) {
      return `Google Gemini từ chối quyền truy cập (HTTP 403). Hãy kiểm tra giới hạn API key, quyền của dự án và việc bật Gemini API.${suffix}`;
    }
    if (status === 404) {
      return `Không tìm thấy endpoint danh sách model của Google Gemini (HTTP 404). Có thể phiên bản API hoặc endpoint đã thay đổi.${suffix}`;
    }
    if (status === 429) {
      return `Google Gemini đang giới hạn yêu cầu hoặc đã hết quota (HTTP 429). Hãy kiểm tra quota và giới hạn tốc độ của dự án.${suffix}`;
    }
    if (status >= 500) {
      return `Máy chủ Google Gemini đang gặp lỗi (HTTP ${status}). Hãy thử lại sau.${suffix}`;
    }
    return `Không thể tải danh sách model từ Google Gemini (HTTP ${status}).${suffix}`;
  };

  const messageForDiagnostic = () => {
    if (!diagnostic) {
      return 'Không tải được model từ Google Gemini. Ứng dụng chưa nhận được chi tiết lỗi; hãy kiểm tra API key, kết nối mạng và quyền truy cập Gemini API.';
    }

    if (diagnostic.kind === 'network-error') {
      return 'Không thể kết nối tới Google Gemini. Hãy kiểm tra mạng, proxy/CORS hoặc khả năng truy cập máy chủ Google.';
    }

    if (diagnostic.kind === 'http-error') {
      return messageForHttpStatus(diagnostic.status, diagnostic.detail || '');
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

  const redactSensitiveText = (value) => String(value || '')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/([?&](?:key|api_key|apiKey|x-goog-api-key)=)[^&#\s]*/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, '$1[REDACTED]');

  const extractGoogleErrorDetail = async (response) => {
    try {
      const payload = await response.clone().json();
      const detail = payload && payload.error && (payload.error.message || payload.error.status);
      return detail ? redactSensitiveText(detail).replace(/\s+/g, ' ').trim().slice(0, 500) : '';
    } catch {
      try {
        return redactSensitiveText(await response.clone().text()).replace(/\s+/g, ' ').trim().slice(0, 500);
      } catch {
        return '';
      }
    }
  };

  const normalizeModels = (models) => {
    const byId = new Map();

    for (const model of models) {
      if (!model || typeof model !== 'object') continue;
      const methods = Array.isArray(model.supportedGenerationMethods)
        ? model.supportedGenerationMethods.map((value) => String(value))
        : [];
      if (!methods.includes('generateContent')) continue;

      const id = String(model.name || model.baseModelId || '')
        .replace(/^models\//, '')
        .trim();
      if (!id || byId.has(id)) continue;

      byId.set(id, {
        id,
        name: String(model.displayName || id).trim() || id,
      });
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }) ||
      a.id.localeCompare(b.id, 'en', { numeric: true, sensitivity: 'base' })
    );
  };

  const fetchGeminiModels = async (apiKey) => {
    const rawModels = [];
    let pageToken = '';
    let pageCount = 0;

    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      let response;
      try {
        response = await window.fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-goog-api-key': apiKey,
          },
        });
      } catch (error) {
        diagnostic = { kind: 'network-error', serial: ++requestSerial };
        throw new Error('Không thể kết nối tới Google Gemini. Hãy kiểm tra mạng, proxy/CORS hoặc khả năng truy cập máy chủ Google.');
      }

      if (!response.ok) {
        const detail = await extractGoogleErrorDetail(response);
        diagnostic = {
          kind: 'http-error',
          status: response.status,
          detail,
          serial: ++requestSerial,
        };
        throw new Error(messageForHttpStatus(response.status, detail));
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Google Gemini trả về dữ liệu không phải JSON khi tải danh sách model.');
      }

      const pageModels = Array.isArray(payload && payload.models) ? payload.models : [];
      rawModels.push(...pageModels);
      pageToken = typeof (payload && payload.nextPageToken) === 'string' ? payload.nextPageToken : '';
      pageCount += 1;
    } while (pageToken && pageCount < 10);

    diagnostic = {
      kind: 'success',
      rawModelCount: rawModels.length,
      serial: ++requestSerial,
    };

    const models = normalizeModels(rawModels);
    if (rawModels.length > 0 && models.length === 0) {
      throw new Error(`Google Gemini đã trả về ${rawModels.length} model nhưng không có model nào hỗ trợ generateContent.`);
    }
    if (models.length === 0) {
      throw new Error('Google Gemini phản hồi thành công nhưng không trả về model nào có thể dùng để tạo nội dung.');
    }

    return models;
  };

  const setButtonBusy = (button, busy) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (busy) button.title = 'Đang tải danh sách Model từ Google Gemini';
    else button.title = 'Tải danh sách Model từ Google Gemini';
  };

  const handleModelLoadClick = async (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(LOAD_BUTTON_SELECTOR);
    if (!(button instanceof HTMLButtonElement)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (activeLoad) return;
    activeLoad = true;
    setButtonBusy(button, true);

    try {
      const resolved = resolveGeminiKey();
      if (!resolved.key) {
        throw new Error('Không tìm thấy API Key Gemini. Hãy tắt "Sử dụng API Key Mặc định (Environment)" và nhập API key cá nhân trước khi tải model.');
      }

      const models = await fetchGeminiModels(resolved.key);
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(models));
      persistVisibleKeysForReload(resolved);
      sessionStorage.setItem(RESULT_KEY, JSON.stringify({ count: models.length, timestamp: Date.now() }));
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notify(`Lỗi tải models: ${message}`, 'error');
      setButtonBusy(button, false);
      activeLoad = false;
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
      if (serial >= ((diagnostic && diagnostic.serial) || 0)) {
        diagnostic = { kind: 'network-error', serial };
      }
      throw error;
    }

    if (!response.ok) {
      if (serial >= ((diagnostic && diagnostic.serial) || 0)) {
        const detail = await extractGoogleErrorDetail(response);
        diagnostic = { kind: 'http-error', status: response.status, detail, serial };
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

  const showReloadResult = () => {
    const result = safeJson(sessionStorage.getItem(RESULT_KEY), null);
    if (!result || !Number.isFinite(Number(result.count))) return;
    sessionStorage.removeItem(RESULT_KEY);

    const count = Number(result.count);
    const started = Date.now();
    const timer = setInterval(() => {
      const root = document.getElementById('root');
      if ((root && root.childElementCount > 0) || Date.now() - started > 4000) {
        clearInterval(timer);
        notify(`Đã tải ${count} model từ Google Gemini và áp dụng danh sách mới.`, 'success');
      }
    }, 100);
  };

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
    showReloadResult();
  };

  document.addEventListener('click', handleModelLoadClick, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
