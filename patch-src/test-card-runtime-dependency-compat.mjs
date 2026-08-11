import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/card-runtime-dependency-compat-v1.3.6.2.js', import.meta.url), 'utf8');

class Element {
  constructor() { this.attrs = new Map(); }
  setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
  getAttribute(name) { return this.attrs.get(String(name)); }
}
class HTMLIFrameElement extends Element {
  constructor() { super(); this._srcdoc = ''; }
  get srcdoc() { return this._srcdoc; }
  set srcdoc(value) { this._srcdoc = String(value); }
}
class HTMLScriptElement extends Element {
  constructor() { super(); this._src = ''; }
  get src() { return this._src; }
  set src(value) { this._src = String(value); }
}
class HTMLLinkElement extends Element {
  constructor() { super(); this._href = ''; }
  get href() { return this._href; }
  set href(value) { this._href = String(value); }
}

const context = vm.createContext({
  console,
  Object,
  String,
  Map,
  Element,
  HTMLIFrameElement,
  HTMLScriptElement,
  HTMLLinkElement,
});
context.window = context;
vm.runInContext(source, context, { filename: 'card-runtime-dependency-compat-v1.3.6.2.js' });

const bad = 'https://unpkg.com/vue-router@5.2.0/dist/vue-router.global.js';
const safe = 'https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js';

assert.equal(context.__STS_CARD_DEPENDENCY_COMPAT__.rewriteUrl(bad), safe);
assert.equal(context.__STS_CARD_DEPENDENCY_COMPAT__.rewriteUrl('https://unpkg.com/vue@3.5.40/dist/vue.global.js'), 'https://unpkg.com/vue@3.5.40/dist/vue.global.js');

const frame = new context.HTMLIFrameElement();
frame.srcdoc = `<script src="${bad}"></script>`;
assert.ok(frame.srcdoc.includes(safe));
assert.ok(!frame.srcdoc.includes('vue-router@5.2.0/dist/vue-router.global.js'));

const frameByAttribute = new context.HTMLIFrameElement();
frameByAttribute.setAttribute('srcdoc', `<script src="${bad}"></script>`);
assert.ok(frameByAttribute.getAttribute('srcdoc').includes(safe));

const script = new context.HTMLScriptElement();
script.src = bad;
assert.equal(script.src, safe);

const scriptByAttribute = new context.HTMLScriptElement();
scriptByAttribute.setAttribute('src', bad);
assert.equal(scriptByAttribute.getAttribute('src'), safe);

const unrelated = new context.HTMLScriptElement();
unrelated.src = 'https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js';
assert.equal(unrelated.src, 'https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js');

assert.equal(context.__STS_CARD_DEPENDENCY_COMPAT__.version, '1.0.0');
console.log('card runtime dependency compatibility tests: OK');
