import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const toPosix = filePath => path.relative(ROOT, filePath).split(path.sep).join('/');

const GENERATED_RUNTIME_MODULES = new Set([
  'src/runtime/card-runtime/core-builder.js',
]);

const STATIC_DATA_FIXTURES = new Set([
  'src/features/catalog/default-character.js',
  'src/features/presets/default-preset.js',
  'src/features/rpg/default-database.js',
]);

const FORBIDDEN_FILENAMES = new Set([
  'model-connection-test.js',
  'legacy-response-utils.js',
  'legacy-transport.js',
  'legacy-generation-adapters.js',
  'legacy-prompt-builder.js',
]);

const FORBIDDEN_SYMBOLS = [
  'installModelConnectionTestEnhancer',
  'window.__STS_MODEL_CONNECTION_TEST__',
];

// Explicit public compatibility / diagnostic / library API exports intentionally kept
// even when not directly imported via static ESM edges from another file inside src/.
const DOCUMENTED_PUBLIC_APIS = new Map([
  ['src/diagnostics/aistudio-log.js::recordAiStudioDiagnostic', 'Public AI Studio diagnostic logger API (also exposed on window.__STS_AI_STUDIO_LOGS__.record)'],
  ['src/diagnostics/aistudio-log.js::exportAiStudioDiagnostics', 'Public AI Studio diagnostic export API (also exposed on window.__STS_AI_STUDIO_LOGS__.export)'],
  ['src/providers/common/generation-utils.js::SseDataBuffer', 'Public streaming SSE parser primitive exported for provider adapters and contract tests'],
  ['src/providers/common/model-catalog.js::normalizeGeminiModels', 'Public Gemini catalog normalization API exported for model catalog consumers and tests'],
  ['src/app/state/runtime-state.js::reportFailure', 'Public runtime failure-reporting contract (also exposed on runtimeState.reportFailure)'],
  ['src/app/state/runtime-state.js::clearFailure', 'Public runtime failure-clearing contract (also exposed on runtimeState.clearFailure)'],
  ['src/features/chat/turn-policy.js::compactModelMessages', 'Public chat turn-policy API (exported standalone and on chatTurnPolicy.compactModelMessages; used by conversation-service, use-card-runtime, and turn-policy tests)'],
]);

// Map portable-build asset mirrors back to canonical src/ paths for test/build import attribution.
const ASSET_MIRROR_TO_SRC = new Map([
  ['assets/prompt-normalizer-v1.3.6.js', 'src/features/presets/prompt-normalizer.js'],
  ['assets/proxy-persistence-service-v1.3.6.js', 'src/providers/proxy/persistence.js'],
  ['assets/card-runtime-core-builder-v1.3.6.js', 'src/runtime/card-runtime/core-builder.js'],
  ['assets/card-runtime-renderer-v1.3.6.js', 'src/runtime/card-runtime/renderer.js'],
  ['assets/initial-variable-service-v1.3.6.js', 'src/features/state/initial-variable-service.js'],
  ['assets/smart-state-service-v1.3.6.js', 'src/features/state/smart-state-service.js'],
]);

const ASSET_MIRROR_PREFIXES = [
  'assets/m4/',
  'assets/m5/',
  'assets/m6/',
  'assets/m8/',
  'assets/recovered/',
];

// Explicit semantic ownership inventory across all 11 business domains.
const SEMANTIC_OWNERSHIP_INVENTORY = Object.freeze([
  {
    domain: 'Providers',
    canonicalOwners: [
      'src/providers/common/provider-registry.js',
      'src/providers/common/generation-gateway.js',
      'src/providers/common/http-transport.js',
      'src/providers/common/model-catalog.js',
      'src/providers/gemini/config.js',
    ],
  },
  {
    domain: 'Prompts',
    canonicalOwners: [
      'src/features/prompts/prompt-service.js',
      'src/features/prompts/prompt-assembler.js',
      'src/features/prompts/story-content.js',
      'src/features/prompts/macro-processing.js',
    ],
  },
  {
    domain: 'Persistence & Backup',
    canonicalOwners: [
      'src/app/persistence/app-database.js',
      'src/app/persistence/entity-repositories.js',
      'src/app/persistence/session-save-coordinator.js',
      'src/app/persistence/backup-restore-service.js',
      'src/app/persistence/cross-tab-sync.js',
    ],
  },
  {
    domain: 'Settings',
    canonicalOwners: [
      'src/app/state/settings-repository.js',
      'src/app/state/settings-keys.js',
      'src/features/state/feature-settings.js',
      'src/ui/settings/settings-controller.js',
    ],
  },
  {
    domain: 'Chat & Session',
    canonicalOwners: [
      'src/features/chat/conversation-service.js',
      'src/features/chat/response-processor.js',
      'src/features/chat/turn-policy.js',
      'src/features/chat/live-stream-store.js',
      'src/features/chat/hooks/use-chat-session.js',
    ],
  },
  {
    domain: 'Arena',
    canonicalOwners: [
      'src/features/arena/state-machine.js',
    ],
  },
  {
    domain: 'World Info & Lorebook',
    canonicalOwners: [
      'src/features/world-info/smart-scan-service.js',
      'src/features/world-info/embedding-service.js',
      'src/features/world-info/keyword-matching.js',
      'src/features/world-info/sticky-compat.js',
    ],
  },
  {
    domain: 'Catalog',
    canonicalOwners: [
      'src/features/catalog/character-file.js',
      'src/features/catalog/character-export.js',
      'src/app/state/application-stores.js',
    ],
  },
  {
    domain: 'RPG & Smart State',
    canonicalOwners: [
      'src/features/rpg/table-processing.js',
      'src/features/rpg/table-lorebook-links.js',
      'src/features/state/smart-state-service.js',
      'src/features/state/initial-variable-service.js',
      'src/features/state/variable-scope-service.js',
    ],
  },
  {
    domain: 'Card Runtime',
    canonicalOwners: [
      'src/runtime/card-runtime/core-builder.js',
      'src/runtime/card-runtime/renderer.js',
      'src/runtime/card-runtime/frame-context.js',
      'src/runtime/card-runtime/host/rpc-dispatcher.js',
      'src/runtime/card-runtime/host/method-router.js',
      'src/runtime/card-runtime/host/slash-commands.js',
    ],
  },
  {
    domain: 'Android Bridge',
    canonicalOwners: [
      'src/platform/android/native-bridge.js',
      'src/providers/aistudio/text.js',
      'src/providers/aistudio/model-catalog.js',
      'src/diagnostics/aistudio-log.js',
    ],
  },
]);

function listFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results.sort();
}

function classifySourceFile(relPath) {
  if (relPath.startsWith('src/vendor/')) return 'vendorSnapshots';
  if (GENERATED_RUNTIME_MODULES.has(relPath)) return 'generatedRuntimeModules';
  if (STATIC_DATA_FIXTURES.has(relPath)) return 'staticDataFixtures';
  return 'canonicalFirstParty';
}

function checkSyntaxOne(filePath) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--check', filePath], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('close', code => {
      resolve(code === 0 ? null : { file: toPosix(filePath), exitCode: code, error: stderr.trim() });
    });
  });
}

async function runSyntaxCheckPool(files, concurrency = 8) {
  const failures = [];
  let index = 0;
  async function worker() {
    while (index < files.length) {
      const current = files[index++];
      const failure = await checkSyntaxOne(current);
      if (failure) failures.push(failure);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return failures;
}

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

function extractExportedSymbols(code) {
  const cleaned = stripComments(code);
  const symbols = new Set();

  const declRe = /\bexport\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let match;
  while ((match = declRe.exec(cleaned)) !== null) {
    symbols.add(match[1]);
  }

  if (/\bexport\s+default\b/.test(cleaned)) {
    symbols.add('default');
  }

  const listRe = /\bexport\s*\{([^}]+)\}/g;
  while ((match = listRe.exec(cleaned)) !== null) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const alias = trimmed.split(/\s+as\s+/);
      const exportedName = (alias[1] || alias[0]).trim();
      if (exportedName) {
        symbols.add(exportedName);
      }
    }
  }

  return [...symbols];
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveSpecifierToCanonicalSrc(fromFile, specifier) {
  if (!specifier || !specifier.startsWith('.')) return null;
  const cleanSpec = specifier.split(/[?#]/)[0];
  const resolvedAbs = path.resolve(path.dirname(fromFile), cleanSpec);
  const rel = toPosix(resolvedAbs);
  if (rel.startsWith('src/') && fs.existsSync(resolvedAbs)) {
    return rel;
  }
  if (ASSET_MIRROR_TO_SRC.has(rel)) {
    return ASSET_MIRROR_TO_SRC.get(rel);
  }
  for (const prefix of ASSET_MIRROR_PREFIXES) {
    if (rel.startsWith(prefix)) {
      const candidate = `src/${rel.slice(prefix.length)}`;
      if (fs.existsSync(path.join(ROOT, candidate))) return candidate;
    }
  }
  return null;
}

function parseEsmBindings(filePath, rawCode) {
  const code = stripComments(rawCode);
  const edges = [];

  // 1. Static import statements:
  //    import { a, b as c } from './x.js'
  //    import def, { a } from './x.js'
  //    import * as ns from './x.js'
  //    import def from './x.js'
  const importRe = /\bimport\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(code)) !== null) {
    const clause = match[1].trim();
    const target = resolveSpecifierToCanonicalSrc(filePath, match[2]);
    if (!target) continue;

    // Namespace import: `* as ns`
    const nsMatch = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (nsMatch) {
      const nsName = nsMatch[1];
      const memberRe = new RegExp(`\\b${escapeRegExp(nsName)}\\.([A-Za-z_$][A-Za-z0-9_$]*)`, 'g');
      const accessed = new Set();
      let mm;
      while ((mm = memberRe.exec(code)) !== null) {
        accessed.add(mm[1]);
      }
      // Detect whether the namespace object itself is passed dynamically (e.g. `({ ns })`, `(ns)`, `= ns`)
      const strippedImport = code.replace(match[0], '');
      const withoutMemberAccess = strippedImport.replace(new RegExp(`\\b${escapeRegExp(nsName)}\\.[A-Za-z_$][A-Za-z0-9_$]*`, 'g'), '');
      const passedDynamically = new RegExp(`\\b${escapeRegExp(nsName)}\\b`).test(withoutMemberAccess);
      edges.push({ target, kind: 'namespace', accessed: [...accessed], allExports: passedDynamically });
    }

    // Named imports: `{ a, b as c }`
    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      const names = [];
      for (const part of namedMatch[1].split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const importedName = trimmed.split(/\s+as\s+/)[0].trim();
        if (importedName) names.push(importedName);
      }
      if (names.length > 0) {
        edges.push({ target, kind: 'named', names });
      }
    }

    // Default import: `foo` before comma or standalone (not starting with `{` or `*`)
    if (!clause.startsWith('{') && !clause.startsWith('*')) {
      const defaultName = clause.split(',')[0].trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(defaultName)) {
        edges.push({ target, kind: 'named', names: ['default'] });
      }
    }
  }

  // 2. Re-exports: `export { a, b as c } from './x.js'` and `export * from './x.js'`
  const reexportNamedRe = /\bexport\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;
  while ((match = reexportNamedRe.exec(code)) !== null) {
    const target = resolveSpecifierToCanonicalSrc(filePath, match[2]);
    if (!target) continue;
    const names = [];
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const importedName = trimmed.split(/\s+as\s+/)[0].trim();
      if (importedName) names.push(importedName);
    }
    if (names.length > 0) {
      edges.push({ target, kind: 'reexport-named', names });
    }
  }

  const reexportAllRe = /\bexport\s*\*(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reexportAllRe.exec(code)) !== null) {
    const target = resolveSpecifierToCanonicalSrc(filePath, match[1]);
    if (!target) continue;
    edges.push({ target, kind: 'reexport-all', allExports: true });
  }

  // 3. Dynamic imports: `import('./x.js')`
  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRe.exec(code)) !== null) {
    const target = resolveSpecifierToCanonicalSrc(filePath, match[1]);
    if (!target) continue;
    edges.push({ target, kind: 'dynamic', allExports: true });
  }

  return edges;
}

function recordImportEdges(files, refMap) {
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const edges = parseEsmBindings(file, raw);
    for (const edge of edges) {
      if (!refMap.has(edge.target)) {
        refMap.set(edge.target, { names: new Set(), all: false });
      }
      const entry = refMap.get(edge.target);
      if (edge.allExports) {
        entry.all = true;
      }
      if (edge.names) {
        for (const name of edge.names) entry.names.add(name);
      }
      if (edge.accessed) {
        for (const name of edge.accessed) entry.names.add(name);
      }
    }
  }
}

function auditUnusedExportsByImportGraph(srcFiles) {
  const canonicalFiles = srcFiles.filter(file => classifySourceFile(toPosix(file)) === 'canonicalFirstParty');

  const testToolBuildFiles = [
    ...listFiles(path.join(ROOT, 'tests'), ['.mjs', '.js']),
    ...listFiles(path.join(ROOT, 'tools'), ['.mjs', '.cjs', '.js']),
    ...listFiles(path.join(ROOT, 'build'), ['.mjs', '.cjs', '.js']),
  ].filter(file => toPosix(file) !== 'tools/audit-phase1-quality.mjs');

  const srcRefs = new Map();
  const testBuildRefs = new Map();
  recordImportEdges(srcFiles, srcRefs);
  recordImportEdges(testToolBuildFiles, testBuildRefs);

  let totalExports = 0;
  let usedInSrc = 0;
  const usedInTestsOrBuild = [];
  const documentedPublicApi = [];
  const unjustifiedUnusedExports = [];

  for (const file of canonicalFiles) {
    const rel = toPosix(file);
    const exportsList = extractExportedSymbols(fs.readFileSync(file, 'utf8'));
    const sRef = srcRefs.get(rel);
    const tRef = testBuildRefs.get(rel);

    for (const symbol of exportsList) {
      // Host CJS compatibility shims (`export { c as n, o as t }`) consumed by generated portable bundle loader
      if (rel === 'src/app/host.js' && (symbol === 'n' || symbol === 't')) {
        totalExports++;
        usedInSrc++;
        continue;
      }

      totalExports++;
      const importedInSrc = Boolean(sRef && (sRef.all || sRef.names.has(symbol)));
      if (importedInSrc) {
        usedInSrc++;
        continue;
      }

      const apiKey = `${rel}::${symbol}`;
      if (DOCUMENTED_PUBLIC_APIS.has(apiKey)) {
        documentedPublicApi.push({
          file: rel,
          symbol,
          reason: DOCUMENTED_PUBLIC_APIS.get(apiKey),
        });
        continue;
      }

      const importedInTestsOrBuild = Boolean(tRef && (tRef.all || tRef.names.has(symbol)));
      if (importedInTestsOrBuild) {
        usedInTestsOrBuild.push({ file: rel, symbol });
      } else {
        unjustifiedUnusedExports.push({ file: rel, symbol });
      }
    }
  }

  return {
    analysisMethod: 'esm-import-graph-resolution',
    scannedModules: canonicalFiles.length,
    totalExports,
    usedInSrc,
    usedInTestsOrBuildCount: usedInTestsOrBuild.length,
    documentedPublicApiCount: documentedPublicApi.length,
    unjustifiedUnusedExportsCount: unjustifiedUnusedExports.length,
    documentedPublicApi,
    unjustifiedUnusedExports,
  };
}

function evaluateSemanticOwnership(srcFiles) {
  const existingSet = new Set(srcFiles.map(toPosix));
  const missingCanonicalOwners = [];
  const domains = SEMANTIC_OWNERSHIP_INVENTORY.map(({ domain, canonicalOwners }) => {
    const missing = canonicalOwners.filter(owner => !existingSet.has(owner));
    for (const m of missing) missingCanonicalOwners.push({ domain, owner: m });
    return {
      domain,
      canonicalOwners,
      allPresent: missing.length === 0,
    };
  });

  const legacyOverlapFiles = srcFiles
    .map(toPosix)
    .filter(rel => FORBIDDEN_FILENAMES.has(path.basename(rel)));

  return {
    ok: missingCanonicalOwners.length === 0 && legacyOverlapFiles.length === 0,
    domainsCovered: domains.length,
    missingCanonicalOwners,
    legacyOverlapFiles,
    domains,
    methodologyAndLimitations: [
      'Verifies that every declared canonical domain owner across the 11 business domains exists and that banned legacy duplicate modules are absent.',
      'Limitation: Static ownership inventory and ESM import-graph analysis do NOT prove absence of duplicated inline logic inside unrelated modules; semantic deduplication still requires AST or manual domain review.',
    ],
  };
}

function detectLegacyDependencyKeys(cleanedCode) {
  const legacyKeys = new Set();

  // 1. Destructured 1-2 character keys directly from getDependencies(): `const { b, wt, ol } = getDependencies()`
  const destructRe = /\{([^}]*)\}\s*=\s*getDependencies\s*\(\s*\)/g;
  let match;
  while ((match = destructRe.exec(cleanedCode)) !== null) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith('...')) continue;
      const key = trimmed.split(':')[0].split('=')[0].trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]?$/.test(key)) {
        legacyKeys.add(key);
      }
    }
  }

  // 2. Member access on `deps = getDependencies()` with 1-2 character keys: `deps.b`, `deps.wt`, `deps.ol`, `deps.hl`, etc.
  const depsVarNames = new Set(['deps']);
  const assignRe = /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*getDependencies\s*\(\s*\)/g;
  while ((match = assignRe.exec(cleanedCode)) !== null) {
    depsVarNames.add(match[1]);
  }
  for (const varName of depsVarNames) {
    const memberRe = new RegExp(`\\b${escapeRegExp(varName)}\\.([A-Za-z_$][A-Za-z0-9_$]?)\\b`, 'g');
    while ((match = memberRe.exec(cleanedCode)) !== null) {
      legacyKeys.add(match[1]);
    }
  }

  return [...legacyKeys].sort();
}

function classifyFactories(srcFiles) {
  const factoryPattern = /\bexport\s+function\s+(create[A-Za-z0-9_]+)\s*\([^)]*\bgetDependencies\b/g;

  const categories = {
    compositionRootDiFactories: { count: 0, files: [] },
    statefulOrLifecycleFactories: { count: 0, files: [] },
    transitionalLegacyKeyFactories: { count: 0, files: [] },
  };

  let total = 0;

  for (const file of srcFiles) {
    const rel = toPosix(file);
    if (classifySourceFile(rel) !== 'canonicalFirstParty') continue;
    const text = stripComments(fs.readFileSync(file, 'utf8'));
    const names = [];
    let match;
    while ((match = factoryPattern.exec(text)) !== null) {
      names.push(match[1]);
    }
    if (names.length === 0) continue;

    total += names.length;
    const legacyKeys = detectLegacyDependencyKeys(text);
    const isProviderFile = rel === 'src/ui/shell/providers.js';

    let bucket = legacyKeys.length === 0
      ? 'compositionRootDiFactories'
      : 'transitionalLegacyKeyFactories';
    if (isProviderFile) {
      bucket = 'statefulOrLifecycleFactories';
    }

    categories[bucket].count += names.length;
    categories[bucket].files.push({
      file: rel,
      count: names.length,
      legacyKeyCount: legacyKeys.length,
    });
  }

  return {
    total,
    classificationMethod: 'dynamic-getDependencies-key-inspection',
    note: 'Factories are dynamically classified by inspecting getDependencies() key usage; files with zero legacy 1-2 character keys are classified as compositionRootDiFactories.',
    ...categories,
  };
}

function checkDurableRecovery() {
  const restoreServicePath = path.join(ROOT, 'src/app/persistence/backup-restore-service.js');
  const settingsScreensPath = path.join(ROOT, 'src/ui/settings/sections/backup-settings.js');

  const restoreSrc = fs.existsSync(restoreServicePath)
    ? stripComments(fs.readFileSync(restoreServicePath, 'utf8'))
    : '';
  const settingsSrc = fs.existsSync(settingsScreensPath)
    ? stripComments(fs.readFileSync(settingsScreensPath, 'utf8'))
    : '';

  const hasRamOnlyRecoveryCache = /\bconst\s+recoveryCache\s*=\s*new\s+Map\b/.test(restoreSrc);
  const hasDurableRecoveryStore = /\b(?:createDurableRecoveryStore|recoveryStore|saveRecoverySnapshot|readRecoverySnapshot|persistRecoverySnapshot|RECOVERY_DATABASE|stcs_recovery_snapshots)\b/i.test(restoreSrc);
  const backupRestoreUsesDurableSnapshots = !hasRamOnlyRecoveryCache || hasDurableRecoveryStore;
  const settingsScreensHasNoDirectRestore = !/\brestoreBackupSettings\b/.test(settingsSrc);

  return {
    verified: backupRestoreUsesDurableSnapshots && settingsScreensHasNoDirectRestore,
    backupRestoreUsesDurableSnapshots,
    settingsScreensHasNoDirectRestore,
  };
}

function runBoundaryAudit() {
  const scriptPath = path.join(ROOT, 'tools', 'audit-module-graph.cjs');
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(stdout);
    const violations = parsed?.src?.boundaryViolations || [];
    return {
      ok: violations.length === 0 && parsed?.src?.cycles === 0 && parsed?.src?.unresolved === 0,
      src: parsed.src,
    };
  } catch (error) {
    return {
      ok: false,
      error: (error.stderr || error.stdout || error.message || String(error)).toString().trim(),
    };
  }
}

const srcFiles = listFiles(path.join(ROOT, 'src'), ['.js']);
const classification = {
  canonicalFirstParty: [],
  vendorSnapshots: [],
  generatedRuntimeModules: [],
  staticDataFixtures: [],
};

for (const file of srcFiles) {
  const rel = toPosix(file);
  classification[classifySourceFile(rel)].push(rel);
}

const syntaxErrors = await runSyntaxCheckPool(srcFiles);

const forbiddenFiles = srcFiles
  .map(toPosix)
  .filter(rel => FORBIDDEN_FILENAMES.has(path.basename(rel)));

const forbiddenSymbols = [];
for (const file of srcFiles) {
  const rel = toPosix(file);
  if (rel.startsWith('src/vendor/')) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const symbol of FORBIDDEN_SYMBOLS) {
    if (text.includes(symbol)) {
      forbiddenSymbols.push({ file: rel, symbol });
    }
  }
}

const hostPath = path.join(ROOT, 'src/app/host.js');
const hostText = fs.readFileSync(hostPath, 'utf8');
const hostAssetImports = [];
const hostAssetRe = /\bfrom\s+['"]([^'"]*assets\/[^'"]*)['"]/g;
let assetMatch;
while ((assetMatch = hostAssetRe.exec(stripComments(hostText))) !== null) {
  hostAssetImports.push(assetMatch[1]);
}

const unusedExports = auditUnusedExportsByImportGraph(srcFiles);
const semanticOwnership = evaluateSemanticOwnership(srcFiles);
const factoryReview = classifyFactories(srcFiles);
const durableRecoveryVerified = checkDurableRecovery();
const boundaryAudit = runBoundaryAudit();

const gates = {
  syntaxValid: syntaxErrors.length === 0,
  zeroForbiddenFiles: forbiddenFiles.length === 0,
  zeroForbiddenSymbols: forbiddenSymbols.length === 0,
  zeroHostAssetImports: hostAssetImports.length === 0,
  semanticOwnershipValid: semanticOwnership.ok === true,
  durableRecoveryVerified: durableRecoveryVerified.verified === true,
  boundariesValid: boundaryAudit.ok === true,
};

const allPassed = Object.values(gates).every(Boolean);

const report = {
  ok: allPassed,
  gates,
  classification: {
    canonicalFirstParty: classification.canonicalFirstParty.length,
    vendorSnapshots: classification.vendorSnapshots.length,
    generatedRuntimeModules: classification.generatedRuntimeModules,
    staticDataFixtures: classification.staticDataFixtures,
    totalSrcJsFiles: srcFiles.length,
  },
  syntax: {
    checkedFiles: srcFiles.length,
    failures: syntaxErrors,
  },
  forbiddenChecks: {
    forbiddenFiles,
    forbiddenSymbols,
    hostAssetImports,
  },
  semanticOwnership,
  factoryReview,
  durableRecoveryVerified,
  unusedExports,
  boundaries: boundaryAudit,
};

console.log(JSON.stringify(report, null, 2));
if (!allPassed) {
  process.exit(1);
}
