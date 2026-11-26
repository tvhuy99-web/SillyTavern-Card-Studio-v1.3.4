import { createEmbeddingProviderStatus as __stsCreateEmbeddingProviderStatus } from "../../../features/world-info/ui/embedding-provider-status.js";
import { createSpeechProvider as __stsCreateSpeechProvider } from "../../../ui/shell/providers.js";
import { createSettingsScreen as __stsCreateSettingsScreen } from "../../../ui/settings/settings-screen.js";
import { createActionSuggestionSettings as __stsCreateActionSuggestionSettings } from "../../../ui/settings/sections/action-suggestion-settings.js";
import { createBackupSettings as __stsCreateBackupSettings } from "../../../ui/settings/sections/backup-settings.js";
import { createCardRuntimeSettings as __stsCreateCardRuntimeSettings } from "../../../ui/settings/sections/card-runtime-settings.js";
import { createLiterarySettings as __stsCreateLiterarySettings } from "../../../ui/settings/sections/literary-settings.js";
import { createSmartContextSettings as __stsCreateSmartContextSettings } from "../../../ui/settings/sections/smart-context-settings.js";
import { createSmartScanSettings as __stsCreateSmartScanSettings } from "../../../ui/settings/sections/smart-scan-settings.js";
import { createSpeechSettings as __stsCreateSpeechSettings } from "../../../ui/settings/sections/speech-settings.js";
import { createConnectionSettingsScreen as __stsCreateConnectionSettingsScreen } from "../../../../m6/ui/settings/connection-settings-screen.js";
import { buildSavedProbeTarget as __stsBuildSavedProbeTarget, createModelTestButton as __stsCreateModelTestButton } from "../../../../m6/ui/settings/model-test-button.js";
import { createSettingsTab as __stsCreateSettingsTab } from "../../../../m6/ui/components/tab-controls.js";
import { createModelSelect as __stsCreateModelSelect } from "../../../../m6/ui/components/form-controls.js";
import { diagnosticsState as __stsDiagnosticsState } from '../../../../m5/diagnostics/state.js';

export function composeSettingsUi({
  jsxRuntime, React, __stsGenerationGateway, getConnectionSettings,
  saveConnectionSettings, getGeminiSettings, getOpenRouterApiKey, getOpenRouterCachedModels,
  getProxyUrl, getProxyPassword, getProxyLegacyMode, __stsHostConnections,
  getProxyProfiles, saveProxyProfiles, fetchOpenRouterModels, saveOpenRouterModels,
  request, defaultGeminiModels, useGeminiCatalog, proxyUrlKey,
  proxyLegacyModeKey, proxyForToolsKey, __stsCatalog, __stsConnections,
  __stsCreateAiStudioModelCatalog, __stsProxyPersistence, __stsSettingsRepository, __stsEmbeddingService,
  smartScanDefaults, getSmartScanSettings, saveSmartScanSettings, guardedLocalStorage,
  smartContextSettingsKey, smartContextDefaults, getSmartContextSettings, actionSuggestionSettingsKey,
  getActionSuggestionSettings, getProxyForTools, getWritingRefinementSettings, writingRefinementSettingsKey,
  stopNativeSpeech, generateGeminiSpeech, speakNativeText, speechSettingsKey,
  speechDefaults, sanitizeSpeechText, Modality, geminiSpeechVoices,
  speechSafetySettings, getAudioContext, decodeRawPcmBuffer, decodeBase64Bytes,
  GoogleGenAI, nextGeminiKey, geminiSettingsKey, geminiRotationKey,
  openRouterApiKeyStorageKey, personaStore, proxyProfilesKey, backupSettingKeys,
  proxyPasswordKey, cardRuntimeStoragePrefix, encodeBufferToBase64, __stsBackupRestoreService,
  __stsRepositories, presetStore, characterStore, lorebookStore,
  readCardRuntimeEngineMode, readCardRuntimeCompatibilityMode, cardRuntimeCompatibilityEvent, cardRuntimeEngineEvent,
  cardRuntimeEngineKey, cardRuntimeCompatibilityKey
}, {
  useToast, SearchableSelect, TextInput, LoadingIndicator,
  ToggleSwitch, TextArea, NumberInput, PersonaScreen
}) {
  var __stsModelTestButton=__stsCreateModelTestButton(jsxRuntime,React);
  var ModelSelect=__stsCreateModelSelect(jsxRuntime,React);
  var ConnectionSettingsScreen=__stsCreateConnectionSettingsScreen(jsxRuntime,React,()=>({testModel:__stsGenerationGateway.testModel,useToast:useToast,readSettings:getConnectionSettings,saveSettings:saveConnectionSettings,readGemini:getGeminiSettings,readOpenRouterKey:getOpenRouterApiKey,readOpenRouterModels:getOpenRouterCachedModels,readProxyUrl:getProxyUrl,readProxyPassword:getProxyPassword,readLegacyMode:getProxyLegacyMode,readProxyForTools:__stsHostConnections.readProxyForTools,readProfiles:getProxyProfiles,saveProfiles:saveProxyProfiles,fetchOpenRouterModels:fetchOpenRouterModels,saveOpenRouterModels:saveOpenRouterModels,request:request,defaultGeminiModels:defaultGeminiModels,useGeminiModels:useGeminiCatalog,SearchableSelect:SearchableSelect,ModelSelect:ModelSelect,TextInput:TextInput,LoadingIndicator:LoadingIndicator,ToggleSwitch:ToggleSwitch,proxyUrlKey:proxyUrlKey,proxyLegacyKey:proxyLegacyModeKey,proxyForToolsKey:proxyForToolsKey,catalog:__stsCatalog,connections:__stsConnections,createAiStudioCatalog:__stsCreateAiStudioModelCatalog,proxyPersistence:__stsProxyPersistence,settingsRepository:__stsSettingsRepository}));
  var __stsEmbeddingProviderStatus=__stsCreateEmbeddingProviderStatus(()=>({embeddingService: __stsEmbeddingService, react: React, jsxRuntime}));
  var SmartScanSettings=__stsCreateSmartScanSettings(()=>({SearchableSelect: SearchableSelect, smartScanDefaults: smartScanDefaults, ModelTestButton:__stsModelTestButton, defaultGeminiModels: defaultGeminiModels, connections: __stsConnections, EmbeddingProviderStatus: __stsEmbeddingProviderStatus, embeddingService: __stsEmbeddingService, proxyPersistence: __stsProxyPersistence, getSmartScanSettings: getSmartScanSettings, react: React, buildSavedProbeTarget:__stsBuildSavedProbeTarget, useToast, TextArea: TextArea, saveSmartScanSettings: saveSmartScanSettings, useGeminiCatalog: useGeminiCatalog, NumberInput: NumberInput, testModel:__stsGenerationGateway.testModel, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var SmartContextSettings=__stsCreateSmartContextSettings(()=>({settingsStorage:guardedLocalStorage,smartContextStorageKey: smartContextSettingsKey, SearchableSelect: SearchableSelect, smartContextDefaults: smartContextDefaults, react: React, useToast, TextArea: TextArea, NumberInput: NumberInput, getSmartContextSettings: getSmartContextSettings, jsxRuntime}));
  var ActionSuggestionSettings=__stsCreateActionSuggestionSettings(()=>({settingsStorage:guardedLocalStorage,SearchableSelect: SearchableSelect, actionSuggestionStorageKey: actionSuggestionSettingsKey, ModelTestButton:__stsModelTestButton, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, react: React, buildSavedProbeTarget:__stsBuildSavedProbeTarget, useToast, TextArea: TextArea, useGeminiCatalog: useGeminiCatalog, getConnectionSettings: getConnectionSettings, getActionSuggestionSettings: getActionSuggestionSettings, testModel:__stsGenerationGateway.testModel, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var LiterarySettings=__stsCreateLiterarySettings(()=>({settingsStorage:guardedLocalStorage,SearchableSelect: SearchableSelect, getProxyForTools: getProxyForTools, ModelTestButton:__stsModelTestButton, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, react: React, buildSavedProbeTarget:__stsBuildSavedProbeTarget, useToast, TextArea: TextArea, useGeminiCatalog: useGeminiCatalog, getWritingRefinementSettings: getWritingRefinementSettings, getConnectionSettings: getConnectionSettings, testModel:__stsGenerationGateway.testModel, jsxRuntime, ToggleSwitch: ToggleSwitch, writingRefinementStorageKey: writingRefinementSettingsKey}));
  var SpeechContext=(0,React.createContext)(void 0);
  var SpeechProvider=__stsCreateSpeechProvider(()=>({settingsStorage:guardedLocalStorage,stopNativeSpeech,speechContext: SpeechContext,generateGeminiSpeech,speakNativeText,react: React,useToast,speechSettingsKey,speechDefaults,jsxRuntime}));
  var useSpeech=()=>{let context=(0,React.useContext)(SpeechContext);if(void 0===context)throw Error("useTTS must be used within a TTSProvider");return context};
  var SpeechSettings=__stsCreateSpeechSettings(()=>({sanitizeSpeechText: sanitizeSpeechText, SearchableSelect: SearchableSelect, Modality, geminiSpeechVoices: geminiSpeechVoices, speechSafetySettings: speechSafetySettings, getAudioContext: getAudioContext, decodeRawPcmBuffer: decodeRawPcmBuffer, decodeBase64Bytes: decodeBase64Bytes, speakNativeText: speakNativeText, react: React, useToast, NumberInput: NumberInput, useSpeech: useSpeech, GoogleGenAI, jsxRuntime, ToggleSwitch: ToggleSwitch, nextGeminiKey: nextGeminiKey}));
  var BackupSettings=__stsCreateBackupSettings(()=>({geminiSettingsKey: geminiSettingsKey, geminiRotationKey: geminiRotationKey, openRouterKeyStorageKey: openRouterApiKeyStorageKey, personaStore, proxyProfilesKey: proxyProfilesKey, backupSettingKeys: backupSettingKeys, proxyPasswordKey: proxyPasswordKey, cardRuntimeStoragePrefix: cardRuntimeStoragePrefix, arrayBufferToBase64: encodeBufferToBase64, backupRestoreService: __stsBackupRestoreService, connections: __stsConnections, diagnosticsState: __stsDiagnosticsState, proxyPersistence: __stsProxyPersistence, repositories: __stsRepositories, react: React, presetStore, useToast, characterStore, LoadingIndicator: LoadingIndicator, lorebookStore, jsxRuntime}));
  var CardRuntimeSettings=__stsCreateCardRuntimeSettings(()=>({settingsStorage:guardedLocalStorage,readCardRuntimeEngineMode: readCardRuntimeEngineMode, readCardRuntimeCompatMode: readCardRuntimeCompatibilityMode, cardRuntimeCompatEvent: cardRuntimeCompatibilityEvent, react: React, cardRuntimeEngineEvent: cardRuntimeEngineEvent, cardRuntimeEngineKey: cardRuntimeEngineKey, jsxRuntime, cardRuntimeCompatKey: cardRuntimeCompatibilityKey}));
  var SettingsTab=__stsCreateSettingsTab(jsxRuntime);
  var SettingsScreen=__stsCreateSettingsScreen(()=>({SmartContextSettings: SmartContextSettings, ActionSuggestionSettings: ActionSuggestionSettings, ConnectionSettingsScreen: ConnectionSettingsScreen, BackupSettings: BackupSettings, SmartScanSettings: SmartScanSettings, SpeechSettings: SpeechSettings, CardRuntimeSettings: CardRuntimeSettings, react: React, SettingsTab: SettingsTab, LiterarySettings: LiterarySettings, PersonaScreen: PersonaScreen, jsxRuntime}));
  return {
    __stsModelTestButton, ModelSelect, ConnectionSettingsScreen, __stsEmbeddingProviderStatus,
    SmartScanSettings, SmartContextSettings, ActionSuggestionSettings, LiterarySettings,
    SpeechContext, SpeechProvider, useSpeech, SpeechSettings,
    BackupSettings, CardRuntimeSettings, SettingsTab, SettingsScreen
  };
}
