// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

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

    const { lorebooks } = lorebookStore();
    const { showToast } = useToast();

    const [entries, setEntries] = react.useState(() => {
      let hydratedEntries = JSON.parse(JSON.stringify(initialEntries)).map(entry => ({
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
    const [isAttachDialogOpen, setIsAttachDialogOpen] = react.useState(false);
    const { statusMap } = useEmbeddingSync(characterId || '', entries);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    const visibleEntries = react.useMemo(
      () => (
        selectedSource === '__internal__'
          ? entries.filter(entry => !entry.source_lorebook || entry.source_lorebook === '__internal__')
          : entries.filter(entry => entry.source_lorebook === selectedSource)
      ),
      [entries, selectedSource],
    );

    useDialogFocus(true, onClose, dialogRef, closeButtonRef);

    const handleMergeAttachedBook = bookName => {
      setEntries(previous => previous.map(entry => (
        entry.source_lorebook === bookName ? { ...entry, source_lorebook: undefined } : entry
      )));
      setAttachedBooks(previous => previous.filter(name => name !== bookName));
      setSelectedSource('__internal__');
      showToast('Đã chuyển đổi dữ liệu thành Nội bộ.', 'success');
    };

    const handleDetachBook = bookName => {
      setAttachedBooks(previous => previous.filter(name => name !== bookName));
      setEntries(previous => previous.filter(entry => entry.source_lorebook !== bookName));
      if (selectedSource === bookName) {
        setSelectedSource('__internal__');
      }
      showToast(`Đã gỡ liên kết và xóa dữ liệu của: ${bookName}`, 'info');
    };

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

    const handleAttachOrMergeAction = (actionType, lorebookRecord) => {
      const sourceEntries = lorebookRecord.book?.entries || [];
      if (actionType === 'link') {
        if (attachedBooks.includes(lorebookRecord.name)) {
          showToast('Sổ tay này đã được liên kết rồi.', 'warning');
          return;
        }
        const linkedEntries = JSON.parse(JSON.stringify(sourceEntries));
        linkedEntries.forEach(entry => {
          entry.uid = `linked_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          entry.source_lorebook = lorebookRecord.name;
          if (entry.enabled === undefined) {
            entry.enabled = true;
          }
        });
        setEntries(previous => [...previous, ...linkedEntries]);
        setAttachedBooks(previous => [...previous, lorebookRecord.name]);
        showToast(`Đã liên kết và nhập ${linkedEntries.length} mục từ: ${lorebookRecord.name}`, 'success');
        setSelectedSource(lorebookRecord.name);
      } else {
        const mergedEntries = JSON.parse(JSON.stringify(sourceEntries));
        mergedEntries.forEach(entry => {
          entry.uid = `merged_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          entry.source_lorebook = undefined;
          if (entry.enabled === undefined) {
            entry.enabled = true;
          }
        });
        setEntries(previous => [...previous, ...mergedEntries]);
        showToast(`Đã gộp ${mergedEntries.length} mục vào Sổ tay Gốc.`, 'success');
        setSelectedSource('__internal__');
      }
      setIsAttachDialogOpen(false);
    };

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'lorebook-manager-shell fixed inset-0 z-[100] bg-slate-900 flex flex-col',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'lorebook-manager-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'manager-header bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md z-10 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                jsxRuntime.jsx('button', {
                  ref: closeButtonRef,
                  onClick: onClose,
                  className: 'p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white ',
                  'aria-label': 'Đóng trình quản lý sổ tay',
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
                      d: 'M10 19l-7-7m0 0l7-7m-7 7h18',
                    }),
                  }),
                }),
                jsxRuntime.jsx('h2', {
                  id: 'lorebook-manager-title',
                  className: 'text-xl font-bold text-sky-400 flex items-center gap-2',
                  children: '📖 Quản lý Sổ tay & Liên kết',
                }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'flex items-center gap-4',
              children: jsxRuntime.jsxs('button', {
                onClick: () => onSave(entries.filter(entry => !entry.__deleted), attachedBooks),
                className: 'px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white  shadow-lg shadow-sky-900/20 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('svg', {
                    'aria-hidden': 'true',
                    xmlns: 'http://www.w3.org/2000/svg',
                    className: 'h-5 w-5',
                    viewBox: '0 0 20 20',
                    fill: 'currentColor',
                    children: jsxRuntime.jsx('path', {
                      fillRule: 'evenodd',
                      d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                      clipRule: 'evenodd',
                    }),
                  }),
                  'Lưu & Áp dụng',
                ],
              }),
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'manager-layout flex flex-grow overflow-hidden',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'manager-sidebar w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col shrink-0',
              children: [
                jsxRuntime.jsx('div', {
                  className: 'p-3 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider',
                  children: 'Danh sách Sổ tay',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar',
                  children: [
                    jsxRuntime.jsxs('button', {
                      onClick: () => setSelectedSource('__internal__'),
                      className: `w-full text-left p-3 rounded-lg border  flex items-center justify-between group ${
                        selectedSource === '__internal__'
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700'
                      }`,
                      children: [
                        jsxRuntime.jsxs('div', {
                          className: 'flex flex-col overflow-hidden',
                          children: [
                            jsxRuntime.jsx('span', {
                              className: 'font-bold text-sm truncate',
                              children: 'Sổ tay Gốc (Nội bộ)',
                            }),
                            jsxRuntime.jsxs('span', {
                              className: 'text-xs opacity-70',
                              children: [entries.filter(entry => !entry.source_lorebook).length, ' mục'],
                            }),
                          ],
                        }),
                        selectedSource === '__internal__' && jsxRuntime.jsx('span', {
                          className: 'w-2 h-2 rounded-full bg-sky-400',
                        }),
                      ],
                    }),
                    jsxRuntime.jsx('div', { className: 'h-px bg-slate-700 my-2' }),
                    attachedBooks.map(bookName => {
                      const entryCount = entries.filter(entry => entry.source_lorebook === bookName).length;
                      const isSelected = selectedSource === bookName;
                      return jsxRuntime.jsxs('div', {
                        onClick: () => setSelectedSource(bookName),
                        onKeyDown: event => {
                          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            setSelectedSource(bookName);
                          }
                        },
                        role: 'button',
                        tabIndex: 0,
                        'aria-pressed': isSelected,
                        className: `w-full p-3 rounded-lg border flex flex-col gap-2 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          isSelected
                            ? 'bg-amber-900/20 border-amber-500 text-amber-300'
                            : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                        }`,
                        children: [
                          jsxRuntime.jsxs('div', {
                            className: 'flex justify-between items-center w-full',
                            children: [
                              jsxRuntime.jsxs('div', {
                                className: 'flex flex-col overflow-hidden',
                                children: [
                                  jsxRuntime.jsxs('span', {
                                    className: 'font-medium text-sm truncate flex-grow',
                                    children: ['🔗 ', bookName],
                                  }),
                                  jsxRuntime.jsxs('span', {
                                    className: 'text-xs opacity-70',
                                    children: [entryCount, ' mục'],
                                  }),
                                ],
                              }),
                              isSelected && jsxRuntime.jsx('span', {
                                className: 'w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-2',
                              }),
                            ],
                          }),
                          jsxRuntime.jsxs('div', {
                            className: `flex gap-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} `,
                            children: [
                              jsxRuntime.jsx('button', {
                                onClick: event => {
                                  event.stopPropagation();
                                  handleMergeAttachedBook(bookName);
                                },
                                className: 'text-[10px] bg-slate-700 hover:bg-sky-700 hover:text-white px-2 py-1 rounded text-slate-300 flex-1 border border-slate-600',
                                title: 'Chuyển thành nội bộ',
                                children: 'Gộp',
                              }),
                              jsxRuntime.jsx('button', {
                                onClick: event => {
                                  event.stopPropagation();
                                  handleDetachBook(bookName);
                                },
                                className: 'text-[10px] bg-slate-700 hover:bg-red-700 hover:text-white px-2 py-1 rounded text-slate-300 border border-slate-600',
                                title: 'Gỡ liên kết và xóa dữ liệu',
                                children: 'Gỡ',
                              }),
                            ],
                          }),
                        ],
                      }, bookName);
                    }),
                  ],
                }),
                jsxRuntime.jsx('div', {
                  className: 'p-3 border-t border-slate-700 bg-slate-800/30',
                  children: jsxRuntime.jsxs('button', {
                    onClick: () => setIsAttachDialogOpen(true),
                    className: 'w-full py-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-bold text-xs rounded border border-slate-600 border-dashed flex items-center justify-center gap-2',
                    children: [
                      jsxRuntime.jsx('span', { children: '+' }),
                      ' Thêm / Liên kết',
                    ],
                  }),
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex-grow bg-slate-900/50 relative overflow-hidden flex flex-col',
              children: [
                jsxRuntime.jsxs('div', {
                  className: 'px-6 py-2 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center text-xs text-slate-400',
                  children: [
                    jsxRuntime.jsxs('span', {
                      children: [
                        'Đang chỉnh sửa: ',
                        jsxRuntime.jsx('strong', {
                          className: selectedSource === '__internal__' ? 'text-sky-400' : 'text-amber-400',
                          children: selectedSource === '__internal__' ? 'Sổ tay Gốc' : selectedSource,
                        }),
                      ],
                    }),
                    selectedSource !== '__internal__' && jsxRuntime.jsx('span', {
                      className: 'italic opacity-80',
                      children: 'Mọi thay đổi ở đây chỉ ảnh hưởng đến nhân vật này.',
                    }),
                  ],
                }),
                jsxRuntime.jsx('div', {
                  className: 'flex-grow p-4 sm:p-6 overflow-hidden',
                  children: jsxRuntime.jsx(LorebookEntryList, {
                    entries: visibleEntries,
                    onUpdate: handleUpdateVisibleEntries,
                    statusMap,
                    className: 'h-full',
                  }),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx(AttachLorebookDialog, {
          isOpen: isAttachDialogOpen,
          onClose: () => setIsAttachDialogOpen(false),
          lorebooks,
          onAction: handleAttachOrMergeAction,
        }),
      ],
    });
  };
}
