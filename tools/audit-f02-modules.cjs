#!/usr/bin/env node
// F02 Module Size, Ownership and AST Factory Parity Auditor.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// Documented >500-line exceptions (F02-G15)
const DOCUMENTED_SIZE_EXCEPTIONS = new Map([
  ['src/features/catalog/default-character.js', 'Static default character fixture data'],
  ['src/features/presets/default-preset.js', 'Static default preset fixture data'],
  ['src/features/rpg/default-database.js', 'Static default RPG database fixture data'],
  ['src/runtime/card-runtime/core-builder.js', 'Generated Card Runtime core builder output'],
  ['src/features/chat/ui/chat-controls.js', 'Cohesive chat toolbar/control UI primitives (681 lines, 10 small factories); scheduled for F03/F04 review'],
  ['src/features/chat/regex-processing.js', 'Cohesive SillyTavern regex rule engine & placement processor (611 lines); splitting fragments shared compilation state'],
  ['src/ui/components/input-controls.js', 'Cohesive shared form/input UI primitive library (558 lines, 8 small factories)'],
  ['android-native/EmbeddingGemma2LiteRTPlugin.java', 'Cohesive Android LiteRT JNI/Capacitor plugin bridge (571 lines); tightly coupled native lifecycle'],
  ['src/features/rpg/ui/mythic/mythic-configuration-dialog.js', 'Single cohesive Mythic configuration dialog factory (777 lines); splitting adds artificial indirection'],
  ['src/ui/card-runtime/card-frame.js', 'Single cohesive Card Frame iframe lifecycle & RPC bridge component (716 lines); kept intact for runtime safety'],
  ['src/features/chat/ui/chat-session-screen.js', 'Single cohesive ChatSessionScreen orchestration component (572 lines); further decomposition deferred to F03'],
  ['src/features/rpg/ui/actions/action-suggestion-dialog.js', 'Single cohesive ActionSuggestionDialog factory (550 lines)'],
  ['src/features/rpg/ui/database/rpg-database-editor.js', 'Single cohesive RpgDatabaseEditor factory (542 lines)'],
  ['src/features/chat/session/session-list-screen.js', 'Single cohesive SessionListScreen factory (509 lines)'],
]);

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
  let totalFactories = 0;

  for (const fp of all) {
    const r = rel(fp, baseDir);
    const text = fs.readFileSync(fp, 'utf8');
    const lines = countLines(text);
    const kb = +(fs.statSync(fp).size / 1024).toFixed(1);
    const factories = r.endsWith('.js') ? extractFactories(text, r).size : 0;
    totalFactories += factories;

    if (lines < 300) buckets.lt300++;
    else if (lines <= 500) buckets.b300_500++;
    else if (lines <= 800) buckets.b500_800++;
    else if (lines <= 1000) buckets.b800_1000++;
    else buckets.gt1000++;

    if (lines > 500) {
      const exception = DOCUMENTED_SIZE_EXCEPTIONS.get(r) || null;
      const entry = { file: r, lines, kb, factories, exception };
      over500.push(entry);
      if (!exception) unexplainedLarge.push(entry);
    }
  }

  over500.sort((a, b) => b.lines - a.lines);
  return {
    totalFiles: all.length,
    jsFiles: jsFiles.length,
    javaFiles: javaFiles.length,
    totalFactories,
    buckets,
    over500Count: over500.length,
    unexplainedLargeCount: unexplainedLarge.length,
    unexplainedLarge,
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
  const res = auditModules(ROOT);
  const strict = args.includes('--strict');
  console.log(JSON.stringify(res, null, 2));
  if (strict && res.unexplainedLargeCount > 0) process.exit(1);
}
