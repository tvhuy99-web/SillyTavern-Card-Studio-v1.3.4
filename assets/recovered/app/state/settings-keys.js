// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSettingsKeys(dependencies = {}) {
var cardRuntimeCompatibilityKey="st-card-studio:card-runtime:compatibility-mode";
var cardRuntimeCompatibilityEvent="sillytavern:card-runtime-mode-changed";
var cardRuntimeEngineKey="st-card-studio:card-runtime:engine-mode";
var cardRuntimeEngineEvent="sillytavern:card-runtime-engine-changed";
var readCardRuntimeCompatibilityMode=()=>typeof window>"u"?"full":"safe"===window.localStorage.getItem("st-card-studio:card-runtime:compatibility-mode")?"safe":"full";
var readCardRuntimeEngineMode=()=>typeof window>"u"?"official-local":"current"===window.localStorage.getItem("st-card-studio:card-runtime:engine-mode")?"current":"official-local";
var arenaSettingsKey="arena_settings";
var activePersonaIdKey="sillyTavernStudio_activePersonaId";
var cardRuntimeStoragePrefix="st-card-studio:card-runtime:v2:";
var geminiSettingsKey="sillyTavernStudio_apiSettings";
var geminiRotationKey="sillyTavernStudio_apiKeyIndex";
var openRouterApiKeyStorageKey="sillyTavernStudio_openRouterApiKey";
var proxyUrlKey="sillyTavernStudio_proxyUrl";
var proxyPasswordKey="sillyTavernStudio_proxyPassword";
var proxyLegacyModeKey="sillyTavernStudio_proxyLegacyMode";
var proxyForToolsKey="sillyTavernStudio_proxyForTools";
var proxyProfilesKey="sillyTavernStudio_proxyProfiles";
var geminiModelCatalogKey="sillyTavernStudio_geminiModels";
var openRouterModelCatalogKey="sillyTavernStudio_openrouterModels";
var globalConnectionKey="sillyTavernStudio_globalConnection";
var smartScanSettingsKey="sillyTavernStudio_smartScanGlobal";
var smartContextSettingsKey="sillyTavernStudio_globalContext";
var actionSuggestionSettingsKey="sillyTavernStudio_globalActionSuggestion";
var writingRefinementSettingsKey="sillyTavernStudio_globalWritingRefinement";
var speechSettingsKey="sillyTavernStudio_ttsGlobal";
var defaultGeminiModels=[{id:"gemini-3.1-pro-preview",name:"Gemini 3.1 Pro Preview"},{id:"gemini-3-flash-preview",name:"Gemini 3.0 Flash Preview"},{id:"gemini-3.1-flash-lite-preview",name:"Gemini 3.1 Flash Lite Preview"}];
var defaultProxyModels=[...defaultGeminiModels,{id:"claude-opus-4.5",name:"Claude Opus 4.5"},{id:"claude-3-5-sonnet-latest",name:"Claude 3.5 Sonnet"},{id:"gpt-4o",name:"GPT-4o"}];
return { cardRuntimeCompatibilityKey, cardRuntimeCompatibilityEvent, cardRuntimeEngineKey, cardRuntimeEngineEvent, readCardRuntimeCompatibilityMode, readCardRuntimeEngineMode, arenaSettingsKey, activePersonaIdKey, cardRuntimeStoragePrefix, geminiSettingsKey, geminiRotationKey, openRouterApiKeyStorageKey, proxyUrlKey, proxyPasswordKey, proxyLegacyModeKey, proxyForToolsKey, proxyProfilesKey, geminiModelCatalogKey, openRouterModelCatalogKey, globalConnectionKey, smartScanSettingsKey, smartContextSettingsKey, actionSuggestionSettingsKey, writingRefinementSettingsKey, speechSettingsKey, defaultGeminiModels, defaultProxyModels };
}
