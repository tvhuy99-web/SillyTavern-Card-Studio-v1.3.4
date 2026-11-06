import assert from 'node:assert/strict';
import {
  getNativeEmbeddingPlugin,
  packNativeEmbeddingInputs,
  copyCachedModelToNative,
  createNativeEmbeddingGemmaRuntime,
} from '../src/features/world-info/native-embedding-bridge.js';

const provider = {
  id: 'embeddinggemma',
  modelId: 'huggingworld/embeddinggemma-300m-ONNX',
  maxLength: 2048,
  dimensions: 768,
};

// Never silently route an Android APK with a missing native plugin to WASM.
assert.equal(getNativeEmbeddingPlugin({}), null);
assert.equal(getNativeEmbeddingPlugin({ Capacitor: {
  getPlatform: () => 'web',
  Plugins: { WorldInfoEmbeddingNative: {} },
} }), null);
const native = { load: async () => ({ backend: 'CPU', loadMs: 4 }) };
assert.equal(getNativeEmbeddingPlugin({ Capacitor: {
  getPlatform: () => 'android',
  Plugins: { WorldInfoEmbeddingNative: native },
} }), native);
await assert.rejects(
  createNativeEmbeddingGemmaRuntime({ provider, transformers: {}, plugin: null }),
  /không có plugin ONNX native/,
);
await assert.rejects(
  createNativeEmbeddingGemmaRuntime({ provider: { ...provider, id: 'qwen3' }, transformers: {}, plugin: native }),
  /mới hỗ trợ EmbeddingGemma/,
);

// BigInt tensors are from Transformers.js v3. Verify padded shape is preserved
// rather than losing or coercing token IDs in Capacitor JSON transport.
assert.deepEqual(packNativeEmbeddingInputs({
  input_ids: { dims: [2, 3], data: BigInt64Array.from([4n, 5n, 0n, 6n, 7n, 8n]) },
  attention_mask: { dims: [2, 3], data: BigInt64Array.from([1n, 1n, 0n, 1n, 1n, 1n]) },
}), {
  inputIds: [[4, 5, 0], [6, 7, 8]],
  attentionMask: [[1, 1, 0], [1, 1, 1]],
});
assert.throws(() => packNativeEmbeddingInputs({ input_ids: { dims: [1, 2], data: [1, 2] } }), /Tokenizer/);
assert.throws(() => packNativeEmbeddingInputs({
  input_ids: { dims: [1, 2], data: [3, 4] },
  attention_mask: { dims: [1, 2], data: [1, -1] },
}), /hợp lệ/);

// Test importing from WebView Cache API without fetch(), arrayBuffer() or
// any network fallback. The bridge copies each required file and can re-use it.
{
  let graphReady = false;
  let weightsReady = false;
  let active;
  let bytes = 0;
  const names = [];
  const fakePlugin = {
    status: async () => ({
      graphReady, weightsReady, modelReady: graphReady && weightsReady,
    }),
    beginFile: async ({ fileName }) => { active = fileName; bytes = 0; names.push('start:' + fileName); },
    appendChunk: async ({ fileName, base64 }) => {
      assert.equal(fileName, active);
      bytes += Buffer.from(base64, 'base64').length;
      names.push('chunk:' + fileName);
    },
    finishFile: async ({ fileName }) => {
      assert.equal(fileName, active);
      if (fileName.endsWith('.onnx_data')) weightsReady = true;
      else graphReady = true;
      active = null;
      return { bytes };
    },
  };
  const files = new Map([
    ['model_q4.onnx', Uint8Array.from({ length: 1025 }, (_, i) => i % 256)],
    ['model_q4.onnx_data', Uint8Array.from({ length: 1050 }, (_, i) => i % 256)],
  ]);
  const fakeCaches = {
    keys: async () => ['transformers-cache'],
    open: async () => ({
      keys: async () => Array.from(files.keys(), name => ({
        url: 'https://huggingface.co/' + provider.modelId + '/resolve/main/onnx/' + name,
      })),
      match: async request => {
        const fileName = request.url.split('/').at(-1);
        return new Response(files.get(fileName));
      },
    }),
  };
  const messages = [];
  await copyCachedModelToNative(fakePlugin, provider, message => messages.push(message), fakeCaches);
  assert.deepEqual(names.filter(name => name.startsWith('start:')), [
    'start:model_q4.onnx', 'start:model_q4.onnx_data',
  ]);
  assert.ok(names.includes('chunk:model_q4.onnx_data'));
  assert.ok(messages.some(message => message.includes('không tải lại qua mạng')));
  const length = names.length;
  await copyCachedModelToNative(fakePlugin, provider, () => {}, fakeCaches);
  assert.equal(names.length, length, 'should re-use completed native weights');
}

// The tokenizer stays on WebView, native receives padded IDs only, and vectors
// are L2 normalized. No ONNX session/model fallback on a native failure.
{
  const vector = Array.from({ length: 768 }, (_, i) => i < 2 ? 3 : 0);
  const callLog = [];
  const mockPlugin = {
    status: async () => ({ modelReady: true, graphReady: true, weightsReady: true }),
    load: async input => { callLog.push({ method: 'load', input }); return { backend: 'CPU', loadMs: 3 }; },
    embed: async inputs => {
      callLog.push({ method: 'embed', inputs });
      return { vectors: [vector], onnxMs: 9, backend: 'CPU' };
    },
    unload: async () => { callLog.push({ method: 'unload' }); },
  };
  const transformers = {
    AutoTokenizer: {
      from_pretrained: async (id, options) => {
        assert.equal(id, provider.modelId);
        assert.equal(options.local_files_only, true);
        return async () => ({
          input_ids: { dims: [1, 2], data: BigInt64Array.from([1n, 2n]) },
          attention_mask: { dims: [1, 2], data: BigInt64Array.from([1n, 1n]) },
        });
      },
    },
  };
  const runtime = await createNativeEmbeddingGemmaRuntime({ provider, transformers, plugin: mockPlugin });
  const measurements = [];
  const [result] = await runtime.embed(['title: none | text: abc'],
    metrics => measurements.push(metrics));
  assert.equal(result.length, 768);
  assert.equal(result[0], 1);
  assert.equal(result[1], 0);
  assert.equal(measurements[0].onnxMs, 9);
  assert.equal(callLog[0].input.backend, 'CPU');
  assert.deepEqual(callLog[1].inputs.inputIds, [[1, 2]]);
  await runtime.dispose();
  assert.equal(callLog.at(-1).method, 'unload');
}

console.log('Android native EmbeddingGemma bridge checks: OK');
