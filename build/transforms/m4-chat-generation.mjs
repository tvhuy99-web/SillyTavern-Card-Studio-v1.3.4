const M4_IMPORTS = "import { createGenerationGateway as __stsCreateGenerationGateway } from './m4/providers/common/generation-gateway.js?v=1.3.6-m4.1';\nimport { chatTurnPolicy as __stsChatTurnPolicy } from './m4/features/chat/turn-policy.js?v=1.3.6-m4.1';\n";

function findExactlyOnce(source, token, label, from = 0) {
  const first = source.indexOf(token, from);
  if (first < 0) throw new Error('[M4 chat/generation] ' + label + ': token not found');
  const second = source.indexOf(token, first + token.length);
  if (second >= 0) throw new Error('[M4 chat/generation] ' + label + ': token matched more than once');
  return first;
}

function replaceRange(source, startToken, endToken, replacement, label, keepEnd = true) {
  const start = findExactlyOnce(source, startToken, label + '/start');
  const end = source.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error('[M4 chat/generation] ' + label + ': end token not found');
  return source.slice(0, start) + replacement + source.slice(keepEnd ? end : end + endToken.length);
}

export function applyM4ChatGenerationTransform(source) {
  let code = source;

  // Proxy chat generation is now owned by src/providers/proxy/generation.js.
  code = replaceRange(code, ',Vs=async(', ',Ks=async(', '', 'remove legacy proxy chat generator');

  const generationBootstrap =
    'const __stsGenerationGateway=__stsCreateGenerationGateway({' +
    'getConnectionSettings:ns,request:Hs,addNetworkLog:e=>ol.getState().addNetworkLog(e),' +
    'getOpenRouterHeaders:Du,readResponseError:Ou,normalizeProxyUrl:qs,' +
    'getProxyUrl:ws,getProxyPassword:ks,getProxyLegacyMode:Ss,' +
    'geminiGenerateOnce:cl,createGeminiClient:sl,buildGeminiRequest:ll,safetySettings:kd});' +
    'async function Sd(e,t,n,r,a,i){return __stsGenerationGateway.generateOnce({prompt:e,preset:t,model:n,source:r,proxyConfig:a,signal:i})}' +
    'async function*Cd(e,t,n,r,a,i){yield* __stsGenerationGateway.stream({prompt:e,preset:t,signal:n,model:r,source:a,proxyConfig:i})}';

  code = replaceRange(code, 'async function Sd(', '}var Ed=', generationBootstrap, 'generation gateway', false);

  const sendStart = findExactlyOnce(
    code,
    'return{sendMessage:(0,b.useCallback)(async(t,o)=>{',
    'sendMessage boundary',
  );

  const snapshotStartToken = 'let c=new AbortController;e.addAbortController(c);let d=gh(s.messages)+1,h=JSON.parse(JSON.stringify(s.variables))';
  const snapshotStart = code.indexOf(snapshotStartToken, sendStart);
  if (snapshotStart < 0) throw new Error('[M4 chat/generation] sendMessage snapshot start not found');
  const snapshotEndToken = 'e.addMessage(y);let stsSendSucceeded=!0;';
  const snapshotEnd = code.indexOf(snapshotEndToken, snapshotStart);
  if (snapshotEnd < 0) throw new Error('[M4 chat/generation] sendMessage snapshot end not found');
  const snapshotReplacement =
    'let c=new AbortController;e.addAbortController(c);' +
    'let __stsTurn=__stsChatTurnPolicy.beginTurn({state:s,content:l,sequence:gh(s.messages)+1}),' +
    'd=__stsTurn.sequence,h=__stsTurn.variables,p=__stsTurn.rpgState,' +
    'm=__stsTurn.worldInfoRuntime,f=__stsTurn.worldInfoState,y=__stsTurn.userMessage;' +
    'e.addMessage(y);let stsSendSucceeded=!0;';
  code = code.slice(0, snapshotStart) + snapshotReplacement + code.slice(snapshotEnd + snapshotEndToken.length);

  const contextStartToken = 'try{let t,h=s.generatedLorebookEntries||[],m=[...s.messages],f=m.slice(-3).map';
  const contextStart = code.indexOf(contextStartToken, snapshotStart);
  if (contextStart < 0) throw new Error('[M4 chat/generation] sendMessage context start not found');
  const contextEndToken = ';try{t=await i(b,s.worldInfoState';
  const contextEnd = code.indexOf(contextEndToken, contextStart);
  if (contextEnd < 0) throw new Error('[M4 chat/generation] sendMessage context end not found');
  const contextReplacement =
    'try{let t,h=s.generatedLorebookEntries||[],m=[...s.messages],' +
    '__stsContext=__stsChatTurnPolicy.buildContext(m,l,o?.forcedContent),' +
    'f=__stsContext.recentText,b=__stsContext.scanInput,v=__stsContext.promptHistory';
  code = code.slice(0, contextStart) + contextReplacement + code.slice(contextEnd);

  const arenaStartToken = 'w.arena={enabled:!0,modelA:{name:';
  const arenaStart = code.indexOf(arenaStartToken, contextStart);
  if (arenaStart < 0) throw new Error('[M4 chat/generation] inline Arena snapshot not found');
  const arenaEndToken = ',w.content=""';
  const arenaEnd = code.indexOf(arenaEndToken, arenaStart);
  if (arenaEnd < 0) throw new Error('[M4 chat/generation] inline Arena snapshot end not found');
  code = code.slice(0, arenaStart)
    + 'w.arena=__stsChatTurnPolicy.createArenaState(ns(),s)'
    + code.slice(arenaEnd);

  const abortStartToken = 'let stsAbortLike=c.signal.aborted||"AbortError"===t?.name';
  const abortStart = code.indexOf(abortStartToken, arenaStart);
  if (abortStart < 0) throw new Error('[M4 chat/generation] sendMessage abort classifier not found');
  const abortEndToken = ';stsAbortLike||';
  const abortEnd = code.indexOf(abortEndToken, abortStart);
  if (abortEnd < 0) throw new Error('[M4 chat/generation] sendMessage abort classifier end not found');
  code = code.slice(0, abortStart)
    + 'let stsAbortLike=__stsChatTurnPolicy.isAbortLike(t,c.signal)'
    + code.slice(abortEnd);

  if (!code.startsWith(M4_IMPORTS)) code = M4_IMPORTS + code;
  return code;
}

export const M4_CHAT_GENERATION_PATCH_COUNT = 6;
