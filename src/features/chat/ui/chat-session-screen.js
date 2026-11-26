import { summaryChunkSize } from '../history-policy.js';

export function createChatSessionScreen(getDependencies) {
  return function ChatSessionScreen({ sessionId, onBack }) {
    const {
      parseLooseJson,
      isProxyForToolsEnabled,
      mutateVariable,
      RpgNotificationBanner,
      callProxyToolModel,
      DiagnosticsFooter,
      defaultRefinementPrompt,
      syncLorebookEmbeddings,
      ChatHud,
      WritingRefinementDialog,
      defaultActionSuggestionPrompt,
      aiStudioToolText,
      defaultGeminiSafetySettings,
      MessageList,
      getSmartScanSettings,
      react,
      extractStoryContent,
      ChatVisualBackdrop,
      callGeminiToolModel,
      countConversationTurns,
      useToast,
      characterStore,
      ChatWorkspaceFrame,
      useChatSession,
      getLiterarySettings,
      LoadingIndicator,
      ChatHeader,
      getConnectionSettings,
      getSummarySettings,
      ChatComposer,
      lorebookStore,
      getActionSuggestionSettings,
      jsxRuntime,
      getGeminiApiKey,
    } = getDependencies();

    const session = useChatSession(sessionId);

    const [isImmersive, setIsImmersive] = react.useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = react.useState(false);
    const [isHUDOpen, setIsHUDOpen] = react.useState(false);
    const [isStatusHUDOpen, setIsStatusHUDOpen] = react.useState(false);
    const [isRpgDashboardOpen, setIsRpgDashboardOpen] = react.useState(false);
    const [isAuthorNoteOpen, setIsAuthorNoteOpen] = react.useState(false);
    const [isWorldInfoOpen, setIsWorldInfoOpen] = react.useState(false);
    const [isLorebookCreatorOpen, setIsLorebookCreatorOpen] = react.useState(false);
    const [lorebookKeyword, setLorebookKeyword] = react.useState('');
    const [editingMessageId, setEditingMessageId] = react.useState(null);
    const [editingContent, setEditingContent] = react.useState('');

    const toggleHUD = react.useCallback(() => setIsHUDOpen(open => !open), []);
    const toggleStatusHUD = react.useCallback(() => setIsStatusHUDOpen(open => !open), []);
    const toggleAssistant = react.useCallback(() => setIsAssistantOpen(open => !open), []);
    const toggleRpgDashboard = react.useCallback(() => setIsRpgDashboardOpen(open => !open), []);
    const startEditing = react.useCallback(message => {
      setEditingMessageId(message.id);
      setEditingContent(message.content);
    }, []);
    const cancelEditing = react.useCallback(() => {
      setEditingMessageId(null);
      setEditingContent('');
    }, []);

    const uiState = {
      isImmersive,
      setIsImmersive,
      isAssistantOpen,
      setIsAssistantOpen,
      toggleAssistant,
      isHUDOpen,
      setIsHUDOpen,
      toggleHUD,
      isStatusHUDOpen,
      setIsStatusHUDOpen,
      toggleStatusHUD,
      isRpgDashboardOpen,
      setIsRpgDashboardOpen,
      toggleRpgDashboard,
      isAuthorNoteOpen,
      setIsAuthorNoteOpen,
      isWorldInfoOpen,
      setIsWorldInfoOpen,
      isLorebookCreatorOpen,
      setIsLorebookCreatorOpen,
      lorebookKeyword,
      setLorebookKeyword,
      editingMessageId,
      editingContent,
      setEditingContent,
      startEditing,
      cancelEditing,
    };

    const { characters } = characterStore();
    const { lorebooks } = lorebookStore();
    const iframeRefs = react.useRef({});
    const [isSyncingLorebook, setIsSyncingLorebook] = react.useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = react.useState(false);
    const [isRefiningWriting, setIsRefiningWriting] = react.useState(false);
    const [refinementDialogState, setRefinementDialogState] = react.useState({
      isOpen: false,
      originalFullContent: '',
      originalTextToRefine: '',
      refinedText: '',
      messageId: '',
    });
    const { showToast } = useToast();

    react.useEffect(() => {
      const scanSettings = getSmartScanSettings();
      const semanticActive = scanSettings.enabled
        && ['semantic', 'hybrid_fast', 'ultimate'].includes(scanSettings.mode);
      const apiKey = getGeminiApiKey();
      if (semanticActive && apiKey && session.card?.char_book?.entries) {
        const enabledEntries = session.card.char_book.entries.filter(entry => entry.enabled !== false);
        syncLorebookEmbeddings(session.card.fileName || session.card.name, enabledEntries).catch(error => {
          console.error('Background character lorebook sync failed:', error);
          showToast(`Không thể đồng bộ Lorebook: ${error.message || error}`, 'error');
        });
      }
    }, [session.card?.fileName, session.card?.name, session.card?.char_book?.entries]);

    react.useEffect(() => () => {
      session.resetStore();
    }, [session.resetStore]);

    const characterAvatarUrl = react.useMemo(
      () => (session.card && characters.find(item => item.fileName === session.card.fileName)?.avatarUrl) || null,
      [session.card, characters],
    );

    const lastInteractiveMessage = react.useMemo(
      () => [...session.messages].reverse().find(message => message.interactiveHtml),
      [session.messages],
    );

    const summarySettings = getSummarySettings();
    const contextDepth = summarySettings.context_depth || 24;
    const resolvedChunkSize = summaryChunkSize(summarySettings, session);
    const unsummarizedTurnCount = react.useMemo(() => {
      const totalTurns = countConversationTurns(session.messages);
      const summarizedTurns = session.longTermSummaries.length * resolvedChunkSize;
      return Math.max(0, totalTurns - summarizedTurns);
    }, [session.messages, session.longTermSummaries.length, resolvedChunkSize]);

    const isInitialLoading = session.isLoading && (!session.card || !session.preset);

    const runWritingRefinement = async textToRefine => {
      setIsRefiningWriting(true);
      try {
        const literarySettings = getLiterarySettings();
        const prompt = (literarySettings.writing_refinement_prompt || defaultRefinementPrompt)
          .replace('{{content}}', textToRefine);
        const connSettings = getConnectionSettings();
        let refinedOutput = '';

        if (connSettings.source === 'aistudio') {
          refinedOutput = await aiStudioToolText(
            prompt,
            connSettings.aistudio_tool_model || connSettings.aistudio_model || 'gemini-2.5-flash',
          );
        } else if (isProxyForToolsEnabled() || connSettings.source === 'proxy') {
          refinedOutput = await callProxyToolModel(
            prompt,
            connSettings.proxy_tool_model || connSettings.proxy_model || 'gemini-3-flash-preview',
            connSettings.proxy_protocol,
          );
        } else {
          const response = await callGeminiToolModel(
            literarySettings.gemini_model || 'gemini-3-flash-preview',
            prompt,
            { temp: 0.7 },
            defaultGeminiSafetySettings,
          );
          refinedOutput = response.text || '';
        }

        setRefinementDialogState(previous => ({
          ...previous,
          refinedText: refinedOutput.trim() || '',
        }));
      } catch (error) {
        showToast(`Lỗi khi cải thiện: ${error.message}`, 'error');
      } finally {
        setIsRefiningWriting(false);
      }
    };

    const closeRefinementDialog = () => {
      setRefinementDialogState(previous => ({ ...previous, isOpen: false }));
    };

    const handleSyncLorebook = async () => {
      if (!session.card || !session.card.char_book) {
        showToast('Không tìm thấy Lorebook để đồng bộ.', 'error');
        return;
      }
      const scanSettings = getSmartScanSettings();
      if (!scanSettings.enabled || !['semantic', 'hybrid_fast', 'ultimate'].includes(scanSettings.mode)) {
        showToast('Smart Scan hoặc Semantic Search đang tắt.', 'info');
        return;
      }
      setIsSyncingLorebook(true);
      try {
        const enabledEntries = session.card.char_book.entries.filter(entry => entry.enabled !== false);
        await syncLorebookEmbeddings(session.card.fileName || session.card.name, enabledEntries);
        showToast('Đồng bộ Lorebook Ngữ nghĩa thành công!', 'success');
      } catch (error) {
        console.error('Failed to sync lorebook embeddings:', error);
        if (error.message?.includes('API Key')) {
          showToast('Vui lòng cấu hình Gemini API Key trong phần Cài đặt.', 'error');
        } else {
          showToast(`Gặp lỗi khi đồng bộ Lorebook: ${error.message || 'Lỗi không xác định'}`, 'error');
        }
      } finally {
        setIsSyncingLorebook(false);
      }
    };

    const handleFetchActionSuggestions = async userDraftInput => {
      setIsFetchingSuggestions(true);
      try {
        const recentHistory = session.messages
          .slice(-15)
          .map(message => `${message.role}: ${extractStoryContent(message.content)}`)
          .join('\n\n');
        const summaryText = session.longTermSummaries.join('\n\n');
        let activeLoreText = '';
        const latestModelMsg = session.messages.slice().reverse().find(message => message.role === 'model');
        if (latestModelMsg?.activeLorebookUids?.length > 0) {
          activeLoreText = lorebooks
            .flatMap(book => book.book.entries.filter(entry => latestModelMsg.activeLorebookUids.includes(entry.uid)))
            .map(entry => `[${entry.keys.join(', ')}: ${entry.content}]`)
            .join('\n');
        }

        const suggestionSettings = getActionSuggestionSettings();
        const prompt = (suggestionSettings.action_suggestion_prompt || defaultActionSuggestionPrompt)
          .replace('{{long_term_summary}}', summaryText || '(Không có)')
          .replace('{{current_page_history}}', recentHistory)
          .replace('{{worldInfo}}', activeLoreText || '(Không có)')
          .replace('{{user_input}}', userDraftInput || '(Không có)');

        const connSettings = getConnectionSettings();
        let rawResponse = '';
        if (connSettings.source === 'aistudio') {
          rawResponse = await aiStudioToolText(
            prompt,
            connSettings.aistudio_tool_model || connSettings.aistudio_model || 'gemini-2.5-flash',
          );
        } else if (connSettings.source === 'proxy') {
          rawResponse = await callProxyToolModel(
            prompt,
            connSettings.proxy_tool_model || connSettings.proxy_model || 'gemini-3-flash-preview',
            connSettings.proxy_protocol,
          );
        } else {
          const response = await callGeminiToolModel(
            suggestionSettings.gemini_model || 'gemini-3-flash-preview',
            prompt,
            { temp: 0.8 },
            defaultGeminiSafetySettings,
          );
          rawResponse = response.text || '{"suggestions":[]}';
        }

        const unwrapped = rawResponse.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
        try {
          const parsed = parseLooseJson(unwrapped);
          if (parsed && Array.isArray(parsed.suggestions)) {
            return parsed.suggestions
              .map(item => {
                const choiceMatch = item.match(/\[CHOICE:\s*"?([^"\]]+)"?\]/);
                return choiceMatch
                  ? choiceMatch[1].trim()
                  : item.replace(/\[CHOICE:\s*"?/, '').replace(/"?\]$/, '').trim();
              })
              .filter(Boolean);
          }
        } catch (error) {
          console.warn('Failed to parse action suggestions JSON:', error, unwrapped);
        }
        return [];
      } catch (error) {
        console.error('Action suggestions failed:', error);
        showToast('Lỗi khi lấy gợi ý hành động. Vui lòng thử lại.', 'error');
        return [];
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    const handleOpenWritingRefinement = async () => {
      const latestMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
      if (!latestMessage || latestMessage.role !== 'model') {
        showToast('Chỉ có thể cải thiện tin nhắn cuối cùng của AI.', 'info');
        return;
      }
      const contentMatch = latestMessage.content.match(/<content>([\s\S]*?)<\/content>/i);
      if (!contentMatch) {
        showToast('Không tìm thấy thẻ <content> trong phản hồi của AI.', 'info');
        return;
      }
      const innerContent = contentMatch[1].trim();
      setRefinementDialogState({
        isOpen: true,
        originalFullContent: latestMessage.content,
        originalTextToRefine: innerContent,
        refinedText: '',
        messageId: latestMessage.id,
      });
      runWritingRefinement(innerContent);
    };

    if (isInitialLoading) {
      return jsxRuntime.jsx('div', {
        className: 'flex justify-center items-center h-full',
        children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải phiên trò chuyện...' }),
      });
    }

    if (!session.card || !session.preset) {
      return jsxRuntime.jsx('div', {
        className: 'flex flex-col justify-center items-center h-full gap-4 text-amber-400 bg-slate-900',
        children: jsxRuntime.jsxs('div', {
          className: 'p-6 bg-slate-800 rounded-xl shadow-lg border border-slate-700 max-w-md text-center',
          children: [
            jsxRuntime.jsx('div', { className: 'text-4xl mb-4', children: '🚫' }),
            jsxRuntime.jsx('p', {
              className: 'font-bold text-xl text-white mb-2',
              children: 'Dữ liệu không khả dụng',
            }),
            jsxRuntime.jsxs('p', {
              className: 'text-slate-400 mb-6 text-sm',
              children: [
                'Hệ thống không tìm thấy ',
                jsxRuntime.jsxs('strong', {
                  children: [
                    session.card ? '' : 'Thẻ nhân vật',
                    ' ',
                    session.card || session.preset ? '' : 'và',
                    ' ',
                    session.preset ? '' : 'Preset',
                  ],
                }),
                ' tương ứng.',
                jsxRuntime.jsx('br', {}),
                jsxRuntime.jsx('span', {
                  className: 'text-xs opacity-75 mt-2 block',
                  children: '(Lỗi này thường xảy ra nếu bạn đã xóa file gốc sau khi tạo cuộc trò chuyện).',
                }),
              ],
            }),
            jsxRuntime.jsx('button', {
              onClick: onBack,
              className: 'w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg ',
              children: 'Quay lại Sảnh',
            }),
          ],
        }),
      });
    }

    return jsxRuntime.jsxs(ChatWorkspaceFrame, {
      isImmersive,
      globalClass: session.visualState.globalClass,
      children: [
        jsxRuntime.jsx(ChatVisualBackdrop, {
          visualState: session.visualState,
          isImmersive,
        }),
        jsxRuntime.jsx(RpgNotificationBanner, {}),
        jsxRuntime.jsx(ChatHeader, {
          characterName: session.card.name,
          onBack: () => {
            session.saveSession({});
            onBack();
          },
          isImmersive,
          setIsImmersive,
          visualState: session.visualState,
          onVisualUpdate: session.updateVisualState,
          onToggleHUD: toggleHUD,
          isHUDOpen,
          onToggleStatusHUD: toggleStatusHUD,
          isStatusHUDOpen,
          activePresetName: session.preset.name,
          onPresetChange: session.changePreset,
          activePersonaId: session.persona?.id,
          onPersonaChange: session.changePersona,
          onToggleAssistant: toggleAssistant,
          isAssistantOpen,
          hasRpgData: Boolean(session.card.rpg_data),
          onToggleRpgDashboard: toggleRpgDashboard,
          isRpgDashboardOpen,
          onSyncLorebook: handleSyncLorebook,
          isSyncingLorebook,
        }),
        jsxRuntime.jsx(MessageList, {
          messages: session.messages,
          isLoading: session.isLoading,
          isSummarizing: session.isSummarizing,
          isImmersive,
          characterName: session.card.name,
          characterAvatarUrl,
          userAvatarUrl: session.persona?.avatar,
          embeddedAssets: session.card.__embedded_assets || {},
          userPersonaName: session.persona?.name || 'User',
          characterId: session.card.fileName || session.card.name,
          sessionId,
          editingMessageId,
          editingContent,
          setEditingContent,
          onStartEdit: startEditing,
          onCancelEdit: cancelEditing,
          onSaveEdit: async () => {
            if (editingMessageId) {
              const saved = await session.editMessage(editingMessageId, editingContent);
              if (saved !== false) {
                cancelEditing();
              }
            }
          },
          regenerateLastResponse: session.regenerateLastResponse,
          deleteLastTurn: session.deleteLastTurn,
          onDeleteMessage: session.deleteMessage,
          onDeleteSingleMessage: session.deleteOneMessage,
          onOpenAuthorNote: () => setIsAuthorNoteOpen(true),
          onOpenWorldInfo: () => setIsWorldInfoOpen(true),
          onArenaSelect: session.handleArenaSelection,
          onArenaRetry: session.handleArenaRetry,
          disableInteractiveMode: session.visualState.disableInteractiveMode,
          scripts: session.card.extensions?.TavernHelper_scripts || [],
          variables: session.variables,
          extensionSettings: session.extensionSettings,
          characterCard: session.card,
          preset: session.preset,
          persona: session.persona,
          iframeRefs,
          onIframeLoad: () => {},
        }),
        jsxRuntime.jsx(ChatComposer, {
          onSend: text => (text.trim().startsWith('/') ? session.executeSlashCommands(text) : session.sendMessage(text)),
          onStop: session.stopGeneration,
          isLoading: session.isLoading,
          isImmersive,
          quickReplies: session.quickReplies,
          onQuickReplyClick: reply => (
            reply.action ? session.executeSlashCommands(reply.action) : session.sendMessage(reply.message || reply.label)
          ),
          scriptButtons: session.scriptButtons,
          onScriptButtonClick: session.handleScriptButtonClick,
          authorNote: session.authorNote,
          onUpdateAuthorNote: session.updateAuthorNote,
          isSummarizing: session.isSummarizing,
          isInputLocked: session.isInputLocked,
          isAutoLooping: session.isAutoLooping,
          onToggleAutoLoop: () => session.setIsAutoLooping(!session.isAutoLooping),
          queueLength: session.queueLength,
          isStoryMode: session.isStoryMode,
          storyQueueLength: session.storyQueue ? session.storyQueue.length : 0,
          onNextStoryChunk: session.advanceStoryChunk,
          onCancelStoryMode: session.cancelStoryMode,
          error: session.error,
          onClearError: () => session.setError(null),
          isSyncingLorebook,
          onFetchActionSuggestions: handleFetchActionSuggestions,
          isFetchingSuggestions,
          suggestionSettingsEnabled: getActionSuggestionSettings().enabled,
          onRefineWriting: handleOpenWritingRefinement,
          isRefiningWriting,
          writingRefinementEnabled: getLiterarySettings().enabled,
          children: jsxRuntime.jsx(DiagnosticsFooter, {
            logs: session.logs,
            messages: session.messages,
            onClearLogs: session.clearLogs,
            onInspectState: () => setIsHUDOpen(true),
            isImmersive,
            onLorebookCreatorOpen: () => setIsLorebookCreatorOpen(true),
            summaryStats: {
              messageCount: unsummarizedTurnCount,
              summaryCount: session.longTermSummaries.length,
              contextDepth,
              chunkSize: resolvedChunkSize,
              queueLength: session.queueLength,
            },
            longTermSummaries: session.longTermSummaries,
            summaryQueue: session.summaryQueue,
            onForceSummarize: session.triggerSmartContext,
            onRegenerateSummary: session.handleRegenerateSummary,
            onRetryFailedTask: session.handleRetryFailedTask,
            onRetryMythic: session.handleRetryMythic,
          }),
        }),
        jsxRuntime.jsx(ChatHud, {
          ref: hudElement => {
            if (hudElement) {
              iframeRefs.current.hud = hudElement;
            }
          },
          uiState,
          data: {
            card: session.card,
            messages: session.messages,
            longTermSummaries: session.longTermSummaries,
            lorebooks,
            authorNote: session.authorNote,
            worldInfoState: session.worldInfoState,
            worldInfoPinned: session.worldInfoPinned,
            worldInfoPlacement: session.worldInfoPlacement,
            variables: session.variables,
            logs: session.logs,
            lastInteractiveMsg: lastInteractiveMessage,
            characterAvatarUrl,
            userPersonaAvatarUrl: session.persona?.avatar || null,
            userPersonaName: session.persona?.name || 'User',
            sessionId,
            extensionSettings: session.extensionSettings,
            interactiveError: session.interactiveError,
            generatedLorebookEntries: session.generatedLorebookEntries,
          },
          actions: {
            updateAuthorNote: session.updateAuthorNote,
            updateWorldInfoState: session.updateWorldInfoState,
            updateWorldInfoPinned: session.updateWorldInfoPinned,
            updateWorldInfoPlacement: session.updateWorldInfoPlacement,
            handleUpdateVariable: (key, value) => {
              try {
                const updatedVariables = mutateVariable(session.variables, 'set', key, value);
                session.setVariables(updatedVariables);
                session.saveSession({ variables: updatedVariables });
              } catch (error) {
                console.error('Failed to update variable via Assistant:', error);
              }
            },
            handleRewriteLastTurn: session.editMessage,
            handleUserDecision: session.handleUserDecision,
          },
        }),
        jsxRuntime.jsx(WritingRefinementDialog, {
          isOpen: refinementDialogState.isOpen,
          originalText: refinementDialogState.originalTextToRefine,
          refinedText: refinementDialogState.refinedText,
          isLoading: isRefiningWriting,
          onConfirm: async () => {
            const { messageId, originalFullContent, refinedText } = refinementDialogState;
            if (!refinedText) return;
            const nextFullContent = originalFullContent.replace(
              /<content>[\s\S]*?<\/content>/i,
              `<content>\n${refinedText}\n</content>`,
            );
            await session.editMessage(messageId, nextFullContent);
            showToast('Đã áp dụng văn chương cải thiện!', 'success');
            setRefinementDialogState(previous => ({ ...previous, isOpen: false }));
          },
          onCancel: closeRefinementDialog,
          onRetry: () => {
            setRefinementDialogState(previous => ({ ...previous, refinedText: '' }));
            runWritingRefinement(refinementDialogState.originalTextToRefine);
          },
          onClose: closeRefinementDialog,
        }),
      ],
    });
  };
}
