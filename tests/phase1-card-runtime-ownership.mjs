import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRpcClient } from '../src/runtime/card-runtime/bridge/rpc-client.js';
import { buildCardRuntimeCoreScript } from '../src/runtime/card-runtime/core-builder.js';

function clock() {
  let id = 0;
  const tasks = new Map();
  return { tasks, schedule(fn, ms) { tasks.set(++id, { fn, ms }); return id; }, cancel(id) { tasks.delete(id); }, run(ms) { for (const [key, task] of [...tasks]) if (task.ms === ms && tasks.delete(key)) task.fn(); } };
}
{
  const timer = clock(), sent = [], timeouts = [];
  let id = 0, fail = false;
  const client = createRpcClient({ send(message) { if (fail) throw new Error('send failed'); sent.push(message); }, makeId: () => String(++id), readContext: () => ({ chatId: 'chat' }), clone: structuredClone, onTimeout: (...args) => timeouts.push(args), schedule: timer.schedule, cancel: timer.cancel });
  const a = client.request('a', { text: 'hello' });
  const b = client.request('b', null, 1);
  assert.deepEqual(sent[0], { type: 'CARD_RUNTIME_RPC', requestId: '1', method: 'a', args: { text: 'hello' }, context: { chatId: 'chat' } });
  assert.equal(client.receive({type:'other', requestId:'1', ok:true}), false);
  assert.equal(client.receive({type:'CARD_RUNTIME_RPC_RESULT', requestId:'1', ok:true, result:42}), true);
  assert.equal(await a,42);
  assert.equal(client.receive({type:'CARD_RUNTIME_RPC_RESULT', requestId:'1', ok:true}), false);
  const rejected = assert.rejects(b, /timed out: b/); timer.run(1000); await rejected;
  assert.equal(timeouts.length,1);
  const c = client.request('c'); client.receive({type:'CARD_RUNTIME_RPC_RESULT',requestId:'3',ok:false,error:'host error'}); await assert.rejects(c,/host error/);
  fail = true; await assert.rejects(client.request('d'), /send failed/); assert.equal(timer.tasks.size,0); fail = false;
  const e = client.request('e'); client.cancelPending('suspended'); await assert.rejects(e,/suspended/);
  const f = client.request('f'); client.close(); await assert.rejects(f,/closed/); await assert.rejects(client.request('g'),/closed/); assert.equal(timer.tasks.size,0);
}

async function boot(mode, engineMode, failure) {
  const listeners = new Map(), sent = [], timer = clock();
  const parent = {postMessage(message) { sent.push(message); if (failure === 'send' && message.type === 'HANDSHAKE_INIT') throw new Error('handshake send failed'); }};
  const window = { parent, fetch: async () => { throw new Error('unexpected network'); }, location: {href:'https://card.invalid/'}, addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type,list); }, removeEventListener(type, fn) { listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn)); } };
  window.window = window;
  const document = {readyState:'complete',documentElement:{style:{setProperty(){}}},addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];}};
  const fixture = {window, document, navigator:{userAgent:'test'}, setTimeout:timer.schedule, clearTimeout:timer.cancel, structuredClone, URL, Response, TextDecoder, TextEncoder, console};
  const payload = {context:{compatibilityMode:mode,engineMode,messageId:1,chatId:'chat',name1:'User',name2:'A',characterKey:'a',personaId:'p',presetName:'P'},characterCard:{name:'A',description:'desc'},catalog:{characters:[{name:'A',fileName:'a',card:{name:'A',description:'desc'}},{name:'B',fileName:'b',card:{name:'B'}}],personas:[{id:'p',name:'User'},{id:'q',name:'Other'}],presets:[{name:'P'},{name:'Q'}],extensions:{}},storage:{local:{},session:{}},chatHistory:[],variableScopes:{chat:{stat_data:{hp:1}}}};
  vm.runInNewContext(buildCardRuntimeCoreScript(payload),fixture);
  await Promise.resolve();
  await Promise.resolve();
  const dispatch = (type, event) => {for(const fn of listeners.get(type)||[])fn(event);};
  const message = (data,source=parent)=>dispatch('message',{data,source});
  assert.ok(sent.some(m=>m.type==='HANDSHAKE_INIT'),`boot failed: ${window.__cardRuntimeBootState?.errorMessage}`);
  if (failure) {
    const rejection = assert.rejects(window.cardStudioReady, failure === 'timeout' ? /HANDSHAKE_FAILED/ : failure === 'send' ? /handshake send failed/ : /closed before handshake/);
    if (failure === 'timeout') timer.run(5000);
    if (failure === 'pagehide') dispatch('pagehide',{persisted:false});
    await rejection;
    message({type:'HANDSHAKE_ACK',payload:{variableScopes:{chat:{stat_data:{hp:99}}}}});
    assert.equal(window.getVariables({type:'chat'}).stat_data.hp,1);
    assert.equal(timer.tasks.size,0);
    return;
  }
  let appReadyCount=0;
  window.eventOn(window.tavern_events.APP_READY,()=>{appReadyCount++;});
  message({type:'HANDSHAKE_ACK',payload:{variableScopes:{chat:{stat_data:{hp:2}}}}},{});
  assert.equal(window.__cardRuntimeBootState.phase,'handshake-waiting');
  message({type:'HANDSHAKE_ACK',payload:{variableScopes:{chat:{stat_data:{hp:2}}}}});
  await window.cardStudioReady;
  assert.equal(window.__cardRuntimeBootState.phase,'runtime-ready');
  assert.deepEqual(Array.from(window.TavernHelper.getCharacterNames()),['A','B']);
  assert.deepEqual(Array.from(window.TavernHelper.getPersonaNames()),['User','Other']);
  assert.deepEqual(Array.from(window.TavernHelper.getPresetNames()),['P','Q']);
  assert.equal((await window.getCharacter('A')).description,'desc');
  assert.equal(window.getPersona('p').name,'User');
  assert.equal(window.getPreset('P').name,'P');
  assert.equal(typeof window.EjsTemplate.evaltemplate,'function');
  assert.equal(window.Mvu.extensions.TavernHelper,window.TavernHelper);
  for (const name of ['getCharacterNames','createCharacter','getPersona','replacePersona','getPreset','loadPreset','getExtensionInstallationInfo','importRawChat','audioEnable']) assert.equal(window.TavernHelper[name],window[name],name);
  assert.equal(window.getVariables({type:'chat'}).stat_data.hp,2);
  message({type:'HANDSHAKE_ACK',payload:{variableScopes:{chat:{stat_data:{hp:99}}}}});
  assert.equal(window.getVariables({type:'chat'}).stat_data.hp,2);
  message({type:'CARD_RUNTIME_STATE_UPDATE',payload:{variableScopes:{chat:{stat_data:{hp:3}}}}});
  assert.equal(window.getVariables({type:'chat'}).stat_data.hp,3);
  const variableRequests=()=>sent.filter(m=>m.type==='CARD_RUNTIME_RPC'&&m.method==='variables.replace');
  const settleVariable=async (request,ok)=>{message({type:'CARD_RUNTIME_RPC_RESULT',requestId:request.requestId,ok,...(ok?{result:request.args.variables}:{error:'write failed'})}); await Promise.resolve(); await Promise.resolve();};
  window.replaceVariables({stat_data:{hp:4}},{type:'chat'}); const first=variableRequests().at(-1);
  window.replaceVariables({stat_data:{hp:5}},{type:'chat'}); const second=variableRequests().at(-1);
  await settleVariable(first,false); assert.equal(window.getVariables({type:'chat'}).stat_data.hp,5);
  await settleVariable(second,false); assert.equal(window.getVariables({type:'chat'}).stat_data.hp,3);
  window.replaceVariables({stat_data:{hp:6}},{type:'chat'}); const third=variableRequests().at(-1);
  window.replaceVariables({stat_data:{hp:7}},{type:'chat'}); const fourth=variableRequests().at(-1);
  await settleVariable(fourth,true); await settleVariable(third,false); assert.equal(window.getVariables({type:'chat'}).stat_data.hp,7);
  window.replaceVariables({stat_data:{hp:8}},{type:'chat'}); const fifth=variableRequests().at(-1);
  message({type:'CARD_RUNTIME_STATE_UPDATE',payload:{variableScopes:{chat:{stat_data:{hp:9}}}}});
  await settleVariable(fifth,false); assert.equal(window.getVariables({type:'chat'}).stat_data.hp,9);
  const rpc=window.cardRuntimeRpc('test',{}); const request=sent.findLast(m=>m.type==='CARD_RUNTIME_RPC');
  message({type:'CARD_RUNTIME_RPC_RESULT',requestId:request.requestId,ok:true,result:1},{});
  message({type:'CARD_RUNTIME_RPC_RESULT',requestId:request.requestId,ok:true,result:2}); assert.equal(await rpc,2);
  timer.run(0); assert.equal(appReadyCount,1);
  const suspended=window.cardRuntimeRpc('suspended',{}); dispatch('pagehide',{persisted:true}); await assert.rejects(suspended,/suspended/);
  const pending=window.cardRuntimeRpc('pending',{}); dispatch('pagehide',{persisted:false}); await assert.rejects(pending,/closed/); await assert.rejects(window.cardRuntimeRpc('late'),/closed/);
  timer.run(0);
}
for (const mode of ['safe','full']) for(const engine of ['current','official-local']) await boot(mode,engine);
for (const failure of ['timeout','send','pagehide']) await boot('safe','current',failure);
console.log('Phase 1 Card Runtime ownership and RPC lifecycle: OK');
