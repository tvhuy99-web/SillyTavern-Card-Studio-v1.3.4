const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const { fingerprint } = require('./audit-f02-factory-parity.cjs');
const root = path.resolve(__dirname, '..');
const originalRef = '2abd57d73301389ba00319a8898171ab3bfe0ec8';
const originalPath = 'src/app/composition/ui-composition.js';
const stages = ['editor-foundations', 'catalog-editor', 'preset-catalog', 'settings',
  'session-navigation', 'message-view', 'diagnostics', 'world-info-dialogs', 'rpg-actions', 'application-shell'];
const stageName = stage => 'compose' + stage.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('') + 'Ui';
const parse = (name, source) => {
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0, name + ': parse diagnostics');
  return ast;
};
const read = file => parse(file, fs.readFileSync(path.join(root, file), 'utf8'));
const old = parse(originalPath, execFileSync('git', ['show', originalRef + ':' + originalPath], { cwd: root, encoding: 'utf8' }));
function exportedFunction(ast, name) {
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  assert.equal(functions.length, 1, ast.fileName + ': ' + name);
  return functions[0];
}
function imports(ast) {
  const result = new Map();
  for (const statement of ast.statements.filter(ts.isImportDeclaration)) {
    const module = path.posix.normalize(path.posix.join(path.posix.dirname(ast.fileName), statement.moduleSpecifier.text));
    const clause = statement.importClause;
    assert.ok(clause && !clause.name && clause.namedBindings, 'Expected named/namespace import');
    if (ts.isNamespaceImport(clause.namedBindings)) result.set(clause.namedBindings.name.text, [module, '*']);
    else for (const item of clause.namedBindings.elements) result.set(item.name.text, [module, (item.propertyName || item.name).text]);
  }
  return result;
}
function bindingNames(pattern) {
  assert.ok(ts.isObjectBindingPattern(pattern), 'Expected explicit object dependency contract');
  return pattern.elements.map(element => {
    assert.ok(!element.dotDotDotToken && !element.initializer && !element.propertyName && ts.isIdentifier(element.name), 'Unexpected binding transformation');
    return element.name.text;
  });
}
function returnedKeys(statement) {
  assert.ok(ts.isReturnStatement(statement) && ts.isObjectLiteralExpression(statement.expression));
  return statement.expression.properties.map(property => {
    assert.ok(ts.isShorthandPropertyAssignment(property), 'Return must preserve original binding');
    return property.name.text;
  });
}
function declarations(statements) {
  const names = [];
  for (const statement of statements) {
    if (ts.isFunctionDeclaration(statement)) names.push(statement.name.text);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      else for (const element of declaration.name.elements) names.push(element.name.text);
    }
  }
  return names;
}
const before = exportedFunction(old, 'composeApplicationUi');
const oldStatements = [...before.body.statements];
const domainKeys = new Set(bindingNames(oldStatements[0].declarationList.declarations[0].name));
const oldKeys = returnedKeys(oldStatements.at(-1));
const originalImports = imports(old);
const actualRoot = read(originalPath);
const actualCalls = exportedFunction(actualRoot, 'composeApplicationUi');
const projection = (owner, names) => '{ ' + names.map(name => name + ': ' + owner + '.' + name).join(', ') + ' }';
const expectedRoot = parse('expected.js', 'export function composeApplicationUi(ctx) { const bindings = {}; ' + stages.map(stage => {
  const stageAst = read('src/app/composition/ui/' + stage + '.js');
  const fn = exportedFunction(stageAst, stageName(stage));
  const domain = projection('ctx', bindingNames(fn.parameters[0].name));
  const prior = fn.parameters[1] ? ', ' + projection('bindings', bindingNames(fn.parameters[1].name)) : '';
  return 'Object.assign(bindings, ' + stageName(stage) + '(' + domain + prior + (stage === 'catalog-editor' ? ', () => bindings.__stsModelTestButton' : '') + '));';
}).join(' ') + ' return { useToast: bindings.useToast, ErrorBoundary: bindings.ErrorBoundary, InitialLoader: bindings.InitialLoader, ToastProvider: bindings.ToastProvider, SpeechProvider: bindings.SpeechProvider, CardPopupProvider: bindings.CardPopupProvider, ApplicationShell: bindings.ApplicationShell }; }');
assert.equal(fingerprint(actualCalls, actualRoot), fingerprint(expectedRoot.statements[0], expectedRoot), 'Initialization sequence or late getter changed');
const rootImports = imports(actualRoot);
const priorKeys = new Set();
const movedStatements = [];
let lateReads = 0;
const report = [];
for (const stage of stages) {
  const file = 'src/app/composition/ui/' + stage + '.js';
  assert.deepEqual(rootImports.get(stageName(stage)), [file, stageName(stage)], 'Incorrect stage import: ' + stage);
  const ast = read(file);
  const fn = exportedFunction(ast, stageName(stage));
  const declaredImports = imports(ast);
  for (const [name, dependency] of declaredImports) assert.deepEqual(dependency, originalImports.get(name), 'Changed import: ' + name);
  const domain = bindingNames(fn.parameters[0].name);
  const previous = fn.parameters[1] ? bindingNames(fn.parameters[1].name) : [];
  assert.ok(domain.every(key => domainKeys.has(key)), 'Unknown domain dependency: ' + stage);
  assert.ok(previous.every(key => priorKeys.has(key)), 'Uninitialized UI dependency: ' + stage);
  assert.equal(fn.parameters.length, stage === 'catalog-editor' ? 3 : stage === 'editor-foundations' ? 1 : 2);
  if (stage === 'catalog-editor') assert.equal(fn.parameters[2].name.text, 'readModelTestButton');
  const statements = [...fn.body.statements];
  const outputs = returnedKeys(statements.pop());
  assert.deepEqual(outputs, declarations(statements), 'Stage return contract changed: ' + stage);
  for (const output of outputs) {
    assert.ok(!priorKeys.has(output), 'Duplicate UI binding: ' + output);
    priorKeys.add(output);
  }
  for (const statement of statements) {
    let text = statement.getText(ast);
    if (stage === 'catalog-editor' && text.includes('ModelTestButton: readModelTestButton()')) {
      lateReads++;
      text = text.replace('ModelTestButton: readModelTestButton()', 'ModelTestButton: __stsModelTestButton');
    }
    const synthetic = parse('statement.js', text);
    assert.equal(synthetic.statements.length, 1);
    movedStatements.push(fingerprint(synthetic.statements[0], synthetic));
  }
  report.push({ stage, domainDependencies: domain.length, priorUiDependencies: previous.length, outputs: outputs.length, statements: statements.length });
}
assert.equal(lateReads, 1, 'Exactly one reviewed late UI dependency must be preserved');
assert.deepEqual([...priorKeys], oldKeys, 'Original return keys or order changed');
const expectedStatements = oldStatements.slice(1, -1).map(statement => fingerprint(statement, old));
assert.deepEqual(movedStatements, expectedStatements, 'Factory wiring, callback, expression or initialization order changed');
console.log(JSON.stringify({ ok: true, stages: report, originalStatements: expectedStatements.length, preservedBindings: oldKeys.length, publishedBindings: 7, lateReads }, null, 2));
