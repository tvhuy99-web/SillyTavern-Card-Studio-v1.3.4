export function createActiveWorldInfoEntry(getDependencies) {
  return function ActiveWorldInfoEntry({
    entry: entry,
    isEnabled: isEnabled,
    isPinned: isPinned,
    placement: placement,
    onToggle: onToggle,
    onPin: onPin,
    onPlacementChange: onPlacementChange,
    syncStatus: syncStatus
  }) {
    const {
      EntryPositionControl,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    return entry.uid ? (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex flex-col gap-3  " + (isPinned ? "ring-1 ring-amber-500/50 bg-slate-700/80" : ""),
      children: [(0, jsxRuntime.jsx)("div", {
        className: "flex justify-between items-start",
        children: (0, jsxRuntime.jsxs)("div", {
          children: [(0, jsxRuntime.jsxs)("h3", {
            className: "font-bold text-base text-sky-300 flex items-center gap-2",
            children: [(() => {
              if (!syncStatus) return null;
              switch (syncStatus) {
                case "synced":
                  return (0, jsxRuntime.jsx)("span", {
                    title: "Đã đồng bộ Semantic",
                    className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"
                  });
                case "needs_sync":
                  return (0, jsxRuntime.jsx)("span", {
                    title: "Cần đồng bộ Semantic",
                    className: "w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)] "
                  });
                case "not_synced":
                  return null;
              }
            })(), entry.comment || "Mục không có tên"]
          }), (0, jsxRuntime.jsxs)("p", {
            className: "text-xs text-slate-400 mt-0.5 font-mono",
            children: ["Keys: ", (entry.keys || []).join(", ")]
          })]
        })
      }), (0, jsxRuntime.jsx)("div", {
        className: "bg-slate-800/50 rounded p-2 text-sm text-slate-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-sans border border-slate-700/50",
        children: entry.content
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex flex-wrap items-center justify-between pt-2 border-t border-slate-600/30 gap-y-2",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-3 flex-wrap",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded border border-slate-600/30",
            children: [(0, jsxRuntime.jsx)("span", {
              className: "text-xs font-semibold " + (isEnabled ? "text-slate-300" : "text-slate-500"),
              children: isEnabled ? "Bật" : "Tắt"
            }), (0, jsxRuntime.jsx)(ToggleSwitch, {
              label: "",
              ariaLabel: `Bật mục ${entry.comment || "Mục không có tên"}`,
              checked: isEnabled,
              onChange: enabled => onToggle(entry.uid, enabled),
              clean: true
            })]
          }), (0, jsxRuntime.jsx)(EntryPositionControl, {
            value: placement,
            onChange: position => onPlacementChange(entry.uid, position),
            className: "min-w-[150px]"
          })]
        }), (0, jsxRuntime.jsxs)("button", {
          onClick: () => onPin(entry.uid, !isPinned),
          className: "px-3 py-1.5 rounded text-xs font-bold  flex items-center gap-1 " + (isPinned ? "bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-500/20" : "bg-slate-600 hover:bg-slate-500 text-slate-300"),
          children: [(0, jsxRuntime.jsx)("span", {
            "aria-hidden": "true",
            children: ""
          }), (0, jsxRuntime.jsx)("span", {
            children: isPinned ? "Đã ghim" : "Ghim"
          })]
        })]
      })]
    }) : null;
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
    } = getDependencies();

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
