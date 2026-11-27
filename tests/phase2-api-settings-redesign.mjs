import assert from 'node:assert/strict';
import { createConnectionSettingsScreen } from '../src/ui/settings/connection-settings-screen.js';
import { createSmartScanSettings } from '../src/ui/settings/sections/smart-scan-settings.js';
import { createActionSuggestionSettings } from '../src/ui/settings/sections/action-suggestion-settings.js';
import { createLiterarySettings } from '../src/ui/settings/sections/literary-settings.js';

const jsx = (type, props, key) => ({ type, props: props || {}, key });
const jsxRuntime = { jsx, jsxs: jsx, Fragment: 'Fragment' };

function flatten(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) flatten(item, out);
    return out;
  }
  out.push(node);
  if (node.props?.children !== undefined) flatten(node.props.children, out);
  return out;
}

function createFakeReact(overrides = {}) {
  const stateMap = [];
  let idx = 0;
  return {
    reset() { idx = 0; },
    useState(init) {
      const slot = idx++;
      if (!(slot in stateMap)) {
        stateMap[slot] = slot in overrides
          ? overrides[slot]
          : (typeof init === 'function' ? init() : init);
      }
      return [stateMap[slot], next => {
        stateMap[slot] = typeof next === 'function' ? next(stateMap[slot]) : next;
      }];
    },
    useRef(init) { return { current: init }; },
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useEffect() {},
  };
}

{

  const react = createFakeReact();
  const Screen = createConnectionSettingsScreen(jsxRuntime, react, () => ({
    useToast: () => ({ showToast: () => {} }),
    useGeminiModels: () => ({ models: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }], isLoading: false, refetch: () => {} }),
    defaultGeminiModels: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }],
    readSettings: () => ({ source: 'proxy', proxy_model: 'gpt-4o', directFetchBypass: true }),
    saveSettings: () => {},
    readGemini: () => ({ useDefault: true, keys: [] }),
    readOpenRouterKey: () => '',
    readOpenRouterModels: () => [],
    readProxyUrl: () => 'https://proxy.test/v1',
    readProxyPassword: () => 'secret',
    readLegacyMode: () => false,
    readProxyForTools: () => false,
    readProfiles: () => [{ id: 'p1', name: 'Proxy Chính', provider: 'proxy' }],
    saveProfiles: () => {},
    fetchOpenRouterModels: async () => [],
    saveOpenRouterModels: () => {},
    proxyPersistence: { getRememberSecrets: () => true },
    createAiStudioCatalog: () => ({ read: () => [], load: async () => ({ models: [] }), clear: () => {} }),
    connections: {},
    catalog: { readProxyTarget: () => [] },
    settingsRepository: { getRaw: () => null, setRaw: () => {} },
    LoadingIndicator: 'LoadingIndicator',
    ModelSelect: 'ModelSelect',
    SearchableSelect: 'SearchableSelect',
    TextInput: 'TextInput',
    ToggleSwitch: 'ToggleSwitch',
  }));

  let nodes = flatten(Screen());
  const optBtn = nodes.find(n => n.type === 'button' && n.props.children === 'Tùy chọn khác');
  assert.ok(optBtn);
  optBtn.props.onClick();
  react.reset();
  nodes = flatten(Screen());
  const tabs = nodes.filter(n => n.type === 'button' && n.props.role === 'tab').map(n => n.props.children);
  assert.deepEqual(tabs, ['API chính', 'API phụ']);

  const providerSelect = nodes.find(n => n.type?.name === 'ChoiceSelect' && n.props['aria-label'] === 'Nhà cung cấp API chính');
  assert.ok(providerSelect, 'Provider dropdown must exist');

  const profileSelect = nodes.find(n => n.type?.name === 'ChoiceSelect' && n.props['aria-label'] === 'Chọn cấu hình đã lưu');
  assert.ok(profileSelect, 'Saved profile dropdown must exist');

  const menuItems = nodes.filter(n => n.type === 'button' && n.props.role === 'menuitem').map(n => n.props.children);
  assert.ok(menuItems.includes('Lưu'));
  assert.ok(menuItems.includes('Đổi tên'));
  assert.ok(menuItems.includes('Nhập'));
  assert.ok(menuItems.includes('Xuất'));
  assert.ok(menuItems.includes('Xóa'));
  assert.ok(menuItems.some(label => String(label).includes('Tự động Kết nối Trực tiếp')));

  assert.ok(nodes.some(n => n.type === 'button' && n.props.children === 'Tải mô hình'));
  assert.ok(nodes.some(n => n.type === 'button' && n.props.children === 'Áp dụng'));
}

{
  const reactScan = createFakeReact({ 0: { enabled: true, mode: 'llm_only' } });
  const SmartScan = createSmartScanSettings(() => ({
    react: reactScan,
    jsxRuntime,
    useToast: () => ({ showToast: () => {} }),
    useGeminiCatalog: () => ({ models: [] }),
    getSmartScanSettings: () => ({ enabled: true, mode: 'llm_only' }),
    saveSmartScanSettings: () => {},
    SearchableSelect: 'SearchableSelect',
    NumberInput: 'NumberInput',
    ToggleSwitch: 'ToggleSwitch',
    EmbeddingProviderStatus: 'EmbeddingProviderStatus',
    ModelTestButton: 'ModelTestButton',
  }));
  const scanNodes = flatten(SmartScan());
  assert.ok(!scanNodes.some(n => n.type === 'SearchableSelect' && String(n.props.label || '').includes('Mô hình Quét')));

  const reactAction = createFakeReact({ 0: true });
  const ActionSettings = createActionSuggestionSettings(() => ({
    react: reactAction,
    jsxRuntime,
    useToast: () => ({ showToast: () => {} }),
    useGeminiCatalog: () => ({ models: [], isLoading: false }),
    getConnectionSettings: () => ({ source: 'gemini' }),
    getActionSuggestionSettings: () => ({ enabled: true, gemini_model: '', action_suggestion_prompt: '' }),
    SearchableSelect: 'SearchableSelect',
    TextArea: 'TextArea',
    ToggleSwitch: 'ToggleSwitch',
    actionSuggestionStorageKey: 'k',
  }));
  const actionNodes = flatten(ActionSettings());
  assert.ok(!actionNodes.some(n => n.type === 'SearchableSelect'));

  const reactLit = createFakeReact({ 0: true });
  const Literary = createLiterarySettings(() => ({
    react: reactLit,
    jsxRuntime,
    useToast: () => ({ showToast: () => {} }),
    useGeminiCatalog: () => ({ models: [], isLoading: false }),
    getConnectionSettings: () => ({ source: 'gemini' }),
    getProxyForTools: () => false,
    getWritingRefinementSettings: () => ({ enabled: true, gemini_model: '', writing_refinement_prompt: '' }),
    SearchableSelect: 'SearchableSelect',
    TextArea: 'TextArea',
    ToggleSwitch: 'ToggleSwitch',
    writingRefinementStorageKey: 'k',
  }));
  const litNodes = flatten(Literary());
  assert.ok(!litNodes.some(n => n.type === 'SearchableSelect'));
}

console.log('Phase 2 API settings (API chính/phụ) & unified secondary AI model regression PASS');
