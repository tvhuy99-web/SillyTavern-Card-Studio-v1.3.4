// F02: compare complete exported factory syntax trees across file moves.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(__dirname, '..');
const F01 = 'd7b483fbe6d3663c313a4e4523b208156b801396';
const IMPORTED_F02 = '2abd57d73301389ba00319a8898171ab3bfe0ec8';
const UI_OWNERS = new Set([
  'src/features/chat/ui/session-screens.js',
  'src/features/rpg/ui/rpg-screens.js',
  'src/features/chat/ui/message-rendering.js',
  'src/ui/settings/settings-screens.js',
  'src/diagnostics/ui/diagnostic-panels.js',
  'src/features/catalog/ui/character-sections.js',
  'src/features/catalog/ui/catalog-screens.js',
  'src/features/presets/ui/preset-sections.js',
  'src/features/world-info/ui/world-info-screens.js',
  'src/features/world-info/ui/lorebook-controls.js',
  'src/ui/shell/providers.js',
]);
const isSource = name => name.startsWith('src/') && !name.startsWith('src/vendor/') && name.endsWith('.js');
function parse(name, content) {
  const source = ts.createSourceFile(name, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw Error(name + ': ' + source.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
  return source;
}
// Recognize only a pure identity projection: const deps = getDependencies();
// return { key: deps.key, ... }. No arbitrary wrapper or renamed key is allowed.
function identityProjections(source) {
  const projections = new Map();
  for (const fn of source.statements) {
    if (!ts.isFunctionDeclaration(fn) || !fn.name || fn.parameters.length !== 1 ||
        !ts.isIdentifier(fn.parameters[0].name) || fn.parameters[0].name.text !== 'getDependencies' ||
        fn.parameters[0].initializer || fn.parameters[0].dotDotDotToken ||
        fn.body?.statements.length !== 2 || fn.modifiers?.length || fn.asteriskToken) continue;
    const [declaration, result] = fn.body.statements;
    if (!ts.isVariableStatement(declaration) || declaration.declarationList.declarations.length !== 1 ||
        !(declaration.declarationList.flags & ts.NodeFlags.Const) ||
        !ts.isReturnStatement(result) || !result.expression || !ts.isObjectLiteralExpression(result.expression)) continue;
    const binding = declaration.declarationList.declarations[0];
    const call = binding.initializer;
    if (!ts.isIdentifier(binding.name) || !call || !ts.isCallExpression(call) || call.questionDotToken ||
        !ts.isIdentifier(call.expression) || call.expression.text !== 'getDependencies' || call.arguments.length) continue;
    const keys = new Set();
    let valid = true;
    for (const prop of result.expression.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || !ts.isPropertyAccessExpression(prop.initializer) ||
          prop.initializer.questionDotToken || !ts.isIdentifier(prop.initializer.expression) ||
          prop.initializer.expression.text !== binding.name.text || prop.initializer.name.text !== prop.name.text ||
          keys.has(prop.name.text)) { valid = false; break; }
      keys.add(prop.name.text);
    }
    if (valid) projections.set(fn.name.text, keys);
  }
  return projections;
}
function projectionRead(node, projections) {
  if (!ts.isCallExpression(node) || node.questionDotToken || !ts.isIdentifier(node.expression)) return false;
  const declaration = node.parent;
  if (!ts.isVariableDeclaration(declaration) || declaration.initializer !== node ||
      !ts.isObjectBindingPattern(declaration.name)) return false;
  const keys = declaration.name.elements.map(element => {
    const property = element.propertyName || element.name;
    return !element.dotDotDotToken && ts.isIdentifier(property) ? property.text : null;
  });
  if (keys.includes(null)) return false;
  if (node.expression.text === 'getDependencies' && node.arguments.length === 0) return true;
  const allowed = projections.get(node.expression.text);
  return Boolean(allowed && node.arguments.length === 1 && ts.isIdentifier(node.arguments[0]) &&
    node.arguments[0].text === 'getDependencies' && keys.every(key => allowed.has(key)));
}
function fingerprint(node, source, projections = null) {
  // Preserve every syntax kind, identifier, literal (including template chunks,
  // regex flags), operator, property, parameter and callback. Ignore only trivia.
  function visit(part) {
    if (projections && projectionRead(part, projections)) return ['identity-projection-read'];
    const children = part.getChildren(source);
    return children.length ? [part.kind, ...children.map(visit)] : [part.kind, part.getText(source)];
  }
  const syntax = JSON.stringify(visit(node));
  return createHash('sha256').update(syntax).digest('hex');
}
function extractFactories(content, name = 'module.js', normalizeProjection = false) {
  const source = parse(name, content);
  const factories = new Map();
  for (const node of source.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.name || !node.body ||
        !node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
        !/^(create[A-Z]|__stsCreate)/.test(node.name.text)) continue;
    const key = node.name.text;
    if (factories.has(key)) throw Error('Duplicate factory in ' + name + ': ' + key);
    factories.set(key, { file: name, hash: fingerprint(node, source, normalizeProjection ? identityProjections(source) : null), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
  }
  return factories;
}
function directorySources(dir) {
  return fs.readdirSync(path.join(dir, 'src'), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .filter(isSource).sort().map(name => [name, fs.readFileSync(path.join(dir, name), 'utf8')]);
}
function gitSources(ref, owners) {
  if (!/^[a-f0-9]{40}$/.test(ref)) throw Error('Pass a full immutable commit SHA');
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const names = git(['ls-tree', '-r', '--name-only', ref, 'src']).trim().split('\n').filter(isSource).filter(name => !owners || owners.has(name));
  return names.map(name => [name, git(['show', ref + ':' + name])]);
}
function inventory(sources, normalizeProjection = false) {
  const map = new Map();
  for (const [file, content] of sources) for (const [name, record] of extractFactories(content, file, normalizeProjection)) {
    if (map.has(name)) throw Error('Ambiguous factory ' + name + ': ' + map.get(name).file + ', ' + file);
    map.set(name, record);
  }
  return map;
}
function compareInventories(before, after) {
  const missing = [], modified = [], moved = [], added = [];
  for (const [name, expected] of before) {
    const actual = after.get(name);
    if (!actual) { missing.push({ name, expected }); continue; }
    if (expected.file !== actual.file) moved.push({ name, from: expected.file, to: actual.file });
    if (expected.hash !== actual.hash) modified.push({ name, expected, actual });
  }
  for (const [name, actual] of after) if (!before.has(name)) added.push({ name, file: actual.file });
  return { ok: missing.length === 0 && modified.length === 0, baselineFactories: before.size,
    currentFactories: after.size, unchanged: before.size - missing.length - modified.length,
    movedCount: moved.length, modifiedCount: modified.length, missing, modified, moved, added };
}
// Inspect top-level helper declarations in the original UI owners as well.
// Helpers may be exported or copied to more than one of their new UI owners;
// only the export modifier is ignored. Every matching copy must have parity.
function helpers(file, content) {
  const ast = parse(file, content);
  const projectionNames = identityProjections(ast);
  const records = [];
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      const name = statement.name.text;
      if (projectionNames.has(name) || (/^(create[A-Z]|__stsCreate)/.test(name) &&
          statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))) continue;
      const shape = [name, (statement.modifiers || []).filter(modifier => modifier.kind !== ts.SyntaxKind.ExportKeyword).map(modifier => fingerprint(modifier, ast)),
        Boolean(statement.asteriskToken), statement.parameters.map(parameter => fingerprint(parameter, ast)), fingerprint(statement.body, ast)];
      records.push({ name, file, hash: createHash('sha256').update(JSON.stringify(shape)).digest('hex') });
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) throw Error('Review destructured module helper in ' + file);
        const shape = [statement.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const), fingerprint(declaration, ast)];
        records.push({ name: declaration.name.text, file, hash: createHash('sha256').update(JSON.stringify(shape)).digest('hex') });
      }
    }
  }
  return records;
}
function compareUiHelpers(originalSources, currentSources, originalFactories, currentFactories) {
  const currentByFile = new Map(currentSources);
  const owners = new Map();
  for (const [name, original] of originalFactories) {
    const current = currentFactories.get(name);
    if (!current) continue;
    if (!owners.has(original.file)) owners.set(original.file, new Set());
    owners.get(original.file).add(current.file);
  }
  const missing = [], modified = [], verified = [];
  for (const [file, source] of originalSources) {
    const candidates = [...(owners.get(file) || [])].flatMap(owner => helpers(owner, currentByFile.get(owner)));
    for (const expected of helpers(file, source)) {
      const matches = candidates.filter(candidate => candidate.name === expected.name);
      if (!matches.length) missing.push(expected);
      else if (matches.some(candidate => candidate.hash !== expected.hash)) modified.push({ expected, matches });
      else verified.push({ name: expected.name, original: file, owners: matches.map(candidate => candidate.file) });
    }
  }
  return { ok: missing.length === 0 && modified.length === 0, verifiedCount: verified.length, missing, modified, verified };
}
function checkFactoryParity(baselineDir, currentDir) {
  return compareInventories(inventory(directorySources(baselineDir)), inventory(directorySources(currentDir)));
}
function selfTest() {
  const factory = text => inventory([['src/example.js', text]]);
  const original = 'export function createDemo({x = 1} = {}) { return () => ({ value: x + 1, text: `a${x}`, pattern: /a{2}/i }); }';
  const base = factory(original);
  assert.equal(compareInventories(base, inventory([['src/moved.js', '// moved\n' + original]])).ok, true);
  for (const changed of [original.replace('x + 1', 'x - 1'), original.replace('value:', 'other:'), original.replace('/i', '/g'), original.replace('a${x}', 'b${x}'), original.replace('x = 1', 'x = 2'), original.replace('() =>', 'async () =>')]) {
    assert.equal(compareInventories(base, factory(changed)).ok, false);
  }
  const projection = 'function resolveDeps(getDependencies) { const deps = getDependencies(); return {x: deps.x}; }';
  const wrapped = 'export function createDemo(getDependencies) { const {x} = resolveDeps(getDependencies); return x; }';
  const direct = wrapped.replace('resolveDeps(getDependencies)', 'getDependencies()');
  const normalized = text => inventory([['src/example.js', text]], true);
  assert.equal(compareInventories(normalized(projection + wrapped), normalized(direct)).ok, true);
  assert.equal(compareInventories(normalized(projection.replace('deps.x', 'deps.y') + wrapped), normalized(direct)).ok, false);
  assert.equal(compareInventories(normalized(projection + wrapped.replace('{x}', '{y}')), normalized(direct.replace('{x}', '{y}'))).ok, false);
  assert.equal(compareInventories(normalized(projection + wrapped), normalized(direct.replace('return x', 'return x + 1'))).ok, false);
  assert.equal(compareInventories(base, new Map()).ok, false);
  assert.throws(() => inventory([['src/a.js', original], ['src/b.js', original]]), /Ambiguous factory/);
}
module.exports = { extractFactories, checkFactoryParity, compareInventories, inventory, fingerprint };
if (require.main === module) {
  selfTest();
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { console.log('F02 AST factory parity fixtures PASS'); }
  else {
    const currentSources = directorySources(root);
    const originalSources = gitSources(F01, UI_OWNERS);
    const after = inventory(currentSources);
    const oldFactories = inventory(originalSources, true);
    const oldUi = compareInventories(oldFactories, inventory(currentSources, true));
    const uiHelpers = compareUiHelpers(originalSources, currentSources, oldFactories, after);
    const imported = compareInventories(inventory(gitSources(IMPORTED_F02)), after);
    // Historical UI scope and imported full-factory scope are independent.
    console.log(JSON.stringify({ historicalUi: { ...oldUi, added: undefined }, uiHelpers, imported }, null, 2));
    if (!oldUi.ok || !uiHelpers.ok || !imported.ok) process.exitCode = 1;
  }
}
