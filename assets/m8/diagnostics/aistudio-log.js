// Persistent Android AI Studio diagnostics. No prompts, outputs, cookies or tokens.
const KEY = 'sts_aistudio_diagnostics_v1';
const MAX = 250;
const EVENT = 'sillytavern:system-log';
const SECRET = /(?:Bearer\s+[A-Za-z0-9._-]+|AIza[A-Za-z0-9_-]{15,}|(?:api[-_]?key|access[-_]?token|cookie|authorization)\s*[:=]\s*[^,\s]+)/gi;
let attached = false, handle = null, visibilityHandle = null, attaching = false;

function safe(value) {
  return String(value ?? '').replace(SECRET, '[REDACTED]')
    .replace(/https?:\/\/[^\s,]+/g, x => {
      try { const u = new URL(x); return u.origin + u.pathname; } catch { return '[URL]'; }
    }).slice(0, 1150);
}
function stored() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a.slice(-MAX) : [];
  } catch { return []; }
}
function broadcast(item) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: {
    level: item.level, source: 'aistudio',
    message: '[AI Studio][' + item.stage + '][#' + (item.requestId || '-') + '] ' + item.message + ' | ' + Object.entries(item.details).map(([k,v]) => k + '=' + String(v)).join(' '),
    payload: item.details,
  }}));
}
export function recordAiStudioDiagnostic(stage, data = {}, level = 'state') {
  if (typeof window === 'undefined') return;
  const { requestId = '', message = '', ...details } = data && typeof data === 'object' ? data : {};
  const item = {
    ts: new Date().toISOString(), stage: safe(stage), level: safe(level),
    requestId: safe(requestId), message: safe(message),
    details: Object.fromEntries(Object.entries(details).slice(0, 22).map(([k,v]) => [
      safe(k).slice(0, 48),
      (typeof v === 'string' ? safe(v) : typeof v === 'number' || typeof v === 'boolean' ? v : safe(JSON.stringify(v))),
    ])),
  };
  try { localStorage.setItem(KEY, JSON.stringify([...stored(), item].slice(-MAX))); } catch {}
  broadcast(item);
}
export function exportAiStudioDiagnostics() {
  return JSON.stringify({format:'CardStudio AI Studio diagnostics v1',events:stored()}, null, 2);
}
export function installAiStudioDiagnostics() {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  window.__STS_AI_STUDIO_LOGS__ = Object.freeze({
    export: exportAiStudioDiagnostics,
    record: recordAiStudioDiagnostic,
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  });
  let bridgeRetryCount = 0;
  async function start() {
    const plugin = window.Capacitor?.Plugins?.AIStudioText;
    if (!plugin?.addListener) {
      if (bridgeRetryCount++ < 20) setTimeout(start, 1000);
      else recordAiStudioDiagnostic('BRIDGE_UNAVAILABLE', {
        message:'Native AIStudioText event bridge unavailable after 20 attempts. Verify Android APK plugin registration.'
      }, 'error');
      return;
    }
    if (handle || attaching) return;
    attaching = true;
    try {
      handle = await plugin.addListener('diagnostic', e => {
        recordAiStudioDiagnostic(e?.stage || 'NATIVE', {
          requestId: e?.requestId, message: e?.message,
          ...(e?.details && typeof e.details === 'object' ? e.details : {}),
        }, e?.level || 'state');
      });
      if (!visibilityHandle) {
        visibilityHandle = await plugin.addListener('pageVisibilityChanged', e => {
          const visible = e?.visible === true;
          try { localStorage.setItem('sts_aistudio_show_page', visible ? 'true' : 'false'); } catch {}
          const input = document.querySelector('input[aria-label="Hiển thị trang web AI Studio"]');
          if (input) input.checked = visible;
        });
      }
      recordAiStudioDiagnostic('BRIDGE_READY', {message: 'Native log connected to System Console.'});
    } catch(e) {
      recordAiStudioDiagnostic('BRIDGE_ERROR', {message:String(e?.message || e)}, 'warn');
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
