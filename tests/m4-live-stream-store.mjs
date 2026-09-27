import assert from 'node:assert/strict';
import { liveStreamStore } from '../src/features/chat/live-stream-store.js';

let notifications = 0;
const unsubscribe = liveStreamStore.subscribe('m1', 'main', () => {
  notifications += 1;
});

liveStreamStore.publish('m1', 'main', 'A');
liveStreamStore.publish('m1', 'main', 'AB');
liveStreamStore.publish('m1', 'main', 'ABC');

assert.equal(liveStreamStore.getSnapshot('m1', 'main').content, 'ABC');
assert.equal(notifications, 0, 'subscriber notifications should be coalesced');

await new Promise(resolve => setTimeout(resolve, 90));
assert.equal(notifications, 1, 'multiple rapid publishes should paint once');

liveStreamStore.clear('m1', 'main');
assert.equal(liveStreamStore.getSnapshot('m1', 'main').content, '');
assert.equal(notifications, 2, 'clear should notify immediately');

unsubscribe();
console.log('M4 live stream store checks: OK');
