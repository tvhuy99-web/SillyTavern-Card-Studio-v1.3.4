(function chatSendRecoveryCompatibilityLayer() {
  'use strict';

  if (window.__STS_CHAT_RECOVERY__) return;

  const VERSION = '1.2.0';
  const RECOVERY_COOLDOWN_MS = 1200;
  const FORCE_UNLOCK_DELAY_MS = 180;
  const WATCHDOG_BUSY_MS = 90000;
  const ERROR_TEXT_RE = /(?:\blỗi\b|error|failed|failure|thất bại|timeout|timed out|network|fetch|connection|kết nối|rate limit|too many requests|unauthorized|forbidden|bad gateway|service unavailable|gateway timeout|\b(?:401|403|408|409|429|500|502|503|504)\b)/i;
  const ABORT_TEXT_RE = /(?:\babort(?:ed|ing)?\b|user aborted|the user aborted a request|generation was stopped|operation was aborted|signal is aborted|đã dừng|người dùng đã dừng)/i;
  const STOP_TEXT_RE = /(?:^|\b)(?:stop|cancel|abort|dừng|hủy|huỷ)(?:\b|$)/i;
  const SEND_TEXT_RE = /(?:^|\b)(?:send|submit|generate|gửi|tạo)(?:\b|$)/i;
  const CHAT_URL_RE = /(?:chat(?:\/|_|-)?completions?|\/chat\b|\/messages?\b|\/generate\b|openai|anthropic|openrouter|gemini|text-generation|kobold|proxy)/i;
  const ARENA_MODE_RE = /\bARENA MODE\b/i;
  const ARENA_PENDING_TEXT_RE = /(?:^|\s)(?:Đang tạo\.\.\.|Generating\.\.\.)(?:\s|$)/i;

  let lastRecoveryAt = 0;
  let recoveryTimer = null;
  let busySince = 0;
  let observer = null;
  const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  const NativeXHR = typeof window.XMLHttpRequest === 'function' ? window.XMLHttpRequest : null;

  const now = () => Date.now();

  function textOf(value) {
    return String(value == null ? '' : value).trim();
  }

  function errorText(error) {
    if (!error) return '';
    return textOf(error && typeof error === 'object' && 'message' in error ? error.message : error);
  }

  function isAbortLike(error) {
    if (!error) return false;
    if (error && typeof error === 'object' && error.name === 'AbortError') return true;
    return ABORT_TEXT_RE.test(errorText(error));
  }

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    try { return String(input || ''); } catch (_) { return ''; }
  }

  function bodyText(body) {
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    return '';
  }

  function bodyLooksLikeChat(body) {
    const raw = bodyText(body);
    if (!raw) return false;
    if (/"messages"\s*:\s*\[|"prompt"\s*:|"chat_history"\s*:|"conversation"\s*:|"stream"\s*:\s*true/i.test(raw)) return true;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) return true;
      if (Array.isArray(parsed.chat_history) && parsed.chat_history.length > 0) return true;
      if (typeof parsed.prompt === 'string' && parsed.prompt.length > 0) return true;
      if (parsed.stream === true && (parsed.model || parsed.messages || parsed.prompt)) return true;
    } catch (_) {}
    return false;
  }

  function isConversationRequest(input, init) {
    const url = requestUrl(input);
    const method = textOf(init && init.method || input && input.method || 'GET').toUpperCase();
    const body = init && Object.prototype.hasOwnProperty.call(init, 'body') ? init.body : input && input.body;
    if (method === 'GET' || method === 'HEAD') return false;
    return bodyLooksLikeChat(body) || CHAT_URL_RE.test(url);
  }

  function attrText(node) {
    if (!node || typeof node.getAttribute !== 'function') return '';
    return [node.getAttribute('aria-label'), node.getAttribute('title'), node.getAttribute('data-action'), node.getAttribute('name'), node.textContent]
      .map(textOf).filter(Boolean).join(' ');
  }

  function visible(node) {
    if (!node || node.hidden) return false;
    if (typeof node.getAttribute === 'function' && node.getAttribute('aria-hidden') === 'true') return false;
    if (typeof window.getComputedStyle === 'function') {
      try {
        const style = window.getComputedStyle(node);
        if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      } catch (_) {}
    }
    return true;
  }

  function hasActiveArenaGeneration() {
    if (!document || typeof document.querySelectorAll !== 'function') return false;
    const pageText = textOf(document.body && document.body.textContent);
    if (!ARENA_MODE_RE.test(pageText)) return false;
    return Array.from(document.querySelectorAll('button')).some((button) => {
      if (!button || !button.disabled || !visible(button)) return false;
      return ARENA_PENDING_TEXT_RE.test(textOf(button.textContent));
    });
  }

  function shouldDeferRecovery(reason) {
    if (isAbortLike(reason)) return false;
    if (!hasActiveArenaGeneration()) return false;
    const normalized = textOf(reason).toLowerCase();
    return normalized !== 'busy-watchdog' && normalized !== 'offline';
  }

  function composerRoot(input) {
    if (!input) return null;
    if (typeof input.closest === 'function') {
      const form = input.closest('form');
      if (form) return form;
      const labelled = input.closest('[data-chat-input], [data-composer], [class*="composer"], [class*="chat-input"], [class*="message-input"]');
      if (labelled) return labelled;
    }
    let node = input.parentElement;
    for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      if (typeof node.querySelector === 'function' && node.querySelector('button')) return node;
    }
    return input.parentElement || null;
  }

  function isBusyElement(node) {
    if (!node) return false;
    const ariaBusy = typeof node.getAttribute === 'function' ? node.getAttribute('aria-busy') : null;
    const dataLoading = typeof node.getAttribute === 'function' ? node.getAttribute('data-loading') : null;
    const dataState = typeof node.getAttribute === 'function' ? node.getAttribute('data-state') : null;
    const className = textOf(node.className);
    if (ariaBusy === 'true' || dataLoading === 'true' || /loading|submitting|sending|streaming/i.test(textOf(dataState))) return true;
    if (/animate-spin|spinner|loading|sending|streaming/i.test(className)) return true;
    if (typeof node.querySelector === 'function' && node.querySelector('.animate-spin, [class*="spinner"], [class*="loading"], [aria-busy="true"], [data-loading="true"]')) return true;
    return false;
  }

  function rootIsBusy(root, input) {
    if (!root) return false;
    if (isBusyElement(root) || isBusyElement(input)) return true;
    if (input && (input.disabled || input.readOnly)) return true;
    if (typeof root.querySelectorAll === 'function') {
      const buttons = Array.from(root.querySelectorAll('button'));
      if (buttons.some((button) => isBusyElement(button))) return true;
      const sendButton = buttons.find((button) => SEND_TEXT_RE.test(attrText(button)));
      if (sendButton && (sendButton.disabled || isBusyElement(sendButton))) return true;
    }
    return false;
  }

  function findComposer() {
    if (!document || typeof document.querySelectorAll !== 'function') return null;
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]'))
      .filter(visible)
      .filter((node) => !(typeof node.closest === 'function' && node.closest('[role="dialog"]')));
    let fallback = null;
    for (const input of candidates) {
      const root = composerRoot(input);
      if (!root || typeof root.querySelectorAll !== 'function') continue;
      const buttons = Array.from(root.querySelectorAll('button'));
      if (!buttons.length) continue;
      const hasSendSemantics = buttons.some((button) => SEND_TEXT_RE.test(attrText(button)) || STOP_TEXT_RE.test(attrText(button)) || isBusyElement(button));
      if (!hasSendSemantics) continue;
      const result = { input, root, buttons };
      if (rootIsBusy(root, input)) return result;
      fallback = fallback || result;
    }
    return fallback;
  }

  function explicitStopButton(composer) {
    if (!composer) return null;
    return composer.buttons.find((button) => STOP_TEXT_RE.test(attrText(button))) || null;
  }

  function stripBlockingState(node) {
    if (!node) return;
    try { node.disabled = false; } catch (_) {}
    try { node.readOnly = false; } catch (_) {}
    if (typeof node.removeAttribute === 'function') ['disabled', 'readonly', 'inert', 'aria-busy', 'data-loading'].forEach((name) => node.removeAttribute(name));
    if (node.style) { try { node.style.pointerEvents = ''; } catch (_) {} }
    if (node.classList) {
      try { node.classList.remove('pointer-events-none'); } catch (_) {}
      try { node.classList.remove('cursor-not-allowed'); } catch (_) {}
    }
  }

  function dispatchEscape(target) {
    if (!target || typeof target.dispatchEvent !== 'function') return;
    try { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })); } catch (_) {}
  }

  function forceUnlock(composer) {
    if (!composer) return false;
    stripBlockingState(composer.input);
    stripBlockingState(composer.root);
    for (const button of composer.buttons) {
      const label = attrText(button);
      if (SEND_TEXT_RE.test(label) || STOP_TEXT_RE.test(label) || isBusyElement(button)) stripBlockingState(button);
    }
    if (typeof composer.input.focus === 'function') {
      try { composer.input.focus({ preventScroll: true }); } catch (_) { try { composer.input.focus(); } catch (_) {} }
    }
    return true;
  }

  function dispatchRecoveryDeferred(reason) {
    try { window.dispatchEvent(new CustomEvent('sts:chat-recovery-deferred', { detail: { reason: textOf(reason) || 'unknown', mode: 'arena' } })); } catch (_) {}
  }

  function recover(reason) {
    if (isAbortLike(reason)) return false;
    if (shouldDeferRecovery(reason)) {
      dispatchRecoveryDeferred(reason);
      return false;
    }
    const stamp = now();
    if (stamp - lastRecoveryAt < RECOVERY_COOLDOWN_MS) return false;
    const composer = findComposer();
    if (!composer || !rootIsBusy(composer.root, composer.input)) return false;
    lastRecoveryAt = stamp;
    busySince = 0;
    const stopButton = explicitStopButton(composer);
    if (stopButton && typeof stopButton.click === 'function') { try { stopButton.click(); } catch (_) {} }
    dispatchEscape(composer.input);
    dispatchEscape(document);
    clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(() => {
      const latest = findComposer() || composer;
      if (latest && rootIsBusy(latest.root, latest.input)) forceUnlock(latest);
    }, FORCE_UNLOCK_DELAY_MS);
    try { window.dispatchEvent(new CustomEvent('sts:chat-recovered', { detail: { reason: textOf(reason) || 'unknown' } })); } catch (_) {}
    return true;
  }

  function scheduleRecovery(reason) {
    if (isAbortLike(reason)) return;
    setTimeout(() => recover(reason), 0);
  }

  function patchFetch() {
    if (!originalFetch) return;
    window.fetch = function patchedFetch(input, init) {
      const chatLike = isConversationRequest(input, init);
      let promise;
      try {
        promise = originalFetch(input, init);
      } catch (error) {
        if (chatLike && !isAbortLike(error)) scheduleRecovery(error || 'fetch-throw');
        throw error;
      }
      if (!chatLike || !promise || typeof promise.then !== 'function') return promise;
      return promise.then((response) => {
        if (response && response.ok === false) scheduleRecovery('http-' + response.status);
        return response;
      }, (error) => {
        if (!isAbortLike(error)) scheduleRecovery(error || 'fetch-reject');
        throw error;
      });
    };
  }

  function patchXHR() {
    if (!NativeXHR || !NativeXHR.prototype) return;
    const originalOpen = NativeXHR.prototype.open;
    const originalSend = NativeXHR.prototype.send;
    if (typeof originalOpen !== 'function' || typeof originalSend !== 'function') return;
    NativeXHR.prototype.open = function patchedOpen(method, url) {
      this.__stsMethod = method;
      this.__stsUrl = url;
      return originalOpen.apply(this, arguments);
    };
    NativeXHR.prototype.send = function patchedSend(body) {
      const chatLike = isConversationRequest(this.__stsUrl || '', { method: this.__stsMethod || 'POST', body });
      if (chatLike && typeof this.addEventListener === 'function') {
        const fail = () => scheduleRecovery('xhr-failure');
        this.addEventListener('error', fail, { once: true });
        this.addEventListener('timeout', fail, { once: true });
        this.addEventListener('load', () => { if (this.status >= 400) scheduleRecovery('xhr-http-' + this.status); }, { once: true });
        // Deliberately do not recover on XHR 'abort': abort is an explicit cancellation signal.
      }
      return originalSend.apply(this, arguments);
    };
  }

  function mutationHasError(mutations) {
    for (const mutation of mutations || []) {
      for (const node of Array.from(mutation.addedNodes || [])) {
        const text = textOf(node && node.textContent);
        if (text && text.length < 1200 && ERROR_TEXT_RE.test(text) && !isAbortLike(text)) return true;
      }
    }
    return false;
  }

  function startObserver() {
    if (typeof MutationObserver !== 'function' || !document || !document.documentElement) return;
    observer = new MutationObserver((mutations) => { if (mutationHasError(mutations)) scheduleRecovery('visible-error'); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function watchdogTick() {
    const composer = findComposer();
    const busy = composer && rootIsBusy(composer.root, composer.input);
    if (!busy) { busySince = 0; return; }
    if (!busySince) { busySince = now(); return; }
    if (now() - busySince >= WATCHDOG_BUSY_MS) recover('busy-watchdog');
  }

  patchFetch();
  patchXHR();
  startObserver();
  window.addEventListener('offline', () => scheduleRecovery('offline'));
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event && event.reason;
    const message = errorText(reason);
    if (!isAbortLike(reason) && ERROR_TEXT_RE.test(message)) scheduleRecovery('unhandled-' + message.slice(0, 120));
  });
  setInterval(watchdogTick, 2500);

  window.__STS_CHAT_RECOVERY__ = Object.freeze({
    version: VERSION,
    recover,
    findComposer,
    isConversationRequest,
    forceUnlock,
    watchdogTick,
    hasActiveArenaGeneration,
    shouldDeferRecovery,
    isAbortLike
  });
})();
