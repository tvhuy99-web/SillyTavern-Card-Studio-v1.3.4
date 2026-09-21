import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const target = new URL('../assets/app-production-v1.3.6.js', import.meta.url);
const original = fs.readFileSync(target, 'utf8');
const markers = [
  [',cl=async(e,t,n,r=[],a)=>', ',\ncl=async(e,t,n,r=[],a)=>', 'gemini-nonstream'],
  ['case"chat.refresh"', '\ncase"chat.refresh"', 'chat-refresh'],
  ['case"generation.models"', '\ncase"generation.models"', 'generation-models'],
  ['else if("SET_VISUAL_STATE"', '\nelse if("SET_VISUAL_STATE"', 'visual-state'],
];
let instrumented = original;
const markerLines = [];
for (const [needle, replacement, label] of markers) {
  const before = instrumented.split(needle).length - 1;
  if (before !== 1) throw new Error('Expected one marker for ' + label + ', found ' + before);
  instrumented = instrumented.replace(needle, replacement);
  markerLines.push(label);
}
const temp = path.join(os.tmpdir(), 'app-production-syntax-check.mjs');
fs.writeFileSync(temp, instrumented);
const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (result.status === 0) {
  console.log('production bundle syntax: OK');
  process.exit(0);
}
const stripAnsi = value => String(value || '').replace(/\x1b\[[0-9;]*m/g, '');
const stderr = stripAnsi(result.stderr);
const location = stderr.match(/app-production-syntax-check\.mjs:(\d+)/);
const errorLine = stderr.split(/\r?\n/).find(line => /SyntaxError:/.test(line)) || 'SyntaxError';
const line = location ? Number(location[1]) : null;
console.error('production syntax diagnostic: line=' + String(line) + ' error=' + errorLine);
console.error('marker order after original bundle line 23: ' + markerLines.join(' -> '));
if (line !== null) {
  console.error('instrumented line content: ' + (instrumented.split(/\r?\n/)[line - 1] || '').slice(0, 1200));
}
process.exit(result.status || 1);
