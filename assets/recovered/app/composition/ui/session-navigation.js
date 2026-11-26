import * as __stsSessionPersistence from "../../../../m5/app/persistence/session-state.js";
import { createArenaSettingsDialog as __stsCreateArenaSettingsDialog } from "../../../features/arena/ui/arena-settings-dialog.js";
import { createGreetingDialog as __stsCreateGreetingDialog } from "../../../features/chat/session/greeting-dialog.js";
import { createSessionListItem as __stsCreateSessionListItem } from "../../../features/chat/session/session-list-item.js";
import { createSessionListScreen as __stsCreateSessionListScreen } from "../../../features/chat/session/session-list-screen.js";
import { createStorySetupDialog as __stsCreateStorySetupDialog } from "../../../features/chat/story/story-setup-dialog.js";
import { createChatHeader as __stsCreateChatHeader } from "../../../features/chat/ui/chat-header.js";
import { createChatSettingsDialog as __stsCreateChatSettingsDialog } from "../../../features/chat/ui/chat-settings-dialog.js";
import { createSpeechControls as __stsCreateSpeechControls } from "../../../features/speech/ui/speech-controls.js";
import { createQuickConnectionBadge as __stsCreateQuickConnectionBadge } from "../../../ui/settings/quick-connection-badge.js";
import { createQuickConnectionDialog as __stsCreateQuickConnectionDialog } from "../../../ui/settings/quick-connection-dialog.js";
import { createStoryImportControl as __stsCreateStoryImportControl, createAdventureImportControl as __stsCreateAdventureImportControl } from "../../../features/chat/ui/chat-controls.js";
import { buildSavedProbeTarget as __stsBuildSavedProbeTarget } from "../../../../m6/ui/settings/model-test-button.js";
import { mergeInitialVariableSources as __stsMergeInitialVariableSources } from '../../../../initial-variable-service-v1.3.6.js';
import { diagnosticsState as __stsDiagnosticsState } from '../../../../m5/diagnostics/state.js';

export function composeSessionNavigationUi({
  React, jsxRuntime, truncateText, personaStore,
  loadSessionById, saveSessionRecord, readEpub, relativeTimeUnits,
  characterStore, presetStore, executeUpdateVariableBlock, deleteSessionRecord,
  expandBasicMacros, prepareCharacterRecord, listSavedSessions, resolveCharacterName,
  isPlainObject, expandRandomMacros, extractRegexScripts, __stsRepositories,
  resolveWorldInfo, processRegex, relaxedJson, mergeCardObjects,
  isRecordObject, sessionStore, defaultProxyModels, fetchOpenRouterModels,
  defaultGeminiModels, __stsConnections, __stsProxyPersistence, getProxyLegacyMode,
  getOpenRouterApiKey, getProxyProfiles, __stsCatalog, useGeminiCatalog,
  getConnectionSettings, getOpenRouterCachedModels, __stsGenerationGateway, getProxyUrl,
  getProxyPassword, saveConnectionSettings, saveProxyProfiles, getActiveModelDisplayName
}, {
  useDialogFocus, LoadingIndicator, Icon, useToast,
  FileNameDialog, __stsModelTestButton, ToggleSwitch, useSpeech
}) {
  var GreetingDialog=__stsCreateGreetingDialog(()=>({react: React, jsxRuntime, truncateText: truncateText}));
  var StorySetupDialog=__stsCreateStorySetupDialog(()=>({react: React, jsxRuntime, personaStore, loadSessionById: loadSessionById, saveSessionRecord: saveSessionRecord, useDialogFocus: useDialogFocus, LoadingIndicator: LoadingIndicator, readEpub: readEpub}));
  var SessionListItem=__stsCreateSessionListItem(()=>({react: React, jsxRuntime, relativeTimeUnits: relativeTimeUnits, Icon: Icon}));
  var StoryImportControl=__stsCreateStoryImportControl(()=>({Icon: Icon, jsxRuntime}));
  var AdventureImportControl=__stsCreateAdventureImportControl(()=>({react: React, Icon: Icon, jsxRuntime}));
  var SessionListScreen=__stsCreateSessionListScreen(()=>({react: React, jsxRuntime, useToast, characterStore, presetStore, personaStore, executeVariableScript: executeUpdateVariableBlock, truncateText: truncateText, deleteSessionRecord: deleteSessionRecord, expandBasicMacros: expandBasicMacros, FileNameDialog: FileNameDialog, normalizeCharacterForSave: prepareCharacterRecord, listSavedSessions: listSavedSessions, expandRandomMacros: resolveCharacterName, isPlainObject: isPlainObject, saveSessionRecord: saveSessionRecord, extractRegexScripts: expandRandomMacros, resolveCharacterName: extractRegexScripts, diagnosticsState: __stsDiagnosticsState, mergeInitialVariableSources: __stsMergeInitialVariableSources, repositories: __stsRepositories, sessionPersistence: __stsSessionPersistence, StorySetupDialog: StorySetupDialog, resolveWorldInfo: resolveWorldInfo, CharacterLaunchCard: StoryImportControl, processRegex: processRegex, AdventureImportDropzone: AdventureImportControl, yamlParser: relaxedJson, deepMergeObject: mergeCardObjects, LoadingIndicator: LoadingIndicator, GreetingDialog: GreetingDialog, isRecordObject: isRecordObject, SessionListItem: SessionListItem}));
  var ArenaSettingsDialog=__stsCreateArenaSettingsDialog(()=>({react: React, jsxRuntime, useToast, sessionStore, defaultProxyModels: defaultProxyModels, ModelTestButton: __stsModelTestButton, fetchOpenRouterModels: fetchOpenRouterModels, defaultGeminiModels: defaultGeminiModels, useDialogFocus: useDialogFocus, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, getProxyLegacyMode: getProxyLegacyMode, getOpenRouterApiKey: getOpenRouterApiKey, buildSavedProbeTarget: __stsBuildSavedProbeTarget, getProxyProfiles: getProxyProfiles, catalog: __stsCatalog, useGeminiCatalog: useGeminiCatalog, LoadingIndicator: LoadingIndicator, getConnectionSettings: getConnectionSettings, getOpenRouterCachedModels: getOpenRouterCachedModels, testModel: __stsGenerationGateway.testModel, getProxyUrl: getProxyUrl, getProxyPassword: getProxyPassword}));
  var ChatSettingsDialog=__stsCreateChatSettingsDialog(()=>({react: React, jsxRuntime, useDialogFocus: useDialogFocus, Icon: Icon, ToggleSwitch: ToggleSwitch}));
  var QuickConnectionDialog=__stsCreateQuickConnectionDialog(()=>({react: React, jsxRuntime, useToast, presetStore, personaStore, defaultProxyModels: defaultProxyModels, ModelTestButton: __stsModelTestButton, defaultGeminiModels: defaultGeminiModels, useDialogFocus: useDialogFocus, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, getProxyLegacyMode: getProxyLegacyMode, buildSavedProbeTarget: __stsBuildSavedProbeTarget, getProxyProfiles: getProxyProfiles, catalog: __stsCatalog, useGeminiCatalog: useGeminiCatalog, Icon: Icon, getConnectionSettings: getConnectionSettings, getOpenRouterCachedModels: getOpenRouterCachedModels, saveConnectionSettings: saveConnectionSettings, saveProfiles: saveProxyProfiles, testModel: __stsGenerationGateway.testModel, getProxyUrl: getProxyUrl, getProxyPassword: getProxyPassword}));
  var SpeechControls=__stsCreateSpeechControls(()=>({jsxRuntime, Icon: Icon, useSpeech: useSpeech}));
  var QuickConnectionBadge=__stsCreateQuickConnectionBadge(()=>({jsxRuntime, getActiveModelDisplayName: getActiveModelDisplayName, Icon: Icon, getConnectionSettings: getConnectionSettings}));
  var ChatHeader=__stsCreateChatHeader(()=>({react: React, jsxRuntime, sessionStore, ArenaSettingsDialog: ArenaSettingsDialog, QuickConnectionDialog: QuickConnectionDialog, SpeechControls: SpeechControls, Icon: Icon, QuickConnectionBadge: QuickConnectionBadge, ChatSettingsDialog: ChatSettingsDialog}));
  return {
    GreetingDialog, StorySetupDialog, SessionListItem, StoryImportControl,
    AdventureImportControl, SessionListScreen, ArenaSettingsDialog, ChatSettingsDialog,
    QuickConnectionDialog, SpeechControls, QuickConnectionBadge, ChatHeader
  };
}
