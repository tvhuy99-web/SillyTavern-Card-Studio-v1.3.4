// AST inventory of short lexical bindings. This is a review aid, not a dead-code
// detector or proof that every short identifier is a minifier artifact.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const relative = file => path.relative(root, file).split(path.sep).join('/');
const inScope = file => file.startsWith('src/') && !file.startsWith('src/vendor/') && /\.[cm]?js$/.test(file);
const shortName = /^[$A-Za-z_][$\w]?$/;
const walkFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walkFiles(file) : [file];
});
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

function inspect(file, content) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw Error(file + ': ' + source.parseDiagnostics.length + ' parse diagnostic(s)');
  const bindings = [];
  function add(name, kind, topLevel = false) {
    if (!name) return;
    if (ts.isIdentifier(name)) {
      if (shortName.test(name.text)) bindings.push({ name: name.text, kind, topLevel, line: source.getLineAndCharacterOfPosition(name.getStart(source)).line + 1 });
    } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) if (ts.isBindingElement(element)) add(element.name, kind, topLevel);
    }
  }
  function visit(node) {
    if (ts.isVariableDeclaration(node)) {
      const topLevel = ts.isVariableDeclarationList(node.parent) && ts.isVariableStatement(node.parent.parent) && node.parent.parent.parent === source;
      add(node.name, ts.isCatchClause(node.parent) ? 'catch' : 'variable', topLevel);
    } else if (ts.isParameter(node)) {
      add(node.name, 'parameter');
    } else if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      add(node.name, 'function', node.parent === source);
    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      add(node.name, 'class', node.parent === source);
    } else if (ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node)) {
      add(node.name, 'import', true);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const byKind = {};
  for (const item of bindings) byKind[item.kind] = (byKind[item.kind] || 0) + 1;
  return { file, count: bindings.length, topLevel: bindings.filter(item => item.topLevel).length, byKind, bindings };
}
function inventory(ref) {
  const files = ref ? git(['ls-tree', '-r', '--name-only', '-z', ref, '--', 'src']).split('\0').filter(inScope) : walkFiles(path.join(root, 'src')).map(relative).filter(inScope);
  const rows = files.sort().map(file => inspect(file, ref ? git(['show', ref + ':' + file]) : fs.readFileSync(path.join(root, file), 'utf8')));
  const byKind = {};
  for (const row of rows) for (const [kind, count] of Object.entries(row.byKind)) byKind[kind] = (byKind[kind] || 0) + count;
  return { files: rows.length, count: rows.reduce((n, row) => n + row.count, 0), topLevel: rows.reduce((n, row) => n + row.topLevel, 0), byKind, rows };
}

// These short names have ordinary meanings in the reviewed first-party code.
// They are not a general exemption for property aliases or generated scripts.
const conventionalNames = Object.freeze({
  id: 'identifier', db: 'database', tx: 'transaction', op: 'operation',
  fn: 'function callback', ui: 'UI-facing action', ok: 'success flag',
  _: 'intentionally unused parameter or caught error'
});
function isConventionalBinding(binding) {
  return Object.hasOwn(conventionalNames, binding.name) &&
    (binding.name !== '_' || binding.kind === 'catch' || binding.kind === 'parameter') &&
    !binding.topLevel;
}
function reviewBindings(rows) {
  const acceptedByName = {};
  const unresolved = [];
  for (const row of rows) for (const binding of row.bindings) {
    if (isConventionalBinding(binding)) acceptedByName[binding.name] = (acceptedByName[binding.name] || 0) + 1;
    else unresolved.push({ file: row.file, ...binding });
  }
  return { accepted: Object.values(acceptedByName).reduce((total, count) => total + count, 0),
    acceptedByName, unresolved: unresolved.length, candidates: unresolved };
}
function inspectCompositionAliases(content) {
  const source = ts.createSourceFile('src/app/host.js', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if(source.parseDiagnostics.length) throw Error('Cannot parse composition root');
  const entries=[];
  const record=(key,value,kind,node)=>{
    if(!key||!value||!ts.isIdentifier(key)||!shortName.test(key.text)||!ts.isIdentifier(value)||shortName.test(value.text)) return;
    entries.push({key:key.text,binding:value.text,kind,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1});
  };
  function visit(node) {
    if(ts.isBindingElement(node)&&node.propertyName) record(node.propertyName,node.name,'destructure',node);
    if(ts.isPropertyAssignment(node))record(node.name,node.initializer,'property',node);
    if(ts.isGetAccessorDeclaration(node)&&node.body?.statements.length===1&&ts.isReturnStatement(node.body.statements[0]))record(node.name,node.body.statements[0].expression,'getter',node);
    ts.forEachChild(node,visit);
  }
  visit(source);
  const byKind={},byKey={};
  for(const entry of entries){byKind[entry.kind]=(byKind[entry.kind]||0)+1;byKey[entry.key]=(byKey[entry.key]||0)+1;}
  return {count:entries.length,byKind,byKey,entries};
}


function inspectEmbeddedRuntime() {
  const file = 'src/runtime/card-runtime/core-builder.js';
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw Error('Cannot parse generated runtime builder');
  const declarations = source.statements.filter(ts.isVariableStatement).flatMap(statement => Array.from(statement.declarationList.declarations));
  const declaration = declarations.find(item => ts.isIdentifier(item.name) && item.name.text === 'CARD_RUNTIME_CORE_SOURCE');
  if (!declaration?.initializer || !ts.isStringLiteral(declaration.initializer)) throw Error('Missing embedded classic runtime source');
  const runtime = inspect('embedded CARD_RUNTIME_CORE_SOURCE', declaration.initializer.text);
  return {
    scope: 'Generated classic iframe script containing core template, runtime modules and compatibility fragments; counted separately from first-party JS module inventory.',
    count: runtime.count, byKind: runtime.byKind, topLevel: runtime.topLevel,
    review: reviewBindings([runtime]),
  };
}

const args = process.argv.slice(2);
const index = args.indexOf('--baseline');
const baselineRef = index === -1 ? null : args[index + 1];
if (index !== -1 && (!baselineRef || !/^[0-9a-f]{40}$/.test(baselineRef))) throw Error('--baseline requires a full commit SHA');
const current = inventory(null);
const baseline = baselineRef ? inventory(baselineRef) : null;
const before = new Map(baseline?.rows.map(row => [row.file, row.count]) || []);
const summarize = ({ files, count, topLevel, byKind }) => ({ files, count, topLevel, byKind });
const hostFile = 'src/app/host.js';
const hostAliases = inspectCompositionAliases(fs.readFileSync(path.join(root, hostFile), 'utf8'));
const bindingReview = reviewBindings(current.rows);
const report = {
  scope: 'First-party src/**/*.js, .mjs and .cjs; excludes src/vendor, property keys, export aliases and embedded script strings. Short-name candidates include legitimate abbreviations and loop indices.',
  parser: ts.version,
  conventionalNames,
  bindingReview,
  embeddedRuntime: args.includes('--embedded-runtime') ? inspectEmbeddedRuntime() : null,
  compositionAliasCandidates: { scope: 'Short identifier property keys mapped to longer local names in host.js; includes legitimate keys and repeated dependency edges, not a semantic defect count.', count: hostAliases.count, byKind: hostAliases.byKind, byKey: hostAliases.byKey, ...(args.includes('--details') ? { entries: hostAliases.entries } : {}) },
  baselineRef,
  baseline: baseline ? summarize(baseline) : null,
  current: summarize(current),
  reduction: baseline ? { count: baseline.count - current.count, percent: baseline.count ? Number(((baseline.count - current.count) / baseline.count * 100).toFixed(2)) : null } : null,
  host: { baseline: baseline?.rows.find(row => row.file === 'src/app/host.js')?.topLevel ?? null, current: current.rows.find(row => row.file === 'src/app/host.js')?.topLevel ?? null, baselineTotal: baseline?.rows.find(row => row.file === 'src/app/host.js')?.count ?? null, currentTotal: current.rows.find(row => row.file === 'src/app/host.js')?.count ?? null },
  files: current.rows.filter(row => row.count || before.get(row.file)).map(row => ({ file: row.file, baseline: baseline ? before.get(row.file) ?? 0 : null, count: row.count, topLevel: row.topLevel, ...(args.includes('--details') ? { bindings: row.bindings } : {}) })).sort((a, b) => b.count - a.count || a.file.localeCompare(b.file)),
};
console.log(JSON.stringify(report, null, 2));
if (args.includes('--check-host') && (report.host.current !== 0 || report.host.currentTotal !== 0)) process.exitCode = 1;

if (args.includes('--check-opaque') && bindingReview.unresolved !== 0) process.exitCode = 1;

if (args.includes('--check-embedded-opaque') && (!report.embeddedRuntime || report.embeddedRuntime.review.unresolved !== 0)) process.exitCode = 1;

if (args.includes('--check-host-aliases') && hostAliases.count !== 0) process.exitCode = 1;
