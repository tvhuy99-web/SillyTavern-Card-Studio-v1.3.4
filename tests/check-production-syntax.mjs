import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedAssets } from '../build/asset-manifest.mjs';

for (const path of generatedAssets.filter(path => path.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('../'+path, import.meta.url))], {encoding:'utf8', maxBuffer:16*1024*1024});
  assert.equal(result.status, 0, path+': '+(result.stderr||result.error||''));
}
console.log('All emitted production JavaScript modules: syntax OK');
