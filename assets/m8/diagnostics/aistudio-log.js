import { ANDROID_PLUGINS, acquireNativeListener, getAndroidPlugin } from '../../recovered/platform/android/native-bridge.js';
// Persistent Android AI Studio diagnostics. No prompts, outputs, cookies or tokens.
const KEY = 'sts_aistudio_diagnostics_v1';
const MAX = 250;
const EVENT = 'sillytavern:system-log';
const SECRET = /(?:Bearer\s+[A-Za-z0-9._-]+|AIza[A-Za-z0-9_-]{15,}|(?:api[-_]?key|access[-_]?token|cookie|authorization)\s*[:=]\s*[^,\s]+)/gi;
let attached = false, handle = null, visibilityHandle = null, attaching = false;

function safe(value) {
  return String(value ?? '').replace(SECRET, '[REDACTED]')
    .replace(/https?:\/\/[^\s,]+/g, url => {
      try { const parsedUrl = new URL(url); return parsedUrl.origin + parsedUrl.pathname; } catch { return '[URL]'; }
    }).slice(0, 1150);
}
function stored() {
  try {
    const events = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(events) ? events.slice(-MAX) : [];
  } catch { return []; }
}
function broadcast(item) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: {
    level: item.level, source: 'aistudio',
    message: '[AI Studio][' + item.stage + '][#' + (item.requestId || '-') + '] ' + item.message + ' | ' + Object.entries(item.details).map(([key,value]) => key + '=' + String(value)).join(' '),
    payload: item.details,
  }}));
}
export function recordAiStudioDiagnostic(stage, data = {}, level = 'state') {
  if (typeof window === 'undefined') return;
  const { requestId = '', message = '', ...details } = data && typeof data === 'object' ? data : {};
  const item = {
    ts: new Date().toISOString(), stage: safe(stage), level: safe(level),
    requestId: safe(requestId), message: safe(message),
    details: Object.fromEntries(Object.entries(details).slice(0, 22).map(([key,value]) => [
      safe(key).slice(0, 48),
      (typeof value === 'string' ? safe(value) : typeof value === 'number' || typeof value === 'boolean' ? value : safe(JSON.stringify(value))),
    ])),
  };
  try { localStorage.setItem(KEY, JSON.stringify([...stored(), item].slice(-MAX))); } catch {}
  broadcast(item);
}
export function exportAiStudioDiagnostics() {
  return JSON.stringify({format:'CardStudio AI Studio diagnostics v1',events:stored()}, null, 2);
}
export function installAiStudioDiagnostics({settingsStorage = globalThis.localStorage} = {}) {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  window.__STS_AI_STUDIO_LOGS__ = Object.freeze({
    export: exportAiStudioDiagnostics,
    record: recordAiStudioDiagnostic,
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  });
  let bridgeRetryCount = 0;
  async function start() {
    const cap = window.Capacitor;
    if (typeof cap?.getPlatform === 'function' && cap.getPlatform() !== 'android') return;
    const plugin = getAndroidPlugin(ANDROID_PLUGINS.aiStudio, window);
    if (!plugin?.addListener) {
      if (bridgeRetryCount++ < 20) setTimeout(start, 1000);
      else recordAiStudioDiagnostic('BRIDGE_UNAVAILABLE', {
        message:'Native AIStudioText event bridge unavailable after 20 attempts. Verify Android APK plugin registration.'
      }, 'error');
      return;
    }
    if ((handle && visibilityHandle) || attaching) return;
    attaching = true;
    try {
      if (!handle) handle = await acquireNativeListener(plugin, 'diagnostic', event => {
        recordAiStudioDiagnostic(event?.stage || 'NATIVE', {
          requestId: event?.requestId, message: event?.message,
          ...(event?.details && typeof event.details === 'object' ? event.details : {}),
        }, event?.level || 'state');
      });
      if (!visibilityHandle) {
        visibilityHandle = await acquireNativeListener(plugin, 'pageVisibilityChanged', event => {
          const visible = event?.visible === true;
          try { settingsStorage.setItem('sts_aistudio_show_page', visible ? 'true' : 'false'); } catch {}
          window.dispatchEvent(new CustomEvent('sts:aistudio-visibility', {detail:{visible}}));
        });
      }
      recordAiStudioDiagnostic('BRIDGE_READY', {message: 'Native log connected to System Console.'});
    } catch(error) {
      recordAiStudioDiagnostic('BRIDGE_ERROR', {message:String(error?.message || error)}, 'warn');
      if (bridgeRetryCount++ < 20) setTimeout(start, 1000);
    } finally {
      attaching = false;
    }
  }
  start();
  window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start();
  });
  setTimeout(() => { for (const item of stored().slice(-45)) broadcast(item); }, 1800);
}
