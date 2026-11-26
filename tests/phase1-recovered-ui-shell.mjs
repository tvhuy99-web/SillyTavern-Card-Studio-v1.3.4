import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createIcon } from '../src/ui/components/icon.js';
import { createToggleSwitch } from '../src/ui/components/form-controls.js';
import { handleTabKeyDown, createPresetTab, createSettingsTab, createMainTab } from '../src/ui/components/tab-controls.js';
import { createAppHeader, createApplicationShell } from '../src/ui/shell/application-shell.js';
import { createChatRoute } from '../src/features/chat/ui/chat-route.js';
const jsx = (type, props, key) => ({ type, props, key });
const wt = { jsx, jsxs: jsx };
const noop = () => {};
let values, cursor, idCalls = 0;
const b = {
  useId: () => { idCalls++; return 'id'; },
  useState: initial => { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], next => { values[index] = next; }]; },
};
const screens = { Characters: 'Characters', Presets: 'Presets', Lorebooks: 'Lorebooks', Chat: 'Chat', Settings: 'Settings' };
const bindings = { kt: 'Icon', Ct: 'Header', ay: 'MainTab', eu: 'Characters', ku: 'Presets', Eu: 'Lorebooks', Yf: 'Chat', th: 'Settings', Jf: 'ChatSession', ph: 'SessionList', cn: 'Tooltip' };
const current = {
  kt: createIcon(wt), Ct: createAppHeader(wt, 'Icon'), yl: createToggleSwitch(wt, b, 'Tooltip'),
  _u: createPresetTab(wt), eh: createSettingsTab(wt), ay: createMainTab(wt, 'Icon'),
  iy: createApplicationShell(wt, b, { Header: 'Header', MainTab: 'MainTab', ...screens }),
  Yf: createChatRoute(wt, { ChatSession: 'ChatSession', SessionList: 'SessionList' }),
};
const names = ['brand','character','preset','lorebook','chat','settings','arrowLeft','sync','rpg','sparkles','close','send','stop','search','check','error','warning','info','more','download','upload','trash','volume','play','pause','skip','file','chevronDown','chevronRight','tool','refresh','plus','save','copy','undo','expand','collapse','count','unknown'];
const scenarios = [
  ...names.map(name => ['kt', { name }]), ['kt', {name:'brand',className:'custom'}], ['Ct',{}],
  ['yl',{label:'Enabled',checked:true,onChange:noop,tooltip:'Help'}],
  ['yl',{label:'Disabled',checked:false,onChange:noop,disabled:true}],
  ['yl',{ariaLabel:'Toggle',checked:false,onChange:noop,clean:true,className:'extra'}],
  ...['_u','eh','ay'].flatMap(id => [
    [id,{tabId:'chat',currentTab:'chat',onClick:noop,children:'Chat'}],
    [id,{tabId:'chat',currentTab:'settings',onClick:noop,children:'Chat'}],
  ]),
  ['ay',{tabId:'settings',currentTab:'chat',onClick:noop,children:'Settings',disabled:true}],
  ...['character','preset','lorebook','chat','settings','unknown'].map(tab => ['iy', {}, [tab,'session-1']]),
  ['iy',{},[]], ['Yf',{activeSessionId:null,onSessionSelect:noop,onCloseSession:noop}],
  ['Yf',{activeSessionId:'session-1',onSessionSelect:noop,onCloseSession:noop}],
];
function snapshot(components) {
  return JSON.parse(JSON.stringify(scenarios.map(([id,props,state]) => {
    values = [...(state || [])]; cursor=0;
    return components[id](props);
  }), (key,value) => typeof value === 'function' ? '[callback]' : value));
}
// Optional fixture regeneration from AST-extracted definitions in the exact previous bundle.
// Normal test execution has no TypeScript or legacy extraction dependency.
if (process.env.P09_PREVIOUS_DEFINITIONS) {
  const old = JSON.parse(await readFile(process.env.P09_PREVIOUS_DEFINITIONS,'utf8'));
  const context = vm.createContext({wt,b,...bindings});
  vm.runInContext(old.vu.declaration, context);
  const components = Object.fromEntries(Object.keys(current).map(id => [id, vm.runInContext(`(${old[id].expression})`,context)]));
  await writeFile(new URL('./fixtures/p09-shell-baseline.json',import.meta.url), JSON.stringify(snapshot(components),null,2)+'\n');
}
const baseline=JSON.parse(await readFile(new URL('./fixtures/p09-shell-baseline.json',import.meta.url),'utf8'));
assert.deepEqual(snapshot(current),baseline);
let toggled=[],stopped=0;
const event={stopPropagation:()=>stopped++};
const priorIdCalls=idCalls;
current.yl({checked:true,onChange:v=>toggled.push(v)}).props.onClick(event);
current.yl({checked:false,disabled:true,onChange:v=>toggled.push(v)}).props.onClick(event);
assert.equal(idCalls,priorIdCalls+2);assert.deepEqual(toggled,[false]);assert.equal(stopped,2);
const clicked=[];
for(const id of ['_u','eh','ay']) current[id]({tabId:'chat',currentTab:'settings',onClick:v=>clicked.push(v)}).props.onClick();
current.ay({tabId:'chat',currentTab:'settings',disabled:true,onClick:v=>clicked.push(v)}).props.onClick();
assert.deepEqual(clicked,['chat','chat','chat']);
const events=[];const tabs=Array.from({length:3},(_,i)=>({focus:()=>events.push(`focus${i}`),click:()=>events.push(`click${i}`)}));
for(const tab of tabs) tab.closest=selector=>{assert.equal(selector,'[role="tablist"]');return {querySelectorAll:sel=>{assert.equal(sel,'[role="tab"]:not([disabled])');return tabs;}};};
for(const [key,index,expected] of [['ArrowRight',2,0],['ArrowLeft',0,2],['ArrowUp',1,0],['ArrowDown',0,1],['Home',2,0],['End',0,2]]) {
  events.length=0;handleTabKeyDown({key,currentTarget:tabs[index],preventDefault:()=>events.push('prevent')});
  assert.deepEqual(events,['prevent',`focus${expected}`,`click${expected}`]);
}
events.length=0;handleTabKeyDown({key:'Enter',currentTarget:tabs[0],preventDefault:()=>events.push('prevent')});
handleTabKeyDown({key:'Home',currentTarget:{closest:()=>null},preventDefault:()=>events.push('prevent')});assert.deepEqual(events,[]);
function renderShell(){cursor=0;return current.iy({});}
function panel(tree){return tree.props.children[1].props.children[1].props.children;}
function tabElements(tree){return tree.props.children[1].props.children[0].props.children.props.children;}
values=[];let tree=renderShell();assert.equal(panel(tree).type,'Characters');
tabElements(tree)[3].props.onClick('chat');tree=renderShell();assert.equal(panel(tree).type,'Chat');
panel(tree).props.onSessionSelect('chosen');tree=renderShell();assert.equal(panel(tree).props.activeSessionId,'chosen');
tabElements(tree)[4].props.onClick('settings');tree=renderShell();assert.equal(panel(tree).type,'Settings');
tabElements(tree)[3].props.onClick('chat');tree=renderShell();assert.equal(panel(tree).props.activeSessionId,'chosen');
panel(tree).props.onCloseSession();tree=renderShell();assert.equal(panel(tree).props.activeSessionId,null);
let selected;current.Yf({onSessionSelect:v=>selected=v}).props.onSessionSelect('x');assert.equal(selected,'x');
let closed=false;current.Yf({activeSessionId:'x',onCloseSession:()=>closed=true}).props.onBack();assert.equal(closed,true);
const bundle=await readFile(new URL('../assets/app-production-v1.3.6.js',import.meta.url),'utf8');
for(const marker of ['kt=__stsCreateIcon(jsxRuntime)','Ct=__stsCreateAppHeader(jsxRuntime,kt)','yl=__stsCreateToggleSwitch(jsxRuntime,React,cn)','_u=__stsCreatePresetTab(jsxRuntime)','eh=__stsCreateSettingsTab(jsxRuntime)','ay=__stsCreateMainTab(jsxRuntime,kt)','iy=__stsCreateApplicationShell(jsxRuntime,React,{Header:Ct,MainTab:ay,Characters:eu,Presets:ku,Lorebooks:Eu,Chat:Yf,Settings:th})','Yf=__stsCreateChatRoute(jsxRuntime,{ChatSession:Jf,SessionList:ph})']) assert.equal(bundle.split(marker).length-1,1);
assert.ok(!bundle.includes('onKeyDown:vu'));
console.log(`P09 shell: ${scenarios.length} legacy element trees, keyboard navigation, switches, chat routing and shell state: OK`);
