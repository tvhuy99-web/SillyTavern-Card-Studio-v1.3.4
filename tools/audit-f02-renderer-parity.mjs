import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { buildCardRuntimeRendererScript as source, normalizeCardRuntimeMarkup as normalize } from '../src/runtime/card-runtime/renderer.js';
import { buildCardRuntimeRendererScript as portable, normalizeCardRuntimeMarkup as portableNormalize } from '../assets/card-runtime-renderer-v1.3.6.js';

const baseline = '2abd57d73301389ba00319a8898171ab3bfe0ec8';
const oldCode = execFileSync('git', ['show', baseline + ':src/runtime/card-runtime/renderer.js'], { encoding: 'utf8' });
const original = await import('data:text/javascript;base64,' + Buffer.from(oldCode).toString('base64'));
for (const html of ['', '<div>Xin chào</div>', '<script>console.log("a")</script>', '<%= getvar("stat_data.hp") %>', '<!--probe-->']) {
  for (const descriptors of [null, [], [{ id: 'probe', type: 'module', content: '</script>\\n', async: true }]]) {
    for (const options of [{}, { executeScripts: false }, { executeScripts: true, runtimeMode: 'preview' }]) {
      const expected = original.buildCardRuntimeRendererScript(html, descriptors, options);
      assert.equal(source(html, descriptors, options), expected, 'Canonical renderer output drift');
      assert.equal(portable(html, descriptors, options), expected, 'Portable renderer output drift');
      assert.doesNotThrow(() => new Function(expected));
    }
  }
  assert.equal(normalize(html), original.normalizeCardRuntimeMarkup(html));
  assert.equal(portableNormalize(html), normalize(html));
}
console.log('F02 renderer: 45 byte-identical classic script cases in each layout');
