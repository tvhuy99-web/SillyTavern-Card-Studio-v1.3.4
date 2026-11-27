const fs = require('node:fs');
const path = require('node:path');

let ts = null;
try {
  ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
} catch {
  ts = null;
}

const root = path.resolve(__dirname, '..');
const relative = file => path.relative(root, file).split(path.sep).join('/');

function list(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? list(file) : entry.name.endsWith('.js') ? [file] : [];
  });
}

function stripCommentsAndStringsForFallback(code) {

  return code
    .replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

function scanEdgesFallback(file, text) {
  const cleaned = stripCommentsAndStringsForFallback(text);
  const found = [];
  const patterns = [
    { kind: 'static-import', re: /\bimport\s+(?:[\s\S]*?\s+from\s+)?(['"])([^'"]+)\1/g },
    { kind: 're-export', re: /\bexport\s+(?:\*|\{[\s\S]*?\})\s+from\s+(['"])([^'"]+)\1/g },
    { kind: 'dynamic-import', re: /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g },
    { kind: 'module-relative-url', re: /\bnew\s+URL\s*\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g },
  ];
  for (const { kind, re } of patterns) {
    let match;
    while ((match = re.exec(cleaned)) !== null) {
      found.push({ specifier: match[2], kind });
    }
  }
  const computed = [];
  const dynRe = /\bimport\s*\(\s*([^)'"]+?)\s*\)/g;
  let m;
  while ((m = dynRe.exec(cleaned)) !== null) {
    if (!/^['"]/.test(m[1].trim())) {
      computed.push({ from: relative(file), kind: 'dynamic-import', offset: m.index });
    }
  }
  return { found, computed };
}

function classifyLayer(relPath) {
  if (relPath.startsWith('src/core/')) return { layer: 'core', feature: null };
  if (relPath.startsWith('src/providers/')) return { layer: 'providers', feature: null };
  if (relPath.startsWith('src/app/persistence/')) return { layer: 'persistence', feature: null };
  if (relPath.startsWith('src/app/state/')) return { layer: 'state', feature: null };
  if (relPath.startsWith('src/app/')) return { layer: 'app', feature: null };
  if (relPath.startsWith('src/ui/')) return { layer: 'ui', feature: null };
  if (relPath.startsWith('src/platform/')) return { layer: 'platform', feature: null };
  if (relPath.startsWith('src/runtime/')) return { layer: 'runtime', feature: null };
  if (relPath.startsWith('src/diagnostics/')) return { layer: 'diagnostics', feature: null };
  if (relPath.startsWith('src/vendor/')) return { layer: 'vendor', feature: null };
  const featMatch = relPath.match(/^src\/features\/([^/]+)\//);
  if (featMatch) return { layer: 'feature', feature: featMatch[1] };
  if (relPath.startsWith('assets/')) return { layer: 'assets', feature: null };
  return { layer: 'other', feature: null };
}

const ALLOWED_VENDOR_ASSET_PREFIXES = [
  'assets/ejs.min-',
  'assets/jszip.min-',
  'assets/lodash.min-',
];

function evaluateBoundaries(edges) {
  const violations = [];
  for (const edge of edges) {
    if (!edge.to || !edge.from.startsWith('src/')) continue;
    const fromInfo = classifyLayer(edge.from);
    const toInfo = classifyLayer(edge.to);

    if (toInfo.layer === 'assets') {
      const isVendorStatic = ALLOWED_VENDOR_ASSET_PREFIXES.some(p => edge.to.startsWith(p));
      if (!isVendorStatic) {
        violations.push({
          rule: 'B08',
          from: edge.from,
          to: edge.to,
          kind: edge.kind,
          reason: 'Canonical source imports generated application asset instead of canonical src/ module',
        });
      }
      continue;
    }

    if (fromInfo.layer === 'core' && !['core', 'vendor'].includes(toInfo.layer)) {
      violations.push({
        rule: 'LAYER-CORE',
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        reason: `core module must not depend on ${toInfo.layer}`,
      });
    }

    if (fromInfo.layer === 'providers' && ['ui', 'feature', 'app'].includes(toInfo.layer)) {
      violations.push({
        rule: 'LAYER-PROVIDER',
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        reason: `provider module must not depend on ${toInfo.layer}`,
      });
    }

    if (fromInfo.layer === 'persistence' && toInfo.layer === 'ui') {
      violations.push({
        rule: 'LAYER-PERSISTENCE',
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        reason: 'persistence module must not depend on UI',
      });
    }

    if (fromInfo.layer === 'diagnostics' && !edge.from.includes('/ui/') && ['ui', 'feature'].includes(toInfo.layer)) {
      violations.push({
        rule: 'LAYER-DIAGNOSTICS',
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        reason: `diagnostics module must not depend on ${toInfo.layer}`,
      });
    }

    if (fromInfo.layer === 'runtime' && ['state', 'persistence', 'ui'].includes(toInfo.layer)) {
      violations.push({
        rule: 'LAYER-RUNTIME',
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        reason: `card runtime must not depend directly on ${toInfo.layer}`,
      });
    }
  }
  return violations;
}

function graph(directory) {
  const files = list(path.join(root, directory)).sort();
  const edges = [], computed = [], parseErrors = [];
  const nodes = files.map(relative);
  const known = new Set(nodes);

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const addEdge = (specifier, kind) => {
      const target = specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier.split(/[?#]/)[0]) : null;
      edges.push({
        from: relative(file),
        specifier,
        kind,
        to: target ? relative(target) : null,
        exists: target ? fs.existsSync(target) : null,
      });
    };

    if (ts) {
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
      if (source.parseDiagnostics.length) parseErrors.push({ file: relative(file), count: source.parseDiagnostics.length });
      const add = (node, kind) => {
        if (!node || !ts.isStringLiteralLike(node)) {
          computed.push({ from: relative(file), kind, offset: node?.getStart(source) ?? null });
          return;
        }
        addEdge(node.text, kind);
      };
      const visit = node => {
        if (ts.isImportDeclaration(node)) add(node.moduleSpecifier, 'static-import');
        else if (ts.isExportDeclaration(node) && node.moduleSpecifier) add(node.moduleSpecifier, 're-export');
        else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], 'dynamic-import');
        else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.[1]?.getText(source) === 'import.meta.url') add(node.arguments[0], 'module-relative-url');
        ts.forEachChild(node, visit);
      };
      visit(source);
    } else {
      const scanned = scanEdgesFallback(file, text);
      for (const item of scanned.found) addEdge(item.specifier, item.kind);
      computed.push(...scanned.computed);
    }
  }

  const adjacency = new Map(nodes.map(n => [n, []]));
  for (const edge of edges) {
    if (known.has(edge.to) && edge.kind !== 'module-relative-url') {
      adjacency.get(edge.from).push(edge.to);
    }
  }
  const visited = new Set(), active = new Set(), chain = [], cycles = [];
  function dfs(node) {
    if (active.has(node)) {
      cycles.push([...chain.slice(chain.indexOf(node)), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    active.add(node);
    chain.push(node);
    for (const child of adjacency.get(node)) dfs(child);
    chain.pop();
    active.delete(node);
  }
  nodes.forEach(dfs);

  const unresolved = edges.filter(e => e.exists === false);
  const boundaryViolations = directory === 'src' ? evaluateBoundaries(edges) : [];
  return { directory, nodes, edges, computed, parseErrors, cycles, unresolved, boundaryViolations };
}

const args = new Set(process.argv.slice(2));
const graphs = ['src', 'assets'].map(graph);
const srcGraph = graphs[0];

if (args.has('--summary') || args.has('--check')) {
  console.log(JSON.stringify({
    parser: ts ? `typescript-${ts.version}` : 'zero-dep-esm-scanner',
    src: {
      nodes: srcGraph.nodes.length,
      edges: srcGraph.edges.length,
      cycles: srcGraph.cycles.length,
      unresolved: srcGraph.unresolved.length,
      boundaryViolations: srcGraph.boundaryViolations,
    },
    assets: {
      nodes: graphs[1].nodes.length,
      edges: graphs[1].edges.length,
      cycles: graphs[1].cycles.length,
      unresolved: graphs[1].unresolved.length,
    },
  }, null, 2));
  if (args.has('--check')) {
    const failed = srcGraph.cycles.length > 0 || srcGraph.unresolved.length > 0 || srcGraph.boundaryViolations.length > 0;
    if (failed) process.exitCode = 1;
  }
} else {
  console.log(JSON.stringify({
    parser: ts ? `typescript-${ts.version}` : 'zero-dep-esm-scanner',
    typescript: ts ? ts.version : null,
    graphs,
    limitations: [
      'Only literal ESM dependencies and import.meta.url references; no runtime execution.',
      'Card Runtime .jsfrag assembly and implicit dependencies need separate contract review.',
      'No claim of complete call graph or absence of runtime cycles.',
    ],
  }, null, 2));
}
