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

async function run({ prompt, model, signal, requestId }) {
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
      prompt: String(prompt ?? ''), model: String(model ?? ''), requestId,
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
  async function generate({prompt, model, signal}) {
    const text = await run({prompt, model, signal, requestId:makeId()});
    return {response:{text}};
  }

  async function* stream(options) {
    const cap = bridge();
    const requestId = makeId();
    const listenerAPI = cap.Plugins?.AIStudioText;
    if (!listenerAPI?.addListener) {
      log('STREAM_UNAVAILABLE', {requestId,message:'Native listener not available; using complete response'}, 'warn');
      yield {text:await run({...options,requestId})};
      return;
    }
    const queue = [];
    let wake = null, completed = false, failure = null, final = '', seen = '';
    const signal = options.signal;
    const wakeUp = () => { if (wake) { const f=wake; wake=null; f(); } };
    const listener = await listenerAPI.addListener('textProgress', event => {
      if (event?.requestId !== requestId) return;
      if (signal?.aborted) return;
      const chunk = String(event?.text ?? '');
      if (!chunk) return;
      queue.push(chunk);
      wakeUp();
    });
    log('STREAM_ATTACHED',{requestId,message:'Listening for incremental AI Studio text'});
    const job = run({...options,requestId}).then(
      value => {final=value; completed=true; wakeUp();},
      error => {failure=error; completed=true; wakeUp();}
    );
    try {
      for (;;) {
        while (queue.length) {
          const chunk = queue.shift();
          seen += chunk;
          yield {text:chunk};
        }
        if (completed) break;
        if (signal?.aborted) throw new DOMException('Stopped','AbortError');
        await new Promise(resolve => {wake=resolve;});
      }
      if (failure) throw failure;
      if (final.startsWith(seen) && final.length > seen.length) {
        yield {text:final.slice(seen.length)};
      } else if (final !== seen && seen) {
        log('STREAM_TEXT_CHANGED',{
          requestId,message:'AI Studio modified earlier streamed text; partial output may differ',
          streamedChars:seen.length,finalChars:final.length,
        },'warn');
      } else if (!seen) {
        yield {text:final};
      }
    } finally {
      wakeUp();
      if (signal?.aborted) cap.nativePromise('AIStudioText','cancel',{}).catch(()=>{});
      await job;
      try {await listener.remove();} catch {}
      log('STREAM_DETACHED',{requestId,message:'Streaming listener cleaned up'});
    }
  }
  return Object.freeze({generate,stream});
}
