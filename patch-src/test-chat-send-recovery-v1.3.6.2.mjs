import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/chat-send-recovery-v1.3.6.2.js', import.meta.url), 'utf8');

function makeHarness(fetchImpl = async () => ({ ok: true, status: 200 }), { arenaPending = false } = {}) {
  const events = [];
  const stopButton = {
    disabled: true,
    hidden: false,
    textContent: '',
    className: 'animate-spin cursor-not-allowed',
    clicked: 0,
    style: { pointerEvents: 'none' },
    attrs: new Map([['title', 'Dừng tạo phản hồi'], ['aria-busy', 'true']]),
    getAttribute(name) { return this.attrs.get(name) ?? null; },
    removeAttribute(name) { this.attrs.delete(name); },
    querySelector() { return null; },
    click() { this.clicked += 1; },
    classList: { remove() {} }
  };
  const arenaButton = {
    disabled: arenaPending,
    hidden: false,
    textContent: arenaPending ? 'Đang tạo...' : 'Chọn cái này',
    className: '',
    attrs: new Map(),
    getAttribute(name) { return this.attrs.get(name) ?? null; }
  };
  const root = {
    className: 'pointer-events-none',
    style: { pointerEvents: 'none' },
    attrs: new Map([['aria-busy', 'true']]),
    getAttribute(name) { return this.attrs.get(name) ?? null; },
    removeAttribute(name) { this.attrs.delete(name); },
    querySelector(selector) {
      if (selector === 'button') return stopButton;
      if (selector.includes('animate-spin') || selector.includes('aria-busy')) return stopButton;
      return null;
    },
    querySelectorAll(selector) { return selector === 'button' ? [stopButton] : []; },
    classList: { remove() {} }
  };
  const input = {
    disabled: true,
    readOnly: true,
    hidden: false,
    textContent: '',
    className: '',
    parentElement: root,
    style: { pointerEvents: 'none' },
    attrs: new Map(),
    getAttribute(name) { return this.attrs.get(name) ?? null; },
    removeAttribute(name) { this.attrs.delete(name); },
    closest(selector) { return selector === 'form' ? root : null; },
    dispatchEvent(event) { events.push(['input', event.key]); return true; },
    focus() {},
    classList: { remove() {} }
  };
  const document = {
    documentElement: {},
    body: { textContent: arenaPending ? 'ARENA MODE' : '' },
    querySelectorAll(selector) {
      if (selector === 'button') return arenaPending ? [stopButton, arenaButton] : [stopButton];
      return selector.includes('textarea') ? [input] : [];
    },
    dispatchEvent(event) { events.push(['document', event.key]); return true; }
  };
  class FakeMutationObserver { constructor(cb) { this.cb = cb; } observe() {} }
  class FakeKeyboardEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  class FakeCustomEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const window = {
    fetch: fetchImpl,
    XMLHttpRequest: undefined,
    getComputedStyle() { return { display: 'block', visibility: 'visible' }; },
    addEventListener() {},
    dispatchEvent(event) { events.push(['window', event.type, event.detail]); return true; }
  };
  const sandbox = {
    window, document,
    MutationObserver: FakeMutationObserver,
    KeyboardEvent: FakeKeyboardEvent,
    CustomEvent: FakeCustomEvent,
    URLSearchParams,
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    Date,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { window, stopButton, events };
}

{
  const h = makeHarness();
  const api = h.window.__STS_CHAT_RECOVERY__;
  assert.equal(api.version, '1.2.0');
  assert.equal(api.isAbortLike(new DOMException('Generation was stopped.', 'AbortError')), true);
  assert.equal(api.isAbortLike('Kết nối trực tiếp thất bại. Lỗi gốc: The user aborted a request.'), true);
  assert.equal(api.isAbortLike('Failed to fetch'), false);
}

{
  const h = makeHarness(async () => { throw new DOMException('The operation was aborted.', 'AbortError'); });
  await assert.rejects(h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'stop' }], stream: true })
  }));
  assert.equal(h.stopButton.clicked, 0, 'intentional AbortError must not trigger a second global Stop');
}

{
  const h = makeHarness(async () => { throw new Error('Kết nối trực tiếp thất bại. Lỗi gốc: The user aborted a request.'); });
  await assert.rejects(h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'stop' }], stream: true })
  }));
  assert.equal(h.stopButton.clicked, 0, 'wrapped user-abort text must not be treated as a network failure');
}

{
  const h = makeHarness(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'offline' }], stream: true })
  }), /Failed to fetch/);
  assert.equal(h.stopButton.clicked, 1, 'real network failure must still recover a stuck composer');
}

{
  const h = makeHarness(async () => { throw new TypeError('Failed to fetch'); }, { arenaPending: true });
  await assert.rejects(h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'arena side fails' }], stream: true })
  }), /Failed to fetch/);
  assert.equal(h.stopButton.clicked, 0, 'one Arena side failing must not stop the other active side');
}

console.log('chat send recovery v1.3.6.2 tests: OK');
