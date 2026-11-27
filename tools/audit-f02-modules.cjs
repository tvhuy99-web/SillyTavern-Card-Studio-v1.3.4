#!/usr/bin/env node
// F02 Module Size, Ownership and AST Factory Parity Auditor.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// R05C: immutable measurements at 09076a5 (CI run 45917958410).
// Bounded exceptions: max 5% / 20 lines headroom, never >800 lines; max 10% bytes.
// Review new responsibilities before changing a budget. No blanket generated/data exceptions.
const DOCUMENTED_SIZE_EXCEPTIONS = new Map([
  ["src/features/chat/ui/chat-controls.js", Object.freeze({"baselineLines":681,"baselineBytes":28354,"maxLines":716,"maxBytes":31190,"reason":"Cohesive chat toolbar/control UI primitives; F03/F04 review"})],
  ["src/features/chat/regex-processing.js", Object.freeze({"baselineLines":612,"baselineBytes":20127,"maxLines":643,"maxBytes":22140,"reason":"Cohesive SillyTavern regex engine and placement processor"})],
  ["src/ui/components/input-controls.js", Object.freeze({"baselineLines":558,"baselineBytes":18045,"maxLines":586,"maxBytes":19850,"reason":"Cohesive shared form/input UI primitives"})],
  ["android-native/EmbeddingGemma2LiteRTPlugin.java", Object.freeze({"baselineLines":571,"baselineBytes":28611,"maxLines":600,"maxBytes":31473,"reason":"Cohesive Android LiteRT JNI/Capacitor bridge and native lifecycle"})],
  ["src/features/rpg/ui/mythic/mythic-configuration-dialog.js", Object.freeze({"baselineLines":777,"baselineBytes":38478,"maxLines":800,"maxBytes":42326,"reason":"Single Mythic configuration dialog"})],
  ["src/ui/card-runtime/card-frame.js", Object.freeze({"baselineLines":716,"baselineBytes":29683,"maxLines":752,"maxBytes":32652,"reason":"Single Card Frame iframe lifecycle and RPC bridge component"})],
  ["src/features/chat/ui/chat-session-screen.js", Object.freeze({"baselineLines":572,"baselineBytes":23613,"maxLines":601,"maxBytes":25975,"reason":"Single ChatSessionScreen orchestration component; F03 review"})],
  ["src/features/rpg/ui/actions/action-suggestion-dialog.js", Object.freeze({"baselineLines":550,"baselineBytes":26457,"maxLines":578,"maxBytes":29103,"reason":"Single ActionSuggestionDialog factory"})],
  ["src/features/rpg/ui/database/rpg-database-editor.js", Object.freeze({"baselineLines":542,"baselineBytes":28348,"maxLines":570,"maxBytes":31183,"reason":"Single RpgDatabaseEditor factory"})],
  ["src/features/chat/session/session-list-screen.js", Object.freeze({"baselineLines":509,"baselineBytes":19359,"maxLines":535,"maxBytes":21295,"reason":"Single SessionListScreen factory"})],
]);

function evaluateSize(file, lines, bytes, exceptions = DOCUMENTED_SIZE_EXCEPTIONS) {
  const budget = exceptions.get(file) || null;
  const violations = [];
  if (lines > 500 && !budget) violations.push('unexplained-large-module');
  if (budget) {
    if (lines > budget.maxLines) violations.push('line-budget-exceeded');
    if (bytes > budget.maxBytes) violations.push('byte-budget-exceeded');
  }
  return { budget, violations };
}

function selfTest() {
  const assert = require('node:assert/strict');
  const fixture = new Map([['reviewed.js', { maxLines: 600, maxBytes: 10000 }]]);
  assert.deepEqual(evaluateSize('normal.js', 500, 10000, fixture).violations, []);
  assert.deepEqual(evaluateSize('new.js', 501, 10000, fixture).violations, ['unexplained-large-module']);
  assert.deepEqual(evaluateSize('reviewed.js', 600, 10000, fixture).violations, []);
  assert.deepEqual(evaluateSize('reviewed.js', 601, 10000, fixture).violations, ['line-budget-exceeded']);
  assert.deepEqual(evaluateSize('reviewed.js', 499, 10001, fixture).violations, ['byte-budget-exceeded']);
  assert.deepEqual(evaluateSize('reviewed.js', 601, 10001, fixture).violations, ['line-budget-exceeded', 'byte-budget-exceeded']);
  for (const [file, budget] of DOCUMENTED_SIZE_EXCEPTIONS) {
    assert.ok(budget.reason && budget.baselineLines > 500 && budget.maxLines <= 800, file);
    assert.deepEqual(evaluateSize(file, budget.baselineLines, budget.baselineBytes).violations, []);
  }
}

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'dist-source', 'dist-npm', 'vendor'].includes(entry.name)) continue;
      out.push(...walk(full, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out.sort();
}

function rel(file, base = ROOT) {
  return path.relative(base, file).split(path.sep).join('/');
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

const { extractFactories, checkFactoryParity } = require('./audit-f02-factory-parity.cjs');

function auditModules(baseDir = ROOT) {
  const jsFiles = walk(path.join(baseDir, 'src'), ['.js']);
  const javaFiles = walk(path.join(baseDir, 'android-native'), ['.java']);
  const all = [...jsFiles, ...javaFiles];
  const buckets = { lt300: 0, b300_500: 0, b500_800: 0, b800_1000: 0, gt1000: 0 };
  const over500 = [];
  const unexplainedLarge = [];
  const budgetViolations = [];
  const seenExceptions = new Set();
  const dependencyMetrics = [];
  let totalFactories = 0;

  for (const fp of all) {
    const r = rel(fp, baseDir);
    const text = fs.readFileSync(fp, 'utf8');
    const lines = countLines(text);
    const bytes = fs.statSync(fp).size;
    const kb = +(bytes / 1024).toFixed(1);
    const factories = r.endsWith('.js') ? extractFactories(text, r).size : 0;
    totalFactories += factories;

    if (lines < 300) buckets.lt300++;
    else if (lines <= 500) buckets.b300_500++;
    else if (lines <= 800) buckets.b500_800++;
    else if (lines <= 1000) buckets.b800_1000++;
    else buckets.gt1000++;

    const { budget, violations } = evaluateSize(r, lines, bytes);
    if (budget) seenExceptions.add(r);
    if (violations.length) budgetViolations.push({ file: r, lines, bytes, budget, violations });
    if (lines > 500) {
      const entry = { file: r, lines, kb, bytes, factories, exception: budget?.reason || null, budget };
      over500.push(entry);
      if (!budget) unexplainedLarge.push(entry);
    }
    if (r.endsWith('.js')) {
      const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
      const ast = ts.createSourceFile(r, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const specifiers = new Set();
      for (const statement of ast.statements) {
        if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) specifiers.add(statement.moduleSpecifier.text);
      }
      dependencyMetrics.push({ file: r, staticModuleDependencies: specifiers.size });
    }
  }

  over500.sort((a, b) => b.lines - a.lines);
  const missingExceptions = [...DOCUMENTED_SIZE_EXCEPTIONS.keys()].filter(file => !seenExceptions.has(file));
  dependencyMetrics.sort((first, second) => second.staticModuleDependencies - first.staticModuleDependencies || first.file.localeCompare(second.file));
  return {
    totalFiles: all.length,
    jsFiles: jsFiles.length,
    javaFiles: javaFiles.length,
    totalFactories,
    buckets,
    over500Count: over500.length,
    unexplainedLargeCount: unexplainedLarge.length,
    unexplainedLarge,
    budgetViolationCount: budgetViolations.length,
    budgetViolations,
    missingExceptions,
    staticDependencyHotspots: dependencyMetrics.slice(0, 15),
    over500,
  };
}

function checkShortNames(baselineDir, currentDir) {
  // Zero-dependency check: count 1-2 char declared identifiers (const/let/var/function) in src/ outside vendor
  const re = /\b(?:const|let|var|function)\s+([A-Za-z_$][A-Za-z0-9_$]?)\b/g;
  const countIn = dir => {
    let total = 0;
    for (const fp of walk(path.join(dir, 'src'), ['.js'])) {
      const text = fs.readFileSync(fp, 'utf8');
      let m;
      while ((m = re.exec(text)) !== null) {
        if (['i', 'j', 'k', 'x', 'y', 'n', 'id', 'el', 'db', 'ok', 'to', 'fn', 'ms', 're'].includes(m[1])) continue;
        total++;
      }
    }
    return total;
  };
  const baseCount = countIn(baselineDir);
  const curCount = countIn(currentDir);
  return { ok: curCount <= baseCount, baselineShortDecls: baseCount, currentShortDecls: curCount, delta: curCount - baseCount };
}

const args = process.argv.slice(2);
if (args[0] === '--factory-parity') {
  const baselineDir = path.resolve(args[1] || path.join(ROOT, '..', 'repo_baseline'));
  const res = checkFactoryParity(baselineDir, ROOT);
  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exit(1);
} else if (args[0] === '--short-names') {
  const baselineDir = path.resolve(args[1] || path.join(ROOT, '..', 'repo_baseline'));
  const res = checkShortNames(baselineDir, ROOT);
  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exit(1);
} else {
  selfTest();
  const res = auditModules(ROOT);
  const strict = args.includes('--strict');
  console.log(JSON.stringify(res, null, 2));
  if (strict && (res.unexplainedLargeCount || res.budgetViolationCount || res.missingExceptions.length)) process.exit(1);
}
