import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const production = read('assets/app-production-v1.3.6.js');
const entry = read('assets/app-entry-v1.3.6.js');

assert.ok(entry.includes("stage: 'M7-complete'"));
assert.ok(entry.includes("chatDomain: 'owned-conversation-service'"));
assert.ok(entry.includes("generationDomain: 'owned-provider-gateway'"));
assert.ok(entry.includes("worldInfoDomain: 'owned-smart-scan-service'"));
assert.ok(entry.includes("promptDomain: 'owned-prompt-service'"));
assert.ok(entry.includes("responseDomain: 'owned-response-processor'"));

for (const token of [
  './variable-scope-service-v1.3.6.js?v=1.3.6-variable-scopes-1',
  './smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2',
  './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1',
  './m4/features/chat/turn-policy.js?v=1.3.6-m4.5',
  './m4/features/chat/conversation-service.js?v=1.3.6-m4.8',
  './m4/features/world-info/smart-scan-service.js?v=1.3.6-m4.8',
  './m4/features/prompts/prompt-service.js?v=1.3.6-m4.3',
  './m4/features/chat/response-processor.js?v=1.3.6-m4.3',
  '__stsGenerationGateway.generateOnce',
  '__stsGenerationGateway.stream',
  '__stsCreateConversationService',
  '__stsConversationService.send',
  '__stsScanWorldInfo',
  '__stsBuildConversationPrompt',
  '__stsProcessAIResponse',
]) assert.ok(production.includes(token), 'missing M4 ownership token: ' + token);

const generationStart = production.indexOf('const __stsGenerationGateway=');
const generationEnd = production.indexOf('var Ed=', generationStart);
assert.ok(generationStart >= 0 && generationEnd > generationStart);
const gatewayAdapter = production.slice(generationStart, generationEnd);
assert.ok(!gatewayAdapter.includes('openrouter.ai/api/v1/chat/completions'));
assert.ok(!gatewayAdapter.includes('.body.getReader()'));
assert.ok(!gatewayAdapter.includes('new TextDecoder'));
assert.ok(!gatewayAdapter.includes('Proxy Stream Error'));

const sendStart = production.indexOf('return{sendMessage:(0,b.useCallback)((t,o)=>__stsConversationService.send(t,o)');
const sendEnd = production.indexOf('stopGeneration:p', sendStart);
assert.ok(sendStart >= 0 && sendEnd > sendStart);
const sendBlock = production.slice(sendStart, sendEnd);
for (const forbidden of [
  'scanWorldInfo', 'xd(', 'Cd(', 'Sd(', '__stsArenaState',
  'logSmartScan', 'logSelection', 'new AbortController',
]) assert.ok(!sendBlock.includes(forbidden), 'React send adapter regained business logic: ' + forbidden);

const smartScanStart = production.indexOf('scanInput:(0,b.useCallback)(');
const smartScanEnd = production.indexOf(',processOutput:', smartScanStart);
assert.ok(smartScanStart >= 0 && smartScanEnd > smartScanStart);
const smartScanAdapter = production.slice(smartScanStart, smartScanEnd);
assert.ok(smartScanAdapter.includes('__stsScanWorldInfo'));
assert.ok(smartScanAdapter.includes('t?.state?.worldInfoState'));
assert.ok(smartScanAdapter.includes('lorebooks:r'));
assert.ok(!smartScanAdapter.includes('((t,r,a,i,o,s=[]'));
assert.ok(!smartScanAdapter.includes('semantic_threshold||.7'));
assert.ok(!smartScanAdapter.includes('[Smart Scan] Skipped API call'));

const responseStart = production.indexOf('g=(0,b.useCallback)((n,r,i=!1)=>__stsProcessAIResponse');
const responseEnd = production.indexOf(',f=(0,b.useCallback)(async(t,n)=>{', responseStart);
assert.ok(responseStart >= 0 && responseEnd > responseStart);
const responseAdapter = production.slice(responseStart, responseEnd);
assert.ok(!responseAdapter.includes('[Integrated RPG] Detected'));
assert.ok(!responseAdapter.includes('worldInfoRuntime:d'));

assert.ok(!production.includes('stsSessionBook'));
assert.ok(!production.includes('[Smart Scan] Skipped API call'));
assert.ok(!production.includes('[Integrated RPG] Detected'));
assert.ok(!production.includes(',Vs=async('), 'legacy Proxy chat generator must be removed from production');
assert.ok(!production.includes('.replace(/{{worldInfo}}/g,"")'), 'plain-text mode must not erase {{worldInfo}}');
assert.ok(!production.includes('.replace(/{{worldInfo_before}}/g,"")'), 'plain-text mode must not erase {{worldInfo_before}}');
assert.ok(!production.includes('.replace(/{{worldInfo_after}}/g,"")'), 'plain-text mode must not erase {{worldInfo_after}}');
assert.ok(!production.includes('g||(i=Xu(i),'), 'plain-text mode must not disable prompt variable expansion');
assert.ok(!production.includes('i=g?i.replace(/{{current_page_history}}/g,Q)'), 'plain text mode must not erase prompt context macros');
assert.ok(!production.includes('g||(i=Xu(i),'), 'plain text mode must still expand prompt variables');
assert.ok(production.includes('i=i.replace(/{{worldInfo_before}}/g,P).replace(/{{worldInfo_after}}/g,M).replace(/{{worldInfo}}/g,L)'), 'World Info macros must resolve in all display modes');
assert.ok(production.includes('__stsChatTurnPolicy.compactModelMessages(e,{keepLatest:!0})'));
assert.ok(production.includes('chat_history:n.messages.map(e=>`[${e.role}] ${__stsChatTurnPolicy.modelContextContent(e)}`).join("\\n")'));
assert.ok(!production.includes('chat_history:n.messages.map(e=>`[${e.role}] ${e.content}`).join("\\n")'));

const smartStateStart = production.indexOf('F=__stsNormalizePromptVariableScopes(o,__stsReadGlobalVariables()),o=F.chat,G=F.global');
const smartStateEnd = production.indexOf('let z=', smartStateStart);
assert.ok(smartStateStart >= 0 && smartStateEnd > smartStateStart);
const smartStateAdapter = production.slice(smartStateStart, smartStateEnd);
assert.ok(smartStateAdapter.includes('B=F.mythicDatabase'));
assert.ok(smartStateAdapter.includes('U=F.visualState'));
assert.ok(smartStateAdapter.includes('let $=F.smartStateBlock;F=F.logicStore'));
assert.ok(!smartStateAdapter.includes('G.push(`<MythicDatabase>'));
assert.ok(production.includes('.replace(/{{last_state}}/g,U)'));
assert.ok(production.includes('Np=(e,t,n,r)=>__stsBuildSmartStateBlock({variables:e,card:t,messages:n.slice(0,Math.max(0,r))}).smartStateBlock'));
assert.ok(smartStateAdapter.includes('F=__stsBuildSmartStateBlock({variables:o,messages:t,card:r,legacyVisualState:s})'));
assert.ok(production.includes('G=Gu(G,"set",r,s)'), 'setglobalvar must mutate canonical global scope');
assert.ok(production.includes('r=Uu(G,n)'), 'getglobalvar must read canonical global scope');
assert.ok(!production.includes('o=Gu(o,"set","globals."+r,s)'), 'legacy chat.globals mutation must be removed');
assert.ok(production.includes('rpgSnapshot:y,updatedVariables:o,updatedGlobalVariables:G}'), 'prompt-side chat/global mutations must be returned for persistence');
assert.ok(production.includes('replaceGlobalVariables:e=>{let t=__stsWriteGlobalVariables(e)'), 'normal chat must persist and broadcast global scope');
assert.ok(production.includes('b?.updatedVariables&&n.setSessionData({variables:b.updatedVariables})'), 'Arena retry must persist prompt chat scope');
assert.ok(production.includes('b?.updatedGlobalVariables'), 'Arena retry must persist prompt global scope');
assert.ok(production.includes('m?.updatedVariables&&n.setSessionData({variables:m.updatedVariables})'), 'Card Runtime generation must persist prompt chat scope');
assert.ok(production.includes('m?.updatedGlobalVariables'), 'Card Runtime generation must persist prompt global scope');

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
  ['src/features/world-info/smart-scan-service.js', 'assets/m4/features/world-info/smart-scan-service.js'],
  ['src/features/prompts/prompt-service.js', 'assets/m4/features/prompts/prompt-service.js'],
  ['src/features/chat/response-processor.js', 'assets/m4/features/chat/response-processor.js'],
]) assert.equal(read(source), read(generated), generated + ' must match its source owner');

console.log('M4 architecture boundary checks: OK');
