import assert from 'node:assert/strict';
import { createAiStudioTextProvider } from '../src/providers/aistudio/text.js';
import { ANDROID_PLUGINS, getAndroidPlugin, getNativePromiseBridge } from '../src/platform/android/native-bridge.js';
import { copyCachedModelToNative } from '../src/features/world-info/native-embedding-bridge.js';
import { enqueueAndroidExport, installAndroidExportInterceptor, streamExportUrlToAndroid } from '../src/diagnostics/android-export-download.js';
const delay = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
async function within(promise) { let timer; try { return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('test did not settle')),1500)})]); } finally {clearTimeout(timer);} }
const api = { getPlatform:()=> 'android', nativePromise(){}, Plugins:{AIStudioText:{}} };
assert.equal(getAndroidPlugin(ANDROID_PLUGINS.aiStudio, {Capacitor:api}),api.Plugins.AIStudioText);
assert.equal(getNativePromiseBridge({Capacitor:api}),api);
for (const platform of ['web','ios']) {
  const host={Capacitor:{...api,getPlatform:()=>platform}};
  assert.equal(getAndroidPlugin(ANDROID_PLUGINS.aiStudio,host),null); assert.equal(getNativePromiseBridge(host),null);
}

{
  const calls=[], native=deferred();
  globalThis.Capacitor={getPlatform:()=> 'android',nativePromise(plugin,method,args){ calls.push({method,args}); return method==='generate'?native.promise:Promise.resolve({}); }};
  const provider=createAiStudioTextProvider(), controller=new AbortController();
  const task=provider.generate({prompt:'test',signal:controller.signal});
  await delay(); controller.abort();
  await within(assert.rejects(task,{name:'AbortError'}));
  assert.equal(calls.length,2); assert.equal(calls[1].method,'cancel');
  assert.deepEqual(calls[1].args,{requestId:calls[0].args.requestId});
  native.resolve({text:'late'}); await delay();
  const before=calls.length, already=new AbortController(); already.abort();
  await assert.rejects(provider.generate({prompt:'test',signal:already.signal}),{name:'AbortError'}); assert.equal(calls.length,before);
}

{
  const calls=[], native=deferred(); let event, removed=0;
  globalThis.Capacitor={getPlatform:()=> 'android',Plugins:{AIStudioText:{async addListener(name,fn){event=fn;return {remove(){removed++;}};}}},nativePromise(plugin,method,args){calls.push({method,args});return method==='generate'?native.promise:Promise.resolve({});}};
  const iterator=createAiStudioTextProvider().stream({prompt:'test'});
  const first=iterator.next(); await delay();
  const requestId=calls[0].args.requestId;
  event({requestId:'stale',replace:true,text:'wrong'}); event({requestId,replace:true,text:'partial'});
  assert.equal((await within(first)).value.text,'partial');
  await within(iterator.return());
  assert.equal(removed,1); assert.deepEqual(calls.filter(x=>x.method==='cancel'),[{method:'cancel',args:{requestId}}]);
  native.resolve({text:'late'});
}

{
  const acquisition=deferred(), calls=[]; let removed=0;
  globalThis.Capacitor={getPlatform:()=> 'android',Plugins:{AIStudioText:{addListener(){return acquisition.promise;}}},nativePromise(...args){calls.push(args);return Promise.resolve({});}};
  const controller=new AbortController(); const iterator=createAiStudioTextProvider().stream({prompt:'test',signal:controller.signal});
  const first=iterator.next(); await delay(); controller.abort();
  await within(assert.rejects(first,{name:'AbortError'}));
  acquisition.resolve({remove(){removed++;}}); await delay(); assert.equal(removed,1); assert.equal(calls.length,0);
}
delete globalThis.Capacitor;

{
  const calls=[]; let cancelled=false;
  const provider={id:'embeddinggemma',modelId:'example/model'};
  const cache={keys:async()=>['transformers-cache'],open:async()=>({keys:async()=>[{url:'https://example.test/example/model/onnx/model_q4.onnx'}],match:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(32));},cancel(){cancelled=true;}}))})};
  const plugin={status:async()=>({modelReady:false,graphReady:false,weightsReady:false}),beginFile:async args=>calls.push(['begin',args]),appendChunk:async args=>{calls.push(['append',args]);throw Error('write failed');},abortFile:async args=>calls.push(['abort',args])};
  await within(assert.rejects(copyCachedModelToNative(plugin,provider,()=>{},cache),/write failed/));
  assert.equal(calls.length,3); assert.ok(calls[0][1].importId); assert.equal(calls[1][1].importId,calls[0][1].importId); assert.deepEqual(calls[2][1],calls[0][1]); assert.equal(cancelled,true);
}

{
  let cancelled=false;
  await assert.rejects(streamExportUrlToAndroid({url:'blob:cancel',filename:'x',fetcher:async()=>new Response(new ReadableStream({cancel(){cancelled=true;}})),plugin:{beginSave:async()=>{throw Error('picker closed');},appendChunk(){},finishSave(){}}}),/picker closed/);
  assert.equal(cancelled,true);
  let handler, saved=0, bytes=0; const revocations=[]; const hold=deferred();
  const plugin={beginSave:async()=>{bytes=0;return {destination:'content://test',exportId:'id-'+(saved+1)};},appendChunk:async({base64,exportId})=>{assert.equal(exportId,'id-'+(saved+1));bytes+=Buffer.from(base64,'base64').length;},finishSave:async({exportId})=>{assert.equal(exportId,'id-'+(saved+1));saved++; if(saved===2) await hold.promise; return {bytes};}};
  const host={document:{addEventListener:(name,fn)=>handler=fn},URL:{revokeObjectURL:url=>revocations.push(url)},fetch:async()=>new Response('abc'),Capacitor:{getPlatform:()=> 'android',Plugins:{AndroidExportFile:plugin}},console:{warn(){},error(message){throw Error(message);}}};
  assert.equal(installAndroidExportInterceptor(host),true);
  const event={target:{closest:()=>({href:'blob:shared',getAttribute:()=> 'test.txt'})},preventDefault(){},stopPropagation(){}};
  handler(event);handler(event);host.URL.revokeObjectURL('blob:shared');
  for(let i=0;i<20&&saved<2;i++) await delay(); assert.equal(saved,2);assert.deepEqual(revocations,[]);
  hold.resolve();await within(enqueueAndroidExport(async()=>{}));assert.deepEqual(revocations,['blob:shared']);
}
console.log('Block B bridge lifecycle: scoped AI Studio cancellation, stream teardown, ONNX import ID and SAF blob ownership PASS');
