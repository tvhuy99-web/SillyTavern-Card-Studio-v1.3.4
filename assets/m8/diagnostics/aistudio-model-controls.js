// Source-owned AI Studio model catalog control with visible, persistent diagnostics.
// Runs before the minified React bundle and intercepts only AI Studio's model button.
const CACHE = 'sts_ai_studio_model_list';
const LAST_STATUS = 'sts_aistudio_model_last_status_v2';
const MODEL_BUTTON_LABEL = 'Tải danh sách Model';
let busy = false;
let currentButton = null;

function diagnostic(stage, details, level = 'state') {
  window.__STS_AI_STUDIO_LOGS__?.record?.(stage, details, level);
}
function notify(message, type) {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}
function safeMessage(error) {
  return String(error?.message || error?.code || error || 'Lỗi không xác định')
    .replace(/AIza[0-9A-Za-z_-]{15,}/g, '[REDACTED]')
    .replace(/(?:access_token|api_key|authorization|cookie)=\S+/gi, '[REDACTED]')
    .slice(0, 1200);
}
export function normalizeAiStudioModelCatalog(payload) {
  let models = payload?.models;
  if (typeof models === 'string') {
    try { models = JSON.parse(models); } catch { models = []; }
  }
  if (!Array.isArray(models)) return [];
  return [...new Map(models.filter(item =>
    item && typeof item.id === 'string' &&
    /^gemini-[a-z0-9][a-z0-9._-]{2,110}$/i.test(item.id) &&
    !/(embedding|transcribe|tts|live|imagen|image|computer-use)/i.test(item.id)
  ).map(item => [item.id, {
    id: item.id, name: String(item.name || item.id).slice(0, 120),
  }])).values()].sort((a, b) => a.id.localeCompare(b.id));
}
function modelButton(node) {
  const el = node instanceof Element ? node.closest('button') : null;
  if (!(el instanceof HTMLButtonElement)) return null;
  if (String(el.textContent || '').trim() !== MODEL_BUTTON_LABEL) return null;
  // Restrict capture to the AI Studio card, not Gemini's API-key model button.
  const card = el.closest('div[class*="bg-slate-900/50"]');
  return card && card.textContent?.includes('Mô hình Google AI Studio') ? el : null;
}
function parentCard(button) {
  return button?.closest('div[class*="bg-slate-900/50"]') || null;
}
function writeStatus(button, kind, message, detail = '') {
  const state = { kind, message, detail, time: new Date().toLocaleTimeString('vi-VN') };
  try { sessionStorage.setItem(LAST_STATUS, JSON.stringify(state)); } catch {}
  const card = parentCard(button);
  if (!card) return;
  let panel = card.querySelector('[data-sts-aistudio-model-status]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.stsAistudioModelStatus = 'true';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.style.cssText = 'padding:12px;border-radius:8px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #64748b;background:#0f172a;color:#e2e8f0';
    card.appendChild(panel);
  }
  panel.textContent = '';
  const title = document.createElement('strong');
  title.textContent = (kind === 'error' ? 'LỖI' : kind === 'success' ? 'THÀNH CÔNG' : 'TRẠNG THÁI') +
    ' • ' + state.time + ': ' + message;
  if (kind === 'error') title.style.color = '#fda4af';
  if (kind === 'success') title.style.color = '#86efac';
  panel.appendChild(title);
  if (detail) {
    const explanation = document.createElement('div');
    explanation.textContent = detail;
    explanation.style.marginTop = '6px';
    panel.appendChild(explanation);
  }
}
function restoreStatus() {
  if (busy) return;
  const button = [...document.querySelectorAll('button')].find(node => modelButton(node));
  if (!button || parentCard(button)?.querySelector('[data-sts-aistudio-model-status]')) return;
  try {
    const state = JSON.parse(sessionStorage.getItem(LAST_STATUS) || 'null');
    if (state?.message) writeStatus(button, state.kind, state.message, state.detail || '');
  } catch {}
}
async function requestModels() {
  const cap = window.Capacitor;
  if (typeof cap?.nativePromise === 'function') {
    return cap.nativePromise('AIStudioText', 'listModels', {});
  }
  if (typeof cap?.Plugins?.AIStudioText?.listModels === 'function') {
    return cap.Plugins.AIStudioText.listModels({});
  }
  throw Error('AI_STUDIO_BRIDGE_MISSING: Không tìm thấy plugin AIStudioText. Cần cài APK Android, không dùng bản web.');
}
async function load(button) {
  if (busy) return;
  busy = true;
  currentButton = button;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  diagnostic('MODEL_BUTTON_CLICK', { message: 'Pressed AI Studio model catalog download button', bridge: !!window.Capacitor?.nativePromise });
  let seconds = 0;
  writeStatus(button, 'working', 'Đang mở AI Studio và đọc danh sách model...', 'Đang chờ phản hồi WebView.');
  const timer = setInterval(() => {
    seconds++;
    if (currentButton === button && busy) {
      writeStatus(button, 'working', 'Đang tải danh sách model: ' + seconds + ' giây',
        'Đã gửi yêu cầu tới Android. Nếu thất bại, mã lỗi và số lần quét sẽ xuất hiện tại đây.');
    }
  }, 1000);
  let timeoutId;
  try {
    const response = await Promise.race([
      requestModels(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(Error(
          'AI_STUDIO_MODEL_TIMEOUT: Android chưa phản hồi sau 35 giây. Kiểm tra Nhật ký hệ thống > AI Studio > MODEL_SCAN / MODEL_PAGE_* để xem lỗi mạng, đăng nhập hoặc WebView.'
        )), 35000);
      }),
    ]);
    const models = normalizeAiStudioModelCatalog(response);
    diagnostic('MODEL_BRIDGE_RESULT', {
      message: 'Native model catalog returned',
      received: Array.isArray(response?.models) ? response.models.length : 'not-array',
      usable: models.length, scans: response?.scanCount ?? -1,
      networkHits: response?.networkHits ?? -1, domCandidates: response?.domCandidates ?? -1,
    });
    if (!models.length) {
      throw Error('AI_STUDIO_MODEL_EMPTY: WebView trả về 0 model hợp lệ. Kiểm tra MODEL_SCAN trong Nhật ký hệ thống và đăng nhập lại AI Studio.');
    }
    localStorage.setItem(CACHE, JSON.stringify(models));
    // Keep the current page alive and show a stable outcome rather than a
    // silent reload that loses any toast or detail about the native scan.
    writeStatus(button, 'success', 'Đã tải ' + models.length + ' model từ AI Studio.',
      'Quét ' + (response?.scanCount ?? '?') + ' lần; phản hồi mạng có Model ID: ' +
      (response?.networkHits ?? '?') + '. Đóng và mở lại Cài đặt AI để thấy danh sách mới.');
    diagnostic('MODEL_BUTTON_SUCCESS', { message: 'Model catalog cached', count: models.length });
    notify('Đã tải ' + models.length + ' model. Mở lại Cài đặt AI để cập nhật danh sách.', 'success');
  } catch (error) {
    const message = safeMessage(error);
    diagnostic('MODEL_BUTTON_FAILED', { message, seconds }, 'error');
    writeStatus(button, 'error', 'Không tải được danh sách model.',
      message + '\nVào Nhật ký hệ thống → AI Studio để xem MODEL_PAGE, MODEL_SCAN và MODEL_LOAD_FAILED.');
    notify('Tải Model thất bại: ' + message, 'error');
  } finally {
    clearTimeout(timeoutId);
    clearInterval(timer);
    busy = false;
    currentButton = null;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }
}
export function installAiStudioModelControls() {
  if (typeof window === 'undefined' || window.__STS_AI_STUDIO_MODEL_CONTROLS_V2__) return false;
  document.addEventListener('click', event => {
    const button = modelButton(event.target);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!busy) void load(button);
  }, true);
  window.addEventListener('sillytavern:system-log', event => {
    if (!busy || !currentButton || event.detail?.source !== 'aistudio') return;
    const m = String(event.detail.message || '');
    if (!m.includes('[MODEL_')) return;
    if (m.includes('[MODEL_SCAN]')) {
      const p = event.detail.payload || {};
      writeStatus(currentButton, 'working', 'AI Studio đang quét model...',
        'Lần quét: ' + (p.attempt ?? '?') + '; model: ' + (p.usableModels ?? '?') +
        '; DOM: ' + (p.domCandidates ?? '?') + '; phản hồi mạng: ' + (p.networkHits ?? '?'));
    } else if (m.includes('[MODEL_PAGE_NETWORK_ERROR]') || m.includes('[MODEL_PAGE_SSL_ERROR]')) {
      writeStatus(currentButton, 'working', 'AI Studio báo sự cố kết nối.',
        m.slice(0, 400));
    }
  });
  const observer = new MutationObserver(() => restoreStatus());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__STS_AI_STUDIO_MODEL_CONTROLS_V2__ = true;
  return true;
}
