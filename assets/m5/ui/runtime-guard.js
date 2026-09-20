import { runtimeState } from '../app/state/runtime-state.js?v=1.3.6-m5.1';

const STOP_TEXT_RE = /(?:^|\b)(?:stop|dừng)(?:\b|$)/i;
const SEND_TEXT_RE = /(?:^|\b)(?:send|gửi)(?:\b|$)/i;
const EDIT_TEXT_RE = /^(?:Chỉnh sửa|Edit)$/i;
const CLOSE_TEXT_RE = /^(?:✕|×|Đóng\b|Close\b)/i;
const ERROR_CONTENT_RE = /\[Lỗi\s*:/i;
const EMPTY_PLACEHOLDER_RE = /(?:^|\s)(?:Đang khởi tạo\.\.\.|Initializing\.\.\.)(?:\s|$)/i;
const BUSY_DIALOG_SELECTOR = '[aria-labelledby="quick-settings-title"], [aria-labelledby="arena-settings-title"]';
const BUSY_MARK = 'data-sts-runtime-busy';
const STOP_ARM_DELAY_MS = 450;
const STALE_BUSY_MS = 15000;

let installed = false;
let lastSendActivationAt = 0;
let busySince = 0;

function textOf(value) {
  return String(value == null ? '' : value).trim();
}

function attrText(node) {
  if (!node || typeof node.getAttribute !== 'function') return textOf(node?.textContent);
  return [
    node.getAttribute('aria-label'),
    node.getAttribute('title'),
    node.textContent,
  ].map(textOf).filter(Boolean).join(' ');
}

function isCloseControl(node) {
  return Boolean(node && CLOSE_TEXT_RE.test(attrText(node)));
}

function rememberAndDisable(control, reason) {
  if (!control || control.disabled || typeof control.setAttribute !== 'function') return;
  control.setAttribute(BUSY_MARK, '1');
  control.setAttribute('data-sts-runtime-prev-title', control.getAttribute('title') || '');
  control.disabled = true;
  control.setAttribute('aria-disabled', 'true');
  control.setAttribute('title', reason);
}

function restoreControls() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  for (const control of Array.from(document.querySelectorAll('[' + BUSY_MARK + '="1"]'))) {
    control.disabled = false;
    control.removeAttribute('aria-disabled');
    const title = control.getAttribute('data-sts-runtime-prev-title') || '';
    if (title) control.setAttribute('title', title); else control.removeAttribute('title');
    control.removeAttribute('data-sts-runtime-prev-title');
    control.removeAttribute(BUSY_MARK);
  }
}

function syncBusyControls() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  if (!runtimeState.isBusy()) {
    restoreControls();
    return;
  }
  for (const button of Array.from(document.querySelectorAll('#chat button'))) {
    if (EDIT_TEXT_RE.test(textOf(button.textContent))) {
      rememberAndDisable(button, 'Hệ thống đang xử lý — chờ hoàn tất trước khi chỉnh sửa lịch sử.');
    }
  }
  for (const dialog of Array.from(document.querySelectorAll(BUSY_DIALOG_SELECTOR))) {
    for (const control of Array.from(dialog.querySelectorAll('button, select, input'))) {
      if (!isCloseControl(control)) {
        rememberAndDisable(control, 'Hệ thống đang xử lý — không đổi cấu hình generation giữa lượt.');
      }
    }
  }
}

function candidateCards() {
  const chat = document?.getElementById?.('chat');
  if (!chat?.querySelectorAll) return [];
  const chooseButtons = Array.from(chat.querySelectorAll('button'))
    .filter(button => /^(?:Chọn cái này|Choose this)$/i.test(textOf(button.textContent)));
  return chooseButtons.map(choose => {
    let card = choose.parentElement;
    for (let depth = 0; card && depth < 5; depth += 1, card = card.parentElement) {
      const buttons = Array.from(card.querySelectorAll?.('button') || []);
      if (buttons.some(button => /(?:Thử lại model này|Retry this model)/i.test(attrText(button)))) {
        return { card, choose };
      }
    }
    return null;
  }).filter(Boolean);
}

function normalizeArenaControls() {
  for (const info of candidateCards()) {
    const clone = info.card.cloneNode(true);
    Array.from(clone.querySelectorAll?.('button') || []).forEach(button => button.remove());
    const content = textOf(clone.textContent);
    const error = ERROR_CONTENT_RE.test(content);
    const empty = EMPTY_PLACEHOLDER_RE.test(content);
    if (!error && !empty) continue;
    info.choose.disabled = true;
    info.choose.setAttribute('aria-disabled', 'true');
    info.choose.textContent = error ? 'Không thể chọn — bị lỗi' : 'Không thể chọn — trống';
  }
}

function composer() {
  const input = document?.getElementById?.('send_textarea');
  const button = document?.getElementById?.('send_but');
  if (!input || !button) return null;
  return { input, button, root: input.closest?.('form') || input.parentElement };
}

function domBusy(value) {
  if (!value) return false;
  const label = attrText(value.button);
  return runtimeState.isBusy() ||
    STOP_TEXT_RE.test(label) ||
    value.input.disabled ||
    value.input.readOnly ||
    value.root?.getAttribute?.('aria-busy') === 'true';
}

function clearStaleBusy(value) {
  if (!value || runtimeState.isBusy()) return false;
  try { value.input.disabled = false; } catch {}
  try { value.input.readOnly = false; } catch {}
  for (const node of [value.input, value.button, value.root]) {
    if (!node?.removeAttribute) continue;
    for (const name of ['disabled', 'readonly', 'inert', 'aria-busy', 'data-loading']) node.removeAttribute(name);
    node.classList?.remove?.('pointer-events-none');
    node.classList?.remove?.('cursor-not-allowed');
  }
  return true;
}

function reconcile() {
  syncBusyControls();
  normalizeArenaControls();
}

function watchdog() {
  if (document?.hidden) return;
  const value = composer();
  if (!value || !domBusy(value) || runtimeState.isBusy()) {
    busySince = 0;
    return;
  }
  if (!busySince) {
    busySince = Date.now();
    return;
  }
  if (Date.now() - busySince >= STALE_BUSY_MS) {
    clearStaleBusy(value);
    busySince = 0;
  }
}

function onClickCapture(event) {
  const button = event?.target?.closest?.('button');
  if (!button || button.id !== 'send_but') return;
  const now = Date.now();
  if (!STOP_TEXT_RE.test(attrText(button))) {
    if (SEND_TEXT_RE.test(attrText(button))) lastSendActivationAt = now;
    return;
  }
  if (lastSendActivationAt && now - lastSendActivationAt <= STOP_ARM_DELAY_MS) {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  }
}

export function installRuntimeUxGuard() {
  if (installed || typeof document === 'undefined') return false;
  installed = true;
  document.addEventListener('click', onClickCapture, true);
  const unsubscribe = runtimeState.subscribe(() => queueMicrotask(reconcile));
  const interval = setInterval(watchdog, 5000);
  queueMicrotask(reconcile);

  if (typeof window !== 'undefined') {
    window.__STS_RUNTIME_UX_GUARD__ = Object.freeze({
      version: 'm5.1',
      reconcile,
      watchdog,
      uninstall() {
        document.removeEventListener('click', onClickCapture, true);
        unsubscribe();
        clearInterval(interval);
        restoreControls();
        installed = false;
      },
    });
  }
  return true;
}
