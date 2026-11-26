// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createFeatureSettings(dependencies = {}) {
  const storage = dependencies.storage ?? globalThis.localStorage;
  var getSmartScanSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.Ho);
      if (serialized) {
        let savedSettings = JSON.parse(serialized);
        let migratedSettings = (0, dependencies.__stsMigrateSmartScanStickySettings)(savedSettings);
        if (migratedSettings !== savedSettings) {
          try {
            storage.setItem(dependencies.Ho, JSON.stringify(migratedSettings));
          } catch (error) {
            if (!["RESTORE_IN_PROGRESS","PENDING_RECOVERY_EXISTS"].includes(error.code)) throw error;
          }
        }
        return {...dependencies.Jo, ...migratedSettings};
      }
    } catch (error) { console.error("Failed to load smart scan global settings",error); }
    return dependencies.Jo;
  };
  var saveSmartScanSettings = settings => {
    storage.setItem(dependencies.Ho, JSON.stringify((0, dependencies.__stsMarkSmartScanStickySettingsSaved)(settings)));
  };
  var getSmartContextSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.$o);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.Yo, ...settings};
      }
    } catch (error) { console.error("Failed to load global context settings",error); }
    return dependencies.Yo;
  };
  var getActionSuggestionSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.Go);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.Zo, ...settings};
      }
    } catch (error) { console.error("Failed to load global action suggestion settings",error); }
    return dependencies.Zo;
  };
  var getWritingRefinementSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.zo);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.es, ...settings};
      }
    } catch (error) { console.error("Failed to load global writing refinement settings",error); }
    return dependencies.es;
  };
  return { getSmartScanSettings, saveSmartScanSettings, getSmartContextSettings, getActionSuggestionSettings, getWritingRefinementSettings };
}
