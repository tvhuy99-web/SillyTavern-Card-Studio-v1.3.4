import assert from 'node:assert/strict';
import { createLorebookLibrary } from '../src/features/world-info/ui/lorebook-library.js';
import { createLorebookEntryCard } from '../src/features/world-info/ui/lorebook-entry-item.js';
import { createLorebookEntryList } from '../src/features/world-info/ui/lorebook-entry-list.js';
import { createLorebookManager } from '../src/features/world-info/ui/lorebook-manager.js';
import { createAttachLorebookDialog } from '../src/features/world-info/ui/attach-lorebook-dialog.js';
import { scanWorldInfo } from '../src/features/world-info/smart-scan-service.js';

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
  const react = createFakeReact(['World A', true, false, null, '', false, '']);
  const LorebookLibrary = createLorebookLibrary(() => ({
    react,
    jsxRuntime,
    FileNameDialog: 'FileNameDialog',
    LorebookEntryList: 'LorebookEntryList',
    useToast: () => ({ showToast: () => {} }),
    lorebookStore: () => ({
      lorebooks: [
        { name: 'World A', isGlobal: true, book: { entries: [{ uid: 'e1', comment: 'Rule 1', content: 'Body', enabled: true, constant: false }] } },
      ],
      error: '',
      loadLorebooks: () => {},
      createLorebook: async () => {},
      renameLorebook: async () => {},
      updateLorebook: () => {},
      deleteLorebook: () => {},
    }),
    characterStore: () => ({
      characters: [
        { fileName: 'dptk.png', card: { name: 'Đấu Phá Thương Khung', char_book: { entries: [] } } },
      ],
    }),
  }));

  const nodes = flatten(LorebookLibrary());
  assert.ok(nodes.some(n => n.type === 'h2' && n.props.children === 'Sổ tay Thế giới'));
  const select = nodes.find(n => n.type?.name === 'ChoiceSelect' && n.props.label === 'Chọn sổ tay thế giới');
  assert.ok(select);
  const options = select.props.options.map(option => option.label);
  assert.deepEqual(options, ['World A [Toàn cầu]', 'Đấu Phá Thương Khung (Mặc định)']);

  const menuItems = nodes.filter(n => n.type === 'button' && n.props.role === 'menuitem').map(n => n.props.children);
  assert.deepEqual(menuItems, [
    'Tạo mới sổ tay',
    'Đổi tên',
    'Nhân bản',
    'Gộp',
    'Bỏ áp dụng toàn cầu',
    'Nhập',
    'Xuất',
    'Xóa',
  ]);
}

{
  const react = createFakeReact();
  const edited = [];
  const opened = [];
  const LorebookEntryCard = createLorebookEntryCard(() => ({
    react,
    jsxRuntime,
    ToggleSwitch: 'ToggleSwitch',
  }));

  const tree = LorebookEntryCard({
    entry: { uid: 'u1', comment: 'Không có', content: 'Mô tả', enabled: false, constant: true },
    index: 0,
    onUpdate: () => {},
    onEdit: idx => edited.push(idx),
    onOpenActions: idx => opened.push(idx),
  });
  assert.equal(tree.type, 'article');
  assert.equal(tree.props['aria-labelledby'], undefined);

  const nodes = flatten(tree);
  const toggle = nodes.find(n => n.type === 'ToggleSwitch');
  assert.equal(toggle.props.label, '');
  assert.equal(toggle.props.ariaLabel, "Chưa chọn");
  assert.equal(toggle.props.checked, false);
  for (const enabled of [true, false, undefined]) {
    const updates = [];
    const item = { uid: "u2", comment: "Mô phỏng thế giới", enabled };
    const stateToggle = flatten(LorebookEntryCard({ entry: item, index: 1, onUpdate: (...args) => updates.push(args) })).find(n => n.type === "ToggleSwitch");
    assert.equal(stateToggle.props.ariaLabel, enabled !== false ? "Đã chọn" : "Chưa chọn");
    assert.equal(stateToggle.props.checked, enabled !== false);
    stateToggle.props.onChange(!stateToggle.props.checked);
    assert.deepEqual(updates, [[1, { ...item, enabled: !stateToggle.props.checked }]]);
  }

  const buttons = nodes.filter(n => n.type === 'button');
  assert.equal(buttons.length, 2, 'Card must only have Title button and Constant button');
  assert.equal(buttons[0].props.children, 'Không có');
  assert.equal(buttons[1].props.children, 'Hằng số: BẬT');

  buttons[0].props.onClick({ stopPropagation() {} });
  buttons[0].props.onContextMenu({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(edited, [0]);
  assert.deepEqual(opened, [0]);
  buttons[0].props.onClick({ stopPropagation() {} });
  assert.deepEqual(edited, [0], 'Releasing a context-menu press must not open the editor');
}

{
  const reactEmpty = createFakeReact(['all', null, null]);
  const LorebookEntryList = createLorebookEntryList(() => ({
    react: reactEmpty,
    jsxRuntime,
    LorebookEntryCard: 'LorebookEntryCard',
    LorebookEntryDialog: 'LorebookEntryDialog',
  }));
  const emptyNodes = flatten(LorebookEntryList({ entries: [], onUpdate: () => {} }));
  assert.ok(!emptyNodes.some(n => n.type === 'input'), 'Search box must be removed');
  const filterSelect = emptyNodes.find(n => n.type?.name === 'ChoiceSelect' && n.props.label === 'Lọc quy tắc sổ tay');
  assert.deepEqual(
    filterSelect.props.options.map(option => option.label),
    ['Tất cả', 'Đã bật', 'Đã tắt', 'Hằng số'],
  );
  assert.ok(emptyNodes.some(n => n.type === 'button' && n.props.children === 'Tạo mới quy tắc'), 'Standalone create button must appear when empty');

  let updatedList = null;
  const reactPopulated = createFakeReact(['all', null, 0]);
  const ListPopulated = createLorebookEntryList(() => ({
    react: reactPopulated,
    jsxRuntime,
    LorebookEntryCard: 'LorebookEntryCard',
    LorebookEntryDialog: 'LorebookEntryDialog',
  }));
  const popNodes = flatten(ListPopulated({
    entries: [{ uid: 'u1', comment: 'Rule', content: 'Body', enabled: true }],
    onUpdate: next => { updatedList = next; },
  }));
  const dialog = popNodes.find(n => n.type?.name === 'AnchoredDialog');
  assert.ok(dialog);
  const dialogBtns = flatten(dialog).filter(n => n.type === 'button');
  assert.deepEqual(dialogBtns.map(b => b.props.children), ['Tạo mới quy tắc', 'Xóa']);

  dialogBtns[1].props.onClick();
  assert.deepEqual(updatedList, []);
}

{
  const react = createFakeReact([[], [], '__internal__', true, false, false, '', false, '']);
  const LorebookManager = createLorebookManager(() => ({
    react,
    jsxRuntime,
    useEmbeddingSync: () => ({ statusMap: {} }),
    LorebookEntryList: 'LorebookEntryList',
    useDialogFocus: () => {},
    AttachLorebookDialog: 'AttachLorebookDialog',
    useToast: () => ({ showToast: () => {} }),
    lorebookStore: () => ({ lorebooks: [{ name: 'GlobalBook', book: { entries: [] } }], createLorebook: async () => {} }),
  }));
  const nodes = flatten(LorebookManager({
    initialEntries: [],
    initialAttached: [],
    onClose: () => {},
    onSave: () => {},
    characterId: 'hero.png',
  }));
  const menuItems = nodes.filter(n => n.type === 'button' && n.props.role === 'menuitem').map(n => n.props.children);
  assert.ok(menuItems.includes('Nhân bản'));
  assert.ok(menuItems.includes('Gộp'));

  // Render the actual child component, not just the parent's JSX descriptor.
  const attach = nodes.find(n => n.type === 'AttachLorebookDialog');
  assert.ok(attach);
  assert.deepEqual(attach.props.lorebooks.map(book => book.name), ['GlobalBook']);
  const AttachDialog = createAttachLorebookDialog(() => ({
    react: createFakeReact(['GlobalBook']), jsxRuntime, useDialogFocus: () => {},
  }));
  assert.equal(AttachDialog(attach.props), null, 'Closed dialog must render safely');
  const openDialog = createAttachLorebookDialog(() => ({
    react: createFakeReact(['GlobalBook']), jsxRuntime, useDialogFocus: () => {},
  }));
  const actions = [];
  const openNodes = flatten(openDialog({ ...attach.props, isOpen: true, onAction: (...args) => actions.push(args) }));
  assert.ok(openNodes.some(n => n.type === 'option' && n.props.value === 'GlobalBook'));
  const actionButtons = openNodes.filter(n => n.type === 'button' && n.props.disabled === false);
  assert.equal(actionButtons.length, 2);
  actionButtons.forEach(button => button.props.onClick());
  assert.deepEqual(actions.map(([action, book]) => [action, book.name]), [['link', 'GlobalBook'], ['merge', 'GlobalBook']]);
  for (const lorebooks of [undefined, null, {}]) {
    const SafeDialog = createAttachLorebookDialog(() => ({
      react: createFakeReact(), jsxRuntime, useDialogFocus: () => {},
    }));
    assert.doesNotThrow(() => SafeDialog({ ...attach.props, lorebooks, isOpen: true }));
  }
}

{
  const result = await scanWorldInfo({
    card: { name: 'AnyChar', char_book: { entries: [] }, attached_lorebooks: [] },
    lorebooks: [
      {
        name: 'GlobalLore',
        isGlobal: true,
        book: {
          entries: [
            { uid: 'g1', comment: 'Global Law', keys: ['vương quốc'], content: 'Luật toàn cầu', enabled: true, constant: true },
          ],
        },
      },
      {
        name: 'PrivateLore',
        isGlobal: false,
        book: {
          entries: [
            { uid: 'p1', comment: 'Private Law', keys: ['vương quốc'], content: 'Luật riêng', enabled: true, constant: true },
          ],
        },
      },
    ],
    messages: [{ role: 'user', content: 'Chào vương quốc' }],
    worldInfoState: {},
  }, {
    getSettings: () => ({ enabled: false, mode: 'keyword' }),
    resolveWorldInfo: (_scanInput, entries) => ({ activeEntries: entries, updatedRuntimeState: {}, newlySticky: [] }),
  });
  const activeList = result.activeEntries || result.entries || result.active || [];
  const activeUids = activeList.map(e => e.uid);
  assert.ok(activeUids.includes('g1'), 'Global lorebook entry must activate for any character');
  assert.ok(!activeUids.includes('p1'), 'Non-global unattached lorebook must NOT activate');
}

console.log('Phase 2 Lorebook UI redesign & global lorebook runtime regression PASS');
