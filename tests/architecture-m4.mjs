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
  './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1',
  './m4/features/chat/turn-policy.js?v=1.3.6-m4.5',
  './m4/features/chat/conversation-service.js?v=1.3.6-m4.6',
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
