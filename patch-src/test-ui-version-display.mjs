import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/ui-version-display-fix-v1.3.6.js', import.meta.url), 'utf8');

class Element {
  constructor(text = '', children = []) {
    this._ownText = text;
    this.children = [];
    this.parentElement = null;
    this.attrs = new Map();
    for (const child of children) this.append(child);
  }
  append(child) { child.parentElement = this; this.children.push(child); }
  get nodeType() { return 1; }
  get textContent() { return this.children.length ? [this._ownText, ...this.children.map(c => c.textContent)].join('') : this._ownText; }
  set textContent(value) { this._ownText = String(value); this.children = []; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  querySelectorAll(selector) {
    if (selector !== '*') return [];
    const out = [];
    const visit = node => { for (const child of node.children) { out.push(child); visit(child); } };
    visit(this);
    return out;
  }
}

function boot({ version = 'v1.3.4', unrelated = 'v1.3.4' } = {}) {
  const brand = new Element('SillyTavern Card Studio');
  const label = new Element(version);
  const nav = new Element('', [new Element('Nhân vật'), new Element('Preset'), new Element('Sổ tay Thế giới'), new Element('Trò chuyện')]);
  const header = new Element('', [brand, label, nav]);
  const unrelatedLabel = new Element(unrelated);
  const unrelatedBox = new Element('', [new Element('Tài liệu lịch sử'), unrelatedLabel]);
  const body = new Element('', [header, unrelatedBox]);
  const html = new Element('', [body]);
  const meta = new Element();

  const document = {
    readyState: 'complete',
    body,
    documentElement: html,
    querySelector(selector) { return selector === 'meta[name="app-version"]' ? meta : null; },
    querySelectorAll(selector) { return html.querySelectorAll(selector); },
    addEventListener() {}
  };
  class FakeMutationObserver { constructor(cb) { this.cb = cb; } observe() {} }
  const sandbox = { window: {}, document, MutationObserver: FakeMutationObserver, queueMicrotask, setTimeout, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { sandbox, label, unrelatedLabel, meta, html };
}

{
  const h = boot();
  assert.equal(h.label.textContent, 'v1.3.6');
  assert.equal(h.unrelatedLabel.textContent, 'v1.3.4', 'unrelated historical version must not change');
  assert.equal(h.meta.getAttribute('content'), '1.3.6');
  assert.equal(h.html.getAttribute('data-app-version'), '1.3.6');
  assert.equal(h.sandbox.__STS_UI_VERSION_FIX__.version, '1.3.6');
}

{
  const h = boot({ version: 'v1.3.5' });
  assert.equal(h.label.textContent, 'v1.3.6');
}

{
  const h = boot({ version: 'v1.3.6' });
  assert.equal(h.label.textContent, 'v1.3.6');
  assert.equal(h.sandbox.__STS_UI_VERSION_FIX__.refresh(), 0);
}

console.log('ui version display tests: OK');
