import assert from 'node:assert/strict';
import {buildProbeTarget,buildSavedProbeTarget,runModelProbe,safeProbeError,createModelTestButton} from '../src/ui/settings/model-test-button.js';
import {createModelCatalog} from '../src/providers/common/model-catalog.js';
import {createMemoryStorage} from '../src/providers/proxy/persistence.js';
const connections={getGeminiCatalogKeyForEnvironment:()=> 'env-secret'};
const manual=buildProbeTarget({provider:'gemini',model:' gemini-test ',geminiKeysText:'\n draft-secret\nsecond',connections});assert.equal(manual.model,'gemini-test');assert.equal(manual.geminiApiKey,'draft-secret');
const empty=buildProbeTarget({provider:'gemini',model:'test',geminiKeysText:' ',connections});let calls=0;
await assert.rejects(runModelProbe(()=>{calls++;},empty),/API Key/);assert.equal(calls,0);
const ai=buildProbeTarget({provider:'aistudio',model:'test'});await assert.rejects(runModelProbe(()=>{calls++;},ai),/AI Studio/);assert.equal(calls,0);
const controller=new AbortController();let late;
const result=runModelProbe(args=>{assert.equal(args.geminiApiKey,'draft-secret');assert.equal(args.signal,controller.signal);return new Promise(resolve=>late=resolve);},manual,controller.signal);
await Promise.resolve();controller.abort();await assert.rejects(result,{name:'AbortError'});late({latencyMs:5});
assert.ok(!safeProbeError(Error('draft-secret Bearer other-secret'),manual).includes('secret'));
let response={ok:true,status:200};const requests=[];
const catalog=createModelCatalog({storage:createMemoryStorage(),normalizeProxyUrl:url=>url.replace(/\/$/,''),request:async(...args)=>{requests.push(args);return response;},getGeminiKey:()=>''});
for(const protocol of ['openai','google_native']){
 await catalog.probeProxy({url:'https://example.test/',password:'p',protocol});const [url,options]=requests.at(-1);
 assert.equal(url,'https://example.test/'+(protocol==='openai'?'v1/models':'v1beta/models'));assert.equal(options.headers[protocol==='openai'?'Authorization':'x-goog-api-key'],protocol==='openai'?'Bearer p':'p');
}
for(const invalid of [{ok:false,status:401},{ok:false,status:404},{ok:true,status:0,type:'opaque'}]){response=invalid;await assert.rejects(catalog.probeProxy({url:'https://example.test',protocol:'openai'}),/Không xác minh/);}
// Exercise the React-owned button with persistent hook slots and effect cleanup.
let states=[],refs=[],si=0,ri=0,dependency,cleanup;const notices=[];
const Button=createModelTestButton({jsx:(type,props)=>({type,props})},{useState(init){const i=si++;if(!(i in states))states[i]=init;return [states[i],value=>states[i]=value];},useRef(init){return refs[ri++]??={current:init};},useEffect(fn,[key]){if(dependency!==key){cleanup?.();dependency=key;cleanup=fn();}}});
let target=manual,probe=async()=>({latencyMs:7});function render(){si=ri=0;return Button({target,testModel:probe,notify:(...a)=>notices.push(a)});}
render();await render().props.onClick();assert.equal(render().props['data-state'],'success');assert.equal(notices.at(-1)[1],'success');
probe=()=>new Promise(()=>{});const waiting=render().props.onClick();assert.equal(render().props.disabled,true);target={...manual,model:'other'};render();await waiting;assert.equal(render().props['data-state'],'idle');assert.equal(notices.length,1);
target=ai;assert.equal(render().props.disabled,true);cleanup?.();
const savedGemini=buildSavedProbeTarget({provider:'gemini',model:'gemini-2.5-flash',connections:{getGemini:()=>({useDefault:false,keys:['saved-gemini-key']}),getGeminiCatalogKeyForEnvironment:()=>'env-secret'}});
assert.equal(savedGemini.geminiApiKey,'saved-gemini-key');
console.log('React-owned model tests: explicit drafts, saved targets, cancellation, redaction, protocol endpoint, HTTP errors and stale results OK');
