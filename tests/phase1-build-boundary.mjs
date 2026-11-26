import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { entrySource, entryOutput, renderEntry, renderOwnedModule, verifyAssetInventory, generatedAssets, vendorAssets, deploymentRoots } from '../build/asset-manifest.mjs';

const root = new URL('../', import.meta.url);
await verifyAssetInventory();
const source = await readFile(new URL(entrySource, root), 'utf8');
const emitted = await readFile(new URL(entryOutput, root), 'utf8');
assert.equal(emitted, renderEntry(source));
const imports = code => [...code.matchAll(/^import[^\n]*? from ['"]([^'"]+)['"];?$/gm)].map(match => match[1]);
assert.ok(imports(source).length > 0);
assert.equal(imports(source).length, imports(emitted).length);
for (const [code, owner] of [[source, entrySource], [emitted, entryOutput]]) {
  for (const specifier of imports(code)) {
    const target = new URL(specifier, new URL(owner, root));
    assert.ok((await stat(target)).isFile(), `${owner}: ${specifier} must resolve`);
  }
}
assert.throws(() => renderEntry("import { x } from '../unmapped.js';"), /Unmapped entry dependency/);
assert.throws(() => renderOwnedModule('src/app/host.js', 'assets/app-production-v1.3.6.js', 'import { x } from "state/application-stores.js";'), /Unmapped bare module specifier/);
assert.equal(new Set([...generatedAssets, ...vendorAssets]).size, generatedAssets.length + vendorAssets.length);
assert.ok(!generatedAssets.includes('assets/m8/diagnostics/aistudio-model-controls.js'));
assert.ok(generatedAssets.includes('assets/m6/ui/settings/model-test-button.js'));
assert.ok(!deploymentRoots.some(name => /^(src|legacy|build|tools|tests|android-native|\.github)$/.test(name)));
for (const asset of generatedAssets.filter(name => name.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(asset, root))], {encoding:'utf8'});
  assert.equal(result.status, 0, 'Syntax check failed for ' + asset + ': ' + (result.stderr || '').slice(0, 500));
}
console.log('Phase 1 build ownership and source entry: OK');
