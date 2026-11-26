export function abortError() { return new DOMException('Generation was stopped.', 'AbortError'); }

// Also settle promptly when a provider fails to honor AbortSignal. Late
// resolution/rejection is consumed, never committed to the application store.
export function awaitAbortable(work, signal) {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw abortError();
      return work();
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

// Consumers can stop waiting even if an async iterator ignores cancellation.
export async function* iterateAbortable(stream, signal) {
  const iterator = stream[Symbol.asyncIterator]();
  let completed = false;
  try {
    while (true) {
      const result = await awaitAbortable(() => iterator.next(), signal);
      if (result.done) { completed = true; return; }
      if (signal.aborted) throw abortError();
      yield result.value;
    }
  } finally {
    if (!completed) {
      try { Promise.resolve(iterator.return?.()).catch(() => {}); } catch {}
    }
  }
}
