const fs = require('node:fs');
const path = require('node:path');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const rel = file => path.relative(root, file).split(path.sep).join('/');
const list = directory => fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? list(path.join(directory,entry.name)) : entry.name.endsWith('.js') ? [path.join(directory,entry.name)] : []);
const files = list(path.join(root,'src')).sort();
const program = ts.createProgram(files,{allowJs:true,checkJs:false,noLib:true,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler});
const checker=program.getTypeChecker();
const candidates=new Map(), rows=[], parseErrors=[];
const walk=(node,visit)=>{visit(node);ts.forEachChild(node,child=>walk(child,visit));};
function add(node,kind,source) {
  if(!node||!ts.isIdentifier(node))return;
  const symbol=checker.getSymbolAtLocation(node);
  if(!symbol)return;
  candidates.set(symbol,{file:rel(source.fileName),name:node.text,kind,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,refs:0});
}
const exported = node => node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
function pureInitializer(node) {
  return !!node&&(ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isStringLiteralLike(node)||ts.isNumericLiteral(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind));
}
for(const file of files){
 const source=program.getSourceFile(file);
 if(source.parseDiagnostics.length)parseErrors.push({file:rel(file),count:source.parseDiagnostics.length});
 walk(source, node=>{
   if (ts.isFunctionDeclaration(node)&&!exported(node)) add(node.name,'local-function',source);
   if (ts.isVariableDeclaration(node)&&!exported(node.parent?.parent)&&pureInitializer(node.initializer)) add(node.name,'local-pure-value',source);
   if (ts.isBindingElement(node)&&!node.initializer) add(node.name,'binding-element',source);
 });
 for(const statement of source.statements){
  if(ts.isFunctionDeclaration(statement)&&!exported(statement))add(statement.name,'local-function',source);
  if(ts.isVariableStatement(statement)&&!exported(statement))for(const d of statement.declarationList.declarations)if(pureInitializer(d.initializer))add(d.name,'local-pure-value',source);
  if(ts.isImportDeclaration(statement)&&statement.importClause){const clause=statement.importClause;add(clause.name,'import',source);const binding=clause.namedBindings;if(binding&&ts.isNamespaceImport(binding))add(binding.name,'namespace-import',source);else if(binding&&ts.isNamedImports(binding))for(const element of binding.elements)add(element.name,'import',source);}
 }
}
for(const file of files){const source=program.getSourceFile(file);walk(source,node=>{
 if(!ts.isIdentifier(node))return;
 const symbol=ts.isShorthandPropertyAssignment(node.parent)&&node.parent.name===node?checker.getShorthandAssignmentValueSymbol(node.parent):checker.getSymbolAtLocation(node);
 const candidate=candidates.get(symbol);if(!candidate)return;
 if(symbol.declarations?.some(declaration=>declaration.name===node))return;
 candidate.refs++;
});}
for(const candidate of candidates.values())if(candidate.refs===0)rows.push(candidate);
const graph = new Map(files.map(file=>[file,new Set()]));
for(const file of files){const source=program.getSourceFile(file);walk(source,node=>{
 let spec;
 if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))spec=node.moduleSpecifier;
 else if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)spec=node.arguments[0];
 else if(ts.isNewExpression(node)&&node.expression.getText(source)==='URL'&&node.arguments?.[1]?.getText(source)==='import.meta.url')spec=node.arguments[0];
 if(spec&&ts.isStringLiteralLike(spec)&&spec.text.startsWith('.')){const target=path.resolve(path.dirname(file),spec.text.split(/[?#]/)[0]);if(graph.has(target))graph.get(file).add(target);}
});}
const seen=new Set();function visit(file){if(seen.has(file)||!graph.has(file))return;seen.add(file);for(const target of graph.get(file))visit(target);}

for(const file of ['src/app/entry.js','src/app/host.js','src/runtime/card-runtime/core-builder.js'])visit(path.join(root,file));
const result={typescript:ts.version,sourceFiles:files.length,parseErrors,scopeCandidatesReviewed:candidates.size,zeroReferenceCandidates:rows,unreachableFromLiteralRoots:files.filter(file=>!seen.has(file)).map(rel),limitations:['Zero lexical references is not proof of dead code. Review exports, eval, generated scripts, side effects, tests and external consumers before removal.','Literal root reachability does not model computed imports or generated build-time modules.','Vendor code is inventoried but not automatically edited.']};
console.log(JSON.stringify(result,null,2));
if(parseErrors.length)process.exitCode=1;
