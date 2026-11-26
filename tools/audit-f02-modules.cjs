#!/usr/bin/env node
// F02 Module Size, Ownership, Factory Parity & F01-Name Regression Auditor (zero-dependency).
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
  ['src/runtime/card-runtime/renderer.js', 'Canonical Card Runtime iframe renderer source emitted directly by build/build-card-runtime.mjs (594 lines)'],
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

function extractFactories(text) {
  const factories = new Map();
  const re = /export\s+(?:async\s+)?function\s+(create[A-Z]\w+|__stsCreate\w+)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const startIdx = m.index;
    const braceStart = text.indexOf('{', re.lastIndex);
    if (braceStart < 0) continue;
    let depth = 0;
    let inStr = null;
    let esc = false;
    let inLineComment = false;
    let inBlockComment = false;
    let endIdx = -1;
    for (let i = braceStart; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; i++; }
        continue;
      }
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endIdx = i + 1; break; }
      }
    }
    if (endIdx > 0) {
      factories.set(name, text.slice(startIdx, endIdx));
    }
  }
  return factories;
}

function normalizeBody(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    const factories = r.endsWith('.js') ? extractFactories(text).size : 0;
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

function checkFactoryParity(baselineDir, currentDir) {
  const baseMap = new Map();
  for (const fp of walk(path.join(baselineDir, 'src'), ['.js'])) {
    const r = rel(fp, baselineDir);
    const facs = extractFactories(fs.readFileSync(fp, 'utf8'));
    for (const [name, body] of facs) {
      baseMap.set(name, { file: r, body, norm: normalizeBody(body) });
    }
  }
  const curMap = new Map();
  for (const fp of walk(path.join(currentDir, 'src'), ['.js'])) {
    const r = rel(fp, currentDir);
    const facs = extractFactories(fs.readFileSync(fp, 'utf8'));
    for (const [name, body] of facs) {
      curMap.set(name, { file: r, body, norm: normalizeBody(body) });
    }
  }
  const missing = [];
  const added = [];
  const moved = [];
  const modified = [];
  for (const [name, b] of baseMap) {
    const c = curMap.get(name);
    if (!c) { missing.push({ name, baselineFile: b.file }); continue; }
    if (b.file !== c.file) moved.push({ name, from: b.file, to: c.file });
    if (b.norm !== c.norm) modified.push({ name, from: b.file, to: c.file });
  }
  for (const [name, c] of curMap) {
    if (!baseMap.has(name)) added.push({ name, currentFile: c.file });
  }
  return {
    ok: missing.length === 0,
    baselineFactories: baseMap.size,
    currentFactories: curMap.size,
    missing,
    added,
    movedCount: moved.length,
    modifiedCount: modified.length,
    modified,
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
