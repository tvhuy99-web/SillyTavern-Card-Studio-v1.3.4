import assert from 'node:assert/strict';
import {createCharacterMutations,createPersonaMutations,createPresetMutations} from '../src/features/catalog/catalog-mutations.js';
import {createLorebookMutations} from '../src/features/world-info/lorebook-mutations.js';
import * as runtime from '../src/app/state/runtime-state.js';
import * as diagnostics from '../src/diagnostics/state.js';
import {createLorebookStore,createSessionStore,createCharacterStore,createPresetStore,createPersonaStore} from '../src/app/state/application-stores.js';

globalThis.document={createElement:()=>({relList:{supports:()=>true}})};
const {At,It}=await import('../src/vendor/react-state-runtime.js');
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const clone=x=>structuredClone(x), noop=()=>{}, identity=x=>x;
function repo(records,key){return {list:async()=>clone(records),put:async x=>{const index=records.findIndex(y=>y[key]===x[key]);if(index<0)records.push(clone(x));else records[index]=clone(x)},add:async x=>{assert.ok(!records.some(y=>y[key]===x[key]));records.push(clone(x))},remove:async id=>{const i=records.findIndex(y=>y[key]===id);if(i>=0)records.splice(i,1)}}}
const charRecords=[{card:{name:'A'},fileName:'a.json'}],presetRecords=[{name:'P'}],personaRecords=[{id:'a',name:'A'}],loreRecords=[{name:'L',book:{entries:[]}}];
const repositories={characters:repo(charRecords,'fileName'),presets:repo(presetRecords,'name'),personas:repo(personaRecords,'id'),lorebooks:repo(loreRecords,'name'),removeCharacterAndSessions:async()=>0};
const common={At,It,__stsRepositories:repositories};
let loreRead=repositories.lorebooks.list;const lore=createLorebookStore({createStore:At,immer:It,repository:{...repositories.lorebooks,list:()=>loreRead()},parseLorebook:async file=>file});
await lore.getState().reloadLorebooks();assert.equal(lore.getState().lorebooks[0].name,'L');let notices=0;const unsubscribe=lore.subscribe(()=>notices++);loreRead=async()=>[{name:'new',book:{entries:[]}}];await lore.getState().reloadLorebooks();assert.equal(lore.getState().lorebooks[0].name,'new');assert.ok(notices>0);unsubscribe();
const chars=createCharacterStore({createStore:At,immer:It,repositories,prepareRecord:identity,normalizeDefault:identity,defaultCharacter:{name:'Default'},parseCharacter:async f=>f});await chars.getState().reloadCharacters();assert.equal(chars.getState().activeCharacterFileName,'a.json');assert.equal(chars.getState().characters[0].card.name,'A');
const presets=createPresetStore({createStore:At,immer:It,repositories,normalize:identity,defaultPreset:{name:'P'},parsePreset:async f=>f});await presets.getState().reloadPresets();assert.equal(presets.getState().activePresetName,'P');
const personas=createPersonaStore({createStore:At,immer:It,repositories,defaultPersona:{id:'default'},selectionKey:'persona',resolveActive:(items,id)=>items.find(x=>x.id===id)||null});await personas.getState().reloadPersonas();assert.equal(personas.getState().activePersona.id,'a');assert.equal(localStorage.getItem('persona'),'a');personas.getState().setActivePersonaId(null);assert.equal(localStorage.getItem('persona'),null);
const initial={sessionId:null,messages:[],variables:{},logs:diagnostics.snapshot()};const session=createSessionStore({createStore:At,immer:It,...common,initialState:initial,__stsRuntimeState:runtime,__stsDiagnosticsState:diagnostics,redactNetworkLog:identity,saveArenaSettings:identity,buildLinkedLorebookEntries:noop});const revision=runtime.getSessionRevision();const ctrl=new AbortController();runtime.add(ctrl);session.getState().setSessionData({sessionId:'s'});assert.equal(runtime.getSessionRevision(),revision+1);assert.equal(ctrl.signal.aborted,true);session.getState().addMessage({id:'1',content:'first'});session.getState().updateMessage('1',{content:'changed'});assert.equal(session.getState().messages[0].content,'changed');session.getState().setVariables({hp:10});assert.deepEqual(session.getState().variables,{hp:10});assert.equal(initial.messages.length,0);
assert.equal(chars.getState().characters.length,1);assert.equal(lore.getState().lorebooks.length,1);assert.equal(presets.getState().presets.length,1);console.log('Block A: 5 application stores with original Zustand/Immer, reload, subscription, late binding and session invalidation OK.');
