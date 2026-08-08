import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/chat-send-recovery-v1.3.5.js', import.meta.url), 'utf8');

function makeHarness(fetchImpl = async () => ({ ok: true, status: 200 })) {
  const events = [];
  const classSet = new Set(['pointer-events-none']);
  const buttonClassSet = new Set(['animate-spin', 'cursor-not-allowed']);

  const stopButton = {
    disabled: true,
    textContent: '',
    className: 'animate-spin cursor-not-allowed',
    clicked: 0,
    style: { pointerEvents: 'none' },
    attrs: new Map([['title', 'Dừng tạo phản hồi'], ['aria-busy', 'true']]),
    getAttribute(name) { return this.attrs.get(name) ?? null; },
    removeAttribute(name) { this.attrs.delete(name); },
    querySelector() { return null; },
    click() { this.clicked += 1; },
    classList: { remove(name) { buttonClassSet.delete(name); } }
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
    classList: { remove(name) { classSet.delete(name); } }
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
    closest(selector) {
      if (selector === 'form') return root;
      if (selector === '[role="dialog"]') return null;
      return null;
    },
    dispatchEvent(event) { events.push(['input', event.key]); return true; },
    focus() { events.push(['focus']); },
    classList: { remove() {} }
  };

  const document = {
    documentElement: {},
    querySelectorAll(selector) {
      return selector.includes('textarea') ? [input] : [];
    },
    dispatchEvent(event) { events.push(['document', event.key]); return true; }
  };

  class FakeMutationObserver {
    constructor(cb) { this.cb = cb; }
    observe() {}
  }
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
    window,
    document,
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
  return { window, input, root, stopButton, events, classSet, buttonClassSet };
}

{
  const h = makeHarness();
  const api = h.window.__STS_CHAT_RECOVERY__;
  assert.equal(api.version, '1.0.0');
  assert.equal(api.isConversationRequest('/v1/chat/completions', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) }), true);
  assert.equal(api.isConversationRequest('/assets/app.css', { method: 'GET' }), false);
  assert.equal(api.isConversationRequest('/api/save', { method: 'POST', body: JSON.stringify({ name: 'card' }) }), false);
  assert.equal(api.recover('test-error'), true);
  assert.equal(h.stopButton.clicked, 1, 'explicit stop control should be clicked');
  assert.equal(h.input.disabled, false, 'composer input should be unlocked');
  assert.equal(h.input.readOnly, false, 'composer input should not remain readonly');
  assert.equal(h.root.attrs.has('aria-busy'), false, 'busy marker should be cleared');
  assert.ok(h.events.some((e) => e[0] === 'input' && e[1] === 'Escape'), 'Escape should be dispatched to composer');
}

{
  const h = makeHarness(async () => ({ ok: false, status: 500 }));
  await h.window.fetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'boom' }], stream: true })
  });
  assert.equal(h.stopButton.clicked, 1, 'HTTP chat failure should trigger recovery');
}

{
  const h = makeHarness(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(
    h.window.fetch('/proxy', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'offline' }] }) }),
    /Failed to fetch/
  );
  assert.equal(h.stopButton.clicked, 1, 'network rejection should trigger recovery without swallowing the original error');
}

{
  const h = makeHarness(async () => ({ ok: false, status: 404 }));
  await h.window.fetch('/assets/missing.json', { method: 'GET' });
  assert.equal(h.stopButton.clicked, 0, 'unrelated requests must not unlock chat UI');
}

console.log('chat send recovery tests: OK');
