// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

function resolveChatControlDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    Icon: deps.Icon,
    sessionStore: deps.sessionStore,
    useDialogFocus: deps.useDialogFocus,
    LoadingIndicator: deps.LoadingIndicator,
  };
}

export function createStoryImportControl(getDependencies) {
  return function StoryImportControl({ character, onClick, onImportStory }) {
    const { Icon, jsxRuntime } = resolveChatControlDeps(getDependencies);

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-800/50 p-3 rounded-lg flex flex-col items-center gap-2 hover:bg-slate-800/80   relative group',
      children: [
        jsxRuntime.jsx('button', {
          onClick,
          className: 'w-20 h-20 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
          'aria-label': `Bắt đầu cuộc trò chuyện mới với ${character.card.name}`,
          children: character.avatarUrl
            ? jsxRuntime.jsx('img', {
                src: character.avatarUrl,
                alt: '',
                className: 'w-full h-full object-cover',
              })
            : jsxRuntime.jsx('div', {
                className: 'w-full h-full flex items-center justify-center text-slate-400',
                children: jsxRuntime.jsx(Icon, {
                  name: 'character',
                  className: 'h-8 w-8',
                }),
              }),
        }),
        jsxRuntime.jsx('button', {
          onClick,
          className: 'w-full mt-1 px-3 py-1.5 bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white rounded-md text-sm font-semibold  truncate shadow-sm border border-slate-600 hover:border-sky-500',
          children: character.card.name,
        }),
        jsxRuntime.jsx('button', {
          onClick: onImportStory,
          className: 'absolute top-2 right-2 p-1.5 bg-slate-900/80 text-amber-400 rounded-full hover:bg-amber-600 hover:text-white  opacity-0 group-hover:opacity-100 shadow-lg border border-amber-500/30',
          title: 'Nhập Tiền Truyện (Story Mode)',
          'aria-label': 'Nhập tiền truyện',
          children: jsxRuntime.jsx(Icon, {
            name: 'upload',
            className: 'h-4 w-4',
          }),
        }),
      ],
    });
  };
}

export function createAdventureImportControl(getDependencies) {
  return function AdventureImportControl({ onImport, isLoading }) {
    const { react, Icon, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const fileInputRef = react.useRef(null);

    const handleFileChange = event => {
      if (event.target.files && event.target.files.length > 0) {
        onImport(event.target.files[0]);
        event.target.value = '';
      }
    };

    return jsxRuntime.jsxs('div', {
      onClick: () => !isLoading && fileInputRef.current?.click(),
      className: `border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer  hover:bg-slate-800/50 hover:border-sky-500/50 group ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      children: [
        jsxRuntime.jsx('input', {
          ref: fileInputRef,
          type: 'file',
          'aria-label': 'Nhập bản ghi phiêu lưu JSON',
          className: 'sr-only',
          accept: '.json',
          onChange: handleFileChange,
          disabled: isLoading,
        }),
        jsxRuntime.jsx('div', {
          className: 'bg-slate-800 p-3 rounded-full mb-3 group-  shadow-md',
          children: jsxRuntime.jsx(Icon, {
            name: 'upload',
            className: 'h-6 w-6',
          }),
        }),
        jsxRuntime.jsx('h2', {
          className: 'text-sm font-bold text-slate-300 group-hover:text-white ',
          children: 'Tiếp tục từ Bản Ghi Phiêu Lưu',
        }),
        jsxRuntime.jsx('p', {
          className: 'text-xs text-slate-500 mt-1',
          children: 'Kéo thả file .json hoặc nhấn để tải lên (Backup/Save File)',
        }),
      ],
    });
  };
}

export function createTokenCountControl(getDependencies) {
  return function TokenCountControl({ sections }) {
    const { react, Icon, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const [isExpanded, setIsExpanded] = react.useState(false);

    const metrics = react.useMemo(() => {
      const charCount = sections.reduce((sum, section) => sum + (section.content || '').length, 0);
      const estimatedTokens = Math.ceil(charCount / 3.5);
      return {
        chars: charCount.toLocaleString('vi-VN'),
        tokens: estimatedTokens.toLocaleString('vi-VN'),
      };
    }, [sections]);

    if (isExpanded) {
      return jsxRuntime.jsxs('button', {
        onClick: event => {
          event.preventDefault();
          event.stopPropagation();
          setIsExpanded(false);
        },
        className: 'text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-2 py-0.5 rounded shadow-sm   flex items-center gap-1 font-mono',
        title: 'Nhấn để thu gọn',
        children: [
          jsxRuntime.jsxs('span', { children: ['📝 ', metrics.chars, ' ký tự'] }),
          jsxRuntime.jsx('span', { className: 'opacity-60', children: '|' }),
          jsxRuntime.jsxs('span', { className: 'text-indigo-200', children: ['~', metrics.tokens, ' tokens'] }),
        ],
      });
    }

    return jsxRuntime.jsxs('button', {
      onClick: event => {
        event.preventDefault();
        event.stopPropagation();
        setIsExpanded(true);
      },
      className: 'text-[10px] bg-slate-800 text-slate-400 border border-slate-600 px-2 py-0.5 rounded hover:text-sky-400 hover:border-sky-500 hover:bg-slate-700  flex items-center gap-1',
      title: 'Kiểm tra độ dài và ước lượng token',
      children: [
        jsxRuntime.jsx(Icon, { name: 'count', className: 'h-3.5 w-3.5' }),
        jsxRuntime.jsx('span', { children: 'Đếm độ dài' }),
      ],
    });
  };
}

export function createMessageMenu(getDependencies) {
  return function MessageMenu({ actions, isUser }) {
    const { react, Icon, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const [isOpen, setIsOpen] = react.useState(false);
    const menuRef = react.useRef(null);
    const triggerRef = react.useRef(null);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (
          menuRef.current
          && !menuRef.current.contains(event.target)
          && triggerRef.current
          && !triggerRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideMouseDown);
        menuRef.current?.querySelector('button')?.focus();
      }
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isOpen]);

    const enabledActions = actions.filter(action => action.disabled !== true);
    if (enabledActions.length === 0) return null;

    return jsxRuntime.jsxs('div', {
      className: 'relative',
      children: [
        jsxRuntime.jsx('button', {
          ref: triggerRef,
          onClick: () => setIsOpen(!isOpen),
          className: 'p-1 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white ',
          'aria-haspopup': 'true',
          'aria-expanded': isOpen,
          'aria-label': 'Tùy chọn tin nhắn',
          children: jsxRuntime.jsx(Icon, { name: 'more', className: 'h-4 w-4' }),
        }),
        isOpen && jsxRuntime.jsx('div', {
          ref: menuRef,
          onKeyDown: event => {
            if (event.key === 'Escape') {
              setIsOpen(false);
              triggerRef.current?.focus();
            }
          },
          className: `absolute z-10 bottom-full mb-1 ${isUser ? 'right-0' : 'left-0'} w-48 bg-slate-900 border border-slate-700 rounded-md shadow-lg py-1`,
          children: enabledActions.map((action, index) => jsxRuntime.jsx('button', {
            onClick: () => {
              action.onClick();
              setIsOpen(false);
              triggerRef.current?.focus();
            },
            className: `w-full text-left px-4 py-2 text-sm  ${action.className || 'text-slate-200 hover:bg-slate-700'}`,
            children: action.label,
          }, `${action.label}-${index}`)),
        }),
      ],
    });
  };
}

export function createThinkingPanel(getDependencies) {
  return function ThinkingPanel({ content, label = 'Quy trình suy nghĩ' }) {
    const { react, Icon, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const [isExpanded, setIsExpanded] = react.useState(false);

    return jsxRuntime.jsxs('div', {
      className: 'mb-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg overflow-hidden',
      children: [
        jsxRuntime.jsxs('button', {
          onClick: () => setIsExpanded(!isExpanded),
          className: 'w-full px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-900/40 hover:bg-indigo-800/50 flex items-center gap-2 ',
          'aria-expanded': isExpanded,
          children: [
            jsxRuntime.jsx(Icon, { name: 'sparkles', className: 'h-4 w-4' }),
            jsxRuntime.jsx('span', {
              children: isExpanded ? `Ẩn ${label}` : `Xem ${label}`,
            }),
            jsxRuntime.jsx(Icon, {
              name: isExpanded ? 'chevronDown' : 'chevronRight',
              className: 'ml-auto h-4 w-4',
            }),
          ],
        }),
        isExpanded && jsxRuntime.jsx('div', {
          className: 'p-3 text-xs font-mono text-indigo-100 whitespace-pre-wrap border-t border-indigo-500/20 bg-indigo-900/20',
          children: content,
        }),
      ],
    });
  };
}

export function createRpgNotification(getDependencies) {
  return function RpgNotification() {
    const { Icon, sessionStore, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const notificationText = sessionStore(state => state.rpgNotification);
    const setRpgNotification = sessionStore(state => state.setRpgNotification);

    if (!notificationText) return null;
    const lines = notificationText.split('\n').filter(line => line.trim() !== '');

    return jsxRuntime.jsx('div', {
      className: 'fixed bottom-24 right-4 z-[60] max-w-xs md:max-w-sm pointer-events-none',
      children: jsxRuntime.jsxs('div', {
        className: 'bg-slate-900/95  border-l-4 border-amber-500 shadow-2xl rounded-r-lg p-4 pointer-events-auto relative overflow-hidden group',
        children: [
          jsxRuntime.jsx('button', {
            onClick: () => setRpgNotification(null),
            className: 'absolute top-1 right-1 text-slate-500 hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 ',
            title: 'Đóng thông báo này',
            'aria-label': 'Đóng thông báo RPG',
            children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
          }),
          jsxRuntime.jsxs('div', {
            className: 'flex items-start gap-3',
            children: [
              jsxRuntime.jsx('div', {
                className: 'p-2 bg-amber-500/20 rounded-full shrink-0',
                children: jsxRuntime.jsx(Icon, {
                  name: 'rpg',
                  className: 'h-5 w-5 text-amber-500',
                }),
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex-grow',
                children: [
                  jsxRuntime.jsx('h4', {
                    className: 'text-amber-400 font-bold text-xs uppercase tracking-wider mb-1',
                    children: 'Mythic Engine Update',
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'text-sm text-slate-200 space-y-1 font-medium max-h-40 overflow-y-auto custom-scrollbar',
                    children: lines.map((line, index) => jsxRuntime.jsx('p', {
                      className: 'leading-snug border-b border-slate-800/50 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0',
                      children: line,
                    }, index)),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createAuthorNoteDialog(getDependencies) {
  return function AuthorNoteDialog({ isOpen, initialNote, onSave, onClose }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime,
    } = resolveChatControlDeps(getDependencies);

    const [noteText, setNoteText] = react.useState(initialNote);
    const dialogRef = react.useRef(null);
    const textareaRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, textareaRef);

    react.useEffect(() => {
      if (isOpen) {
        setNoteText(initialNote);
      }
    }, [isOpen, initialNote]);

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-[100] p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'author-note-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl',
        onClick: event => event.stopPropagation(),
        children: [
          jsxRuntime.jsxs('header', {
            className: 'p-4 border-b border-slate-700',
            children: [
              jsxRuntime.jsx('h2', {
                id: 'author-note-title',
                className: 'text-xl font-bold text-sky-400',
                children: 'Ghi chú của Tác giả (Bền bỉ)',
              }),
              jsxRuntime.jsx('p', {
                className: 'text-sm text-slate-400 mt-1',
                children: 'Ghi chú này sẽ được chèn vào lời nhắc cho mỗi lượt gửi cho đến khi bạn xóa nó.',
              }),
            ],
          }),
          jsxRuntime.jsx('div', {
            className: 'p-6',
            children: jsxRuntime.jsx('textarea', {
              ref: textareaRef,
              'aria-label': 'Ghi chú của Tác giả',
              value: noteText,
              onChange: event => setNoteText(event.target.value),
              rows: 8,
              className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500',
              placeholder: 'Ví dụ: [[Chỉ dẫn: Nhân vật phải luôn nói một cách trang trọng.]]',
            }),
          }),
          jsxRuntime.jsxs('footer', {
            className: 'p-4 border-t border-slate-700 flex justify-end gap-3',
            children: [
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'px-4 py-2 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300',
                children: 'Hủy',
              }),
              jsxRuntime.jsx('button', {
                onClick: () => onSave(noteText),
                className: 'px-4 py-2 text-sm font-medium rounded-md bg-sky-600 hover:bg-sky-700 text-white',
                children: 'Lưu',
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createStoryRevisionDialog(getDependencies) {
  return function StoryRevisionDialog({
    isOpen,
    originalText,
    refinedText,
    isLoading,
    onConfirm,
    onCancel,
    onRetry,
    onClose,
  }) {
    const {
      useDialogFocus,
      react,
      LoadingIndicator,
      jsxRuntime,
    } = resolveChatControlDeps(getDependencies);

    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'story-refinement-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl',
            children: [
              jsxRuntime.jsx('h2', {
                id: 'story-refinement-title',
                className: 'text-xl font-bold text-teal-400',
                children: 'Cải thiện Cốt truyện',
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'text-slate-400 hover:text-white transition-colors text-2xl',
                'aria-label': 'Đóng',
                children: '×',
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-6',
            children: [
              jsxRuntime.jsxs('div', {
                className: 'flex-1 bg-slate-800/30 border border-slate-700 rounded-lg p-6 flex flex-col overflow-y-auto',
                children: [
                  jsxRuntime.jsx('h3', {
                    className: 'text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider',
                    children: 'Bản gốc',
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'flex-1 whitespace-pre-wrap text-slate-300 font-serif leading-relaxed text-lg',
                    children: originalText,
                  }),
                ],
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex-1 bg-slate-800/80 border border-teal-700/50 rounded-lg p-6 flex flex-col overflow-y-auto relative shadow-[0_0_15px_rgba(20,184,166,0.1)]',
                children: [
                  jsxRuntime.jsxs('h3', {
                    className: 'text-sm font-bold text-teal-400 mb-4 uppercase tracking-wider flex items-center gap-2',
                    children: [
                      jsxRuntime.jsx('span', { children: 'Bản cải thiện' }),
                      isLoading && jsxRuntime.jsx('span', { className: 'animate-spin', children: '⏳' }),
                    ],
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'flex-1 whitespace-pre-wrap text-slate-200 font-serif leading-relaxed text-lg',
                    children: isLoading && !refinedText
                      ? jsxRuntime.jsxs('div', {
                          className: 'flex flex-col items-center justify-center h-full text-teal-500/50 space-y-4',
                          children: [
                            jsxRuntime.jsx(LoadingIndicator, {}),
                            jsxRuntime.jsx('span', {
                              className: 'text-sm font-medium tracking-wide',
                              children: 'AI đang viết lại...',
                            }),
                          ],
                        })
                      : (refinedText || jsxRuntime.jsx('span', {
                          className: 'text-slate-500 italic',
                          children: 'Chưa có kết quả...',
                        })),
                  }),
                ],
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3 rounded-b-xl',
            children: [
              jsxRuntime.jsx('button', {
                onClick: onCancel,
                disabled: isLoading,
                className: 'px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white transition-colors disabled:opacity-50',
                children: 'Hủy bỏ',
              }),
              jsxRuntime.jsxs('button', {
                onClick: onRetry,
                disabled: isLoading,
                className: 'px-6 py-2.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 font-bold text-white transition-colors disabled:opacity-50 border border-indigo-500/50 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('span', { children: 'Thử lại' }),
                  jsxRuntime.jsx('span', { className: 'text-sm', children: '🔄' }),
                ],
              }),
              jsxRuntime.jsxs('button', {
                onClick: onConfirm,
                disabled: isLoading || !refinedText,
                className: 'px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold text-white transition-colors disabled:opacity-50 shadow-lg shadow-teal-900/50 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('span', { children: 'Áp dụng bản dịch' }),
                  jsxRuntime.jsx('span', { className: 'text-sm', children: '✨' }),
                ],
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createErrorDecisionDialog(getDependencies) {
  return function ErrorDecisionDialog({ errorState, onRetry, onIgnore }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime,
    } = resolveChatControlDeps(getDependencies);

    const dialogRef = react.useRef(null);
    const retryButtonRef = react.useRef(null);

    useDialogFocus(errorState.hasError, errorState.canIgnore ? onIgnore : () => {}, dialogRef, retryButtonRef);

    if (!errorState.hasError) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80  ',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'interactive-error-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'bg-red-900/30 p-4 border-b border-red-500/30 flex items-center gap-3',
            children: [
              jsxRuntime.jsx('div', {
                className: 'p-2 bg-red-600 rounded-full text-white shadow-lg shadow-red-600/20',
                children: jsxRuntime.jsx('svg', {
                  'aria-hidden': 'true',
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-6 w-6',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  stroke: 'currentColor',
                  children: jsxRuntime.jsx('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                  }),
                }),
              }),
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsx('h3', {
                    id: 'interactive-error-title',
                    className: 'text-lg font-bold text-red-100',
                    children: errorState.title,
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-xs text-red-300',
                    children: 'Hệ thống gặp sự cố cần bạn quyết định.',
                  }),
                ],
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-6 space-y-4',
            children: [
              jsxRuntime.jsx('p', {
                className: 'text-slate-300 text-sm leading-relaxed',
                children: errorState.message,
              }),
              errorState.errorDetails && jsxRuntime.jsxs('div', {
                className: 'bg-black/40 rounded-lg p-3 border border-red-500/20',
                children: [
                  jsxRuntime.jsx('p', {
                    className: 'text-[10px] font-bold text-red-400 uppercase mb-1',
                    children: 'Chi tiết kỹ thuật:',
                  }),
                  jsxRuntime.jsx('code', {
                    className: 'text-xs font-mono text-red-200 block whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar',
                    children: errorState.errorDetails,
                  }),
                ],
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3',
            children: [
              errorState.canIgnore && jsxRuntime.jsx('button', {
                onClick: onIgnore,
                className: 'px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg ',
                children: 'Bỏ qua (Tiếp tục)',
              }),
              jsxRuntime.jsxs('button', {
                ref: retryButtonRef,
                onClick: onRetry,
                className: 'px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/30   active:scale-95 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('svg', {
                    'aria-hidden': 'true',
                    xmlns: 'http://www.w3.org/2000/svg',
                    className: 'h-4 w-4',
                    viewBox: '0 0 20 20',
                    fill: 'currentColor',
                    children: jsxRuntime.jsx('path', {
                      fillRule: 'evenodd',
                      d: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z',
                      clipRule: 'evenodd',
                    }),
                  }),
                  'Thử lại',
                ],
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createChatVisualEffects(getDependencies) {
  return function ChatVisualEffects({ visualState, isImmersive }) {
    const { react, jsxRuntime } = resolveChatControlDeps(getDependencies);
    const audioRef = react.useRef(null);

    react.useEffect(() => {
      if (!audioRef.current) return;
      if (visualState?.musicUrl && visualState.musicUrl !== 'off') {
        audioRef.current.src = visualState.musicUrl;
        audioRef.current.loop = true;
        audioRef.current.play().catch(error => console.error('Audio play error:', error));
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }, [visualState?.musicUrl]);

    react.useEffect(() => {
      if (visualState?.ambientSoundUrl) {
        new Audio(visualState.ambientSoundUrl).play().catch(error => console.error('SFX play error:', error));
      }
    }, [visualState?.ambientSoundUrl]);

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        visualState?.backgroundImage && jsxRuntime.jsx('div', {
          className: 'absolute inset-0 z-0   pointer-events-none',
          style: {
            backgroundImage: `url(${visualState.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isImmersive ? 0.6 : 0.3,
          },
        }),
        isImmersive && jsxRuntime.jsx('div', {
          className: 'absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80',
        }),
        jsxRuntime.jsx('audio', {
          ref: audioRef,
          className: 'hidden',
        }),
      ],
    });
  };
}