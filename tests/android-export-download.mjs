import assert from 'node:assert/strict';
import {
  getAndroidExportPlugin,
  exportMimeType,
  normalizeExportName,
  streamExportUrlToAndroid,
  enqueueAndroidExport,
  installAndroidExportInterceptor,
} from '../assets/android-export-download.js';

// Browser behavior is untouched; the Android APK gets its native provider.
assert.equal(getAndroidExportPlugin({}), null);
assert.equal(getAndroidExportPlugin({
  Capacitor: { getPlatform: () => 'web', Plugins: { AndroidExportFile: {} } },
}), null);
const plugin = { beginSave: () => {} };
assert.equal(getAndroidExportPlugin({
  Capacitor: { getPlatform: () => 'android', Plugins: { AndroidExportFile: plugin } },
}), plugin);
assert.equal(exportMimeType('character.png'), 'image/png');
assert.equal(exportMimeType('worldbook.json'), 'application/json');
assert.equal(exportMimeType('bundle.charx'), 'application/zip');
assert.equal(exportMimeType('backup.zip'), 'application/zip');
assert.equal(exportMimeType('example.xyz', 'application/x-example'), 'application/x-example');
assert.equal(normalizeExportName('../danger/name.json'), '.._danger_name.json');

// Large binary archives must cross the JS/native bridge in bounded chunks.
// Ensure byte-for-byte data, MIME type, file name and exact length.
{
  const data = Uint8Array.from({ length: 900_000 }, (_, i) => i % 251);
  const written = [];
  let bytes = 0;
  let saved = false;
  const mock = {
    beginSave: async options => {
      assert.deepEqual(options, { fileName: 'test.zip', mimeType: 'application/zip' });
      return { destination: 'content://test/document' };
    },
    appendChunk: async ({ base64 }) => {
      const chunk = Buffer.from(base64, 'base64');
      assert.ok(chunk.length > 0 && chunk.length <= 256 * 1024);
      bytes += chunk.length;
      written.push(chunk);
    },
    finishSave: async () => { saved = true; return { bytes }; },
  };
  const result = await streamExportUrlToAndroid({
    url: 'blob:abc', filename: 'test.zip',
    plugin: mock, fetcher: async () => new Response(new Blob([data])),
  });
  assert.equal(result.bytes, data.length);
  assert.equal(result.filename, 'test.zip');
  assert.equal(saved, true);
  assert.deepEqual(Buffer.concat(written), Buffer.from(data));
}
await assert.rejects(
  streamExportUrlToAndroid({ url: 'https://example.com/anything', filename: 'x', plugin: {} }),
  /Chỉ hỗ trợ export/,
);

// Failed writes must abort and never emit a success notification.
{
  let aborted = false;
  await assert.rejects(streamExportUrlToAndroid({
    url: 'data:text/plain,abc',
    filename: 'note.txt',
    fetcher: async () => new Response('abc'),
    plugin: {
      beginSave: async () => ({ destination: 'content://test/x' }),
      appendChunk: async () => { throw new Error('disk full'); },
      finishSave: async () => { throw new Error('must not be called'); },
      abortSave: async () => { aborted = true; },
    },
  }), /disk full/);
  assert.equal(aborted, true);
}

// The normal WebView script creates and revokes a blob URL immediately after
// anchor.click(). The interceptor must hold it alive and write through SAF.
{
  const handlers = new Map();
  const revoked = [];
  const written = [];
  const log = [];
  let total = 0;
  const host = {
    document: {
      addEventListener: (name, handler, capture) => {
        assert.equal(name, 'click'); assert.equal(capture, true);
        handlers.set(name, handler);
      },
    },
    URL: { revokeObjectURL: url => revoked.push(url) },
    fetch: async url => {
      assert.equal(url, 'blob:export-123');
      return new Response(new Blob(['{"world":"book"}'], { type: 'application/json' }));
    },
    Capacitor: {
      getPlatform: () => 'android',
      Plugins: {
        AndroidExportFile: {
          beginSave: async ({ fileName }) => {
            assert.equal(fileName, 'lorebook.json');
            return { destination: 'content://test/lorebook' };
          },
          appendChunk: async ({ base64 }) => {
            const data = Buffer.from(base64, 'base64');
            written.push(data); total += data.length;
          },
          finishSave: async () => ({ bytes: total }),
        },
      },
    },
    console: { warn: message => log.push(message), error: message => { throw new Error(message); } },
  };
  assert.equal(installAndroidExportInterceptor(host), true);
  assert.equal(installAndroidExportInterceptor(host), true, 'idempotent install');
  let cancelled = false;
  const event = {
    target: { closest: () => ({ href: 'blob:export-123', getAttribute: () => 'lorebook.json' }) },
    preventDefault: () => { cancelled = true; },
    stopPropagation: () => {},
  };
  handlers.get('click')(event);
  assert.equal(cancelled, true);
  host.URL.revokeObjectURL('blob:export-123');
  assert.deepEqual(revoked, [], 'blob must be held during asynchronous export');
  await enqueueAndroidExport(async () => {});
  assert.equal(Buffer.concat(written).toString(), '{"world":"book"}');
  assert.deepEqual(revoked, ['blob:export-123']);
  assert.ok(log.some(line => line.includes('Đã lưu lorebook.json')));
}

console.log('Android export download: SAF interception regression OK');
