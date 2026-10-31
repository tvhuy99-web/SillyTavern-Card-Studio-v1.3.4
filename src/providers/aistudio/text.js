// Android-only AI Studio text adapter.
//
// The native plugin owns a visible AI Studio WebView/session. We do not extract
// account cookies, OAuth tokens, or private Google endpoints.
// The Google AI Studio page is not a documented automation API; failures must
// be explicit rather than silently falling back to a different provider.
import { recordAiStudioDiagnostic } from '../../diagnostics/aistudio-log.js';

export const AI_STUDIO_SOURCE = 'aistudio';

function bridge() {
  const capacitor = globalThis.Capacitor;
  if (typeof capacitor?.nativePromise !== 'function' ||
      (typeof capacitor.isNativePlatform === 'function' && !capacitor.isNativePlatform())) {
    throw new Error('AI Studio tài khoản Google chỉ hỗ trợ APK Android. Hãy mở ứng dụng Android.');
  }
  return capacitor;
}

export function openAiStudioSession() {
  return bridge().nativePromise('AIStudioText', 'openSession', {});
}

export function createAiStudioTextProvider() {
  async function generate({ model, prompt, signal }) {
    if (signal?.aborted) throw new DOMException('Generation aborted', 'AbortError');
    const cap = bridge();
    recordAiStudioDiagnostic('GENERATE_REQUEST', { model: String(model || ''), promptChars: String(prompt || '').length });
    const request = cap.nativePromise('AIStudioText', 'generate', {
      model: String(model || 'gemini-2.5-flash'),
      prompt: String(prompt || ''),
    });
    const stop = () => {
      cap.nativePromise('AIStudioText', 'cancel', {}).catch(() => {});
    };
    signal?.addEventListener('abort', stop, { once: true });
    try {
      const result = await request;
      recordAiStudioDiagnostic('GENERATE_REPLY', { responseChars: String(result?.text || '').length });
      if (signal?.aborted) throw new DOMException('Generation aborted', 'AbortError');
      const text = String(result?.text || '');
      if (!text.trim()) throw new Error('AI Studio không trả về văn bản.');
      return { response: { text } };
    } finally {
      signal?.removeEventListener('abort', stop);
    }
  }

  async function* stream(options) {
    // AI Studio Web page has no stable response-chunk API. Deliver a single
    // complete text block rather than fabricating streaming increments.
    const response = await generate(options);
    yield { text: response.response.text };
  }
  return Object.freeze({ generate, stream });
}
