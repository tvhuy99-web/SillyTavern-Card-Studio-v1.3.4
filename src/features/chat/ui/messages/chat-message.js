import { MARKDOWN_SANITIZE_OPTIONS, extractThinkingBlocksAndCleanText } from './thinking-panel.js';

function areMenuActionsEqual(previousActions, nextActions) {
  if (previousActions.length !== nextActions.length) {
    return false;
  }
  for (let index = 0; index < previousActions.length; index += 1) {
    if (
      previousActions[index].label !== nextActions[index].label
      || previousActions[index].disabled !== nextActions[index].disabled
    ) {
      return false;
    }
  }
  return true;
}

export function createChatMessage(react, getDependencies) {
  return react.memo(
    function ChatMessage({
      message,
      avatarUrl,
      isEditing,
      editingContent,
      onContentChange,
      onSave,
      onCancel,
      menuActions,
      isStreaming = false,
      onArenaSelect,
      onArenaRetry,
      showPipeline = false,
    }) {
      const {
        personaStore,
        markdownParser,
        ThinkingBlock,
        MessageActionMenu,
        htmlSanitizer,
        LiveStreamText,
        react: reactRuntime,
        useToast,
        Icon,
        useSpeech,
        ArenaResponsePanel,
        jsxRuntime,
      } = getDependencies();

      const { activePersona } = personaStore();
      const { showToast } = useToast();
      const isUserMessage = message.role === 'user';
      const isSystemMessage = message.role === 'system';
      const editTextareaRef = reactRuntime.useRef(null);

      const {
        playImmediately,
        currentPlayingId,
        settings: speechSettings,
      } = useSpeech();
      const isPlayingThisMessage = currentPlayingId === message.id;
      const isTtsEnabled = speechSettings.tts_enabled;
      const ttsVoice = speechSettings.tts_voice || 'Kore';
      const ttsProvider = speechSettings.tts_provider || 'gemini';
      const ttsNativeVoice = speechSettings.tts_native_voice || '';
      const ttsRate = speechSettings.tts_rate ?? 1;
      const ttsPitch = speechSettings.tts_pitch ?? 1;
      const isPendingArena = message.arena && message.arena.enabled && message.arena.selected === null;

      const { mainHtml, thinkingBlocks } = reactRuntime.useMemo(() => {
        if (isUserMessage || !message.content || isStreaming || isPendingArena) {
          return { mainHtml: '', thinkingBlocks: [] };
        }
        let preparedText = message.content;
        if (activePersona) {
          preparedText = preparedText.replace(/{{user}}/gi, activePersona.name);
        }

        const blocks = [];
        if (message.reasoning_content) {
          blocks.push({
            label: 'Suy nghĩ',
            content: message.reasoning_content,
          });
        }

        const {
          thinkingBlocks: inlineBlocks,
          remainingText,
        } = extractThinkingBlocksAndCleanText(preparedText, showPipeline);
        blocks.push(...inlineBlocks);

        const parsedHtml = markdownParser.parse(remainingText.trim());
        return {
          mainHtml: htmlSanitizer.sanitize(parsedHtml, MARKDOWN_SANITIZE_OPTIONS),
          thinkingBlocks: blocks,
        };
      }, [isUserMessage, message.content, message.reasoning_content, activePersona, isStreaming, isPendingArena, showPipeline]);
      // Keep unchanged message HTML stable across parent renders.
      const renderedHtml = reactRuntime.useMemo(() => ({ __html: mainHtml }), [mainHtml]);

      reactRuntime.useEffect(() => {
        if (isEditing && editTextareaRef.current) {
          const textarea = editTextareaRef.current;
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.focus();
        }
      }, [isEditing, editingContent]);

      if (isEditing) {
        return jsxRuntime.jsxs('div', {
          className: `flex items-start gap-3 my-4 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`,
          children: [
            !isUserMessage && !isSystemMessage && jsxRuntime.jsx('div', {
              className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0',
            }),
            jsxRuntime.jsxs('div', {
              className: `rounded-lg px-4 py-3 max-w-lg w-full ${isUserMessage ? 'bg-sky-600' : 'bg-slate-700'}`,
              children: [
                jsxRuntime.jsx('textarea', {
                  ref: editTextareaRef,
                  value: editingContent,
                  'aria-label': 'Nội dung tin nhắn',
                  onChange: event => onContentChange(event.target.value),
                  className: 'w-full bg-transparent text-white focus:outline-none resize-none overflow-hidden',
                  rows: 1,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'mt-2 flex justify-end gap-2',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: onCancel,
                      className: 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-600 hover:bg-slate-500 text-white ',
                      children: 'Hủy',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: onSave,
                      className: 'px-3 py-1 text-xs font-semibold rounded-md bg-sky-500 hover:bg-sky-400 text-white ',
                      children: 'Lưu',
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }

      if (isSystemMessage) {
        return jsxRuntime.jsx('div', {
          className: 'flex justify-center my-4 group',
          children: jsxRuntime.jsxs('div', {
            className: 'bg-slate-800/70 border border-slate-600/50 text-slate-400 text-sm px-4 py-2 rounded-full flex items-center gap-2 ',
            children: [
              jsxRuntime.jsx('span', {
                className: 'italic',
                children: message.content,
              }),
              jsxRuntime.jsx('div', {
                className: 'opacity-0 group-hover:opacity-100 ',
                children: jsxRuntime.jsx(MessageActionMenu, {
                  actions: menuActions,
                  isUser: false,
                }),
              }),
            ],
          }),
        });
      }

      if (isPendingArena) {
        return jsxRuntime.jsx(ArenaResponsePanel, {
          message,
          onSelect: selectedSide => onArenaSelect && onArenaSelect(message.id, selectedSide),
          onRetry: retrySide => onArenaRetry && onArenaRetry(message.id, retrySide),
        });
      }

      const handlePlayTts = async () => {
        if (!message.content) {
          return;
        }
        try {
          const selectedVoice = ttsProvider === 'native' ? ttsNativeVoice : ttsVoice;
          playImmediately(message.content, selectedVoice, message.id, {
            provider: ttsProvider,
            rate: ttsRate,
            pitch: ttsPitch,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          showToast(`TTS Error: ${errorMessage}`, 'error');
        }
      };

      return jsxRuntime.jsxs('div', {
        className: `flex items-end gap-2 my-4 group ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`,
        children: [
          jsxRuntime.jsx('div', {
            className: 'flex-shrink-0 self-center opacity-0 group-hover:opacity-100  ',
            children: jsxRuntime.jsx(MessageActionMenu, {
              actions: menuActions,
              isUser: isUserMessage,
            }),
          }),
          !isUserMessage && jsxRuntime.jsx('div', {
            className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden self-start shadow-md border border-slate-600/30',
            children: avatarUrl
              ? jsxRuntime.jsx('img', {
                  src: avatarUrl,
                  alt: '',
                  className: 'w-full h-full object-cover',
                })
              : jsxRuntime.jsx('div', {
                  className: 'w-full h-full flex items-center justify-center text-slate-400',
                  'aria-hidden': 'true',
                  children: jsxRuntime.jsx(Icon, {
                    name: 'character',
                    className: 'h-5 w-5',
                  }),
                }),
          }),
          jsxRuntime.jsxs('div', {
            className: `rounded-lg px-4 py-2 max-w-lg shadow-sm relative ${
              isUserMessage
                ? 'bg-sky-600 text-white rounded-br-none'
                : 'bg-slate-700/90  text-slate-200 rounded-bl-none'
            }`,
            children: [
              !isUserMessage && isTtsEnabled && !isStreaming && jsxRuntime.jsx('div', {
                className: 'absolute -top-3 -right-2 flex items-center gap-1',
                children: jsxRuntime.jsx('button', {
                  onClick: handlePlayTts,
                  disabled: isPlayingThisMessage,
                  className: `p-1.5 rounded-full shadow-sm border  ${
                    isPlayingThisMessage
                      ? 'bg-sky-500 text-white border-sky-400 '
                      : 'bg-slate-800 text-slate-400 border-slate-600 hover:text-sky-400 hover:border-sky-500'
                  }`,
                  title: isPlayingThisMessage ? 'Đang đọc...' : 'Đọc tin nhắn (TTS)',
                  'aria-label': isPlayingThisMessage ? 'Đang đọc tin nhắn' : 'Đọc tin nhắn này',
                  children: isPlayingThisMessage
                    ? jsxRuntime.jsx('span', {
                        className: 'text-sm font-bold',
                        'aria-hidden': 'true',
                        children: '…',
                      })
                    : jsxRuntime.jsx(Icon, {
                        name: 'volume',
                        className: 'h-4 w-4',
                      }),
                }),
              }),
              isUserMessage
                ? jsxRuntime.jsx('p', {
                    className: 'mes_text whitespace-pre-wrap',
                    children: message.content,
                  })
                : jsxRuntime.jsx(jsxRuntime.Fragment, {
                    children: isStreaming
                      ? jsxRuntime.jsx(LiveStreamText, {
                          messageId: message.id,
                          slot: 'main',
                          fallback: message.content || 'Đang phân tích bối cảnh & tạo câu trả lời...',
                        })
                      : jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            thinkingBlocks.map((block, index) => jsxRuntime.jsx(ThinkingBlock, {
                              content: block.content,
                              label: block.label,
                            }, index)),
                            jsxRuntime.jsx('div', {
                              className: 'mes_text markdown-content',
                              dangerouslySetInnerHTML: renderedHtml,
                            }),
                          ],
                        }),
                  }),
            ],
          }),
        ],
      });
    },
    (prevProps, nextProps) => (
      prevProps.message.content === nextProps.message.content
      && prevProps.message.reasoning_content === nextProps.message.reasoning_content
      && prevProps.showPipeline === nextProps.showPipeline
      && prevProps.message.role === nextProps.message.role
      && prevProps.message.id === nextProps.message.id
      && prevProps.isEditing === nextProps.isEditing
      && prevProps.editingContent === nextProps.editingContent
      && prevProps.avatarUrl === nextProps.avatarUrl
      && prevProps.isImmersive === nextProps.isImmersive
      && prevProps.isStreaming === nextProps.isStreaming
      && prevProps.message.arena?.enabled === nextProps.message.arena?.enabled
      && prevProps.message.arena?.modelA.content === nextProps.message.arena?.modelA.content
      && prevProps.message.arena?.modelB.content === nextProps.message.arena?.modelB.content
      && prevProps.message.arena?.modelA.completed === nextProps.message.arena?.modelA.completed
      && prevProps.message.arena?.modelA.status === nextProps.message.arena?.modelA.status
      && prevProps.message.arena?.modelB.completed === nextProps.message.arena?.modelB.completed
      && prevProps.message.arena?.modelB.status === nextProps.message.arena?.modelB.status
      && prevProps.message.arena?.selected === nextProps.message.arena?.selected
      && areMenuActionsEqual(prevProps.menuActions, nextProps.menuActions)
      && prevProps.onArenaRetry === nextProps.onArenaRetry
    ),
  );
}
