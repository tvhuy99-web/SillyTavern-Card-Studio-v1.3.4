import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createConnectionSettingsScreen } from '../src/ui/settings/connection-settings-screen.js';
import { createMemoryStorage } from '../src/providers/proxy/persistence.js';

// The VM baseline is used only to regenerate fixtures from the exact P09 Shell
// production implementation. Normal test runs do not require an old ZIP.
const baselinePath = process.env.P09_SETTINGS_BASELINE;
let oldExpression;
if (baselinePath) {
  const bundle = await readFile(baselinePath, 'utf8');
  const start = bundle.indexOf(',Nd=()=>');
  const end = bundle.indexOf(',__stsEmbeddingProviderStatus=', start);
  assert.ok(start >= 0 && end > start);
  oldExpression = bundle.slice(start + 4, end);
}
const jsx = (type, props, key) => ({ type, props, key });
const jsxRuntime = { jsx, jsxs: jsx };
const storage = createMemoryStorage({sts_aistudio_show_page:'true'});
globalThis.localStorage = storage;
globalThis.window = { __STS_AI_STUDIO_LOGS__: { record() {} } };
const profiles = [
  {id:'p1',name:'Native',url:'https://native.test',password:'native-test',legacyMode:false,proxyForTools:true,protocol:'google_native',chatModel:'native-chat',toolModel:'native-tool'},
  {id:'p2',name:'OpenAI',url:'https://openai.test',password:'openai-test',legacyMode:false,proxyForTools:false,protocol:'openai',chatModel:'openai-chat',toolModel:'openai-tool'},
];
const geminiModels = [{id:'gemini-2.5-pro',name:'Gemini Pro'}];
const routerModels = [{id:'free',name:'Free model',pricing:{prompt:'0',completion:'0'}},{id:'paid',name:'Paid model',pricing:{prompt:'1',completion:'1'}}];
const fixtureUrl = new URL('./fixtures/p09-settings-baseline.json', import.meta.url);
function harness({source='gemini', useDefault=true, protocol='openai', selectedProfile='', loading=false}={}) {
  const calls=[], toasts=[], state=[], refs=[], effects=[];
  let cursor=0, refCursor=0, effectCursor=0;
  let saved={source,gemini_model:'gemini-2.5-pro',openrouter_model:'free',aistudio_model:'custom-id',aistudio_tool_model:'',aistudio_thinking:'high',aistudio_tool_thinking:'low',proxy_protocol:protocol,proxy_model:'custom-proxy',proxy_tool_model:'tool-proxy',proxy_profile_id:selectedProfile};
  let cached = new Map();
  const react = {
    useState(initial) { const i=cursor++; if(!(i in state))state[i]=typeof initial==='function'?initial():initial; return [state[i], value=>{state[i]=typeof value==='function'?value(state[i]):value;}]; },
    useMemo(fn) { return fn(); },
    useRef(initial) { const i=refCursor++; return refs[i]??=( {current:initial} ); },
    useEffect(fn) { const i=effectCursor++; if(!(i in effects))effects[i]=fn; },
  };
  const catalog = {read:()=>[{id:'gemini-native',name:'Native model'}],load:async()=>({models:[{id:'gemini-new',name:'New'}]}),clear:()=>calls.push(['clear-ai'])};
  const deps={
    useToast:()=>({showToast:(...args)=>toasts.push(args)}),
    readSettings:()=>({...saved}), saveSettings:value=>{saved={...value};calls.push(['save-settings',value]);},
    readGemini:()=>({useDefault,keys:['manual-test','backup-test']}),readOpenRouterKey:()=> 'router-test',readOpenRouterModels:()=>routerModels,
    readProxyUrl:()=> 'https://proxy.test/',readProxyPassword:()=> 'proxy-test',readLegacyMode:()=>false,readProxyForTools:()=>true,
    readProxyModels:url=>cached.get(url)||[],readProfiles:()=>profiles,saveProfiles:items=>calls.push(['save-profiles',items]),
    fetchOpenRouterModels:async()=>routerModels,saveOpenRouterModels:items=>calls.push(['save-or',items]),
    fetchProxyModels:async(...args)=>{calls.push(['fetch-proxy',...args]);return [{id:'fetched-'+args[3],name:'Fetched'}];},
    mergeProxyModels:(url,items)=>{cached.set(url,items);calls.push(['merge-proxy',url,items]);},
    request:async(url,options)=>{calls.push(['request',url,options]);return {ok:true};},
    defaultGeminiModels:geminiModels,useGeminiModels:()=>({models:geminiModels,isLoading:loading,refetch:async key=>{calls.push(['refresh-gemini',key]);return geminiModels;}}),
    SearchableSelect:'SearchableSelect',ModelSelect:'ModelSelect',TextInput:'TextInput',LoadingIndicator:'LoadingIndicator',ToggleSwitch:'ToggleSwitch',
    proxyUrlKey:'proxyUrl',proxyLegacyKey:'proxyLegacy',proxyForToolsKey:'proxyForTools',
    catalog:{refreshProxyTarget:async(target,{isCurrent})=>{const models=await deps.fetchProxyModels(target.url,target.password,target.legacyMode,target.protocol);if(!isCurrent())return null;deps.catalog.mergeProxyTarget(target,models);return models;},loadProxy:target=>deps.fetchProxyModels(target.url,target.password,target.legacyMode,target.protocol),readProxyTarget:target=>cached.get(target.url)||[],mergeProxyTarget:(target,items)=>{cached.set(target.url,items);calls.push(['merge-proxy',target.url,items]);},clearProxyTarget:target=>{cached.delete(target.url);calls.push(['clear-proxy',target.url]);}},
    connections:{getGeminiCatalogKeyForEnvironment:()=> 'env-test',saveGemini:value=>calls.push(['save-gemini',value]),saveOpenRouterKey:key=>calls.push(['save-key',key])},
    createAiStudioCatalog:()=>catalog,
    proxyPersistence:{getRememberSecrets:()=>false,setRememberSecrets:value=>calls.push(['remember',value]),setPassword:value=>calls.push(['password',value])},
  };
  const legacy = {wt:jsxRuntime,b:react,hl:deps.useToast,ns:deps.readSettings,rs:deps.saveSettings,fs:deps.readGemini,bs:deps.readOpenRouterKey,ps:deps.readOpenRouterModels,vs:deps.readProxyUrl,xs:deps.readProxyPassword,_s:deps.readLegacyMode,Cs:deps.readProxyForTools,ds:deps.readProxyModels,cs:deps.readProfiles,us:deps.saveProfiles,Ru:deps.fetchOpenRouterModels,ms:deps.saveOpenRouterModels,Ws:deps.fetchProxyModels,hs:deps.mergeProxyModels,Hs:deps.request,Vo:deps.defaultGeminiModels,jl:deps.useGeminiModels,Cl:deps.SearchableSelect,Ed:deps.ModelSelect,dn:deps.TextInput,mn:deps.LoadingIndicator,yl:deps.ToggleSwitch,Do:deps.proxyUrlKey,Ro:deps.proxyLegacyKey,Po:deps.proxyForToolsKey,__stsCatalog:deps.catalog,__stsConnections:deps.connections,__stsCreateAiStudioModelCatalog:deps.createAiStudioCatalog,__stsProxyPersistence:deps.proxyPersistence,localStorage:storage,window:globalThis.window};
  const screen = oldExpression ? vm.runInNewContext('('+oldExpression+')',legacy) : createConnectionSettingsScreen(jsxRuntime,react,()=>deps);
  function render(){cursor=refCursor=effectCursor=0;return screen();}
  render(); effects.forEach(fn=>fn());
  return {render,calls,toasts,deps,getSaved:()=>saved};
}
const scenarios=[{source:'gemini'},{source:'gemini',useDefault:false},{source:'gemini',loading:true},{source:'openrouter'},{source:'aistudio'},{source:'proxy'},{source:'proxy',protocol:'google_native',selectedProfile:'p1'}];
const snapshot=JSON.parse(JSON.stringify(scenarios.map(scenario=>harness(scenario).render()),(key,value)=>typeof value==='function'?'[callback]':value));
if(oldExpression){await writeFile(fixtureUrl,JSON.stringify(snapshot,null,2)+'\n');console.log('P09 settings fixture generated from previous production bundle');process.exit(0);}
// Only the deliberately migrated React-owned visibility/clear controls differ.
const baseline = JSON.parse(await readFile(fixtureUrl,'utf8'));
function normalizeControls(node) {
 if (Array.isArray(node)) return node.map(normalizeControls);
 if (!node || typeof node !== 'object') return node;
 if (node.props?.['aria-label'] === 'Hiển thị trang web AI Studio') {
   if ('defaultChecked' in node.props) { node.props.checked = node.props.defaultChecked; delete node.props.defaultChecked; }
   delete node.props.disabled;
 }
 if (node.type === 'button' && node.props?.children === 'Xóa danh sách') delete node.props.disabled;
 if (node.props?.children) node.props.children = normalizeControls(node.props.children);
 return node;
}
assert.deepEqual(normalizeControls(snapshot.slice(0,6)),normalizeControls(baseline.slice(0,6))); // Selected-profile initialization is deliberately corrected in Block D.
function find(tree,predicate){if(Array.isArray(tree)){for(const x of tree){const y=find(x,predicate);if(y)return y;}return;}if(!tree||typeof tree!=='object'||!tree.props)return;if(predicate(tree))return tree;return find(tree.props.children,predicate);}
const byLabel=(tree,label)=>find(tree,x=>x.props['aria-label']===label||x.props.label===label);
const byTitle=(tree,title)=>find(tree,x=>x.props.title===title);
const byText=(tree,text)=>find(tree,x=>x.props.children===text);
const initialized=harness({source:'proxy',selectedProfile:'p1'});
assert.equal(byLabel(initialized.render(),'Proxy URL').props.value,'https://native.test');
assert.equal(byLabel(initialized.render(),'Password / Key').props.value,'native-test');
assert.equal(byLabel(initialized.render(),'Chat Model ID').props.value,'native-chat');
byLabel(initialized.render(),'Proxy URL').props.onChange({target:{value:'https://different.test'}});
assert.equal(byLabel(initialized.render(),'Password / Key').props.value,'');
byLabel(initialized.render(),'Password / Key').props.onChange({target:{value:'new-password'}});
const protocolButton=find(initialized.render(),node=>node.type==='button'&&node.props['aria-pressed']===false);
assert.ok(protocolButton);protocolButton.props.onClick();
assert.equal(byLabel(initialized.render(),'Password / Key').props.value,'');
const missing=harness({source:'proxy',selectedProfile:'missing'});
assert.equal(byLabel(missing.render(),'Proxy URL').props.value,'');assert.equal(byLabel(missing.render(),'Password / Key').props.value,'');
let h=harness({source:'gemini',useDefault:false});
await byTitle(h.render(),'Tải danh sách Model từ Google Gemini').props.onClick();assert.deepEqual(h.calls.at(-1),['refresh-gemini','manual-test']);
byLabel(h.render(),'API Key Gemini').props.onChange({target:{value:' '}});await byTitle(h.render(),'Tải danh sách Model từ Google Gemini').props.onClick();assert.equal(h.toasts.at(-1)[1],'warning');
byLabel(h.render(),'Sử dụng API Key Mặc định (Environment)').props.onChange(true);await byTitle(h.render(),'Tải danh sách Model từ Google Gemini').props.onClick();assert.deepEqual(h.calls.at(-1),['refresh-gemini','env-test']);
byLabel(h.render(),'Nhà cung cấp AI').props.onChange({target:{value:'openrouter'}});
assert.ok(byLabel(h.render(),'API Key OpenRouter'));
byLabel(h.render(),'Chỉ hiện model miễn phí').props.onChange(true);assert.deepEqual(find(h.render(),x=>x.type==='SearchableSelect').props.options.map(x=>x.value),['free']);
await byText(h.render(),'Check').props.onClick();assert.equal(h.calls.at(-1)[0],'request');assert.ok(byText(h.render(),'Key hợp lệ.'));
byLabel(h.render(),'Nhà cung cấp AI').props.onChange({target:{value:'aistudio'}});
let tree=h.render();assert.equal(byLabel(tree,'Tool Model ID').props.value,'');byLabel(tree,'Chat Model ID').props.onChange('custom-native');assert.equal(h.getSaved().aistudio_model,'custom-native');
await byText(h.render(),'Tải danh sách Model').props.onClick();assert.ok(byLabel(h.render(),'Chat Model ID').props.options.some(x=>x.id==='gemini-new'));
for(const protocol of ['openai','google_native']){
 h=harness({source:'proxy',protocol});await byTitle(h.render(),'Tải danh sách Model từ Proxy').props.onClick();assert.deepEqual(h.calls[0],['fetch-proxy','https://proxy.test/','proxy-test',false,protocol]);assert.ok(byLabel(h.render(),'Chat Model ID').props.options.some(x=>x.id==='fetched-'+protocol));
}
h=harness({source:'proxy'});await byLabel(h.render(),'Cấu hình proxy').props.onChange({target:{value:'p1'}});assert.deepEqual(h.calls.find(x=>x[0]==='fetch-proxy'),['fetch-proxy','https://native.test','native-test',false,'google_native']);assert.equal(byLabel(h.render(),'Chat Model ID').props.value,'native-chat');
// Old profile requests must not overwrite the latest selection or catalog.
const race=harness({source:'proxy'});const pending=[];
race.deps.fetchProxyModels=(...args)=>new Promise(resolve=>pending.push({args,resolve}));
const first=byLabel(race.render(),'Cấu hình proxy').props.onChange({target:{value:'p1'}});
const second=byLabel(race.render(),'Cấu hình proxy').props.onChange({target:{value:'p2'}});
pending[1].resolve([{id:'new-profile',name:'New'}]);await second;
pending[0].resolve([{id:'stale-profile',name:'Stale'}]);await first;
assert.ok(byLabel(race.render(),'Chat Model ID').props.options.some(x=>x.id==='new-profile'));
assert.ok(!byLabel(race.render(),'Chat Model ID').props.options.some(x=>x.id==='stale-profile'));
assert.ok(!race.calls.some(x=>x[0]==='merge-proxy'&&x[1]==='https://native.test'));
const late=byTitle(race.render(),'Tải danh sách Model từ Proxy').props.onClick();
byLabel(race.render(),'Proxy URL').props.onChange({target:{value:'https://edited.test'}});
pending[2].resolve([{id:'stale-edit',name:'Stale'}]);await late;
assert.ok(!byLabel(race.render(),'Chat Model ID').props.options.some(x=>x.id==='stale-edit'));
// Save is deliberately non-atomic across Web Storage and catalogs; verify the
// existing destinations and the status instead of claiming a transaction.
const oldTimer=globalThis.setTimeout;globalThis.setTimeout=()=>0;
try{
 byText(h.render(),'Áp Dụng').props.onClick();assert.equal(h.getSaved().proxy_profile_id,'p1');assert.equal(storage.getItem('proxyUrl'),null);assert.ok(byText(h.render(),'Đã lưu!'));assert.ok(h.calls.some(x=>x[0]==='save-gemini'));assert.ok(h.calls.some(x=>x[0]==='save-profiles'));
 h.deps.saveSettings=()=>{throw Error('storage unavailable');};byText(h.render(),'Áp Dụng').props.onClick();assert.ok(byText(h.render(),'Lỗi khi lưu!'));
}finally{globalThis.setTimeout=oldTimer;}
const bundle=(await Promise.all(['../assets/app-production-v1.3.6.js','../assets/recovered/app/composition/persistence-composition.js','../assets/recovered/app/composition/provider-composition.js','../assets/recovered/app/composition/store-composition.js','../assets/recovered/app/composition/conversation-composition.js','../assets/recovered/app/composition/runtime-composition.js','../assets/recovered/app/composition/ui-composition.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')))).join('\n');assert.ok(bundle.includes('ConnectionSettingsScreen=__stsCreateConnectionSettingsScreen(jsxRuntime,React,()=>'));assert.ok(!bundle.includes(',ConnectionSettingsScreen=()=>'));
let accessed=false;createConnectionSettingsScreen(jsxRuntime,{},()=>{accessed=true;throw Error('too early');});assert.equal(accessed,false,'legacy bindings must be resolved lazily');
console.log('P09 connection settings: 6 unchanged baseline trees and corrected profile initialization, all providers, draft inputs, Proxy protocol, profile selection, Apply, lazy binding: OK');
// Settings owns its controls rather than the DOM enhancer. Probe unsaved draft values.
for(const scenario of [{source:'gemini',useDefault:false},{source:'gemini'},{source:'openrouter'},{source:'proxy',protocol:'google_native'},{source:'aistudio'}]){
 const owned=harness(scenario);owned.deps.testModel=async()=>({latencyMs:5});
 const rendered=owned.render();assert.equal(rendered.props['data-sts-model-test-owned'],undefined);
 const target=find(rendered,x=>x.props.testButton)?.props.testButton.props.target;assert.equal(target.provider,scenario.source);
 if(scenario.source==='gemini')assert.equal(target.geminiApiKey,scenario.useDefault===false?'manual-test':'env-test');
 if(scenario.source==='openrouter')assert.equal(target.openRouterApiKey,'router-test');
 if(scenario.source==='proxy')assert.deepEqual(target.proxy,{url:'https://proxy.test/',password:'proxy-test',legacyMode:false,protocol:'google_native'});
 if(scenario.source==='aistudio')assert.ok(target.unavailable);
}
const ping=harness({source:'proxy',protocol:'google_native'});let pingTarget;
ping.deps.catalog.probeProxy=async target=>{pingTarget=target;};
await byText(ping.render(),'Ping').props.onClick();assert.equal(pingTarget.protocol,'google_native');assert.equal(pingTarget.password,'proxy-test');
let latePing;ping.deps.catalog.probeProxy=target=>{pingTarget=target;return new Promise(resolve=>latePing=resolve);};
const checking=byText(ping.render(),'Ping').props.onClick();await Promise.resolve();
byLabel(ping.render(),'Proxy URL').props.onChange({target:{value:'https://changed.test'}});assert.ok(pingTarget.signal.aborted);latePing();await checking;
const ai=harness({source:'aistudio'});await byText(ai.render(),'Tải danh sách Model').props.onClick();assert.ok(find(ai.render(),x=>x.props['data-sts-aistudio-model-status']));
byText(ai.render(),'Xóa danh sách').props.onClick();assert.ok(ai.calls.some(x=>x[0]==='clear-ai'));
