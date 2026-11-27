export function createLorebookManager(getDependencies) {
  return function LorebookManager({
    initialEntries,
    initialAttached = [],
    onClose,
    onSave,
    characterId,
  }) {
    const {
      useEmbeddingSync,
      LorebookEntryList,
      useDialogFocus,
      AttachLorebookDialog,
      react,
      useToast,
      lorebookStore,
      jsxRuntime,
    } = getDependencies();

    const { lorebooks: storedLorebooks, createLorebook } = lorebookStore();
    const lorebooks = Array.isArray(storedLorebooks) ? storedLorebooks : [];
    const { showToast } = useToast();

    const [entries, setEntries] = react.useState(() => {
      let hydratedEntries = JSON.parse(JSON.stringify(initialEntries || [])).map(entry => ({
        ...entry,
        uid: entry.uid || `entry_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      }));
      if (initialAttached && initialAttached.length > 0) {
        initialAttached.forEach(bookName => {
          if (!hydratedEntries.some(entry => entry.source_lorebook === bookName)) {
            const matchedBook = lorebooks.find(book => book.name === bookName);
            if (matchedBook && matchedBook.book.entries.length > 0) {
              const clonedEntries = JSON.parse(JSON.stringify(matchedBook.book.entries));
              clonedEntries.forEach(entry => {
                entry.uid = `hydrated_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                entry.source_lorebook = bookName;
              });
              hydratedEntries = [...hydratedEntries, ...clonedEntries];
            }
          }
        });
      }
      return hydratedEntries;
    });

    const [attachedBooks, setAttachedBooks] = react.useState(() => [...initialAttached]);
    const [selectedSource, setSelectedSource] = react.useState('__internal__');
    const [isOptionsOpen, setIsOptionsOpen] = react.useState(false);
    const [isAttachDialogOpen, setIsAttachDialogOpen] = react.useState(false);
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = react.useState(false);
    const [duplicateName, setDuplicateName] = react.useState('');
    const [isMergeDialogOpen, setIsMergeDialogOpen] = react.useState(false);
    const [mergeSourceName, setMergeSourceName] = react.useState('');

    const { statusMap } = useEmbeddingSync(characterId || '', entries);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    const menuRef = react.useRef(null);

    const visibleEntries = react.useMemo(
      () => (
        selectedSource === '__internal__'
          ? entries.filter(entry => !entry.source_lorebook || entry.source_lorebook === '__internal__')
          : entries.filter(entry => entry.source_lorebook === selectedSource)
      ),
      [entries, selectedSource],
    );

    const handleCloseWithSave = () => {
      onSave(entries, attachedBooks);
    };

    useDialogFocus(true, handleCloseWithSave, dialogRef, closeButtonRef);

    if (typeof react.useEffect === 'function') {
      react.useEffect(() => {
        if (!isOptionsOpen) return;
        const handleOutside = event => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOptionsOpen(false);
          }
        };
        const handleKey = event => {
          if (event.key === 'Escape') setIsOptionsOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
          document.removeEventListener('mousedown', handleOutside);
          document.removeEventListener('keydown', handleKey);
        };
      }, [isOptionsOpen]);
    }

    const handleUpdateVisibleEntries = nextVisibleEntries => {
      setEntries(previous => {
        const untouchedEntries = previous.filter(
          entry => (entry.source_lorebook || '__internal__') !== selectedSource,
        );
        return [
          ...untouchedEntries,
          ...nextVisibleEntries.map(entry => ({
            ...entry,
            source_lorebook: selectedSource === '__internal__' ? undefined : selectedSource,
          })),
        ];
      });
    };

    const handleDetachCurrentBook = () => {
      if (selectedSource === '__internal__') return;
      const target = selectedSource;
      setAttachedBooks(previous => previous.filter(name => name !== target));
      setEntries(previous => previous.filter(entry => entry.source_lorebook !== target));
      setSelectedSource('__internal__');
      showToast(`Đã gỡ liên kết sổ tay "${target}".`, 'info');
    };

    const handleConfirmDuplicate = async () => {
      const cleanName = duplicateName.trim();
      if (!cleanName) {
        showToast('Tên sổ tay không được để trống.', 'error');
        return;
      }
      try {
        if (typeof createLorebook === 'function') {
          await createLorebook(cleanName, visibleEntries, { isGlobal: false });
          showToast(`Đã tách thành sổ tay độc lập "${cleanName}".`, 'success');
        }
        setIsDuplicateDialogOpen(false);
      } catch (err) {
        showToast(`Lỗi: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    };

    const handleConfirmMerge = () => {
      const sourceBook = lorebooks.find(book => book.name === mergeSourceName);
      if (!sourceBook) {
        setIsMergeDialogOpen(false);
        return;
      }
      const merged = JSON.parse(JSON.stringify(sourceBook.book?.entries || [])).map((entry, idx) => ({
        ...entry,
        uid: `merged_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        source_lorebook: selectedSource === '__internal__' ? undefined : selectedSource,
        enabled: entry.enabled !== false,
      }));
      setEntries(previous => [...previous, ...merged]);
      showToast(`Đã gộp ${merged.length} quy tắc từ "${sourceBook.name}".`, 'success');
      setIsMergeDialogOpen(false);
    };

    const handleAttachOrMergeAction = (actionType, lorebookRecord) => {
      const sourceEntries = lorebookRecord.book?.entries || [];
      if (actionType === 'link') {
        if (attachedBooks.includes(lorebookRecord.name)) {
          showToast('Sổ tay này đã được liên kết rồi.', 'warning');
          return;
        }
        const linkedEntries = JSON.parse(JSON.stringify(sourceEntries)).map(entry => ({
          ...entry,
          uid: `linked_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          source_lorebook: lorebookRecord.name,
          enabled: entry.enabled !== false,
        }));
        setEntries(previous => [...previous, ...linkedEntries]);
        setAttachedBooks(previous => [...previous, lorebookRecord.name]);
        showToast(`Đã liên kết ${linkedEntries.length} quy tắc từ "${lorebookRecord.name}".`, 'success');
        setSelectedSource(lorebookRecord.name);
      } else {
        const mergedEntries = JSON.parse(JSON.stringify(sourceEntries)).map(entry => ({
          ...entry,
          uid: `merged_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          source_lorebook: undefined,
          enabled: entry.enabled !== false,
        }));
        setEntries(previous => [...previous, ...mergedEntries]);
        showToast(`Đã gộp ${mergedEntries.length} quy tắc vào Sổ tay Gốc.`, 'success');
        setSelectedSource('__internal__');
      }
      setIsAttachDialogOpen(false);
    };

    const runMenuAction = action => {
      setIsOptionsOpen(false);
      action();
    };

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'lorebook-manager-shell fixed inset-0 z-[100] bg-slate-900 flex flex-col',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'lorebook-manager-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'bg-slate-800 border-b border-slate-700 p-4 space-y-3 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center justify-between gap-3',
              children: [
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-3 min-w-0',
                  children: [
                    jsxRuntime.jsx('button', {
                      ref: closeButtonRef,
                      type: 'button',
                      onClick: handleCloseWithSave,
                      className: 'px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold',
                      'aria-label': 'Quay lại và lưu sổ tay',
                      children: 'Quay lại',
                    }),
                    jsxRuntime.jsx('h2', {
                      id: 'lorebook-manager-title',
                      className: 'text-lg font-bold text-sky-400 truncate',
                      children: 'Sổ tay Nhân vật',
                    }),
                  ],
                }),
                jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: () => onSave(entries, attachedBooks),
                  className: 'px-4 py-1.5 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white',
                  children: 'Lưu & Đóng',
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                jsxRuntime.jsxs('select', {
                  'aria-label': 'Chọn nguồn sổ tay nhân vật',
                  value: selectedSource,
                  onChange: event => setSelectedSource(event.target.value),
                  className: 'flex-grow min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500',
                  children: [
                    jsxRuntime.jsx('option', {
                      value: '__internal__',
                      children: `Sổ tay Gốc (Mặc định) (${entries.filter(entry => !entry.source_lorebook).length})`,
                    }),
                    attachedBooks.map(bookName => jsxRuntime.jsx('option', {
                      value: bookName,
                      children: `${bookName} (${entries.filter(entry => entry.source_lorebook === bookName).length})`,
                    }, bookName)),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  ref: menuRef,
                  className: 'relative flex-shrink-0',
                  children: [
                    jsxRuntime.jsx('button', {
                      type: 'button',
                      'aria-haspopup': 'menu',
                      'aria-expanded': isOptionsOpen ? 'true' : 'false',
                      onClick: () => setIsOptionsOpen(open => !open),
                      className: 'px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold rounded-lg border border-slate-600',
                      children: 'Tùy chọn khác',
                    }),
                    isOptionsOpen && jsxRuntime.jsxs('div', {
                      role: 'menu',
                      'aria-label': 'Tùy chọn Sổ tay Nhân vật',
                      className: 'absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-30',
                      children: [
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => {
                            setDuplicateName(`${String(characterId || 'Sổ tay').replace(/\.[^.]+$/, '')} (Độc lập)`);
                            setIsDuplicateDialogOpen(true);
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: 'Nhân bản',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: lorebooks.length === 0,
                          onClick: () => runMenuAction(() => {
                            setMergeSourceName(lorebooks[0]?.name || '');
                            setIsMergeDialogOpen(true);
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed',
                          children: 'Gộp',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => setIsAttachDialogOpen(true)),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: 'Liên kết sổ tay ngoài',
                        }),
                        selectedSource !== '__internal__' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(handleDetachCurrentBook),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/60',
                          children: 'Gỡ liên kết sổ tay này',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx('div', {
          className: 'flex-grow overflow-hidden p-4 max-w-4xl w-full mx-auto flex flex-col',
          children: jsxRuntime.jsx(LorebookEntryList, {
            entries: visibleEntries,
            onUpdate: handleUpdateVisibleEntries,
            className: 'flex-grow min-h-0',
            statusMap,
          }),
        }),
        isDuplicateDialogOpen && jsxRuntime.jsx('div', {
          className: 'fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4',
          onClick: () => setIsDuplicateDialogOpen(false),
          children: jsxRuntime.jsxs('div', {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Nhân bản thành sổ tay độc lập',
            className: 'w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4',
            onClick: event => event.stopPropagation(),
            children: [
              jsxRuntime.jsx('h3', {
                className: 'text-lg font-bold text-slate-100',
                children: 'Nhân bản thành sổ tay độc lập',
              }),
              jsxRuntime.jsx('input', {
                type: 'text',
                'aria-label': 'Tên sổ tay độc lập',
                value: duplicateName,
                onChange: event => setDuplicateName(event.target.value),
                placeholder: 'Nhập tên sổ tay mới...',
                className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500',
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex justify-end gap-2',
                children: [
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    onClick: () => setIsDuplicateDialogOpen(false),
                    className: 'px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold',
                    children: 'Hủy',
                  }),
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    onClick: handleConfirmDuplicate,
                    className: 'px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold',
                    children: 'Đồng ý',
                  }),
                ],
              }),
            ],
          }),
        }),
        isMergeDialogOpen && jsxRuntime.jsx('div', {
          className: 'fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4',
          onClick: () => setIsMergeDialogOpen(false),
          children: jsxRuntime.jsxs('div', {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Gộp sổ tay',
            className: 'w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4',
            onClick: event => event.stopPropagation(),
            children: [
              jsxRuntime.jsx('h3', {
                className: 'text-lg font-bold text-slate-100',
                children: 'Gộp sổ tay',
              }),
              jsxRuntime.jsx('select', {
                'aria-label': 'Chọn sổ tay cần gộp',
                value: mergeSourceName,
                onChange: event => setMergeSourceName(event.target.value),
                className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500',
                children: lorebooks.map(book => jsxRuntime.jsx('option', {
                  value: book.name,
                  children: book.name,
                }, book.name)),
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex justify-end gap-2',
                children: [
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    onClick: () => setIsMergeDialogOpen(false),
                    className: 'px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold',
                    children: 'Hủy',
                  }),
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    disabled: !mergeSourceName,
                    onClick: handleConfirmMerge,
                    className: 'px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-40',
                    children: 'Đồng ý',
                  }),
                ],
              }),
            ],
          }),
        }),
        jsxRuntime.jsx(AttachLorebookDialog, {
          isOpen: isAttachDialogOpen,
          onClose: () => setIsAttachDialogOpen(false),
          lorebooks,
          alreadyAttached: attachedBooks,
          onAction: handleAttachOrMergeAction,
        }),
      ],
    });
  };
}
