import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const accessibility = read('src/runtime/card-runtime/modules/accessibility.jsfrag');
assert.ok(accessibility.includes("SET_VISUAL_STATE', { bg: url || '' }"));
assert.ok(!accessibility.includes("SET_VISUAL_STATE', { type: 'bg', value:"));
assert.ok(accessibility.includes("rpc('chat.refresh', { messageId: messageId }, 30000)"));

const bridgeContext = read('src/runtime/card-runtime/modules/bridge-context.jsfrag');
assert.ok(bridgeContext.includes('__cardRuntimeChatMetadata'));
assert.ok(bridgeContext.includes("await rpc('extension.settings.save'"));
assert.ok(!bridgeContext.includes('saveMetadata: function () { return Promise.resolve(); }'));

const handshake = read('src/runtime/card-runtime/modules/bridge-handshake.jsfrag');
const coreTemplate = read('src/runtime/card-runtime/core.template.js');
assert.ok(handshake.includes('readyReject'));
assert.ok(handshake.includes('handshakeSettled'));
assert.ok(coreTemplate.includes('handshake timed out before HANDSHAKE_ACK'));
assert.ok(coreTemplate.includes('readyReject(new Error(message))'));
assert.ok(!coreTemplate.includes('setTimeout(function () { readyResolve(true); }, 5000)'));
assert.ok(coreTemplate.includes('groupChat: false'));
assert.ok(coreTemplate.includes('toolCalling: false'));

const services = read('src/runtime/card-runtime/compat/services.jsfrag');
assert.ok(services.includes("groups: clone(BOOT.catalog && BOOT.catalog.groups || [])"));
assert.ok(!services.includes("rpc('group.select'"));
assert.ok(services.includes('Boolean(CAPABILITIES.toolCalling)'));

const catalog = read('src/runtime/card-runtime/compat/catalog-characters.jsfrag');
assert.ok(catalog.includes('|| catalog.characters[0]'));
assert.ok(catalog.includes('|| catalog.personas[0]'));
assert.ok(!catalog.includes("|| { fileName: BOOT.context.characterKey"));

const presets = read('src/runtime/card-runtime/compat/personas-presets.jsfrag');
assert.ok(presets.includes('|| catalog.presets[0] || null'));
assert.ok(presets.includes("BOOT.context.presetName = previous"));

const gemini = read('src/providers/gemini/generation.js');
assert.ok(gemini.includes("abortSignal: signal"));

const renderer = read('src/runtime/card-runtime/renderer.js');
assert.ok(renderer.includes("data-st-keyboard-button"));
assert.ok(renderer.includes("event.key !== 'Enter' && event.key !== ' '"));
assert.ok(renderer.includes("target.removeEventListener('keydown', accessibilityKeyHandler)"));
assert.ok(renderer.includes('CARD_RUNTIME_VARIABLES_NOT_READY'));
assert.ok(renderer.includes('__cardRuntimeVariableReadinessSnapshot'));
assert.ok(renderer.includes('buildVariableDependencyProfile'));
assert.ok(renderer.includes('collectLiteralVariablePaths'));
assert.ok(renderer.includes('probeLiteralVariablePaths'));
assert.ok(renderer.includes('detectVariableReadinessUi'));
assert.ok(renderer.includes('uiReportedNotReady'));
assert.ok(renderer.includes('accessSnippets'));

const variables = read('src/runtime/card-runtime/modules/variables.jsfrag');
assert.ok(variables.includes('function syncLiveChatVariables'));
assert.ok(variables.includes('function applyVariableScopesPayload'));
assert.ok(variables.includes('__cardRuntimeVariableReadinessSnapshot'));
assert.ok(variables.includes("recordVariableRead('getvar'"));
assert.ok(variables.includes('variableSchemaTrace'));
assert.ok(variables.includes('registeredSchemas'));

assert.ok(handshake.includes("applyVariableScopesPayload(data.payload.variableScopes, 'state-update', true)"));
assert.ok(handshake.includes("applyVariableScopesPayload(data.payload && data.payload.variableScopes, 'handshake', true)"));
assert.ok(coreTemplate.includes('CARD_RUNTIME_OPTIONAL_RESOURCE_LOAD_FAILED'));
assert.ok(coreTemplate.includes('fontsapi\\.zeoseven\\.com'));

const production = read('assets/app-production-v1.3.6.js');
assert.ok(production.includes('case"chat.refresh"'));
assert.ok(production.includes('e.apiurl?await Ws(String(e.apiurl),String(e.key||""),!1):[Qh()]'));
assert.ok(production.includes('a&&(o.config={...o.config,abortSignal:a})'));
assert.ok(production.includes('"type"in r&&"value"in r?{[r.type]:r.value}'));

console.log('runtime surface gap tests: OK');
