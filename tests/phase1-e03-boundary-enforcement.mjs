import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const auditorScript = join(repoRoot, 'tools', 'audit-module-graph.cjs');

function runAuditor(scriptPath, cwd) {
  const result = spawnSync(process.execPath, [scriptPath, '--check'], {
    cwd,
    encoding: 'utf8',
  });
  let report = null;
  if (result.stdout.trim()) {
    report = JSON.parse(result.stdout);
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, report };
}

function runSyntheticCase(name, files) {
  const workspace = mkdtempSync(join(tmpdir(), `stcs-boundary-${name}-`));
  try {
    const toolsDir = join(workspace, 'tools');
    mkdirSync(toolsDir, { recursive: true });
    const tempAuditor = join(toolsDir, 'audit-module-graph.cjs');
    copyFileSync(auditorScript, tempAuditor);

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(workspace, relPath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    }

    return runAuditor(tempAuditor, workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

// 0. Baseline: real repository must pass with exit code 0 and zero violations.
const baseline = runAuditor(auditorScript, repoRoot);
assert.equal(baseline.status, 0, `Expected repo boundary check to pass, got status=${baseline.status}: ${baseline.stdout} ${baseline.stderr}`);
assert.ok(baseline.report?.src, 'Expected JSON summary with src graph');
assert.equal(baseline.report.src.cycles, 0, 'Expected zero circular dependencies in src/');
assert.equal(baseline.report.src.unresolved, 0, 'Expected zero unresolved imports in src/');
assert.deepEqual(baseline.report.src.boundaryViolations, [], 'Expected zero boundary violations in src/');

// 1. Circular dependency (B01) must fail with non-zero exit code.
const cycleResult = runSyntheticCase('cycle-b01', {
  'src/core/cycle-a.js': "import { b } from './cycle-b.js';\nexport const a = b + 1;\n",
  'src/core/cycle-b.js': "import { a } from './cycle-a.js';\nexport const b = a + 1;\n",
});
assert.notEqual(cycleResult.status, 0, 'Circular dependency B01 must fail with non-zero exit code');
assert.equal(cycleResult.report.src.unresolved, 0);
assert.ok(cycleResult.report.src.cycles > 0, 'Circular dependency B01 must be reported in src.cycles');

// 2. Canonical src/ importing generated assets/ (B08) must fail with non-zero exit code.
const assetImportResult = runSyntheticCase('asset-b08', {
  'assets/generated-runtime.js': 'export const runtime = true;\n',
  'src/app/bad-host.js': "import { runtime } from '../../assets/generated-runtime.js';\nexport { runtime };\n",
});
assert.notEqual(assetImportResult.status, 0, 'Canonical src/ importing assets/ (B08) must fail');
assert.equal(assetImportResult.report.src.unresolved, 0);
assert.ok(
  assetImportResult.report.src.boundaryViolations.some(
    v => v.rule === 'B08' && v.from === 'src/app/bad-host.js' && v.to === 'assets/generated-runtime.js',
  ),
  'Expected B08 violation for src/app/bad-host.js -> assets/generated-runtime.js',
);

// 3. src/core/ importing src/ui/ (LAYER-CORE) must fail with non-zero exit code.
const coreUiResult = runSyntheticCase('core-ui', {
  'src/ui/button.js': 'export const Button = () => null;\n',
  'src/core/bad-core.js': "import { Button } from '../ui/button.js';\nexport { Button };\n",
});
assert.notEqual(coreUiResult.status, 0, 'src/core/ importing src/ui/ must fail');
assert.equal(coreUiResult.report.src.unresolved, 0);
assert.ok(
  coreUiResult.report.src.boundaryViolations.some(
    v => v.rule === 'LAYER-CORE' && v.from === 'src/core/bad-core.js' && v.to === 'src/ui/button.js',
  ),
  'Expected LAYER-CORE violation for src/core/bad-core.js -> src/ui/button.js',
);

// 4. src/providers/ importing src/ui/ (LAYER-PROVIDER) must fail with non-zero exit code.
const providerUiResult = runSyntheticCase('provider-ui', {
  'src/ui/settings-panel.js': 'export const SettingsPanel = () => null;\n',
  'src/providers/bad-provider.js': "import { SettingsPanel } from '../ui/settings-panel.js';\nexport { SettingsPanel };\n",
});
assert.notEqual(providerUiResult.status, 0, 'src/providers/ importing src/ui/ must fail');
assert.equal(providerUiResult.report.src.unresolved, 0);
assert.ok(
  providerUiResult.report.src.boundaryViolations.some(
    v => v.rule === 'LAYER-PROVIDER' && v.from === 'src/providers/bad-provider.js' && v.to === 'src/ui/settings-panel.js',
  ),
  'Expected LAYER-PROVIDER violation for src/providers/bad-provider.js -> src/ui/settings-panel.js',
);

// 5. src/app/persistence/ importing src/ui/ (LAYER-PERSISTENCE) must fail with non-zero exit code.
const persistenceUiResult = runSyntheticCase('persistence-ui', {
  'src/ui/toast.js': 'export const showToast = () => {};\n',
  'src/app/persistence/bad-repo.js': "import { showToast } from '../../ui/toast.js';\nexport { showToast };\n",
});
assert.notEqual(persistenceUiResult.status, 0, 'src/app/persistence/ importing src/ui/ must fail');
assert.equal(persistenceUiResult.report.src.unresolved, 0);
assert.ok(
  persistenceUiResult.report.src.boundaryViolations.some(
    v => v.rule === 'LAYER-PERSISTENCE' && v.from === 'src/app/persistence/bad-repo.js' && v.to === 'src/ui/toast.js',
  ),
  'Expected LAYER-PERSISTENCE violation for src/app/persistence/bad-repo.js -> src/ui/toast.js',
);

// 6. src/runtime/ importing src/app/state/ (LAYER-RUNTIME) must fail with non-zero exit code.
const runtimeStateResult = runSyntheticCase('runtime-state', {
  'src/app/state/private-store.js': 'export const store = {};\n',
  'src/runtime/bad-runtime.js': "import { store } from '../app/state/private-store.js';\nexport { store };\n",
});
assert.notEqual(runtimeStateResult.status, 0, 'src/runtime/ importing src/app/state/ must fail');
assert.equal(runtimeStateResult.report.src.unresolved, 0);
assert.ok(
  runtimeStateResult.report.src.boundaryViolations.some(
    v => v.rule === 'LAYER-RUNTIME' && v.from === 'src/runtime/bad-runtime.js' && v.to === 'src/app/state/private-store.js',
  ),
  'Expected LAYER-RUNTIME violation for src/runtime/bad-runtime.js -> src/app/state/private-store.js',
);

console.log('E03.5 boundary enforcement: repo baseline PASS and all 6 forbidden edge rules rejected.');
