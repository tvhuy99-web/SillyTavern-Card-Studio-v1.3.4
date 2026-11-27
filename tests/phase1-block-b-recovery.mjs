import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { acquireNativeListener, releaseNativeListener, awaitNativeDeadline } from '../src/platform/android/native-bridge.js';
import { createAiStudioTextProvider } from '../src/providers/aistudio/text.js';
import { copyCachedModelToNative } from '../src/features/world-info/native-embedding-bridge.js';
import { streamExportUrlToAndroid } from '../src/diagnostics/android-export-download.js';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise,resolve}; };
const delay = () => new Promise(r => setTimeout(r, 0));
const never = () => new Promise(() => {});

{
  const pending = deferred(); let callback, removed=0, observed=0;
  const plugin={addListener(event, listener){callback=listener;return pending.promise;}};
  await assert.rejects(acquireNativeListener(plugin,'event',()=>observed++,{timeoutMs:15}), {code:'NATIVE_BRIDGE_TIMEOUT'});
  callback({}); assert.equal(observed,0);
  pending.resolve({remove(){removed++;}}); await delay(); assert.equal(removed,1);
  const handle = await acquireNativeListener({addListener(e,fn){callback=fn;return {remove:never};}}, 'event', ()=>observed++);
  callback({}); assert.equal(observed,1);
  await releaseNativeListener(handle,{timeoutMs:15}); callback({}); assert.equal(observed,1);
  const controller=new AbortController(); let workCalled=false;
  const waiting=awaitNativeDeadline(()=>{workCalled=true;return never();},{signal:controller.signal,timeoutMs:1000});
  controller.abort(); await assert.rejects(waiting,{name:'AbortError'}); assert.equal(workCalled,false);
}

{
  const calls=[];
  globalThis.Capacitor={getPlatform:()=> 'android',nativePromise(plugin,method,args){calls.push({method,args});return method==='generate'?never():Promise.resolve({});}};
  await assert.rejects(createAiStudioTextProvider({requestTimeoutMs:15}).generate({prompt:'timeout'}),{code:'NATIVE_BRIDGE_TIMEOUT'});
  assert.deepEqual(calls.map(c=>c.method),['generate','cancel']); assert.equal(calls[0].args.requestId,calls[1].args.requestId);
  let removed=0;
  globalThis.Capacitor={getPlatform:()=> 'android',Plugins:{AIStudioText:{addListener(){return {remove(){removed++;return never();}};}}},nativePromise:async()=>({text:'done'})};
  const observed=[];
  for await (const chunk of createAiStudioTextProvider({cleanupTimeoutMs:15}).stream({prompt:'test'})) observed.push(chunk.text);
  assert.deepEqual(observed,['done']); assert.equal(removed,1);
  delete globalThis.Capacitor;
}

{
  const source=fs.readFileSync(new URL('../android-native/AiStudioPageScripts.java',import.meta.url),'utf8');
  const block=source.match(/INSTALL_JS = """\n([\s\S]*?)\n        """;/)[1];
  const script=block.replace(/\\(\\|n|r|t|s|"|')/g,(_,char)=>({'\\':'\\',n:'\n',r:'\r',t:'\t',s:' ','"':'"',"'":"'"})[char]);
  const window={}, document={documentElement:{children:[]}};
  vm.runInNewContext(script,{window,document,location:{pathname:'/prompts/test'}});
  const studio=window.__STS_AI_TEXT_V2__;
  let clicks=0; const button=label=>({disabled:false,getAttribute:key=>key==='aria-label'?label:null,textContent:'',click:()=>clicks++});
  studio.visible=()=>true; studio.buttons=elements=>elements;
  studio.walk=()=>({elements:[button('Stop generating')]});
  assert.equal(studio.stopGeneration().ok,false); assert.equal(clicks,0);
  studio.clicked=true; studio.walk=()=>({elements:[button('Cancel')]}); assert.equal(studio.stopGeneration().ok,false);
  studio.walk=()=>({elements:[button('Stop'),button('Stop generating')]}); assert.equal(studio.stopGeneration().ok,false);
  studio.walk=()=>({elements:[button('Cancel'),button('Stop generating')]}); assert.equal(studio.stopGeneration().ok,true); assert.equal(clicks,1);
}
const graph='model_q4.onnx', weights='model_q4.onnx_data';
const provider={id:'embeddinggemma',modelId:'example/model'};
const url=(revision,file)=>`https://example.test/example/model/resolve/${revision}/onnx/${file}`;
function cacheWith(groups) {
  return {keys:async()=>groups.map((_,i)=>'transformers-'+i),open:async name=>({keys:async()=>groups[Number(name.split('-').at(-1))].map(url=>({url})),match:async()=>new Response(new Uint8Array(16))})};
}
function pluginWith({failWeights=false,byteMismatch=false}={}) {
  const calls=[]; let ready=false, owner=null, file=null, bytes=0;
  const verify=args=>assert.equal(args.modelImportId,owner);
  const plugin={
    status:async()=>({modelSetImportVersion:1,modelReady:ready,graphReady:ready,weightsReady:ready}),
    beginModelImport:async args=>{calls.push(['beginModel',args]);owner=args.modelImportId;},
    beginFile:async args=>{verify(args);calls.push(['beginFile',args]);file=args;bytes=0;},
    appendChunk:async args=>{verify(args);assert.equal(args.importId,file.importId);bytes+=Buffer.from(args.base64,'base64').length;if(failWeights&&args.fileName===weights)throw Error('weights failed');},
    finishFile:async args=>{verify(args);assert.equal(args.expectedBytes,bytes);calls.push(['finishFile',args]);return {bytes:byteMismatch?bytes-1:bytes};},
    abortFile:async args=>{verify(args);calls.push(['abortFile',args]);},
    commitModelImport:async args=>{verify(args);calls.push(['commitModel',args]);ready=true;owner=null;},
    abortModelImport:async args=>{verify(args);calls.push(['abortModel',args]);owner=null;},
  };
  return {plugin,calls};
}
{
  const {plugin,calls}=pluginWith();
  await assert.rejects(copyCachedModelToNative(plugin,provider,()=>{},cacheWith([[url('a',graph),url('b',weights)]])),/cùng phiên bản/);
  assert.equal(calls.length,0);
  await assert.rejects(copyCachedModelToNative(plugin,provider,()=>{},cacheWith([[url('a',graph)],[url('a',weights)]])),/cùng phiên bản/);
  assert.equal(calls.length,0);
  await copyCachedModelToNative(plugin,provider,()=>{},cacheWith([[url('a',graph),url('a',weights)]]));
  assert.deepEqual(calls.map(c=>c[0]),['beginModel','beginFile','finishFile','beginFile','finishFile','commitModel']);
  assert.equal((await plugin.status()).modelReady,true);
}
for(const config of [{failWeights:true},{byteMismatch:true}]) {
  const {plugin,calls}=pluginWith(config);
  await assert.rejects(copyCachedModelToNative(plugin,provider,()=>{},cacheWith([[url('a',graph),url('a',weights)]])),/weights failed|không khớp/);
  assert.equal(calls.at(-1)[0],'abortModel'); assert.ok(calls.some(c=>c[0]==='abortFile')); assert.ok(!calls.some(c=>c[0]==='commitModel'));
}

{
  let args, written=0;
  const plugin={beginSave:async()=>({exportId:'e'}),appendChunk:async({base64})=>{written+=Buffer.from(base64,'base64').length;},finishSave:async input=>{args=input;return {bytes:written,destination:'content://file'};}};
  const result=await streamExportUrlToAndroid({url:'blob:test',filename:'file.txt',plugin,fetcher:async()=>new Response('abc')});
  assert.deepEqual(args,{exportId:'e',expectedBytes:3}); assert.equal(result.bytes,3);
}
console.log('Block B recovery: deadlines, late listeners, Stop selection, ONNX pair transaction, cache provenance and export byte contract PASS');
