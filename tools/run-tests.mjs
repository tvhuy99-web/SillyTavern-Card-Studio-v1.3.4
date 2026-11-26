import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const preload = fileURLToPath(new URL('./node-web-globals.mjs', import.meta.url));
const tests = (await readdir(new URL('../tests/', import.meta.url), {withFileTypes:true}))
  .filter(entry => entry.isFile() && entry.name.endsWith('.mjs'))
  .map(entry => 'tests/' + entry.name).sort();
if (!tests.length) throw new Error('No test files found');
let passed = 0;
for (const test of tests) {
  const result = spawnSync(process.execPath, ['--import', preload, test], {cwd:root, stdio:'inherit'});
  if (result.status === 0) { passed++; console.log('PASS ' + test); }
  else console.error('FAIL ' + test, result.error || result.signal || result.status);
}
console.log(`${passed}/${tests.length} test files passed`);
if (passed !== tests.length) process.exitCode = 1;
