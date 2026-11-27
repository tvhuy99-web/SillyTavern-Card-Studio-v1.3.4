import assert from 'node:assert/strict';
import { createGenerationGateway } from '../src/providers/common/generation-gateway.js';
import { CONNECTION_DEFAULTS, createProviderRegistry, UnsupportedProviderError } from '../src/providers/common/provider-registry.js';
import { resolveProxyConfig } from '../src/features/arena/state-machine.js';

const settings = { ...CONNECTION_DEFAULTS, source: 'proxy', proxy_model: 'p-model' };
const calls = [], sdkCalls = [], logs = [];
let sdkResponse = 'OK';
const deps = {
  getConnectionSettings: () => settings,
  request: async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });
    const google = url.includes('/v1beta/models/');
    if (body.stream || url.includes(':streamGenerateContent')) {
      const event = google ? { candidates: [{ content: { parts: [{ text:'private thought', thought:true },{ text:'A' }] } }] } : { choices:[{ delta:{content:'A'} }] };
      return new Response(`data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`);
    }
    return Response.json(google ? { candidates:[{content:{parts:[{text:'OK'}]}}] } : { choices:[{message:{content:'OK', reasoning_content:'WHY'}}] });
  },
  addNetworkLog: log => logs.push(log),
  normalizeProxyUrl: url => url.replace(/\/$/, ''),
  getProxyUrl: () => 'https://proxy.example', getProxyPassword: () => 'saved-secret', getProxyLegacyMode: () => false,
  getOpenRouterHeaders: key => ({ Authorization: 'Bearer ' + (key || 'saved-or'), 'Content-Type': 'application/json' }),
  readResponseError: async response => 'HTTP ' + response.status,
  createGeminiClient: key => ({models:{
    generateContent: async request => { sdkCalls.push({key,request}); return {text:sdkResponse}; },
    generateContentStream: async () => (async function*(){yield {text:'G'};})(),
  }}),
  buildGeminiRequest: (prompt, preset, safetySettings) => ({ contents:[{role:'user',parts:[{text:prompt}]}], config:{temperature:preset.temp,maxOutputTokens:preset.max_tokens,safetySettings} }),
  safetySettings: [],
};
const gateway = createGenerationGateway(deps);
assert.deepEqual(gateway.listProviders().map(x=>x.id), ['gemini','openrouter','proxy','aistudio']);
assert.equal(gateway.listProviders().find(x=>x.id==='aistudio').capabilities.testConnection,false);
await assert.rejects(gateway.generateOnce({source:'typo',prompt:'hi'}), UnsupportedProviderError);
await assert.rejects(async()=>{for await (const _ of gateway.stream({source:'typo',prompt:'hi'})) {}}, UnsupportedProviderError);
await assert.rejects(gateway.testModel({provider:'typo',model:'m'}), UnsupportedProviderError);
await assert.rejects(gateway.testModel({provider:'aistudio',model:'default'}), /AI Studio chưa hỗ trợ/);
assert.equal(calls.length,0); assert.equal(sdkCalls.length,0);

let result = await gateway.testModel({provider:'proxy',model:'draft',proxy:{url:'https://draft.example',password:'draft-secret',legacyMode:false,protocol:'openai'}});
assert.equal(result.ok,true); assert.equal(result.provider,'proxy'); assert.equal(calls.at(-1).url,'https://draft.example/v1/chat/completions');
assert.equal(calls.at(-1).body.model,'draft'); assert.equal(calls.at(-1).body.max_tokens,8); assert.equal(calls.at(-1).init.headers.Authorization,'Bearer draft-secret');
assert.equal(logs.length,0,'probes must not log draft credentials or prompt');
result = await gateway.testModel({provider:'openrouter',model:'or-draft',openRouterApiKey:'draft-or'});
assert.equal(result.ok,true); assert.equal(calls.at(-1).init.headers.Authorization,'Bearer draft-or');
result = await gateway.testModel({provider:'gemini',model:'g-draft',geminiApiKey:'draft-g'});
assert.equal(result.ok,true); assert.equal(sdkCalls.at(-1).key,'draft-g'); assert.equal(sdkCalls.at(-1).request.model,'g-draft');
assert.equal(sdkCalls.at(-1).request.config.maxOutputTokens,8); assert.equal(logs.length,0);
sdkResponse='not a valid answer'; await assert.rejects(gateway.testModel({provider:'gemini',model:'g'}),/nội dung kiểm tra không hợp lệ/); sdkResponse='OK';

settings.proxy_protocol='google_native';
await gateway.generateOnce({prompt:'hi',preset:{temp:0.4,max_tokens:19,top_p:0.8,stopping_strings:['stop']}});
let req=calls.at(-1); assert.equal(req.url,'https://proxy.example/v1beta/models/p-model:generateContent');
assert.equal(req.init.headers['x-goog-api-key'],'saved-secret'); assert.equal(req.body.generationConfig.maxOutputTokens,19); assert.equal(req.body.generationConfig.topP,0.8);
assert.deepEqual(req.body.generationConfig.stopSequences,['stop']);
assert.equal(logs.at(-1).headers['x-goog-api-key'],'[REDACTED]');
await gateway.testModel({provider:'proxy',model:'models/gemini-foo',proxy:{url:'https://native.example',password:'secret',protocol:'google_native'}});
assert.equal(calls.at(-1).url,'https://native.example/v1beta/models/gemini-foo:generateContent');
let chunks=[]; for await (const chunk of gateway.stream({prompt:'hi',preset:{}})) chunks.push(chunk);
assert.deepEqual(chunks,[{text:'A'}]); assert.match(calls.at(-1).url,/:streamGenerateContent\?alt=sse$/);
const profile=resolveProxyConfig('proxy','arena',[{id:'arena',url:'https://arena.example',password:'arena',legacyMode:false,protocol:'openai'}]);
await gateway.generateOnce({source:'proxy',model:'challenger',prompt:'hi',proxyConfig:profile});
assert.equal(calls.at(-1).url,'https://arena.example/v1/chat/completions'); assert.equal(logs.at(-1).headers.Authorization,'[REDACTED]');
await gateway.generateOnce({source:'proxy',model:'custom',prompt:'hi',proxyConfig:{url:'https://custom.example'}});
assert.equal(calls.at(-1).url,'https://custom.example/v1/chat/completions');
assert.equal(calls.at(-1).init.headers.Authorization,undefined,'custom endpoint must not inherit another endpoint secret');
await gateway.testModel({provider:'proxy',model:'g',proxy:{url:'https://native.example/v1beta/models',protocol:'google_native'}});
assert.equal(calls.at(-1).url,'https://native.example/v1beta/models/g:generateContent');
await assert.rejects(gateway.generateOnce({source:'proxy',prompt:'hi',proxyConfig:{protocol:'nonsense'}}),/Giao thức Proxy/);

const openrouter=await gateway.generateOnce({source:'openrouter',model:'or',prompt:'hi'});
assert.deepEqual(openrouter,{response:{text:'OK'},reasoning:'WHY'});
const aborted=new AbortController(); aborted.abort(); const count=calls.length;
await assert.rejects(gateway.generateOnce({source:'proxy',prompt:'hi',signal:aborted.signal}),{name:'AbortError'});
await assert.rejects(gateway.testModel({provider:'proxy',model:'p',signal:aborted.signal}),{name:'AbortError'}); assert.equal(calls.length,count);
const pendingController=new AbortController();
const waiting=createGenerationGateway({...deps,createGeminiClient:()=>({models:{generateContent:()=>new Promise(()=>{})}})});
const pending=waiting.generateOnce({source:'gemini',model:'g',prompt:'hi',signal:pendingController.signal}); pendingController.abort();
await assert.rejects(pending,{name:'AbortError'});
const stub={generate:async()=>({text:'x'}),async *stream(){yield {text:'x'};}};
const extra=createProviderRegistry([{id:'new-provider',modelKey:'new_model',adapter:stub}]);
assert.equal(extra.resolve({source:'new-provider',new_model:'future'},undefined,undefined).model,'future');
assert.throws(()=>createProviderRegistry([{id:'p',modelKey:'model',adapter:stub},{id:'p',modelKey:'model',adapter:stub}]),/duplicate/);
console.log('Phase 1 provider contracts, probes, protocols and cancellation: OK');
