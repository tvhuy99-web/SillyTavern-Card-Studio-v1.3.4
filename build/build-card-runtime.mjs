import { copyFile, readFile, writeFile } from 'node:fs/promises';

const CORE_TEMPLATE_URL = new URL('../src/runtime/card-runtime/core.template.js', import.meta.url);
const RENDERER_SOURCE_URL = new URL('../src/runtime/card-runtime/renderer.js', import.meta.url);
const CORE_OUTPUT_URL = new URL('../assets/card-runtime-core-v1.3.6.js', import.meta.url);
const RENDERER_OUTPUT_URL = new URL('../assets/card-runtime-renderer-v1.3.6.js', import.meta.url);

const COMPATIBILITY_FRAGMENTS = [
  '../src/runtime/card-runtime/compat/catalog-characters.jsfrag',
  '../src/runtime/card-runtime/compat/personas-presets.jsfrag',
  '../src/runtime/card-runtime/compat/extensions-imports.jsfrag',
  '../src/runtime/card-runtime/compat/services.jsfrag',
  '../src/runtime/card-runtime/compat/variables-worldbook.jsfrag',
  '../src/runtime/card-runtime/compat/context-exposure.jsfrag',
].map(path => new URL(path, import.meta.url));

export async function buildCardRuntimeAssets() {
  let core = await readFile(CORE_TEMPLATE_URL, 'utf8');
  const fragments = [];
  for (const url of COMPATIBILITY_FRAGMENTS) fragments.push(await readFile(url, 'utf8'));

  const token = '/*__STS_COMPATIBILITY_API__*/';
  const first = core.indexOf(token);
  if (first < 0 || core.indexOf(token, first + token.length) >= 0) {
    throw new Error('Card Runtime compatibility API token must appear exactly once.');
  }

  core = core.slice(0, first) + fragments.join('') + core.slice(first + token.length);

  await writeFile(CORE_OUTPUT_URL, core, 'utf8');
  await copyFile(RENDERER_SOURCE_URL, RENDERER_OUTPUT_URL);

  return {
    coreBytes: core.length,
    compatibilityFragments: fragments.length,
  };
}
