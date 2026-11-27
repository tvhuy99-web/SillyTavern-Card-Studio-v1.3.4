import assert from 'node:assert/strict';
import { createModelCatalog, resolveCatalogTarget, refreshDialogProxyCatalog } from '../src/providers/common/model-catalog.js';
import { createMemoryStorage } from '../src/providers/proxy/persistence.js';
import { createHostRpcDispatcher, authorizeFrameRpc, createFrameIdentityReader, SAFE_RPC_METHODS, FULL_ONLY_RPC_METHODS } from '../src/runtime/card-runtime/host/rpc-dispatcher.js';
import { HOST_RPC_METHODS } from '../src/runtime/card-runtime/host/method-router.js';
import { createRuntimePromptBuilder } from '../src/runtime/card-runtime/host/runtime-prompt.js';
import { useSmartContext } from '../src/features/chat/hooks/use-smart-context.js';
import { runtimeState } from '../src/app/state/runtime-state.js';
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const storage=createMemoryStorage({sillyTavernStudio_proxyModels:JSON.stringify({'https://same.test':[{id:'unsafe-old'}]})});
const targetA={id:'a',url:'https://same.test',password:'a-key',protocol:'openai',legacyMode:false};
const targetB={...targetA,id:'b',password:'b-key',protocol:'google_native'};
const global={url:'https://global.test',password:'global-key',protocol:'openai'};
assert.deepEqual(resolveCatalogTarget({profileId:'b',profiles:[targetA,targetB],global}),targetB);
assert.throws(()=>resolveCatalogTarget({profileId:'missing',profiles:[targetA],global}),/không còn tồn tại/);
let a=defer();const calls=[];
const catalog=createModelCatalog({storage,normalizeProxyUrl:s=>s,request:async(url,init)=>{calls.push({url,headers:init.headers});return url.endsWith('/v1/models')?a.promise:Response.json({models:[{name:'models/native',displayName:'Native',supportedGenerationMethods:['generateContent']}]});}});
assert.deepEqual(catalog.readProxyTarget(targetA),[]);
const displayed=[];let current=true;const controller=new AbortController();
const pending=refreshDialogProxyCatalog({catalog,target:targetA,signal:controller.signal,isCurrent:()=>current,publish:x=>displayed.push(x)});
current=false;controller.abort();
await refreshDialogProxyCatalog({catalog,target:targetB,isCurrent:()=>true,publish:x=>displayed.push(x)});
a.resolve(Response.json({data:[{id:'old-account'}]}));await pending;
assert.deepEqual(catalog.readProxyTarget(targetA),[]);assert.equal(displayed.at(-1)[0].id,'native');
assert.equal(calls[0].headers.Authorization,'Bearer a-key');assert.equal(calls[1].headers['x-goog-api-key'],'b-key');assert.match(calls[1].url,/v1beta\/models/);
assert.ok(!JSON.stringify(storage.toJSON()).includes('native'));

const methods=[...SAFE_RPC_METHODS,...FULL_ONLY_RPC_METHODS];assert.equal(new Set(methods).size,53);assert.deepEqual(methods.sort(),[...HOST_RPC_METHODS].sort());
const safe={hasAttribute:()=>true},full={hasAttribute:()=>false};
const state={card:{name:'Hero',char_book:{name:'Embedded'}}};
for(const method of FULL_ONLY_RPC_METHODS){assert.throws(()=>authorizeFrameRpc({method,args:{}},safe,state),/Full compatibility/);assert.doesNotThrow(()=>authorizeFrameRpc({method,args:{}},full,state));}
for(const method of SAFE_RPC_METHODS)assert.doesNotThrow(()=>authorizeFrameRpc({method,args:{}},safe,state));
for(const type of ['global','preset','character','extension'])assert.throws(()=>authorizeFrameRpc({method:'variables.replace',args:{option:{type}}},safe,state),/Full compatibility/);
assert.throws(()=>authorizeFrameRpc({method:'lorebook.entries.create',args:{name:'External'}},safe,state),/Full compatibility/);
assert.throws(()=>authorizeFrameRpc({method:'unknown',args:{}},safe,state),/Full compatibility/);

const source={responses:[],postMessage(message){this.responses.push(message);}};let doc='old';const frame={getAttribute:key=>key==='srcdoc'?doc:null};
const identity=createFrameIdentityReader(()=>frame);const dispatcher=createHostRpcDispatcher({isActiveSource:()=>true,getFrameIdentity:identity,getSessionRevision:()=>1,getSessionId:()=> 's',validatePayload(){},clone:structuredClone});
const send=()=>dispatcher.dispatch({source,data:{type:'CARD_RUNTIME_RPC',requestId:'same',method:'chat.get',args:{}}},{execute:()=>doc});
await send();await send();assert.equal(source.responses.length,1);doc='new';await send();assert.equal(source.responses.length,2);assert.equal(source.responses.at(-1).result,'new');

let live={sessionId:'s',card:{name:'Hero'},preset:{},messages:[],variables:{x:1},visualState:{},longTermSummaries:[]};let writes=0,globalWrites=0;live.setSessionData=patch=>{writes++;live={...live,...patch};};let gate=defer();
const build=createRuntimePromptBuilder({readState:()=>live,readLorebooks:()=>[],resolvePreset:()=>live.preset,turnPolicy:{modelContextContent:m=>m.content},baseSections:()=>({baseSections:[]}),buildPrompt:()=>gate.promise,readContextSettings:()=>({}),writeGlobalVariables:()=>globalWrites++,publish(){}});
const run=build(false,{user_input:'hello'},()=>{}, {allowGlobalWrites:false});gate.resolve({fullPrompt:'prompt',updatedVariables:{x:2},updatedGlobalVariables:{bad:1}});assert.equal(await run,'prompt');assert.equal(globalWrites,0);assert.equal(writes,1);
gate=defer();const obsolete=build(false,{user_input:'hello'},()=>{});live={...live,variables:{x:9}};gate.resolve({fullPrompt:'old',updatedVariables:{x:0}});await assert.rejects(obsolete,/state changed/);assert.equal(live.variables.x,9);

let summaryState={sessionId:'s',card:{name:'Hero'},messages:[{id:'u',role:'user',content:'user'},{id:'m',role:'model',content:'reply'}],longTermSummaries:[],summaryQueue:[],isSummarizing:false};summaryState.setSessionData=patch=>{summaryState={...summaryState,...patch};};let size=1;const ol=()=>summaryState;ol.getState=()=>summaryState;gate=defer();const summary=useSmartContext({sessionStore:ol,react:{useCallback:f=>f},__stsRuntimeState:runtimeState,getSmartContextSettings:()=>({summarization_chunk_size:size}),dispatchSystemLog(){},generateSummary:()=>gate.promise});const task=summary.triggerSummarization();await Promise.resolve();size=2;gate.resolve('stale summary');await task;assert.deepEqual(summaryState.longTermSummaries,[]);assert.deepEqual(summaryState.summaryQueue,[]);assert.equal(summaryState.isSummarizing,false);
console.log('D3: scoped dialog cache, 53-method permissions, frame replay, prompt and summary ownership PASS');
