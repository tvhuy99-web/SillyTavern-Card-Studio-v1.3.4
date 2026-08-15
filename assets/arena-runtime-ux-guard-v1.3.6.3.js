(function arenaRuntimeUxGuard() {
  'use strict';

  if (window.__STS_ARENA_UX_GUARD__) return;

  const VERSION = '1.1.1';
  const STOP_TEXT_RE = /(?:^|\b)(?:stop|dừng)(?:\b|$)/i;
  const STORY_CANCEL_RE = /(?:Hủy|Huỷ)\s*\(\s*Dừng\s*&\s*Chat\s*\)|Cancel\s*\([^)]*Stop[^)]*Chat[^)]*\)/i;
  const BACK_CHAT_RE = /(?:Quay lại sảnh chờ|Back to (?:the )?lobby)/i;
  const CHAT_URL_RE = /(?:chat(?:\/|_|-)?completions?|\/chat\b|\/messages?\b|\/generate\b|openai|anthropic|openrouter|gemini|text-generation|kobold|proxy)/i;
  const ERROR_CONTENT_RE = /\[Lỗi\s*:/i;
  const EMPTY_PLACEHOLDER_RE = /(?:^|\s)(?:Đang khởi tạo\.\.\.|Initializing\.\.\.)(?:\s|$)/i;
  const ARENA_MODE_RE = /\bARENA MODE\b/i;

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

  function bodyLooksLikeGeneration(body, depth = 0) {
    if (depth > 2 || typeof body !== 'string') return false;
    if (/"messages"\s*:\s*\[|"prompt"\s*:|"contents"\s*:\s*\[|"chat_history"\s*:|"stream"\s*:\s*true/i.test(body)) return true;
    try {
      const parsed = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object') return false;
      if (
        (Array.isArray(parsed.messages) && parsed.messages.length) ||
        (Array.isArray(parsed.contents) && parsed.contents.length) ||
        (Array.isArray(parsed.chat_history) && parsed.chat_history.length) ||
        (typeof parsed.prompt === 'string' && parsed.prompt) ||
        (parsed.stream === true && parsed.model)
      ) return true;
      if (typeof parsed.url === 'string' && CHAT_URL_RE.test(parsed.url) && textOf(parsed.method || 'POST').toUpperCase() !== 'GET') return true;
      if (typeof parsed.body === 'string') return bodyLooksLikeGeneration(parsed.body, depth + 1);
    } catch (_) {}
    return false;
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

  function isGenerationStopControl(button) {
    if (!button) return false;
    const label = attrText(button);
    if (button.id === 'send_but' && STOP_TEXT_RE.test(label)) return true;
    if (STORY_CANCEL_RE.test(label)) return true;
    if (BACK_CHAT_RE.test(label)) return true;
    return false;
  }

  function onClickCapture(event) {
    const target = event && event.target;
    const button = target && typeof target.closest === 'function' ? target.closest('button') : null;
    if (isGenerationStopControl(button)) abortTrackedGenerationFetches();
  }

  function arenaRootPresent() {
    return ARENA_MODE_RE.test(textOf(document.body && document.body.textContent));
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
        if (hasRetry) return { card, choose };
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
      const isError = ERROR_CONTENT_RE.test(content);
      const isEmpty = EMPTY_PLACEHOLDER_RE.test(content);
      if (isError || isEmpty) {
        info.choose.disabled = true;
        info.choose.setAttribute('aria-disabled', 'true');
        info.choose.setAttribute('title', isError ? 'Phản hồi này bị lỗi; hãy Thử lại.' : 'Model không trả về nội dung; hãy Thử lại.');
        info.choose.textContent = isError ? 'Không thể chọn — bị lỗi' : 'Không thể chọn — trống';
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
    isGenerationRequest,
    isGenerationStopControl
  });
})();
