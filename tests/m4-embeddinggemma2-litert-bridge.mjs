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
  decodeEmbeddingGemma2Binary,
  formatEmbeddingGemma2TuningReport,
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
    tune: async ({ texts }) => {
      events.push('tune');
      assert.ok(texts.length > 0 && texts.length <= 4);
      return {
        backend: 'LiteRT-LM CPU 2 luồng',
        preferredBatch: 1,
        totalMs: 650,
        benchmarks: [
          { backend: 'CPU 4 luồng', batch: 2, ms: 1900, segmentsPerSecond: 1.05 },
          { backend: 'CPU 2 luồng', batch: 1, ms: 460, segmentsPerSecond: 2.17 },
        ],
        warnings: ['GPU/OpenCL không khả dụng trên điện thoại'],
      };
    },
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
    const tuning = await runtime.tune(['title: A | text: one', 'title: B | text: two'],
      detail => stages.push(detail));
    assert.equal(tuning.preferredBatch, 1);
    assert.equal(runtime.preferredBatch, 1);
    assert.ok(stages.some(s => s.includes('[ACCEL] CPU 2 luồng/batch1=2.17 đoạn/s')));
    assert.ok(stages.some(s => s.includes('GPU/OpenCL không khả dụng')));
    await runtime.tune(['repeat'], detail => stages.push(detail));
    assert.equal(events.filter(e => e === 'tune').length, 1, 'avoid repeated GPU benchmark in a session');
    const metrics = [];
    const result = await runtime.embed([
      'title: A | text: one', 'title: B | text: two',
    ], item => metrics.push(item));
    assert.equal(result.length, 2);
    assert.equal(result[1].length, 768);
    assert.equal(metrics[0].litertMs, 8);
    assert.ok(metrics[0].bridgeMs >= 0);
    assert.equal(metrics[0].backend, 'LiteRT-LM CPU');
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
// Binary float32/LE transport: same normalized vectors, much smaller
// Android->WebView bridge payload than nested JSON number arrays.
{
  const count = 2;
  const bytes = Buffer.alloc(count * 768 * 4);
  bytes.writeFloatLE(3.0, 0);
  bytes.writeFloatLE(4.0, 4);
  bytes.writeFloatLE(-1.25, 768 * 4);
  const vectors = decodeEmbeddingGemma2Binary(bytes.toString('base64'), count, 768);
  assert.equal(vectors.length, 2);
  assert.equal(vectors[0][0], 3);
  assert.equal(vectors[0][1], 4);
  assert.equal(vectors[1][0], -1.25);
  assert.equal(vectors[1].length, 768);
  assert.deepEqual(validateEmbeddingGemma2Vectors(vectors, count)[0].slice(0, 2), [0.6, 0.8]);
  assert.throws(() => decodeEmbeddingGemma2Binary('abcd', 2), /độ dài/);
  assert.throws(() => decodeEmbeddingGemma2Binary('', 5), /định dạng/);
  const invalid = Buffer.from(bytes);
  invalid.writeFloatLE(Number.NaN, 0);
  assert.throws(() => decodeEmbeddingGemma2Binary(invalid.toString('base64'), 2), /NaN/);
}

{
  const report = formatEmbeddingGemma2TuningReport({
    backend: 'LiteRT-LM GPU (yêu cầu)',
    preferredBatch: 4,
    benchmarks: [{ backend: 'GPU (OpenCL, yêu cầu)', batch: 4, segmentsPerSecond: 5.6 }],
    warnings: ['GPU/OpenCL driver may use CPU fallback internally'],
  });
  assert.match(report.summary, /batch=4/);
  assert.ok(report.measurements[0].includes('5.60 đoạn/s'));
  assert.equal(report.warnings.length, 1);
}

// CPU/GPU profiling must be explicit in logs, and native failures must never
// change model, query prefix, embedding dimension, or Smart Scan mode.
{
  const previous = globalThis.Capacitor;
  const bytes = Buffer.alloc(768 * 4);
  bytes.writeFloatLE(1, 0);
  const native = {
    status: async () => ({ modelReady: true }),
    load: async () => ({ backend: 'LiteRT-LM CPU 4 luồng', preferredBatch: 2 }),
    tune: async () => ({ preferredBatch: 4, backend: 'LiteRT-LM GPU (yêu cầu)', benchmarks: [] }),
    embed: async () => ({ format: 'float32le', vectorBytes: bytes.toString('base64'),
      count: 1, dimensions: 768, onnxMs: 12, backend: 'LiteRT-LM GPU (yêu cầu)' }),
    unload: async () => {},
  };
  globalThis.Capacitor = { getPlatform: () => 'android', Plugins: { EmbeddingGemma2LiteRT: native } };
  try {
    const runtime = await createEmbeddingGemma2Runtime({ id: 'embeddinggemma2' });
    const tuning = await runtime.tune(['title: Test | text: sample']);
    assert.equal(tuning.preferredBatch, 4);
    const measurements = [];
    const [vector] = await runtime.embed(['title: Test | text: sample'], x => measurements.push(x));
    assert.equal(vector.length, 768);
    assert.equal(vector[0], 1);
    assert.equal(measurements[0].litertMs, 12);
    assert.equal(measurements[0].backend, 'LiteRT-LM GPU (yêu cầu)');
    await runtime.dispose();
  } finally {
    if (previous === undefined) delete globalThis.Capacitor;
    else globalThis.Capacitor = previous;
  }
}

console.log('M4 EmbeddingGemma 2 LiteRT bridge checks: OK');
