import assert from 'node:assert/strict';
import { createPromptListItem } from '../src/features/presets/ui/prompt-manager.js';
import { createLorebookEntryCard } from '../src/features/world-info/ui/lorebook-entry-item.js';

const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: { useRef: current => ({ current }), useEffect() {} },
  jsxRuntime: { jsx, jsxs: jsx },
  ToggleSwitch: 'ToggleSwitch',
};
function findTitle(node) {
  if (Array.isArray(node)) return node.map(findTitle).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'button' && node.props.onContextMenu) return node;
  return findTitle(node.props?.children);
}

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
try {
  for (const [factory, props] of [
    [createPromptListItem, { prompt: { name: 'Prompt', content: 'Body' } }],
    [createLorebookEntryCard, { entry: { comment: 'Rule', content: 'Body' } }],
  ]) {
    const callbacks = new Map();
    let timerId = 0;
    globalThis.setTimeout = callback => { callbacks.set(++timerId, callback); return timerId; };
    globalThis.clearTimeout = id => callbacks.delete(id);
    const actions = [];
    const anchor = {};
    const event = { currentTarget: anchor, stopPropagation() {}, preventDefault() {} };
    const Component = factory(() => dependencies);
    const title = findTitle(Component({
      ...props,
      index: 0,
      onUpdate() {},
      onEdit: () => actions.push('edit'),
      onOpenActions: (index, element) => { assert.equal(element, anchor); actions.push('menu'); },
    }));

    title.props.onPointerDown(event);
    title.props.onPointerCancel(event);
    assert.equal(callbacks.size, 0, 'Canceled presses must clear the pending menu');
    title.props.onPointerDown(event);
    const fireLongPress = [...callbacks.values()][0];
    fireLongPress();
    title.props.onContextMenu(event);
    title.props.onClick(event);
    assert.deepEqual(actions, ['menu'], 'Timer, contextmenu and release must open a single menu');
    title.props.onPointerDown(event);
    title.props.onPointerUp(event);
    title.props.onClick(event);
    assert.deepEqual(actions, ['menu', 'edit'], 'A subsequent short press must still edit');
  }
} finally {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}
console.log('Prompt and lorebook long press, cancellation and release regression PASS');
