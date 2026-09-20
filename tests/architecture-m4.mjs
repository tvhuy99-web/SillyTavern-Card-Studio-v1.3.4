import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const production = read('assets/app-production-v1.3.6.js');
const entry = read('assets/app-entry-v1.3.6.js');

assert.ok(entry.includes("stage: 'M5-complete'"));
assert.ok(entry.includes("chatDomain: 'owned-conversation-service'"));
assert.ok(entry.includes("generationDomain: 'owned-provider-gateway'"));
assert.ok(entry.includes("worldInfoDomain: 'owned-smart-scan-service'"));
assert.ok(entry.includes("promptDomain: 'owned-prompt-service'"));
assert.ok(entry.includes("responseDomain: 'owned-response-processor'"));

for (const token of [
  './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1',
  './m4/features/chat/turn-policy.js?v=1.3.6-m4.1',
  './m4/features/chat/conversation-service.js?v=1.3.6-m4.2',
  './m4/features/world-info/smart-scan-service.js?v=1.3.6-m4.3',
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
