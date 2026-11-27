import { createActiveWorldInfoEntry as __stsCreateActiveWorldInfoEntry, createDynamicWorldInfoDialog as __stsCreateDynamicWorldInfoDialog } from "../../../features/world-info/ui/dynamic-world-info.js";
import { createGenerateEntryDialog as __stsCreateGenerateEntryDialog } from "../../../features/world-info/ui/generate-entry-dialog.js";
import { createRelevanceTestDialog as __stsCreateRelevanceTestDialog } from "../../../features/world-info/ui/relevance-test-dialog.js";
import { createChatDialogs as __stsCreateChatDialogs } from "../../../features/chat/ui/chat-dialogs.js";
import { createAuthorNoteDialog as __stsCreateAuthorNoteDialog } from "../../../features/chat/ui/chat-controls.js";

export function composeWorldInfoDialogsUi({
  embedQuery, getEmbeddingIndex, cosineSimilarity, loadEmbeddingIndex,
  __stsEmbeddingService, getSmartScanSettings, React, jsxRuntime,
  useEmbeddingSync, lorebookStore, getProxyForTools, generateProxyToolText,
  __stsAiStudioToolText, conversationSafetySettings, generateGeminiToolText, getConnectionSettings
}, {
  useDialogFocus, EntryPositionControl, ToggleSwitch, LoadingIndicator
}) {
  var RelevanceTestDialog=__stsCreateRelevanceTestDialog(()=>({embedQuery: embedQuery, getEmbeddingIndex: getEmbeddingIndex, cosineSimilarity: cosineSimilarity, loadEmbeddingIndex: loadEmbeddingIndex, useDialogFocus: useDialogFocus, embeddingService: __stsEmbeddingService, getSmartScanSettings: getSmartScanSettings, react: React, jsxRuntime}));
  var ActiveWorldInfoEntry=__stsCreateActiveWorldInfoEntry(()=>({EntryPositionControl: EntryPositionControl, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var DynamicWorldInfoDialog=__stsCreateDynamicWorldInfoDialog(()=>({ActiveWorldInfoEntry: ActiveWorldInfoEntry, useEmbeddingSync: useEmbeddingSync, RelevanceTestDialog: RelevanceTestDialog, useDialogFocus: useDialogFocus, embeddingService: __stsEmbeddingService, getSmartScanSettings: getSmartScanSettings, react: React, jsxRuntime}));
  var GenerateEntryDialog=__stsCreateGenerateEntryDialog(()=>({react: React, LoadingIndicator: LoadingIndicator, lorebookStore, jsxRuntime}));
  var AuthorNoteDialog=__stsCreateAuthorNoteDialog(()=>({useDialogFocus: useDialogFocus, react: React, jsxRuntime}));
  var ChatDialogs=__stsCreateChatDialogs(()=>({react: React, jsxRuntime, isProxyForToolsEnabled: getProxyForTools, AuthorNoteDialog: AuthorNoteDialog, WorldInfoDialog: DynamicWorldInfoDialog, callProxyToolModel: generateProxyToolText, useDialogFocus: useDialogFocus, aiStudioToolText: __stsAiStudioToolText, defaultGeminiSafetySettings: conversationSafetySettings, callGeminiToolModel: generateGeminiToolText, LorebookGeneratorModal: GenerateEntryDialog, getConnectionSettings: getConnectionSettings}));
  return {
    RelevanceTestDialog, ActiveWorldInfoEntry, DynamicWorldInfoDialog, GenerateEntryDialog,
    AuthorNoteDialog, ChatDialogs
  };
}
