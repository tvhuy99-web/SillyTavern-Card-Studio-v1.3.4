import assert from 'node:assert/strict';
import { createSessionViewSelector, useSessionView } from '../src/features/chat/hooks/session-view.js';
import { canFollowNewMessage, createMessageList } from '../src/features/chat/ui/messages/message-list.js';
import { createLiveStreamText } from '../src/features/chat/ui/streaming/live-stream-text.js';

const select = createSessionViewSelector();
const messages = [{ id: 'old', role: 'model', content: 'Old' }];
const base = { sessionId: 'chat', messages, isLoading: true, logs: { systemLog: [] } };
const view = select(base);
for (let i = 0; i < 100; i++) {
  assert.equal(select({ ...base, logs: { systemLog: [i] } }), view);
}
assert.equal('logs' in view, false);
assert.notEqual(select({ ...base, isLoading: false }), view);
assert.notEqual(select({ ...base, messages: [...messages] }), view);
let state = base;
const store = selector => selector(state);
const initial = useSessionView(store);
state = { ...base, logs: { systemLog: ['progress'] } };
assert.equal(useSessionView(store), initial);
assert.equal(state.logs.systemLog[0], 'progress');

const viewport = { scrollHeight: 1000, scrollTop: 600, clientHeight: 400 };
assert.equal(canFollowNewMessage(viewport), true);
assert.equal(canFollowNewMessage({ ...viewport, scrollTop: 400 }), false);
const focus = {};
assert.equal(canFollowNewMessage({ ...viewport, ownerDocument: { activeElement: focus }, contains: el => el === focus }), false);

const jsx = (type, props, key) => ({ type, props, key });
const jsxRuntime = { jsx, jsxs: jsx, Fragment: 'Fragment' };
const react = {
  memo: fn => fn, useRef: current => ({ current }),
  useState: init => [typeof init === 'function' ? init() : init, () => {}],
  useEffect() {}, useLayoutEffect() {},
};
const MessageList = createMessageList(react, () => ({
  react, jsxRuntime, getCompatibilityMode: () => 'safe', getRuntimeEngineMode: () => 'current',
  useSpeech: () => ({ settings: {} }), ChatMessage: 'ChatMessage', LoadingIndicator: 'LoadingIndicator',
}));
const flatten = (node, out = []) => {
  if (Array.isArray(node)) node.forEach(child => flatten(child, out));
  else if (node && typeof node === 'object') {
    out.push(node);
    flatten(node.props?.children, out);
  }
  return out;
};
const tree = MessageList({
  messages: [...messages, { id: 'live', role: 'model', content: '' }],
  isLoading: true, characterName: 'AI', sessionId: 'chat',
});
assert.equal(tree.props['aria-busy'], undefined, 'History must not become busy during streaming');
const nodes = flatten(tree);
const streaming = nodes.find(n => n.type === 'ChatMessage' && n.props.message.id === 'live');
assert.ok(streaming?.props.isStreaming, 'Empty placeholder must mount the live message');
assert.ok(nodes.some(n => n.key === 'old'));
assert.equal(nodes.find(n => n.key === 'live').props['aria-busy'], 'true');
assert.ok(!nodes.some(n => n.type === 'LoadingIndicator'), 'No duplicate placeholder');

let content = 'initial', subscriber, updateEffect, updates = [];
const fakeReact = {
  useState: init => [init(), value => updates.push(value)],
  useEffect: effect => { updateEffect = effect; },
};
const Live = createLiveStreamText(() => ({
  react: fakeReact, jsxRuntime,
  liveStreamStore: {
    getSnapshot: () => ({ content }),
    subscribe: (_id, _slot, fn) => { subscriber = fn; return () => { subscriber = null; }; },
  },
}));
const liveTree = Live({ messageId: 'live' });
assert.equal(liveTree.props['aria-live'], 'off');
assert.equal(liveTree.props.children[1].props['aria-hidden'], 'true');
content = 'chunk before subscription';
const cleanup = updateEffect();
assert.equal(updates.at(-1), content);
content = 'later chunk';
subscriber();
assert.equal(updates.at(-1), content);
cleanup();
assert.equal(subscriber, null);
console.log('Chat stream isolation and focus guards: OK');
