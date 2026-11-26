import { createActionProposal as __stsCreateActionProposal } from "../../../features/rpg/ui/actions/action-proposal.js";
import { createActionSuggestionDialog as __stsCreateActionSuggestionDialog } from "../../../features/rpg/ui/actions/action-suggestion-dialog.js";
import { createRpgTableEditor as __stsCreateRpgTableEditor } from "../../../features/rpg/ui/database/rpg-table-editor.js";
import { createRpgTableRow as __stsCreateRpgTableRow } from "../../../features/rpg/ui/database/rpg-table-row.js";
import { createRpgHud as __stsCreateRpgHud } from "../../../features/rpg/ui/rpg-hud.js";
import { createRpgImportDialog as __stsCreateRpgImportDialog } from "../../../features/rpg/ui/rpg-import-dialog.js";
import { createVariableHud as __stsCreateVariableHud } from "../../../features/rpg/ui/variables/variable-hud.js";
import { createVariableTree as __stsCreateVariableTree } from "../../../features/rpg/ui/variables/variable-tree.js";
import { buildSavedProbeTarget as __stsBuildSavedProbeTarget } from "../../../ui/settings/model-test-button.js";
import { createTableCellInput as __stsCreateTableCellInput } from "../../../ui/components/form-controls.js";
import { createActionProposalPrompt } from '../../../features/rpg/action-proposal-prompt.js';

export function composeRpgActionsUi({
  React, jsxRuntime, characterStore, presetStore,
  markdownParser, defaultGeminiModels, htmlSanitizer, __stsConnections,
  __stsProxyPersistence, useGeminiCatalog, __stsGenerationGateway, GoogleGenAI,
  nextGeminiKey, sessionStore, parseRelaxedJson, buildLinkedLorebookEntries
}, {
  Icon, useToast, __stsModelTestButton, LoadingIndicator
}) {
  var { prompt: defaultCopilotSystemPrompt } = createActionProposalPrompt({});
  var ActionProposal=__stsCreateActionProposal(()=>({react: React, jsxRuntime, Icon: Icon}));
  var ActionSuggestionDialog=__stsCreateActionSuggestionDialog(()=>({react: React, jsxRuntime, useToast, characterStore, presetStore, markdownParser: markdownParser, ModelTestButton: __stsModelTestButton, ActionProposal: ActionProposal, defaultCopilotSystemPrompt: defaultCopilotSystemPrompt, defaultGeminiModels: defaultGeminiModels, htmlSanitizer: htmlSanitizer, connections: __stsConnections, proxyPersistence: __stsProxyPersistence, buildSavedProbeTarget: __stsBuildSavedProbeTarget, useGeminiCatalog: useGeminiCatalog, Icon: Icon, LoadingIndicator: LoadingIndicator, testModel: __stsGenerationGateway.testModel, GoogleGenAIClient: GoogleGenAI, getGeminiApiKey: nextGeminiKey}));
  var VariableTree=__stsCreateVariableTree(()=>({react: React, jsxRuntime}));
  var VariableHud=__stsCreateVariableHud(()=>({jsxRuntime, VariableTree: VariableTree, Icon: Icon}));
  var TableCellInput=__stsCreateTableCellInput(jsxRuntime);
  var RpgTableRow=__stsCreateRpgTableRow(()=>({jsxRuntime, RpgCellEditor: TableCellInput, Icon: Icon}));
  var RpgTableEditor=__stsCreateRpgTableEditor(()=>({react: React, jsxRuntime, useToast, sessionStore, RpgTableRow: RpgTableRow, Icon: Icon}));
  var RpgImportDialog=__stsCreateRpgImportDialog(()=>({react: React, jsxRuntime, useToast, parseLooseJson: parseRelaxedJson, Icon: Icon}));
  var RpgHud=__stsCreateRpgHud(()=>({react: React, jsxRuntime, useToast, sessionStore, characterStore, RpgImportDialog: RpgImportDialog, RpgTableEditor: RpgTableEditor, Icon: Icon, buildGeneratedLorebookEntries: buildLinkedLorebookEntries}));
  return {
    defaultCopilotSystemPrompt, ActionProposal, ActionSuggestionDialog, VariableTree,
    VariableHud, TableCellInput, RpgTableRow, RpgTableEditor,
    RpgImportDialog, RpgHud
  };
}
