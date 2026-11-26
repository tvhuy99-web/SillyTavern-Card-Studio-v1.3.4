import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSavedProbeTarget, createModelTestButton } from '../src/ui/settings/model-test-button.js';
import { createSmartScanSettings, createActionSuggestionSettings, createLiterarySettings } from '../src/ui/settings/settings-screens.js';
import { createArenaSettingsDialog, createQuickConnectionDialog } from '../src/features/chat/ui/session-screens.js';
import { createMythicConfigurationDialog, createActionSuggestionDialog } from '../src/features/rpg/ui/rpg-screens.js';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => fs.existsSync(new URL('../' + path, import.meta.url));

// 1. DOM enhancer and global bridges are completely removed.
assert.equal(exists('src/ui/model-connection-test.js'), false, 'src/ui/model-connection-test.js must be deleted');
assert.equal(exists('assets/m6/ui/model-connection-test.js'), false, 'assets/m6/ui/model-connection-test.js must be deleted');

for (const file of [
  'src/app/entry.js',
  'assets/app-entry-v1.3.6.js',
  'src/app/host.js',
  'assets/app-production-v1.3.6.js',
  'build/asset-manifest.mjs',
  'src/ui/settings/connection-settings-screen.js',
]) {
  const text = read(file);
  assert.ok(!text.includes('model-connection-test.js'), `${file} must not reference model-connection-test.js`);
  assert.ok(!text.includes('installModelConnectionTestEnhancer'), `${file} must not reference installModelConnectionTestEnhancer`);
  assert.ok(!text.includes('__STS_MODEL_CONNECTION_TEST__'), `${file} must not reference __STS_MODEL_CONNECTION_TEST__`);
  assert.ok(!text.includes('__STS_MODEL_TEST_UI__'), `${file} must not reference __STS_MODEL_TEST_UI__`);
  assert.ok(!text.includes('data-sts-model-test-owned'), `${file} must not reference data-sts-model-test-owned`);
}

// 2. buildSavedProbeTarget covers Gemini, OpenRouter, Proxy (with profileId), and AI Studio (disabled).
const mockConnections = {
  getSettings: () => ({ source: 'gemini', gemini_model: 'gemini-2.5-flash', openrouter_model: 'or/model', proxy_protocol: 'google_native', proxy_profile_id: 'p1', proxy_model: 'proxy-chat', proxy_tool_model: 'proxy-tool' }),
  getGemini: () => ({ useDefault: false, keys: ['  gemini-saved-key  ', 'backup'] }),
  getGeminiCatalogKeyForEnvironment: () => 'gemini-env-key',
  getOpenRouterKey: () => 'or-saved-key',
};
const mockProxyPersistence = {
  getProfiles: () => [
    { id: 'p1', name: 'Profile 1', url: 'https://p1.example.test', password: 'p1-secret', legacyMode: false, protocol: 'google_native', chatModel: 'p1-chat', toolModel: 'p1-tool' },
  ],
  getPassword: () => 'global-proxy-secret',
};

const geminiSaved = buildSavedProbeTarget({ provider: 'gemini', model: ' gemini-2.5-pro ', connections: mockConnections, proxyPersistence: mockProxyPersistence });
assert.deepEqual(geminiSaved, { provider: 'gemini', model: 'gemini-2.5-pro', geminiApiKey: 'gemini-saved-key' });

const geminiEnv = buildSavedProbeTarget({
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  connections: { ...mockConnections, getGemini: () => ({ useDefault: true, keys: [] }) },
  proxyPersistence: mockProxyPersistence,
});
assert.deepEqual(geminiEnv, { provider: 'gemini', model: 'gemini-2.5-flash', geminiApiKey: 'gemini-env-key' });

const openRouterSaved = buildSavedProbeTarget({ provider: 'openrouter', model: 'openai/gpt-4o-mini', connections: mockConnections, proxyPersistence: mockProxyPersistence });
assert.deepEqual(openRouterSaved, { provider: 'openrouter', model: 'openai/gpt-4o-mini', openRouterApiKey: 'or-saved-key' });

const proxyProfile = buildSavedProbeTarget({ provider: 'proxy', model: 'p1-chat', profileId: 'p1', connections: mockConnections, proxyPersistence: mockProxyPersistence });
assert.deepEqual(proxyProfile, {
  provider: 'proxy',
  model: 'p1-chat',
  proxy: { profileId: 'p1', url: 'https://p1.example.test', password: 'p1-secret', legacyMode: false, protocol: 'google_native' },
});

const proxyMissingProfile = buildSavedProbeTarget({ provider: 'proxy', model: 'p1-chat', profileId: 'missing', connections: mockConnections, proxyPersistence: mockProxyPersistence });
assert.equal(proxyMissingProfile.provider, 'proxy');
assert.ok(proxyMissingProfile.unavailable, 'missing proxy profile must mark target unavailable');

const proxyGlobal = buildSavedProbeTarget({
  provider: 'proxy',
  model: 'global-chat',
  profileId: '',
  connections: mockConnections,
  proxyPersistence: mockProxyPersistence,
  proxy: { url: 'https://global.example.test', password: 'global-proxy-secret', legacyMode: true, protocol: 'openai' },
});
assert.deepEqual(proxyGlobal, {
  provider: 'proxy',
  model: 'global-chat',
  proxy: { url: 'https://global.example.test', password: 'global-proxy-secret', legacyMode: true, protocol: 'openai' },
});

const aiStudioTarget = buildSavedProbeTarget({ provider: 'aistudio', model: 'gemini-2.5-flash', connections: mockConnections, proxyPersistence: mockProxyPersistence });
assert.equal(aiStudioTarget.provider, 'aistudio');
assert.ok(aiStudioTarget.unavailable, 'AI Studio target must be unavailable');

// Verify ModelTestButton disables AI Studio targets.
const jsx = (type, props, key) => ({ type, props, key });
const wt = { jsx, jsxs: jsx, Fragment: 'Fragment' };
function createReactStub() {
  const states = [], refs = [], effects = [];
  let si = 0, ri = 0, ei = 0;
  return {
    reset() { si = 0; ri = 0; ei = 0; },
    runEffects() { effects.forEach(fn => fn()); },
    react: {
      useState(init) { const i = si++; if (!(i in states)) states[i] = typeof init === 'function' ? init() : init; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; },
      useRef(init) { const i = ri++; return refs[i] ??= { current: init }; },
      useEffect(fn) { const i = ei++; if (!(i in effects)) effects[i] = fn; },
      useMemo(fn) { return fn(); },
      useCallback(fn) { return fn; },
    },
  };
}
const btnStub = createReactStub();
const RealModelTestButton = createModelTestButton(wt, btnStub.react);
const aiButtonElement = RealModelTestButton({ target: aiStudioTarget, testModel: async () => ({ latencyMs: 1 }), notify: () => {} });
assert.equal(aiButtonElement.props.disabled, true);
assert.equal(aiButtonElement.props.className, 'sts-model-test-button');

// 3. All 7 screens/dialogs render official ModelTestButton, and SmartScanSettings excludes Mô hình Embedding.
function findAll(tree, predicate, acc = []) {
  if (Array.isArray(tree)) { for (const child of tree) findAll(child, predicate, acc); return acc; }
  if (!tree || typeof tree !== 'object') return acc;
  if (predicate(tree)) acc.push(tree);
  if (tree.props) {
    if (tree.props.children) findAll(tree.props.children, predicate, acc);
    if (tree.props.testButton) findAll(tree.props.testButton, predicate, acc);
  }
  return acc;
}

const ModelTestButtonMarker = function ModelTestButton() {};
const testModel = async () => ({ latencyMs: 12 });
const showToast = () => {};
const models = [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }];

// 3.1 SmartScanSettings (ultimate mode renders both Embedding and LLM sections)
{
  const stub = createReactStub();
  const SmartScanSettings = createSmartScanSettings(() => ({
    SearchableSelect: 'SearchableSelect',
    smartScanDefaults: { enabled: true, mode: 'ultimate', embedding_provider: 'gemini', model: 'gemini-2.5-flash', scan_strategy: 'efficient', depth: 3, max_entries: 5, aiStickyDuration: 2 },
    ModelTestButton: ModelTestButtonMarker,
    defaultGeminiModels: models,
    connections: mockConnections,
    EmbeddingProviderStatus: 'EmbeddingStatus',
    embeddingService: { listProviders: () => [{ id: 'gemini', label: 'Gemini Embedding' }] },
    proxyPersistence: mockProxyPersistence,
    getSmartScanSettings: () => ({ enabled: true, mode: 'ultimate', embedding_provider: 'gemini', model: 'gemini-2.5-flash', scan_strategy: 'efficient', depth: 3, max_entries: 5, aiStickyDuration: 2 }),
    react: stub.react,
    buildSavedProbeTarget,
    useToast: () => ({ showToast }),
    TextArea: 'TextArea',
    saveSmartScanSettings: () => {},
    useGeminiCatalog: () => ({ models }),
    NumberInput: 'NumberInput',
    testModel,
    jsxRuntime: wt,
    ToggleSwitch: 'ToggleSwitch',
  }));
  const tree = SmartScanSettings();
  const selects = findAll(tree, n => n.type === 'SearchableSelect');
  const embeddingSelect = selects.find(n => n.props.label === 'Mô hình Embedding');
  const scanSelect = selects.find(n => n.props.label === 'Mô hình Quét (Khuyên dùng Flash)');
  assert.ok(embeddingSelect, 'SmartScanSettings must render Mô hình Embedding');
  assert.equal(embeddingSelect.props.testButton, undefined, 'SmartScanSettings must NOT attach ModelTestButton to Mô hình Embedding');
  assert.ok(scanSelect?.props?.testButton, 'SmartScanSettings must attach ModelTestButton to Mô hình Quét');
  assert.equal(scanSelect.props.testButton.type, ModelTestButtonMarker);
  assert.equal(scanSelect.props.testButton.props.target.provider, 'gemini');
  assert.equal(scanSelect.props.testButton.props.target.model, 'gemini-2.5-flash');
  assert.equal(scanSelect.props.testButton.props.testModel, testModel);
}

// 3.2 ActionSuggestionSettings
{
  const stub = createReactStub();
  const ActionSuggestionSettings = createActionSuggestionSettings(() => ({
    SearchableSelect: 'SearchableSelect',
    actionSuggestionStorageKey: 'action_key',
    ModelTestButton: ModelTestButtonMarker,
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    react: stub.react,
    buildSavedProbeTarget,
    useToast: () => ({ showToast }),
    TextArea: 'TextArea',
    useGeminiCatalog: () => ({ models, isLoading: false }),
    getConnectionSettings: () => ({ source: 'gemini' }),
    getActionSuggestionSettings: () => ({ enabled: true, gemini_model: 'gemini-2.5-flash', action_suggestion_prompt: 'prompt' }),
    testModel,
    jsxRuntime: wt,
    ToggleSwitch: 'ToggleSwitch',
  }));
  ActionSuggestionSettings();
  stub.runEffects();
  stub.reset();
  const tree = ActionSuggestionSettings();
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'ActionSuggestionSettings must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'gemini');
  assert.equal(buttons[0].props.target.model, 'gemini-2.5-flash');
}

// 3.3 LiterarySettings
{
  const stub = createReactStub();
  const LiterarySettings = createLiterarySettings(() => ({
    SearchableSelect: 'SearchableSelect',
    getProxyForTools: () => false,
    ModelTestButton: ModelTestButtonMarker,
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    react: stub.react,
    buildSavedProbeTarget,
    useToast: () => ({ showToast }),
    TextArea: 'TextArea',
    useGeminiCatalog: () => ({ models, isLoading: false }),
    getWritingRefinementSettings: () => ({ enabled: true, gemini_model: 'gemini-2.5-pro', writing_refinement_prompt: 'prompt' }),
    getConnectionSettings: () => ({ source: 'gemini' }),
    testModel,
    jsxRuntime: wt,
    ToggleSwitch: 'ToggleSwitch',
    writingRefinementStorageKey: 'literary_key',
  }));
  LiterarySettings();
  stub.runEffects();
  stub.reset();
  const tree = LiterarySettings();
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'LiterarySettings must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'gemini');
  assert.equal(buttons[0].props.target.model, 'gemini-2.5-pro');
}

// 3.4 ArenaSettingsDialog
{
  const stub = createReactStub();
  const ArenaSettingsDialog = createArenaSettingsDialog(() => ({
    defaultProxyModels: [],
    ModelTestButton: ModelTestButtonMarker,
    fetchOpenRouterModels: async () => [],
    defaultGeminiModels: models,
    useDialogFocus: () => {},
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    getProxyLegacyMode: () => false,
    react: stub.react,
    getOpenRouterApiKey: () => 'or-saved-key',
    buildSavedProbeTarget,
    getProxyProfiles: () => mockProxyPersistence.getProfiles(),
    catalog: {},
    useToast: () => ({ showToast }),
    useGeminiCatalog: () => ({ models }),
    LoadingIndicator: 'Loading',
    getConnectionSettings: () => mockConnections.getSettings(),
    sessionStore: () => ({ arenaProvider: 'proxy', setArenaProvider: () => {}, arenaModelId: 'p1-chat', setArenaModelId: () => {}, arenaUserProfileId: 'p1', setArenaUserProfileId: () => {} }),
    getOpenRouterCachedModels: () => [],
    testModel,
    getProxyUrl: () => 'https://global.example.test',
    jsxRuntime: wt,
    getProxyPassword: () => 'global-secret',
  }));
  const tree = ArenaSettingsDialog({ isOpen: true, onClose: () => {} });
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'ArenaSettingsDialog must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'proxy');
  assert.equal(buttons[0].props.target.model, 'p1-chat');
  assert.equal(buttons[0].props.target.proxy.profileId, 'p1');
}

// 3.5 QuickConnectionDialog
{
  const stub = createReactStub();
  const QuickConnectionDialog = createQuickConnectionDialog(() => ({
    personaStore: () => ({ personas: [] }),
    defaultProxyModels: [],
    ModelTestButton: ModelTestButtonMarker,
    defaultGeminiModels: models,
    useDialogFocus: () => {},
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    getProxyLegacyMode: () => false,
    react: stub.react,
    presetStore: () => ({ presets: [] }),
    buildSavedProbeTarget,
    getProxyProfiles: () => mockProxyPersistence.getProfiles(),
    catalog: {},
    useToast: () => ({ showToast }),
    useGeminiCatalog: () => ({ models }),
    Icon: 'Icon',
    getConnectionSettings: () => ({ source: 'openrouter', openrouter_model: 'or/model', proxy_protocol: 'openai' }),
    getOpenRouterCachedModels: () => [],
    saveConnectionSettings: () => {},
    saveProfiles: () => {},
    testModel,
    getProxyUrl: () => 'https://global.example.test',
    jsxRuntime: wt,
    getProxyPassword: () => 'global-secret',
  }));
  const tree = QuickConnectionDialog({ isOpen: true, onClose: () => {}, activePresetName: '', onPresetChange: () => {}, activePersonaId: '', onPersonaChange: () => {}, onConnectionChange: () => {} });
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'QuickConnectionDialog must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'openrouter');
  assert.equal(buttons[0].props.target.model, 'or/model');
}

// 3.6 MythicConfigurationDialog
{
  const stub = createReactStub();
  const MythicConfigurationDialog = createMythicConfigurationDialog(() => ({
    parseLooseJson: JSON.parse,
    SearchableSelect: 'SearchableSelect',
    isProxyForToolsEnabled: () => false,
    defaultMythicSystemPrompt: 'default-prompt',
    ModelTestButton: ModelTestButtonMarker,
    mythicPromptMacros: [],
    importLegacyRpgDatabase: x => x,
    defaultGeminiModels: models,
    useDialogFocus: () => {},
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    getProxyLegacyMode: () => false,
    react: stub.react,
    buildSavedProbeTarget,
    TextInput: 'TextInput',
    useToast: () => ({ showToast }),
    useGeminiCatalog: () => ({ models }),
    testModel,
    getProxyUrl: () => 'https://global.example.test',
    jsxRuntime: wt,
    getProxyPassword: () => 'global-secret',
    ToggleSwitch: 'ToggleSwitch',
  }));
  const tree = MythicConfigurationDialog({ isOpen: true, onClose: () => {}, database: { settings: { executionMode: 'standalone', modelId: 'gemini-2.5-flash' }, tables: [] }, onSave: () => {} });
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'MythicConfigurationDialog must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'gemini');
  assert.equal(buttons[0].props.target.model, 'gemini-2.5-flash');
}

// 3.7 ActionSuggestionDialog
{
  const stub = createReactStub();
  const ActionSuggestionDialog = createActionSuggestionDialog(() => ({
    markdownParser: { parse: x => x },
    ModelTestButton: ModelTestButtonMarker,
    ActionProposal: 'ActionProposal',
    defaultCopilotSystemPrompt: 'copilot-prompt',
    defaultGeminiModels: models,
    htmlSanitizer: { sanitize: x => x },
    connections: mockConnections,
    proxyPersistence: mockProxyPersistence,
    react: stub.react,
    presetStore: () => ({ presets: [], activePresetName: '', updateActivePreset: () => {}, reloadPresets: () => {} }),
    buildSavedProbeTarget,
    useToast: () => ({ showToast }),
    useGeminiCatalog: () => ({ models }),
    characterStore: () => ({ updateActiveCharacter: () => {}, reloadCharacters: () => {} }),
    Icon: 'Icon',
    LoadingIndicator: 'Loading',
    testModel,
    GoogleGenAIClient: class {},
    jsxRuntime: wt,
    getGeminiApiKey: () => 'gemini-saved-key',
  }));
  const tree = ActionSuggestionDialog({ isOpen: true, onClose: () => {}, gameHistory: [], card: { name: 'Char' }, variables: {}, logs: { turns: [] }, onUpdateVariable: () => {}, onRewriteMessage: () => {} });
  const buttons = findAll(tree, n => n.type === ModelTestButtonMarker);
  assert.equal(buttons.length, 1, 'ActionSuggestionDialog must render 1 ModelTestButton');
  assert.equal(buttons[0].props.target.provider, 'gemini');
  assert.equal(buttons[0].props.target.model, 'gemini-3-flash-preview');
}

console.log('Phase 1 E05.2 no-DOM-enhancer verification: OK');
