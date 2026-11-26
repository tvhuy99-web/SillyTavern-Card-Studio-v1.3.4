import { awaitAbortable } from '../../../core/async/cancellation.js';

/** Host-side transport and request ownership. Domain handlers are injected. */
export function createHostRpcDispatcher({ isActiveSource, getSessionRevision, getSessionId,
  validatePayload, clone, getFrameIdentity = source => source, authorize = () => {}, targetOriginForSource = () => '*',
  deadlineForMethod = method => method === 'generation.generate' ? 360000 : 30000, onTransportError = () => {}, recentLimit = 256, maxPendingPerSource = 32, maxPendingTotal = 128 }) {
  if (!Number.isSafeInteger(recentLimit) || recentLimit < 0) throw new TypeError('Invalid RPC replay window.');
  if (![maxPendingPerSource, maxPendingTotal].every(limit => Number.isSafeInteger(limit) && limit > 0)) throw new TypeError('Invalid RPC concurrency limit.');
  const sources = new WeakMap();
  const active = new Set();
  let pendingTotal = 0;
  const reportTransportError = error => { try { onTransportError(error); } catch {} };
  function send(source, response) {
    try { const target = targetOriginForSource(source); if (target) source.postMessage(response, target); } catch (error) { reportTransportError(error); }
  }
  function capture(source, controller) {
    const revision = getSessionRevision(), sessionId = getSessionId();
    const frame = getFrameIdentity(source);
    const sameFrame = () => isActiveSource(source) && frame === getFrameIdentity(source);
    const isCurrent = () => !controller.signal.aborted && sameFrame() && revision === getSessionRevision() && sessionId === getSessionId();
    return Object.freeze({ revision, sessionId, signal:controller.signal, sameFrame, isCurrent, assertCurrent() {
      if (!isCurrent()) throw new Error('Card runtime request belongs to an inactive session or frame.');
    } });
  }
  async function dispatch(event, { execute, diagnose = () => undefined }) {
    const source = event?.source, request = event?.data;
    if (!source || !isActiveSource(source, event) || request?.type !== 'CARD_RUNTIME_RPC') return false;
    const { requestId, method } = request;
    if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200) return false;
    const frame = getFrameIdentity(source);
    let ledger = sources.get(source);
    if (!ledger || ledger.frame !== frame) {
      // Retire old frame requests before accepting IDs from a new document.
      sweep();
      ledger = { frame, pending: new Set(), recent: new Set() }; sources.set(source, ledger);
    }
    if (ledger.pending.has(requestId) || ledger.recent.has(requestId)) return true;
    if (ledger.pending.size >= maxPendingPerSource || pendingTotal >= maxPendingTotal) {
      send(source, { type: 'CARD_RUNTIME_RPC_RESULT', requestId, ok: false, error: 'Too many pending card runtime requests.' });
      return true;
    }
    ledger.pending.add(requestId);
    pendingTotal++;
    const controller = new AbortController();
    const lease = capture(source, controller);
    const pending = {lease,controller};
    active.add(pending);
    let timer, timedOut = false;
    const respond = fields => send(source, { type: 'CARD_RUNTIME_RPC_RESULT', requestId, ...fields });
    try {
      if (typeof method !== 'string' || !method.trim() || method.length > 200) throw new Error('Invalid card runtime method.');
      const args = request.args ?? {};
      if (typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid card runtime arguments.');
      validatePayload(args);
      if (request.context !== undefined) validatePayload(request.context);
      lease.assertCurrent();
      authorize({ ...request, args }, source, lease);
      const deadline = deadlineForMethod(method);
      if (!Number.isFinite(deadline) || deadline <= 0) throw Error("Invalid RPC deadline.");
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, deadline);
      const execution = execute({ ...request, args }, source, lease);
      const result = await awaitAbortable(() => execution, controller.signal);
      lease.assertCurrent();
      validatePayload(result);
      respond({ ok: true, result: clone(result) });
    } catch (error) {
      // Never attribute an old request's failure to the newly opened chat.
      if (timedOut) {
        if (lease.sameFrame() && lease.revision === getSessionRevision() && lease.sessionId === getSessionId()) respond({ok:false,error:'Card runtime request timed out.'});
      } else if (!lease.isCurrent()) {
        if (lease.sameFrame()) respond({ ok: false, error: 'Card runtime request belongs to an inactive session or frame.' });
      } else {
        let diagnostic;
        try { diagnostic = diagnose(error, request); } catch (diagnosticError) { reportTransportError(diagnosticError); }
        respond({ ok: false, error: error instanceof Error ? error.message : String(error), diagnostic });
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      active.delete(pending);
      ledger.pending.delete(requestId);
      pendingTotal--;
      ledger.recent.add(requestId);
      while (ledger.recent.size > recentLimit) ledger.recent.delete(ledger.recent.values().next().value);
    }
    return true;
  }
  function sweep() { for (const item of active) if (!item.lease.isCurrent()) item.controller.abort(); }
  function cancelAll() { for (const item of active) item.controller.abort(); }
  return Object.freeze({ dispatch, sweep, cancelAll });
}

/** Frame identities change when a reused iframe receives a new document. */
export function createFrameIdentityReader(findFrame) {
  const identities = new WeakMap();
  return source => {
    const frame = findFrame(source);
    if (!frame) return undefined;
    const documentSource = JSON.stringify([frame.getAttribute('srcdoc'), frame.getAttribute('src'), frame.getAttribute('sandbox')]);
    const prior = identities.get(frame);
    if (prior && prior.documentSource === documentSource) return prior.token;
    const token = {};
    if (!prior) frame.addEventListener?.('load', () => {
      const current = identities.get(frame);
      if (current) identities.set(frame, {...current, token:{}});
    });
    identities.set(frame, {documentSource, token});
    return token;
  };
}

/** Opaque sandboxed srcdoc frames send origin "null"; trusted full frames
 * must remain on the application origin. Remote navigations are not Host RPC clients. */
export function isFrameMessageOrigin(frame, origin, hostOrigin) {
  if (!frame || typeof origin !== 'string') return false;
  const target = frameMessageTargetOrigin(frame, hostOrigin);
  return target === '*' ? origin === 'null' : target !== null && origin === target;
}
export function frameMessageTargetOrigin(frame, hostOrigin = globalThis.location?.origin) {
  if (!frame) return null;
  const sandbox = frame.getAttribute('sandbox');
  if (sandbox !== null && !sandbox.split(/\s+/).includes('allow-same-origin')) return '*';
  return typeof hostOrigin === 'string' && hostOrigin !== 'null' ? hostOrigin : null;
}
export function postFrameMessage(frame, message, hostOrigin = globalThis.location?.origin) {
  const target = frameMessageTargetOrigin(frame, hostOrigin);
  if (!target || !frame?.contentWindow) return false;
  frame.contentWindow.postMessage(message, target);
  return true;
}

/** Explicit capability inventory. Safe frames may edit their chat, not the
 * application catalog or persistent global scopes. Full remains trusted. */
export const SAFE_RPC_METHODS = Object.freeze([
  'chat.get','chat.set','chat.create','chat.delete','chat.rotate','chat.refresh','chat.reload','chat.save','chat.rename',
  'variables.replace','storage.set','storage.remove','storage.clear','extension.settings.save',
  'character.data.get','character.data.save','character.extension.write','regex.replace','raw.import.regex',
  'lorebook.names','lorebook.entries.get','lorebook.entries.replace','lorebook.entries.create','lorebook.entries.delete',
  'generation.generate','generation.stop','generation.stopAll','generation.models','preset.get','preset.load','scripts.buttons',
]);
export const FULL_ONLY_RPC_METHODS = Object.freeze([
  'character.create','character.replace','character.delete','character.select',
  'persona.create','persona.replace','persona.delete','preset.create','preset.replace','preset.delete','preset.rename',
  'extension.install','extension.reinstall','extension.update','extension.uninstall',
  'lorebook.create','lorebook.delete','raw.import.worldbook','raw.import.character','raw.import.preset','raw.import.chat','slash.execute',
]);
const safeMethods = new Set(SAFE_RPC_METHODS);
const embeddedMutations = new Set(['lorebook.entries.replace','lorebook.entries.create','lorebook.entries.delete']);
export function authorizeFrameRpc(request, frame, state) {
  if (!frame) throw Error('Inactive card runtime frame.');
  if (!frame.hasAttribute('sandbox')) return;
  if (!safeMethods.has(request.method)) throw Error('This method requires Full compatibility mode.');
  const custom = request.method === 'generation.generate' ? request.args?.options?.custom_api : request.method === 'generation.models' ? request.args?.custom_api : null;
  if (custom?.apiurl || custom?.key) throw Error('Custom API endpoints or credentials require Full compatibility mode.');
  if (request.method === 'variables.replace' && !['chat','message','script'].includes(request.args?.option?.type || 'chat')) throw Error('This variable scope requires Full compatibility mode.');
  if (embeddedMutations.has(request.method)) {
    const card = state?.card;
    const defaultName = card?.char_book?.name || card?.name || 'Character Lorebook';
    const name = String(request.args?.name || defaultName);
    if (!card?.char_book || (name !== defaultName && name !== card.name)) throw Error('External lorebook mutations require Full compatibility mode.');
  }
}
