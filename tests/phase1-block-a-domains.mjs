import assert from 'node:assert/strict';
import { createLorebookFileCodec } from '../src/features/world-info/lorebook-file.js';
import { createPresetFileCodec } from '../src/features/presets/preset-file.js';
import { createMacroProcessing } from '../src/features/prompts/macro-processing.js';
import { createKeywordMatching } from '../src/features/world-info/keyword-matching.js';
import { createRegexProcessing } from '../src/features/chat/regex-processing.js';
import { createMarkdownRuntime } from '../src/vendor/markdown-runtime.js';
import { mountApplication } from '../src/app/lifecycle/mount-application.js';
import { useSmartContext } from '../src/features/chat/hooks/use-smart-context.js';
const lore = createLorebookFileCodec({relaxedJson:{default:{parse:JSON.parse}}});
const file = new File([JSON.stringify({name:'Test', entries:[{key:['dragon'],content:'A',enabled:true},{key:['elf'],content:'B'}]})],'world.json');
const imported = await lore.parseLorebookFile(file);
assert.equal(imported.name,'Test');assert.deepEqual(imported.book.entries[0].keys,['dragon']);
assert.equal(new Set(imported.book.entries.map(entry=>entry.uid)).size,2);
assert.deepEqual(await lore.parseLorebookFile(file),imported);
await assert.rejects(lore.parseLorebookFile(new File(['not json'],'bad.json')), /JSON/);
const presets = createPresetFileCodec({fu:{temp:1,prompts:[]},__stsNormalizePresetConfig:value=>value});
const preset = await presets.parsePresetFile(new File([JSON.stringify({openai_max_tokens:1024,temperature:0.7,prompts:[null,{identifier:'p',content:42,enabled:true}]})],'custom.json'));
assert.equal(preset.name,'custom');assert.equal(preset.max_tokens,1024);assert.equal(preset.prompts[0].content,'42');assert.equal(preset.prompts.length,1);
const macro = createMacroProcessing();assert.equal(macro.Vu({name:'  Hero  '}),'Hero');assert.equal(macro.Ku('Before {{original}}','source'),'Before source');assert.equal(macro.Ju('{{char}} / {{user}}',{card:{name:'Hero'},userName:'Reader'}),'Hero / Reader');
const keyword = createKeywordMatching();assert.deepEqual(keyword.resolveWorldInfo('dragon',[{uid:'dragon',keys:['dragon'],content:'Lore',enabled:true}],{}, {}, {}, [],false,1,3).activeEntries.map(entry=>entry.uid),['dragon']);
for (const engine of ['current','official-local']) {
    const regex = createRegexProcessing({Co:()=>engine});
    assert.equal(regex.processRegex('plain text',[],[1],{engineMode:engine}).displayContent,'plain text');
}
const {markdown} = createMarkdownRuntime();assert.match(markdown.parse('# Title\n\n**bold**'),/<h1>Title<\/h1>/);assert.match(markdown.parse('**bold**'),/<strong>bold<\/strong>/);
// Verify actual React element construction at the composition root, without claiming browser mount.
globalThis.document={createElement:()=>({relList:{supports:()=>true}})};
const { b,wt,At,It }=await import('../src/vendor/react-state-runtime.js');
let tree;const root={};const component=()=>null;
const ErrorBoundary=component,InitialLoader=()=>null,ToastProvider=()=>null,SpeechProvider=()=>null,CardPopupProvider=()=>null,Shell=()=>null;
mountApplication({react:b,jsxRuntime:wt,reactDom:{createRoot:element=>{assert.equal(element,root);return{render:value=>tree=value}}},ErrorBoundary,InitialLoader,ToastProvider,SpeechProvider,CardPopupProvider,Shell,document:{getElementById:id=>{assert.equal(id,'root');return root}}});
assert.equal(tree.type,b.StrictMode);const app=tree.props.children.type();assert.equal(app.type,ErrorBoundary);assert.equal(app.props.children[0].type,InitialLoader);let next=app.props.children[1];for(const type of [ToastProvider,SpeechProvider,CardPopupProvider,Shell]){assert.equal(next.type,type);next=next.props.children;}
assert.throws(()=>mountApplication({document:{getElementById:()=>null}}),/Could not find root/);
// A summary request from an old revision must never mutate a replacement session.
let revision=1, pendingResolve, pendingReject, writes=[];
let state={sessionId:'a',messages:[{role:'user',content:'u'},{role:'model',content:'m'}],longTermSummaries:[],summaryQueue:[],card:{name:'A'},isSummarizing:false};
state.setSessionData=patch=>{writes.push(patch);Object.assign(state,patch)};
const ol=()=>state;ol.getState=()=>state;
const deps={ol,b:{useCallback:fn=>fn},__stsRuntimeState:{getSessionRevision:()=>revision},os:()=>({summarization_chunk_size:1}),qu:()=>{},wd:()=>new Promise((resolve,reject)=>{pendingResolve=resolve;pendingReject=reject})};
let hook=useSmartContext(deps);const old=hook.triggerSummarization();await Promise.resolve();assert.equal(state.isSummarizing,true);revision++;state={...state,sessionId:'b',isSummarizing:false,summaryQueue:[],longTermSummaries:[]};const count=writes.length;pendingResolve('stale');await old;assert.equal(writes.length,count);assert.deepEqual(state.longTermSummaries,[]);
hook=useSmartContext(deps);const current=hook.triggerSummarization();await Promise.resolve();pendingResolve('summary');await current;assert.deepEqual(state.longTermSummaries,['summary']);assert.equal(state.isSummarizing,false);
const regenerating=useSmartContext(deps).handleRegenerateSummary(0);await Promise.resolve();revision++;state={...state,sessionId:'b',longTermSummaries:['replacement']};pendingReject(Error('old error'));await regenerating;assert.deepEqual(state.longTermSummaries,['replacement']);
// RPG and Arena actions exercise the production Zustand + Immer store.
const {createSessionStore}=await import('../src/app/state/session-store.js');
const arenaWrites=[];const runtime={invalidateSession(){},add(){},remove(){},abortAll(){}};const diagnostics={snapshot:()=>[],activate(){},addSystem:()=>[],replace:logs=>logs};
const store=createSessionStore({At,It,il:{sessionId:'s',card:{rpg_data:{tables:[{config:{id:'t',columns:[{id:'c'}]},data:{rows:[['r','old']]}}]}},isArenaMode:false,arenaProvider:null,arenaModelId:null,arenaUserProfileId:null},__stsDiagnosticsState:diagnostics,__stsRuntimeState:runtime,rl:data=>[{content:data.tables[0].data.rows[0]?.[1]??''}],Es:value=>arenaWrites.push(value)});
store.getState().updateRpgCell('t',0,0,'new');assert.equal(store.getState().card.rpg_data.tables[0].data.rows[0][1],'new');assert.equal(store.getState().generatedLorebookEntries[0].content,'new');store.getState().addRpgRow('t');assert.equal(store.getState().card.rpg_data.tables[0].data.rows.length,2);store.getState().deleteRpgRow('t',1);assert.equal(store.getState().card.rpg_data.tables[0].data.rows.length,1);store.getState().setArenaProvider('proxy');store.getState().setArenaModelId(null);assert.equal(arenaWrites.at(-1).provider,'proxy');assert.equal(arenaWrites.at(-1).modelId,null);
console.log('Block A domains: actual codecs, macro/regex, Markdown, provider tree, summary leases and session actions OK.');
