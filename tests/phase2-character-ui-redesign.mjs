import assert from 'node:assert/strict';
import { createCharacterScreen } from '../src/features/characters/ui/character-screen.js';
import { createCharacterDetailSections } from '../src/features/characters/ui/character-extension-sections.js';
import { createCharacterTools } from '../src/features/characters/ui/character-tools.js';

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

function createFakeReact(initialStates = []) {
  const states = [...initialStates];
  let idx = 0;
  return {
    useState(init) {
      const slot = idx++;
      if (!(slot in states)) states[slot] = typeof init === 'function' ? init() : init;
      return [states[slot], next => {
        states[slot] = typeof next === 'function' ? next(states[slot]) : next;
      }];
    },
    useRef(init) { return { current: init }; },
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useEffect() {},
  };
}

{
  const react = createFakeReact([false, 'basic', true, false]);
  const CharacterScreen = createCharacterScreen(() => ({
    react,
    jsxRuntime,
    useToast: () => ({ showToast: () => {} }),
    NEW_CHARACTER_ID: '__NEW__',
    emptyCharacterCard: { name: '', description: '' },
    LorebookManager: 'LorebookManager',
    CharacterDetailSections: 'CharacterDetailSections',
    CharacterTools: 'CharacterTools',
    LoadingIndicator: 'LoadingIndicator',
    characterStore: () => ({
      characters: [
        { fileName: 'alice.png', card: { name: 'Alice' }, avatarUrl: 'blob:1', avatarFile: {} },
      ],
      activeCharacterFileName: 'alice.png',
      isLoading: false,
      error: '',
      loadCharacter: () => {},
      deleteActiveCharacter: () => {},
      updateActiveCharacter: () => {},
      createNewCharacter: () => {},
      setActiveCharacterFileName: () => {},
      setAvatarForActiveCharacter: () => {},
    }),
  }));

  const nodes = flatten(CharacterScreen());
  const h2Texts = nodes.filter(n => n.type === 'h2').map(n => n.props.children);
  assert.deepEqual(h2Texts, ['Nhân vật', 'Cơ bản']);

  const select = nodes.find(n => n.type?.name === 'ChoiceSelect' && n.props['aria-label'] === 'Chọn nhân vật');
  assert.ok(select, 'Character selector dropdown must exist');

  const menuItems = nodes.filter(n => n.type === 'button' && n.props.role === 'menuitem').map(n => n.props.children);
  assert.deepEqual(menuItems, ['Tạo mới', 'Nhập', 'Xuất', 'Xóa']);

  const tabs = nodes.filter(n => n.type === 'button' && n.props.role === 'tab').map(n => n.props.children);
  assert.deepEqual(tabs, ['Cơ bản', 'Hội thoại & Kịch bản', 'Sổ tay & RPG', 'Nâng cao']);
}

{
  const react = createFakeReact();
  const CharacterDetailSections = createCharacterDetailSections(() => ({
    react,
    jsxRuntime,
    lorebookStore: () => ({ lorebooks: [] }),
    SectionNavigator: 'SectionNavigator',
    CharacterCoreSection: 'CharacterCoreSection',
    CharacterMetadataSection: 'CharacterMetadataSection',
    CharacterDialogueSection: 'CharacterDialogueSection',
    CharacterScenarioSection: 'CharacterScenarioSection',
    CharacterLorebookSection: 'CharacterLorebookSection',
    MythicSection: 'MythicSection',
    CharacterExtensionsSection: 'CharacterExtensionsSection',
  }));

  const typesFor = tab => flatten(CharacterDetailSections({
    card: { name: 'Alice' },
    onUpdate: () => {},
    onOpenLorebook: () => {},
    activeTab: tab,
    avatarSlot: jsx('AvatarSlot'),
    tokensSlot: jsx('TokensSlot'),
  })).map(n => n.type);

  assert.ok(typesFor('basic').includes('CharacterCoreSection'));
  assert.ok(typesFor('basic').includes('AvatarSlot'));
  assert.ok(typesFor('basic').includes('CharacterMetadataSection'));
  assert.ok(!typesFor('basic').includes('SectionNavigator'));

  assert.ok(typesFor('dialogue').includes('CharacterDialogueSection'));
  assert.ok(typesFor('dialogue').includes('CharacterScenarioSection'));

  assert.ok(typesFor('world').includes('CharacterLorebookSection'));
  assert.ok(typesFor('world').includes('MythicSection'));

  assert.ok(typesFor('advanced').includes('CharacterExtensionsSection'));
  assert.ok(typesFor('advanced').includes('TokensSlot'));
}

{
  const react = createFakeReact([false, '', false, 'json']);
  const CharacterTools = createCharacterTools(() => ({
    react,
    jsxRuntime,
    lorebookStore: () => ({ lorebooks: [] }),
    FileNameDialog: 'FileNameDialog',
    LoadingIndicator: 'LoadingIndicator',
    estimateTokens: () => 10,
    createPngTextChunk: () => new Uint8Array(),
    encodeBase64Utf8: () => '',
    downloadBlob: () => {},
    buildExportCard: c => c,
    isPngBytes: () => true,
    resolveExportSpec: () => 'v2',
  }));

  const nodes = flatten(CharacterTools({
    card: { name: 'Alice' },
    fileName: 'alice.png',
    avatarUrl: 'blob:1',
    avatarFile: {},
    setAvatar: () => {},
    section: 'export-modal',
    isExportModalOpen: true,
    onCloseExportModal: () => {},
  }));

  const buttons = nodes.filter(n => n.type === 'button').map(n => n.props.children);
  assert.deepEqual(buttons, ['Xuất ra JSON', 'Xuất ra PNG (V2)', 'Xuất ra PNG (V3)', 'Đóng']);
}

console.log('Phase 2 Character UI redesign regression PASS');
