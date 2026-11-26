import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const fixture=new URL('./fixtures/p09-batch-ui-baseline.json',import.meta.url);
const records=JSON.parse(await readFile(fixture,'utf8'));
const baselineFile=process.env.P09_BATCH_BASELINE;
let declarations=new Map();
if(baselineFile){
  const ts=createRequire(import.meta.url)(process.env.TYPESCRIPT_PATH||'typescript');
  const source=ts.createSourceFile(baselineFile,await readFile(baselineFile,'utf8'),ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
  for(const statement of source.statements) if(ts.isVariableStatement(statement)) for(const d of statement.declarationList.declarations) if(ts.isIdentifier(d.name)&&d.initializer) declarations.set(d.name.text,d.initializer.getText(source));
}
const noop=()=>{};
const entry={uid:'entry-1',comment:'Test entry',key:['key'],keys:['key'],secondary_keys:[],keysecondary:[],content:'Entry text',enabled:true,constant:false,position:0};
const prompt={identifier:'prompt-1',name:'Prompt',content:'Prompt text',enabled:true,role:'system'};
const lorebook={name:'Test book',book:{entries:[entry]}};
const card={name:'Test character',description:'Description',first_mes:'Hello',alternate_greetings:['Hello'],group_only_greetings:[],tags:['tag'],extensions:{},character_book:{entries:[entry]},mes_example:'Example'};
const props=new Proxy({textToCopy:'test',macro:{name:'{{test}}',description:'Test'},label:'Test',value:'test',values:['test'],options:[{value:'test',label:'Test'}],min:0,max:10,step:1,card,preset:{name:'Preset',extensions:{},prompts:[prompt]},prompt,entry,lorebook,lorebooks:[lorebook],availableLorebooks:[lorebook],entries:[entry],prompts:[prompt],character:{fileName:'character.json',card},script:{id:'script',scriptName:'Test',name:'Test',findRegex:'x',replaceString:'y',placement:[],enabled:true},scripts:[],toast:{id:1,message:'Test',type:'success'},statusMap:{},visualState:{},errorState:{hasError:true,canIgnore:true,message:'Test'},sections:[{content:'Test'}],actions:[{label:'Test',action:noop}],isOpen:true,isEnabled:true,isPinned:true,index:0,movingPromptIndex:null,mode:'rename',originalName:'Old',initialFileName:'test',fileExtension:'.json',title:'Test',initialNote:'Note',originalText:'Old',refinedText:'New',content:'Content',placement:0,syncStatus:'synced'}, {get:(obj,key)=>key in obj?obj[key]:typeof key==='string'&&key.startsWith('on')?noop:undefined});
function dependencies(record,scenario){
  let cursor=0;
  const jsx=(type,props,key)=>({type,props,key});
  const b={useState(init){const i=cursor++;return [scenario==='open'&&i===0&&['PromptEditDialog','LorebookEntryDialog'].includes(record.name)?(record.name==='PromptEditDialog'?prompt:entry):typeof init==='function'?init():init,noop];},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:init=>({current:init}),useId:()=>':test:',useEffect:noop,useLayoutEffect:noop};
  const base={...Object.fromEntries(record.dependencies.map(x=>[x,'component:'+x])),b,wt:{jsx,jsxs:jsx,Fragment:'Fragment'},Xl:noop,hl:()=>({showToast:noop}),sn:()=>({lorebooks:[lorebook],isLoading:false,error:null,loadLorebooks:noop}),ol:fn=>fn({rpgNotification:'Test notification',setRpgNotification:noop}),ns:()=>({source:'gemini'}),Cs:()=>false,gs:()=>'',sl:()=>'',ul:()=>'',cu:[],xu:{}};
  const semantic={
    react:b,jsxRuntime:base.wt,Tooltip:base.cn,CopyButton:base.un,Icon:base.kt,
    TextInput:base.dn,TextArea:base.hn,CollapsibleSection:base.ln,ToggleSwitch:base.yl,
    LoadingIndicator:base.mn,SectionNavigator:base.St,SearchableSelect:base.Cl,
    NumberInput:base.nu,StringListInput:base.au,InlineCopyButton:base.uu,
    useDialogFocus:base.Xl,useToast:base.hl,lorebookStore:base.sn,sessionStore:base.ol,
    RegexScriptEditor:base.xl,RegexScriptList:base._l,TavernScriptEditor:base.wl,TavernScriptList:base.kl,
    CharacterCoreSection:base.pn,CharacterScenarioSection:base.fl,CharacterMetadataSection:base.bl,
    CharacterLorebookSection:base.vl,CharacterExtensionsSection:base.Sl,CharacterDialogueSection:base.gl,
    MythicSection:base.Ml,readProxyForTools:base.Cs,generateProxyText:base.Ks,
    generateAiStudioToolText:base.__stsAiStudioToolText,resolveCurrentModel:base.gs,
    readConnectionSettings:base.ns,createGeminiClient:base.sl,geminiSafetySettings:base.ul,
    PresetBasicSection:base.tu,SamplingSection:base.ru,GenerationControlSection:base.iu,
    InstructSection:base.ou,ExperimentalSection:base.su,MacroReference:base.du,
    PromptEditDialog:base.hu,PromptPreview:base.mu,PromptListItem:base.pu,
    macroReference:base.cu,EntrySelectionControl:base.Cc,handleRadioKeyDown:base.xu,
    EntryPositionControl:base.Sc,LorebookEntryDialog:base.Ec,LorebookEntryCard:base.Nc,
    LorebookUploadControl:base.Cu,FileNameDialog:base.Ql,LorebookListItem:base.Su,LorebookManager:base.Xc
  };
  return {...base,...semantic};
}
const hash=tree=>createHash('sha256').update(JSON.stringify(tree,(_,v)=>typeof v==='function'?'[callback]':v)??'undefined').digest('hex');
let cases=0;
for(const record of records){
  const module=await import(new URL('../'+record.path,import.meta.url));
  const factory=module['create'+record.name];assert.equal(typeof factory,'function',record.name);
  if(baselineFile)record.cases=[];
  for(const scenario of baselineFile?['default',...(['PromptEditDialog','LorebookEntryDialog'].includes(record.name)?['open']:[])]:record.cases.map(x=>x.scenario)){
    const next=factory(()=>dependencies(record,scenario));
    const current=hash(next(props));
    if(baselineFile){
      const original=vm.runInNewContext('('+declarations.get(record.symbol)+')',dependencies(record,scenario));
      const expected=hash(original(props)); assert.equal(current,expected,record.name+': '+scenario);record.cases.push({scenario,hash:expected});
    } else assert.equal(current,record.cases.find(x=>x.scenario===scenario).hash,record.name+': '+scenario);
    cases++;
  }
}
assert.equal(records.length,51);assert.equal(cases,53);
if(baselineFile)await writeFile(fixture,JSON.stringify(records,null,2)+'\n');
console.log(`${records.length} recovered components, ${cases} baseline element-tree comparisons`);
