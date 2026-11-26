import { createCharacterExtensionsSection as __stsCreateCharacterExtensionsSection } from "../../../features/characters/ui/character-extension-sections.js";
import { createCharacterDialogueSection as __stsCreateCharacterDialogueSection } from "../../../features/characters/ui/character-greeting-editor.js";
import { createCharacterCoreSection as __stsCreateCharacterCoreSection, createCharacterScenarioSection as __stsCreateCharacterScenarioSection, createCharacterLorebookSection as __stsCreateCharacterLorebookSection, createCharacterMetadataSection as __stsCreateCharacterMetadataSection } from "../../../features/characters/ui/character-metadata-sections.js";
import { createRegexScriptEditor as __stsCreateRegexScriptEditor, createRegexScriptList as __stsCreateRegexScriptList } from "../../../features/characters/ui/regex-script-editor.js";
import { createTavernScriptEditor as __stsCreateTavernScriptEditor, createTavernScriptList as __stsCreateTavernScriptList } from "../../../features/characters/ui/tavern-script-editor.js";
import { createToastProvider as __stsCreateToastProvider } from "../../../ui/shell/providers.js";
import { createCopyButton as __stsCreateCopyButton, createTextInput as __stsCreateTextInput, createTextArea as __stsCreateTextArea, createSearchableSelect as __stsCreateSearchableSelect, createToastItem as __stsCreateToastItem } from "../../../ui/components/input-controls.js";
import { createIcon as __stsCreateIcon } from "../../../../m6/ui/components/icon.js";
import { createAppHeader as __stsCreateAppHeader } from "../../../../m6/ui/shell/application-shell.js";
import { createToggleSwitch as __stsCreateToggleSwitch } from "../../../../m6/ui/components/form-controls.js";
import { createTooltip as __stsCreateTooltip, createCollapsibleSection as __stsCreateCollapsibleSection, createSectionNavigator as __stsCreateSectionNavigator } from "../../../../m6/ui/components/section-controls.js";
import { createLoadingIndicator as __stsCreateLoadingIndicator } from "../../../../m6/ui/components/recovered-primitives.js";
import { createGeminiClient } from '../../../../m4/providers/gemini/config.js';

export function composeEditorFoundationsUi({
  jsxRuntime, React, getProxyForTools, generateProxyToolText,
  __stsAiStudioToolText, getActiveModelDisplayName, getConnectionSettings, createActiveGeminiClient,
  characterDialogueSafetySettings
}) {
  var Icon=__stsCreateIcon(jsxRuntime);
  var SectionNavigator=__stsCreateSectionNavigator(jsxRuntime);
  var AppHeader=__stsCreateAppHeader(jsxRuntime,Icon);
  var CollapsibleSection=__stsCreateCollapsibleSection(jsxRuntime);
  var Tooltip=__stsCreateTooltip(jsxRuntime);
  var CopyButton=__stsCreateCopyButton(()=>({react: React, jsxRuntime}));
  var TextInput=__stsCreateTextInput(()=>({react: React, Tooltip: Tooltip, CopyButton: CopyButton, jsxRuntime}));
  var TextArea=__stsCreateTextArea(()=>({react: React, Tooltip: Tooltip, CopyButton: CopyButton, jsxRuntime}));
  var CharacterCoreSection=__stsCreateCharacterCoreSection(()=>({jsxRuntime, TextInput: TextInput, TextArea: TextArea, CollapsibleSection: CollapsibleSection}));
  var LoadingIndicator=__stsCreateLoadingIndicator(jsxRuntime);
  var ToastContext=(0,React.createContext)(void 0);
  var useToast=()=>{let context=(0,React.useContext)(ToastContext);if(!context)throw Error("useToast must be used within a ToastProvider");return context};
  var ToastItem=__stsCreateToastItem(()=>({react: React, Icon: Icon, jsxRuntime}));
  var ToastProvider=__stsCreateToastProvider(()=>({react: React,toastContext: ToastContext,ToastNotification: ToastItem,jsxRuntime}));
  var CharacterDialogueSection=__stsCreateCharacterDialogueSection(()=>({react: React, jsxRuntime, useToast, readProxyForTools: getProxyForTools, generateProxyText: generateProxyToolText, generateAiStudioToolText: __stsAiStudioToolText, resolveCurrentModel: getActiveModelDisplayName, TextArea: TextArea, CollapsibleSection: CollapsibleSection, LoadingIndicator: LoadingIndicator, readConnectionSettings: getConnectionSettings, createGeminiClient: createActiveGeminiClient, geminiSafetySettings: characterDialogueSafetySettings, CopyButton: CopyButton}));
  var CharacterScenarioSection=__stsCreateCharacterScenarioSection(()=>({jsxRuntime, TextArea: TextArea, CollapsibleSection: CollapsibleSection}));
  var ToggleSwitch=__stsCreateToggleSwitch(jsxRuntime,React,Tooltip);
  var CharacterMetadataSection=__stsCreateCharacterMetadataSection(()=>({react: React, jsxRuntime, TextInput: TextInput, TextArea: TextArea, CollapsibleSection: CollapsibleSection, ToggleSwitch: ToggleSwitch}));
  var CharacterLorebookSection=__stsCreateCharacterLorebookSection(()=>({jsxRuntime, CollapsibleSection: CollapsibleSection}));
  var RegexScriptEditor=__stsCreateRegexScriptEditor(()=>({react: React, jsxRuntime, TextInput: TextInput, TextArea: TextArea, ToggleSwitch: ToggleSwitch}));
  var RegexScriptList=__stsCreateRegexScriptList(()=>({react: React, jsxRuntime, RegexScriptEditor: RegexScriptEditor}));
  var TavernScriptEditor=__stsCreateTavernScriptEditor(()=>({react: React, jsxRuntime, TextInput: TextInput, TextArea: TextArea, ToggleSwitch: ToggleSwitch}));
  var TavernScriptList=__stsCreateTavernScriptList(()=>({react: React, jsxRuntime, TavernScriptEditor: TavernScriptEditor}));
  var CharacterExtensionsSection=__stsCreateCharacterExtensionsSection(()=>({react: React, jsxRuntime, RegexScriptList: RegexScriptList, TextArea: TextArea, TavernScriptList: TavernScriptList, CollapsibleSection: CollapsibleSection}));
  var SearchableSelect=__stsCreateSearchableSelect(()=>({react: React, Tooltip: Tooltip, jsxRuntime}));
  return {
    Icon, SectionNavigator, AppHeader, CollapsibleSection,
    Tooltip, CopyButton, TextInput, TextArea,
    CharacterCoreSection, LoadingIndicator, ToastContext, useToast,
    ToastItem, ToastProvider, CharacterDialogueSection, CharacterScenarioSection,
    ToggleSwitch, CharacterMetadataSection, CharacterLorebookSection, RegexScriptEditor,
    RegexScriptList, TavernScriptEditor, TavernScriptList, CharacterExtensionsSection,
    SearchableSelect
  };
}
