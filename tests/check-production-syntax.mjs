import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const target = new URL('../assets/app-production-v1.3.6.js', import.meta.url);
const result = spawnSync(process.execPath, ['--check', target.pathname], { encoding: 'utf8' });
if (result.status === 0) {
  console.log('production bundle syntax: OK');
  process.exit(0);
}
const stripAnsi = value => String(value || '').replace(/\x1b\[[0-9;]*m/g, '');
const stderr = stripAnsi(result.stderr);
const lines = stderr.split(/\r?\n/);
const locationIndex = lines.findIndex(line => line.includes('app-production-v1.3.6.js:'));
let sourceLine = '';
let caretLine = '';
if (locationIndex >= 0) {
  sourceLine = lines[locationIndex + 1] || '';
  caretLine = lines[locationIndex + 2] || '';
}
const caret = caretLine.indexOf('^');
if (caret >= 0 && sourceLine) {
  const start = Math.max(0, caret - 350);
  const end = Math.min(sourceLine.length, caret + 350);
  console.error('production syntax context:');
  console.error(sourceLine.slice(start, end));
  console.error(' '.repeat(Math.max(0, caret - start)) + '^');
  console.error('column=' + (caret + 1));
}
console.error(lines.slice(-12).join('\n'));
process.exit(result.status || 1);
