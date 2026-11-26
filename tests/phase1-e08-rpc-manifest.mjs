import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_RPC_METHODS, createHostMethodRouter } from '../src/runtime/card-runtime/host/method-router.js';
import { CATALOG_RPC_METHODS } from '../src/runtime/card-runtime/host/catalog-rpc.js';
import { CHAT_RPC_METHODS, CHAT_SESSION_RPC_METHODS } from '../src/runtime/card-runtime/host/chat-rpc.js';
import { LOREBOOK_RPC_METHODS } from '../src/runtime/card-runtime/host/lorebook-rpc.js';
import { STATE_RPC_METHODS, EXTENSION_LIFECYCLE_RPC_METHODS } from '../src/runtime/card-runtime/host/state-rpc.js';
import { UTILITY_RPC_METHODS } from '../src/runtime/card-runtime/host/utility-rpc.js';
import {
  SAFE_RPC_METHODS,
  FULL_ONLY_RPC_METHODS,
  authorizeFrameRpc,
  createHostRpcDispatcher,
} from '../src/runtime/card-runtime/host/rpc-dispatcher.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// 1. Complete RPC Method Manifest Inventory
const GENERATION_RPC_METHODS = ['generation.generate', 'generation.stop', 'generation.stopAll'];
const expectedManifest = [
  ...CHAT_RPC_METHODS,
  ...CHAT_SESSION_RPC_METHODS,
  ...CATALOG_RPC_METHODS,
  ...STATE_RPC_METHODS,
  ...EXTENSION_LIFECYCLE_RPC_METHODS,
  'raw.import.regex',
  ...LOREBOOK_RPC_METHODS,
  ...UTILITY_RPC_METHODS,
  ...GENERATION_RPC_METHODS,
];

assert.equal(new Set(HOST_RPC_METHODS).size, HOST_RPC_METHODS.length, 'HOST_RPC_METHODS must not contain duplicates');
assert.deepEqual([...HOST_RPC_METHODS].sort(), [...expectedManifest].sort(), 'HOST_RPC_METHODS must match all domain handler method lists');

// Safe vs Full-Only partition must cover 100% of HOST_RPC_METHODS with zero overlap
const safeSet = new Set(SAFE_RPC_METHODS);
const fullOnlySet = new Set(FULL_ONLY_RPC_METHODS);
assert.equal(safeSet.size, SAFE_RPC_METHODS.length, 'SAFE_RPC_METHODS must not contain duplicates');
assert.equal(fullOnlySet.size, FULL_ONLY_RPC_METHODS.length, 'FULL_ONLY_RPC_METHODS must not contain duplicates');
for (const method of SAFE_RPC_METHODS) {
  assert.equal(fullOnlySet.has(method), false, `Method cannot be in both SAFE and FULL_ONLY: ${method}`);
}
assert.deepEqual(
  [...SAFE_RPC_METHODS, ...FULL_ONLY_RPC_METHODS].sort(),
  [...HOST_RPC_METHODS].sort(),
  'SAFE_RPC_METHODS U FULL_ONLY_RPC_METHODS must equal HOST_RPC_METHODS',
);

// 2. Method Router Dispatch Coverage for Every Registered Method
{
  const routed = [];
  const emitted = [];
  const router = createHostMethodRouter({
    chat: async (method, args) => { routed.push(['chat', method]); return { group: 'chat', method, args }; },
    catalog: async (method, args) => { routed.push(['catalog', method]); return { group: 'catalog', method, args }; },
    state: async (method, args) => { routed.push(['state', method]); return { group: 'state', method, args }; },
    lorebook: async (method, args) => { routed.push(['lorebook', method]); return { group: 'lorebook', method, args }; },
    utility: async (method, args) => { routed.push(['utility', method]); return { group: 'utility', method, args }; },
    generate: async (source, raw, options) => { routed.push(['generation', 'generation.generate']); return { raw, options }; },
    tasks: {
      stop(source, id) { routed.push(['generation', 'generation.stop']); return id; },
      stopAll() { routed.push(['generation', 'generation.stopAll']); },
    },
    emit(source, eventName) { emitted.push(eventName); },
  });
  const source = {};
  const lease = { assertCurrent() {} };

  for (const method of HOST_RPC_METHODS) {
    const args = method === 'generation.stop' ? { generationId: 'g-1' } : {};
    await router({ method, args }, source, lease);
  }
  assert.equal(routed.length, HOST_RPC_METHODS.length, 'Every HOST_RPC_METHOD must be routable');
  assert.deepEqual(emitted, ['generation_stopped', 'generation_stopped']);
  await assert.rejects(
    router({ method: 'nonexistent.method', args: {} }, source, lease),
    /Unsupported card runtime method: nonexistent\.method/,
  );
}

// 3. Safe Mode vs Full Mode Permission Boundaries
{
  const safeFrame = { hasAttribute: name => name === 'sandbox' };
  const fullFrame = { hasAttribute: () => false };
  const embeddedState = {
    card: {
      name: 'Aria',
      char_book: { name: 'Aria Book', entries: [] },
    },
  };
  const noBookState = { card: { name: 'Aria' } };

  // Missing frame is always rejected
  assert.throws(() => authorizeFrameRpc({ method: 'chat.get', args: {} }, null, embeddedState), /Inactive card runtime frame/);

  // Every FULL_ONLY method is blocked in Safe Mode and allowed in Full Mode
  for (const method of FULL_ONLY_RPC_METHODS) {
    assert.throws(
      () => authorizeFrameRpc({ method, args: {} }, safeFrame, embeddedState),
      /Full compatibility mode/,
      `Safe mode must block full-only method: ${method}`,
    );
    assert.doesNotThrow(
      () => authorizeFrameRpc({ method, args: {} }, fullFrame, embeddedState),
      `Full mode must allow full-only method: ${method}`,
    );
  }

  // Every SAFE method is allowed in Safe Mode with safe arguments and in Full Mode
  for (const method of SAFE_RPC_METHODS) {
    const safeArgs = method === 'variables.replace'
      ? { option: { type: 'chat' }, variables: {} }
      : method.startsWith('lorebook.entries.')
        ? { name: 'Aria Book' }
        : {};
    assert.doesNotThrow(
      () => authorizeFrameRpc({ method, args: safeArgs }, safeFrame, embeddedState),
      `Safe mode must allow safe method: ${method}`,
    );
    assert.doesNotThrow(
      () => authorizeFrameRpc({ method, args: safeArgs }, fullFrame, embeddedState),
      `Full mode must allow safe method: ${method}`,
    );
  }

  // Safe Mode scoped escalation boundaries
  for (const allowedScope of ['chat', 'message', 'script']) {
    assert.doesNotThrow(() =>
      authorizeFrameRpc({ method: 'variables.replace', args: { option: { type: allowedScope } } }, safeFrame, embeddedState),
    );
  }
  for (const blockedScope of ['global', 'character', 'preset', 'extension']) {
    assert.throws(
      () => authorizeFrameRpc({ method: 'variables.replace', args: { option: { type: blockedScope } } }, safeFrame, embeddedState),
      /variable scope requires Full compatibility mode/,
    );
    assert.doesNotThrow(() =>
      authorizeFrameRpc({ method: 'variables.replace', args: { option: { type: blockedScope } } }, fullFrame, embeddedState),
    );
  }

  // Custom API endpoints / credentials blocked in Safe Mode, allowed in Full Mode
  assert.throws(
    () => authorizeFrameRpc({ method: 'generation.generate', args: { options: { custom_api: { apiurl: 'https://example.invalid' } } } }, safeFrame, embeddedState),
    /Custom API endpoints or credentials require Full compatibility mode/,
  );
  assert.throws(
    () => authorizeFrameRpc({ method: 'generation.models', args: { custom_api: { key: 'secret-key' } } }, safeFrame, embeddedState),
    /Custom API endpoints or credentials require Full compatibility mode/,
  );
  assert.doesNotThrow(() =>
    authorizeFrameRpc({ method: 'generation.generate', args: { options: { custom_api: { apiurl: 'https://example.invalid', key: 'k' } } } }, fullFrame, embeddedState),
  );

  // External lorebook mutations blocked in Safe Mode, allowed in Full Mode
  for (const method of ['lorebook.entries.replace', 'lorebook.entries.create', 'lorebook.entries.delete']) {
    assert.throws(
      () => authorizeFrameRpc({ method, args: { name: 'External Worldbook' } }, safeFrame, embeddedState),
      /External lorebook mutations require Full compatibility mode/,
    );
    assert.throws(
      () => authorizeFrameRpc({ method, args: { name: 'Aria' } }, safeFrame, noBookState),
      /External lorebook mutations require Full compatibility mode/,
    );
    assert.doesNotThrow(() =>
      authorizeFrameRpc({ method, args: { name: 'External Worldbook' } }, fullFrame, embeddedState),
    );
  }
}

// 4. Timeout, Cancellation, Replay Protection, and Concurrency Limits
{
  let revision = 1;
  let sessionId = 'session-1';
  const replies = [];
  const source = { postMessage(msg) { replies.push(msg); } };
  const dispatcher = createHostRpcDispatcher({
    isActiveSource: s => s === source,
    getSessionRevision: () => revision,
    getSessionId: () => sessionId,
    validatePayload: () => {},
    clone: structuredClone,
    deadlineForMethod: method => (method === 'slow.timeout' ? 20 : 5000),
    maxPendingPerSource: 2,
    maxPendingTotal: 4,
  });

  // 4a. Timeout aborts lease signal and responds with timeout error
  let timedOutSignalAborted = false;
  await dispatcher.dispatch(
    { source, data: { type: 'CARD_RUNTIME_RPC', requestId: 'req-timeout', method: 'slow.timeout', args: {} } },
    {
      execute(_req, _src, lease) {
        return new Promise(() => {
          lease.signal.addEventListener('abort', () => {
            timedOutSignalAborted = true;
          });
        });
      },
    },
  );
  assert.equal(timedOutSignalAborted, true, 'Timeout must abort lease.signal');
  assert.deepEqual(replies.at(-1), {
    type: 'CARD_RUNTIME_RPC_RESULT',
    requestId: 'req-timeout',
    ok: false,
    error: 'Card runtime request timed out.',
  });

  // 4b. Duplicate requestId replay is ignored
  const beforeCount = replies.length;
  const replayed = await dispatcher.dispatch(
    { source, data: { type: 'CARD_RUNTIME_RPC', requestId: 'req-timeout', method: 'chat.get', args: {} } },
    { execute: async () => 'should-not-run' },
  );
  assert.equal(replayed, true);
  assert.equal(replies.length, beforeCount, 'Replayed requestId must not send another response');

  // 4c. cancelAll() cancels in-flight RPCs
  let cancelSignalAborted = false;
  const cancelPromise = dispatcher.dispatch(
    { source, data: { type: 'CARD_RUNTIME_RPC', requestId: 'req-cancel', method: 'chat.get', args: {} } },
    {
      execute(_req, _src, lease) {
        return new Promise(() => {
          lease.signal.addEventListener('abort', () => {
            cancelSignalAborted = true;
          });
        });
      },
    },
  );
  dispatcher.cancelAll();
  await cancelPromise;
  assert.equal(cancelSignalAborted, true, 'cancelAll() must abort in-flight lease.signal');
  assert.equal(replies.at(-1).requestId, 'req-cancel');
  assert.equal(replies.at(-1).ok, false);
  assert.match(replies.at(-1).error, /inactive session or frame/);

  // 4d. Session revision change + sweep() aborts stale requests without leaking to new session
  let sweepAborted = false;
  const sweepPromise = dispatcher.dispatch(
    { source, data: { type: 'CARD_RUNTIME_RPC', requestId: 'req-sweep', method: 'chat.get', args: {} } },
    {
      execute(_req, _src, lease) {
        return new Promise(() => {
          lease.signal.addEventListener('abort', () => {
            sweepAborted = true;
          });
        });
      },
    },
  );
  revision = 2;
  dispatcher.sweep();
  await sweepPromise;
  assert.equal(sweepAborted, true, 'sweep() must abort requests belonging to a previous session revision');
}

// 5. Zero Static/Dynamic Imports from assets/ in Card Runtime and host.js (B08)
{
  function listJs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listJs(full);
      return entry.name.endsWith('.js') ? [full] : [];
    });
  }

  const hostFile = path.join(ROOT, 'src/app/host.js');
  const hostCode = fs.readFileSync(hostFile, 'utf8');
  assert.ok(hostCode.includes("from '../runtime/card-runtime/core-builder.js'"), 'src/app/host.js must import canonical core-builder.js');
  assert.ok(!hostCode.includes('../../assets/card-runtime-core-builder'), 'src/app/host.js must not import assets/card-runtime-core-builder');

  const runtimeFiles = listJs(path.join(ROOT, 'src/runtime/card-runtime'));
  assert.ok(runtimeFiles.some(f => f.endsWith(path.join('card-runtime', 'core-builder.js'))), 'Canonical core-builder.js must exist in src/runtime/card-runtime/');

  const assetImportRe = /(?:^|\n)\s*(?:import|export)\b[^\n]*?\bfrom\s*['"][^'"]*assets\/[^'"]*['"]|\bimport\s*\(\s*['"][^'"]*assets\/[^'"]*['"]\s*\)/g;
  for (const file of [hostFile, ...runtimeFiles]) {
    const code = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const matches = code.match(assetImportRe);
    assert.equal(matches, null, `Forbidden import from assets/ in ${rel}: ${matches?.join(', ')}`);
  }
}

console.log(
  `Phase 1 E08 RPC manifest contract tests: OK (${HOST_RPC_METHODS.length} methods verified: ${SAFE_RPC_METHODS.length} safe, ${FULL_ONLY_RPC_METHODS.length} full-only)`,
);
