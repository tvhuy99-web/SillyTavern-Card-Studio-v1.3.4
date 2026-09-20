import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../assets/app-production-v1.3.6.js', import.meta.url));
const result = spawnSync(process.execPath, ['--check', file], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
if (result.status !== 0) {
  const clean = String(result.stderr || result.stdout || '')
    .split(/\r?\n/)
    .filter(line => line.length < 1200)
    .slice(-20)
    .join('\n');
  console.error(clean || 'node --check failed without compact diagnostics');
  process.exit(result.status || 1);
}
console.log('production module syntax: OK');
