const SMART_STATE_IMPORT = "import { buildSmartStateBlock as __stsBuildSmartStateBlock } from './smart-state-service-v1.3.6.js?v=1.3.6-smartstate-2';\n";
const CORE_BUILDER_IMPORT = "import { buildCardRuntimeCoreScript as __stsBuildCardRuntimeCoreScript } from './card-runtime-core-builder-v1.3.6.js?v=1.3.6-m3.8';\n";
const RENDERER_IMPORT = "import { buildCardRuntimeRendererScript as __stsBuildCardRuntimeRendererScript, normalizeCardRuntimeMarkup as __stsNormalizeCardRuntimeMarkup } from './card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.7';\n";

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

  const imports = SMART_STATE_IMPORT + CORE_BUILDER_IMPORT + RENDERER_IMPORT;
  if (!code.startsWith(imports)) code = imports + code;
  return code;
}
