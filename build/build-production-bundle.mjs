import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { ARENA_CORE_REPLACEMENTS } from '../assets/arena-state-bundle-transform-v1.3.6.4.js';
import { CORE_RELIABILITY_REPLACEMENTS } from '../assets/core-reliability-bundle-transform-v1.3.6.4.js';
import { ARENA_CANCELLATION_REPLACEMENTS } from '../assets/arena-cancellation-bundle-transform-v1.3.6.5.js';
import {
  applyPresetBoundaryTransform,
  PRESET_BOUNDARY_PATCH_COUNT,
} from './transforms/preset-boundary.mjs';
import { applyCardRuntimeTransform } from './transforms/card-runtime.mjs';
import { buildCardRuntimeAssets } from './build-card-runtime.mjs';

const SOURCE_URL = new URL('../assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js', import.meta.url);
const OUTPUT_URL = new URL('../assets/app-production-v1.3.6.js', import.meta.url);
const PROMPT_NORMALIZER_SOURCE_URL = new URL('../src/features/presets/prompt-normalizer.js', import.meta.url);
const PROMPT_NORMALIZER_OUTPUT_URL = new URL('../assets/prompt-normalizer-v1.3.6.js', import.meta.url);

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[build] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[build] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function applyGroup(source, replacements, groupName) {
  let code = source;
  for (const replacement of replacements) {
    code = replaceExactlyOnce(code, replacement.oldText, replacement.newText, `${groupName}/${replacement.label}`);
  }
  return code;
}

const runtimeReport = await buildCardRuntimeAssets();
await copyFile(PROMPT_NORMALIZER_SOURCE_URL, PROMPT_NORMALIZER_OUTPUT_URL);

let code = await readFile(SOURCE_URL, 'utf8');
code = applyGroup(code, ARENA_CORE_REPLACEMENTS, 'arena-state');
code = applyGroup(code, CORE_RELIABILITY_REPLACEMENTS, 'core-reliability');
code = applyGroup(code, ARENA_CANCELLATION_REPLACEMENTS, 'arena-cancellation');
code = applyPresetBoundaryTransform(code);
code = applyCardRuntimeTransform(code);

const banner = `/* GENERATED FILE. DO NOT EDIT DIRECTLY.
   Build source: assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js
   Build pipeline: build/build-production-bundle.mjs
   Patch order: arena-state -> core-reliability -> arena-cancellation -> preset-boundaries -> card-runtime-extraction
   Runtime source patching is not used on the normal boot path.
*/
`;

await writeFile(OUTPUT_URL, banner + code, 'utf8');

console.log(JSON.stringify({
  output: 'assets/app-production-v1.3.6.js',
  sourceBytes: code.length,
  patches: {
    arenaState: ARENA_CORE_REPLACEMENTS.length,
    coreReliability: CORE_RELIABILITY_REPLACEMENTS.length,
    arenaCancellation: ARENA_CANCELLATION_REPLACEMENTS.length,
    presetBoundaries: PRESET_BOUNDARY_PATCH_COUNT,
  },
  cardRuntime: runtimeReport,
}, null, 2));
