const INITIAL_VARIABLE_IMPORT = "import { inspectInitialVariablePipeline as __stsInspectInitialVariablePipeline, seedInitialVariablesFromCard as __stsSeedInitialVariablesFromCard, selectInitialVariableOpening as __stsSelectInitialVariableOpening } from './initial-variable-service-v1.3.6.js?v=1.3.6-initvar-3';\n";
const SMART_STATE_IMPORT = "import { buildSmartStateBlock as __stsBuildSmartStateBlock } from './smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2';\n";
const CORE_BUILDER_IMPORT = "import { buildCardRuntimeCoreScript as __stsBuildCardRuntimeCoreScript } from './card-runtime-core-builder-v1.3.6.js?v=1.3.6-m3.9';\n";
const RENDERER_IMPORT = "import { buildCardRuntimeRendererScript as __stsBuildCardRuntimeRendererScript, normalizeCardRuntimeMarkup as __stsNormalizeCardRuntimeMarkup } from './card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.9';\n";

function findExactlyOnce(source, token, label) {
  const first = source.indexOf(token);
  if (first < 0) throw new Error(`[card runtime] ${label}: token not found`);
  const second = source.indexOf(token, first + token.length);
  if (second >= 0) throw new Error(`[card runtime] ${label}: token matched more than once`);
  return first;
}

export function applyCardRuntimeTransform(source) {
  let code = source;

  // The compatibility layer used to patch iframe/script/link prototypes globally.
  // Own this mapping inside the runtime instead.
  code = code.replace(
    'https://unpkg.com/vue-router@5.2.0/dist/vue-router.global.js',
    'https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js',
  );

  // Remove the embedded compatibility API source. It is now composed into the
  // Card Runtime source builder by build/build-card-runtime.mjs.
  const compatStart = findExactlyOnce(code, ',gp=Object.freeze("', 'embedded compatibility API start');
  const dependencyMapStart = findExactlyOnce(code, ',bp=Object.freeze(', 'dependency map start');
  if (dependencyMapStart <= compatStart) throw new Error('[card runtime] invalid compatibility API boundaries');
  code = code.slice(0, compatStart) + code.slice(dependencyMapStart);

  // Build the runtime source in the parent and inject it inline into srcDoc.
  // Safe-mode iframes remain opaque-origin and need no CORS or allow-same-origin.
  const coreStartToken = ',$=(e=>{let t=xp(e);return String.raw\`';
  const coreStart = findExactlyOnce(code, coreStartToken, 'inline core generator');
  const coreArgs = code.indexOf('({context:', coreStart);
  if (coreArgs < 0) throw new Error('[card runtime] core BOOT payload boundary not found');
  code = code.slice(0, coreStart) + ',$=__stsBuildCardRuntimeCoreScript' + code.slice(coreArgs);

  // Renderer/executor source is a normal module owned by src/runtime.
  const rendererStartToken = 'q=((e,t,n={})=>{let r=xp(e),a=xp(t),i=xp({executeScripts:!1!==n.executeScripts,runtimeMode:n.runtimeMode||"active"});return String.raw\`';
  const rendererStart = findExactlyOnce(code, rendererStartToken, 'inline renderer generator');
  const rendererArgs = code.indexOf('(U,H,{executeScripts:', rendererStart);
  if (rendererArgs < 0) throw new Error('[card runtime] renderer call boundary not found');
  code = code.slice(0, rendererStart) + 'q=__stsBuildCardRuntimeRendererScript' + code.slice(rendererArgs);

  const legacyVariableScopes = 'Ap=(e,t,n,r)=>{let a=Math.max(0,Math.min(t.length-1,n.messageId||0)),i={chat:e,global:Tp({type:"global"},n),preset:Tp({type:"preset"},n),character:Tp({type:"character"},n),[\`message:\${a}\`]:t[a]?.contextState||Tp({type:"message",message_id:a},n),"script:default":Tp({type:"script",script_id:"default"},n),"extension:third-party/JS-Slash-Runner":Tp({type:"extension",extension_id:"third-party/JS-Slash-Runner"},n)};return t.forEach((e,t)=>{e.contextState?i[\`message:\${t}\`]=e.contextState:\`message:\${t}\`in i||(i[\`message:\${t}\`]={})}),r.forEach(e=>{let t=e.value?.id||"default";i[\`script:\${t}\`]=Tp({type:"script",script_id:t},{...n,scriptId:t})}),i}';
  const recoveredVariableScopes = 'Ap=(e,t,n,r,a,h)=>{let u=__stsSelectInitialVariableOpening(a,t,h).text,i=e&&Object.keys(e).length?e:__stsSeedInitialVariablesFromCard({},a,u,e=>jt.default.parse(e)).variables,o=Math.max(0,Math.min(t.length-1,n.messageId||0)),l=t[o]?.contextState||Tp({type:"message",message_id:o},n),c=l&&Object.keys(l).length?l:e&&Object.keys(e).length?l:i,s={chat:i,global:Tp({type:"global"},n),preset:Tp({type:"preset"},n),character:Tp({type:"character"},n),[\`message:\${o}\`]:c,"script:default":Tp({type:"script",script_id:"default"},n),"extension:third-party/JS-Slash-Runner":Tp({type:"extension",extension_id:"third-party/JS-Slash-Runner"},n)};return t.forEach((e,t)=>{let n=e.contextState;n&&Object.keys(n).length?s[\`message:\${t}\`]=n:\`message:\${t}\`in s||(s[\`message:\${t}\`]={})}),r.forEach(e=>{let t=e.value?.id||"default";s[\`script:\${t}\`]=Tp({type:"script",script_id:t},{...n,scriptId:t})}),s}';
  const variableScopesAt = findExactlyOnce(code, legacyVariableScopes, 'legacy variable scope snapshot');
  code = code.slice(0, variableScopesAt)
    + recoveredVariableScopes
    + code.slice(variableScopesAt + legacyVariableScopes.length);

  const variableScopeCall = 'variableScopes:Ap(r||{},v,M,t)';
  const variableScopeCallAt = findExactlyOnce(code, variableScopeCall, 'Card Runtime variable scope card context');
  code = code.slice(0, variableScopeCallAt)
    + 'variableScopes:Ap(r||{},v,M,t,m,n)'
    + code.slice(variableScopeCallAt + variableScopeCall.length);

  const snapshotToken = 'L=(0,b.useMemo)(()=>({chatHistory:Eh(v,s,o,!0),variableScopes:Ap(r||{},v,M,t,m,n),extensionSettings:a||{},worldInfo:g||m?.char_book?.entries||[]}),[v,s,o,r,M,t,a,g,m])';
  const snapshotAt = findExactlyOnce(code, snapshotToken, 'Card Runtime variable provenance snapshot');
  const snapshotReplacement = 'L=(0,b.useMemo)(()=>{let __stsScopes=Ap(r||{},v,M,t,m,n),__stsVariableDiagnostics=__stsInspectInitialVariablePipeline({baseVariables:r||{},card:m,messages:v,messageId:j,variableScopes:__stsScopes,worldInfo:g||m?.char_book?.entries||[],originalContent:n,parseStructured:e=>jt.default.parse(e)});return{chatHistory:Eh(v,s,o,!0),variableScopes:__stsScopes,variableDiagnostics:__stsVariableDiagnostics,extensionSettings:a||{},worldInfo:g||m?.char_book?.entries||[]}},[v,s,o,r,M,t,a,g,m,j,n])';
  code = code.slice(0, snapshotAt) + snapshotReplacement + code.slice(snapshotAt + snapshotToken.length);

  const bootVariableToken = 'variableScopes:a.snapshot.variableScopes,extensionSettings:a.snapshot.extensionSettings';
  const bootVariableAt = findExactlyOnce(code, bootVariableToken, 'Card Runtime BOOT variable diagnostics');
  code = code.slice(0, bootVariableAt)
    + 'variableScopes:a.snapshot.variableScopes,variableDiagnostics:a.snapshot.variableDiagnostics,extensionSettings:a.snapshot.extensionSettings'
    + code.slice(bootVariableAt + bootVariableToken.length);

  // Preserve the old dependency-compat behavior at the iframe boundary,
  // without patching Element/HTMLIFrameElement prototypes globally.
  // Smart State is owned by the shared service. The runtime receives a canonical
  // LogicStore + VisualInterface block, never MythicDatabase.
  const smartStateStart = findExactlyOnce(code, 'Np=(e,t,n,r)=>{', 'legacy smart-state builder start');
  const smartStateEnd = code.indexOf(',Tp=', smartStateStart);
  if (smartStateEnd < 0) throw new Error('[card runtime] legacy smart-state builder end token not found');
  code = code.slice(0, smartStateStart)
    + 'Np=(e,t,n,r)=>__stsBuildSmartStateBlock({variables:e,card:t,messages:n.slice(0,Math.max(0,r))}).smartStateBlock'
    + code.slice(smartStateEnd);

  const srcDocToken = 'srcDoc:U,style:';
  const srcDocAt = findExactlyOnce(code, srcDocToken, 'Card Runtime iframe srcDoc');
  code = code.slice(0, srcDocAt)
    + 'srcDoc:__stsNormalizeCardRuntimeMarkup(U),style:'
    + code.slice(srcDocAt + srcDocToken.length);

  const imports = INITIAL_VARIABLE_IMPORT + SMART_STATE_IMPORT + CORE_BUILDER_IMPORT + RENDERER_IMPORT;
  if (!code.startsWith(imports)) code = imports + code;
  return code;
}
