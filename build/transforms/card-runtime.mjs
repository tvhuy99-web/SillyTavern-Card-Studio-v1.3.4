const RENDERER_IMPORT = "import { buildCardRuntimeRendererScript as __stsBuildCardRuntimeRendererScript } from './card-runtime-renderer-v1.3.6.js?v=1.3.6-m3.2';\n";

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
  // external iframe runtime by build/build-card-runtime.mjs.
  const compatStart = findExactlyOnce(code, ',gp=Object.freeze("', 'embedded compatibility API start');
  const dependencyMapStart = findExactlyOnce(code, ',bp=Object.freeze(', 'dependency map start');
  if (dependencyMapStart <= compatStart) throw new Error('[card runtime] invalid compatibility API boundaries');
  code = code.slice(0, compatStart) + code.slice(dependencyMapStart);

  // Replace the 130 KB inline runtime generator with a tiny iframe bootstrap.
  const coreStartToken = ',$=(e=>{let t=xp(e);return String.raw\`';
  const coreStart = findExactlyOnce(code, coreStartToken, 'inline core generator');
  const coreArgs = code.indexOf('({context:', coreStart);
  if (coreArgs < 0) throw new Error('[card runtime] core BOOT payload boundary not found');

  const coreBootstrap = ',$=(e=>{let t=xp(e),n=xp(new URL("./card-runtime-core-v1.3.6.js?v=1.3.6-m3.2",import.meta.url).href);return String.raw\`\\nwindow.__CARD_STUDIO_BOOT__ = ${t};\\nwindow.cardStudioReady = new Promise(function (resolve, reject) { var script = document.createElement("script"); script.src = ${n}; script.async = true; script.onload = function () { try { Promise.resolve(window.__STS_START_CARD_RUNTIME__(window.__CARD_STUDIO_BOOT__)).then(resolve, reject); } catch (error) { reject(error); } }; script.onerror = function () { reject(new Error("Card Runtime core failed to load.")); }; document.head.appendChild(script); });\\n\`})';
  code = code.slice(0, coreStart) + coreBootstrap + code.slice(coreArgs);

  // Renderer/executor source is a normal module owned by src/runtime.
  const rendererStartToken = 'q=((e,t,n={})=>{let r=xp(e),a=xp(t),i=xp({executeScripts:!1!==n.executeScripts,runtimeMode:n.runtimeMode||"active"});return String.raw\`';
  const rendererStart = findExactlyOnce(code, rendererStartToken, 'inline renderer generator');
  const rendererArgs = code.indexOf('(U,H,{executeScripts:', rendererStart);
  if (rendererArgs < 0) throw new Error('[card runtime] renderer call boundary not found');
  code = code.slice(0, rendererStart) + 'q=__stsBuildCardRuntimeRendererScript' + code.slice(rendererArgs);

  if (!code.startsWith(RENDERER_IMPORT)) code = RENDERER_IMPORT + code;
  return code;
}
