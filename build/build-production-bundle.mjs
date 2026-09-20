import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { ARENA_CORE_REPLACEMENTS } from '../assets/arena-state-bundle-transform-v1.3.6.4.js';
import { CORE_RELIABILITY_REPLACEMENTS } from '../assets/core-reliability-bundle-transform-v1.3.6.4.js';
import { ARENA_CANCELLATION_REPLACEMENTS } from '../assets/arena-cancellation-bundle-transform-v1.3.6.5.js';
import {
  applyPresetBoundaryTransform,
  PRESET_BOUNDARY_PATCH_COUNT,
} from './transforms/preset-boundary.mjs';
import { applyCardRuntimeTransform } from './transforms/card-runtime.mjs';
import { applyProxyPersistenceTransform, PROXY_PERSISTENCE_PATCH_COUNT } from './transforms/proxy-persistence.mjs';
import { applyM4ChatGenerationTransform, M4_CHAT_GENERATION_PATCH_COUNT } from './transforms/m4-chat-generation.mjs';
import { applyM5StateTransform, M5_STATE_PATCH_COUNT } from './transforms/m5-state-persistence-runtime.mjs';
import { buildCardRuntimeAssets } from './build-card-runtime.mjs';

const SOURCE_URL = new URL('../assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js', import.meta.url);
const OUTPUT_URL = new URL('../assets/app-production-v1.3.6.js', import.meta.url);
const PROMPT_NORMALIZER_SOURCE_URL = new URL('../src/features/presets/prompt-normalizer.js', import.meta.url);
const PROMPT_NORMALIZER_OUTPUT_URL = new URL('../assets/prompt-normalizer-v1.3.6.js', import.meta.url);
const PROXY_PERSISTENCE_SOURCE_URL = new URL('../src/providers/proxy/persistence.js', import.meta.url);
const PROXY_PERSISTENCE_OUTPUT_URL = new URL('../assets/proxy-persistence-service-v1.3.6.js', import.meta.url);


const M5_DOMAIN_ASSETS = [
  ['../src/app/state/runtime-state.js', '../assets/m5/app/state/runtime-state.js'],
  ['../src/app/persistence/session-state.js', '../assets/m5/app/persistence/session-state.js'],
  ['../src/diagnostics/state.js', '../assets/m5/diagnostics/state.js'],
  ['../src/features/arena/state-machine.js', '../assets/m5/features/arena/state-machine.js'],
  ['../src/ui/runtime-guard.js', '../assets/m5/ui/runtime-guard.js'],
].map(([source, output]) => ({
  source: new URL(source, import.meta.url),
  output: new URL(output, import.meta.url),
}));

const M4_DOMAIN_ASSETS = [
  ['../src/providers/common/generation-utils.js', '../assets/m4/providers/common/generation-utils.js'],
  ['../src/providers/common/generation-gateway.js', '../assets/m4/providers/common/generation-gateway.js'],
  ['../src/providers/proxy/generation.js', '../assets/m4/providers/proxy/generation.js'],
  ['../src/providers/openrouter/generation.js', '../assets/m4/providers/openrouter/generation.js'],
  ['../src/providers/gemini/generation.js', '../assets/m4/providers/gemini/generation.js'],
  ['../src/features/chat/turn-policy.js', '../assets/m4/features/chat/turn-policy.js'],
].map(([source, output]) => ({
  source: new URL(source, import.meta.url),
  output: new URL(output, import.meta.url),
}));

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
await copyFile(PROXY_PERSISTENCE_SOURCE_URL, PROXY_PERSISTENCE_OUTPUT_URL);
for (const asset of [...M4_DOMAIN_ASSETS, ...M5_DOMAIN_ASSETS]) {
  await mkdir(new URL('./', asset.output), { recursive: true });
  await copyFile(asset.source, asset.output);
}

let code = await readFile(SOURCE_URL, 'utf8');
code = applyGroup(code, ARENA_CORE_REPLACEMENTS, 'arena-state');
code = applyGroup(code, CORE_RELIABILITY_REPLACEMENTS, 'core-reliability');
code = applyGroup(code, ARENA_CANCELLATION_REPLACEMENTS, 'arena-cancellation');
code = applyPresetBoundaryTransform(code);
code = applyCardRuntimeTransform(code);
code = applyProxyPersistenceTransform(code);
code = applyM4ChatGenerationTransform(code);
code = applyM5StateTransform(code);

const banner = `/* GENERATED FILE. DO NOT EDIT DIRECTLY.
   Build source: assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js
   Build pipeline: build/build-production-bundle.mjs
   Patch order: arena-state -> core-reliability -> arena-cancellation -> preset-boundaries -> card-runtime-extraction -> proxy-persistence-boundary -> m4-chat-generation-domain -> m5-state-persistence-runtime
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
    proxyPersistence: PROXY_PERSISTENCE_PATCH_COUNT,
    m4ChatGeneration: M4_CHAT_GENERATION_PATCH_COUNT,
    m5StatePersistenceRuntime: M5_STATE_PATCH_COUNT,
  },
  cardRuntime: runtimeReport,
}, null, 2));
