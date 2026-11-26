// Inventory source recovery candidates in the generated host; never edits the bundle.
// JSX factory detection is a heuristic, not a proof of React component identity.
const fs = require('node:fs');
const path = require('node:path');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const file = path.resolve(process.argv[2] || path.join(root, 'assets/app-production-v1.3.6.js'));
const program = ts.createProgram([file], {allowJs:true, checkJs:true, noLib:true, noResolve:true, target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext});
const source = program.getSourceFile(file), checker = program.getTypeChecker();
const text = source.text;
function walk(node, fn) { fn(node); ts.forEachChild(node, child => walk(child,fn)); }
function jsxFactory(call) {
  if (!ts.isCallExpression(call)) return false;
  let expression = call.expression;
  while(ts.isParenthesizedExpression(expression))expression=expression.expression;
  if(ts.isBinaryExpression(expression)&&expression.operatorToken.kind===ts.SyntaxKind.CommaToken)expression=expression.right;
  return ts.isPropertyAccessExpression(expression)&&['jsx','jsxs'].includes(expression.name.text);
}
function collect(name, fn) {
  const external = new Set(), labels = new Set(); let jsxCalls=0, hooks=0;
  const start=fn.getStart(source), end=fn.end;
  walk(fn,node=>{
    if(jsxFactory(node))jsxCalls++;
    if(ts.isPropertyAccessExpression(node)&&/^use[A-Z]/.test(node.name.text))hooks++;
    if(ts.isStringLiteralLike(node)&&node.text.length>=4&&node.text.length<=100&&/[À-ỹ]/u.test(node.text)&&!node.text.includes('\n'))labels.add(node.text);
    if(!ts.isIdentifier(node))return;
    if(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node||ts.isPropertyAssignment(node.parent)&&node.parent.name===node&&!ts.isShorthandPropertyAssignment(node.parent))return;
    const symbol=checker.getSymbolAtLocation(node);
    if(symbol?.declarations?.some(d=>d.getStart(source)<start||d.end>end))external.add(node.text);
  });
  if(!jsxCalls)return;
  return {name,start,end,chars:end-start,jsxCalls,hooks,externalBindings:[...external].sort(),labels:[...labels].slice(0,6)};
}
const candidates=[];
for(const statement of source.statements){
  if(ts.isFunctionDeclaration(statement)&&statement.name){const item=collect(statement.name.text,statement);if(item)candidates.push(item);}
  if(ts.isVariableStatement(statement))for(const decl of statement.declarationList.declarations){
    const init=decl.initializer;
    if(!ts.isIdentifier(decl.name)||!init||!ts.isArrowFunction(init)&&!ts.isFunctionExpression(init))continue;
    const item=collect(decl.name.text,init);if(item)candidates.push(item);
  }
}
console.log(JSON.stringify({typescript:ts.version,file:path.relative(root,file),syntaxDiagnostics:program.getSyntacticDiagnostics(source).length,candidateCount:candidates.length,candidates:candidates.sort((a,b)=>a.externalBindings.length-b.externalBindings.length||a.chars-b.chars),limitations:['Top-level functions and function-valued declarations containing JSX factory calls only. Nested components, component wrappers and dynamic references need manual review.','Bindings are lexical references in this bundle, not a complete runtime dependency graph. Labels are hints, not recovered component names.','Extraction requires explicit dependencies and behavioral parity; formatting minified code alone is not source recovery.']},null,2));
