import { abortError, awaitAbortable, iterateAbortable } from '../../../core/async/cancellation.js';

/** A generation ID is local to the originating frame, not a global key. */
export function createRuntimeGenerationTasks({ register, unregister, makeController = () => new AbortController() }) {
  const frames = new Map();
  function start(source, id) {
    let tasks = frames.get(source);
    if (!tasks) { tasks = new Map(); frames.set(source, tasks); }
    if (tasks.has(id)) throw new Error('Duplicate card runtime generation ID.');
    const controller = makeController();
    tasks.set(id, controller);
    register(controller);
    return controller;
  }
  function finish(source, id, controller) {
    const tasks = frames.get(source);
    if (tasks?.get(id) !== controller) return;
    tasks.delete(id);
    if (!tasks.size) frames.delete(source);
    unregister(controller);
  }
  function stop(source, id) {
    const controller = frames.get(source)?.get(id);
    if (!controller) return false;
    controller.abort();
    return true;
  }
  function stopAll(source) {
    for (const controller of frames.get(source)?.values() ?? []) controller.abort();
  }
  function dispose() {
    for (const [source, tasks] of frames) for (const [id, controller] of tasks) {
      controller.abort(); finish(source, id, controller);
    }
  }
  return Object.freeze({ start, finish, stop, stopAll, dispose });
}

/** Generation lifecycle for card requests. The host injects its prompt/provider adapters. */
export function createRuntimeGenerationService({ tasks, buildPrompt, resolvePreset, generateOnce, stream, emit, readMessageCount,
  makeId = () => `card-gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }) {
  return async function generate(source, raw, options, lease) {
    lease.assertCurrent();
    const id = String(options.generation_id || makeId());
    const controller = tasks.start(source, id);
    const signal = controller.signal;
    const cancelLease = () => controller.abort();
    lease.signal?.addEventListener("abort", cancelLease, {once:true});
    if (lease.signal?.aborted) cancelLease();
    function assertCurrent() {
      lease.assertCurrent();
      if (signal.aborted) throw abortError();
    }
    try {
      emit(source, 'js_generation_started', [id]);
      emit(source, 'generation_started', ['extension', { signal: null }, false]);
      const prompt = await awaitAbortable(() => buildPrompt(raw, options, assertCurrent, source), signal);
      assertCurrent();
      const preset = resolvePreset(options);
      const custom = options.custom_api || {};
      const provider = custom.apiurl ? 'proxy' : ['gemini', 'openrouter', 'proxy'].includes(custom.source) ? custom.source : undefined;
      const proxyConfig = custom.apiurl ? { url: String(custom.apiurl), password: custom.key ? String(custom.key) : undefined, legacyMode: false } : undefined;
      const request = { prompt, preset, model: custom.model ? String(custom.model) : undefined, source: provider, proxyConfig, signal };
      let text = '';
      if (options.should_stream ?? options.stream ?? options.streaming) {
        for await (const chunk of iterateAbortable(stream(request), signal)) {
          assertCurrent();
          const delta = String(chunk.text || '');
          text += delta;
          emit(source, 'js_stream_token_received_incrementally', [delta, id]);
          emit(source, 'js_stream_token_received_fully', [text, id]);
          emit(source, 'stream_token_received', [text]);
        }
      } else {
        const result = await awaitAbortable(() => generateOnce(request), signal);
        text = String(result.response.text || '');
      }
      assertCurrent();
      emit(source, 'js_generation_ended', [text, id]);
      emit(source, 'generation_ended', [readMessageCount() - 1]);
      return text;
    } finally {
      lease.signal?.removeEventListener("abort", cancelLease);
      tasks.finish(source, id, controller);
    }
  };
}
