export function createChatComposer(getDependencies) {
  return function ChatComposer({
    onSend,
    onStop,
    isLoading,
    isImmersive,
    quickReplies,
    onQuickReplyClick,
    scriptButtons = [],
    onScriptButtonClick,
    authorNote,
    onUpdateAuthorNote,
    isSummarizing,
    isInputLocked = false,
    children,
    isAutoLooping = false,
    onToggleAutoLoop,
    queueLength,
    isStoryMode = false,
    storyQueueLength = 0,
    onNextStoryChunk,
    onCancelStoryMode,
    error,
    onClearError,
    isSyncingLorebook = false,
    onFetchActionSuggestions,
    isFetchingSuggestions = false,
    suggestionSettingsEnabled = false,
    onRefineWriting,
    isRefiningWriting = false,
    writingRefinementEnabled = false,
  }) {
    const {
      truncateText,
      react,
      Icon,
      LoadingIndicator,
      slashCommandHints,
      jsxRuntime,
    } = getDependencies();

    const [inputText, setInputText] = react.useState('');
    const [showCommandMenu, setShowCommandMenu] = react.useState(false);
    const [filteredCommands, setFilteredCommands] = react.useState(slashCommandHints);
    const [highlightedCommandIndex, setHighlightedCommandIndex] = react.useState(0);
    const [actionSuggestions, setActionSuggestions] = react.useState([]);
    const textareaRef = react.useRef(null);

    react.useEffect(() => {
      const handleSetInput = event => {
        if (event.detail) {
          setInputText(String(event.detail));
        }
      };
      window.addEventListener('sillytavern:set-input', handleSetInput);
      return () => window.removeEventListener('sillytavern:set-input', handleSetInput);
    }, []);

    react.useEffect(() => {
      const handleExternalSend = event => {
        const messageText = String(event.detail || '');
        if (messageText.trim() && !isLoading && !isInputLocked && !isSummarizing) {
          onSend(messageText);
        }
      };
      window.addEventListener('sillytavern:send-message', handleExternalSend);
      return () => window.removeEventListener('sillytavern:send-message', handleExternalSend);
    }, [isInputLocked, isLoading, isSummarizing, onSend]);

    react.useEffect(() => {
      if (inputText.startsWith('/')) {
        const prefix = inputText.toLowerCase();
        const matches = slashCommandHints.filter(item => item.cmd.startsWith(prefix));
        setFilteredCommands(matches);
        setShowCommandMenu(matches.length > 0 && inputText !== matches[0].cmd);
        setHighlightedCommandIndex(0);
      } else {
        setShowCommandMenu(false);
      }
    }, [inputText]);

    const applySlashCommand = (commandText, appendSpace) => {
      setInputText(appendSpace ? `${commandText} ` : commandText);
      setShowCommandMenu(false);
      textareaRef.current?.focus();
    };

    const handleSubmit = event => {
      event.preventDefault();
      if (isLoading) {
        if (isAutoLooping && onToggleAutoLoop) {
          onToggleAutoLoop();
        } else {
          onStop();
        }
        return;
      }
      if (isAutoLooping && onToggleAutoLoop) {
        onToggleAutoLoop();
      } else if (isStoryMode && onNextStoryChunk) {
        onNextStoryChunk();
      } else if (inputText.trim() && !isInputLocked && !isSummarizing) {
        onSend(inputText);
        setInputText('');
        setShowCommandMenu(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    };

    const handleTextareaKeyDown = event => {
      if (showCommandMenu) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlightedCommandIndex(index => (index > 0 ? index - 1 : filteredCommands.length - 1));
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHighlightedCommandIndex(index => (index < filteredCommands.length - 1 ? index + 1 : 0));
        } else if (event.key === 'Tab' || event.key === 'Enter') {
          event.preventDefault();
          const selected = filteredCommands[highlightedCommandIndex];
          if (selected) {
            applySlashCommand(selected.cmd);
          }
        } else if (event.key === 'Escape') {
          setShowCommandMenu(false);
        }
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event);
      }
    };

    const handleFetchSuggestionsClick = async () => {
      if (!onFetchActionSuggestions) return;
      try {
        const fetched = await onFetchActionSuggestions(inputText.trim());
        setActionSuggestions(fetched);
      } catch (err) {
        console.error(err);
      }
    };

    const wrapperClass = isImmersive
      ? 'relative z-10 bg-slate-900/60  border-t border-white/10 w-full'
      : 'border-t border-slate-700 relative z-10 bg-slate-800/80 ';
    const innerPaddingClass = isImmersive ? 'p-4 md:p-6 w-full max-w-5xl mx-auto' : 'p-4 md:p-6';
    const summarizingMessage = queueLength && queueLength > 0
      ? `Đang tóm tắt... Còn ${queueLength} phần.`
      : 'Đang tóm tắt...';

    let inputPlaceholder = 'Nhập tin nhắn... (Gõ / để xem lệnh)';
    if (isInputLocked) {
      inputPlaceholder = 'Đang chờ kịch bản...';
    } else if (isSummarizing) {
      inputPlaceholder = 'Hệ thống đang tóm tắt...';
    } else if (isSyncingLorebook) {
      inputPlaceholder = 'Đang đồng bộ World Info...';
    } else if (isAutoLooping) {
      inputPlaceholder = 'Đang tự động chạy...';
    } else if (isImmersive) {
      inputPlaceholder = 'Nhập tin nhắn...';
    }

    return jsxRuntime.jsxs('div', {
      className: wrapperClass,
      children: [
        error && jsxRuntime.jsxs('div', {
          className: 'bg-red-900/90 text-white px-4 py-2 flex items-center justify-between  border-b border-red-700/50',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                jsxRuntime.jsx(Icon, { name: 'error', className: 'h-4 w-4' }),
                jsxRuntime.jsx('span', { className: 'text-sm font-medium', children: error }),
              ],
            }),
            onClearError && jsxRuntime.jsx('button', {
              onClick: onClearError,
              className: 'p-1 hover:bg-red-800 rounded-full  text-red-200 hover:text-white',
              title: 'Đóng thông báo',
              'aria-label': 'Đóng thông báo lỗi',
              children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
            }),
          ],
        }),
        showCommandMenu && !isInputLocked && !isSummarizing && jsxRuntime.jsxs('div', {
          className: 'absolute bottom-full left-4 md:left-6 mb-2 w-72 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-50  flex flex-col',
          children: [
            jsxRuntime.jsx('div', {
              className: 'bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-700 uppercase tracking-wider',
              children: 'Gợi ý lệnh hệ thống',
            }),
            jsxRuntime.jsx('div', {
              className: 'max-h-60 overflow-y-auto custom-scrollbar',
              children: filteredCommands.map((item, index) => jsxRuntime.jsxs('button', {
                onClick: () => applySlashCommand(item.cmd),
                className: `w-full text-left px-4 py-2 text-sm flex flex-col  ${
                  index === highlightedCommandIndex ? 'bg-sky-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`,
                children: [
                  jsxRuntime.jsx('span', { className: 'font-mono font-bold', children: item.cmd }),
                  jsxRuntime.jsx('span', {
                    className: `text-xs ${index === highlightedCommandIndex ? 'text-sky-200' : 'text-slate-500'}`,
                    children: item.desc,
                  }),
                ],
              }, item.cmd)),
            }),
          ],
        }),
        !isInputLocked && scriptButtons.length > 0 && onScriptButtonClick && jsxRuntime.jsx('div', {
          className: 'px-4 pt-2 pb-1 flex flex-wrap gap-2 justify-center md:justify-start  border-b border-white/5',
          children: scriptButtons.map(button => jsxRuntime.jsxs('button', {
            onClick: () => onScriptButtonClick(button),
            disabled: isSummarizing,
            className: 'px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20   active:scale-95 border border-indigo-400/30 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
            children: [
              jsxRuntime.jsx(Icon, { name: 'tool', className: 'h-3.5 w-3.5 text-indigo-200' }),
              ' ',
              button.label,
            ],
          }, button.id)),
        }),
        !isInputLocked && quickReplies.length > 0 && jsxRuntime.jsx('div', {
          className: 'px-4 pt-2 flex flex-wrap gap-2 justify-end',
          children: quickReplies.map((reply, index) => jsxRuntime.jsx('button', {
            onClick: () => onQuickReplyClick(reply),
            disabled: isSummarizing,
            className: `px-3 py-1.5 text-sm rounded-full  border shadow-sm ${
              isImmersive
                ? 'bg-slate-700/80 border-slate-500 hover:bg-sky-600/90 text-white'
                : 'bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white border-slate-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`,
            children: reply.label,
          }, index)),
        }),
        authorNote && jsxRuntime.jsx('div', {
          className: 'px-4 pt-3 text-xs',
          children: jsxRuntime.jsxs('div', {
            className: `p-2 rounded-md flex justify-between items-center gap-2 ${
              isImmersive ? 'bg-slate-800/50  border border-slate-700' : 'bg-slate-900/70'
            }`,
            children: [
              jsxRuntime.jsxs('p', {
                className: 'text-slate-400 flex-grow truncate',
                children: [
                  jsxRuntime.jsx('span', { className: 'font-bold text-sky-400', children: 'Ghi chú: ' }),
                  jsxRuntime.jsx('span', { className: 'italic', children: truncateText(authorNote, 100) }),
                ],
              }),
              jsxRuntime.jsx('button', {
                onClick: () => onUpdateAuthorNote(''),
                className: 'text-slate-500 hover:text-white p-1 rounded-full flex-shrink-0',
                title: 'Xóa ghi chú',
                'aria-label': 'Xóa ghi chú của tác giả',
                children: jsxRuntime.jsx(Icon, { name: 'trash', className: 'h-4 w-4' }),
              }),
            ],
          }),
        }),
        actionSuggestions.length > 0 && jsxRuntime.jsxs('div', {
          className: 'px-4 pt-4 pb-2',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'mb-2 flex justify-between items-center',
              children: [
                jsxRuntime.jsxs('span', {
                  className: 'text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1',
                  children: [
                    ' Gợi ý Hành động',
                  ],
                }),
                jsxRuntime.jsx('button', {
                  onClick: () => setActionSuggestions([]),
                  className: 'text-slate-400 hover:text-white text-xs border border-slate-600 rounded px-2 py-1 bg-slate-800 hover:bg-slate-700',
                  children: 'Đóng',
                }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x',
              children: actionSuggestions.map((suggestion, index) => jsxRuntime.jsx('button', {
                onClick: () => {
                  onSend(suggestion);
                  setActionSuggestions([]);
                },
                className: `text-left text-sm p-3 rounded-lg flex-shrink-0 w-64 whitespace-normal border shadow-md snap-center ${
                  isImmersive
                    ? 'bg-slate-800/80 border-slate-600 hover:bg-slate-700 hover:border-slate-400 text-slate-200'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-sky-500 text-slate-200'
                } transition-all active:scale-95`,
                children: jsxRuntime.jsx('span', { className: 'line-clamp-3', children: suggestion }),
              }, index)),
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: innerPaddingClass,
          children: [
            jsxRuntime.jsx('div', {
              className: 'flex items-center justify-end mb-3 min-h-[20px]',
              children: isSummarizing && jsxRuntime.jsx(LoadingIndicator, { message: summarizingMessage }),
            }),
            jsxRuntime.jsxs('form', {
              id: 'send_form',
              onSubmit: handleSubmit,
              className: 'chat-composer flex gap-3',
              children: [
                jsxRuntime.jsx('div', {
                  className: 'relative flex-grow',
                  children: isStoryMode
                    ? jsxRuntime.jsxs('div', {
                        className: `w-full rounded-lg p-2 md:p-3 flex items-center justify-between transition border border-amber-500/30 gap-2 ${
                          isImmersive ? 'bg-slate-800/70 ' : 'bg-slate-700'
                        }`,
                        children: [
                          jsxRuntime.jsxs('div', {
                            className: 'flex items-center gap-3 overflow-hidden',
                            children: [
                              jsxRuntime.jsxs('span', {
                                className: 'text-amber-400 font-bold flex items-center gap-2 shrink-0',
                                children: [
                                  jsxRuntime.jsx('span', {
                                    className: 'hidden sm:inline',
                                    children: 'Chế độ Cốt truyện',
                                  }),
                                ],
                              }),
                              onCancelStoryMode && jsxRuntime.jsx('button', {
                                type: 'button',
                                onClick: onCancelStoryMode,
                                className: 'px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-700 hover:border-red-500  whitespace-nowrap',
                                children: 'Hủy (Dừng & Chat)',
                              }),
                            ],
                          }),
                          jsxRuntime.jsxs('span', {
                            className: 'text-slate-300 text-sm font-mono shrink-0',
                            children: [
                              jsxRuntime.jsx('span', { className: 'hidden sm:inline', children: 'Còn: ' }),
                              jsxRuntime.jsx('span', { className: 'text-white font-bold', children: storyQueueLength }),
                              jsxRuntime.jsx('span', { className: 'sm:hidden', children: ' left' }),
                            ],
                          }),
                        ],
                      })
                    : jsxRuntime.jsx('div', {
                        className: 'relative',
                        children: jsxRuntime.jsx('textarea', {
                          id: 'send_textarea',
                          ref: textareaRef,
                          rows: 1,
                          value: inputText,
                          onChange: event => setInputText(event.target.value),
                          onInput: event => {
                            event.currentTarget.style.height = 'auto';
                            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                          },
                          onKeyDown: handleTextareaKeyDown,
                          placeholder: inputPlaceholder,
                          className: `chat-input w-full rounded-lg pl-3 pr-10 py-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 ${
                            isImmersive
                              ? 'bg-slate-800/70 border-slate-600/50 placeholder-slate-400'
                              : 'bg-slate-700 border border-slate-600'
                          } ${isInputLocked || isSummarizing || isSyncingLorebook ? 'cursor-not-allowed opacity-60' : ''}`,
                          disabled: isLoading || isInputLocked || isAutoLooping || isSummarizing || isSyncingLorebook,
                          'aria-label': 'Chat input',
                          autoComplete: 'off',
                        }),
                      }),
                }),
                jsxRuntime.jsx('button', {
                  id: 'send_but',
                  type: 'submit',
                  disabled: !isAutoLooping
                    && !isLoading
                    && (isInputLocked || (!inputText.trim() && !isStoryMode) || isSummarizing || isSyncingLorebook),
                  className: `chat-send-button text-white font-bold py-2 px-5 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-2 min-w-[80px] ${
                    isImmersive
                      ? 'bg-sky-600/80 hover:bg-sky-600 '
                      : (isAutoLooping || isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700')
                  }`,
                  'aria-label': isAutoLooping || isLoading ? 'Dừng lại' : 'Gửi tin nhắn',
                  children: isAutoLooping || isLoading
                    ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                        children: [
                          jsxRuntime.jsx(Icon, { name: 'stop', className: 'h-4 w-4' }),
                          jsxRuntime.jsx('span', { children: 'Dừng' }),
                        ],
                      })
                    : isStoryMode
                      ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
                            jsxRuntime.jsx('span', { children: 'Tiếp tục' }),
                          ],
                        })
                      : jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
                            jsxRuntime.jsx('span', { children: 'Gửi' }),
                          ],
                        }),
                }),
                suggestionSettingsEnabled && !isStoryMode && !isAutoLooping && !isLoading && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: handleFetchSuggestionsClick,
                  disabled: isFetchingSuggestions || isInputLocked || isSummarizing || isSyncingLorebook || isRefiningWriting,
                  className: `py-2 px-3 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isImmersive
                      ? 'bg-amber-600/80 hover:bg-amber-500 border-amber-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white'
                  }`,
                  title: 'Gợi ý hành động từ AI',
                  'aria-label': 'Gợi ý hành động từ AI',
                  children: isFetchingSuggestions
                    ? jsxRuntime.jsx('span', { className: 'text-xs font-semibold', 'aria-hidden': 'true', children: '...' })
                    : jsxRuntime.jsx('span', { className: 'text-xs font-semibold', 'aria-hidden': 'true', children: 'Gợi ý' }),
                }),
                writingRefinementEnabled && !isStoryMode && !isAutoLooping && !isLoading && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: onRefineWriting,
                  disabled: isRefiningWriting || isInputLocked || isSummarizing || isSyncingLorebook || isFetchingSuggestions,
                  className: `py-2 px-3 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isImmersive
                      ? 'bg-teal-600/80 hover:bg-teal-500 border-teal-500 text-white'
                      : 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white'
                  }`,
                  title: 'Cải thiện văn chương (Tin nhắn AI cuối cùng)',
                  'aria-label': 'Cải thiện văn chương',
                  children: isRefiningWriting
                    ? jsxRuntime.jsx('span', { className: 'text-xs font-semibold', 'aria-hidden': 'true', children: '...' })
                    : jsxRuntime.jsx('span', { className: 'text-xs font-semibold', 'aria-hidden': 'true', children: 'Sửa văn' }),
                }),
                onToggleAutoLoop && !isInputLocked && !isSummarizing && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: onToggleAutoLoop,
                  className: `py-2 px-3 rounded-lg   border flex items-center justify-center ${
                    isAutoLooping
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`,
                  title: 'Tự động chạy (Auto-Play)',
                  'aria-label': isAutoLooping ? 'Tắt tự động chạy' : 'Bật tự động chạy',
                  'aria-pressed': isAutoLooping,
                  children: jsxRuntime.jsx('span', {
                    className: 'text-xl leading-none ',
                    'aria-hidden': 'true',
                    children: 'Tự động',
                  }),
                }),
              ],
            }),
            children,
          ],
        }),
      ],
    });
  };
}
