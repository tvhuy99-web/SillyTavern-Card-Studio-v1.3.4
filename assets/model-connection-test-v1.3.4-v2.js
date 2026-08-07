(() => {
  'use strict';

  const MODEL_WORD = /(model|mô\s*hình)/i;
  const EXCLUDED_LABEL = /(nguồn\s*(?:&\s*)?mô\s*hình|nguồn\s*model|model\s*source|tải.*(?:model|mô\s*hình)|danh\s*sách.*(?:model|mô\s*hình))/i;
  const BUTTON_CLASS = 'sts-model-test-button';
  const CONTROL_ATTR = 'data-sts-model-test-enhanced';
  const STORAGE = {
    connection: 'sillyTavernStudio_globalConnection',
    apiSettings: 'sillyTavernStudio_apiSettings',
    openRouterKey: 'sillyTavernStudio_openRouterApiKey',
    proxyUrl: 'sillyTavernStudio_proxyUrl',
    proxyPassword: 'sillyTavernStudio_proxyPassword',
    proxyLegacy: 'sillyTavernStudio_proxyLegacyMode',
    proxyProfiles: 'sillyTavernStudio_proxyProfiles'
  };

  const style = document.createElement('style');
  style.textContent = `
    [${CONTROL_ATTR}="true"] {
      width: calc(100% - 7.25rem) !important;
      min-width: 0 !important;
      vertical-align: middle;
    }
    .${BUTTON_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .3rem;
      min-width: 6.65rem;
      min-height: 2.25rem;
      margin-left: .55rem;
      padding: .45rem .7rem;
      border: 1px solid rgb(71 85 105);
      border-radius: .45rem;
      background: rgb(51 65 85);
      color: rgb(226 232 240);
      font-size: .75rem;
      font-weight: 700;
      line-height: 1rem;
      vertical-align: middle;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease, opacity .15s ease;
    }
    .${BUTTON_CLASS}:hover:not(:disabled) { background: rgb(71 85 105); }
    .${BUTTON_CLASS}:focus-visible { outline: 2px solid rgb(56 189 248); outline-offset: 2px; }
    .${BUTTON_CLASS}:disabled { cursor: wait; opacity: .72; }
    .${BUTTON_CLASS}[data-state="success"] {
      border-color: rgb(34 197 94 / .7);
      background: rgb(20 83 45 / .65);
      color: rgb(187 247 208);
    }
    .${BUTTON_CLASS}[data-state="error"] {
      border-color: rgb(239 68 68 / .7);
      background: rgb(127 29 29 / .5);
      color: rgb(254 202 202);
    }
    .${BUTTON_CLASS}[data-state="testing"] {
      border-color: rgb(14 165 233 / .65);
      background: rgb(12 74 110 / .55);
      color: rgb(186 230 253);
    }
    @media (max-width: 430px) {
      [${CONTROL_ATTR}="true"] { width: calc(100% - 6.45rem) !important; }
      .${BUTTON_CLASS} { min-width: 5.85rem; padding-inline: .5rem; margin-left: .4rem; }
    }
  `;
  document.head.appendChild(style);

  const parseJSON = (value, fallback) => {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };

  const getConnection = () => ({
    source: 'gemini',
    gemini_model: 'gemini-3-flash-preview',
    openrouter_model: '',
    proxy_model: 'gemini-3.1-pro-preview',
    proxy_tool_model: 'gemini-3-flash-preview',
    proxy_protocol: 'openai',
    proxy_profile_id: '',
    ...parseJSON(localStorage.getItem(STORAGE.connection), {})
  });

  const getProfiles = () => {
    const profiles = parseJSON(sessionStorage.getItem(STORAGE.proxyProfiles) || localStorage.getItem(STORAGE.proxyProfiles), []);
    return Array.isArray(profiles) ? profiles : [];
  };

  const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();

  function labelFor(control) {
    const aria = normalizeText(control.getAttribute('aria-label'));
    if (aria) return aria;

    if (control.id) {
      try {
        const explicit = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
        if (explicit) return normalizeText(explicit.textContent);
      } catch {}
    }

    const parent = control.parentElement;
    if (parent) {
      const directLabel = Array.from(parent.children).find(el => el.tagName === 'LABEL');
      if (directLabel) return normalizeText(directLabel.textContent);
    }

    let node = parent;
    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      const labels = Array.from(node.querySelectorAll(':scope > label, :scope > div > label'));
      const candidate = labels.find(el => MODEL_WORD.test(normalizeText(el.textContent)));
      if (candidate) return normalizeText(candidate.textContent);
    }
    return '';
  }

  function hasNearbyModelSelect(input) {
    let node = input.parentElement;
    for (let depth = 0; node && depth < 3; depth++, node = node.parentElement) {
      const selects = node.querySelectorAll('select');
      for (const select of selects) {
        if (select !== input && isModelControl(select, true)) return true;
      }
    }
    return false;
  }

  function isModelControl(control, nestedCheck = false) {
    if (!(control instanceof HTMLSelectElement || control instanceof HTMLInputElement)) return false;
    if (control.type === 'hidden') return false;

    const label = labelFor(control);
    const aria = normalizeText(control.getAttribute('aria-label'));
    const placeholder = normalizeText(control.getAttribute('placeholder'));
    const combined = `${label} ${aria} ${placeholder}`;

    if (EXCLUDED_LABEL.test(combined)) return false;
    if (!MODEL_WORD.test(combined) && !/nhập\s*model\s*id/i.test(placeholder)) return false;

    if (control instanceof HTMLInputElement && !nestedCheck && hasNearbyModelSelect(control)) return false;
    return true;
  }

  function findFieldByLabel(root, matcher) {
    if (!root) return null;
    const controls = root.querySelectorAll('input, textarea, select');
    for (const el of controls) {
      const aria = normalizeText(el.getAttribute('aria-label'));
      const placeholder = normalizeText(el.getAttribute('placeholder'));
      let text = `${aria} ${placeholder}`;
      if (el.id) {
        try {
          const label = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (label) text += ` ${normalizeText(label.textContent)}`;
        } catch {}
      }
      if (matcher.test(text)) return el;
    }
    return null;
  }

  function nearestContext(control) {
    let node = control;
    for (let depth = 0; node && depth < 8; depth++, node = node.parentElement) {
      if (node.matches?.('[role="dialog"], [role="tabpanel"], .bg-slate-800\/50, .bg-slate-900\/50')) return node;
    }
    return control.closest('[role="dialog"], [role="tabpanel"]') || document;
  }

  function getActiveArenaProvider(control) {
    const dialog = control.closest('[role="dialog"]');
    if (!dialog) return null;
    const active = Array.from(dialog.querySelectorAll('button[aria-pressed="true"]'))
      .find(button => /^(Gemini|OR|Proxy)$/i.test(normalizeText(button.textContent)));
    if (!active) return null;
    const text = normalizeText(active.textContent).toLowerCase();
    return text === 'or' ? 'openrouter' : text === 'proxy' ? 'proxy' : 'gemini';
  }

  function inferProvider(control) {
    const label = labelFor(control);
    const lower = label.toLowerCase();
    const connection = getConnection();

    const arena = getActiveArenaProvider(control);
    if (arena && /đối thủ/i.test(label)) return arena;

    if (/openrouter/.test(lower)) return 'openrouter';
    if (/chat model id|tool model id|proxy tool model/.test(lower)) return 'proxy';
    if (/mô hình chính|google gemini|mô hình quét|model trợ lý/.test(lower)) return 'gemini';

    if (/model xử lý logic/.test(lower)) {
      const proxyForTools = localStorage.getItem('sillyTavernStudio_proxyForTools') === 'true';
      return connection.source === 'proxy' || proxyForTools ? 'proxy' : 'gemini';
    }

    if (control.getAttribute('aria-label') === 'Mô hình') return connection.source || 'gemini';

    const contextText = normalizeText(nearestContext(control).textContent).toLowerCase();
    if (/reverse proxy|proxy url|giao thức proxy/.test(contextText) && !/google gemini/.test(lower)) return 'proxy';
    return connection.source || 'gemini';
  }

  function getModelValue(control) {
    let value = normalizeText(control.value);
    const rawLabel = labelFor(control);
    if (value && value !== 'custom_option') return value;

    if (!value && /model xử lý logic/i.test(rawLabel)) {
      const connection = getConnection();
      const proxyForTools = localStorage.getItem('sillyTavernStudio_proxyForTools') === 'true';
      return connection.source === 'proxy' || proxyForTools
        ? normalizeText(connection.proxy_tool_model || connection.proxy_model)
        : normalizeText(connection.gemini_model);
    }

    const label = rawLabel.replace(/\s+tùy\s+chỉnh$/i, '');
    let node = control.parentElement;
    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      const custom = Array.from(node.querySelectorAll('input')).find(input => {
        const aria = normalizeText(input.getAttribute('aria-label'));
        return /model/i.test(aria) && (!label || aria.toLowerCase().startsWith(label.toLowerCase()));
      });
      if (custom && normalizeText(custom.value)) return normalizeText(custom.value);
    }
    return value === 'custom_option' ? '' : value;
  }

  function getGeminiKey(control) {
    const page = control.closest('[role="tabpanel"]') || document;
    const textarea = page.querySelector('textarea[aria-label="API Key Gemini"]');
    if (textarea) {
      const first = String(textarea.value || '').split(/\r?\n/).map(v => v.trim()).find(Boolean);
      if (first) return first;
    }
    const settings = parseJSON(sessionStorage.getItem(STORAGE.apiSettings) || localStorage.getItem(STORAGE.apiSettings), { useDefault: true, keys: [] });
    if (settings && settings.useDefault === false && Array.isArray(settings.keys)) {
      return settings.keys.map(v => String(v).trim()).find(Boolean) || '';
    }
    return '';
  }

  function getOpenRouterKey(control) {
    const page = control.closest('[role="tabpanel"]') || document;
    const input = page.querySelector('input[aria-label="API Key OpenRouter"]');
    return normalizeText(input?.value) || normalizeText(sessionStorage.getItem(STORAGE.openRouterKey));
  }

  function getProxyDetails(control) {
    const connection = getConnection();
    const dialog = control.closest('[role="dialog"]');
    let profileId = '';

    if (dialog) {
      const profileSelect = dialog.querySelector('select[aria-label*="Cấu hình Proxy" i], select[aria-label*="Cấu hình proxy" i]');
      profileId = normalizeText(profileSelect?.value);
    }

    if (!profileId) {
      const page = control.closest('[role="tabpanel"]') || document;
      const profileSelect = page.querySelector('select[aria-label="Cấu hình proxy"]');
      profileId = normalizeText(profileSelect?.value) || normalizeText(connection.proxy_profile_id);
    }

    const profile = profileId ? getProfiles().find(item => String(item.id) === profileId) : null;
    const page = control.closest('[role="tabpanel"]') || document;
    const proxyUrlInput = page.querySelector('input[aria-label="Proxy URL"]');
    const passwordInput = findFieldByLabel(page, /(password\s*\/\s*key|proxy password|password)/i);

    const url = normalizeText(proxyUrlInput?.value) || normalizeText(profile?.url) || normalizeText(localStorage.getItem(STORAGE.proxyUrl)) || 'http://127.0.0.1:8889';
    const password = String(passwordInput?.value || profile?.password || sessionStorage.getItem(STORAGE.proxyPassword) || '').trim();
    const legacySwitch = page.querySelector('[role="switch"][aria-label="Legacy Mode"]');
    const legacyMode = legacySwitch
      ? legacySwitch.getAttribute('aria-checked') === 'true'
      : profile ? !!profile.legacyMode : localStorage.getItem(STORAGE.proxyLegacy) !== 'false';
    const activeProtocolButton = Array.from(page.querySelectorAll('button[aria-pressed="true"]'))
      .find(button => /chuẩn openai|google native/i.test(normalizeText(button.textContent)));
    const protocolText = normalizeText(activeProtocolButton?.textContent).toLowerCase();
    const protocol = /google native/.test(protocolText)
      ? 'google_native'
      : /openai/.test(protocolText) ? 'openai' : profile?.protocol || connection.proxy_protocol || 'openai';

    return { profileId, url, password, legacyMode, protocol };
  }

  function notify(message, type = 'info') {
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
  }

  function friendlyError(error) {
    const raw = normalizeText(error?.message || error || 'Lỗi không xác định');
    const lower = raw.toLowerCase();
    if (/401|unauthor|invalid api key|api key.*invalid|key.*invalid/.test(lower)) return 'API key không hợp lệ.';
    if (/403|forbidden|permission|không.*quyền/.test(lower)) return 'Không có quyền truy cập model này.';
    if (/404|not found|không tìm thấy/.test(lower)) return 'Không tìm thấy model hoặc endpoint.';
    if (/429|quota|rate limit|resource exhausted/.test(lower)) return 'Đã hết hạn mức hoặc bị giới hạn tốc độ.';
    if (/timeout|timed out|abort/.test(lower)) return 'Kết nối quá thời gian.';
    if (/failed to fetch|network|cors|kết nối trực tiếp thất bại/.test(lower)) return 'Không thể kết nối tới máy chủ API.';
    return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
  }

  function resetButton(button) {
    button.disabled = false;
    button.dataset.state = 'idle';
    button.textContent = 'Kiểm tra';
    button.title = 'Kiểm tra model đang chọn bằng một yêu cầu tạo nội dung tối thiểu';
  }

  async function runTest(control, button) {
    const model = getModelValue(control);
    if (!model) {
      button.dataset.state = 'error';
      button.textContent = '✕ Chưa chọn';
      button.title = 'Hãy chọn hoặc nhập Model ID trước khi kiểm tra.';
      notify('Hãy chọn hoặc nhập Model ID trước khi kiểm tra.', 'warning');
      return;
    }

    let api = window.__STS_MODEL_CONNECTION_TEST__;
    if (!api?.testModel) {
      button.disabled = true;
      button.dataset.state = 'testing';
      button.textContent = 'Đang chuẩn bị…';
      button.title = 'Đang chờ bộ kiểm tra model khởi tạo';
      const startedAt = performance.now();
      while (!api?.testModel && performance.now() - startedAt < 6000) {
        await new Promise(resolve => setTimeout(resolve, 120));
        api = window.__STS_MODEL_CONNECTION_TEST__;
      }
    }
    if (!api?.testModel) {
      button.disabled = false;
      button.dataset.state = 'error';
      button.textContent = '✕ Chưa sẵn sàng';
      button.title = 'Không thể khởi tạo bộ kiểm tra model. Hãy tải lại trang bằng Ctrl+F5.';
      notify('Không thể khởi tạo bộ kiểm tra model. Hãy tải lại trang bằng Ctrl+F5.', 'error');
      return;
    }

    const provider = inferProvider(control);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    button.disabled = true;
    button.dataset.state = 'testing';
    button.textContent = 'Đang kiểm tra…';
    button.title = `${provider} · ${model}`;

    try {
      const proxy = provider === 'proxy' ? getProxyDetails(control) : undefined;
      const result = await api.testModel({
        provider,
        model,
        geminiApiKey: provider === 'gemini' ? getGeminiKey(control) : '',
        openRouterApiKey: provider === 'openrouter' ? getOpenRouterKey(control) : '',
        proxy,
        signal: controller.signal
      });
      const latency = Math.max(0, Math.round(result?.latencyMs || 0));
      button.dataset.state = 'success';
      button.textContent = '✓ Hoạt động';
      button.title = `${provider} · ${model} · ${latency} ms`;
      notify(`Model “${model}” hoạt động${latency ? ` · ${latency} ms` : ''}.`, 'success');
    } catch (error) {
      const message = friendlyError(error);
      button.dataset.state = 'error';
      button.textContent = '✕ Lỗi';
      button.title = message;
      notify(`Kiểm tra model “${model}” thất bại: ${message}`, 'error');
    } finally {
      clearTimeout(timer);
      button.disabled = false;
    }
  }

  function enhance(control) {
    if (control.getAttribute(CONTROL_ATTR) === 'true') return;
    if (!isModelControl(control)) return;

    control.setAttribute(CONTROL_ATTR, 'true');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.setAttribute('aria-live', 'polite');
    resetButton(button);
    button.addEventListener('click', () => runTest(control, button));

    const invalidate = () => resetButton(button);
    control.addEventListener('change', invalidate);
    control.addEventListener('input', invalidate);

    control.insertAdjacentElement('afterend', button);
  }

  function scan(root = document) {
    const controls = root.querySelectorAll ? root.querySelectorAll('select, input') : [];
    controls.forEach(enhance);
  }

  let scanQueued = false;
  const queueScan = () => {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan(document);
    });
  };

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches('select[aria-label*="Nguồn" i], select[aria-label*="Cấu hình proxy" i], input[aria-label*="API Key" i], input[aria-label="Proxy URL"]')) {
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(resetButton);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(document), { once: true });
  } else {
    scan(document);
  }
})();
