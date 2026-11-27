import { createChatHud as __stsCreateChatHud } from "../../../features/chat/ui/chat-hud.js";
import { createCardPreviewDialog as __stsCreateCardPreviewDialog } from "../../../ui/card-runtime/card-preview-dialog.js";
import { createCardPopupProvider as __stsCreateCardPopupProvider } from "../../../ui/shell/providers.js";
import { createChatSessionScreen as __stsCreateChatSessionScreen } from "../../../features/chat/ui/chat-session-screen.js";
import { createRpgNotification as __stsCreateRpgNotification, createStoryRevisionDialog as __stsCreateStoryRevisionDialog, createErrorDecisionDialog as __stsCreateErrorDecisionDialog } from "../../../features/chat/ui/chat-controls.js";
import { createMainTab as __stsCreateMainTab } from "../../../ui/components/tab-controls.js";
import { createApplicationShell as __stsCreateApplicationShell } from "../../../ui/shell/application-shell.js";
import { createChatRoute as __stsCreateChatRoute } from "../../../features/chat/ui/chat-route.js";
import { extractStoryContent } from '../../../features/prompts/story-content.js';
import { createApplicationLifecycle } from '../../lifecycle/application-lifecycle.js';

export function composeApplicationShellUi({
  React, jsxRuntime, sessionStore, characterStore,
  lorebookStore, parseRelaxedJson, getProxyForTools, mutateVariable,
  generateProxyToolText, writingRefinementPrompt, syncLorebookEmbeddings, actionSuggestionPrompt,
  __stsAiStudioToolText, conversationSafetySettings, getSmartScanSettings, generateGeminiToolText,
  countModelMessages, useChatSession, getWritingRefinementSettings, getConnectionSettings,
  getSmartContextSettings, getActionSuggestionSettings, nextGeminiKey, htmlSanitizer,
  personaStore, presetStore, dispatchSystemLog, __stsBackupRestoreService
}, {
  Icon, useDialogFocus, VariableHud, RpgHud,
  ActionSuggestionDialog, ChatDialogs, LoadingIndicator, useToast,
  DiagnosticsDialog, MessageList, ChatVisualEffects, ImmersiveContainer,
  ChatHeader, ChatComposer, SessionListScreen, AppHeader,
  CharacterScreen, PresetScreen, LorebookLibrary, SettingsScreen
}) {
  var CardPreviewDialog=__stsCreateCardPreviewDialog(React,()=>({react: React, jsxRuntime, Icon: Icon}));
  CardPreviewDialog.displayName="FloatingStatusHUD";
  var ErrorDecisionDialog=__stsCreateErrorDecisionDialog(()=>({useDialogFocus: useDialogFocus, react: React, jsxRuntime}));
  var ChatHud=__stsCreateChatHud(React,()=>({react: React, jsxRuntime, VariableHud: VariableHud, RpgHud: RpgHud, ActionSuggestionDialog: ActionSuggestionDialog, ChatDialogs: ChatDialogs, InteractiveErrorDialog: ErrorDecisionDialog, CardPreviewDialog: CardPreviewDialog}));
  var RpgNotification=__stsCreateRpgNotification(()=>({Icon: Icon, sessionStore, jsxRuntime}));
  var StoryRevisionDialog=__stsCreateStoryRevisionDialog(()=>({useDialogFocus: useDialogFocus, react: React, LoadingIndicator: LoadingIndicator, jsxRuntime}));
  function SessionDiagnosticsFooter(props) {
    const logs = sessionStore(state => state.logs);
    return jsxRuntime.jsx(DiagnosticsDialog, { ...props, logs });
  }
  var ChatSessionScreen=__stsCreateChatSessionScreen(()=>({react: React, jsxRuntime, useToast, characterStore, lorebookStore, parseLooseJson: parseRelaxedJson, isProxyForToolsEnabled: getProxyForTools, mutateVariable: mutateVariable, RpgNotificationBanner: RpgNotification, callProxyToolModel: generateProxyToolText, DiagnosticsFooter: SessionDiagnosticsFooter, defaultRefinementPrompt: writingRefinementPrompt, syncLorebookEmbeddings: syncLorebookEmbeddings, ChatHud: ChatHud, WritingRefinementDialog: StoryRevisionDialog, defaultActionSuggestionPrompt: actionSuggestionPrompt, aiStudioToolText: __stsAiStudioToolText, defaultGeminiSafetySettings: conversationSafetySettings, MessageList: MessageList, getSmartScanSettings: getSmartScanSettings, extractStoryContent: extractStoryContent, ChatVisualBackdrop: ChatVisualEffects, callGeminiToolModel: generateGeminiToolText, countConversationTurns: countModelMessages, ChatWorkspaceFrame: ImmersiveContainer, useChatSession: useChatSession, getLiterarySettings: getWritingRefinementSettings, LoadingIndicator: LoadingIndicator, ChatHeader: ChatHeader, getConnectionSettings: getConnectionSettings, getSummarySettings: getSmartContextSettings, ChatComposer: ChatComposer, getActionSuggestionSettings: getActionSuggestionSettings, getGeminiApiKey: nextGeminiKey}));
  var ChatRoute=__stsCreateChatRoute(jsxRuntime,{ChatSession:ChatSessionScreen,SessionList:SessionListScreen});
  var CardPopupContext=(0,React.createContext)(void 0);
  var CardPopupProvider=__stsCreateCardPopupProvider(()=>({cardPopupContext: CardPopupContext,useDialogFocus,htmlSanitizer,react: React,jsxRuntime}));
  var { ErrorBoundary: ErrorBoundary, InitialLoader: InitialLoader } = createApplicationLifecycle({personaStore, react: React, presetStore, characterStore, dispatchSystemLog, lorebookStore, jsxRuntime, __stsBackupRestoreService, useToast});
  var MainTab=__stsCreateMainTab(jsxRuntime,Icon);
  var ApplicationShell=__stsCreateApplicationShell(jsxRuntime,React,{Header:AppHeader,MainTab:MainTab,Characters:CharacterScreen,Presets:PresetScreen,Lorebooks:LorebookLibrary,Chat:ChatRoute,Settings:SettingsScreen});
  return {
    CardPreviewDialog, ErrorDecisionDialog, ChatHud, RpgNotification,
    StoryRevisionDialog, ChatSessionScreen, ChatRoute, CardPopupContext,
    CardPopupProvider, ErrorBoundary, InitialLoader, MainTab,
    ApplicationShell
  };
}
