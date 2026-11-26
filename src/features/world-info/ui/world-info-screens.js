// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

function resolveWorldInfoScreenDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    useDialogFocus: deps.useDialogFocus,
    useToast: deps.useToast,
    lorebookStore: deps.lorebookStore,
    LoadingIndicator: deps.LoadingIndicator,
    useEmbeddingSync: deps.useEmbeddingSync,
    LorebookEntryList: deps.LorebookEntryList,
    AttachLorebookDialog: deps.AttachLorebookDialog,
    embeddingService: deps.embeddingService,
    getSmartScanSettings: deps.getSmartScanSettings,
    embedQuery: deps.embedQuery,
    loadEmbeddingIndex: deps.loadEmbeddingIndex,
    getEmbeddingIndex: deps.getEmbeddingIndex,
    cosineSimilarity: deps.cosineSimilarity,
    ActiveWorldInfoEntry: deps.ActiveWorldInfoEntry,
    RelevanceTestDialog: deps.RelevanceTestDialog,
  };
}

export function createEntrySelectionControl(getDependencies) {
  return function EntrySelectionControl({
    filter,
    currentFilter,
    onClick,
    label,
    count,
  }) {
    const { jsxRuntime } = resolveWorldInfoScreenDeps(getDependencies);
    const isActive = currentFilter === filter;

    return jsxRuntime.jsxs('button', {
      onClick: () => onClick(filter),
      'aria-pressed': isActive,
      className: `px-3 py-1.5 text-xs font-medium rounded-md  flex items-center gap-2 outline-none focus:ring-2 focus:ring-sky-500 ${
        isActive
          ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
      }`,
      children: [
        label,
        count !== undefined && jsxRuntime.jsx('span', {
          className: `px-1.5 py-0.5 rounded-full text-[10px] ${
            isActive ? 'bg-sky-800 text-sky-100' : 'bg-slate-800 text-slate-500'
          }`,
          children: count,
        }),
      ],
    });
  };
}

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
    } = resolveWorldInfoScreenDeps(getDependencies);

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

export function createEmbeddingProviderStatus(getDependencies) {
  return function EmbeddingProviderStatus({ providerId, showToast }) {
    const {
      embeddingService,
      react,
      jsxRuntime,
    } = resolveWorldInfoScreenDeps(getDependencies);

    const [providerStatus, setProviderStatus] = react.useState({
      status: 'checking',
      progress: 0,
    });
    const providerInfo = embeddingService.getProviderInfo(providerId);
    const isLocalProvider = providerInfo.kind === 'local';

    react.useEffect(() => {
      let cancelled = false;
      setProviderStatus({ status: 'checking', progress: 0 });
      embeddingService
        .getProviderStatus(providerId)
        .then(status => {
          if (!cancelled) {
            setProviderStatus(status);
          }
        })
        .catch(error => {
          if (!cancelled) {
            setProviderStatus({
              status: 'error',
              progress: 0,
              error: error?.message || String(error),
            });
          }
        });
      return () => {
        cancelled = true;
      };
    }, [providerId]);

    const handleDownloadModel = async () => {
      try {
        setProviderStatus({ status: 'loading', progress: 0 });
        await embeddingService.prepareProvider(providerId, progressEvent => {
          setProviderStatus({
            status: 'loading',
            progress: Math.max(0, Math.min(100, Number(progressEvent?.progress) || 0)),
          });
        });
        setProviderStatus(await embeddingService.getProviderStatus(providerId));
        showToast(`Mô hình ${providerInfo.shortLabel} đã sẵn sàng.`, 'success');
      } catch (error) {
        setProviderStatus({
          status: 'error',
          progress: 0,
          error: error?.message || String(error),
        });
        showToast(`Không thể tải mô hình: ${error?.message || error}`, 'error');
      }
    };

    const handleDeleteModel = async () => {
      try {
        await embeddingService.deleteProvider(providerId);
        setProviderStatus(await embeddingService.getProviderStatus(providerId));
        showToast(`Đã xóa ${providerInfo.shortLabel} khỏi bộ nhớ cục bộ.`, 'info');
      } catch (error) {
        showToast(`Không thể xóa mô hình: ${error?.message || error}`, 'error');
      }
    };

    if (!isLocalProvider) {
      return jsxRuntime.jsx('div', {
        className: 'bg-slate-900/50 border border-slate-700 rounded-lg p-3',
        children: jsxRuntime.jsxs('div', {
          className: 'flex items-center justify-between gap-3',
          children: [
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('div', {
                  className: 'text-sm font-bold text-sky-300',
                  children: providerInfo.shortLabel,
                }),
                jsxRuntime.jsx('div', {
                  className: 'text-xs text-slate-400 mt-1',
                  children: 'Online · sử dụng Gemini API đã cấu hình',
                }),
              ],
            }),
            jsxRuntime.jsx('span', {
              className: `text-xs font-bold ${
                providerStatus.status === 'ready' ? 'text-emerald-400' : 'text-amber-400'
              }`,
              children: providerStatus.status === 'ready' ? 'Sẵn sàng' : 'Chưa có API Key',
            }),
          ],
        }),
      });
    }

    let statusLabel = 'Chưa tải';
    if (providerStatus.status === 'ready') {
      statusLabel = 'Sẵn sàng';
    } else if (providerStatus.status === 'cached') {
      statusLabel = 'Đã tải · sẵn sàng';
    } else if (providerStatus.status === 'loading') {
      statusLabel = 'Đang tải...';
    } else if (providerStatus.status === 'error') {
      statusLabel = 'Lỗi';
    } else if (providerStatus.status === 'checking') {
      statusLabel = 'Đang kiểm tra...';
    }

    const statusToneClass = providerStatus.status === 'ready' || providerStatus.status === 'cached'
      ? 'text-emerald-400'
      : (providerStatus.status === 'error' ? 'text-red-400' : 'text-amber-400');

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-3',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-start justify-between gap-3',
          children: [
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('div', {
                  className: 'text-sm font-bold text-sky-300',
                  children: providerInfo.shortLabel,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'text-xs text-slate-400 mt-1',
                  children: [providerInfo.sizeLabel, ' · lưu trên thiết bị'],
                }),
              ],
            }),
            jsxRuntime.jsx('span', {
              className: `text-xs font-bold ${statusToneClass}`,
              children: statusLabel,
            }),
          ],
        }),
        providerStatus.status === 'loading' && jsxRuntime.jsxs('div', {
          className: 'space-y-1',
          children: [
            jsxRuntime.jsx('div', {
              className: 'h-2 bg-slate-800 rounded-full overflow-hidden',
              children: jsxRuntime.jsx('div', {
                className: 'h-full bg-sky-500',
                style: { width: `${providerStatus.progress || 0}%` },
              }),
            }),
            jsxRuntime.jsxs('div', {
              className: 'text-[11px] text-slate-400 text-right',
              children: [Math.round(providerStatus.progress || 0), '%'],
            }),
          ],
        }),
        providerStatus.error && jsxRuntime.jsx('div', {
          className: 'text-xs text-red-400',
          children: providerStatus.error,
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex flex-wrap gap-2',
          children: [
            (providerStatus.status === 'missing' || providerStatus.status === 'error') && jsxRuntime.jsx('button', {
              type: 'button',
              onClick: handleDownloadModel,
              className: 'px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold',
              children: 'TẢI MÔ HÌNH',
            }),
            (providerStatus.status === 'cached' || providerStatus.status === 'ready') && jsxRuntime.jsx('button', {
              type: 'button',
              onClick: handleDeleteModel,
              className: 'px-3 py-2 rounded-lg bg-slate-700 hover:bg-red-700 text-slate-200 text-xs font-bold',
              children: 'XÓA MÔ HÌNH',
            }),
          ],
        }),
      ],
    });
  };
}

export function createRelevanceTestDialog(getDependencies) {
  return function RelevanceTestDialog({ characterId, entries, onClose }) {
    const {
      embedQuery,
      getEmbeddingIndex,
      cosineSimilarity,
      loadEmbeddingIndex,
      useDialogFocus,
      embeddingService,
      getSmartScanSettings,
      react,
      jsxRuntime,
    } = resolveWorldInfoScreenDeps(getDependencies);

    const [queryText, setQueryText] = react.useState('');
    const [scoredResults, setScoredResults] = react.useState([]);
    const [isTesting, setIsTesting] = react.useState(false);
    const [errorMessage, setErrorMessage] = react.useState(null);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    const handleRunRelevanceTest = async () => {
      if (!queryText.trim()) return;
      setIsTesting(true);
      setErrorMessage(null);
      try {
        const providerId = getSmartScanSettings().embedding_provider || 'gemini';
        const queryVector = await embedQuery(queryText, providerId);
        await loadEmbeddingIndex(characterId, providerId);
        const indexRecords = getEmbeddingIndex(characterId, providerId);
        const entriesByUid = new Map(entries.map(entry => [entry.uid, entry]));

        const scoredChunks = indexRecords
          .map(record => ({
            entry: entriesByUid.get(record.uid),
            uid: record.uid,
            score: cosineSimilarity(queryVector, record.vector),
          }))
          .filter(item => item.entry !== undefined);

        const bestByUid = new Map();
        scoredChunks.forEach(item => {
          const existing = bestByUid.get(item.uid);
          if (!existing || item.score > existing.score) {
            bestByUid.set(item.uid, { entry: item.entry, score: item.score });
          }
        });

        const sortedResults = Array.from(bestByUid.values());
        sortedResults.sort((left, right) => right.score - left.score);
        setScoredResults(sortedResults);
      } catch (error) {
        console.error('Relevance Test Error:', error);
        setErrorMessage(error.message || 'Lỗi khi kiểm tra độ liên quan.');
      } finally {
        setIsTesting(false);
      }
    };

    const semanticThreshold = getSmartScanSettings().semantic_threshold || 0.7;
    useDialogFocus(true, onClose, dialogRef, closeButtonRef);

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'relevance-tester-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex items-center justify-between p-4 border-b border-slate-800',
            children: [
              jsxRuntime.jsx('h2', {
                id: 'relevance-tester-title',
                className: 'text-xl font-bold text-sky-400',
                children: [
                  'Relevance Tester · ',
                  embeddingService.getProviderInfo(getSmartScanSettings().embedding_provider || 'gemini').shortLabel,
                ],
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'text-slate-400 hover:text-white ',
                'aria-label': 'Đóng',
                children: '✕',
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-800 bg-slate-800/50',
            children: [
              jsxRuntime.jsxs('div', {
                className: 'flex gap-2',
                children: [
                  jsxRuntime.jsx('input', {
                    type: 'text',
                    'aria-label': 'Truy vấn kiểm tra độ liên quan',
                    value: queryText,
                    onChange: event => setQueryText(event.target.value),
                    onKeyDown: event => event.key === 'Enter' && handleRunRelevanceTest(),
                    placeholder: 'Nhập câu hỏi hoặc ngữ cảnh để kiểm tra...',
                    className: 'flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500',
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: handleRunRelevanceTest,
                    disabled: isTesting || !queryText.trim(),
                    className: 'bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-lg font-medium  disabled:opacity-50',
                    children: isTesting ? 'Đang kiểm tra...' : 'Kiểm tra',
                  }),
                ],
              }),
              errorMessage && jsxRuntime.jsx('div', {
                className: 'text-red-400 text-sm mt-2',
                children: errorMessage,
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'flex-1 overflow-y-auto p-4 space-y-2',
            children: [
              scoredResults.length === 0 && !isTesting && !errorMessage && jsxRuntime.jsx('div', {
                className: 'text-center text-slate-500 py-10',
                children: 'Nhập truy vấn để xem các mục Lorebook liên quan nhất.',
              }),
              scoredResults.map((result, index) => {
                const meetsThreshold = result.score >= semanticThreshold;
                return jsxRuntime.jsxs('div', {
                  className: `p-3 rounded-lg border ${
                    meetsThreshold ? 'bg-sky-900/20 border-sky-500/30' : 'bg-slate-800/30 border-slate-700/50'
                  } flex flex-col gap-1`,
                  children: [
                    jsxRuntime.jsxs('div', {
                      className: 'flex justify-between items-start',
                      children: [
                        jsxRuntime.jsx('div', {
                          className: 'font-medium text-slate-200',
                          children: result.entry.keys.join(', '),
                        }),
                        jsxRuntime.jsxs('div', {
                          className: `text-sm font-mono font-bold ${
                            meetsThreshold ? 'text-emerald-400' : 'text-slate-500'
                          }`,
                          children: [(100 * result.score).toFixed(1), '%'],
                        }),
                      ],
                    }),
                    jsxRuntime.jsx('div', {
                      className: 'text-sm text-slate-400 line-clamp-2',
                      children: result.entry.content,
                    }),
                  ],
                }, result.entry.uid || index);
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createDynamicWorldInfoDialog(getDependencies) {
  return function DynamicWorldInfoDialog({
    isOpen,
    onClose,
    entries,
    worldInfoState,
    worldInfoPinned,
    worldInfoPlacement,
    onUpdate,
    onUpdatePinned,
    onUpdatePlacement,
    characterId,
  }) {
    const {
      ActiveWorldInfoEntry,
      useEmbeddingSync,
      RelevanceTestDialog,
      useDialogFocus,
      embeddingService,
      getSmartScanSettings,
      react,
      jsxRuntime,
    } = resolveWorldInfoScreenDeps(getDependencies);

    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    const [isTesterOpen, setIsTesterOpen] = react.useState(false);

    const {
      statusMap,
      isSyncing,
      syncProgress,
      syncedCount,
      totalCount,
      handleSync,
    } = useEmbeddingSync(characterId || '', entries);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    const handleToggleEntry = (uid, enabled) => onUpdate({ ...worldInfoState, [uid]: enabled });
    const handlePinEntry = (uid, pinned) => onUpdatePinned({ ...worldInfoPinned, [uid]: pinned });
    const handlePlacementChange = (uid, placement) => onUpdatePlacement({ ...worldInfoPlacement, [uid]: placement });

    if (!isOpen) return null;

    const allSynced = syncedCount === totalCount && totalCount > 0;

    return jsxRuntime.jsxs('div', {
      className: 'fixed inset-0 bg-black/70  flex items-center justify-center z-[100] p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'dynamic-world-info-title',
      children: [
        jsxRuntime.jsxs('div', {
          ref: dialogRef,
          className: 'bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col',
          onClick: event => event.stopPropagation(),
          children: [
            jsxRuntime.jsxs('header', {
              className: 'p-4 border-b border-slate-700 flex-shrink-0 bg-slate-900/50 rounded-t-xl flex justify-between items-center',
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('h2', {
                      id: 'dynamic-world-info-title',
                      className: 'text-xl font-bold text-sky-400',
                      children: 'Quản lý World Info Động',
                    }),
                    jsxRuntime.jsx('p', {
                      className: 'text-sm text-slate-400 mt-1',
                      children: 'Kiểm soát trạng thái, ghim và vị trí chèn của các mục World Info.',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-3',
                  children: [
                    characterId && jsxRuntime.jsxs('div', {
                      className: 'flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner',
                      children: [
                        jsxRuntime.jsxs('div', {
                          className: 'flex flex-col items-end',
                          children: [
                            jsxRuntime.jsx('span', {
                              className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider',
                              children: [
                                'Semantic Sync · ',
                                embeddingService.getProviderInfo(getSmartScanSettings().embedding_provider || 'gemini').shortLabel,
                              ],
                            }),
                            jsxRuntime.jsxs('span', {
                              className: 'text-[10px] text-slate-500 font-mono',
                              children: [syncedCount, '/', totalCount],
                            }),
                          ],
                        }),
                        isSyncing
                          ? jsxRuntime.jsxs('div', {
                              className: 'flex items-center gap-2',
                              children: [
                                jsxRuntime.jsx('div', {
                                  className: 'w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden',
                                  children: jsxRuntime.jsx('div', {
                                    className: 'h-full bg-sky-500  ',
                                    style: {
                                      width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%`,
                                    },
                                  }),
                                }),
                                jsxRuntime.jsx('span', {
                                  className: 'text-[10px] text-sky-400  font-medium',
                                  children: 'Đang chạy...',
                                }),
                              ],
                            })
                          : jsxRuntime.jsx('button', {
                              onClick: handleSync,
                              disabled: allSynced,
                              title: allSynced ? 'Tất cả đã được đồng bộ' : 'Đồng bộ hóa dữ liệu tìm kiếm ngữ nghĩa',
                              className: `p-1.5 rounded-md  flex items-center justify-center ${
                                allSynced
                                  ? 'text-emerald-500 opacity-50 cursor-default'
                                  : 'bg-sky-600 hover:bg-sky-500 text-white  active:scale-95'
                              }`,
                              children: jsxRuntime.jsx('svg', {
                                'aria-hidden': 'true',
                                xmlns: 'http://www.w3.org/2000/svg',
                                className: 'h-4 w-4',
                                fill: 'none',
                                viewBox: '0 0 24 24',
                                stroke: 'currentColor',
                                children: jsxRuntime.jsx('path', {
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                  strokeWidth: '2',
                                  d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                                }),
                              }),
                            }),
                      ],
                    }),
                    characterId && jsxRuntime.jsxs('button', {
                      onClick: () => setIsTesterOpen(true),
                      className: 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2  shadow-lg shadow-indigo-900/20',
                      children: [
                        jsxRuntime.jsx('span', { className: 'text-sm', children: '🔍' }),
                        'Tester',
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'p-4 flex-grow overflow-y-auto custom-scrollbar space-y-4 bg-slate-800',
              children: entries.length === 0
                ? jsxRuntime.jsx('p', {
                    className: 'text-slate-500 text-center italic py-10',
                    children: 'Nhân vật này không có mục World Info nào.',
                  })
                : entries.map(entry => jsxRuntime.jsx(ActiveWorldInfoEntry, {
                    entry,
                    isEnabled: worldInfoState[entry.uid] ?? entry.enabled !== false,
                    isPinned: Boolean(worldInfoPinned[entry.uid]),
                    placement: worldInfoPlacement[entry.uid],
                    syncStatus: statusMap[entry.uid],
                    onToggle: handleToggleEntry,
                    onPin: handlePinEntry,
                    onPlacementChange: handlePlacementChange,
                  }, entry.uid)),
            }),
            jsxRuntime.jsx('footer', {
              className: 'p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0 bg-slate-900/50 rounded-b-xl',
              children: jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white ',
                children: 'Đóng',
              }),
            }),
          ],
        }),
        isTesterOpen && characterId && jsxRuntime.jsx(RelevanceTestDialog, {
          characterId,
          entries,
          onClose: () => setIsTesterOpen(false),
        }),
      ],
    });
  };
}

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
    } = resolveWorldInfoScreenDeps(getDependencies);

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