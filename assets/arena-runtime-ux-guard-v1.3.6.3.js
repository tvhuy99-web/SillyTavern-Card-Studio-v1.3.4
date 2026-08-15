(function arenaRuntimeUxGuard() {
  'use strict';

  if (window.__STS_ARENA_UX_GUARD__) return;

  const VERSION = '1.0.1';
  const STOP_TEXT_RE = /(?:^|\b)(?:stop|cancel|abort|dừng|hủy|huỷ)(?:\b|$)/i;
  const CHAT_URL_RE = /(?:chat(?:\/|_|-)?completions?|\/chat\b|\/messages?\b|\/generate\b|openai|anthropic|openrouter|gemini|text-generation|kobold|proxy)/i;
  const ERROR_CONTENT_RE = /^\s*\[Lỗi\s*:/i;
  const EMPTY_PLACEHOLDER_RE = /^\s*(?:Đang khởi tạo\.\.\.|Initializing\.\.\.)\s*$/i;
  const ARENA_MODE_RE = /\bARENA MODE\b/i;
  const PENDING_RE = /^\s*(?:Đang tạo\.\.\.|Generating\.\.\.)\s*$/i;
  const SEND_IDLE_RE = /^(?:Gửi|Send)$/i;

  const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  const activeChatFetches = new Set();
  let observer = null;
  let recentStopAt = 0;

  function textOf(value) {
    return String(value == null ? '' : value).trim();
  }

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    try { return String(input || ''); } catch (_) { return ''; }
  }

  function requestBody(input, init) {
    if (init && Object.prototype.hasOwnProperty.call(init, 'body')) return init.body;
    return input && input.body;
  }

  function bodyLooksLikeGeneration(body) {
    if (typeof body !== 'string') return false;
    if (/"messages"\s*:\s*\[|"prompt"\s*:|"contents"\s*:\s*\[|"chat_history"\s*:|"stream"\s*:\s*true/i.test(body)) return true;
    try {
      const parsed = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object') return false;
      return Boolean(
        (Array.isArray(parsed.messages) && parsed.messages.length) ||
        (Array.isArray(parsed.contents) && parsed.contents.length) ||
        (Array.isArray(parsed.chat_history) && parsed.chat_history.length) ||
        (typeof parsed.prompt === 'string' && parsed.prompt) ||
        (parsed.stream === true && parsed.model)
      );
    } catch (_) {
      return false;
    }
  }

  function isGenerationRequest(input, init) {
    const method = textOf(init && init.method || input && input.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') return false;
    return bodyLooksLikeGeneration(requestBody(input, init)) || CHAT_URL_RE.test(requestUrl(input));
  }

  function patchFetchCancellation() {
    if (!nativeFetch) return;
    window.fetch = function guardedFetch(input, init) {
      if (!isGenerationRequest(input, init)) return nativeFetch(input, init);

      const localController = new AbortController();
      const upstreamSignal = init && init.signal || input && input.signal;
      let detach = null;
      if (upstreamSignal) {
        if (upstreamSignal.aborted) localController.abort(upstreamSignal.reason);
        else if (typeof upstreamSignal.addEventListener === 'function') {
          const relay = () => localController.abort(upstreamSignal.reason);
          upstreamSignal.addEventListener('abort', relay, { once: true });
          detach = () => upstreamSignal.removeEventListener('abort', relay);
        }
      }

      const nextInit = { ...(init || {}), signal: localController.signal };
      activeChatFetches.add(localController);
      let promise;
      try {
        promise = nativeFetch(input, nextInit);
      } catch (error) {
        activeChatFetches.delete(localController);
        if (detach) detach();
        throw error;
      }
      return Promise.resolve(promise).finally(() => {
        activeChatFetches.delete(localController);
        if (detach) detach();
      });
    };
  }

  function abortTrackedGenerationFetches() {
    recentStopAt = Date.now();
    for (const controller of Array.from(activeChatFetches)) {
      try { controller.abort(new DOMException('Generation was stopped.', 'AbortError')); }
      catch (_) { try { controller.abort(); } catch (_) {} }
    }
  }

  function attrText(node) {
    if (!node || typeof node.getAttribute !== 'function') return textOf(node && node.textContent);
    return [node.getAttribute('aria-label'), node.getAttribute('title'), node.textContent].map(textOf).filter(Boolean).join(' ');
  }

  function onClickCapture(event) {
    const target = event && event.target;
    const button = target && typeof target.closest === 'function' ? target.closest('button') : null;
    if (!button) return;
    if (STOP_TEXT_RE.test(attrText(button))) abortTrackedGenerationFetches();
  }

  function arenaRootPresent() {
    return ARENA_MODE_RE.test(textOf(document.body && document.body.textContent));
  }

  function globalComposerIsIdle() {
    const sendButton = document.getElementById && document.getElementById('send_but');
    if (!sendButton) return false;
    return SEND_IDLE_RE.test(textOf(sendButton.textContent));
  }

  function candidateCards() {
    if (!arenaRootPresent() || typeof document.querySelectorAll !== 'function') return [];
    const chooseButtons = Array.from(document.querySelectorAll('button')).filter((button) => /^(?:Chọn cái này|Choose this)$/i.test(textOf(button.textContent)));
    return chooseButtons.map((choose) => {
      let card = choose.parentElement;
      for (let i = 0; card && i < 5; i += 1, card = card.parentElement) {
        if (!card || typeof card.querySelectorAll !== 'function') continue;
        const buttons = Array.from(card.querySelectorAll('button'));
        const hasRetry = buttons.some((button) => /(?:Thử lại model này|Retry this model)/i.test(attrText(button)));
        if (hasRetry) return { card, choose, buttons };
      }
      return null;
    }).filter(Boolean);
  }

  function cardTextWithoutControls(cardInfo) {
    if (!cardInfo || !cardInfo.card) return '';
    const clone = cardInfo.card.cloneNode(true);
    if (clone && typeof clone.querySelectorAll === 'function') {
      Array.from(clone.querySelectorAll('button')).forEach((button) => button.remove());
    }
    return textOf(clone && clone.textContent);
  }

  function normalizeCompletedCandidateControls() {
    for (const info of candidateCards()) {
      const content = cardTextWithoutControls(info);
      const isError = ERROR_CONTENT_RE.test(content) || /\[Lỗi\s*:/i.test(content);
      const isEmpty = EMPTY_PLACEHOLDER_RE.test(content) || /(?:^|\s)Đang khởi tạo\.\.\.(?:\s|$)/i.test(content);
      if (isError || isEmpty) {
        info.choose.disabled = true;
        info.choose.setAttribute('aria-disabled', 'true');
        info.choose.setAttribute('title', isError ? 'Phản hồi này bị lỗi; hãy Thử lại.' : 'Model không trả về nội dung; hãy Thử lại.');
        info.choose.textContent = isError ? 'Không thể chọn — bị lỗi' : 'Không thể chọn — trống';
      }
    }
  }

  function unlockStaleArenaRetry() {
    if (!arenaRootPresent() || !globalComposerIsIdle() || typeof document.querySelectorAll !== 'function') return;
    const pendingButtons = Array.from(document.querySelectorAll('button')).filter((button) => PENDING_RE.test(textOf(button.textContent)) && button.disabled);
    if (!pendingButtons.length) return;

    for (const pending of pendingButtons) {
      let card = pending.parentElement;
      for (let i = 0; card && i < 5; i += 1, card = card.parentElement) {
        if (!card || typeof card.querySelectorAll !== 'function') continue;
        const retry = Array.from(card.querySelectorAll('button')).find((button) => /(?:Thử lại model này|Retry this model)/i.test(attrText(button)));
        if (retry) {
          retry.disabled = false;
          retry.removeAttribute('disabled');
          retry.setAttribute('title', 'Phiên tạo trước đã bị gián đoạn. Nhấn để thử lại model này.');
          pending.textContent = 'Đã gián đoạn — hãy Thử lại';
          pending.setAttribute('aria-label', 'Phiên tạo đã gián đoạn; dùng nút Thử lại');
          break;
        }
      }
    }
  }

  function dismissRecentAbortBanner() {
    if (!recentStopAt || Date.now() - recentStopAt > 2500 || typeof document.querySelectorAll !== 'function') return;
    const nodes = Array.from(document.querySelectorAll('div, span')).filter((node) => {
      const text = textOf(node.textContent);
      return text.length > 0 && text.length < 900 && /(?:The user aborted a request|Generation was stopped|operation was aborted|Lỗi gốc:\s*.*aborted)/i.test(text);
    });
    for (const node of nodes) {
      let root = node;
      for (let i = 0; root && i < 5; i += 1, root = root.parentElement) {
        if (!root || typeof root.querySelector !== 'function') continue;
        const close = root.querySelector('button[aria-label="Đóng thông báo lỗi"], button[title="Đóng thông báo"]');
        if (close && typeof close.click === 'function') {
          try { close.click(); } catch (_) {}
          return;
        }
      }
    }
  }

  function reconcileUi() {
    normalizeCompletedCandidateControls();
    unlockStaleArenaRetry();
    dismissRecentAbortBanner();
  }

  function startObserver() {
    if (typeof MutationObserver !== 'function' || !document || !document.documentElement) return;
    let queued = false;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        reconcileUi();
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-busy'] });
  }

  patchFetchCancellation();
  document.addEventListener('click', onClickCapture, true);
  startObserver();
  queueMicrotask(reconcileUi);

  window.__STS_ARENA_UX_GUARD__ = Object.freeze({
    version: VERSION,
    activeGenerationFetchCount: () => activeChatFetches.size,
    abortTrackedGenerationFetches,
    reconcileUi,
    isGenerationRequest
  });
})();
