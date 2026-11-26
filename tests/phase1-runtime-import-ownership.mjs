import { HOST_RPC_METHODS } from '../assets/recovered/runtime/card-runtime/host/method-router.js';
import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCharacterMutations, createPresetMutations } from '../src/features/catalog/catalog-mutations.js';
import { createUtilityRpcHandlers, UTILITY_RPC_METHODS } from '../src/runtime/card-runtime/host/utility-rpc.js';
import { parseImportedChat } from '../src/features/chat/chat-import.js';
import { createGenerationGateway } from '../src/providers/common/generation-gateway.js';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const character = { characters: [{ fileName:'same.json', card:{name:'old'}, avatarUrl:'old-avatar' }], activeCharacterFileName:'same.json' };
const preset = { presets:[{name:'P',prompts:[]}],activePresetName:'P' };
const bind = state => ({get:()=>state,set:fn=>fn(state)});
let fail = false, gate = null, parseGate = null, reads = [], writes = [], revoked = [], active = true;
const put = async value => { writes.push(value); if(gate) await gate.promise; if(fail) throw Error('write failed'); };
const repos = { characters:{put}, presets:{put}, sessions:{add:put} };
Object.assign(character,createCharacterMutations({...bind(character),repositories:repos,prepareRecord:async v=>v,revokeAvatar:v=>revoked.push(v),parseCharacter:async file=>{if(parseGate)await parseGate.promise;return {card:{name:await file.text()},avatarUrl:'new-avatar'};}}));
Object.assign(preset,createPresetMutations({...bind(preset),repositories:repos,normalize:v=>({...v,normalized:true}),parsePreset:async file=>JSON.parse(await file.text()),clone:structuredClone}));
const lease={assertCurrent(){if(!active)throw Error('inactive session');}};
const state={card:{fileName:'same.json'},preset:{name:'P'},persona:{id:'user'},scriptButtons:{a:1}};
let loaded, slashed, model='default';
const rpc = createUtilityRpcHandlers({readState:()=>state,characters:()=>character,presets:()=>preset,personas:()=>({activePersonaId:'user'}),describeCharacter:id=>character.characters.find(c=>c.fileName===id),readText:async value=>{if(parseGate)await parseGate.promise;return String(value);},safeName:(v,d)=>String(v||d),clone:structuredClone,sessions:repos.sessions,slash:async value=>{slashed=value;return 'slash result';},loadPreset:async value=>{loaded=value;},listProxyModels:async(...args)=>{reads.push(args);return [{id:'x'}];},currentModel:()=>model,now:()=>123});
const call=(method,args={})=>rpc(method,args,lease);
assert.equal(UTILITY_RPC_METHODS.length,8);
// A failed replacement must not claim that an existing record is the imported record.
fail=true; await assert.rejects(call('raw.import.character',{name:'same.json',content:'replacement'}),/write failed/); assert.equal(character.characters[0].card.name,'old'); assert.deepEqual(revoked,['new-avatar']); fail=false;
await call('raw.import.character',{name:'same.json',content:'replacement'}); assert.equal(character.characters[0].card.name,'replacement'); assert.deepEqual(revoked,['new-avatar','old-avatar']);
// Preserve a user's newer selection while an import is committing.
gate=deferred(); const importing=call('raw.import.character',{name:'second.json',content:'second'}); await new Promise(setImmediate); character.activeCharacterFileName='user-choice'; gate.resolve();gate=null;await importing;assert.equal(character.activeCharacterFileName,'user-choice');
// Session lease checked again after parser finishes, before persistence.
const before=writes.length; parseGate=deferred();const stale=character.importCharacterStrict(new File(['stale'],'stale.json'),lease.assertCurrent);await new Promise(setImmediate);active=false;parseGate.resolve();parseGate=null;await assert.rejects(stale,/inactive/);active=true;assert.equal(writes.length,before);assert.ok(!character.characters.some(c=>c.fileName==='stale.json'));
fail=true;await assert.rejects(call('raw.import.preset',{name:'P',content:'{"name":"P","prompts":[1]}'}),/write failed/);assert.deepEqual(preset.presets[0].prompts,[]);fail=false;
const result=await call('raw.import.preset',{name:'new',content:'{"name":"new","prompts":[2]}'});assert.equal(result.preset.normalized,true);assert.equal(preset.activePresetName,'P');await preset.addPreset(new File(['{"name":"ui"}'],'ui.json'));assert.equal(preset.activePresetName,'ui');
const row={mes:'hello',is_user:false,data:{hp:5},swipes:['a','b'],swipe_data:[{hp:1}],swipe_id:1,reasoning:'why',extra:{keep:true},attachments:[{name:'file'}]};
const json=JSON.stringify({chat:[row]}); const jsonl=JSON.stringify({user_name:'User'})+'\n'+JSON.stringify(row)+'\ninvalid';
assert.deepEqual(parseImportedChat(json,{now:()=>123}),parseImportedChat(jsonl,{now:()=>123}));
const imported=await call('raw.import.chat',{content:json,name:'My Chat'});assert.deepEqual(imported,{ok:true,chatId:'import-My-Chat-123',messages:1});const session=writes.at(-1);assert.equal(session.characterFileName,'same.json');assert.equal(session.presetName,'P');assert.equal(session.userPersonaId,'user');assert.equal(session.chatHistory[0].role,'model');assert.deepEqual(session.chatHistory[0].extra.__sillyTavernRaw,row);assert.deepEqual(session.chatHistory[0].swipes_data,row.swipe_data);assert.deepEqual(session.chatHistory[0].attachments,row.attachments);
parseGate=deferred();const prior=writes.length;const delayed=call('raw.import.chat',{content:json});active=false;parseGate.resolve();parseGate=null;await assert.rejects(delayed,/inactive/);active=true;assert.equal(writes.length,prior);
assert.equal(await call('slash.execute',{command:'x'.repeat(200001)}),'slash result');assert.equal(slashed.length,200000);
assert.deepEqual(await call('generation.models'),['default']);assert.deepEqual(await call('generation.models',{custom_api:{apiurl:'http://test',key:'key'}}),[{id:'x'}]);assert.deepEqual(reads,[['http://test','key',false]]);
assert.deepEqual(await call('preset.get'),{name:'P'});assert.equal(await call('preset.load',{name:'Q'}),true);assert.equal(loaded,'Q');assert.deepEqual(await call('scripts.buttons'),{a:1});await assert.rejects(call('__proto__'),/Unsupported/);
let settings={source:'aistudio',aistudio_model:'default',openrouter_model:'wrong'};const gateway=createGenerationGateway({getConnectionSettings:()=>settings});assert.equal(gateway.getCurrentModel(),'default');settings={source:'proxy',proxy_model:'custom'};assert.equal(gateway.getCurrentModel(),'custom');settings={source:'unknown'};assert.throws(()=>gateway.getCurrentModel(),/không được hỗ trợ/);
// Production integration is routing only for all eight methods, not another implementation.
const bundle=readRecoveredHostView();assert.equal(HOST_RPC_METHODS.length,53);assert.equal(new Set(HOST_RPC_METHODS).size,53);for(const method of UTILITY_RPC_METHODS)assert.ok(HOST_RPC_METHODS.includes(method),method);assert.ok(bundle.includes('utility: utilityRpc'));
console.log('Runtime utility routes, strict imports, stale guards, JSON/JSONL and provider model ownership: OK');
