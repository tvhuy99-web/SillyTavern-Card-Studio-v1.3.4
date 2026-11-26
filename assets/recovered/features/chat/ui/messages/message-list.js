export function createMessageList(react, getDependencies) {
  return react.memo(function MessageList({
    messages,
    isLoading,
    isSummarizing = false,
    isImmersive,
    characterName,
    characterAvatarUrl,
    userAvatarUrl,
    embeddedAssets = {},
    userPersonaName,
    characterId,
    sessionId,
    editingMessageId,
    editingContent,
    setEditingContent,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    regenerateLastResponse,
    onDeleteMessage,
    onDeleteSingleMessage,
    onOpenAuthorNote,
    onOpenWorldInfo,
    onArenaSelect,
    onArenaRetry,
    disableInteractiveMode = false,
    scripts,
    variables,
    extensionSettings,
    characterCard,
    preset,
    persona,
    iframeRefs,
    onIframeLoad,
  }) {
    const {
      getRuntimeEngineMode,
      StreamingHtmlPreview,
      ThinkingBlock,
      getCompatibilityMode,
      MessageActionMenu,
      compatibilityModeEvent,
      react: reactRuntime,
      CardFrame,
      runtimeEngineModeEvent,
      LoadingIndicator,
      ChatMessage,
      useSpeech,
      ReadAloudButton,
      jsxRuntime,
    } = getDependencies();

    const scrollAnchorRef = reactRuntime.useRef(null);
    const containerRef = reactRuntime.useRef(null);
    const previousMessageCountRef = reactRuntime.useRef(messages.length);
    const previousLastMessageIdRef = reactRuntime.useRef(
      messages.length > 0 ? messages[messages.length - 1].id : null,
    );
    const autoScrollTimerRef = reactRuntime.useRef(null);

    const { settings: speechSettings } = useSpeech();
    const isTtsEnabled = speechSettings.tts_enabled;
    const ttsVoice = speechSettings.tts_voice || 'Kore';
    const ttsProvider = speechSettings.tts_provider || 'gemini';
    const ttsNativeVoice = speechSettings.tts_native_voice || '';
    const ttsRate = speechSettings.tts_rate ?? 1;
    const ttsPitch = speechSettings.tts_pitch ?? 1;

    const [visibleCount, setVisibleCount] = reactRuntime.useState(10);
    const [manuallyActivatedMessageId, setManuallyActivatedMessageId] = reactRuntime.useState(null);
    const [compatibilityMode, setCompatibilityMode] = reactRuntime.useState(getCompatibilityMode);
    const [engineMode, setEngineMode] = reactRuntime.useState(getRuntimeEngineMode);
    const previousScrollHeightRef = reactRuntime.useRef(0);

    reactRuntime.useEffect(() => {
      setVisibleCount(10);
      setManuallyActivatedMessageId(null);
    }, [sessionId]);

    reactRuntime.useEffect(() => {
      const handleCompatibilityChange = event => {
        const nextMode = event.detail;
        if (nextMode === 'full' || nextMode === 'safe') {
          setCompatibilityMode(nextMode);
        }
      };
      const handleEngineChange = event => {
        const nextEngine = event.detail;
        if (nextEngine === 'current' || nextEngine === 'official-local') {
          setEngineMode(nextEngine);
        }
      };

      window.addEventListener(compatibilityModeEvent, handleCompatibilityChange);
      window.addEventListener(runtimeEngineModeEvent, handleEngineChange);
      return () => {
        window.removeEventListener(compatibilityModeEvent, handleCompatibilityChange);
        window.removeEventListener(runtimeEngineModeEvent, handleEngineChange);
      };
    }, []);

    reactRuntime.useLayoutEffect(() => {
      if (containerRef.current && previousScrollHeightRef.current > 0) {
        const scrollDelta = containerRef.current.scrollHeight - previousScrollHeightRef.current;
        containerRef.current.scrollTop += scrollDelta;
        previousScrollHeightRef.current = 0;
      }
    }, [visibleCount]);

    const visibleMessages = messages.slice(-visibleCount);
    const hasOlderMessages = messages.length > visibleCount;
    const interactiveMessageIds = visibleMessages
      .filter(msg => Boolean(msg.interactiveHtml) || Boolean(msg.interactiveHtmlBlocks?.length))
      .map(msg => msg.id);
    const recentInteractiveIds = interactiveMessageIds.slice(-4);
    const activeInteractiveIdSet = new Set(
      compatibilityMode === 'full'
        ? interactiveMessageIds
        : (manuallyActivatedMessageId && !recentInteractiveIds.includes(manuallyActivatedMessageId)
            ? [...recentInteractiveIds.slice(-3), manuallyActivatedMessageId]
            : recentInteractiveIds),
    );

    reactRuntime.useEffect(() => {
      const appendedMessages = messages.length > previousMessageCountRef.current;
      const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
      const latestMessageChanged = latestMessageId !== previousLastMessageIdRef.current;

      if ((appendedMessages || latestMessageChanged) && !editingMessageId) {
        if (autoScrollTimerRef.current) {
          clearTimeout(autoScrollTimerRef.current);
        }
        autoScrollTimerRef.current = setTimeout(() => {
          const container = containerRef.current;
          if (container && container.scrollHeight - container.scrollTop - container.clientHeight <= 320) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'auto',
            });
          }
          autoScrollTimerRef.current = null;
        }, 100);
      }

      previousMessageCountRef.current = messages.length;
      previousLastMessageIdRef.current = latestMessageId;

      return () => {
        if (autoScrollTimerRef.current) {
          clearTimeout(autoScrollTimerRef.current);
          autoScrollTimerRef.current = null;
        }
      };
    }, [messages, editingMessageId]);

    let latestModelMessageIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'model') {
        latestModelMessageIndex = index;
        break;
      }
    }
    const lastMessageIndex = messages.length - 1;

    const handleLoadMoreMessages = () => {
      if (containerRef.current) {
        previousScrollHeightRef.current = containerRef.current.scrollHeight;
      }
      setVisibleCount(count => count + 10);
    };

    const showLoadingPlaceholder = isLoading
      && (messages.length === 0
        || messages[messages.length - 1].role !== 'model'
        || (!messages[messages.length - 1].content && !messages[messages.length - 1].arena));

    return jsxRuntime.jsxs('div', {
      id: 'chat',
      ref: containerRef,
      role: 'region',
      'aria-label': 'Lịch sử trò chuyện',
      'aria-busy': isLoading ? 'true' : 'false',
      className: `flex-grow min-h-0 p-4 md:p-6 overflow-y-auto custom-scrollbar relative z-10 w-full ${
        isImmersive ? 'max-w-5xl mx-auto ' : ''
      }`,
      children: [
        hasOlderMessages && jsxRuntime.jsx('div', {
          className: 'flex justify-center mb-4',
          children: jsxRuntime.jsxs('button', {
            onClick: handleLoadMoreMessages,
            className: 'text-xs text-slate-500 hover:text-sky-400 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full  border border-slate-700/50',
            children: [
              'Tải thêm tin nhắn cũ (',
              Math.min(10, messages.length - visibleCount),
              '/',
              messages.length - visibleCount,
              ')',
            ],
          }),
        }),
        visibleMessages.map((message, visibleIndex) => {
          const absoluteIndex = messages.length - visibleMessages.length + visibleIndex;
          const isLastMessage = absoluteIndex === lastMessageIndex;
          const isLatestModelMessage = absoluteIndex === latestModelMessageIndex;
          const canRegenerate = !isLoading
            && !isSummarizing
            && message.role !== 'system'
            && (isLatestModelMessage || isLastMessage);
          const canDelete = !isLoading && !isSummarizing;
          const isMessageStreaming = isLoading && isLastMessage && message.role === 'model';

          const streamingPreviewHtml = null;
          const interactiveHtml = message.interactiveHtml || streamingPreviewHtml;
          const htmlBlocks = engineMode === 'official-local'
            ? (message.interactiveHtmlBlocks?.length
                ? message.interactiveHtmlBlocks
                : (interactiveHtml ? [interactiveHtml] : []))
            : (interactiveHtml ? [interactiveHtml] : []);

          const menuActions = [
            { label: 'Chỉnh sửa', onClick: () => onStartEdit(message) },
            { label: 'Ghi chú của Tác giả', onClick: onOpenAuthorNote },
            { label: 'Quản lý World Info', onClick: onOpenWorldInfo },
            {
              label: message.role === 'user' ? 'Gửi lại (Tạo lại)' : 'Tạo lại phản hồi',
              onClick: regenerateLastResponse,
              disabled: !canRegenerate,
            },
            {
              label: 'Xóa từ đây (Tua lại)',
              onClick: () => onDeleteMessage(message.id),
              disabled: !canDelete,
              className: 'text-red-400 hover:bg-red-800/50',
            },
          ];

          if (disableInteractiveMode) {
            menuActions.push({
              label: 'Xóa tin nhắn này',
              onClick: () => onDeleteSingleMessage(message.id),
              disabled: !canDelete,
              className: 'text-orange-400 hover:bg-orange-800/50',
            });
          }

          const hasRenderableContent = Boolean(
            message.content.trim()
            || htmlBlocks.length > 0
            || message.arena
            || editingMessageId === message.id,
          );
          if (!hasRenderableContent) {
            return null;
          }

          const renderActiveFrames = () => {
            const cleanedBlocks = [...htmlBlocks];
            let extractedThinking = null;
            const thinkingMatch = cleanedBlocks[0]?.match(/<(thinking|inner_monologue)>([\s\S]*?)<\/\1>/i);
            if (thinkingMatch) {
              extractedThinking = thinkingMatch[2].trim();
              cleanedBlocks[0] = cleanedBlocks[0].replace(thinkingMatch[0], '');
            }

            return jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                extractedThinking && jsxRuntime.jsx('div', {
                  className: 'mb-2',
                  children: jsxRuntime.jsx(ThinkingBlock, { content: extractedThinking }),
                }),
                cleanedBlocks.map((blockHtml, blockIndex) => jsxRuntime.jsx(CardFrame, {
                  ref: iframeElement => {
                    iframeRefs.current[`${message.id}:${blockIndex}`] = iframeElement;
                    if (blockIndex === 0) {
                      iframeRefs.current[message.id] = iframeElement;
                    }
                  },
                  htmlContent: blockHtml,
                  scripts,
                  originalContent: message.originalRawContent || '',
                  initialData: variables,
                  extensionSettings,
                  onLoad: () => onIframeLoad(message.id),
                  characterName,
                  userPersonaName,
                  characterId,
                  chatId: sessionId,
                  messageId: absoluteIndex,
                  iframeIndex: blockIndex,
                  presetName: preset?.name,
                  personaId: persona?.id,
                  characterCard,
                  worldInfo: characterCard?.char_book?.entries,
                  chatHistory: messages,
                  characterAvatarUrl: characterAvatarUrl || undefined,
                  userAvatarUrl,
                  embeddedAssets,
                  runtimeMode: 'active',
                }, `${message.id}-html-${blockIndex}`)),
              ],
            });
          };

          return jsxRuntime.jsxs('div', {
            id: `message-${absoluteIndex}`,
            className: 'mes chat_msg group relative flex flex-col gap-2 my-4',
            'data-message-id': absoluteIndex,
            mesid: absoluteIndex,
            ch_name: message.role === 'user' ? userPersonaName : characterName,
            is_user: message.role === 'user' ? 'true' : 'false',
            children: [
              (message.content.trim() || message.arena || editingMessageId === message.id)
                && jsxRuntime.jsx(ChatMessage, {
                  message,
                  avatarUrl: characterAvatarUrl,
                  isEditing: editingMessageId === message.id,
                  editingContent,
                  onContentChange: setEditingContent,
                  onSave: onSaveEdit,
                  onCancel: onCancelEdit,
                  menuActions,
                  isImmersive,
                  isStreaming: isMessageStreaming,
                  onArenaSelect,
                  onArenaRetry,
                  showPipeline: isLatestModelMessage,
                }),
              htmlBlocks.length > 0 && jsxRuntime.jsxs('div', {
                className: 'relative w-full',
                children: [
                  !message.content.trim() && editingMessageId !== message.id && jsxRuntime.jsxs('div', {
                    className: 'absolute top-0 right-0 z-20 flex items-center gap-2 p-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto',
                    children: [
                      isTtsEnabled && jsxRuntime.jsx(ReadAloudButton, {
                        rawContent: message.originalRawContent || htmlBlocks.join('\n'),
                        voice: ttsVoice,
                        provider: ttsProvider,
                        nativeVoice: ttsNativeVoice,
                        rate: ttsRate,
                        pitch: ttsPitch,
                      }),
                      jsxRuntime.jsx('div', {
                        className: 'bg-slate-800/90 rounded-full shadow-md border border-slate-600/50',
                        children: jsxRuntime.jsx(MessageActionMenu, {
                          actions: menuActions,
                          isUser: false,
                        }),
                      }),
                    ],
                  }),
                  compatibilityMode === 'safe' && streamingPreviewHtml && !message.interactiveHtml
                    ? jsxRuntime.jsx(StreamingHtmlPreview, {
                        htmlContent: streamingPreviewHtml,
                        characterName,
                      })
                    : activeInteractiveIdSet.has(message.id)
                      ? renderActiveFrames()
                      : jsxRuntime.jsxs('div', {
                          className: 'rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 text-sm text-slate-300',
                          children: [
                            jsxRuntime.jsx('p', {
                              className: 'mb-2',
                              children: 'Giao diện HTML cũ đang tạm ngủ để giảm RAM và tránh nhiều script chạy đồng thời.',
                            }),
                            jsxRuntime.jsx('button', {
                              onClick: () => setManuallyActivatedMessageId(message.id),
                              className: 'px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-medium',
                              'aria-label': 'Kích hoạt giao diện HTML này',
                              children: 'Kích hoạt giao diện HTML',
                            }),
                          ],
                        }),
                ],
              }),
            ],
          }, message.id);
        }),
        showLoadingPlaceholder && jsxRuntime.jsxs('div', {
          className: 'flex items-start gap-3 my-4 flex-row',
          children: [
            jsxRuntime.jsx('div', {
              className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden',
              children: characterAvatarUrl && jsxRuntime.jsx('img', {
                src: characterAvatarUrl,
                alt: 'Avatar',
                className: 'w-full h-full object-cover',
              }),
            }),
            jsxRuntime.jsx('div', {
              className: 'rounded-lg px-4 py-2 max-w-lg bg-slate-700/90 text-slate-200 rounded-bl-none ',
              children: jsxRuntime.jsx(LoadingIndicator, {
                message: 'Đang phân tích bối cảnh & tạo câu trả lời...',
              }),
            }),
          ],
        }),
        jsxRuntime.jsx('div', { ref: scrollAnchorRef }),
      ],
    });
  });
}
