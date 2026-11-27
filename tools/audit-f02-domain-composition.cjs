// Compare the host composition contract with the immutable imported F02 snapshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const baseline = '2abd57d73301389ba00319a8898171ab3bfe0ec8';
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const historical = file => execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'});
const parse = (file, text) => {
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0,file);
  return ast;
};
const stages = [
  ['persistence','composePersistence',['__stsBackupRestoreService']],
  ['provider','composeConnections',['generateOnce','__stsHostGeneration','__stsGenerationGateway','sessionStore']],
  ['persistence','composeBackupAndGuards',[]],
  ['store','composeStores',['useToast']],
  ['conversation','composeConversation',['broadcastRuntimeMessage','useToast','__stsGenerationGateway']],
  ['provider','composeGeneration',[]],
  ['runtime','composeCardRuntime',['useToast']],
  ['ui','composeApplicationUi',[]],
];
const publicUi = ['useToast','ErrorBoundary','InitialLoader','ToastProvider','SpeechProvider','CardPopupProvider','ApplicationShell'];
const unique = name => Object.freeze({ sentinel:name });
const contracts = [];
for (const [owner, name, late] of stages) {
  const file = 'src/app/composition/'+owner+'-composition.js';
  const before = historical(file);
  if (owner !== 'ui') {
    const expected = owner === 'persistence' ? before.replace('ctx.__stsBackupRestoreService = __stsBackupRestoreService;','ctx.publishBackupService(__stsBackupRestoreService);') : before;
    assert.equal(read(file),expected,'Unreviewed initialization change: '+file);
  }
  const ast = parse(file,before);
  const fn = ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert.ok(fn,name);
  const declaration = fn.body.statements[0].declarationList.declarations[0];
  assert.ok(ts.isObjectBindingPattern(declaration.name));
  const inputs=declaration.name.elements.map(element=>element.name.text);
  const result=fn.body.statements.at(-1);
  assert.ok(ts.isReturnStatement(result)&&ts.isObjectLiteralExpression(result.expression),name);
  const outputs=result.expression.properties.map(property=>property.name.text);
  contracts.push({name, inputs, late, outputs, values:Object.fromEntries(outputs.map(key=>[key,unique(name+'.'+key)]))});
}
const platformValues=new Map();
const hostFile='src/app/host.js';
function inspectHost(text, narrowed) {
  const ast=parse(hostFile,text);
  const globals={};
  const trace=[], allInputs=[], distinct=new Set();
  for (const statement of ast.statements.filter(ts.isImportDeclaration)) {
    const names=statement.importClause?.namedBindings;
    if(!names||!ts.isNamedImports(names))continue;
    for(const item of names.elements){
      const name=item.name.text;
      if(!platformValues.has(name))platformValues.set(name,unique('platform.'+name));
      globals[name]=platformValues.get(name);
    }
  }
  const snapshot=(contract,input)=>Object.fromEntries([...contract.inputs,...contract.late].map(key=>[key,input[key]]));
  for(const contract of contracts){
    globals[contract.name]=input=>{
      trace.push(contract.name);
      allInputs.push({contract,input,before:snapshot(contract,input)});
      if(narrowed){
        assert.ok(!distinct.has(input),'Shared mutable context escaped into '+contract.name);
        distinct.add(input);
        const keys=[...contract.inputs,...contract.late,...(contract.name==='composeBackupAndGuards'?['publishBackupService']:[])];
        assert.deepEqual(Object.keys(input).sort(),keys.sort(),'Unexpected input contract: '+contract.name);
        for(const key of contract.late)assert.equal(typeof Object.getOwnPropertyDescriptor(input,key).get,'function','Late getter lost: '+key);
      }
      if(contract.name==='composeBackupAndGuards'){
        const guard=contract.values.__stsBackupRestoreService;
        if(narrowed)input.publishBackupService(guard);
        else input.__stsBackupRestoreService=guard;
        const persistence=allInputs[0].input;
        assert.equal(persistence.__stsBackupRestoreService,guard,'Restore service must be visible before migration and guard installation');
      }
      if(narrowed&&contract.name==='composeApplicationUi'){
        return Object.fromEntries(publicUi.map(key=>[key,contract.values[key]]));
      }
      return contract.values;
    };
  }
  let mounted;
  globals.initializeMapSet=()=>trace.push('initializeMapSet');
  globals.mountApplication=value=>{ trace.push('mountApplication'); mounted=value; };
  const executable=ast.statements.filter(node=>!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node)).map(node=>node.getText(ast)).join('\n');
  vm.runInNewContext(executable,globals,{timeout:1000});
  assert.deepEqual(trace,[...contracts.map(contract=>contract.name),'initializeMapSet','mountApplication']);
  return {mounted, allInputs:allInputs.map(({contract,input,before})=>({name:contract.name,before,afterLate:Object.fromEntries(contract.late.map(key=>[key,input[key]]))}))};
}
const old=inspectHost(historical(hostFile),false);
const current=inspectHost(read(hostFile),true);
for(let index=0;index<contracts.length;index++){
  const expected=old.allInputs[index], actual=current.allInputs[index];
  assert.equal(actual.name,expected.name);
  for(const key of Object.keys(expected.before))assert.equal(actual.before[key],expected.before[key],actual.name+' input '+key);
  for(const key of Object.keys(expected.afterLate))assert.equal(actual.afterLate[key],expected.afterLate[key],actual.name+' late '+key);
}
assert.deepEqual(Object.keys(current.mounted),Object.keys(old.mounted));
for(const key of Object.keys(old.mounted))assert.equal(current.mounted[key],old.mounted[key],'Mount binding '+key);
console.log(JSON.stringify({ok:true,domainStages:stages.length,explicitLateReads:contracts.reduce((total,contract)=>total+contract.late.length,0),publishedUi:publicUi.length,initializationOrder:stages.map(stage=>stage[1])},null,2));
