// F01 scoped alpha-equivalence check: compare lexical binding identities rather
// than spellings, but preserve property names, literal tokens and syntax.
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function fingerprint(content) {
  const fileName = '/f01-ui.js';
  const options = {allowJs:true, checkJs:true, noLib:true, noResolve:true, target:ts.ScriptTarget.Latest, module:ts.ModuleKind.ESNext};
  const source = ts.createSourceFile(fileName, content, options.target, true, ts.ScriptKind.JS);
  if(source.parseDiagnostics.length) throw Error(source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  const host = ts.createCompilerHost(options);
  host.getSourceFile = name => name === fileName ? source : undefined;
  host.fileExists = name => name === fileName;
  host.readFile = name => name === fileName ? content : undefined;
  const program = ts.createProgram([fileName],options,host);
  const checker = program.getTypeChecker();
  const bindings = new Map();
  function register(name) {
    if (!name) return;
    if (ts.isIdentifier(name)) {
      const symbol = checker.getSymbolAtLocation(name);
      if(symbol && !bindings.has(symbol)) bindings.set(symbol, bindings.size);
    } else if(ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for(const element of name.elements) if(ts.isBindingElement(element)) register(element.name);
    }
  }
  function visit(node) {
    if(ts.isVariableDeclaration(node)||ts.isParameter(node)||ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node)||ts.isImportClause(node)||ts.isImportSpecifier(node)||ts.isNamespaceImport(node)) register(node.name);
    ts.forEachChild(node,visit);
  }
  visit(source);
  const local = (name,symbol=checker.getSymbolAtLocation(name)) => bindings.has(symbol)?'binding:'+bindings.get(symbol):'identifier:'+name.text;
  const out=[];
  function emit(value,node) {out.push({value,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1});}
  function key(node) {if(ts.isComputedPropertyName(node)){emit('computed-key',node); walk(node.expression);return;} emit('key:'+node.getText(source),node);}
  function walk(node){
    if(ts.isBindingElement(node)) {
      emit('BindingElement',node);
      if(ts.isObjectBindingPattern(node.parent)&&!node.dotDotDotToken)key(node.propertyName||node.name);
      if(node.dotDotDotToken) emit('rest',node.dotDotDotToken);
      walk(node.name);if(node.initializer){emit('initializer',node.initializer);walk(node.initializer);}emit('end',node);return;
    }
    if(ts.isPropertyAssignment(node)||ts.isShorthandPropertyAssignment(node)){
      emit('Property',node);key(node.name);
      if(ts.isShorthandPropertyAssignment(node))emit(local(node.name,checker.getShorthandAssignmentValueSymbol(node)),node.name);else walk(node.initializer);
      emit('end',node);return;
    }
    if(ts.isIdentifier(node)){
      const parent=node.parent;
      if((ts.isPropertyAccessExpression(parent)&&parent.name===node)||(ts.isMethodDeclaration(parent)&&parent.name===node)||(ts.isPropertyDeclaration(parent)&&parent.name===node)||((ts.isFunctionDeclaration(parent)||ts.isClassDeclaration(parent))&&parent.name===node&&parent.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))) {emit('identifier:'+node.text,node);return;}
      emit(local(node),node);return;
    }
    const children=node.getChildren(source);
    if(!children.length){emit(ts.SyntaxKind[node.kind]+':'+node.getText(source),node);return;}
    emit(ts.SyntaxKind[node.kind],node);for(const child of children)walk(child);emit('end',node);
  }
  walk(source);return out;
}
function compare(before,after){const a=fingerprint(before),b=fingerprint(after);const n=Math.max(a.length,b.length);for(let i=0;i<n;i++)if(a[i]?.value!==b[i]?.value)return {index:i,before:a[i],after:b[i]};return null;}
module.exports={compare};
if(require.main===module){
  assert.equal(compare('export function Demo({x:e}) {const {b}=get();let t=e; return b(t)}','export function Demo({x:value}) {const {b:react}=get();let result=value; return react(result)}'),null);
  assert.equal(compare('function x(a){return {a}}','function x(value){return {a:value}}'),null);
  assert.ok(compare('function f(e){let t=e;return t}','function f(value){let result=value;return t}'));
  assert.ok(compare('function f(e){return e.replace(/a/i,"x")}','function f(value){return value.replace(/a/g,"x")}'));
  assert.ok(compare('function f(e){return e.name}','function f(value){return value.other}'));
  assert.ok(compare('function f(e){return e+1}','function f(value){return value-1}'));
  assert.ok(compare('function f(e){return {key:e}}','function f(value){return {other:value}}'));
  console.log('F01 alpha-equivalence fixtures: OK');
  const root=path.resolve(__dirname,'..');
  const baseline=process.argv[2];
  if(!/^[0-9a-f]{40}$/.test(baseline||''))throw Error('Pass a full baseline commit SHA');
  const files=[
    'src/ui/shell/providers.js',
    'src/features/presets/ui/preset-sections.js',
    'src/features/world-info/ui/lorebook-controls.js',
    'src/ui/settings/settings-screens.js',
    'src/features/catalog/ui/character-sections.js',
    'src/features/catalog/ui/catalog-screens.js',
    'src/diagnostics/ui/diagnostic-panels.js'
  ];
  for(const file of files){
    const before=execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
    const after=fs.readFileSync(path.join(root,file),'utf8');
    const mismatch=compare(before,after);
    if(mismatch){console.error(file,JSON.stringify(mismatch));process.exitCode=1;}else console.log('F01 alpha-equivalence PASS: '+file);
  }
}
