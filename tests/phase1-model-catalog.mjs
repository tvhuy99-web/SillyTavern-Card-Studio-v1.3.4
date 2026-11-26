import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAiStudioModelCatalog } from '../src/providers/aistudio/model-catalog.js';
import { createMemoryStorage } from '../src/providers/proxy/persistence.js';
const storage=createMemoryStorage();
const host={localStorage:storage,Capacitor:{nativePromise:async(plugin,method)=>{
  assert.equal(plugin,'AIStudioText'); assert.equal(method,'listModels');
  return {models:[{id:'gemini-z'},{id:'gemini-2.5-pro'},{id:'gemini-2.5-pro',name:'Pro'},{id:'gemini-embedding-001'}],scanCount:3};
}}};
const catalog=createAiStudioModelCatalog(host);
assert.deepEqual(catalog.read(),[]);
const {models,response}=await catalog.load(); assert.equal(response.scanCount,3);
assert.deepEqual(models,[{id:'gemini-2.5-pro',name:'Pro'}]); assert.deepEqual(catalog.read(),models);
catalog.clear(); assert.deepEqual(catalog.read(),[]);
host.Capacitor.nativePromise=async()=>({models:[]}); await assert.rejects(catalog.load(),/AI_STUDIO_MODEL_EMPTY/);
let complete; host.Capacitor.nativePromise=()=>new Promise(resolve=>{complete=resolve;});
await assert.rejects(createAiStudioModelCatalog(host,{timeoutMs:5}).load(),/AI_STUDIO_MODEL_TIMEOUT/);
complete({models:[{id:'gemini-2.5-pro'}]}); await new Promise(resolve=>setTimeout(resolve,10));
assert.deepEqual(catalog.read(),[],'late native result after timeout must not mutate cache');
const production=(await Promise.all(['../assets/app-production-v1.3.6.js','../assets/recovered/app/composition/persistence-composition.js','../assets/recovered/app/composition/provider-composition.js','../assets/recovered/app/composition/store-composition.js','../assets/recovered/app/composition/conversation-composition.js','../assets/recovered/app/composition/runtime-composition.js','../assets/recovered/app/composition/ui-composition.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')))).join('\n');
assert.ok(!production.includes('window.__STS_MODEL_CONNECTION_TEST__'));
assert.ok(production.includes('testModel:__stsGenerationGateway.testModel'));
assert.ok(production.includes('__stsModelTestButton=__stsCreateModelTestButton(jsxRuntime,React)'));
const sections=(await Promise.all(['gemini-section.js','openrouter-section.js','aistudio-section.js','proxy-section.js'].map(f=>readFile(new URL('../assets/m6/ui/settings/provider-sections/'+f,import.meta.url),'utf8')))).join('\n');
for (const field of ['aistudio_model','aistudio_tool_model','proxy_model','proxy_tool_model']) {
  const provider=field.startsWith('aistudio')?'aistudio':'proxy';
  assert.match(sections,new RegExp(`ModelSelect,\\s*\\{\\s*provider: "${provider}", label: "(?:Chat|Tool) Model ID", value: settings\\.${field}`));
}
assert.ok(production.includes('ModelSelect=__stsCreateModelSelect(jsxRuntime,React)'));
const controls=await readFile(new URL('../assets/m6/ui/components/form-controls.js',import.meta.url),'utf8');
assert.ok(controls.includes("'data-sts-provider': provider"));
assert.ok(production.includes('connections:__stsConnections,catalog:__stsCatalog'));
assert.ok(!production.includes('Wo={...__stsConnectionDefaults}'));
console.log('Phase 1 model catalog, timeout and production wiring: OK');
// Multiple screen instances must not launch simultaneous native scans.
let scanCount=0,resolveScan;host.Capacitor.nativePromise=()=>{scanCount++;return new Promise(resolve=>resolveScan=resolve);};
const sharedA=catalog.load(),sharedB=createAiStudioModelCatalog(host).load();assert.equal(sharedA,sharedB);assert.equal(scanCount,1);
resolveScan({models:[{id:'gemini-2.5-pro'}]});await sharedA;assert.equal(catalog.read().length,1);
const stale=catalog.load();catalog.clear();resolveScan({models:[{id:'gemini-2.5-pro'}]});await assert.rejects(stale,/STALE/);assert.deepEqual(catalog.read(),[]);
