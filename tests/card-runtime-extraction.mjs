import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyCardRuntimeTransform } from '../build/transforms/card-runtime.mjs';

const bundle = fs.readFileSync(new URL('../assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js', import.meta.url), 'utf8');
const transformed = applyCardRuntimeTransform(bundle);

assert.ok(transformed.includes("card-runtime-core-v1.3.6.js?v=1.3.6-m3.1"));
assert.ok(transformed.includes('__stsBuildCardRuntimeRendererScript'));
assert.ok(!transformed.includes("const BOOT = ${t};"), 'inline Card Runtime core must be removed');
assert.ok(!transformed.includes("const START_OPTIONS = ${i};"), 'inline renderer must be removed');
assert.ok(!transformed.includes("yp=String.raw"), 'embedded compatibility API must be removed');
assert.ok(transformed.includes('vue-router@5.1.0/dist/vue-router.global.js'));
assert.ok(!transformed.includes('vue-router@5.2.0/dist/vue-router.global.js'));

console.log('card runtime extraction transform tests: OK');
