// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createFeatureSettings(dependencies = {}) {
const storage = dependencies.storage ?? globalThis.localStorage;
var as=()=>{try{let e=storage.getItem(dependencies.Ho);if(e){let t=JSON.parse(e),r=(0, dependencies.__stsMigrateSmartScanStickySettings)(t);if(r!==t) { try { storage.setItem(dependencies.Ho,JSON.stringify(r)); } catch(error) { if(!["RESTORE_IN_PROGRESS","PENDING_RECOVERY_EXISTS"].includes(error.code)) throw error; } }return{...dependencies.Jo,...r}}}catch(e){console.error("Failed to load smart scan global settings",e)}return dependencies.Jo};
var is=e=>{storage.setItem(dependencies.Ho,JSON.stringify((0, dependencies.__stsMarkSmartScanStickySettingsSaved)(e)))};
var os=()=>{try{let e=storage.getItem(dependencies.$o);if(e){let t=JSON.parse(e);return{...dependencies.Yo,...t}}}catch(e){console.error("Failed to load global context settings",e)}return dependencies.Yo};
var ss=()=>{try{let e=storage.getItem(dependencies.Go);if(e){let t=JSON.parse(e);return{...dependencies.Zo,...t}}}catch(e){console.error("Failed to load global action suggestion settings",e)}return dependencies.Zo};
var ls=()=>{try{let e=storage.getItem(dependencies.zo);if(e){let t=JSON.parse(e);return{...dependencies.es,...t}}}catch(e){console.error("Failed to load global writing refinement settings",e)}return dependencies.es};
return { getSmartScanSettings: as, saveSmartScanSettings: is, getSmartContextSettings: os, getActionSuggestionSettings: ss, getWritingRefinementSettings: ls };
}
