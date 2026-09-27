import assert from 'node:assert/strict';
import { createGenerationGateway } from '../src/providers/common/generation-gateway.js';

const logs = [];
const requests = [];
const geminiRequests = [];
const settings = {
  source: 'proxy',
  gemini_model: 'gemini-main',
  proxy_model: 'proxy-main',
  openrouter_model: 'or-main',
};
const samplerPreset = {
  temp: 0.7,
  max_tokens: 1024,
  top_p: 0.93,
  top_k: 80,
  typical_p: 0.95,
  min_p: 0.05,
  repetition_penalty: 1.08,
  frequency_penalty: 0.2,
  presence_penalty: 0.05,
  stopping_strings: ['STOP'],
};
const deps = {
  getConnectionSettings: () => settings,
  request: async (url, options) => {
    requests.push({ url, options });
    if (options.body && JSON.parse(options.body).stream) {
      const payload = 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'A', reasoning_content: 'R' } }] }) + '\n\n' +
        'data: [DONE]\n\n';
      return new Response(payload, { status: 200 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: 'OK', reasoning_content: 'WHY' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
  addNetworkLog: value => logs.push(value),
  getOpenRouterHeaders: () => ({ Authorization: 'Bearer test' }),
  readResponseError: async response => 'HTTP ' + response.status,
  normalizeProxyUrl: value => String(value).replace(/\/$/, ''),
  getProxyUrl: () => 'https://proxy.example',
  getProxyPassword: () => 'secret',
  getProxyLegacyMode: () => false,
  geminiGenerateOnce: async () => ({ text: 'LEGACY-GEMINI' }),
  createGeminiClient: () => ({
    models: {
      async generateContent(request) {
        geminiRequests.push({ mode: 'generate', request });
        return { text: 'GEMINI' };
      },
      async generateContentStream(request) {
        geminiRequests.push({ mode: 'stream', request });
        return (async function* () { yield { text: 'G' }; })();
      },
    },
  }),
  buildGeminiRequest: () => ({
    contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    config: { temperature: 0.1 },
  }),
  safetySettings: [],
};

const gateway = createGenerationGateway(deps);

const proxy = await gateway.generateOnce({ prompt: 'hello', preset: samplerPreset, signal: undefined });
assert.equal(proxy.response.text, 'OK');
assert.equal(requests.at(-1).url, 'https://proxy.example/v1/chat/completions');
const proxyBody = JSON.parse(requests.at(-1).options.body);
assert.equal(proxyBody.stream, false);
assert.equal(proxyBody.top_p, 0.93);
assert.equal(proxyBody.top_k, 80);
assert.equal(proxyBody.typical_p, 0.95);
assert.equal(proxyBody.min_p, 0.05);
assert.equal(proxyBody.repetition_penalty, 1.08);
assert.equal(proxyBody.frequency_penalty, 0.2);
assert.equal(proxyBody.presence_penalty, 0.05);
assert.deepEqual(proxyBody.stop, ['STOP']);

const proxyChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: samplerPreset, signal: undefined })) proxyChunks.push(chunk);
assert.deepEqual(proxyChunks, [{ text: 'A' }]);
const proxyStreamBody = JSON.parse(requests.at(-1).options.body);
for (const key of ['top_p', 'top_k', 'typical_p', 'min_p', 'repetition_penalty', 'frequency_penalty', 'presence_penalty']) {
  assert.equal(proxyStreamBody[key], proxyBody[key], 'Proxy stream/non-stream mismatch: ' + key);
}

settings.source = 'openrouter';
const openrouter = await gateway.generateOnce({ prompt: 'hello', preset: samplerPreset });
assert.equal(openrouter.response.text, 'OK');
assert.equal(openrouter.reasoning, 'WHY');
assert.equal(requests.at(-1).url, 'https://openrouter.ai/api/v1/chat/completions');
const openrouterBody = JSON.parse(requests.at(-1).options.body);
assert.equal(openrouterBody.top_p, 0.93);
assert.equal(openrouterBody.top_k, 80);
assert.equal(openrouterBody.min_p, 0.05);
assert.equal(openrouterBody.repetition_penalty, 1.08);
assert.equal(openrouterBody.frequency_penalty, 0.2);
assert.equal(openrouterBody.presence_penalty, 0.05);
assert.equal(openrouterBody.typical_p, undefined);
assert.deepEqual(openrouterBody.stop, ['STOP']);

const orChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: samplerPreset })) orChunks.push(chunk);
assert.deepEqual(orChunks, [{ text: 'A', reasoning: 'R' }]);
const openrouterStreamBody = JSON.parse(requests.at(-1).options.body);
for (const key of ['top_p', 'top_k', 'min_p', 'repetition_penalty', 'frequency_penalty', 'presence_penalty']) {
  assert.equal(openrouterStreamBody[key], openrouterBody[key], 'OpenRouter stream/non-stream mismatch: ' + key);
}

settings.source = 'gemini';
const gemini = await gateway.generateOnce({ prompt: 'hello', preset: samplerPreset });
assert.equal(gemini.response.text, 'GEMINI');
const geminiBody = geminiRequests.at(-1).request;
assert.equal(geminiBody.config.topP, 0.93);
assert.equal(geminiBody.config.topK, 80);
assert.equal(geminiBody.config.frequencyPenalty, 0.2);
assert.equal(geminiBody.config.presencePenalty, 0.05);
assert.equal(geminiBody.config.minP, undefined);
assert.equal(geminiBody.config.typicalP, undefined);
assert.equal(geminiBody.config.repetitionPenalty, undefined);

const geminiChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: samplerPreset })) geminiChunks.push(chunk);
assert.deepEqual(geminiChunks, [{ text: 'G' }]);
const geminiStreamBody = geminiRequests.at(-1).request;
for (const key of ['topP', 'topK', 'frequencyPenalty', 'presencePenalty']) {
  assert.equal(geminiStreamBody.config[key], geminiBody.config[key], 'Gemini stream/non-stream mismatch: ' + key);
}

assert.ok(logs.some(log => log.source === 'proxy'));
assert.ok(logs.some(log => log.source === 'openrouter'));

console.log('M4 generation gateway tests: OK');
