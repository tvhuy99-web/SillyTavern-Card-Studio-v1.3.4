import { createCharacterRpgSection as __stsCreateCharacterRpgSection } from "../../../features/rpg/ui/character-rpg-section.js";
import { createRpgDatabaseEditor as __stsCreateRpgDatabaseEditor } from "../../../features/rpg/ui/database/rpg-database-editor.js";
import { createMythicConfigurationDialog as __stsCreateMythicConfigurationDialog } from "../../../features/rpg/ui/mythic/mythic-configuration-dialog.js";
import { createCharacterDetailSections as __stsCreateCharacterDetailSections } from "../../../features/characters/ui/character-extension-sections.js";
import { createCharacterScreen as __stsCreateCharacterScreen } from "../../../features/characters/ui/character-screen.js";
import { createCharacterTools as __stsCreateCharacterTools } from "../../../features/characters/ui/character-tools.js";
import { createAttachLorebookDialog as __stsCreateAttachLorebookDialog } from "../../../features/world-info/ui/attach-lorebook-dialog.js";
import { createEntryPositionControl as __stsCreateEntryPositionControl, createLorebookEntryDialog as __stsCreateLorebookEntryDialog } from "../../../features/world-info/ui/lorebook-entry-editor.js";
import { createLorebookEntryCard as __stsCreateLorebookEntryCard } from "../../../features/world-info/ui/lorebook-entry-item.js";
import { createEntrySelectionControl as __stsCreateEntrySelectionControl, createLorebookEntryList as __stsCreateLorebookEntryList } from "../../../features/world-info/ui/lorebook-entry-list.js";
import { createLorebookManager as __stsCreateLorebookManager } from "../../../features/world-info/ui/lorebook-manager.js";
import { createFileNameDialog as __stsCreateFileNameDialog } from "../../../ui/components/file-name-dialog.js";
import { buildSavedProbeTarget as __stsBuildSavedProbeTarget } from "../../../../m6/ui/settings/model-test-button.js";
import { createDialogFocusHook } from '../../../ui/components/dialog-focus.js';

export function composeCatalogEditorUi({
  React, jsxRuntime, sessionStore, createDefaultRpgDatabase,
  buildLinkedLorebookEntries, parseRelaxedJson, getProxyForTools, defaultMythicSystemPrompt,
  rpgPromptMacros, importChatSheetsDatabase, defaultGeminiModels, __stsConnections,
  __stsProxyPersistence, getProxyLegacyMode, useGeminiCatalog, __stsGenerationGateway,
  getProxyUrl, getProxyPassword, lorebookStore, createPngTextChunk,
  encodeBase64Utf8, downloadBlob, buildExportCard, isPngBytes,
  estimateTokenCount, resolveExportSpec, handleRadioKeyDown, useEmbeddingSync,
  characterStore, NEW_CHARACTER_ID, emptyCharacterCard
}, {
  useToast, SearchableSelect, TextInput, TextArea,
  ToggleSwitch, CollapsibleSection, CharacterExtensionsSection, SectionNavigator,
  CharacterMetadataSection, CharacterScenarioSection, CharacterDialogueSection, CharacterCoreSection,
  CharacterLorebookSection, LoadingIndicator, Icon
}, readModelTestButton) {
  // The model-test button is initialized by the later settings stage; read it lazily.
  var RpgDatabaseEditor=__stsCreateRpgDatabaseEditor(()=>({react: React, jsxRuntime, useToast, sessionStore, SearchableSelect: SearchableSelect, createDefaultRpgDatabase: createDefaultRpgDatabase, useDialogFocus: useDialogFocus, TextInput: TextInput, TextArea: TextArea, buildGeneratedLorebookEntries: buildLinkedLorebookEntries, ToggleSwitch: ToggleSwitch}));
  var MythicConfigurationDialog=__stsCreateMythicConfigurationDialog(()=>({react: React, jsxRuntime, useToast, parseLooseJson: parseRelaxedJson, SearchableSelect: SearchableSelect, isProxyForToolsEnabled: getProxyForTools, defaultMythicSystemPrompt: defaultMythicSystemPrompt, ModelTestButton: readModelTestButton(), mythicPromptMacros: rpgPromptMacros, importLegacyRpgDatabase: importChatSheetsDatabase, defaultGeminiModels: defaultGeminiModels, useDialogFocus: useDialogFocus, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, getProxyLegacyMode: getProxyLegacyMode, buildSavedProbeTarget: __stsBuildSavedProbeTarget, TextInput: TextInput, useGeminiCatalog: useGeminiCatalog, testModel: __stsGenerationGateway.testModel, getProxyUrl: getProxyUrl, getProxyPassword: getProxyPassword, ToggleSwitch: ToggleSwitch}));
  var CharacterRpgSection=__stsCreateCharacterRpgSection(()=>({react: React, jsxRuntime, createDefaultRpgDatabase: createDefaultRpgDatabase, MythicConfigurationDialog: MythicConfigurationDialog, RpgDatabaseEditor: RpgDatabaseEditor, CollapsibleSection: CollapsibleSection, ToggleSwitch: ToggleSwitch}));
  var CharacterDetailSections=__stsCreateCharacterDetailSections(()=>({react: React, jsxRuntime, lorebookStore, MythicSection: CharacterRpgSection, CharacterExtensionsSection: CharacterExtensionsSection, SectionNavigator: SectionNavigator, CharacterMetadataSection: CharacterMetadataSection, CharacterScenarioSection: CharacterScenarioSection, CharacterDialogueSection: CharacterDialogueSection, CharacterCoreSection: CharacterCoreSection, CharacterLorebookSection: CharacterLorebookSection}));
  var { useDialogFocus: useDialogFocus } = createDialogFocusHook({react: React});
  var FileNameDialog=__stsCreateFileNameDialog(()=>({useDialogFocus: useDialogFocus, react: React, jsxRuntime}));
  var CharacterTools=__stsCreateCharacterTools(()=>({react: React, jsxRuntime, lorebookStore, createPngTextChunk: createPngTextChunk, encodeBase64Utf8: encodeBase64Utf8, downloadBlob: downloadBlob, buildExportCard: buildExportCard, FileNameDialog: FileNameDialog, isPngBytes: isPngBytes, estimateTokens: estimateTokenCount, LoadingIndicator: LoadingIndicator, resolveExportSpec: resolveExportSpec}));
  var EntryPositionControl=__stsCreateEntryPositionControl(()=>({jsxRuntime, handleRadioKeyDown: handleRadioKeyDown}));
  function EntrySelectionControl(...args){return __stsCreateEntrySelectionControl(()=>({jsxRuntime}))(...args)}
  var LorebookEntryDialog=__stsCreateLorebookEntryDialog(()=>({EntryPositionControl: EntryPositionControl, useDialogFocus: useDialogFocus, react: React, TextInput: TextInput, TextArea: TextArea, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var LorebookEntryCard=__stsCreateLorebookEntryCard(()=>({jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var LorebookEntryList=__stsCreateLorebookEntryList(()=>({EntrySelectionControl: EntrySelectionControl, LorebookEntryDialog: LorebookEntryDialog, LorebookEntryCard: LorebookEntryCard, react: React, jsxRuntime}));
  var AttachLorebookDialog=__stsCreateAttachLorebookDialog(()=>({useDialogFocus: useDialogFocus, react: React, jsxRuntime}));
  var LorebookManager=__stsCreateLorebookManager(()=>({useEmbeddingSync: useEmbeddingSync, LorebookEntryList: LorebookEntryList, useDialogFocus: useDialogFocus, AttachLorebookDialog: AttachLorebookDialog, react: React, useToast, lorebookStore, jsxRuntime}));
  var CharacterScreen=__stsCreateCharacterScreen(()=>({react: React, jsxRuntime, useToast, characterStore, CharacterDetailSections: CharacterDetailSections, NEW_CHARACTER_ID: NEW_CHARACTER_ID, LorebookManager: LorebookManager, emptyCharacterCard: emptyCharacterCard, CharacterTools: CharacterTools, Icon: Icon, LoadingIndicator: LoadingIndicator}));
  return {
    RpgDatabaseEditor, MythicConfigurationDialog, CharacterRpgSection, CharacterDetailSections,
    useDialogFocus, FileNameDialog, CharacterTools, EntryPositionControl,
    EntrySelectionControl, LorebookEntryDialog, LorebookEntryCard, LorebookEntryList,
    AttachLorebookDialog, LorebookManager, CharacterScreen
  };
}
