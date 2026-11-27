import { createPersonaEditor as __stsCreatePersonaEditor, createPersonaScreen as __stsCreatePersonaScreen } from "../../../features/personas/ui/persona-screen.js";
import { createPresetBasicSection as __stsCreatePresetBasicSection, createSamplingSection as __stsCreateSamplingSection, createGenerationControlSection as __stsCreateGenerationControlSection, createInstructSection as __stsCreateInstructSection, createExperimentalSection as __stsCreateExperimentalSection, createPresetConfiguration as __stsCreatePresetConfiguration } from "../../../features/presets/ui/preset-generation-sections.js";
import { createPresetScreen as __stsCreatePresetScreen } from "../../../features/presets/ui/preset-screen.js";
import { createPromptEditDialog as __stsCreatePromptEditDialog, createPresetNameDialog as __stsCreatePresetNameDialog } from "../../../features/presets/ui/prompt-editor.js";
import { createPromptListItem as __stsCreatePromptListItem, createPromptManager as __stsCreatePromptManager } from "../../../features/presets/ui/prompt-manager.js";
import { createPromptPreview as __stsCreatePromptPreview, createMacroReference as __stsCreateMacroReference } from "../../../features/presets/ui/prompt-preview.js";
import { createLorebookListItem as __stsCreateLorebookListItem, createLorebookUploadControl as __stsCreateLorebookUploadControl, createLorebookLibrary as __stsCreateLorebookLibrary } from "../../../features/world-info/ui/lorebook-library.js";
import { createInlineCopyButton as __stsCreateInlineCopyButton, createNumberInput as __stsCreateNumberInput, createStringListInput as __stsCreateStringListInput } from "../../../ui/components/input-controls.js";
import { createPresetTab as __stsCreatePresetTab } from "../../../../m6/ui/components/tab-controls.js";

export function composePresetCatalogUi({
  jsxRuntime, React, macroReference, presetStore,
  lorebookStore, personaStore, characterStore
}, {
  TextInput, TextArea, CollapsibleSection, Tooltip,
  SearchableSelect, CopyButton, ToggleSwitch, useDialogFocus,
  EntrySelectionControl, useToast, FileNameDialog, Icon,
  LoadingIndicator, LorebookManager, LorebookEntryList
}) {
  var PresetBasicSection=__stsCreatePresetBasicSection(()=>({TextInput: TextInput, TextArea: TextArea, CollapsibleSection: CollapsibleSection, jsxRuntime}));
  var NumberInput=__stsCreateNumberInput(()=>({react: React, Tooltip: Tooltip, jsxRuntime}));
  var SamplingSection=__stsCreateSamplingSection(()=>({SearchableSelect: SearchableSelect, CollapsibleSection: CollapsibleSection, NumberInput: NumberInput, jsxRuntime}));
  var StringListInput=__stsCreateStringListInput(()=>({Tooltip: Tooltip, CopyButton: CopyButton, jsxRuntime}));
  var GenerationControlSection=__stsCreateGenerationControlSection(()=>({StringListInput: StringListInput, TextInput: TextInput, CollapsibleSection: CollapsibleSection, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var InstructSection=__stsCreateInstructSection(()=>({TextInput: TextInput, TextArea: TextArea, CollapsibleSection: CollapsibleSection, jsxRuntime}));
  var ExperimentalSection=__stsCreateExperimentalSection(()=>({react: React, TextArea: TextArea, CollapsibleSection: CollapsibleSection, NumberInput: NumberInput, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var PresetConfiguration=__stsCreatePresetConfiguration(()=>({react: React, GenerationControlSection: GenerationControlSection, InstructSection: InstructSection, SamplingSection: SamplingSection, ExperimentalSection: ExperimentalSection, PresetBasicSection: PresetBasicSection, jsxRuntime}));
  var InlineCopyButton=__stsCreateInlineCopyButton(()=>({react: React, jsxRuntime}));
  var MacroReference=__stsCreateMacroReference(()=>({react: React, macroReference: macroReference, InlineCopyButton: InlineCopyButton, jsxRuntime}));
  var PromptEditDialog=__stsCreatePromptEditDialog(()=>({useDialogFocus: useDialogFocus, react: React, TextInput: TextInput, TextArea: TextArea, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var PromptListItem=__stsCreatePromptListItem(()=>({react: React, jsxRuntime, ToggleSwitch: ToggleSwitch}));
  var PromptPreview=__stsCreatePromptPreview(()=>({react: React, CopyButton: CopyButton, jsxRuntime}));
  var PromptManager=__stsCreatePromptManager(()=>({EntrySelectionControl: EntrySelectionControl, react: React, MacroReference: MacroReference, PromptEditDialog: PromptEditDialog, PromptPreview: PromptPreview, PromptListItem: PromptListItem, useToast, jsxRuntime}));
  var PresetTab=__stsCreatePresetTab(jsxRuntime);
  var PresetNameDialog=__stsCreatePresetNameDialog(()=>({useDialogFocus: useDialogFocus, react: React, jsxRuntime}));
  var PresetScreen=__stsCreatePresetScreen(()=>({react: React, jsxRuntime, useToast, presetStore, FileNameDialog: FileNameDialog, PresetTab: PresetTab, PromptManager: PromptManager, Icon: Icon, PresetConfiguration: PresetConfiguration, LoadingIndicator: LoadingIndicator, PresetNameDialog: PresetNameDialog}));
  var LorebookListItem=__stsCreateLorebookListItem(()=>({jsxRuntime}));
  var LorebookUploadControl=__stsCreateLorebookUploadControl(()=>({LoadingIndicator: LoadingIndicator, jsxRuntime}));
  var LorebookLibrary=__stsCreateLorebookLibrary(()=>({LorebookUploadControl: LorebookUploadControl, FileNameDialog: FileNameDialog, LorebookListItem: LorebookListItem, LorebookManager: LorebookManager, LorebookEntryList: LorebookEntryList, characterStore, useToast, react: React, Icon: Icon, lorebookStore, jsxRuntime}));
  var PersonaEditor=__stsCreatePersonaEditor(()=>({jsxRuntime, TextInput: TextInput, TextArea: TextArea}));
  var PersonaScreen=__stsCreatePersonaScreen(()=>({react: React, jsxRuntime, personaStore, PersonaEditor: PersonaEditor, LoadingIndicator: LoadingIndicator, ToggleSwitch: ToggleSwitch}));
  return {
    PresetBasicSection, NumberInput, SamplingSection, StringListInput,
    GenerationControlSection, InstructSection, ExperimentalSection, PresetConfiguration,
    InlineCopyButton, MacroReference, PromptEditDialog, PromptListItem,
    PromptPreview, PromptManager, PresetTab, PresetNameDialog,
    PresetScreen, LorebookListItem, LorebookUploadControl, LorebookLibrary,
    PersonaEditor, PersonaScreen
  };
}
