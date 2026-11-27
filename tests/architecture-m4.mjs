import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderOwnedModule } from '../build/asset-manifest.mjs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const production = readRecoveredHostView();
const entry = read('assets/app-entry-v1.3.6.js');

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("chatDomain: 'owned-conversation-service'"));
assert.ok(entry.includes("generationDomain: 'owned-provider-gateway'"));
assert.ok(entry.includes("worldInfoDomain: 'owned-smart-scan-service'"));
assert.ok(entry.includes("promptDomain: 'owned-prompt-service'"));
assert.ok(entry.includes("responseDomain: 'owned-response-processor'"));

for (const token of [
  './variable-scope-service-v1.3.6.js',
  './smart-state-service-v1.3.6.js',
  './m4/providers/common/generation-gateway.js',
  './m4/features/chat/turn-policy.js',
  './m4/features/chat/conversation-service.js',
  './m4/features/chat/live-stream-store.js',
  './m4/features/world-info/embedding-service.js',
  './m4/features/world-info/smart-scan-service.js',
  './m4/features/prompts/prompt-service.js',
  './m4/features/chat/response-processor.js',
  '__stsGenerationGateway.generateOnce',
  'gateway.stream({ prompt, preset, signal, model, source, proxyConfig',
  '__stsCreateConversationService',
  '__stsCreateEmbeddingService',
  '__stsEmbeddingService',
  'conversationService.send',
  '__stsScanWorldInfo',
  '__stsBuildConversationPrompt',
  '__stsProcessAIResponse',
]) assert.ok(production.includes(token), 'missing M4 ownership token: ' + token);

const generationStart = production.indexOf('const __stsHostGeneration=');
const generationEnd = production.indexOf('var ModelSelect=', generationStart);
assert.ok(generationStart >= 0 && generationEnd > generationStart);
const gatewayAdapter = production.slice(generationStart, generationEnd);
assert.ok(!gatewayAdapter.includes('openrouter.ai/api/v1/chat/completions'));
assert.ok(!gatewayAdapter.includes('.body.getReader()'));
assert.ok(!gatewayAdapter.includes('new TextDecoder'));
assert.ok(!gatewayAdapter.includes('Proxy Stream Error'));

const sendStart = production.indexOf('const sendMessage = react.useCallback(');
const sendEnd = production.indexOf('return {', sendStart);
assert.ok(sendStart >= 0 && sendEnd > sendStart);
const sendBlock = production.slice(sendStart, sendEnd);
for (const forbidden of [
  'scanWorldInfo', 'assemblePrompt(', 'streamGeneration(', 'generateOnce(', '__stsArenaState',
  'logSmartScan', 'logSelection', 'new AbortController',
]) assert.ok(!sendBlock.includes(forbidden), 'React send adapter regained business logic: ' + forbidden);

const smartScanStart = production.indexOf('const scanInput = react.useCallback(');
const smartScanEnd = production.indexOf('const processOutput =', smartScanStart);
assert.ok(smartScanStart >= 0 && smartScanEnd > smartScanStart);
const smartScanAdapter = production.slice(smartScanStart, smartScanEnd);
assert.ok(smartScanAdapter.includes('__stsScanWorldInfo'));
assert.ok(smartScanAdapter.includes('worldInfoState'));
assert.ok(smartScanAdapter.includes('lorebooks'));
assert.ok(!smartScanAdapter.includes('((t,r,a,i,o,s=[]'));
assert.ok(!smartScanAdapter.includes('semantic_threshold||.7'));
assert.ok(!smartScanAdapter.includes('[Smart Scan] Skipped API call'));

const responseStart = production.indexOf('const processAIResponse = react.useCallback(');
const responseEnd = production.indexOf('const createPlaceholderMessage =', responseStart);
assert.ok(responseStart >= 0 && responseEnd > responseStart);
const responseAdapter = production.slice(responseStart, responseEnd);
assert.ok(!responseAdapter.includes('[Integrated RPG] Detected'));
assert.ok(!responseAdapter.includes('worldInfoRuntime:d'));

assert.ok(!production.includes('stsSessionBook'));
assert.ok(!production.includes('[Smart Scan] Skipped API call'));
assert.ok(production.includes('embedding_provider:"gemini"'), 'Smart Scan defaults must retain Gemini as the initial embedding provider');
const embeddingService = read('src/features/world-info/embedding/embedding-provider-registry.js');
assert.ok(embeddingService.includes('EmbeddingGemma 300M Q4 - Offline'), 'EmbeddingGemma option must be owned by embedding service');
assert.ok(embeddingService.includes('Qwen3-Embedding 0.6B Q4 - Offline'), 'Qwen3 embedding option must be owned by embedding service');
assert.ok(production.includes('__stsEmbeddingService.embedQuery'), 'semantic query embedding must route through the owned service');
assert.ok(production.includes('__stsEmbeddingService.syncIndex'), 'semantic sync must route through the owned service');
const promptService = read('src/features/prompts/prompt-service.js');
assert.ok(promptService.includes('await yieldToBrowser()'), 'prompt service must yield before legacy prompt-core preprocessing');
assert.ok(promptService.includes('const modelContextCache = new WeakMap()'), 'prompt service must cache sanitized model history by message identity');
const conversationService = read('src/features/chat/conversation-service.js');
assert.ok(conversationService.includes('await yieldToBrowser()'), 'send must yield so the busy UI can paint before heavy preparation');
assert.ok(conversationService.includes("typeof options.beforeTurn === 'function'"), 'send must support retry preparation after entering busy state');
assert.ok(conversationService.includes("deps.liveStream.publish"), 'stream chunks must publish outside the global conversation store');
assert.ok(conversationService.includes("deps.liveStream.clear"), 'live stream state must be cleared after completion');
assert.ok(!conversationService.includes("streamUpdateInterval"), 'conversation service must not throttle by mutating global messages');
const liveStreamStore = read('src/features/chat/live-stream-store.js');
assert.ok(liveStreamStore.includes('const snapshots = new Map()'), 'live stream store must own ephemeral snapshots');
assert.ok(liveStreamStore.includes('setTimeout(flushPending, 100)'), 'live stream rendering must coalesce subscriber notifications at a mobile-safe paint cadence');
assert.ok(conversationService.indexOf('deps.setLoading(true)') < conversationService.indexOf('deps.preprocessInput(rawContent, state)'), 'loading must be set before input preprocessing');
assert.ok(!production.includes('[Integrated RPG] Detected'));
assert.ok(!production.includes(',Vs=async('), 'legacy Proxy chat generator must be removed from production');
assert.ok(!production.includes('.replace(/{{worldInfo}}/g,"")'), 'plain-text mode must not erase {{worldInfo}}');
assert.ok(!production.includes('.replace(/{{worldInfo_before}}/g,"")'), 'plain-text mode must not erase {{worldInfo_before}}');
assert.ok(!production.includes('.replace(/{{worldInfo_after}}/g,"")'), 'plain-text mode must not erase {{worldInfo_after}}');
assert.ok(!production.includes('g||(i=Xu(i),'), 'plain-text mode must not disable prompt variable expansion');
assert.ok(!production.includes('i=g?i.replace(/{{current_page_history}}/g,Q)'), 'plain text mode must not erase prompt context macros');
assert.ok(!production.includes('g||(i=Xu(i),'), 'plain text mode must still expand prompt variables');
assert.ok(production.includes('.replace(/{{worldInfo_before}}/g, worldInfoBeforeText)') && production.includes('.replace(/{{worldInfo_after}}/g, worldInfoAfterText)') && production.includes('.replace(/{{worldInfo}}/g, allWorldInfoText)'), 'World Info macros must resolve in all display modes');
assert.ok(production.includes('turnPolicy.compactModelMessages(messages, { keepLatest: true })'));
assert.ok(production.includes('chat_history: state.messages.map(message => `[${message.role}] ${contextContent(message)}`)'));
assert.ok(!production.includes('chat_history:n.messages.map(e=>`[${e.role}] ${e.content}`).join("\\n")'));
assert.ok(
  production.includes('for (let messageIndex = 0; messageIndex < currentPageMessages.length; messageIndex += 1)'),
  'current_page_history preprocessing must iterate currentPageMessages cleanly',
);
assert.ok(
  production.includes('const storyContent = extractStoryContent(regexProcessedContent);') && production.includes('const expandedContent = expandMacros(storyContent);'),
  'current_page_history preprocessing must keep story-only sanitization while yielding cooperatively',
);
assert.ok(
  production.includes('const promptRegexCache = new WeakMap()'),
  'prompt regex results must be cached within a prompt build',
);
assert.ok(
  production.includes('messageIndex > 0 && messageIndex % 4 === 0'),
  'prompt preprocessing must periodically yield to the browser',
);
assert.ok(
  !production.includes('X=V.map(e=>{let t=K(e,W||g),n=Y(e,t),r=g?n:bd(n),a=S(r);'),
  'current_page_history must never bypass story sanitization in plain/interactive-disabled mode',
);
assert.ok(
  production.includes('selectMessageSourceContent(message, true)'),
  'last_turn must keep the immediate previous model response raw',
);

assert.ok(production.includes('normalizePromptVariableScopes('), 'canonical prompt assembler must normalize variable scopes');
assert.ok(production.includes('buildSmartStateBlock({'), 'canonical prompt assembler must delegate Smart State assembly');
assert.ok(production.includes('.replace(/{{last_state}}/g, visualState)'), 'last_state macro must use Smart State visualState');
assert.ok(/buildFrameSmartStateBlock\s*=\s*\(variables,\s*card,\s*messages,\s*messageIndex\)\s*=>\s*__stsBuildSmartStateBlock\(\{\s*variables:\s*variables,\s*card:\s*card,\s*messages:\s*messages\.slice\(0,\s*Math\.max\(0,\s*messageIndex\)\)\s*\}\)\.smartStateBlock/.test(production));
assert.ok(production.includes('mutateVariable(globalVariables'), 'setglobalvar must mutate canonical global scope');
assert.ok(production.includes('getVariable(globalVariables'), 'getglobalvar must read canonical global scope');
assert.ok(!production.includes('o=Gu(o,"set","globals."+r,s)'), 'legacy chat.globals mutation must be removed');
assert.ok(production.includes('updatedVariables: chatVariables') && production.includes('updatedGlobalVariables: globalVariables'), 'prompt-side chat/global mutations must be returned for persistence');
assert.ok(production.includes('replaceGlobalVariables:') && production.includes('__stsWriteGlobalVariables'), 'normal chat must persist and broadcast global scope');
assert.ok(production.includes('conversationService.retryArena'), 'Arena retry must use the source-owned conversation service');
assert.ok(read('src/features/chat/conversation-service.js').includes('applyPromptVariables(prompt)'), 'Arena retry and chat share prompt variable persistence');
assert.ok(production.includes('if (result?.updatedVariables) state.setSessionData({ variables: result.updatedVariables })'), 'Card Runtime generation must persist prompt chat scope');
assert.ok(production.includes('result?.updatedGlobalVariables'), 'Card Runtime generation must persist prompt global scope');

assert.equal(
  read('src/features/state/smart-state-service.js'),
  read('assets/smart-state-service-v1.3.6.js'),
  'Smart State generated asset must match its source owner',
);
assert.equal(
  read('src/features/state/variable-scope-service.js'),
  read('assets/variable-scope-service-v1.3.6.js'),
  'Variable scope generated asset must match its source owner',
);

for (const [source, generated] of [
  ['src/providers/common/generation-utils.js', 'assets/m4/providers/common/generation-utils.js'],
  ['src/providers/common/generation-gateway.js', 'assets/m4/providers/common/generation-gateway.js'],
  ['src/providers/proxy/generation.js', 'assets/m4/providers/proxy/generation.js'],
  ['src/providers/openrouter/generation.js', 'assets/m4/providers/openrouter/generation.js'],
  ['src/providers/gemini/generation.js', 'assets/m4/providers/gemini/generation.js'],
  ['src/features/chat/turn-policy.js', 'assets/m4/features/chat/turn-policy.js'],
  ['src/features/chat/conversation-service.js', 'assets/m4/features/chat/conversation-service.js'],
  ['src/features/chat/live-stream-store.js', 'assets/m4/features/chat/live-stream-store.js'],
  ['src/features/world-info/embedding-service.js', 'assets/m4/features/world-info/embedding-service.js'],
  ['src/features/world-info/smart-scan-service.js', 'assets/m4/features/world-info/smart-scan-service.js'],
  ['src/features/prompts/prompt-service.js', 'assets/m4/features/prompts/prompt-service.js'],
  ['src/features/chat/response-processor.js', 'assets/m4/features/chat/response-processor.js'],
]) assert.equal(renderOwnedModule(source, generated, read(source)), read(generated), generated + ' must match its source owner');

console.log('M4 architecture boundary checks: OK');
