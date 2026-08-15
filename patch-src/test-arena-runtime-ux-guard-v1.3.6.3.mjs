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
}), { busy = false } = {}) {
  const listeners = new Map();
  const sendButton = makeNode({ tag: 'button', id: 'send_but', text: busy ? 'Dừng' : 'Gửi' });
  const chat = { getAttribute(name) { return name === 'aria-busy' ? (busy ? 'true' : 'false') : null; } };
  const document = {
    documentElement: {},
    body: { textContent: '' },
    addEventListener(type, cb) { listeners.set(type, cb); },
    querySelectorAll() { return []; },
    getElementById(id) { if (id === 'send_but') return sendButton; if (id === 'chat') return chat; return null; }
  };
  class FakeMutationObserver { constructor(cb) { this.cb = cb; } observe() {} }
  class FakeCustomEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const window = { fetch: fetchImpl, dispatchEvent() { return true; } };
  const sandbox = {
    window, document,
    MutationObserver: FakeMutationObserver,
    CustomEvent: FakeCustomEvent,
    AbortController, DOMException, Promise, JSON, Date,
    queueMicrotask(fn) { fn(); },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { window, document, listeners };
}

function makeNode({ tag = 'button', id = '', text = '', ariaLabel = '', title = '', inChat = false, dialog = null } = {}) {
  const attrs = new Map();
  if (ariaLabel) attrs.set('aria-label', ariaLabel);
  if (title) attrs.set('title', title);
  const node = {
    id,
    tagName: tag.toUpperCase(),
    textContent: text,
    disabled: false,
    getAttribute(name) { return attrs.get(name) ?? null; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    removeAttribute(name) { attrs.delete(name); },
    closest(selector) {
      if (selector === 'button') return this.tagName === 'BUTTON' ? this : null;
      if (selector === 'select') return this.tagName === 'SELECT' ? this : null;
      if (selector === 'input') return this.tagName === 'INPUT' ? this : null;
      if (selector === '#chat') return inChat ? { id: 'chat' } : null;
      if (selector.includes('quick-settings-title') || selector.includes('arena-settings-title')) return dialog;
      return null;
    }
  };
  return node;
}

{
  const h = makeHarness(async () => ({ ok: true }), { busy: true });
  const api = h.window.__STS_ARENA_UX_GUARD__;
  assert.equal(api.version, '1.2.0');
  assert.equal(api.isChatBusyUi(), true);
  assert.equal(api.isGenerationRequest('/v1/chat/completions', {
    method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
  }), true);
  assert.equal(api.isGenerationRequest('/api/forward', {
    method: 'POST', body: JSON.stringify({
      url: 'https://example.test/v1/chat/completions', method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
    })
  }), true, 'proxy-forward nested generation body must be tracked');
  assert.equal(api.isGenerationRequest('/api/save', { method: 'POST', body: JSON.stringify({ name: 'card' }) }), false);
  assert.equal(api.isGenerationRequest('/v1/models', { method: 'GET' }), false);

  assert.equal(api.isGenerationStopControl(makeNode({ id: 'send_but', text: 'Dừng' })), true);
  assert.equal(api.isGenerationStopControl(makeNode({ text: 'Hủy (Dừng & Chat)' })), true);
  assert.equal(api.isGenerationStopControl(makeNode({ ariaLabel: 'Quay lại sảnh chờ' })), true);
  assert.equal(api.isGenerationStopControl(makeNode({ text: 'Hủy bỏ' })), false);
  assert.equal(api.isGenerationStopControl(makeNode({ text: 'Cancel' })), false);

  assert.equal(api.busyMutationKind(makeNode({ text: 'Chỉnh sửa', inChat: true })), 'edit');
  assert.equal(api.busyMutationKind(makeNode({ text: 'Chỉnh sửa', inChat: false })), null, 'Edit outside chat must not be blocked');

  const quickDialog = { id: 'quick' };
  assert.equal(api.busyMutationKind(makeNode({ tag: 'select', dialog: quickDialog })), 'settings');
  assert.equal(api.busyMutationKind(makeNode({ tag: 'button', text: 'Google Gemini', dialog: quickDialog })), 'settings');
  assert.equal(api.busyMutationKind(makeNode({ tag: 'button', ariaLabel: 'Đóng cấu hình nhanh', dialog: quickDialog })), null, 'dialog Close stays available');
}

{
  const h = makeHarness(async () => ({ ok: true }), { busy: false });
  assert.equal(h.window.__STS_ARENA_UX_GUARD__.isChatBusyUi(), false);
}

{
  const h = makeHarness();
  const api = h.window.__STS_ARENA_UX_GUARD__;
  const pending = h.window.fetch('/v1/chat/completions', {
    method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'cancel me' }] })
  });
  assert.equal(api.activeGenerationFetchCount(), 1);
  api.abortTrackedGenerationFetches();
  await assert.rejects(pending, (error) => error && error.name === 'AbortError');
  await Promise.resolve();
  assert.equal(api.activeGenerationFetchCount(), 0);
}

console.log('arena runtime UX guard tests: OK');
