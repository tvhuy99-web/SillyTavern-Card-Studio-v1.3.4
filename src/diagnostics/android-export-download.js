// Android APK file export compatibility shim.
// The existing app exports characters, Lorebooks, images and backups using
// <a download href="blob:..."> or data: URLs. Android WebView does not launch
// Chrome's download manager for those in-memory URLs. Capture the existing
// export click and use ACTION_CREATE_DOCUMENT via our Capacitor native plugin.
// Non-Android browsers, normal navigation, and import controls are untouched.
const MAX_CHUNK_SIZE = 256 * 1024;
const SUPPORTED_EXPORT_SCHEMES = /^(blob:|data:)/i;

export function getAndroidExportPlugin(host = globalThis) {
  const capacitor = host?.Capacitor;
  return capacitor?.getPlatform?.() === 'android'
    ? (capacitor.Plugins?.AndroidExportFile || null) : null;
}

export function exportMimeType(filename, responseType = '') {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  const known = {
    json: 'application/json',
    charx: 'application/zip',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    pdf: 'application/pdf',
  };
  return known[ext] || (responseType && responseType.split(';')[0]) || 'application/octet-stream';
}

export function normalizeExportName(name) {
  const candidate = String(name || 'CardStudio-export.json')
    .replace(/[\/\\\u0000-\u001f\u007f]/g, '_').trim();
  return candidate.slice(-180) || 'CardStudio-export.json';
}

function encodeBase64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(result);
}

// Serialize each save operation, including the Android Save As picker.
// Exports must never mix data when the user clicks multiple buttons rapidly.
let queue = Promise.resolve();

export function enqueueAndroidExport(task) {
  const next = queue.catch(() => {}).then(task);
  queue = next.catch(() => {});
  return next;
}

export async function streamExportUrlToAndroid({ url, filename, plugin, fetcher = fetch, onProgress = () => {} }) {
  const name = normalizeExportName(filename);
  if (!SUPPORTED_EXPORT_SCHEMES.test(url)) throw new Error('Chỉ hỗ trợ export từ blob:/data: nội bộ.');
  if (!plugin?.beginSave || !plugin?.appendChunk || !plugin?.finishSave) {
    throw new Error('APK này không có AndroidExportFile plugin để lưu tệp.');
  }

  // Must be initiated from the user click, before asynchronous blob reads.
  const responsePromise = fetcher(url);
  let started = false;
  try {
    const response = await responsePromise;
    if (!response.ok || !response.body?.getReader) {
      throw new Error('Android WebView không thể đọc luồng nội dung xuất tệp.');
    }
    const picked = await plugin.beginSave({
      fileName: name,
      mimeType: exportMimeType(name, response.headers?.get?.('content-type')),
    });
    started = true;
    const reader = response.body.getReader();
    let written = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        for (let i = 0; i < bytes.length; i += MAX_CHUNK_SIZE) {
          const chunk = bytes.subarray(i, i + MAX_CHUNK_SIZE);
          if (!chunk.length) continue;
          await plugin.appendChunk({ base64: encodeBase64(chunk) });
          written += chunk.length;
          if (written % (2 * 1024 * 1024) < MAX_CHUNK_SIZE) onProgress(written);
        }
      }
    } finally {
      reader.releaseLock();
    }
    const result = await plugin.finishSave();
    started = false;
    if (Number(result?.bytes) !== written) {
      throw new Error('Số byte tệp lưu không khớp với dữ liệu xuất.');
    }
    return { filename: name, bytes: written, destination: result.destination || picked.destination || '' };
  } catch (error) {
    if (started) {
      try { await plugin.abortSave?.(); } catch {}
    }
    throw error;
  }
}

export function installAndroidExportInterceptor(host = globalThis) {
  const doc = host.document;
  if (!doc?.addEventListener || !host.URL?.revokeObjectURL) return false;
  if (doc.__cardStudioAndroidExportInstalled) return true;
  const plugin = getAndroidExportPlugin(host);
  if (!plugin) return false;
  doc.__cardStudioAndroidExportInstalled = true;

  // Legacy export call sites often revokeObjectURL immediately after click().
  // Keep only the selected export blob URL alive until the stream completes.
  const held = new Set();
  const requestedRevoke = new Set();
  const originalRevoke = host.URL.revokeObjectURL.bind(host.URL);
  host.URL.revokeObjectURL = url => {
    if (held.has(url)) { requestedRevoke.add(url); return; }
    return originalRevoke(url);
  };

  doc.addEventListener('click', event => {
    const anchor = event.target?.closest?.('a[download]');
    if (!anchor) return;
    const href = anchor.href || anchor.getAttribute('href') || '';
    if (!SUPPORTED_EXPORT_SCHEMES.test(href)) return;
    event.preventDefault();
    event.stopPropagation();
    if (href.startsWith('blob:')) held.add(href);
    const filename = normalizeExportName(anchor.getAttribute('download') || anchor.download);
    const notify = message => {
      try { host.console?.warn?.('[ANDROID-EXPORT] ' + message); } catch {}
    };
    // Capture the response synchronously within the click handler so even
    // callers that immediately revoke their blob URL cannot invalidate it.
    const responsePromise = host.fetch(href);
    enqueueAndroidExport(async () => {
      try {
        const result = await streamExportUrlToAndroid({
          url: href,
          filename,
          plugin,
          fetcher: () => responsePromise,
        });
        notify('Đã lưu ' + result.filename + ' (' + result.bytes + ' bytes) thành công.');
      } catch (error) {
        const msg = error?.message || String(error);
        if (/Người dùng đã hủy lưu tệp/.test(msg)) notify('Đã hủy thao tác xuất: ' + filename);
        else host.console?.error?.('[ANDROID-EXPORT] Không thể lưu ' + filename + ': ' + msg);
      } finally {
        held.delete(href);
        if (requestedRevoke.delete(href)) originalRevoke(href);
      }
    });
  }, true);
  return true;
}

// Capacitor's global bridge is ready before the user can press export.
installAndroidExportInterceptor();
