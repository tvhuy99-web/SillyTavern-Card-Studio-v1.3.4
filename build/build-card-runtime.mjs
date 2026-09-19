import { copyFile, readFile, writeFile } from 'node:fs/promises';

const CORE_TEMPLATE_URL = new URL('../src/runtime/card-runtime/core.template.js', import.meta.url);
const RENDERER_SOURCE_URL = new URL('../src/runtime/card-runtime/renderer.js', import.meta.url);
const CORE_BUILDER_OUTPUT_URL = new URL('../assets/card-runtime-core-builder-v1.3.6.js', import.meta.url);
const RENDERER_OUTPUT_URL = new URL('../assets/card-runtime-renderer-v1.3.6.js', import.meta.url);

const COMPATIBILITY_FRAGMENTS = [
  '../src/runtime/card-runtime/compat/catalog-characters.jsfrag',
  '../src/runtime/card-runtime/compat/personas-presets.jsfrag',
  '../src/runtime/card-runtime/compat/extensions-imports.jsfrag',
  '../src/runtime/card-runtime/compat/services.jsfrag',
  '../src/runtime/card-runtime/compat/variables-worldbook.jsfrag',
  '../src/runtime/card-runtime/compat/context-exposure.jsfrag',
].map(path => new URL(path, import.meta.url));

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[card runtime build] ${label}: token not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[card runtime build] ${label}: token matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function toClassicRuntimeSource(source) {
  return source;
}

function makeCoreBuilderModule(classicCoreSource) {
  const safeCoreSource = classicCoreSource
    .replaceAll('</script', '<\\/script')
    .replaceAll('<!--', '<\\!--');

  // String.raw is intentional: generated source must retain two backslashes
  // in '\\\\u003c' so the generated module emits a literal \\u003c sequence
  // into the inline script instead of reconstructing a raw '<'.
  return String.raw`const CARD_RUNTIME_CORE_SOURCE = ${JSON.stringify(safeCoreSource)};

function serializeScriptValue(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\\\u003c')
    .replaceAll('>', '\\\\u003e')
    .replaceAll('&', '\\\\u0026');
}

export function buildCardRuntimeCoreScript(boot) {
  if (!boot || typeof boot !== 'object') {
    throw new TypeError('Card Runtime BOOT payload must be an object.');
  }
  return 'window.__CARD_STUDIO_BOOT__ = ' + serializeScriptValue(boot) + ';\\n' + CARD_RUNTIME_CORE_SOURCE + '\\nwindow.cardStudioReady = Promise.resolve(window.__STS_START_CARD_RUNTIME__(window.__CARD_STUDIO_BOOT__));\\n';
}

export const CARD_RUNTIME_CORE_SOURCE_BYTES = CARD_RUNTIME_CORE_SOURCE.length;
`;
}
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
  const classicCore = toClassicRuntimeSource(core);
  const coreBuilder = makeCoreBuilderModule(classicCore);

  await writeFile(CORE_BUILDER_OUTPUT_URL, coreBuilder, 'utf8');
  await copyFile(RENDERER_SOURCE_URL, RENDERER_OUTPUT_URL);

  return {
    coreSourceBytes: classicCore.length,
    coreBuilderBytes: coreBuilder.length,
    compatibilityFragments: fragments.length,
    iframeModuleImportRequired: false,
  };
}
