// Run from repository root with TypeScript 5.8.3 and the previous P09 Major host.
const fs=require('fs'),ts=require(process.env.TYPESCRIPT_PATH),assert=require('assert/strict'),crypto=require('crypto');if(!process.argv[2])throw Error('Usage: node tools/verify-block-a-recovery.cjs /path/to/P09-Major/src/app/host.js');const records=JSON.parse(fs.readFileSync('docs/architecture/phase-1/evidence/block-a-recovery-parity.json')),text=fs.readFileSync(process.argv[2],'utf8');const baseline=ts.createSourceFile('old.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const decls=new Map;for(const st of baseline.statements){if(ts.isFunctionDeclaration(st)&&st.name)decls.set(st.name.text,st);if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)decls.set(d.name.getText(baseline),d.initializer)}
const parsed=new Map;function source(path){if(!parsed.has(path))parsed.set(path,ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS));return parsed.get(path)}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');let report=[];
for(const r of records){const s=source(r.path),old=decls.get(r.symbol);assert.ok(old,r.symbol);if(r.defaultData){const d=s.statements.filter(ts.isVariableStatement).flatMap(st=>Array.from(st.declarationList.declarations)).find(d=>d.name.getText(s)===r.name);assert.equal(d.initializer.getText(s),old.getText(baseline));report.push({...r,verified:'exact literal'});continue;}
const f=s.statements.find(st=>ts.isFunctionDeclaration(st)&&st.name.text==='create'+r.name);assert.ok(f,r.name);let returned=f.body.statements[0].expression;
if(r.stateOwner){let code=returned.getText(s); // undo external binding qualification; compare token stream to the original.
 // Recover shorthand syntax only at original shorthand positions using the original text. All new references use the reserved name dependencies.
 code=code.replace(/\(0, dependencies\.([$\w]+)\)/g,'$1').replace(/([$\w]+): dependencies\.\1\b/g,'$1').replace(/\bdependencies\.([$\w]+)/g,'$1');
 assert.equal(code,old.getText(baseline),r.name+' state lexical restoration');report.push({...r,verified:'initializer exact after inverse external-binding qualification'});continue;}
const original=r.wrapper?old.arguments[0]:old;
let next=r.wrapper?returned.arguments[0]:returned;
assert.ok(ts.isFunctionExpression(next));assert.deepEqual(next.parameters.map(x=>x.getText(s)),original.parameters.map(x=>x.getText(baseline)),r.name+' params');
if(r.wrapper){assert.equal(returned.arguments.length,old.arguments.length,r.name+' wrapper args');for(let i=1;i<old.arguments.length;i++)assert.equal(returned.arguments[i].getText(s),old.arguments[i].getText(baseline),r.name+' comparator');}
let body=next.body.getText(s),prefix=r.dependencies.filter(x=>x!=='De').length?`const { ${r.dependencies.filter(x=>x!=='De').join(', ')} } = getDependencies();\n`:'';
assert.ok(body.startsWith('{\n'+prefix),r.name+' deps');let raw=body.slice(2+prefix.length);if(r.selfRecursive)raw=raw.replace(/\bVariableTree\b/g,'Lf');if(r.dependencies.includes('De'))raw=raw.replace(/getDependencies\(\)\.De/g,'De');
if(ts.isBlock(original.body))assert.equal('{'+raw,original.body.getText(baseline),r.name+' body');else assert.equal(raw,'return ('+original.body.getText(baseline)+');\n}',r.name+' expression');
report.push({...r,verified:'exact render body and parameters after inverse dependency injection',wrapperComparator:r.wrapper&&old.arguments.length>1?sha(old.arguments[1].getText(baseline)):null});
}
console.log('Verified',report.length,'declarations');// Read-only verification; do not rewrite baseline evidence.
