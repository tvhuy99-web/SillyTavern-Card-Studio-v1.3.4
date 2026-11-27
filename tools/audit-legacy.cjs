const path = require('node:path');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'assets/app-production-v1.3.6.js');
const program = ts.createProgram([file], {allowJs:true, checkJs:true, noLib:true, noResolve:true, target:ts.ScriptTarget.ESNext, module:ts.ModuleKind.ESNext});
const source = program.getSourceFile(file);
const checker = program.getTypeChecker();
const candidates = ['Pc','Mc','Hc','Bc','Uc','Wc','jc','Ac','Ic','Dc','Oc','Rc','Gc','zc','qc'];
const anchor = source.text.indexOf('Pc=new Map,Mc=new Map');
const migrated = anchor < 0;
const ownerAnchor = source.text.indexOf('__stsEmbeddingService=__stsCreateEmbeddingService(');
if(migrated && ownerAnchor < 0) throw new Error('Embedding owner anchor not found; re-identify symbols before using this audit.');
const regionStart = migrated ? ownerAnchor : source.text.lastIndexOf('Ac="embeddings"', anchor);
const legacyEnd = source.text.indexOf(',Jc=',regionStart);
const separateOwnerEnd = source.text.indexOf('createEmbeddingSyncHook({',regionStart);
const regionEnd = legacyEnd >= 0 ? legacyEnd : separateOwnerEnd;
if(regionStart < 0 || regionEnd < 0) throw new Error('Embedding region missing');
const removed = candidates.filter(name=>!['Gc','zc','qc'].includes(name));
const expected = migrated ? ['Gc','zc','qc'] : candidates;
const removedTopLevel = [];
const unresolvedRemoved = [];
const unresolvedKc = [];
const symbols = new Map();
const calls = [];
function walk(node, fn){fn(node);ts.forEachChild(node,c=>walk(c,fn));}
walk(source,node=>{
 if(migrated && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && removed.includes(node.name.text)
   && node.parent?.parent?.parent===source) removedTopLevel.push({name:node.name.text,offset:node.getStart(source)});
 if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&candidates.includes(node.name.text)&&node.pos>=regionStart-2&&node.end<=regionEnd){
  const symbol=checker.getSymbolAtLocation(node.name);
  if(symbol)symbols.set(symbol,{name:node.name.text, declarationOffset:node.name.getStart(source),references:[]});
 }
});
if(symbols.size!==expected.length || [...symbols.values()].some(x=>!expected.includes(x.name))) throw new Error(`Expected ${expected.join(', ')}, found ${[...symbols.values()].map(x=>x.name)}`);
walk(source,node=>{
 if(!ts.isIdentifier(node))return;
 const symbol=checker.getSymbolAtLocation(node);
 if(migrated && !symbol && (removed.includes(node.text) || node.text==='Kc')
   && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name===node)
   && !(ts.isPropertyAssignment(node.parent) && node.parent.name===node)) {
  (node.text==='Kc'?unresolvedKc:unresolvedRemoved).push({name:node.text,offset:node.getStart(source)});
 }
 const found=symbols.get(symbol);
 if(found&&node.getStart(source)!==found.declarationOffset){
  let owner=node.parent;
  while(owner&&!(ts.isVariableDeclaration(owner)&&ts.isIdentifier(owner.name)&&symbols.has(checker.getSymbolAtLocation(owner.name))))owner=owner.parent;
  const ownerSymbol=owner?checker.getSymbolAtLocation(owner.name):undefined;
  found.references.push({offset:node.getStart(source),owner:symbols.get(ownerSymbol)?.name||null});
 }
 if(node.text==='Vs'&&ts.isCallExpression(node.parent)&&node.parent.expression===node&&node.getStart(source)>source.text.indexOf('window.__STS_MODEL_CONNECTION_TEST__')){
  calls.push({offset:node.getStart(source),resolved:Boolean(symbol),declarations:(symbol?.declarations||[]).map(d=>({kind:ts.SyntaxKind[d.kind],offset:d.getStart(source)}))});
 }
});
const data=[...symbols.values()];
const live=new Set(data.filter(x=>x.references.some(r=>!r.owner)).map(x=>x.name));
let changed=true;while(changed){changed=false;for(const x of data)if(!live.has(x.name)&&x.references.some(r=>live.has(r.owner))){live.add(x.name);changed=true;}}
if(migrated && (removedTopLevel.length || unresolvedRemoved.length || unresolvedKc.length)) process.exitCode=1;
console.log(JSON.stringify({typescript:ts.version,file:path.relative(root,file),syntaxDiagnostics:program.getSyntacticDiagnostics(source).length,migrated,removedCandidates:removed,removedTopLevel,unresolvedRemoved,unresolvedKc,embedding:data.map(x=>({...x,reachableFromOutsideCandidateGroup:live.has(x.name)})),modelTestVs:calls,limitations:['Lexical symbol resolution, not runtime coverage or proof of no eval/side effects.','Candidate group only; not a whole-program dead-code elimination analysis.']},null,2));
