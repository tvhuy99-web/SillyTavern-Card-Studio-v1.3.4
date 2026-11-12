// Experimental Android AI Studio WebView text adapter.
// Emits true UI-observed partial text updates (not fabricated SSE).
// Does not access credentials, cookies, tokens or undocumented endpoints.
export const AI_STUDIO_SOURCE = 'aistudio';

function log(stage, data = {}, level = 'state') {
  globalThis.__STS_AI_STUDIO_LOGS__?.record?.(stage, data, level);
}

function bridge() {
  const cap = globalThis.Capacitor;
  if (typeof cap?.nativePromise !== 'function' ||
      (typeof cap.isNativePlatform === 'function' && !cap.isNativePlatform())) {
    throw new Error('Google / AI Studio chỉ hoạt động trong APK Android.');
  }
  return cap;
}

function makeId() {
  return 'text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function resolveThinkingLevel(explicit){
  if(typeof explicit==="string"&&explicit.trim())return explicit.trim();
  try{const s=JSON.parse(localStorage.getItem("sillyTavernStudio_globalConnection")||"{}");return String(s.aistudio_thinking||"default");}
  catch{return "default";}
}
async function run({ prompt, model, signal, requestId, thinkingLevel }) {
  if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
  const cap = bridge();
  log('TEXT_REQUEST', {requestId, promptChars: String(prompt || '').length,
    modelNote: 'Chọn model trong trang AI Studio'});
  const abort = () => {
    log('ABORT', {requestId, message:'User stopped generation'}, 'warn');
    cap.nativePromise('AIStudioText', 'cancel', {}).catch(() => {});
  };
  signal?.addEventListener('abort', abort, {once:true});
  try {
    const result = await cap.nativePromise('AIStudioText', 'generate', {
      prompt: String(prompt ?? ''), model: String(model ?? ''), thinkingLevel: resolveThinkingLevel(thinkingLevel), requestId,
    });
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    const text = String(result?.text ?? '');
    if (!text.trim()) throw new Error('AI Studio phản hồi trống.');
    log('TEXT_RESULT', {requestId, responseChars:text.length}, 'script-success');
    return text;
  } catch (e) {
    log('TEXT_ERROR', {requestId, message:String(e?.message || e)}, 'error');
    throw e;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

export function openAiStudioSession() {
  return bridge().nativePromise('AIStudioText', 'openSession', {});
}

export function createAiStudioTextProvider() {
  async function generate({prompt, model, signal, thinkingLevel}) {
    const text = await run({prompt, model, signal, thinkingLevel, requestId:makeId()});
    return {response:{text}};
  }

  async function* stream(options) {
    const cap = bridge();
    const requestId = makeId();
    const listenerAPI = cap.Plugins?.AIStudioText;
    if (!listenerAPI?.addListener) {
      log('STREAM_UNAVAILABLE', {requestId, message:'Native listener unavailable: returning complete answer'}, 'warn');
      yield {text:await run({...options,requestId})};
      return;
    }

    let latestSnapshot = null;
    let wake = null;
    let completed = false;
    let failure = null;
    let finalText = '';
    let lastYielded = null;
    const signal = options.signal;
    const wakeUp = () => {const callback = wake; wake = null; callback?.();};
    const listener = await listenerAPI.addListener('textProgress', event => {
      if (event?.requestId !== requestId || signal?.aborted) return;
      // AI Studio may rewrite previously rendered Markdown and thinking text.
      // Always send the FULL current text; the consumer replaces its preview.
      // Holding only the latest snapshot also avoids a slow UI backlog.
      if (event?.replace !== true) return;
      latestSnapshot = String(event?.text ?? '');
      wakeUp();
    });

    log('STREAM_ATTACHED', {requestId, message:'Live full-text snapshots enabled'});
    const job = run({...options,requestId}).then(
      value => {finalText=value; completed=true; wakeUp();},
      error => {failure=error; completed=true; wakeUp();},
    );
    try {
      while (true) {
        if (latestSnapshot !== null) {
          const snapshot = latestSnapshot;
          latestSnapshot = null;
          if (snapshot && snapshot !== lastYielded) {
            lastYielded = snapshot;
            yield {text:snapshot, replaceText:true};
          }
          continue;
        }
        if (completed) break;
        if (signal?.aborted) throw new DOMException('Stopped','AbortError');
        await new Promise(resolve => {wake=resolve;});
      }
      if (failure) throw failure;
      if (finalText !== lastYielded) {
        lastYielded = finalText;
        yield {text:finalText, replaceText:true};
      }
      log('STREAM_FINAL', {requestId, responseChars:finalText.length}, 'script-success');
    } finally {
      if (signal?.aborted) cap.nativePromise('AIStudioText','cancel',{}).catch(()=>{});
      await job;
      try {await listener.remove();} catch {}
      log('STREAM_DETACHED', {requestId, message:'Live snapshot listener cleaned up'});
    }
  }

  return Object.freeze({generate,stream});
}
