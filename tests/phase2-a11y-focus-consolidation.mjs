import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createTextInput,
  createTextArea,
  createSearchableSelect,
  createNumberInput,
  createStringListInput,
} from '../src/ui/components/input-controls.js';
import { createModelSelect } from '../src/ui/components/form-controls.js';
import { createCollapsibleSection, createSectionNavigator } from '../src/ui/components/section-controls.js';

const jsx = (type, props, key) => ({ type, props, key });
const jsxRuntime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
const react = { useId: () => ':a11y:', useMemo: fn => fn(), useState: init => [init, () => {}], useRef: init => ({ current: init }) };
const deps = () => ({
  react,
  jsxRuntime,
  Tooltip: ({ children }) => children,
  CopyButton: 'CopyButton',
  Icon: 'Icon',
});

function walk(node, fn) {
  if (!node) return;
  if (Array.isArray(node)) { node.forEach(item => walk(item, fn)); return; }
  if (typeof node !== 'object') return;
  fn(node);
  if (node.props?.children) walk(node.props.children, fn);
}

function collect(tree, pred) {
  const out = [];
  walk(tree, n => { if (pred(n)) out.push(n); });
  return out;
}

const SearchableSelect = createSearchableSelect(deps);
const ssTree = SearchableSelect({
  label: 'Chế độ Quét',
  value: 'llm_only',
  onChange: () => {},
  options: [{ value: 'llm_only', label: '4. Suy luận Sâu (Chỉ LLM)' }],
});
const ssLabels = collect(ssTree, n => n.type === 'label');
assert.equal(ssLabels.length, 1);
assert.equal(ssLabels[0].props['aria-hidden'], 'true');
const ssSelects = collect(ssTree, n => n.type?.name === 'ChoiceSelect');
assert.equal(ssSelects.length, 1);
assert.equal(ssSelects[0].props.label, 'Chế độ Quét');
const closedSelect = ssSelects[0].type(ssSelects[0].props);
assert.equal(collect(closedSelect, n => n.type === 'button').length, 1);
assert.equal(collect(closedSelect, n => n.type === 'button')[0].props['aria-label'], 'Chế độ Quét: 4. Suy luận Sâu (Chỉ LLM)');
assert.equal(collect(closedSelect, n => n.type === 'option').length, 0);
assert.equal(collect(closedSelect, n => n.type?.name === 'AnchoredDialog').length, 0);


const ModelSelect = createModelSelect(jsxRuntime, react);
const msTree = ModelSelect({
  label: 'Chọn mô hình',
  value: 'm1',
  onChange: () => {},
  options: [{ id: 'm1', name: 'Model 1' }],
  provider: 'proxy',
});
assert.equal(collect(msTree, n => n.type === 'label')[0].props['aria-hidden'], 'true');
assert.equal(collect(msTree, n => n.type?.name === 'ChoiceSelect')[0].props.label, 'Chọn mô hình');

const TextInput = createTextInput(deps);
const tiTree = TextInput({ label: 'Proxy URL', value: 'https://a.test', onChange: () => {} });
assert.equal(collect(tiTree, n => n.type === 'label')[0].props['aria-hidden'], 'true');
assert.equal(collect(tiTree, n => n.type === 'input')[0].props['aria-label'], 'Proxy URL');
assert.equal(collect(tiTree, n => n.type === 'CopyButton').length, 0);

const TextArea = createTextArea(deps);
const taTree = TextArea({ label: 'Mô tả', value: 'Hello', onChange: () => {} });
assert.equal(collect(taTree, n => n.type === 'label')[0].props['aria-hidden'], 'true');
assert.equal(collect(taTree, n => n.type === 'textarea')[0].props['aria-label'], 'Mô tả');
assert.equal(collect(taTree, n => n.type === 'CopyButton').length, 0);

const NumberInput = createNumberInput(deps);
const niTree = NumberInput({ label: 'Temperature', value: 0.7, min: 0, max: 2, step: 0.1, onChange: () => {} });
assert.equal(collect(niTree, n => n.type === 'label')[0].props['aria-hidden'], 'true');
assert.equal(collect(niTree, n => n.type === 'input' && n.props.type === 'range').length, 0);
const niInputs = collect(niTree, n => n.type === 'input' && n.props.type === 'number');
assert.equal(niInputs.length, 1);
assert.equal(niInputs[0].props['aria-label'], 'Temperature');

const StringListInput = createStringListInput(deps);
const slTree = StringListInput({ label: 'Từ khóa', values: ['a', 'b'], onChange: () => {} });
assert.equal(collect(slTree, n => n.type === 'label')[0].props['aria-hidden'], 'true');
assert.equal(collect(slTree, n => n.type === 'CopyButton').length, 0);

const CollapsibleSection = createCollapsibleSection(jsxRuntime);
const csTree = CollapsibleSection({ title: 'Cấu hình nâng cao', children: 'Body' });
const summary = collect(csTree, n => n.type === 'summary')[0];
assert.equal(summary.props.role, 'heading');
assert.equal(summary.props['aria-level'], 3);
assert.equal(collect(summary, n => n.type === 'h3').length, 0);

const SectionNavigator = createSectionNavigator(jsxRuntime);
const navTree = SectionNavigator({ items: [{ target: 'A', label: 'A' }] });
const navLabel = collect(navTree, n => n.props?.className === 'app-section-navigator__label')[0];
assert.equal(navLabel.props['aria-hidden'], 'true');

const emojiRe = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2300-\u23FF]/u;
for (const file of [
  'src/ui/settings/sections/smart-scan-settings.js',
  'src/ui/settings/sections/backup-settings.js',
  'src/features/rpg/ui/mythic/mythic-configuration-dialog.js',
  'src/features/world-info/ui/generate-entry-button.js',
  'src/features/world-info/ui/attach-lorebook-dialog.js',
]) {
  const src = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  assert.ok(!emojiRe.test(src), `Expected no decorative emojis in ${file}`);
}

console.log('Phase 2 screen-reader focus consolidation & decorative cleanup regression PASS');
