import { portableCompositionPaths } from './helpers/composition-paths.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTableCellInput, createModelSelect } from '../src/ui/components/form-controls.js';
import { createTooltip, createCollapsibleSection, createSectionNavigator } from '../src/ui/components/section-controls.js';
import { createGenerateEntryButton } from '../src/features/world-info/ui/generate-entry-button.js';
const jsx=(type,props,key)=>({type,props,key});
const wt={jsx,jsxs:jsx,Fragment:'Fragment'}, b={useMemo:fn=>fn()};
const components={Bf:createTableCellInput(wt),Ed:createModelSelect(wt,b),cn:createTooltip(wt),ln:createCollapsibleSection(wt),St:createSectionNavigator(wt),kf:createGenerateEntryButton(wt)};
const noop=()=>{};
const options=[{id:'g1',name:'Gemini 1'},{id:'g2',name:'Gemini 2'}];
const scenarios=[
 ['Bf',{value:0,column:{type:'number',label:'Score'},onSave:noop}],
 ['Bf',{value:null,column:{id:'name'},onSave:noop}],
 ['Bf',{value:'abc',onSave:noop}],
 ['Ed',{label:'Chat Model ID',provider:'proxy',value:'g1',options,onChange:noop}],
 ['Ed',{label:'Tool Model ID',provider:'aistudio',value:'custom-id',options,onChange:noop}],
 ['Ed',{label:'Model',value:'',options:[],onChange:noop}],
 ['cn',{text:'Help',children:jsx('span',{children:'X'})}],
 ['cn',{text:'',children:'X'}],
 ['ln',{title:'Title',description:'Details',children:'Body'}],
 ['ln',{title:'Closed',defaultOpen:false,children:'Body'}],
 ['St',{items:[{target:'one',label:'One'},{target:'two',label:'Two'}]}],
 ['St',{items:[]}],
 ['kf',{onOpen:noop}],
];

const snapshot=JSON.parse(JSON.stringify(scenarios.map(([id,props])=>components[id](props)),(key,value)=>typeof value==='function'?'[callback]':value));
const baseline=JSON.parse(await readFile(new URL('./fixtures/p09-controls-baseline.json',import.meta.url),'utf8'));
assert.deepEqual(snapshot,baseline);
let saved;components.Bf({value:1,onSave:value=>saved=value,column:{type:'number'}}).props.onChange({target:{value:'42'}});assert.equal(saved,'42');
const changes=[];const model=components.Ed({label:'Model',provider:'proxy',value:'custom-id',options,onChange:value=>changes.push(value)});
assert.equal(model.props['data-sts-provider'],'proxy');
model.props.children[1].props.onChange({target:{value:'g2'}});model.props.children[1].props.onChange({target:{value:'custom_option'}});model.props.children[2].props.children.props.onChange({target:{value:'typed'}});assert.deepEqual(changes,['g2','','typed']);
let scrolled;const section={open:false,querySelector:()=>({textContent:'Part one'}),scrollIntoView:options=>scrolled=options};
const nav=components.St({items:[{target:'one',label:'One'}]});const click=nav.props.children[1].props.children[0].props.onClick;
click({currentTarget:{closest:()=>null}});assert.equal(scrolled,undefined);
click({currentTarget:{closest:()=>({querySelectorAll:()=>[section]})}});assert.equal(section.open,true);assert.deepEqual(scrolled,{behavior:'smooth',block:'start'});
let opened=0;components.kf({onOpen:()=>opened++}).props.children[0].props.onClick();assert.equal(opened,1);
const bundle=(await Promise.all(portableCompositionPaths.map(p=>readFile(new URL(p,import.meta.url),'utf8')))).join('\n');
for(const binding of ['TableCellInput=__stsCreateTableCellInput(jsxRuntime)','ModelSelect=__stsCreateModelSelect(jsxRuntime,React)','Tooltip=__stsCreateTooltip(jsxRuntime)','CollapsibleSection=__stsCreateCollapsibleSection(jsxRuntime)','SectionNavigator=__stsCreateSectionNavigator(jsxRuntime)','GenerateEntryButton=__stsCreateGenerateEntryButton(jsxRuntime)']) {
  assert.equal(bundle.split(binding).length-1,1);assert.ok(bundle.indexOf('jsxRuntime')<bundle.indexOf(binding));
}
console.log('P09 controls: 13 legacy tree snapshots, model selection, table editing, navigation, action and build wiring: OK');
