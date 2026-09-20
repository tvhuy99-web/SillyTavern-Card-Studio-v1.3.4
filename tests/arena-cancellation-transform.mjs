import assert from 'node:assert/strict';
import {
  ARENA_CANCELLATION_PATCH_VERSION,
  ARENA_CANCELLATION_REPLACEMENTS,
  patchArenaCancellationBundleSource,
} from '../build/transforms/arena-cancellation.mjs';

const fixture = ARENA_CANCELLATION_REPLACEMENTS.map(spec => spec.oldText).join(';/*fixture*/;');
const result = patchArenaCancellationBundleSource(fixture);

assert.equal(result.report.version, ARENA_CANCELLATION_PATCH_VERSION);
assert.equal(result.report.appliedCount, ARENA_CANCELLATION_REPLACEMENTS.length);

for (const spec of ARENA_CANCELLATION_REPLACEMENTS) {
  assert.ok(result.code.includes(spec.newText), 'missing replacement: ' + spec.label);
  assert.ok(!result.code.includes(spec.oldText), 'old pattern remains: ' + spec.label);
}

assert.throws(
  () => patchArenaCancellationBundleSource(fixture + ';' + ARENA_CANCELLATION_REPLACEMENTS[0].oldText),
  /matched more than once/,
);
assert.throws(
  () => patchArenaCancellationBundleSource(fixture.replace(ARENA_CANCELLATION_REPLACEMENTS[0].oldText, 'missing-pattern')),
  /pattern not found/,
);

console.log(`arena cancellation transform tests: OK (${ARENA_CANCELLATION_REPLACEMENTS.length} strict replacements)`);
