export function createChatHud(react, getDependencies) {
  return react.forwardRef(function ChatHud({ uiState, data, actions }, forwardedRef) {
    const {
      VariableHud,
      RpgHud,
      ActionSuggestionDialog,
      ChatDialogs,
      InteractiveErrorDialog,
      jsxRuntime,
      CardPreviewDialog,
    } = getDependencies();

    const combinedWorldInfoEntries = [
      ...(data.card.char_book?.entries || []),
      ...(data.generatedLorebookEntries || []),
    ];

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        jsxRuntime.jsx(ChatDialogs, {
          isAuthorNoteOpen: uiState.isAuthorNoteOpen,
          setIsAuthorNoteOpen: uiState.setIsAuthorNoteOpen,
          authorNote: data.authorNote,
          updateAuthorNote: actions.updateAuthorNote,
          isWorldInfoOpen: uiState.isWorldInfoOpen,
          setIsWorldInfoOpen: uiState.setIsWorldInfoOpen,
          worldInfoEntries: combinedWorldInfoEntries,
          worldInfoState: data.worldInfoState,
          worldInfoPinned: data.worldInfoPinned,
          worldInfoPlacement: data.worldInfoPlacement,
          updateWorldInfoState: actions.updateWorldInfoState,
          updateWorldInfoPinned: actions.updateWorldInfoPinned,
          updateWorldInfoPlacement: actions.updateWorldInfoPlacement,
          isLorebookCreatorOpen: uiState.isLorebookCreatorOpen,
          setIsLorebookCreatorOpen: uiState.setIsLorebookCreatorOpen,
          lorebookKeyword: uiState.lorebookKeyword,
          setLorebookKeyword: uiState.setLorebookKeyword,
          messages: data.messages,
          longTermSummaries: data.longTermSummaries,
          lorebooks: data.lorebooks,
          characterId: data.card.fileName || data.card.name,
        }),
        jsxRuntime.jsx(ActionSuggestionDialog, {
          isOpen: uiState.isAssistantOpen,
          onClose: () => uiState.setIsAssistantOpen(false),
          gameHistory: data.messages,
          card: data.card,
          variables: data.variables,
          logs: data.logs,
          onUpdateVariable: actions.handleUpdateVariable,
          onRewriteMessage: actions.handleRewriteLastTurn,
        }),
        jsxRuntime.jsx(VariableHud, {
          variables: data.variables,
          isOpen: uiState.isHUDOpen,
          onClose: () => uiState.setIsHUDOpen(false),
        }),
        jsxRuntime.jsx(RpgHud, {
          data: data.card.rpg_data,
          isOpen: uiState.isRpgDashboardOpen,
          onClose: () => uiState.setIsRpgDashboardOpen(false),
        }),
        jsxRuntime.jsx(CardPreviewDialog, {
          ref: forwardedRef,
          isOpen: uiState.isStatusHUDOpen,
          onClose: () => uiState.setIsStatusHUDOpen(false),
          htmlContent: data.lastInteractiveMsg?.interactiveHtml || '',
          scripts: data.card.extensions?.TavernHelper_scripts || [],
          originalRawContent: data.lastInteractiveMsg?.originalRawContent || '',
          variables: data.variables,
          extensionSettings: data.extensionSettings,
          characterName: data.card.name,
          userPersonaName: data.userPersonaName,
          characterId: data.card.fileName || data.card.name,
          sessionId: data.sessionId,
          characterAvatarUrl: data.characterAvatarUrl,
          userAvatarUrl: data.userPersonaAvatarUrl,
          embeddedAssets: data.card.__embedded_assets || {},
          characterCard: data.card,
          chatHistory: data.messages,
          messageId: data.lastInteractiveMsg
            ? data.messages.indexOf(data.lastInteractiveMsg)
            : Math.max(0, data.messages.length - 1),
        }),
        jsxRuntime.jsx(InteractiveErrorDialog, {
          errorState: data.interactiveError,
          onRetry: () => actions.handleUserDecision('retry'),
          onIgnore: () => actions.handleUserDecision('ignore'),
        }),
      ],
    });
  });
}
