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
function fingerprint(node, source) {
  // Preserve every syntax kind, identifier, literal (including template chunks,
  // regex flags), operator, property, parameter and callback. Ignore only trivia.
  function visit(part) {
    const children = part.getChildren(source);
    return children.length ? [part.kind, ...children.map(visit)] : [part.kind, part.getText(source)];
  }
  const syntax = JSON.stringify(visit(node));
  return createHash('sha256').update(syntax).digest('hex');
}
function extractFactories(content, name = 'module.js') {
  const source = parse(name, content);
  const factories = new Map();
  for (const node of source.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.name || !node.body ||
        !node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
        !/^(create[A-Z]|__stsCreate)/.test(node.name.text)) continue;
    const key = node.name.text;
    if (factories.has(key)) throw Error('Duplicate factory in ' + name + ': ' + key);
    factories.set(key, { file: name, hash: fingerprint(node, source), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
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
function inventory(sources) {
  const map = new Map();
  for (const [file, content] of sources) for (const [name, record] of extractFactories(content, file)) {
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
  assert.equal(compareInventories(base, new Map()).ok, false);
  assert.throws(() => inventory([['src/a.js', original], ['src/b.js', original]]), /Ambiguous factory/);
}
module.exports = { extractFactories, checkFactoryParity, compareInventories, inventory };
if (require.main === module) {
  selfTest();
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { console.log('F02 AST factory parity fixtures PASS'); }
  else {
    const after = inventory(directorySources(root));
    const oldUi = compareInventories(inventory(gitSources(F01, UI_OWNERS)), after);
    const imported = compareInventories(inventory(gitSources(IMPORTED_F02)), after);
    // Historical UI scope and imported full-factory scope are independent.
    console.log(JSON.stringify({ historicalUi: { ...oldUi, added: undefined }, imported }, null, 2));
    if (!oldUi.ok || !imported.ok) process.exitCode = 1;
  }
}
