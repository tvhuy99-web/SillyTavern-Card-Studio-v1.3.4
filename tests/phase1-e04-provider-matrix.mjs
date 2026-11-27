import assert from 'node:assert/strict';
import {
  REDACTED_VALUE,
  redactBody,
  redactHeaders,
  redactNetworkLog,
  redactUrl,
} from '../src/diagnostics/network-redaction.js';
import { createHttpTransport } from '../src/providers/common/http-transport.js';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_SAFETY_SETTINGS,
  buildGeminiRequest,
  createGeminiClient,
} from '../src/providers/gemini/config.js';
import { readResponseError } from '../src/providers/common/generation-utils.js';
import {
  BUILTIN_PROVIDER_CONTRACTS,
  CONNECTION_DEFAULTS,
  DEFAULT_PROVIDER_CAPABILITIES,
  UnsupportedProviderError,
  createProviderRegistry,
  normalizeProviderCapabilities,
} from '../src/providers/common/provider-registry.js';
import { createGenerationGateway } from '../src/providers/common/generation-gateway.js';

const expectedCapabilityKeys = [
  'streaming',
  'cancellation',
  'modelCatalog',
  'connectionTest',
  'customModel',
  'toolCalling',
];

assert.deepEqual(Object.keys(DEFAULT_PROVIDER_CAPABILITIES), expectedCapabilityKeys);

for (const id of ['gemini', 'openrouter', 'proxy', 'aistudio']) {
  const contract = BUILTIN_PROVIDER_CONTRACTS[id];
  assert.ok(contract, `Missing built-in contract for ${id}`);
  for (const key of expectedCapabilityKeys) {
    assert.equal(typeof contract.capabilities[key], 'boolean', `${id}.capabilities.${key} must be boolean`);
  }
  assert.equal(contract.capabilities.testConnection, contract.capabilities.connectionTest);
  assert.equal(typeof contract.validateConfig, 'function');
}

assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.connectionTest, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.testConnection, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.streaming, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.cancellation, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.modelCatalog, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.customModel, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.capabilities.toolCalling, false);

for (const id of ['gemini', 'openrouter', 'proxy']) {
  const caps = BUILTIN_PROVIDER_CONTRACTS[id].capabilities;
  assert.equal(caps.streaming, true);
  assert.equal(caps.cancellation, true);
  assert.equal(caps.modelCatalog, true);
  assert.equal(caps.connectionTest, true);
  assert.equal(caps.customModel, true);
  assert.equal(caps.toolCalling, true);
}

assert.equal(BUILTIN_PROVIDER_CONTRACTS.gemini.validateConfig({}).valid, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.gemini.validateConfig({ useDefault: true }).valid, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.gemini.validateConfig({ geminiApiKey: 'AIza-secret' }).valid, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.gemini.validateConfig({ geminiApiKey: 'AIza-secret', model: '  ' }).valid, false);

assert.equal(BUILTIN_PROVIDER_CONTRACTS.openrouter.validateConfig({}).valid, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.openrouter.validateConfig({ openRouterApiKey: 'sk-or-1' }).valid, false);
assert.equal(
  BUILTIN_PROVIDER_CONTRACTS.openrouter.validateConfig({ openRouterApiKey: 'sk-or-1', model: 'openai/gpt-4o-mini' }).valid,
  true,
);

assert.equal(BUILTIN_PROVIDER_CONTRACTS.proxy.validateConfig({}).valid, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.proxy.validateConfig({ url: 'https://proxy.test', protocol: 'openai' }).valid, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.proxy.validateConfig({ url: 'https://proxy.test', protocol: 'google_native' }).valid, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.proxy.validateConfig({ url: 'https://proxy.test', protocol: 'invalid' }).valid, false);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.proxy.validateConfig({ url: 'https://proxy.test', model: '' }).valid, false);

assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.validateConfig({}).valid, true);
assert.equal(BUILTIN_PROVIDER_CONTRACTS.aistudio.validateConfig({ nativeAvailable: false }).valid, false);

assert.equal(DEFAULT_GEMINI_SAFETY_SETTINGS.length, 4);
assert.deepEqual(
  DEFAULT_GEMINI_SAFETY_SETTINGS.map(item => [item.category, item.threshold]),
  [
    ['HARM_CATEGORY_HARASSMENT', 'BLOCK_NONE'],
    ['HARM_CATEGORY_HATE_SPEECH', 'BLOCK_NONE'],
    ['HARM_CATEGORY_SEXUALLY_EXPLICIT', 'BLOCK_NONE'],
    ['HARM_CATEGORY_DANGEROUS_CONTENT', 'BLOCK_NONE'],
  ],
);

assert.throws(() => createGeminiClient(''), /API Key không được định cấu hình/);
assert.throws(() => createGeminiClient({ getApiKey: () => '   ' }), /API Key không được định cấu hình/);
assert.throws(() => createGeminiClient('gem-key-missing-ctor'), TypeError);

class FakeGeminiClient {
  constructor(opts) {
    this.opts = opts;
  }
}

const directClient = createGeminiClient('gem-key-1', { ClientCtor: FakeGeminiClient });
assert.equal(directClient.opts.apiKey, 'gem-key-1');
const factoryClient = createGeminiClient(undefined, { getApiKey: () => 'gem-key-2', ClientCtor: FakeGeminiClient });
assert.equal(factoryClient.opts.apiKey, 'gem-key-2');
const objectClient = createGeminiClient({ apiKey: 'gem-key-3', ClientCtor: FakeGeminiClient });
assert.equal(objectClient.opts.apiKey, 'gem-key-3');

const defaultReq = buildGeminiRequest('Hello world');
assert.equal(defaultReq.model, DEFAULT_GEMINI_MODEL);
assert.deepEqual(defaultReq.contents, [{ role: 'user', parts: [{ text: 'Hello world' }] }]);
assert.equal(defaultReq.config.temperature, 1);
assert.equal(defaultReq.config.topP, 0.95);
assert.equal(defaultReq.config.maxOutputTokens, 4096);
assert.equal(defaultReq.config.topK, undefined);
assert.equal(defaultReq.config.thinkingConfig, undefined);
assert.equal(defaultReq.config.safetySettings, DEFAULT_GEMINI_SAFETY_SETTINGS);

const clampedReq = buildGeminiRequest(
  'Test clamping',
  {
    model: 'gemini-2.5-pro',
    temp: 9.5,
    top_p: -0.5,
    top_k: 42.9,
    max_tokens: 0,
    stopping_strings: ['END'],
    thinking_budget: 2048,
  },
  [],
);
assert.equal(clampedReq.model, 'gemini-2.5-pro');
assert.equal(clampedReq.config.temperature, 2);
assert.equal(clampedReq.config.topP, 0);
assert.equal(clampedReq.config.topK, 42);
assert.equal(clampedReq.config.maxOutputTokens, 1);
assert.deepEqual(clampedReq.config.stopSequences, ['END']);
assert.deepEqual(clampedReq.config.thinkingConfig, { thinkingLevel: 'HIGH' });
assert.deepEqual(clampedReq.config.safetySettings, []);

const invalidTopKReq = buildGeminiRequest('No topK', { top_k: 0, thinking_budget: 0 });
assert.equal(invalidTopKReq.config.topK, undefined);
assert.equal(invalidTopKReq.config.thinkingConfig, undefined);

const secretUrl = 'https://user:super-pass@api.example.com/v1/models?key=AIzaSecret123&api_key=sk-secret-456&safe=1';
const cleanUrl = redactUrl(secretUrl);
assert.equal(cleanUrl.includes('super-pass'), false);
assert.equal(cleanUrl.includes('AIzaSecret123'), false);
assert.equal(cleanUrl.includes('sk-secret-456'), false);
assert.ok(cleanUrl.includes('safe=1'));

const cleanHeaders = redactHeaders({
  Authorization: 'Bearer sk-live-secret',
  'Proxy-Authorization': 'Basic dXNlcjpwYXNz',
  'x-api-key': 'raw-key',
  'api-key': 'alt-key',
  'x-goog-api-key': 'AIza-header-key',
  Cookie: 'session=abc',
  'Set-Cookie': 'session=xyz',
  'Content-Type': 'application/json',
});
assert.equal(cleanHeaders.Authorization, REDACTED_VALUE);
assert.equal(cleanHeaders['Proxy-Authorization'], REDACTED_VALUE);
assert.equal(cleanHeaders['x-api-key'], REDACTED_VALUE);
assert.equal(cleanHeaders['api-key'], REDACTED_VALUE);
assert.equal(cleanHeaders['x-goog-api-key'], REDACTED_VALUE);
assert.equal(cleanHeaders.Cookie, REDACTED_VALUE);
assert.equal(cleanHeaders['Set-Cookie'], REDACTED_VALUE);
assert.equal(cleanHeaders['Content-Type'], 'application/json');

const circular = { apiKey: 'secret-nested', safe: 'ok' };
circular.self = circular;
const redactedLog = redactNetworkLog({
  url: secretUrl,
  headers: new Headers({ Authorization: 'Bearer top-secret', 'X-Title': 'STCS' }),
  body: circular,
});
const serializedLog = JSON.stringify(redactedLog);
for (const leaked of ['super-pass', 'AIzaSecret123', 'sk-secret-456', 'top-secret', 'secret-nested']) {
  assert.equal(serializedLog.includes(leaked), false, `Secret leaked into network log: ${leaked}`);
}
assert.equal(redactedLog.headers.authorization, REDACTED_VALUE);
assert.equal(redactedLog.headers['x-title'], 'STCS');
assert.equal(redactedLog.body.apiKey, REDACTED_VALUE);
assert.equal(redactedLog.body.self, '[CIRCULAR]');
assert.equal(redactedLog.body.safe, 'ok');

const jsonBodyRedacted = redactBody(JSON.stringify({ nested: { password: 'pw1', token: 'tok1' }, keep: true }));
assert.equal(jsonBodyRedacted.includes('pw1'), false);
assert.equal(jsonBodyRedacted.includes('tok1'), false);
assert.ok(jsonBodyRedacted.includes('"keep":true'));

const textBodyRedacted = redactBody('api_key=abc123&token=xyz789&mode=chat');
assert.equal(textBodyRedacted.includes('abc123'), false);
assert.equal(textBodyRedacted.includes('xyz789'), false);
assert.ok(textBodyRedacted.includes('mode=chat'));

const fetchCalls = [];
const transportLogs = [];
let directBypass = true;
const silentLogger = {
  log: msg => transportLogs.push(msg),
  warn: msg => transportLogs.push(msg),
};

const transport = createHttpTransport({
  getConnectionSettings: () => ({ directFetchBypass: directBypass }),
  logger: silentLogger,
  fetch: async (url, init) => {
    fetchCalls.push({ url, init });
    if (url === '/api/health') return new Response('ok', { status: 200 });
    if (url === 'https://fail.example/net') throw new TypeError('Failed to fetch');
    if (url === 'https://abort.example/net') throw new DOMException('The user aborted a request.', 'AbortError');
    if (url === '/api/forward') {
      const payload = JSON.parse(init.body);
      if (payload.url.includes('/timeout')) {
        return new Response(JSON.stringify({ error: { message: 'Upstream timed out' } }), { status: 504 });
      }
      if (payload.url.includes('/bad-gateway')) {
        return new Response(JSON.stringify({ error: { message: 'Bad upstream' } }), { status: 502 });
      }
      if (payload.url.includes('/rate-limit')) {
        return new Response(JSON.stringify({ error: { message: 'Too many requests' } }), { status: 429 });
      }
      return Response.json({ forwarded: payload.url, method: payload.method, headers: payload.headers });
    }
    return Response.json({ direct: url });
  },
});

const healthRes = await transport.request('/api/health', { method: 'GET' });
assert.equal(await healthRes.text(), 'ok');
assert.equal(fetchCalls.at(-1).url, '/api/health');

const directRes = await transport.request('https://api.example/v1/chat?api_key=direct-secret-999', { method: 'POST' });
assert.deepEqual(await directRes.json(), { direct: 'https://api.example/v1/chat?api_key=direct-secret-999' });
assert.equal(transportLogs.some(line => line.includes('direct-secret-999')), false);

await assert.rejects(transport.request('https://fail.example/net', {}), /Kết nối trực tiếp thất bại/);
await assert.rejects(transport.request('https://abort.example/net', {}), { name: 'AbortError' });

directBypass = false;
const forwardRes = await transport.request('https://upstream.example/v1/chat/completions', {
  method: 'POST',
  headers: new Headers({ Authorization: 'Bearer fwd-secret', 'Content-Type': 'application/json' }),
  body: JSON.stringify({ model: 'm1' }),
});
assert.equal(fetchCalls.at(-1).url, '/api/forward');
const forwardJson = await forwardRes.json();
assert.equal(forwardJson.forwarded, 'https://upstream.example/v1/chat/completions');
assert.equal(forwardJson.method, 'POST');
assert.equal(forwardJson.headers.authorization, 'Bearer fwd-secret');

await assert.rejects(transport.request('https://upstream.example/timeout', {}), /quá thời gian phản hồi/);
await assert.rejects(transport.request('https://upstream.example/bad-gateway', {}), /Proxy Error \(502\): Bad upstream/);
const rateLimitRes = await transport.request('https://upstream.example/rate-limit', {});
assert.equal(rateLimitRes.status, 429);

assert.equal(
  await readResponseError(new Response(JSON.stringify({ error: { message: 'Invalid key' } }), { status: 401 }), 'OpenRouter Error'),
  'OpenRouter Error: Invalid key',
);
assert.equal(
  await readResponseError(new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 429 }), 'OpenRouter Error'),
  'OpenRouter Error: Quota exceeded',
);
assert.equal(
  await readResponseError(new Response('Plain failure', { status: 500 }), 'API Error'),
  'API Error: Plain failure',
);
assert.equal(
  await readResponseError(new Response('', { status: 503 }), 'API Error'),
  'API Error: HTTP 503',
);

const gatewaySettings = {
  ...CONNECTION_DEFAULTS,
  source: 'openrouter',
  openrouter_model: 'openai/gpt-4o-mini',
  proxy_model: 'proxy-m1',
  proxy_protocol: 'openai',
  experimental_model: 'exp-v1',
};

const gatewayLogs = [];
const experimentalCalls = [];
const experimentalProvider = {
  id: 'experimental-local',
  modelKey: 'experimental_model',
  defaultModel: 'exp-default',
  capabilities: normalizeProviderCapabilities({
    streaming: true,
    cancellation: true,
    modelCatalog: false,
    connectionTest: true,
    customModel: true,
    toolCalling: false,
  }),
  validateConfig(config = {}) {
    const errors = [];
    if (!String(config.endpoint ?? '').trim()) errors.push('Thiếu endpoint cho experimental-local.');
    return { valid: errors.length === 0, errors };
  },
  adapter: {
    async generate({ model, prompt, signal }) {
      if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
      experimentalCalls.push({ mode: 'generate', model, prompt });
      return { text: prompt.includes('OK') ? 'OK' : `exp:${model}:${prompt}` };
    },
    async *stream({ model, prompt, signal }) {
      experimentalCalls.push({ mode: 'stream', model, prompt });
      yield { text: 'exp-part-1' };
      if (signal?.aborted) return;
      yield { text: 'exp-part-2' };
    },
  },
};

const gateway = createGenerationGateway({
  getConnectionSettings: () => gatewaySettings,
  request: async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.model === 'fail-or-model') {
      return new Response(JSON.stringify({ error: { message: 'Bad OR model' } }), { status: 400 });
    }
    if (body.model === 'fail-proxy-model') {
      return new Response(JSON.stringify({ error: 'Proxy rejected model' }), { status: 403 });
    }
    if (body.stream) {
      return new Response(
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'chunk1', reasoning_content: 'r1' } }] }) + '\n\n'
        + 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'chunk2' } }] }) + '\n\n'
        + 'data: [DONE]\n\n',
        { status: 200 },
      );
    }
    return Response.json({ choices: [{ message: { content: 'OK', reasoning_content: 'reason' } }] });
  },
  addNetworkLog: log => gatewayLogs.push(log),
  getOpenRouterHeaders: key => ({
    Authorization: `Bearer ${key || 'saved-or-key'}`,
    'api-key': 'extra-secret-header',
    'Content-Type': 'application/json',
  }),
  readResponseError,
  normalizeProxyUrl: url => url.replace(/\/$/, ''),
  getProxyUrl: () => 'https://proxy.example',
  getProxyPassword: () => 'saved-proxy-secret',
  getProxyLegacyMode: () => false,
  createGeminiClient: key => ({
    models: {
      generateContent: async () => ({ text: key ? `OK:${key}` : 'OK' }),
      generateContentStream: async () => (async function* () {
        yield { text: 'g1' };
        yield { text: 'g2' };
      })(),
    },
  }),
  buildGeminiRequest,
  safetySettings: DEFAULT_GEMINI_SAFETY_SETTINGS,
  extraProviders: [experimentalProvider],
});

assert.deepEqual(
  gateway.listProviders().map(p => p.id),
  ['gemini', 'openrouter', 'proxy', 'aistudio', 'experimental-local'],
);

assert.equal(gateway.validateConfig('experimental-local', {}).valid, false);
assert.equal(gateway.validateConfig('experimental-local', { endpoint: 'http://127.0.0.1:9999' }).valid, true);
assert.throws(() => gateway.validateConfig('unknown-provider', {}), UnsupportedProviderError);

const expGen = await gateway.generateOnce({ source: 'experimental-local', prompt: 'hello' });
assert.deepEqual(expGen, { response: { text: 'exp:exp-v1:hello' } });
const expChunks = [];
for await (const chunk of gateway.stream({ source: 'experimental-local', prompt: 'stream-it' })) {
  expChunks.push(chunk);
}
assert.deepEqual(expChunks, [{ text: 'exp-part-1' }, { text: 'exp-part-2' }]);
const expProbe = await gateway.testModel({ provider: 'experimental-local', model: 'exp-probe' });
assert.equal(expProbe.ok, true);
assert.equal(expProbe.provider, 'experimental-local');

const orStreamChunks = [];
for await (const chunk of gateway.stream({ source: 'openrouter', model: 'or-m', prompt: 'hi' })) {
  orStreamChunks.push(chunk);
}
assert.deepEqual(orStreamChunks, [{ text: 'chunk1', reasoning: 'r1' }, { text: 'chunk2', reasoning: undefined }]);
assert.equal(gatewayLogs.at(-1).headers.Authorization, REDACTED_VALUE);
assert.equal(gatewayLogs.at(-1).headers['api-key'], REDACTED_VALUE);

const gemStreamChunks = [];
for await (const chunk of gateway.stream({ source: 'gemini', model: 'gemini-2.5-flash', prompt: 'hi' })) {
  gemStreamChunks.push(chunk);
}
assert.deepEqual(gemStreamChunks, [{ text: 'g1' }, { text: 'g2' }]);

await assert.rejects(
  gateway.generateOnce({ source: 'openrouter', model: 'fail-or-model', prompt: 'hi' }),
  /OpenRouter Error: Bad OR model/,
);
await assert.rejects(
  gateway.generateOnce({ source: 'proxy', model: 'fail-proxy-model', prompt: 'hi' }),
  /Proxy rejected model/,
);

const abortController = new AbortController();
abortController.abort();
await assert.rejects(
  async () => {
    for await (const _ of gateway.stream({ source: 'experimental-local', prompt: 'hi', signal: abortController.signal })) {}
  },
  { name: 'AbortError' },
);

const standaloneRegistry = createProviderRegistry([experimentalProvider]);
assert.equal(standaloneRegistry.has('experimental-local'), true);
assert.equal(standaloneRegistry.has('missing'), false);
assert.equal(standaloneRegistry.validateConfig('experimental-local', { endpoint: 'http://localhost' }).valid, true);
assert.throws(
  () => createProviderRegistry([{ ...experimentalProvider, validateConfig: 'not-a-fn' }]),
  TypeError,
);

console.log('Phase 1 E04 Provider Contract Matrix, transport, redaction & extensibility: OK');
