// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createFeatureSettings(dependencies = {}) {
  const storage = dependencies.storage ?? globalThis.localStorage;
  var getSmartScanSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.smartScanSettingsKey);
      if (serialized) {
        let savedSettings = JSON.parse(serialized);
        let migratedSettings = (0, dependencies.__stsMigrateSmartScanStickySettings)(savedSettings);
        if (migratedSettings !== savedSettings) {
          try {
            storage.setItem(dependencies.smartScanSettingsKey, JSON.stringify(migratedSettings));
          } catch (error) {
            if (!["RESTORE_IN_PROGRESS","PENDING_RECOVERY_EXISTS"].includes(error.code)) throw error;
          }
        }
        return {...dependencies.smartScanDefaults, ...migratedSettings};
      }
    } catch (error) { console.error("Failed to load smart scan global settings",error); }
    return dependencies.smartScanDefaults;
  };
  var saveSmartScanSettings = settings => {
    storage.setItem(dependencies.smartScanSettingsKey, JSON.stringify((0, dependencies.__stsMarkSmartScanStickySettingsSaved)(settings)));
  };
  var getSmartContextSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.smartContextSettingsKey);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.smartContextDefaults, ...settings};
      }
    } catch (error) { console.error("Failed to load global context settings",error); }
    return dependencies.smartContextDefaults;
  };
  var getActionSuggestionSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.actionSuggestionSettingsKey);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.actionSuggestionDefaults, ...settings};
      }
    } catch (error) { console.error("Failed to load global action suggestion settings",error); }
    return dependencies.actionSuggestionDefaults;
  };
  var getWritingRefinementSettings = () => {
    try {
      let serialized = storage.getItem(dependencies.writingRefinementSettingsKey);
      if (serialized) {
        let settings = JSON.parse(serialized);
        return {...dependencies.writingRefinementDefaults, ...settings};
      }
    } catch (error) { console.error("Failed to load global writing refinement settings",error); }
    return dependencies.writingRefinementDefaults;
  };
  return { getSmartScanSettings, saveSmartScanSettings, getSmartContextSettings, getActionSuggestionSettings, getWritingRefinementSettings };
}
