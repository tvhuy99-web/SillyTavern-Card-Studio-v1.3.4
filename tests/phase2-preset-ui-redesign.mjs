import assert from 'node:assert/strict';
import { createPresetScreen } from '../src/features/presets/ui/preset-screen.js';
import { createPromptListItem, createPromptManager } from '../src/features/presets/ui/prompt-manager.js';

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
    reset() { idx = 0; },
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
    get states() { return states; },
  };
}

{
  const react = createFakeReact(['config', false, null, true]);
  const PresetScreen = createPresetScreen(() => ({
    react,
    jsxRuntime,
    useToast: () => ({ showToast: () => {} }),
    presetStore: () => ({
      presets: [{ name: 'Mặc định', prompts: [] }, { name: 'Custom', prompts: [] }],
      activePresetName: 'Custom',
      isLoading: false,
      error: '',
      addPreset: () => {},
      deleteActivePreset: () => {},
      updateActivePreset: () => {},
      setActivePresetName: () => {},
      duplicatePreset: () => {},
      createPreset: () => {},
      renamePreset: () => {},
    }),
    FileNameDialog: 'FileNameDialog',
    PresetTab: 'PresetTab',
    PromptManager: 'PromptManager',
    PresetConfiguration: 'PresetConfiguration',
    LoadingIndicator: 'LoadingIndicator',
    PresetNameDialog: 'PresetNameDialog',
  }));

  const tree = PresetScreen();
  const nodes = flatten(tree);
  const h2Texts = nodes.filter(n => n.type === 'h2').map(n => n.props.children);
  assert.deepEqual(h2Texts, ['Preset', 'Cấu hình']);

  const select = nodes.find(n => n.type === 'select' && n.props['aria-label'] === 'Chọn Preset');
  assert.ok(select, 'Preset selector dropdown must exist');

  const menuItems = nodes.filter(n => n.type === 'button' && n.props.role === 'menuitem').map(n => n.props.children);
  assert.deepEqual(menuItems, [
    'Lưu thành Preset mới',
    'Nhân bản',
    'Đổi tên',
    'Nhập',
    'Xuất',
    'Xóa',
  ]);
}

{
  const react = createFakeReact();
  const opened = [];
  const edited = [];
  const PromptListItem = createPromptListItem(() => ({
    react,
    jsxRuntime,
    ToggleSwitch: 'ToggleSwitch',
  }));

  const tree = PromptListItem({
    prompt: { identifier: 'p1', name: 'Không có', content: 'Nội dung mẫu', enabled: false },
    index: 0,
    onUpdate: () => {},
    onEdit: idx => edited.push(idx),
    onOpenActions: idx => opened.push(idx),
    movingPromptIndex: null,
    onMoveTo: () => {},
  });

  assert.equal(tree.type, 'article');
  assert.equal(tree.props['aria-labelledby'], undefined, 'Article must not attach aria-labelledby that mixes heading with switch');

  const nodes = flatten(tree);
  const toggle = nodes.find(n => n.type === 'ToggleSwitch');
  assert.ok(toggle);
  assert.equal(toggle.props.label, '');
  assert.equal(toggle.props.ariaLabel, undefined);
  assert.equal(toggle.props.checked, false);

  const buttons = nodes.filter(n => n.type === 'button');
  assert.equal(buttons.length, 1, 'Only the title button should be rendered on the row (no inline move/delete buttons)');
  assert.equal(buttons[0].props.children, 'Không có');

  buttons[0].props.onClick({ stopPropagation() {} });
  assert.deepEqual(edited, [0]);

  buttons[0].props.onContextMenu({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(opened, [0]);
}

{
  const react = createFakeReact(['all', 0, null, 0]);
  const PromptManager = createPromptManager(() => ({
    react,
    jsxRuntime,
    MacroReference: 'MacroReference',
    PromptEditDialog: 'PromptEditDialog',
    PromptPreview: 'PromptPreview',
    PromptListItem: 'PromptListItem',
    useToast: () => ({ showToast: () => {} }),
  }));

  const tree = PromptManager({
    preset: {
      name: 'Mặc định',
      prompts: [
        { identifier: 'a', name: 'Main', content: 'Hello', enabled: true },
        { identifier: 'b', name: 'System', content: 'World', enabled: false },
      ],
    },
    onUpdate: () => {},
  });

  const nodes = flatten(tree);
  assert.ok(nodes.some(n => n.type === 'MacroReference'), 'MacroReference must remain');
  const filterSelect = nodes.find(n => n.type === 'select' && n.props['aria-label'] === 'Lọc lời nhắc');
  assert.ok(filterSelect, 'Filter must be a dropdown');
  const filterOptions = flatten(filterSelect).filter(n => n.type === 'option').map(n => n.props.children);
  assert.deepEqual(filterOptions, ['Tất cả', 'Đã bật', 'Đã tắt']);

  const allText = nodes.map(n => typeof n.props.children === 'string' ? n.props.children : '').join(' ');
  assert.ok(!allText.includes('Xuất theo bộ lọc'), 'Export-by-filter button must be removed');
  assert.ok(!allText.includes('Thêm Lời nhắc Mới'), 'Bottom add-prompt button must be removed when prompts exist');
  assert.ok(nodes.some(n => n.type === 'PromptPreview'), 'PromptPreview must remain');
  assert.ok(nodes.some(n => n.type === 'button' && n.props.children === 'Hủy di chuyển'), 'Top cancel move button must render');

  const dialog = nodes.find(n => n.props.role === 'dialog');
  assert.ok(dialog, 'Long-press action dialog must render');
  const actionLabels = flatten(dialog).filter(n => n.type === 'button').map(n => n.props.children);
  assert.deepEqual(actionLabels, [
    'Chọn để di chuyển',
    'Sao chép nội dung',
    'Thêm lời nhắc bên dưới',
    'Xóa',
  ]);
}

console.log('Phase 2 Preset UI redesign regression PASS');
