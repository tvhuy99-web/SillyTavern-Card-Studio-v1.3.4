// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSettingsKeys(dependencies = {}) {
var xo="st-card-studio:card-runtime:compatibility-mode";
var _o="sillytavern:card-runtime-mode-changed";
var wo="st-card-studio:card-runtime:engine-mode";
var ko="sillytavern:card-runtime-engine-changed";
var So=()=>typeof window>"u"?"full":"safe"===window.localStorage.getItem("st-card-studio:card-runtime:compatibility-mode")?"safe":"full";
var Co=()=>typeof window>"u"?"official-local":"current"===window.localStorage.getItem("st-card-studio:card-runtime:engine-mode")?"current":"official-local";
var Eo="arena_settings";
var No="sillyTavernStudio_activePersonaId";
var To="st-card-studio:card-runtime:v2:";
var Ao="sillyTavernStudio_apiSettings";
var Io="sillyTavernStudio_apiKeyIndex";
var jo="sillyTavernStudio_openRouterApiKey";
var Do="sillyTavernStudio_proxyUrl";
var Oo="sillyTavernStudio_proxyPassword";
var Ro="sillyTavernStudio_proxyLegacyMode";
var Po="sillyTavernStudio_proxyForTools";
var Mo="sillyTavernStudio_proxyProfiles";
var Fo="sillyTavernStudio_geminiModels";
var Bo="sillyTavernStudio_openrouterModels";
var Uo="sillyTavernStudio_globalConnection";
var Ho="sillyTavernStudio_smartScanGlobal";
var $o="sillyTavernStudio_globalContext";
var Go="sillyTavernStudio_globalActionSuggestion";
var zo="sillyTavernStudio_globalWritingRefinement";
var qo="sillyTavernStudio_ttsGlobal";
var Vo=[{id:"gemini-3.1-pro-preview",name:"Gemini 3.1 Pro Preview"},{id:"gemini-3-flash-preview",name:"Gemini 3.0 Flash Preview"},{id:"gemini-3.1-flash-lite-preview",name:"Gemini 3.1 Flash Lite Preview"}];
var Ko=[...Vo,{id:"claude-opus-4.5",name:"Claude Opus 4.5"},{id:"claude-3-5-sonnet-latest",name:"Claude 3.5 Sonnet"},{id:"gpt-4o",name:"GPT-4o"}];
return { xo, _o, wo, ko, So, Co, Eo, No, To, Ao, Io, jo, Do, Oo, Ro, Po, Mo, Fo, Bo, Uo, Ho, $o, Go, zo, qo, Vo, Ko };
}
