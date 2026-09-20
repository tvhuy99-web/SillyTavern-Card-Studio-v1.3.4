export function installGeminiModelListDiagnostics(deps = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__STS_GEMINI_MODEL_LIST__) return false;

  const STORAGE_KEY = 'sillyTavernStudio_apiSettings';
  const MODEL_CACHE_KEY = 'sillyTavernStudio_geminiModels';
  const RESULT_KEY = 'stsGeminiModelLoadResult';
  const LOAD_BUTTON_SELECTOR = 'button[title="Tải danh sách Model từ Google Gemini"]';
  const fetchImpl = deps.fetch || window.fetch.bind(window);
  let activeLoad = false;

  const safeJson = (value, fallback = null) => {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };

  const notify = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
  };

  const readApiSettings = () => {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    const parsed = safeJson(raw, { useDefault: true, keys: [] });
    return {
      useDefault: parsed && typeof parsed.useDefault === 'boolean' ? parsed.useDefault : true,
      keys: Array.isArray(parsed?.keys)
        ? parsed.keys.map(key => String(key || '').trim()).filter(Boolean).slice(0, 100)
        : [],
    };
  };

  const readVisibleManualKeys = () => {
    const field = document.querySelector('textarea[aria-label="API Key Gemini"]');
    if (!(field instanceof HTMLTextAreaElement)) return [];
    return String(field.value || '')
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean)
      .slice(0, 100);
  };

  const resolveGeminiKey = () => {
    const visibleKeys = readVisibleManualKeys();
    if (visibleKeys.length) return { key: visibleKeys[0], keys: visibleKeys, source: 'visible' };

    const settings = readApiSettings();
    if (!settings.useDefault && settings.keys.length) {
      return { key: settings.keys[0], keys: settings.keys, source: 'stored' };
    }

    try {
      const environmentKey = window.process?.env?.GEMINI_API_KEY;
      if (typeof environmentKey === 'string' && environmentKey.trim()) {
        return { key: environmentKey.trim(), keys: [], source: 'environment' };
      }
    } catch {}

    return { key: '', keys: [], source: 'missing' };
  };

  const persistVisibleKeysForReload = resolved => {
    if (resolved.source !== 'visible' || !resolved.keys.length) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ useDefault: false, keys: resolved.keys }));
    localStorage.removeItem(STORAGE_KEY);
  };

  const redactSensitiveText = value => String(value || '')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/([?&](?:key|api_key|apiKey|x-goog-api-key)=)[^&#\s]*/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, '$1[REDACTED]');

  const extractGoogleErrorDetail = async response => {
    try {
      const payload = await response.clone().json();
      const detail = payload?.error?.message || payload?.error?.status || '';
      return redactSensitiveText(detail).replace(/\s+/g, ' ').trim().slice(0, 500);
    } catch {
      try {
        return redactSensitiveText(await response.clone().text()).replace(/\s+/g, ' ').trim().slice(0, 500);
      } catch {
        return '';
      }
    }
  };

  const messageForHttpStatus = (status, detail = '') => {
    const suffix = detail ? ` Chi tiết: ${detail}` : '';
    if (status === 400 || status === 401) return `API key Gemini không hợp lệ hoặc yêu cầu xác thực bị từ chối (HTTP ${status}).${suffix}`;
    if (status === 403) return `Google Gemini từ chối quyền truy cập (HTTP 403). Hãy kiểm tra giới hạn API key, quyền dự án và Gemini API.${suffix}`;
    if (status === 404) return `Không tìm thấy endpoint danh sách model Gemini (HTTP 404).${suffix}`;
    if (status === 429) return `Google Gemini đang giới hạn yêu cầu hoặc đã hết quota (HTTP 429).${suffix}`;
    if (status >= 500) return `Máy chủ Google Gemini đang gặp lỗi (HTTP ${status}).${suffix}`;
    return `Không thể tải danh sách model Gemini (HTTP ${status}).${suffix}`;
  };

  const normalizeModels = models => {
    const byId = new Map();
    for (const model of models) {
      if (!model || typeof model !== 'object') continue;
      const methods = Array.isArray(model.supportedGenerationMethods)
        ? model.supportedGenerationMethods.map(String)
        : [];
      if (!methods.includes('generateContent')) continue;

      const id = String(model.name || model.baseModelId || '').replace(/^models\//, '').trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, { id, name: String(model.displayName || id).trim() || id });
    }
    return [...byId.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }) ||
      a.id.localeCompare(b.id, 'en', { numeric: true, sensitivity: 'base' })
    );
  };

  const fetchGeminiModels = async apiKey => {
    const rawModels = [];
    let pageToken = '';
    let pageCount = 0;

    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      let response;
      try {
        response = await fetchImpl(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json', 'x-goog-api-key': apiKey },
        });
      } catch {
        throw new Error('Không thể kết nối tới Google Gemini. Hãy kiểm tra mạng, proxy/CORS hoặc khả năng truy cập máy chủ Google.');
      }

      if (!response.ok) {
        throw new Error(messageForHttpStatus(response.status, await extractGoogleErrorDetail(response)));
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Google Gemini trả về dữ liệu không phải JSON khi tải danh sách model.');
      }

      rawModels.push(...(Array.isArray(payload?.models) ? payload.models : []));
      pageToken = typeof payload?.nextPageToken === 'string' ? payload.nextPageToken : '';
      pageCount += 1;
    } while (pageToken && pageCount < 10);

    const models = normalizeModels(rawModels);
    if (rawModels.length && !models.length) {
      throw new Error(`Google Gemini đã trả về ${rawModels.length} model nhưng không có model nào hỗ trợ generateContent.`);
    }
    if (!models.length) {
      throw new Error('Google Gemini phản hồi thành công nhưng không trả về model nào có thể dùng để tạo nội dung.');
    }
    return models;
  };

  const setButtonBusy = (button, busy) => {
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    button.title = busy
      ? 'Đang tải danh sách Model từ Google Gemini'
      : 'Tải danh sách Model từ Google Gemini';
  };

  const handleModelLoadClick = async event => {
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
      notify(`Lỗi tải models: ${error instanceof Error ? error.message : String(error)}`, 'error');
      setButtonBusy(button, false);
      activeLoad = false;
    }
  };

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

  document.addEventListener('click', handleModelLoadClick, true);
  showReloadResult();

  window.__STS_GEMINI_MODEL_LIST__ = Object.freeze({ version: 'm7.1' });
  return true;
}
