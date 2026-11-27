import { portableCompositionPaths } from './helpers/composition-paths.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EMBEDDING_DATABASE, createEmbeddingIndexRepository } from '../src/features/world-info/embedding-index-repository.js';
import { createEmbeddingService, getEmbeddingProvider, buildEmbeddingEntryText, hashEmbeddingText } from '../src/features/world-info/embedding-service.js';
import { scanWorldInfo } from '../src/features/world-info/smart-scan-service.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
assert.deepEqual(EMBEDDING_DATABASE, { name:'LorebookEmbeddingsDB', version:2, store:'embeddings' });

let tx, readRequest, openRequest, closeCount = 0, writes = [], failPut = false;
const db = {
  close() { closeCount++; },
  transaction(stores, mode) {
    assert.deepEqual(stores, ['embeddings']); writes = [];
    tx = { mode, abort() { this.onabort(); }, objectStore(name) {
      assert.equal(name, 'embeddings');
      return { index(index) { assert.equal(index, 'characterId'); return { getAll(id) { assert.equal(id, 'card'); return readRequest = {}; } }; },
        delete(id) { writes.push(['delete',id]); }, put(record) { if (failPut) throw Error('DataCloneError'); writes.push(['put',record.id]); } };
    } }; return tx;
  },
};
const repo = createEmbeddingIndexRepository({indexedDB:{open(name,version) {
  assert.equal(name, EMBEDDING_DATABASE.name); assert.equal(version,2);
  openRequest = {result:db}; queueMicrotask(() => openRequest.onsuccess()); return openRequest;
}}});
const read = repo.listByCharacter('card'); await tick();
assert.equal(tx.mode,'readonly'); let settled = false; read.then(() => { settled = true; });
readRequest.result = [{id:'a'}]; readRequest.onsuccess(); await tick();
assert.equal(settled,false); assert.equal(closeCount,0);
tx.oncomplete(); assert.deepEqual(await read,[{id:'a'}]); assert.equal(closeCount,1);
const replace = repo.replace([{id:'a'},{id:'b'}],[{id:'b'},{id:'c'}]); await tick();
assert.deepEqual(writes,[['delete','a'],['put','b'],['put','c']]);
tx.oncomplete(); await replace; assert.equal(closeCount,2);
const deletion = repo.replace([{id:'b'}],[]); await tick();
assert.deepEqual(writes,[['delete','b']]); tx.error = Error('QuotaExceededError'); tx.onabort();
await assert.rejects(deletion,/QuotaExceededError/); assert.equal(closeCount,3);
failPut = true;
await assert.rejects(repo.replace([{id:'a'}],[{id:'new'}]),/DataCloneError/);
assert.deepEqual(writes,[['delete','a']]); assert.equal(closeCount,4);
await repo.replace([],[]); assert.equal(closeCount,4);

const entry = {uid:'u',name:'Dragon',keys:['fire','gate'],content:'Lore text'};
const text = 'Name: Dragon | Keys: fire, gate | Content: Lore text';
assert.equal(buildEmbeddingEntryText(entry),text);
assert.equal(await hashEmbeddingText(text),createHash('sha256').update(text).digest('hex'));
const gemini = getEmbeddingProvider('gemini');
const offline = getEmbeddingProvider('embeddinggemma');
let providerId = 'gemini', resolveRead;
const records = [
  {id:'card::u_0',uid:'u',characterId:'card',vector:[1,0]},
  {id:'card::embeddinggemma::u_0',uid:'u',characterId:'card',provider:offline.id,indexKey:offline.indexKey,vector:[0,1]},
  {id:'stale',uid:'u',characterId:'card',provider:offline.id,indexKey:'old',vector:[1,1]},
];
const svc = createEmbeddingService({ getSettings:() => ({embedding_provider:providerId}), indexRepository:{listByCharacter:()=>new Promise(resolve => {resolveRead=resolve;})} });
const loading = svc.loadIndex('card','gemini'); providerId = 'embeddinggemma'; resolveRead(records); await loading;
assert.deepEqual(svc.getIndex('card','gemini'),[records[0]]);
assert.deepEqual(svc.getIndex('card'),[]);
const localLoading = svc.loadIndex('card'); resolveRead(records); await localLoading;
assert.deepEqual(svc.getIndex('card'),[records[1]]);
assert.deepEqual(svc.getIndex('card','gemini'),[records[0]]);

const calls = [];
const input = {scanInput:'dragon',card:{fileName:'card',char_book:{entries:[entry]}},worldInfoState:{},worldInfoRuntime:{},worldInfoPinned:{},preset:{},promptHistory:[],variables:{},generatedEntries:[],sequence:1};
providerId = 'gemini';
await scanWorldInfo(input,{
  getSettings:()=>({enabled:true,mode:'semantic',embedding_provider:providerId,semantic_threshold:.5}),
  embed:async(query,id)=>{calls.push(['embed',id]); providerId='embeddinggemma'; return [1,0];},
  loadIndex:async(card,id)=>{calls.push(['load',id]);},
  getIndex:(card,id)=>{calls.push(['get',id]);return svc.getIndex(card,id);},
  cosine:svc.cosine,resolveWorldInfo:(...args)=>{assert.deepEqual(args[5],['u']);return {activeEntries:[entry]};},
});
assert.deepEqual(calls,[['embed','gemini'],['load','gemini'],['get','gemini']]);

const synced = [], requests = [];
providerId='gemini';
const sync = createEmbeddingService({
  getSettings:()=>({enabled:true,mode:'semantic',embedding_provider:providerId}),
  getGeminiApiKey:()=> 'test',
  createGeminiClient:()=>({models:{embedContent:async request=>{requests.push(request);return {embeddings:[{values:[1,0]}]};}}}),
  logSystemMessage:()=>{providerId='embeddinggemma';},
  indexRepository:{listByCharacter:async()=>records,replace:async(old,next)=>synced.push({old,next})},
});
await sync.syncIndex('card',[entry]);
assert.equal(requests[0].model,gemini.modelId);
assert.deepEqual(synced[0].old,[records[0]]);
assert.equal(synced[0].next[0].id,'card::u_0');
assert.equal(synced[0].next[0].indexKey,gemini.indexKey);
assert.equal(synced[0].next[0].contentHash,await hashEmbeddingText(text));
assert.deepEqual(sync.getIndex('card','gemini'),synced[0].next);
assert.deepEqual(sync.getIndex('card','embeddinggemma'),[]);

providerId='gemini';
const failing = createEmbeddingService({
  getSettings:()=>({enabled:true,mode:'semantic',embedding_provider:'gemini'}),getGeminiApiKey:()=> 'test',
  createGeminiClient:()=>({models:{embedContent:async()=>({embeddings:[{values:[1,0]}]})}}),logSystemMessage(){},
  indexRepository:{listByCharacter:async()=>records,replace:async()=>{throw Error('commit failure');}},
});
await assert.rejects(failing.syncIndex('card',[entry]),/commit failure/);
assert.deepEqual(failing.getIndex('card','gemini'),[records[0]]);

const production=portableCompositionPaths.map(p=>readFileSync(new URL(p,import.meta.url),'utf8')).join('\n');
assert.ok(!production.includes('Pc=new Map,Mc=new Map'));
assert.ok(!production.includes('indexedDB.open("LorebookEmbeddingsDB",2)'));
for (const alias of ['cosineSimilarity=__stsEmbeddingService.cosine','hashEmbeddingText=__stsEmbeddingService.hashText','getEmbeddingEntryText=__stsEmbeddingService.entryText']) assert.ok(production.includes(alias));
console.log('P07 embedding ownership, provider snapshots, hash parity and transaction protocol: OK');
