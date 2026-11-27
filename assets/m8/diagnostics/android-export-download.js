import { getAndroidPlugin, ANDROID_PLUGINS } from '../../recovered/platform/android/native-bridge.js';

const MAX_CHUNK_SIZE = 256 * 1024;
const SUPPORTED_EXPORT_SCHEMES = /^(blob:|data:)/i;

export function getAndroidExportPlugin(host = globalThis) {
  return getAndroidPlugin(ANDROID_PLUGINS.exportFile, host);
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
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    result += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(result);
}

let queue = Promise.resolve();

export function enqueueAndroidExport(task) {
  const next = queue.catch(() => {}).then(task);
  queue = next.catch(() => {});
  return next;
}

export async function streamBlobToAndroid({ blob, filename, plugin, onProgress = () => {} }) {
  const name = normalizeExportName(filename || blob?.name);
  if (!blob || typeof blob.slice !== 'function') {
    throw new Error('Dữ liệu xuất tệp không hợp lệ.');
  }
  if (!plugin?.beginSave || !plugin?.appendChunk || !plugin?.finishSave) {
    throw new Error('APK này không có AndroidExportFile plugin để lưu tệp.');
  }

  const totalBytes = Number(blob.size) || 0;
  let started = false;
  let saveArgs = {};
  try {
    const picked = await plugin.beginSave({
      fileName: name,
      mimeType: exportMimeType(name, blob.type),
    });
    started = true;
    if (picked?.exportId) saveArgs = { exportId: picked.exportId };
    let written = 0;
    onProgress(0, totalBytes);
    for (let offset = 0; offset < totalBytes; offset += MAX_CHUNK_SIZE) {
      const slice = blob.slice(offset, Math.min(totalBytes, offset + MAX_CHUNK_SIZE));
      const buffer = await slice.arrayBuffer();
      const chunk = new Uint8Array(buffer);
      if (!chunk.length) continue;
      await plugin.appendChunk({ ...saveArgs, base64: encodeBase64(chunk) });
      written += chunk.length;
      if (written === totalBytes || written % (1024 * 1024) < MAX_CHUNK_SIZE) {
        onProgress(written, totalBytes);
      }
    }
    if (written !== totalBytes) {
      throw new Error('Số byte đọc từ bộ nhớ không khớp kích thước tệp sao lưu.');
    }
    const result = await plugin.finishSave({ ...saveArgs, expectedBytes: totalBytes });
    started = false;
    if (Number(result?.bytes) !== totalBytes) {
      throw new Error('Số byte tệp lưu không khớp với dữ liệu xuất.');
    }
    return { filename: name, bytes: totalBytes, destination: result.destination || picked.destination || '' };
  } catch (error) {
    if (started) {
      try { await plugin.abortSave?.(saveArgs); } catch {}
    }
    throw error;
  }
}

export async function streamExportUrlToAndroid({ url, filename, plugin, fetcher = fetch, onProgress = () => {} }) {
  const name = normalizeExportName(filename);
  if (!SUPPORTED_EXPORT_SCHEMES.test(url)) throw new Error('Chỉ hỗ trợ export từ blob:/data: nội bộ.');
  if (!plugin?.beginSave || !plugin?.appendChunk || !plugin?.finishSave) {
    throw new Error('APK này không có AndroidExportFile plugin để lưu tệp.');
  }

  const responsePromise = fetcher(url);
  let started = false;
  let response;
  let saveArgs = {};
  try {
    response = await responsePromise;
    if (!response.ok || !response.body?.getReader) {
      throw new Error('Android WebView không thể đọc luồng nội dung xuất tệp.');
    }
    const picked = await plugin.beginSave({
      fileName: name,
      mimeType: exportMimeType(name, response.headers?.get?.('content-type')),
    });
    started = true;
    if (picked?.exportId) saveArgs = {exportId: picked.exportId};
    const reader = response.body.getReader();
    let written = 0;
    let consumed = false;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) { consumed = true; break; }
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        for (let offset = 0; offset < bytes.length; offset += MAX_CHUNK_SIZE) {
          const chunk = bytes.subarray(offset, offset + MAX_CHUNK_SIZE);
          if (!chunk.length) continue;
          await plugin.appendChunk({ ...saveArgs, base64: encodeBase64(chunk) });
          written += chunk.length;
          if (written % (2 * 1024 * 1024) < MAX_CHUNK_SIZE) onProgress(written);
        }
      }
    } finally {
      if (!consumed) { try { await reader.cancel(); } catch {} }
      reader.releaseLock();
    }
    const result = await plugin.finishSave({...saveArgs, expectedBytes: written});
    started = false;
    if (Number(result?.bytes) !== written) {
      throw new Error('Số byte tệp lưu không khớp với dữ liệu xuất.');
    }
    return { filename: name, bytes: written, destination: result.destination || picked.destination || '' };
  } catch (error) {
    if (started) {
      try { await plugin.abortSave?.(saveArgs); } catch {}
    }
    if (response?.body && !response.body.locked) { try { await response.body.cancel(); } catch {} }
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
  host.__cardStudioExportAndroidBlob = ({ blob, filename, onProgress }) => enqueueAndroidExport(
    () => streamBlobToAndroid({ blob, filename, plugin, onProgress }),
  );

  if (typeof plugin.getInterruptedSave === 'function') {
    Promise.resolve().then(() => plugin.getInterruptedSave()).then(receipt => {
      if (receipt?.interrupted) host.console?.warn?.('Android: lần xuất tệp trước chưa được xác nhận. Kiểm tra tệp đã lưu trước khi xuất lại.');
    }).catch(() => {});
  }

  const held = new Map();
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
    if (href.startsWith('blob:')) held.set(href, (held.get(href) || 0) + 1);
    const filename = normalizeExportName(anchor.getAttribute('download') || anchor.download);
    const notify = message => {
      try { host.console?.warn?.('[ANDROID-EXPORT] ' + message); } catch {}
    };

    let responsePromise;
    try { responsePromise = Promise.resolve(host.fetch(href)); }
    catch (error) { responsePromise = Promise.reject(error); }

    responsePromise.catch(() => {});
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
        const count = held.get(href) || 0;
        if (count > 1) held.set(href, count - 1);
        else {
          held.delete(href);
          if (requestedRevoke.delete(href)) originalRevoke(href);
        }
      }
    });
  }, true);
  return true;
}

installAndroidExportInterceptor();
