import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildCardRuntimeCoreScript } from '../assets/card-runtime-core-builder-v1.3.6.js';
import { buildCardRuntimeRendererScript } from '../assets/card-runtime-renderer-v1.3.6.js';

function bootPayload() {
  return { context: { compatibilityMode: 'safe', messageId: 1 } };
}

async function runCoreWith(startValue) {
  const window = { __STS_START_CARD_RUNTIME__: startValue };
  window.window = window;
  const context = vm.createContext({
    window,
    Promise,
    Date,
    Error,
    Object,
    String,
    Boolean,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(buildCardRuntimeCoreScript(bootPayload()), context);
  return window;
}

{
  let window;
  const start = function () {
    window.eventEmit = function () {};
    window.iframe_events = {
      MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
      MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
    };
    return Promise.resolve(true);
  };
  window = await runCoreWith(start);
  await window.cardStudioReady;
  assert.equal(window.__cardRuntimeBootState.phase, 'runtime-ready');
  assert.equal(window.__cardRuntimeBootState.hasEventEmit, true);
  assert.equal(window.__cardRuntimeBootState.hasRenderStartedEvent, true);
}

{
  const window = await runCoreWith({});
  await assert.rejects(
    window.cardStudioReady,
    error => error?.cardRuntimeBootstrapCode === 'CARD_RUNTIME_START_FUNCTION_MISSING'
      && error?.__cardRuntimeBootstrapFailure === true,
  );
  assert.equal(window.__cardRuntimeBootState.phase, 'start-function-missing');
}

{
  const window = await runCoreWith(function () { throw new Error('boom'); });
  await assert.rejects(
    window.cardStudioReady,
    error => error?.cardRuntimeBootstrapCode === 'CARD_RUNTIME_CORE_START_REJECTED'
      && String(error.message).includes('boom'),
  );
  assert.equal(window.__cardRuntimeBootState.phase, 'core-start-rejected');
}

{
  const window = await runCoreWith(function () { return Promise.resolve(true); });
  await assert.rejects(
    window.cardStudioReady,
    error => error?.cardRuntimeBootstrapCode === 'CARD_RUNTIME_EVENT_BRIDGE_NOT_READY',
  );
  assert.equal(window.__cardRuntimeBootState.phase, 'event-bridge-missing');
}

{
  const script = buildCardRuntimeRendererScript('', [], { executeScripts: false });
  const window = {};
  window.window = window;
  const result = vm.runInNewContext(script, { window, Promise, Date, Error, Object, String, Boolean });
  await assert.rejects(
    result,
    error => error?.cardRuntimeBootstrapCode === 'CARD_RUNTIME_READY_PROMISE_MISSING',
  );
}

{
  const script = buildCardRuntimeRendererScript('', [], { executeScripts: false });
  const window = {
    cardStudioReady: Promise.resolve(true),
    __cardRuntimeBootState: { phase: 'runtime-ready' },
  };
  window.window = window;
  const result = vm.runInNewContext(script, { window, Promise, Date, Error, Object, String, Boolean });
  await assert.rejects(
    result,
    error => error?.cardRuntimeBootstrapCode === 'CARD_RUNTIME_RENDERER_CONTRACT_NOT_READY'
      && String(error.message).includes('eventEmit'),
  );
  assert.equal(window.__cardRuntimeBootState.phase, 'renderer-contract-missing');
}

console.log('card runtime bootstrap contract tests: OK');
