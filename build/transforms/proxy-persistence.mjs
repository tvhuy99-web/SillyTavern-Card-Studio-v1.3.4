const PROXY_PERSISTENCE_IMPORT = "import { proxyPersistence as __stsProxyPersistence } from './proxy-persistence-service-v1.3.6.js?v=1.3.6-m2-final';\n";

const REPLACEMENTS = [
  {
    "label": "profile access",
    "oldText": "cs=()=>{try{let e=sessionStorage.getItem(Mo);if(e){let t=JSON.parse(e);return Array.isArray(t)?t.slice(0,100).filter(e=>e&&\"object\"==typeof e).map(e=>({id:String(e.id||\"\"),name:String(e.name||\"Proxy\"),url:String(e.url||\"\"),password:String(e.password||\"\"),legacyMode:!!e.legacyMode,proxyForTools:!!e.proxyForTools,protocol:\"google_native\"===e.protocol?\"google_native\":\"openai\",chatModel:String(e.chatModel||\"\"),toolModel:String(e.toolModel||\"\")})).filter(e=>e.id&&e.url):[]}}catch(e){console.error(\"Failed to load proxy profiles\",e)}return[]},us=e=>{sessionStorage.setItem(Mo,JSON.stringify(e))}",
    "newText": "cs=()=>__stsProxyPersistence.getProfiles(),us=e=>{__stsProxyPersistence.setProfiles(e)}"
  },
  {
    "label": "password read",
    "oldText": "xs=()=>sessionStorage.getItem(Oo)||\"\"",
    "newText": "xs=()=>__stsProxyPersistence.getPassword()"
  },
  {
    "label": "password write",
    "oldText": "(e=>{sessionStorage.setItem(Oo,e.trim());localStorage.removeItem(Oo)})(x)",
    "newText": "__stsProxyPersistence.setPassword(x.trim())"
  },
  {
    "label": "backup proxy secrets",
    "oldText": "let r=localStorage.getItem(n);",
    "newText": "let r=n===Mo?__stsProxyPersistence.exportProfilesForBackup():n===Oo?__stsProxyPersistence.exportPasswordForBackup():localStorage.getItem(n);"
  },
  {
    "label": "restore proxy secrets",
    "oldText": "localStorage.setItem(e,r),n+=r.length,t++",
    "newText": "(e===Mo?__stsProxyPersistence.importProfilesFromBackup(r):e===Oo?__stsProxyPersistence.importPasswordFromBackup(r):localStorage.setItem(e,r)),n+=r.length,t++"
  },
  {
    "label": "remember state",
    "oldText": "[F,B]=(0,b.useState)(\"\"),U=(0,b.useRef)(null)",
    "newText": "[F,B]=(0,b.useState)(\"\"),[__stsRememberProxySecrets,__stsSetRememberProxySecrets]=(0,b.useState)(()=>__stsProxyPersistence.getRememberSecrets()),U=(0,b.useRef)(null)"
  },
  {
    "label": "password editor ownership",
    "oldText": "(0,wt.jsx)(dn,{label:\"Password / Key\",value:x,onChange:e=>_(e.target.value),type:\"password\"}),",
    "newText": "(0,wt.jsx)(dn,{label:\"Password / Key\",value:x,onChange:e=>{_(e.target.value),__stsProxyPersistence.setPassword(e.target.value)},type:\"password\"}),(0,wt.jsx)(yl,{label:\"Ghi nhớ Password / Key trên thiết bị này\",checked:__stsRememberProxySecrets,onChange:e=>{__stsSetRememberProxySecrets(e),__stsProxyPersistence.setRememberSecrets(e),__stsProxyPersistence.setPassword(x)}}),"
  }
];

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error('[proxy persistence] ' + label + ': pattern not found');
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error('[proxy persistence] ' + label + ': pattern matched more than once');
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

export function applyProxyPersistenceTransform(source) {
  let code = source;
  for (const replacement of REPLACEMENTS) {
    code = replaceExactlyOnce(code, replacement.oldText, replacement.newText, replacement.label);
  }
  if (!code.startsWith(PROXY_PERSISTENCE_IMPORT)) code = PROXY_PERSISTENCE_IMPORT + code;
  return code;
}

export const PROXY_PERSISTENCE_PATCH_COUNT = REPLACEMENTS.length;
