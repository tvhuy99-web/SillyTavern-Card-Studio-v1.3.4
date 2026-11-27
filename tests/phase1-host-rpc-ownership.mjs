import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHostRpcDispatcher } from '../src/runtime/card-runtime/host/rpc-dispatcher.js';
import { createChatRpcHandlers, CHAT_RPC_METHODS } from '../src/runtime/card-runtime/host/chat-rpc.js';
import { createRuntimeGenerationTasks, createRuntimeGenerationService } from '../src/runtime/card-runtime/host/generation-tasks.js';
import { runtimeState } from '../src/app/state/runtime-state.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const makeFrame = () => ({ responses: [], postMessage(message, origin) { assert.equal(origin, '*'); this.responses.push(message); } });
const a = makeFrame(), b = makeFrame(), foreign = makeFrame();
const active = new Set([a,b]);
let revision = 1, sessionId = 'chat', executionCount = 0, diagnoseCount = 0;
const transportErrors = [];
const dispatcher = createHostRpcDispatcher({ isActiveSource: frame => active.has(frame), getSessionRevision: () => revision, getSessionId: () => sessionId,
  validatePayload(value) { if (JSON.stringify(value ?? null).length > 500) throw new Error('oversized'); }, clone: structuredClone, onTransportError: error => transportErrors.push(error) });
const event = (source, requestId, method = 'chat.get', args = {}) => ({ source, data: { type: 'CARD_RUNTIME_RPC', requestId, method, args } });
let gate = deferred();
const actions = { execute: async (_request, _source, lease) => { executionCount++; const result = await gate.promise; lease.assertCurrent(); return result; }, diagnose: error => { diagnoseCount++; return {message:error.message}; } };
assert.equal(await dispatcher.dispatch(event(foreign, '1'), actions), false);
assert.equal(await dispatcher.dispatch(event(a, 1), actions), false);
const first = dispatcher.dispatch(event(a, '1'), actions);
assert.equal(await dispatcher.dispatch(event(a, '1'), actions), true);
const other = dispatcher.dispatch(event(b, '1'), actions);
assert.equal(executionCount,2); gate.resolve({ok:'data'}); await Promise.all([first, other]);
assert.equal(a.responses.length,1); assert.equal(b.responses.length,1);
assert.equal(a.responses[0].ok,true); assert.deepEqual(a.responses[0].result,{ok:'data'});
await dispatcher.dispatch(event(a,'1'),actions); assert.equal(executionCount,2);
await dispatcher.dispatch(event(a,'invalid',{},{}),actions);
await dispatcher.dispatch(event(a,'invalid-args','chat.get','text'),actions);
await dispatcher.dispatch(event(a,'large','chat.get',{text:'x'.repeat(501)}),actions);
assert.equal(executionCount,2); assert.equal(diagnoseCount,3);
assert.equal(a.responses.at(-1).error,'oversized');
gate = deferred(); const stale = dispatcher.dispatch(event(a,'stale'), actions); revision++; gate.resolve('stale'); await stale;
assert.equal(a.responses.at(-1).ok,false); assert.match(a.responses.at(-1).error,/inactive/); assert.equal(diagnoseCount,3);
gate = deferred(); const detached = dispatcher.dispatch(event(b,'detached'),actions); active.delete(b); gate.resolve('old'); await detached;
assert.equal(b.responses.length,1); assert.equal(diagnoseCount,3);
gate = deferred(); const switched = dispatcher.dispatch(event(a,'switched'),actions); sessionId='other'; gate.reject(new Error('old failure')); await switched;
assert.equal(a.responses.at(-1).ok,false); assert.equal(diagnoseCount,3);
const bad = makeFrame(); active.add(bad); bad.postMessage=()=>{throw new Error('closed window')};
gate = deferred(); gate.resolve('ok'); await dispatcher.dispatch(event(bad,'send'),actions); assert.equal(transportErrors.length,1);
await dispatcher.dispatch(event(a,'diagnostic-fails'),{execute(){throw new Error('domain error')}, diagnose(){throw new Error('logging error')}});
assert.equal(transportErrors.length,2); assert.equal(a.responses.at(-1).error,'domain error');

let state = { messages: [{id:'one',role:'user',content:'one',timestamp:1}, {id:'two',role:'model',content:'two',is_hidden:true,timestamp:2}], persona:{name:'P'}, card:{name:'C'} };
let writes=0, ids=0;
const toChatMessage = (message,index,user,character,swipes) => ({...message,message_id:index, message:message.content, user, character, swipesIncluded:swipes});
const resolveIndex = (value,length) => value === undefined || value === 'latest' ? length-1 : Number(value)<0 ? length+Number(value) : Number(value);
const handlers = createChatRpcHandlers({ readState:()=>state, persistMessages:async messages=>{writes++; state={...state,messages}; return messages.map((message,index)=>toChatMessage(message,index,'P','C',true));}, resolveIndex, resolveRange:(value,length)=>value===undefined?Array.from({length},(_,i)=>i):[resolveIndex(value,length)], toChatMessage, normalizeRole:role=>role==='assistant'?'model':role||'user', isRecord:value=>value!==null&&typeof value==='object'&&!Array.isArray(value), clone:structuredClone, now:()=>100, makeId:()=>`new-${++ids}` });
assert.equal(CHAT_RPC_METHODS.length,5);
assert.equal((await handlers('chat.get',{option:{hide_state:'hidden',include_swipes:true}}))[0].id,'two');
const inserted = await handlers('chat.create',{messages:[{role:'assistant',message:'inserted',data:{x:1},swipes:['a','b'],swipe_id:1}],option:{insert_before:1}});
assert.equal(inserted.messageId,1); assert.equal(inserted.messages[0].id,'new-1'); assert.deepEqual(state.messages.map(x=>x.id),['one','new-1','two']);
const empty = await handlers('chat.create',{messages:[]}); assert.deepEqual(empty.messages,[]);
await handlers('chat.set',{messages:[{message_id:-1,message:'changed',swipes:['a'],swipe_id:9,extra:{test:true}}]});
assert.equal(state.messages.at(-1).content,'changed'); assert.equal(state.messages.at(-1).swipe_id,0); assert.equal(state.messages.at(-1).timestamp,2);
await handlers('chat.rotate',{begin:0,middle:1,end:3}); assert.deepEqual(state.messages.map(x=>x.id),['new-1','two','one']);
await handlers('chat.delete',{messageIds:[-1]}); assert.deepEqual(state.messages.map(x=>x.id),['new-1','two']);
const before=writes; await assert.rejects(handlers('chat.rotate',{begin:1,middle:0,end:2}),/bounds/); await assert.rejects(handlers('chat.set',{messages:[]},{assertCurrent(){throw Error('stale')}}),/stale/); assert.equal(writes,before);
await assert.rejects(handlers('__proto__',{}),/Unsupported/);

const tasks=createRuntimeGenerationTasks({register:runtimeState.add,unregister:runtimeState.remove});
const c1=tasks.start(a,'same'), c2=tasks.start(b,'same');
assert.throws(()=>tasks.start(a,'same'),/Duplicate/); assert.equal(runtimeState.size(),2);
assert.equal(tasks.stop(a,'same'),true); assert.equal(c1.signal.aborted,true); assert.equal(c2.signal.aborted,false);
assert.equal(tasks.stop(a,'missing'),false); tasks.finish(a,'same',c1); assert.equal(runtimeState.size(),1);
const c3=tasks.start(a,'same'); tasks.finish(a,'same',c1); assert.equal(runtimeState.size(),2);
tasks.stopAll(a); assert.equal(c3.signal.aborted,true); assert.equal(c2.signal.aborted,false);
runtimeState.invalidateSession(); assert.equal(c2.signal.aborted,true); assert.equal(runtimeState.size(),0);
tasks.dispose(); assert.equal(tasks.stop(b,'same'),false);

const events = [], requests = [];
let promptGate = deferred(), providerGate = deferred(), leaseCurrent = true, committed = 0;
const lease = { assertCurrent() { if (!leaseCurrent) throw Error('inactive session'); } };
const genTasks = createRuntimeGenerationTasks({register:runtimeState.add,unregister:runtimeState.remove});
const generate = createRuntimeGenerationService({ tasks:genTasks,
  buildPrompt:async (_raw,_options,assertCurrent)=>{ const prompt=await promptGate.promise; assertCurrent(); committed++; return prompt; },
  resolvePreset:()=>({temp:0}), generateOnce:request=>{requests.push(request); return providerGate.promise;},
  stream:async function* (request){requests.push(request); yield {text:'A'}; yield {text:'B'};},
  emit:(_source,event,args)=>events.push({event,args}), readMessageCount:()=>3 });
const tick = () => new Promise(resolve=>setImmediate(resolve));
const pendingPrompt = generate(a,false,{generation_id:'prompt'},lease);
await tick(); assert.equal(runtimeState.size(),1);
runtimeState.invalidateSession(); leaseCurrent=false; await assert.rejects(pendingPrompt,/stopped|inactive/);
promptGate.resolve('late prompt'); await tick(); assert.equal(committed,0); assert.equal(requests.length,0); assert.equal(runtimeState.size(),0);
leaseCurrent=true; promptGate=deferred(); promptGate.resolve('prompt');
const pendingProvider=generate(a,false,{generation_id:'provider',custom_api:{apiurl:'https://example.invalid',key:'key',model:'model'}},lease);
await tick(); assert.equal(requests.length,1); assert.equal(requests[0].source,'proxy'); assert.equal(requests[0].proxyConfig.password,'key'); assert.equal(requests[0].model,'model');
genTasks.stop(a,'provider'); await assert.rejects(pendingProvider,/stopped/); providerGate.resolve({response:{text:'late'}}); await tick();
assert.equal(events.some(e=>e.event==='generation_ended'),false); assert.equal(runtimeState.size(),0);
assert.equal(await generate(a,true,{generation_id:'stream',should_stream:true,custom_api:{source:'openrouter'}},lease),'AB');
assert.equal(requests.at(-1).source,'openrouter'); assert.deepEqual(events.filter(e=>e.event==='js_stream_token_received_fully').map(e=>e.args[0]),['A','AB']);
assert.deepEqual(events.at(-1),{event:'generation_ended',args:[2]});
const hung=deferred(); let returned=0;
const hangGenerate=createRuntimeGenerationService({tasks:genTasks,buildPrompt:async()=> 'prompt',resolvePreset:()=>({}),generateOnce:()=>{},stream:()=>({[Symbol.asyncIterator](){return {next:()=>hung.promise,return(){returned++;return new Promise(()=>{});}}}}),emit:()=>{},readMessageCount:()=>0});
const hungRequest=hangGenerate(a,false,{generation_id:'hung',stream:true},lease); await tick(); genTasks.stop(a,'hung'); await assert.rejects(hungRequest,/stopped/); assert.equal(returned,1); assert.equal(runtimeState.size(),0);
hung.resolve({done:false,value:{text:'late'}}); await tick();

const production=readRecoveredHostView();
for(const marker of ['dispatcher.dispatch(message, { execute, diagnose })','chat: chatRpc','Card prompt state changed during construction.','createRuntimeGenerationService({ tasks, buildPrompt: (raw, options, assertCurrent, source)','tasks.stopAll(source)','tasks.dispose()']) assert.ok(production.includes(marker),marker);
assert.ok(!production.includes('let e=await x(n,t.source)'));
assert.ok(!production.includes('case"chat.create":{let e='));
assert.ok(!production.includes('h.current.set(r,a),Jh(e,"js_generation_started"'));
console.log('Host RPC ownership, replay window, session lease, message mutations and per-frame generation: OK');
