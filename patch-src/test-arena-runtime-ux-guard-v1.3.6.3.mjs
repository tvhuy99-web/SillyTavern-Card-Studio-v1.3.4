import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/arena-runtime-ux-guard-v1.3.6.3.js', import.meta.url), 'utf8');

function makeHarness(fetchImpl = (input, init) => new Promise((resolve, reject) => {
  const signal = init && init.signal;
  if (signal) {
    if (signal.aborted) return reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', () => reject(signal.reason || new DOMException('Aborted', 'AbortError')), { once: true });
  }
})) {
  const listeners = new Map();
  const document = {
    documentElement: {},
    body: { textContent: '' },
    addEventListener(type, cb) { listeners.set(type, cb); },
    querySelectorAll() { return []; },
    getElementById() { return null; }
  };
  class FakeMutationObserver { constructor(cb) { this.cb = cb; } observe() {} }
  const window = { fetch: fetchImpl };
  const sandbox = {
    window,
    document,
    MutationObserver: FakeMutationObserver,
    AbortController,
    DOMException,
    Promise,
    JSON,
    Date,
    queueMicrotask(fn) { fn(); },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { window, document, listeners };
}

function button({ id = '', text = '', ariaLabel = '', title = '' } = {}) {
  return {
    id,
    textContent: text,
    getAttribute(name) {
      if (name === 'aria-label') return ariaLabel || null;
      if (name === 'title') return title || null;
      return null;
    }
  };
}

{
  const h = makeHarness(async () => ({ ok: true }));
  const api = h.window.__STS_ARENA_UX_GUARD__;
  assert.equal(api.version, '1.1.1');
  assert.equal(api.isGenerationRequest('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
  }), true);
  assert.equal(api.isGenerationRequest('/api/forward', {
    method: 'POST',
    body: JSON.stringify({
      url: 'https://example.test/v1/chat/completions',
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
    })
  }), true, 'proxy-forward nested generation body must be tracked');
  assert.equal(api.isGenerationRequest('/api/save', {
    method: 'POST',
    body: JSON.stringify({ name: 'card' })
  }), false, 'unrelated POST must not be tracked');
  assert.equal(api.isGenerationRequest('/v1/models', { method: 'GET' }), false, 'model list GET must not be tracked');

  assert.equal(api.isGenerationStopControl(button({ id: 'send_but', text: 'Dừng' })), true);
  assert.equal(api.isGenerationStopControl(button({ text: 'Hủy (Dừng & Chat)' })), true);
  assert.equal(api.isGenerationStopControl(button({ ariaLabel: 'Quay lại sảnh chờ' })), true);
  assert.equal(api.isGenerationStopControl(button({ text: 'Hủy bỏ' })), false, 'generic editor cancel must not abort chat generation');
  assert.equal(api.isGenerationStopControl(button({ text: 'Cancel' })), false, 'generic Cancel must not abort chat generation');
}

{
  const h = makeHarness();
  const api = h.window.__STS_ARENA_UX_GUARD__;
  const pending = h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'cancel me' }] })
  });
  assert.equal(api.activeGenerationFetchCount(), 1);
  api.abortTrackedGenerationFetches();
  await assert.rejects(pending, (error) => error && error.name === 'AbortError');
  await Promise.resolve();
  assert.equal(api.activeGenerationFetchCount(), 0);
}

console.log('arena runtime UX guard tests: OK');
