import assert from 'node:assert/strict';
import { createSessionWriteQueue, createSessionSaveCoordinator } from '../src/app/persistence/session-save-coordinator.js';
import { runtimeState } from '../src/app/state/runtime-state.js';
import { createConversationService } from '../src/features/chat/conversation-service.js';
import { processAIResponse } from '../src/features/chat/response-processor.js';
import * as arenaState from '../src/features/arena/state-machine.js';
import { chatTurnPolicy } from '../src/features/chat/turn-policy.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const turn = () => new Promise(resolve => setImmediate(resolve));

{
  let state = { sessionId: 'A', value: 1 }, busy = true, timerId = 0;
  const pending = new Map(), records = [], errors = [];
  const queue = createSessionWriteQueue(async record => records.push(record));
  const coordinator = createSessionSaveCoordinator({
    sessionId: 'A', getState: () => state, captureSnapshot: (s, overrides) => ({ ...s, ...overrides }), queue,
    isBusy: () => busy, onError: error => errors.push(error),
    schedule: (fn, ms) => { const id = ++timerId; pending.set(id, { fn, ms }); return id; },
    unschedule: id => pending.delete(id),
  });
  const fire = () => { const [id, {fn, ms}] = pending.entries().next().value; pending.delete(id); fn(); return ms; };
  assert.equal(coordinator.markDirty(), true);
  state = { ...state, value: 2 }; coordinator.markDirty();
  assert.equal(pending.size, 1, 'coalesces timers');
  assert.equal(fire(), 500); assert.equal(records.length, 0);
  busy = false; state = { ...state, value: 3 };
  assert.equal(fire(), 750); await queue.drain();
  assert.deepEqual(records, [{ sessionId: 'A', value: 3 }]);
  coordinator.markDirty(); state = { sessionId: 'B', value: 4 };
  fire(); await queue.drain(); assert.equal(records.length, 1);
  assert.equal(await coordinator.flush({ force: true }), false);
  assert.equal(coordinator.markDirty(), false);
  state = { sessionId: 'A', value: 5 }; coordinator.markDirty(); coordinator.cancelTimer();
  assert.equal(await coordinator.flush(), true); assert.equal(pending.size, 0);
  assert.deepEqual(records.at(-1), state); assert.equal(errors.length, 0);
}

{
  const gate = deferred(); const writes = [];
  const queue = createSessionWriteQueue(async record => {
    writes.push(record); if (record === 1) { await gate.promise; throw Error('write failed'); }
  });
  const first = queue.enqueue(1); const second = queue.enqueue(2);
  const failed = assert.rejects(first, /write failed/);
  await turn(); assert.deepEqual(writes, [1]); gate.resolve();
  await failed; await second; await queue.drain(); assert.deepEqual(writes, [1, 2]);
}

{
  let state = { sessionId: 'A', value: 1 }, attempt = 0;
  const writes = [];
  const coordinator = createSessionSaveCoordinator({ sessionId: 'A', getState: () => state,
    captureSnapshot: s => ({ ...s }), queue: createSessionWriteQueue(async record => {
      if (++attempt === 1) throw Error('quota'); writes.push(record);
    }) });
  coordinator.markDirty(); await assert.rejects(coordinator.flush(), /quota/);
  state = { ...state, value: 2 }; assert.equal(await coordinator.flush(), true);
  assert.deepEqual(writes, [state]);
  await assert.rejects(createSessionSaveCoordinator({sessionId:'A',getState:()=>state,captureSnapshot:()=>({sessionId:'B'}),queue:{enqueue(){throw Error('must not enqueue')}}}).flush({force:true}), /identity mismatch/);
}

function fixture(overrides = {}) {
  runtimeState.invalidateSession('test-start');
  let state = { sessionId: 'A', card: {}, preset: {stream_response:false}, messages: [], variables:{}, worldInfoRuntime:{}, generatedLorebookEntries: [] };
  let serial = 0;
  const events = [];
  const deps = {
    getState: () => state, getSessionRevision: runtimeState.getSessionRevision,
    setError: value => events.push(['error', value]), setLoading: value => { state.loading = value; events.push(['loading', value]); },
    startTurn() {}, addAbortController: runtimeState.add, removeAbortController: runtimeState.remove, runtimeSize: runtimeState.size,
    addMessage: item => state.messages.push(item), updateMessage: (id, patch) => { const item=state.messages.find(x=>x.id===id); if(item)Object.assign(item,patch);events.push(['message',id,patch]); },
    setMessages: value => { state.messages = value; }, setSessionData: patch => { Object.assign(state,patch); events.push(['session',patch]); },
    replaceGlobalVariables: value => events.push(['global',value]), nextSequence: () => ++serial,
    yieldToBrowser: async () => {}, preprocessInput: text => text,
    turnPolicy: { beginTurn: ({content}) => ({userMessage:{id:'u',role:'user',content}}), buildContext:()=>({}),
      compactModelMessages:messages=>({messages,changed:false}), isAbortLike:(err,signal)=>signal.aborted||err?.name==='AbortError',
      createArenaState:()=>({modelA:{modelId:'main',provider:'gemini'},modelB:{modelId:'other',provider:'openrouter'}}) },
    scanWorldInfo: async () => ({activeEntries:[],updatedRuntimeState:{scanned:true}}), logSmartScan(){}, logSelection(){},
    buildPrompt:async()=>({fullPrompt:'prompt',structuredPrompt:[],updatedVariables:{old:true},updatedGlobalVariables:{old:true}}), logPrompt(){},
    createPlaceholderMessage:()=>({id:'m',role:'model',content:'...'}), getConnectionSettings:()=>({source:'gemini',gemini_model:'main'}), getProxyProfiles:()=>[], arenaState,
    generationGateway:{generateOnce:async()=>({response:{text:'done'}}),async *stream(){yield {text:'done'};}},
    liveStream:{publish:(...args)=>events.push(['live',...args]),clear:(...args)=>events.push(['clear',...args])},
    processAIResponse:async (...args)=>events.push(['response',...args]), playSound:(...args)=>events.push(['sound',...args]), logSystemMessage:(...args)=>events.push(['log',...args]),
    ...overrides,
  };
  return { deps, events, getState:()=>state, switchTo(id='B') { runtimeState.invalidateSession(); state={...state,sessionId:id,messages:[{id:'m',content:'NEW'}],variables:{new:true},worldInfoRuntime:{new:true},loading:true}; }, send: text=>createConversationService(deps).send(text) };
}
for (const phase of ['scan','prompt']) {
  const gate=deferred(), entered=deferred(); const f=fixture();
  if(phase==='scan') f.deps.scanWorldInfo=async()=>{entered.resolve();return gate.promise;};
  else f.deps.buildPrompt=async()=>{entered.resolve();return gate.promise;};
  const request=f.send('old'); await entered.promise; f.switchTo(phase==='prompt'?'A':'B');
  const start=f.events.length;
  gate.resolve(phase==='scan'?{activeEntries:[],updatedRuntimeState:{stale:true}}:{fullPrompt:'old',updatedVariables:{stale:true},updatedGlobalVariables:{stale:true}});
  assert.equal(await request,false); assert.equal(f.getState().messages[0].content,'NEW'); assert.deepEqual(f.getState().variables,{new:true});
  assert.deepEqual(f.getState().worldInfoRuntime,{new:true}); assert.equal(f.getState().loading,true);
  assert.deepEqual(f.events.slice(start),[],'no stale commits after session revision change');
}

{
  const gate=deferred(), entered=deferred(); let signal;
  const f=fixture({generationGateway:{generateOnce:args=>{signal=args.signal;entered.resolve();return gate.promise;}}});
  const request=f.send('old'); await entered.promise; assert.equal(signal.aborted,false);
  runtimeState.abortAll(); assert.equal(await request,false); assert.equal(signal.aborted,true); assert.equal(f.getState().loading,false);
  assert.equal(f.getState().messages.at(-1).content,''); gate.resolve({response:{text:'late'}}); await turn();
  assert.equal(f.getState().messages.at(-1).content,''); assert.ok(!f.events.some(event=>event[0]==='response'));
}

{
  const entered=deferred(); const pending=deferred(); let returned=0;
  const f=fixture({generationGateway:{stream:()=>({[Symbol.asyncIterator](){let n=0;return {next(){if(n++===0)return Promise.resolve({value:{text:'partial'}});entered.resolve();return pending.promise;},return(){returned++;return Promise.resolve({done:true});}};}})}});
  f.getState().preset.stream_response=true;
  const request=f.send('old'); await entered.promise; runtimeState.abortAll(); assert.equal(await request,false);
  assert.equal(returned,1); assert.equal(f.getState().messages.at(-1).content,'partial'); assert.equal(f.getState().loading,false);
  pending.resolve({value:{text:'late'}}); await turn(); assert.equal(f.getState().messages.at(-1).content,'partial');
}

{
  const entered=deferred(), pending=deferred(), signals=[];
  const f=fixture({generationGateway:{stream:({signal})=>{signals.push(signal);if(signals.length===2)entered.resolve();return {[Symbol.asyncIterator](){return {next:()=>pending.promise,return:async()=>({done:true})};}};}}});
  f.getState().isArenaMode=true;f.getState().arenaModelId='other';
  const request=f.send('arena'); await entered.promise; f.switchTo(); assert.equal(await request,false); assert.ok(signals.every(s=>s.aborted));
  assert.equal(f.getState().messages[0].content,'NEW'); assert.equal(f.getState().loading,true); assert.equal(runtimeState.size(),0);
  pending.resolve({done:true});
}

{
  const gate=deferred(); const writes=[]; let state={sessionId:'A',messages:[{id:'m'}],card:{rpg_data:{settings:{executionMode:'integrated'}}}};
  const request=processAIResponse({messageId:'m',content:'long enough response for this test',forced:true},{getState:()=>state,getSessionRevision:runtimeState.getSessionRevision,
    processOutput:()=>gate.promise,logSystemMessage(){},logResponse:()=>writes.push('log'),parseRpgActions:()=>{writes.push('rpg');return [];}});
  runtimeState.invalidateSession();state={...state,sessionId:'B'};gate.resolve();await request;assert.deepEqual(writes,[]);
}
console.log('P05/P06 session lifecycle, autosave queue, abort and stale response boundaries: OK');

{
  let revision=1, state={sessionId:'A',value:1}, fired;const records=[];
  const queue=createSessionWriteQueue(async record=>records.push(record));
  const coordinator=createSessionSaveCoordinator({sessionId:'A',getState:()=>state,getRevision:()=>revision,captureSnapshot:s=>({...s}),queue,schedule:fn=>{fired=fn;return 1;},unschedule(){}});
  coordinator.markDirty();revision++;state={sessionId:'A',value:2};fired();await queue.drain();
  assert.deepEqual(records,[]);assert.equal(await coordinator.flush({force:true}),false);
  coordinator.markDirty();await coordinator.flush();assert.deepEqual(records,[state]);
}

{
  const f=fixture();const requestArgs=[];let promptInput;
  Object.assign(f.getState(),{card:{char_book:{entries:[{uid:'a'},{uid:'unused'}]}},generatedLorebookEntries:[{uid:'g'}],messages:[{id:'u',role:'user'},{id:'m',role:'model',activeLorebookUids:['a','b','g'],arena:{modelA:{provider:'proxy',modelId:'old-model',profileId:'old-profile',content:'before'},modelB:{content:'keep'}}}]});
  f.deps.getProxyProfiles=()=>[{id:'old-profile',url:'https://example.invalid',protocol:'google_native'}];
  f.deps.getLorebooks=()=>[{book:{entries:[{uid:'b'},{uid:'unused2'}]}}];
  f.deps.buildPrompt=async input=>{promptInput=input;return {fullPrompt:'retry',updatedVariables:{retry:1},updatedGlobalVariables:{retry:2}};};
  f.deps.generationGateway={async *stream(args){requestArgs.push(args);yield {text:'part'};yield {text:'replacement',replaceText:true};}};
  const service=createConversationService(f.deps);assert.equal(await service.retryArena('m','A'),true);
  const [args]=requestArgs;assert.equal(args.source,'proxy');assert.equal(args.model,'old-model');assert.equal(args.proxyConfig.protocol,'google_native');assert.equal(args.prompt,'retry');
  assert.deepEqual(promptInput.activeEntries.map(x=>x.uid),['a','b','g']);assert.deepEqual(promptInput.messages.map(x=>x.id),['u']);
  assert.deepEqual(f.getState().variables,{retry:1});assert.ok(f.events.some(e=>e[0]==='global'&&e[1].retry===2));
  const arena=f.getState().messages[1].arena;assert.equal(arena.modelA.content,'replacement');assert.equal(arena.modelA.status,'success');assert.equal(arena.modelA.completed,true);assert.equal(arena.modelB.content,'keep');
  assert.equal(runtimeState.size(),0);assert.equal(f.getState().loading,false);
}

{
  const f=fixture();const paint=deferred();let promptCalled=false;
  f.getState().messages=[{id:'m',arena:{modelA:{provider:'gemini',modelId:'main'},modelB:{}}}];
  f.deps.yieldToBrowser=()=>paint.promise;f.deps.buildPrompt=async()=>{promptCalled=true;};
  const request=createConversationService(f.deps).retryArena('m','A');assert.equal(runtimeState.size(),1);runtimeState.abortAll();paint.resolve();
  assert.equal(await request,false);assert.equal(promptCalled,false);assert.equal(f.getState().messages[0].arena.modelA.status,'stopped');assert.equal(f.getState().messages[0].arena.modelA.completed,true);
}
console.log('Arena retry shared stream, original model/profile, lorebook, early cancellation, same-ID autosave: OK');

{
  const connection={source:'aistudio',aistudio_model:'native-model',openrouter_model:'wrong-model'};
  const arena=chatTurnPolicy.createArenaState(connection,{arenaModelId:'challenger'});
  assert.equal(arena.modelA.modelId,'native-model');
  assert.equal(arenaState.prepareRetry({modelA:{},modelB:{}},'A',connection).model,'native-model');
}
