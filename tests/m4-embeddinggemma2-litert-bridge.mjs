import assert from 'node:assert/strict';
import {
  EMBEDDINGGEMMA2_MODEL_ID,
  EMBEDDINGGEMMA2_FILE_NAME,
  getEmbeddingGemma2Plugin,
  getEmbeddingGemma2Status,
  downloadEmbeddingGemma2,
  removeEmbeddingGemma2,
  validateEmbeddingGemma2Vectors,
  createEmbeddingGemma2Runtime,
} from '../src/features/world-info/embeddinggemma2-litert-bridge.js';

assert.equal(EMBEDDINGGEMMA2_MODEL_ID, 'litert-community/embeddinggemma-2-text-270m-litert-lm');
assert.equal(EMBEDDINGGEMMA2_FILE_NAME, 'embeddinggemma-2-text-270m.litertlm');
assert.equal(getEmbeddingGemma2Plugin({}), null);
assert.equal(getEmbeddingGemma2Plugin({ Capacitor: {
  getPlatform: () => 'web',
  Plugins: { EmbeddingGemma2LiteRT: {} },
} }), null);
const mock = { status: async () => ({ modelReady: true, sessionReady: false }) };
assert.equal(getEmbeddingGemma2Plugin({ Capacitor: {
  getPlatform: () => 'android',
  Plugins: { EmbeddingGemma2LiteRT: mock },
} }), mock);
assert.deepEqual(await getEmbeddingGemma2Status(), { status: 'unsupported', progress: 0 });
await assert.rejects(downloadEmbeddingGemma2(), /yêu cầu APK Android/);
await assert.rejects(createEmbeddingGemma2Runtime({ id: 'embeddinggemma2' }), /yêu cầu APK Android/);
assert.throws(() => validateEmbeddingGemma2Vectors([[1,2]], 1), /768/);
assert.throws(() => validateEmbeddingGemma2Vectors([Array(768).fill(NaN)], 1), /NaN/);
assert.throws(() => validateEmbeddingGemma2Vectors([Array(768).fill(0)], 1), /vector rỗng/);
const vector = Array(768).fill(0);
vector[0] = 3;
vector[1] = 4;
const [normalized] = validateEmbeddingGemma2Vectors([vector], 1);
assert.ok(Math.abs(normalized[0] - 0.6) < 1e-12);
assert.ok(Math.abs(normalized[1] - 0.8) < 1e-12);

// Download requires user action; no automatic download in model load/query.
// Status and progress are forwarded through the Capacitor event listener.
{
  const previous = globalThis.Capacitor;
  const events = [];
  let downloaded = false;
  let listenerRemoved = false;
  let embedded = 0;
  let unloaded = 0;
  const plugin = {
    status: async () => ({ modelReady: downloaded, sessionReady: false }),
    addListener: async (name, cb) => {
      assert.equal(name, 'downloadProgress');
      events.push('listener');
      plugin.progress = cb;
      return { remove: async () => { listenerRemoved = true; } };
    },
    download: async () => {
      events.push('download');
      plugin.progress({ progress: 50, loaded: 80_000_000, total: 160_000_000 });
      downloaded = true;
    },
    load: async () => ({ backend: 'LiteRT-LM CPU', loadMs: 12 }),
    embed: async ({ texts }) => {
      embedded++;
      assert.equal(texts.length, 2);
      assert.ok(texts.every(t => t.startsWith('title:')));
      return { vectors: [vector, vector], onnxMs: 8, backend: 'LiteRT-LM CPU' };
    },
    unload: async () => { unloaded++; },
    deleteModel: async () => { downloaded = false; },
  };
  globalThis.Capacitor = {
    getPlatform: () => 'android',
    Plugins: { EmbeddingGemma2LiteRT: plugin },
  };
  try {
    assert.equal((await getEmbeddingGemma2Status()).status, 'missing');
    const progress = [];
    await downloadEmbeddingGemma2(evt => progress.push(evt));
    assert.equal((await getEmbeddingGemma2Status()).status, 'cached');
    assert.deepEqual(events, ['listener', 'download']);
    assert.equal(progress[0].progress, 50);
    assert.equal(progress.at(-1).status, 'ready');
    assert.ok(listenerRemoved);
    const stages = [];
    const runtime = await createEmbeddingGemma2Runtime(
      { id: 'embeddinggemma2' }, msg => stages.push(msg));
    assert.ok(stages.some(s => s.includes('LiteRT-LM')));
    const metrics = [];
    const result = await runtime.embed([
      'title: A | text: one', 'title: B | text: two',
    ], item => metrics.push(item));
    assert.equal(result.length, 2);
    assert.equal(result[1].length, 768);
    assert.equal(metrics[0].onnxMs, 8);
    assert.equal(embedded, 1);
    await runtime.dispose();
    assert.equal(unloaded, 1);
    await assert.rejects(runtime.embed(['one', 'two', 'three', 'four', 'five']), /batch từ 1 đến 4/);
    await removeEmbeddingGemma2();
    assert.equal((await getEmbeddingGemma2Status()).status, 'missing');
  } finally {
    if (previous === undefined) delete globalThis.Capacitor;
    else globalThis.Capacitor = previous;
  }
}

// An offline load failure must surface as-is. It cannot switch provider.
await assert.rejects(
  createEmbeddingGemma2Runtime({ id: 'qwen3' }, () => {}, mock),
  /Sai model/,
);
await assert.rejects(
  createEmbeddingGemma2Runtime({ id: 'embeddinggemma2' }, () => {},
    { status: async () => ({ modelReady: false }) }),
  /chưa được tải/,
);
console.log('M4 EmbeddingGemma 2 LiteRT bridge checks: OK');
