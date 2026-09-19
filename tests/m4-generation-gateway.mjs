import assert from 'node:assert/strict';
import { createGenerationGateway } from '../src/providers/common/generation-gateway.js';

const logs = [];
const requests = [];
const settings = {
  source: 'proxy',
  gemini_model: 'gemini-main',
  proxy_model: 'proxy-main',
  openrouter_model: 'or-main',
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
  geminiGenerateOnce: async () => ({ text: 'GEMINI' }),
  createGeminiClient: () => ({
    models: {
      async generateContentStream() {
        return (async function* () { yield { text: 'G' }; })();
      },
    },
  }),
  buildGeminiRequest: () => ({ contents: [{ role: 'user' }], config: {} }),
  safetySettings: [],
};

const gateway = createGenerationGateway(deps);

const proxy = await gateway.generateOnce({ prompt: 'hello', preset: {}, signal: undefined });
assert.equal(proxy.response.text, 'OK');
assert.equal(requests.at(-1).url, 'https://proxy.example/v1/chat/completions');
assert.equal(JSON.parse(requests.at(-1).options.body).stream, false);

const proxyChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: {}, signal: undefined })) proxyChunks.push(chunk);
assert.deepEqual(proxyChunks, [{ text: 'A' }]);

settings.source = 'openrouter';
const openrouter = await gateway.generateOnce({ prompt: 'hello', preset: { temp: 0.7 } });
assert.equal(openrouter.response.text, 'OK');
assert.equal(openrouter.reasoning, 'WHY');
assert.equal(requests.at(-1).url, 'https://openrouter.ai/api/v1/chat/completions');

const orChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: {} })) orChunks.push(chunk);
assert.deepEqual(orChunks, [{ text: 'A', reasoning: 'R' }]);

settings.source = 'gemini';
const gemini = await gateway.generateOnce({ prompt: 'hello', preset: {} });
assert.equal(gemini.response.text, 'GEMINI');
const geminiChunks = [];
for await (const chunk of gateway.stream({ prompt: 'hello', preset: {} })) geminiChunks.push(chunk);
assert.deepEqual(geminiChunks, [{ text: 'G' }]);

assert.ok(logs.some(log => log.source === 'proxy'));
assert.ok(logs.some(log => log.source === 'openrouter'));

console.log('M4 generation gateway tests: OK');
