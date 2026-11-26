import { ANDROID_PLUGINS, requireNativePromiseBridge, awaitNativeDeadline, acquireNativeListener, releaseNativeListener } from '../../../recovered/platform/android/native-bridge.js';
import { createConnectionRepository } from '../common/connection-repository.js';
// Experimental Android AI Studio WebView text adapter.
// Emits true UI-observed partial text updates (not fabricated SSE).
// Does not access credentials, cookies, tokens or undocumented endpoints.
const AI_STUDIO_SOURCE = 'aistudio';

function log(stage, data = {}, level = 'state') {
  globalThis.__STS_AI_STUDIO_LOGS__?.record?.(stage, data, level);
}

const bridge = requireNativePromiseBridge;

// "default" means leave the model selection to the signed-in AI Studio page.
export function resolveAiStudioWebModelId(model) {
  const id = String(model ?? '').trim();
  return id === 'default' || id === 'web_default' ? '' : id;
}

function makeId() {
  return 'text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function resolveThinkingLevel(explicit){
  if(typeof explicit==="string"&&explicit.trim())return explicit.trim();
  try{const settings=createConnectionRepository().getSettings();return String(settings.aistudio_thinking||"default");}
  catch{return "default";}
}
async function run({ prompt, model, signal, requestId, thinkingLevel, mode = 'chat', requestTimeoutMs = 510000 }) {
  if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
  const cap = bridge();
  const resolvedModel = resolveAiStudioWebModelId(model);
  const resolvedThinking = resolveThinkingLevel(thinkingLevel);
  log('TEXT_REQUEST', {requestId, mode, promptChars: String(prompt || '').length,
    requestedModel: String(model ?? 'default'), sentModel: resolvedModel || 'web-default',
    requestedThinking: String(thinkingLevel || 'from-saved-settings'),
    sentThinking: resolvedThinking, nativeMethod: `${ANDROID_PLUGINS.aiStudio}.generate`});
  let submitted = false;
  const abort = () => {
    if (!submitted) return;
    log('ABORT', {requestId, message:'User stopped generation'}, 'warn');
    try { Promise.resolve(cap.nativePromise(ANDROID_PLUGINS.aiStudio, 'cancel', {requestId})).catch(() => {}); } catch {}
  };
  signal?.addEventListener('abort', abort, {once:true});
  try {
    const work = () => {
      submitted = true;
      return cap.nativePromise(ANDROID_PLUGINS.aiStudio, 'generate', {
        prompt: String(prompt ?? ''), model: resolvedModel, thinkingLevel: resolvedThinking, requestId,
      });
    };
    const result = await awaitNativeDeadline(work, {signal, timeoutMs: requestTimeoutMs, message: 'AI_STUDIO_NATIVE_TIMEOUT: Android không trả kết quả.'});
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    const text = String(result?.text ?? '');
    if (!text.trim()) throw new Error('AI Studio phản hồi trống.');
    log('TEXT_RESULT', {requestId, mode, responseChars:text.length,
      requestedThinking: resolvedThinking, nativeConfirmedThinking: String(result?.appliedThinking || 'see-native-log')}, 'script-success');
    return {text, reasoning:String(result?.reasoning ?? "")};
  } catch (error) {
    if (error?.code === 'NATIVE_BRIDGE_TIMEOUT') abort();
    log('TEXT_ERROR', {requestId, mode, sentThinking:resolvedThinking, sentModel:resolvedModel || 'web-default',
      message:String(error?.message || error)}, 'error');
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

export function openAiStudioSession() {
  return awaitNativeDeadline(() => bridge().nativePromise(ANDROID_PLUGINS.aiStudio, 'openSession', {}), {timeoutMs:15000});
}

export function createAiStudioTextProvider({requestTimeoutMs = 510000, listenerTimeoutMs = 10000, cleanupTimeoutMs = 2000} = {}) {
  async function generate({prompt, model, signal, thinkingLevel}) {
    const result = await run({prompt, model, signal, thinkingLevel, mode:'tool', requestId:makeId(), requestTimeoutMs});
    return {response:{text:result.text}, reasoning:result.reasoning||undefined};
  }

  async function* stream(options) {
    const cap = bridge();
    const requestId = makeId();
    const listenerAPI = cap.Plugins?.[ANDROID_PLUGINS.aiStudio];
    if (!listenerAPI?.addListener) {
      log('STREAM_UNAVAILABLE', {requestId, message:'Native listener unavailable: returning complete answer'}, 'warn');
      const result=await run({...options,mode:'chat',requestId,requestTimeoutMs});
      yield {text:result.text,reasoning:result.reasoning||undefined,replaceReasoning:true};
      return;
    }

    let latestSnapshot = null;
    let latestReasoning = null;
    let wake = null;
    let completed = false;
    let failure = null;
    let finalText = '';
    let finalReasoning = '';
    let lastYielded = null;
    let lastReasoning = null;
    const outerSignal = options.signal;
    const controller = new AbortController();
    const signal = controller.signal;
    const wakeUp = () => {const callback = wake; wake = null; callback?.();};
    if (outerSignal?.aborted) throw new DOMException('Stopped', 'AbortError');
    const listener = await acquireNativeListener(listenerAPI, 'textProgress', event => {
      if (event?.requestId !== requestId || signal?.aborted) return;
      // AI Studio may rewrite previously rendered Markdown and thinking text.
      // Always send the FULL current text; the consumer replaces its preview.
      // Holding only the latest snapshot also avoids a slow UI backlog.
      if (event?.replace !== true) return;
      latestSnapshot = String(event?.text ?? '');
      latestReasoning = typeof event?.reasoning==='string'?event.reasoning:null;
      wakeUp();
    }, {signal: outerSignal, timeoutMs: listenerTimeoutMs, cleanupTimeoutMs});

    const abortStream = () => { controller.abort(); wakeUp(); };
    outerSignal?.addEventListener('abort', abortStream, {once:true});
    if (outerSignal?.aborted) abortStream();
    log('STREAM_ATTACHED', {requestId, message:'Live full-text snapshots enabled'});
    const job = run({...options,signal,mode:'chat',requestId,requestTimeoutMs}).then(
      value => {finalText=value.text;finalReasoning=value.reasoning; completed=true; wakeUp();},
      error => {failure=error; completed=true; wakeUp();},
    );
    try {
      while (true) {
        if (signal.aborted) throw new DOMException('Stopped','AbortError');
        if (latestSnapshot !== null) {
          const snapshot = latestSnapshot;
          const thought = latestReasoning;
          latestSnapshot = null;
          latestReasoning = null;
          if ((snapshot || thought) && (snapshot !== lastYielded || (thought !== null && thought !== lastReasoning))) {
            lastYielded = snapshot;
            if(thought !== null)lastReasoning=thought;
            yield {text:snapshot,replaceText:true,reasoning:thought===null?undefined:thought,replaceReasoning:thought!==null};
          }
          continue;
        }
        if (completed) break;
        await new Promise(resolve => {wake=resolve;});
      }
      if (signal.aborted) throw new DOMException('Stopped','AbortError');
      if (failure) throw failure;
      if (finalText !== lastYielded || finalReasoning !== (lastReasoning||'')) {
        lastYielded = finalText;
        yield {text:finalText,replaceText:true,reasoning:finalReasoning||undefined,replaceReasoning:true};
      }
      log('STREAM_FINAL', {requestId, responseChars:finalText.length}, 'script-success');
    } finally {
      outerSignal?.removeEventListener('abort', abortStream);
      if (!completed) abortStream();
      await job;
      const removal = releaseNativeListener(listener, {timeoutMs: cleanupTimeoutMs});
      if (!signal.aborted) await removal;
      log('STREAM_DETACHED', {requestId, message:'Live snapshot listener cleaned up'});
    }
  }

  return Object.freeze({generate,stream});
}
