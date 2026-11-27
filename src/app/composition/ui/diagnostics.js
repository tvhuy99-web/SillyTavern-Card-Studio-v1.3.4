import { createDiagnosticsDialog as __stsCreateDiagnosticsDialog } from "../../../diagnostics/ui/diagnostics-dialog.js";
import { createMythicLogPanel as __stsCreateMythicLogPanel, createMythicLogItem as __stsCreateMythicLogItem } from "../../../diagnostics/ui/mythic-log-panel.js";
import { createNetworkLogPanel as __stsCreateNetworkLogPanel, createNetworkLogItem as __stsCreateNetworkLogItem } from "../../../diagnostics/ui/network-log-panel.js";
import { createPromptSectionView as __stsCreatePromptSectionView, createPromptLogPanel as __stsCreatePromptLogPanel } from "../../../diagnostics/ui/prompt-log-panel.js";
import { createResponseLogPanel as __stsCreateResponseLogPanel } from "../../../diagnostics/ui/response-log-panel.js";
import { createSummaryLogPanel as __stsCreateSummaryLogPanel } from "../../../diagnostics/ui/summary-log-panel.js";
import { createSystemLogPanel as __stsCreateSystemLogPanel } from "../../../diagnostics/ui/system-log-panel.js";
import { createWorldInfoLogPanel as __stsCreateWorldInfoLogPanel, createWorldInfoScanPanel as __stsCreateWorldInfoScanPanel, createSmartScanLogPanel as __stsCreateSmartScanLogPanel, createSmartScanLogItem as __stsCreateSmartScanLogItem } from "../../../diagnostics/ui/world-info-log-panel.js";
import { createGenerateEntryButton as __stsCreateGenerateEntryButton } from "../../../features/world-info/ui/generate-entry-button.js";
import { redactNetworkLog } from '../../../diagnostics/network-redaction.js';

export function composeDiagnosticsUi({
  React, jsxRuntime, formatDiagnostic, normalizeDiagnostic,
  diagnosticStorageKey, getSmartContextSettings
}, {
  CopyButton, LoadOlderButton, formatTimestamp, Icon,
  TokenCountControl
}) {
  var PromptSectionView=__stsCreatePromptSectionView(()=>({react: React, jsxRuntime, CopyButton: CopyButton}));
  var SystemLogPanel=__stsCreateSystemLogPanel(()=>({react: React, jsxRuntime, formatDiagnostic: formatDiagnostic, normalizeDiagnostic: normalizeDiagnostic, diagnosticStorageKey: diagnosticStorageKey, LoadOlderButton: LoadOlderButton, formatTimestamp: formatTimestamp}));
  var NetworkLogItem=__stsCreateNetworkLogItem(React,()=>({react: React, jsxRuntime, redactNetworkLog: redactNetworkLog, Icon: Icon, CopyButton: CopyButton}));
  var NetworkLogPanel=__stsCreateNetworkLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, NetworkLogItem: NetworkLogItem}));
  var SmartScanLogItem=__stsCreateSmartScanLogItem(React,()=>({react: React, jsxRuntime, CopyButton: CopyButton}));
  var SmartScanLogPanel=__stsCreateSmartScanLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, SmartScanLogItem: SmartScanLogItem}));
  var MythicLogItem=__stsCreateMythicLogItem(React,()=>({react: React, jsxRuntime, Icon: Icon, PromptSectionView: PromptSectionView, CopyButton: CopyButton}));
  var MythicLogPanel=__stsCreateMythicLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, MythicLogItem: MythicLogItem}));
  var SummaryLogPanel=__stsCreateSummaryLogPanel(()=>({react: React, jsxRuntime, Icon: Icon, getSmartContextSettings: getSmartContextSettings, PromptSectionView: PromptSectionView, CopyButton: CopyButton}));
  var WorldInfoLogPanel=__stsCreateWorldInfoLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, CopyButton: CopyButton}));
  var GenerateEntryButton=__stsCreateGenerateEntryButton(jsxRuntime);
  var PromptLogPanel=__stsCreatePromptLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, TokenCountControl: TokenCountControl, PromptSectionView: PromptSectionView, CopyButton: CopyButton}));
  var ResponseLogPanel=__stsCreateResponseLogPanel(()=>({react: React, jsxRuntime, LoadOlderButton: LoadOlderButton, CopyButton: CopyButton}));
  var WorldInfoScanPanel=__stsCreateWorldInfoScanPanel(()=>({react: React, jsxRuntime, Icon: Icon}));
  var DiagnosticsDialog=__stsCreateDiagnosticsDialog(()=>({react: React, jsxRuntime, ResponseLogPanel: ResponseLogPanel, WorldInfoScanPanel: WorldInfoScanPanel, PromptLogPanel: PromptLogPanel, SummaryLogPanel: SummaryLogPanel, SmartScanLogPanel: SmartScanLogPanel, NetworkLogPanel: NetworkLogPanel, GenerateEntryButton: GenerateEntryButton, Icon: Icon, SystemLogPanel: SystemLogPanel, MythicLogPanel: MythicLogPanel}));
  return {
    PromptSectionView, SystemLogPanel, NetworkLogItem, NetworkLogPanel,
    SmartScanLogItem, SmartScanLogPanel, MythicLogItem, MythicLogPanel,
    SummaryLogPanel, WorldInfoLogPanel, GenerateEntryButton, PromptLogPanel,
    ResponseLogPanel, WorldInfoScanPanel, DiagnosticsDialog
  };
}
