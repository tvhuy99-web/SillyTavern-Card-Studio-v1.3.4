import { portableCompositionPaths } from './helpers/composition-paths.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createConnectionSettingsScreen } from '../src/ui/settings/connection-settings-screen.js';
import { createMemoryStorage } from '../src/providers/proxy/persistence.js';

const jsx = (type, props, key) => ({ type, props, key });
const jsxRuntime = { jsx, jsxs: jsx };
const storage = createMemoryStorage({ sts_aistudio_show_page: 'true' });
globalThis.localStorage = storage;
globalThis.window = { __STS_AI_STUDIO_LOGS__: { record() {} }, confirm: () => true };

const profiles = [
  { id: 'p1', name: 'Native', provider: 'proxy', url: 'https://native.test', password: 'native-test', legacyMode: false, proxyForTools: true, protocol: 'google_native', chatModel: 'native-chat', toolModel: 'native-tool' },
  { id: 'p2', name: 'OpenAI', provider: 'proxy', url: 'https://openai.test', password: 'openai-test', legacyMode: false, proxyForTools: false, protocol: 'openai', chatModel: 'openai-chat', toolModel: 'openai-tool' },
];
const geminiModels = [{ id: 'gemini-2.5-pro', name: 'Gemini Pro' }];
const routerModels = [
  { id: 'free', name: 'Free model', pricing: { prompt: '0', completion: '0' } },
  { id: 'paid', name: 'Paid model', pricing: { prompt: '1', completion: '1' } },
];

function harness({ source = 'gemini', useDefault = true, protocol = 'openai', selectedProfile = '', loading = false } = {}) {
  const calls = [], toasts = [], state = [], refs = [], effects = [];
  let cursor = 0, refCursor = 0, effectCursor = 0;
  let saved = {
    source,
    gemini_model: 'gemini-2.5-pro',
    openrouter_model: 'free',
    aistudio_model: 'custom-id',
    aistudio_tool_model: '',
    aistudio_thinking: 'high',
    aistudio_tool_thinking: 'low',
    proxy_protocol: protocol,
    proxy_model: 'custom-proxy',
    proxy_tool_model: 'tool-proxy',
    proxy_profile_id: selectedProfile,
  };
  let cached = new Map();
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
    },
    useMemo(fn) { return fn(); },
    useRef(initial) { const i = refCursor++; return refs[i] ??= ({ current: initial }); },
    useEffect(fn) { const i = effectCursor++; if (!(i in effects)) effects[i] = fn; },
  };
  const catalog = {
    read: () => [{ id: 'gemini-native', name: 'Native model' }],
    load: async () => ({ models: [{ id: 'gemini-new', name: 'New' }] }),
    clear: () => calls.push(['clear-ai']),
  };
  const deps = {
    useToast: () => ({ showToast: (...args) => toasts.push(args) }),
    readSettings: () => ({ ...saved }),
    saveSettings: value => { saved = { ...value }; calls.push(['save-settings', value]); },
    readGemini: () => ({ useDefault, keys: ['manual-test', 'backup-test'] }),
    readOpenRouterKey: () => 'router-test',
    readOpenRouterModels: () => routerModels,
    readProxyUrl: () => 'https://proxy.test/',
    readProxyPassword: () => 'proxy-test',
    readLegacyMode: () => false,
    readProxyForTools: () => true,
    readProxyModels: url => cached.get(url) || [],
    readProfiles: () => profiles,
    saveProfiles: items => calls.push(['save-profiles', items]),
    fetchOpenRouterModels: async () => routerModels,
    saveOpenRouterModels: items => calls.push(['save-or', items]),
    fetchProxyModels: async (...args) => { calls.push(['fetch-proxy', ...args]); return [{ id: 'fetched-' + args[3], name: 'Fetched' }]; },
    mergeProxyModels: (url, items) => { cached.set(url, items); calls.push(['merge-proxy', url, items]); },
    request: async (url, options) => { calls.push(['request', url, options]); return { ok: true }; },
    defaultGeminiModels: geminiModels,
    useGeminiModels: () => ({ models: geminiModels, isLoading: loading, refetch: async key => { calls.push(['refresh-gemini', key]); return geminiModels; } }),
    SearchableSelect: 'SearchableSelect',
    ModelSelect: 'ModelSelect',
    TextInput: 'TextInput',
    LoadingIndicator: 'LoadingIndicator',
    ToggleSwitch: 'ToggleSwitch',
    proxyUrlKey: 'proxyUrl',
    proxyLegacyKey: 'proxyLegacy',
    proxyForToolsKey: 'proxyForTools',
    catalog: {
      refreshProxyTarget: async (target, { isCurrent }) => {
        const models = await deps.fetchProxyModels(target.url, target.password, target.legacyMode, target.protocol);
        if (!isCurrent()) return null;
        deps.catalog.mergeProxyTarget(target, models);
        return models;
      },
      loadProxy: target => deps.fetchProxyModels(target.url, target.password, target.legacyMode, target.protocol),
      readProxyTarget: target => cached.get(target.url) || [],
      mergeProxyTarget: (target, items) => { cached.set(target.url, items); calls.push(['merge-proxy', target.url, items]); },
      clearProxyTarget: target => { cached.delete(target.url); calls.push(['clear-proxy', target.url]); },
    },
    connections: {
      getGeminiCatalogKeyForEnvironment: () => 'env-test',
      saveGemini: value => calls.push(['save-gemini', value]),
      saveOpenRouterKey: key => calls.push(['save-key', key]),
    },
    createAiStudioCatalog: () => catalog,
    proxyPersistence: {
      getRememberSecrets: () => false,
      setRememberSecrets: value => calls.push(['remember', value]),
      setPassword: value => calls.push(['password', value]),
    },
  };
  const screen = createConnectionSettingsScreen(jsxRuntime, react, () => deps);
  function render() { cursor = refCursor = effectCursor = 0; return screen(); }
  render();
  effects.forEach(fn => fn());
  return { render, calls, toasts, deps, getSaved: () => saved };
}

function find(tree, predicate) {
  if (Array.isArray(tree)) {
    for (const x of tree) { const y = find(x, predicate); if (y) return y; }
    return;
  }
  if (!tree || typeof tree !== 'object' || !tree.props) return;
  if (predicate(tree)) return tree;
  return find(tree.props.children, predicate);
}
const byLabel = (tree, label) => find(tree, x => x.props['aria-label'] === label || x.props.label === label);
const byText = (tree, text) => find(tree, x => x.props.children === text);
const openOptions = h => { byText(h.render(), 'Tùy chọn khác').props.onClick(); return h.render(); };

const initialized = harness({ source: 'proxy', selectedProfile: 'p1' });
assert.equal(byLabel(initialized.render(), 'Proxy URL').props.value, 'https://native.test');
assert.equal(byLabel(initialized.render(), 'Password / Key').props.value, 'native-test');
assert.equal(byLabel(initialized.render(), 'Chọn mô hình').props.value, 'native-chat');
byLabel(initialized.render(), 'Proxy URL').props.onChange({ target: { value: 'https://different.test' } });
assert.equal(byLabel(initialized.render(), 'Password / Key').props.value, '');
byLabel(initialized.render(), 'Password / Key').props.onChange({ target: { value: 'new-password' } });
byLabel(initialized.render(), 'Giao thức Proxy').props.onChange({ target: { value: 'openai' } });
assert.equal(byLabel(initialized.render(), 'Password / Key').props.value, '');

const missing = harness({ source: 'proxy', selectedProfile: 'missing' });
assert.equal(byLabel(missing.render(), 'Proxy URL').props.value, '');
assert.equal(byLabel(missing.render(), 'Password / Key').props.value, '');

let h = harness({ source: 'gemini', useDefault: false });
await byText(h.render(), 'Tải mô hình').props.onClick();
assert.deepEqual(h.calls.at(-1), ['refresh-gemini', 'manual-test']);
byLabel(h.render(), 'Gemini API Key').props.onChange({ target: { value: ' ' } });
await byText(h.render(), 'Tải mô hình').props.onClick();
assert.equal(h.toasts.at(-1)[1], 'warning');
byLabel(h.render(), 'Sử dụng API Key mặc định').props.onChange(true);
await byText(h.render(), 'Tải mô hình').props.onClick();
assert.deepEqual(h.calls.at(-1), ['refresh-gemini', 'env-test']);

byLabel(h.render(), 'Nhà cung cấp API chính').props.onChange({ target: { value: 'openrouter' } });
assert.ok(byLabel(h.render(), 'OpenRouter API Key'));
byLabel(h.render(), 'Chỉ hiển thị mô hình miễn phí').props.onChange(true);
assert.deepEqual(find(h.render(), x => x.type === 'SearchableSelect').props.options.map(x => x.value), ['free']);
await byText(openOptions(h), 'Kiểm tra API Key').props.onClick();
assert.equal(h.calls.at(-1)[0], 'request');
assert.ok(byText(h.render(), 'Key hợp lệ.'));

byLabel(h.render(), 'Nhà cung cấp API chính').props.onChange({ target: { value: 'aistudio' } });
byLabel(h.render(), 'Chọn mô hình').props.onChange('custom-native');
assert.equal(h.getSaved().aistudio_model, 'custom-native');
await byText(h.render(), 'Tải mô hình').props.onClick();
assert.ok(byLabel(h.render(), 'Chọn mô hình').props.options.some(x => x.id === 'gemini-new'));

for (const protocol of ['openai', 'google_native']) {
  h = harness({ source: 'proxy', protocol });
  await byText(h.render(), 'Tải mô hình').props.onClick();
  assert.deepEqual(h.calls[0], ['fetch-proxy', 'https://proxy.test/', 'proxy-test', false, protocol]);
  assert.ok(byLabel(h.render(), 'Chọn mô hình').props.options.some(x => x.id === 'fetched-' + protocol));
}

h = harness({ source: 'proxy' });
await byLabel(h.render(), 'Chọn cấu hình đã lưu').props.onChange({ target: { value: 'p1' } });
assert.deepEqual(h.calls.find(x => x[0] === 'fetch-proxy'), ['fetch-proxy', 'https://native.test', 'native-test', false, 'google_native']);
assert.equal(byLabel(h.render(), 'Chọn mô hình').props.value, 'native-chat');

const race = harness({ source: 'proxy' });
const pending = [];
race.deps.fetchProxyModels = (...args) => new Promise(resolve => pending.push({ args, resolve }));
const first = byLabel(race.render(), 'Chọn cấu hình đã lưu').props.onChange({ target: { value: 'p1' } });
const second = byLabel(race.render(), 'Chọn cấu hình đã lưu').props.onChange({ target: { value: 'p2' } });
pending[1].resolve([{ id: 'new-profile', name: 'New' }]); await second;
pending[0].resolve([{ id: 'stale-profile', name: 'Stale' }]); await first;
assert.ok(byLabel(race.render(), 'Chọn mô hình').props.options.some(x => x.id === 'new-profile'));
assert.ok(!byLabel(race.render(), 'Chọn mô hình').props.options.some(x => x.id === 'stale-profile'));
assert.ok(!race.calls.some(x => x[0] === 'merge-proxy' && x[1] === 'https://native.test'));
const late = byText(race.render(), 'Tải mô hình').props.onClick();
byLabel(race.render(), 'Proxy URL').props.onChange({ target: { value: 'https://edited.test' } });
pending[2].resolve([{ id: 'stale-edit', name: 'Stale' }]); await late;
assert.ok(!byLabel(race.render(), 'Chọn mô hình').props.options.some(x => x.id === 'stale-edit'));

const oldTimer = globalThis.setTimeout;
globalThis.setTimeout = () => 0;
try {
  byText(h.render(), 'Áp dụng').props.onClick();
  assert.equal(h.getSaved().proxy_profile_id, 'p1');
  assert.equal(storage.getItem('proxyUrl'), null);
  assert.ok(byText(h.render(), 'Đã lưu!'));
  assert.ok(h.calls.some(x => x[0] === 'save-gemini'));
  assert.ok(h.calls.some(x => x[0] === 'save-profiles'));
  h.deps.saveSettings = () => { throw Error('storage unavailable'); };
  byText(h.render(), 'Áp dụng').props.onClick();
  assert.ok(byText(h.render(), 'Lỗi khi lưu!'));
} finally {
  globalThis.setTimeout = oldTimer;
}

const bundle = (await Promise.all(portableCompositionPaths.map(p => readFile(new URL(p, import.meta.url), 'utf8')))).join('\n');
assert.ok(bundle.includes('ConnectionSettingsScreen=__stsCreateConnectionSettingsScreen(jsxRuntime,React,()=>'));
assert.ok(!bundle.includes(',ConnectionSettingsScreen=()=>'));
let accessed = false;
createConnectionSettingsScreen(jsxRuntime, {}, () => { accessed = true; throw Error('too early'); });
assert.equal(accessed, false, 'legacy bindings must be resolved lazily');

for (const scenario of [{ source: 'gemini', useDefault: false }, { source: 'gemini' }, { source: 'openrouter' }, { source: 'proxy', protocol: 'google_native' }, { source: 'aistudio' }]) {
  const owned = harness(scenario);
  owned.deps.testModel = async () => ({ latencyMs: 5 });
  const rendered = owned.render();
  assert.equal(rendered.props['data-sts-model-test-owned'], undefined);
  const target = find(rendered, x => x.props.testButton)?.props.testButton.props.target;
  assert.equal(target.provider, scenario.source);
  if (scenario.source === 'gemini') assert.equal(target.geminiApiKey, scenario.useDefault === false ? 'manual-test' : 'env-test');
  if (scenario.source === 'openrouter') assert.equal(target.openRouterApiKey, 'router-test');
  if (scenario.source === 'proxy') assert.deepEqual(target.proxy, { url: 'https://proxy.test/', password: 'proxy-test', legacyMode: false, protocol: 'google_native' });
  if (scenario.source === 'aistudio') assert.ok(target.unavailable);
}

const ping = harness({ source: 'proxy', protocol: 'google_native' });
let pingTarget;
ping.deps.catalog.probeProxy = async target => { pingTarget = target; };
await byText(openOptions(ping), 'Kiểm tra kết nối (Ping)').props.onClick();
assert.equal(pingTarget.protocol, 'google_native');
assert.equal(pingTarget.password, 'proxy-test');
let latePing;
ping.deps.catalog.probeProxy = target => { pingTarget = target; return new Promise(resolve => latePing = resolve); };
const checking = byText(openOptions(ping), 'Kiểm tra kết nối (Ping)').props.onClick();
await Promise.resolve();
byLabel(ping.render(), 'Proxy URL').props.onChange({ target: { value: 'https://changed.test' } });
assert.ok(pingTarget.signal.aborted);
latePing();
await checking;

const ai = harness({ source: 'aistudio' });
const mainThinking = byLabel(ai.render(), 'Mức suy nghĩ API chính');
assert.equal(mainThinking.props.value, 'high');
assert.deepEqual(mainThinking.props.options.map(option => option.value), ['default', 'minimal', 'low', 'medium', 'high']);
mainThinking.props.onChange({ target: { value: 'medium' } });
assert.equal(ai.getSaved().aistudio_thinking, 'medium');
assert.equal(ai.getSaved().aistudio_tool_thinking, 'low');
byText(ai.render(), 'API phụ').props.onClick();
const auxThinking = byLabel(ai.render(), 'Mức suy nghĩ API phụ');
assert.equal(auxThinking.props.value, 'low');
auxThinking.props.onChange({ target: { value: 'minimal' } });
assert.equal(ai.getSaved().aistudio_tool_thinking, 'minimal');
assert.equal(ai.getSaved().aistudio_thinking, 'medium');
byText(ai.render(), 'API chính').props.onClick();
const loginLabel = 'Mở Google / AI Studio để đăng nhập';
const visibilityLabel = 'Hiển thị trang web AI Studio';
assert.ok(byText(ai.render(), loginLabel), 'Login button is visible without opening the options menu');
assert.equal(byLabel(ai.render(), visibilityLabel).props.checked, true);
assert.equal(byText(harness({ source: 'gemini' }).render(), loginLabel), undefined);
const oldCapacitor = globalThis.Capacitor;
const oldWindowCapacitor = window.Capacitor;
const nativeCalls = [];
const mockCapacitor = {
  getPlatform: () => 'android',
  isNativePlatform: () => true,
  nativePromise: async (...args) => { nativeCalls.push(args); return {}; },
};
try {
  globalThis.Capacitor = window.Capacitor = mockCapacitor;
  await byText(ai.render(), loginLabel).props.onClick();
  await byLabel(ai.render(), visibilityLabel).props.onChange({ target: { checked: false } });
  assert.equal(byLabel(ai.render(), visibilityLabel).props.checked, false);
  assert.equal(storage.getItem('sts_aistudio_show_page'), 'false');
  await byLabel(ai.render(), visibilityLabel).props.onChange({ target: { checked: true } });
  assert.equal(byLabel(ai.render(), visibilityLabel).props.checked, true);
  assert.deepEqual(nativeCalls, [
    ['AIStudioText', 'openSession', {}],
    ['AIStudioText', 'setVisibility', { visible: false }],
    ['AIStudioText', 'setVisibility', { visible: true }],
  ]);
} finally {
  globalThis.Capacitor = oldCapacitor;
  window.Capacitor = oldWindowCapacitor;
}
await byText(ai.render(), 'Tải mô hình').props.onClick();
assert.ok(find(ai.render(), x => x.props['data-sts-aistudio-model-status']));
byText(openOptions(ai), 'Xóa danh sách model AI Studio').props.onClick();
assert.ok(ai.calls.some(x => x[0] === 'clear-ai'));

console.log('P09 connection settings (2-tab API chính / API phụ): profile initialization, all providers, draft inputs, Proxy protocol, race protection, Apply, lazy binding, Ping, AI Studio clear: OK');
