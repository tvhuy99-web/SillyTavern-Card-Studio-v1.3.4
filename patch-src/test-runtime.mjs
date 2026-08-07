import fs from 'node:fs';
import vm from 'node:vm';

const sourceRoot = new URL('.', import.meta.url);
const overlay = fs.readFileSync(new URL('runtime-current-0.txt', sourceRoot), 'utf8').replace('${fp}', '[]');
let core = fs.readFileSync(new URL('runtime-current-1.txt', sourceRoot), 'utf8');
const boot = {
  context: {
    compatibilityMode: 'safe',
    engineMode: 'compat',
    messageId: 'test-message',
    chatId: 'test-chat',
    name1: 'User',
    name2: 'Character',
    onlineStatus: 'Connected',
  },
  catalog: { characters: [], personas: [], presets: [], extensions: {}, groups: [], proxyProfiles: [] },
  characterCard: {
    name: 'Character',
    extensions: {
      regex_scripts: [{
        id: 'test-regex',
        script_name: 'test',
        enabled: true,
        find_regex: '/hello/gi',
        replace_string: 'world',
        source: { ai_output: true },
        destination: { display: true },
      }],
    },
  },
  lorebookNames: [],
  chatHistory: [],
  extensionSettings: {},
  worldInfo: [],
  proxyProfiles: [],
  storage: { local: {}, session: {} },
};
core = core
  .replace('${t}', JSON.stringify(boot))
  .replace('${"4.8.19"}', '4.8.19')
  .replace('${"1.18.0"}', '1.18.0')
  .replace('${"4.8.19-compat.11"}', '4.8.19-compat.11')
  .replace('${yp}', () => overlay);

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)),
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

const listeners = new Map();
const style = { setProperty() {}, removeProperty() {} };
const dummyNode = {
  style,
  classList: { add() {}, remove() {}, toggle() {} },
  appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {},
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  cloneNode() { return this; }, contentDocument: null, contentWindow: null,
};
const document = {
  documentElement: { style },
  body: { ...dummyNode, scrollHeight: 0, offsetHeight: 0 },
  head: dummyNode,
  createElement(tag) {
    return {
      ...dummyNode,
      tagName: String(tag).toUpperCase(), src: '', href: '', textContent: '', innerHTML: '',
      content: { cloneNode() { return dummyNode; } }, click() {},
    };
  },
  getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
};
const parent = { postMessage() {} };
const window = {
  document, parent, top: parent, self: null,
  location: { origin: 'http://localhost', protocol: 'http:', href: 'http://localhost/' },
  navigator: { userAgent: 'Node' },
  localStorage: storage(), sessionStorage: storage(),
  addEventListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
  },
  removeEventListener() {}, dispatchEvent() { return true; }, postMessage() {}, getComputedStyle() { return {}; },
  crypto: globalThis.crypto, console,
};
window.self = window;
window.fetch = async () => new Response('{}', { status: 200 });
Object.assign(window, { Response, Request, Headers, Blob, File, FormData, URL, URLSearchParams, AbortController, DOMException });

const context = {
  window, document, parent, navigator: window.navigator, location: window.location,
  localStorage: window.localStorage, sessionStorage: window.sessionStorage,
  console, Response, Request, Headers, Blob, File, FormData, URL, URLSearchParams,
  TextEncoder, TextDecoder, AbortController, DOMException, Event, EventTarget,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  MessageEvent: class MessageEvent {}, Map, Set, WeakMap, WeakSet, Promise, Array, Object, String,
  Number, Boolean, Date, Math, JSON, RegExp, Error, TypeError, Symbol, Uint8Array, ArrayBuffer,
  structuredClone, crypto: globalThis.crypto, fetch: window.fetch,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, queueMicrotask,
  performance: { now: () => 0 }, indexedDB: undefined,
  XMLHttpRequest: class XMLHttpRequest {}, WebSocket: class WebSocket {}, EventSource: class EventSource {},
  DOMParser: class DOMParser { parseFromString() { return document; } },
  MutationObserver: class MutationObserver { observe() {} disconnect() {} },
  ResizeObserver: class ResizeObserver { observe() {} disconnect() {} },
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  btoa: value => Buffer.from(value, 'binary').toString('base64'),
};
Object.assign(context, window);
context.globalThis = context;
vm.runInNewContext(core, context, { filename: 'runtime-generated.js', timeout: 3000 });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(window.getTavernHelperVersion() === '4.8.19', 'TavernHelper version mismatch');
assert(window.formatAsTavernRegexedString('hello', 'ai_output', 'display') === 'world', 'Regex API failed');
assert(window.audioMode({ type: 'ambient', mode: 'shuffle' }) === 'shuffle', 'Audio type/settings API failed');
assert(window.getCurrentAudio('bgm').src === '', 'CurrentAudio default shape failed');
window.registerSlashCommand('echo', (_args, text) => `echo:${text}`);
assert(await window.triggerSlash('/echo hello') === 'echo:hello', 'Registered slash command dispatch failed');
window.replaceScriptTrees([{ type: 'folder', id: 'folder', name: 'Folder', scripts: [{ type: 'script', id: 'script', name: 'Script', enabled: false, content: '' }] }], { type: 'character' });
assert(window.getScriptTrees({ type: 'character' })[0].type === 'folder', 'Script tree folder preservation failed');
let guarded = false;
try { await window.replaceWorldbook('unsafe', {}); } catch (error) { guarded = /WorldbookEntry/.test(String(error)); }
assert(guarded, 'Worldbook invalid-value guard failed');
assert(window.TavernHelper?.capabilities?.extensionManagement === false, 'Capability reporting is not honest');
console.log('Compatibility runtime smoke test: PASS');
