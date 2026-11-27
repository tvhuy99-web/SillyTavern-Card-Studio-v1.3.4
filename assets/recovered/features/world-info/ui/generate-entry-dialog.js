export function createGenerateEntryDialog(getDependencies) {
  return function GenerateEntryDialog({
    isOpen,
    onClose,
    keyword,
    contentPromise,
  }) {
    const {
      react,
      LoadingIndicator,
      lorebookStore,
      jsxRuntime,
    } = getDependencies();

    const { lorebooks, updateLorebook } = lorebookStore();
    const [keywordsText, setKeywordsText] = react.useState(keyword);
    const [entryContent, setEntryContent] = react.useState('');
    const [isGenerating, setIsGenerating] = react.useState(true);
    const [targetLorebookName, setTargetLorebookName] = react.useState('');
    const dialogRef = react.useRef(null);
    const previousFocusRef = react.useRef(null);

    react.useEffect(() => {
      if (!isOpen) return;
      previousFocusRef.current = document.activeElement;
      setIsGenerating(true);
      setKeywordsText(keyword);
      setEntryContent('');
      if (lorebooks.length > 0 && !targetLorebookName) {
        setTargetLorebookName(lorebooks[0].name);
      }

      contentPromise
        .then(generatedText => {
          setEntryContent(generatedText);
          setIsGenerating(false);
        })
        .catch(error => {
          setEntryContent(`Lỗi khi tạo nội dung: ${error.message}`);
          setIsGenerating(false);
        });

      const handleKeyDown = event => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }
        if (event.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              event.preventDefault();
            }
          } else if (document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }, [isOpen, keyword, contentPromise, lorebooks, targetLorebookName, onClose]);

    const handleSaveEntry = () => {
      if (!targetLorebookName || !keywordsText.trim() || !entryContent.trim()) {
        alert('Vui lòng điền từ khóa, nội dung và chọn một sổ tay.');
        return;
      }
      const targetBook = lorebooks.find(book => book.name === targetLorebookName);
      if (!targetBook) {
        alert('Không tìm thấy sổ tay đã chọn.');
        return;
      }
      const newEntry = {
        keys: keywordsText.split(',').map(item => item.trim()).filter(Boolean),
        content: entryContent,
        comment: keywordsText.split(',')[0].trim(),
        enabled: true,
        uid: `entry_${Date.now()}`,
      };
      updateLorebook({
        ...targetBook,
        book: {
          ...targetBook.book,
          entries: [...(targetBook.book.entries || []), newEntry],
        },
      });
      onClose();
    };

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'new-lorebook-entry-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col',
        onClick: event => event.stopPropagation(),
        children: [
          jsxRuntime.jsxs('header', {
            className: 'p-4 border-b border-slate-700 flex justify-between items-center',
            children: [
              jsxRuntime.jsx('h2', {
                id: 'new-lorebook-entry-title',
                className: 'text-xl font-bold text-sky-400',
                children: 'Tạo Mục Sổ tay AI Mới',
              }),
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'p-1 text-slate-400 hover:text-white',
                'aria-label': 'Đóng',
                children: jsxRuntime.jsx('svg', {
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-6 w-6',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  stroke: 'currentColor',
                  'aria-hidden': 'true',
                  children: jsxRuntime.jsx('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M6 18L18 6M6 6l12 12',
                  }),
                }),
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-6 space-y-4 overflow-y-auto',
            children: [
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsx('label', {
                    htmlFor: 'new-lorebook-keywords',
                    className: 'block text-sm font-medium text-slate-300 mb-1',
                    children: 'Từ khóa (phân tách bằng dấu phẩy)',
                  }),
                  jsxRuntime.jsx('input', {
                    id: 'new-lorebook-keywords',
                    type: 'text',
                    value: keywordsText,
                    onChange: event => setKeywordsText(event.target.value),
                    className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200',
                  }),
                ],
              }),
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsx('label', {
                    htmlFor: 'new-lorebook-content',
                    className: 'block text-sm font-medium text-slate-300 mb-1',
                    children: 'Nội dung',
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'relative min-h-[200px]',
                    children: [
                      isGenerating && jsxRuntime.jsx('div', {
                        className: 'absolute inset-0 flex items-center justify-center bg-slate-700/50 rounded-md',
                        children: jsxRuntime.jsx(LoadingIndicator, {
                          message: 'Gemini đang viết mô tả...',
                        }),
                      }),
                      jsxRuntime.jsx('textarea', {
                        id: 'new-lorebook-content',
                        value: entryContent,
                        onChange: event => setEntryContent(event.target.value),
                        rows: 12,
                        className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200',
                        disabled: isGenerating,
                      }),
                    ],
                  }),
                ],
              }),
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsx('label', {
                    htmlFor: 'new-lorebook-target',
                    className: 'block text-sm font-medium text-slate-300 mb-1',
                    children: 'Lưu vào Sổ tay',
                  }),
                  jsxRuntime.jsx('select', {
                    id: 'new-lorebook-target',
                    value: targetLorebookName,
                    onChange: event => setTargetLorebookName(event.target.value),
                    className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200',
                    disabled: lorebooks.length === 0,
                    children: lorebooks.length > 0
                      ? lorebooks.map(book => jsxRuntime.jsx('option', {
                          value: book.name,
                          children: book.name,
                        }, book.name))
                      : jsxRuntime.jsx('option', {
                          children: 'Không có sổ tay nào để lưu',
                        }),
                  }),
                ],
              }),
            ],
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
                onClick: handleSaveEntry,
                disabled: isGenerating || lorebooks.length === 0,
                className: 'px-4 py-2 text-sm font-medium rounded-md bg-sky-600 hover:bg-sky-700 text-white disabled:bg-slate-600 disabled:cursor-not-allowed',
                children: 'Lưu',
              }),
            ],
          }),
        ],
      }),
    });
  };
}
