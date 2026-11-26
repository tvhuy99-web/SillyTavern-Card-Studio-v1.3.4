// Source recovery from the last verified production host.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.
// Public props and injected dependencies have descriptive aliases; internal locals retain recovered names.
function resolveLorebookControlDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    LoadingIndicator: deps.LoadingIndicator,
    ToggleSwitch: deps.ToggleSwitch,
    TextInput: deps.TextInput,
    TextArea: deps.TextArea,
    Icon: deps.Icon,
    useDialogFocus: deps.useDialogFocus,
    handleRadioKeyDown: deps.handleRadioKeyDown,
    EntryPositionControl: deps.EntryPositionControl,
    EntrySelectionControl: deps.EntrySelectionControl,
    LorebookEntryDialog: deps.LorebookEntryDialog,
    LorebookEntryCard: deps.LorebookEntryCard,
    LorebookUploadControl: deps.LorebookUploadControl,
    LorebookListItem: deps.LorebookListItem,
    LorebookManager: deps.LorebookManager,
    FileNameDialog: deps.FileNameDialog,
    lorebookStore: deps.lorebookStore
  };
}
export function createLorebookListItem(getDependencies) {
  return function LorebookListItem({
    lorebook: lorebook,
    onEdit: onEdit,
    onDelete: onDelete
  }) {
    const {
      jsxRuntime
    } = resolveLorebookControlDeps(getDependencies);
    let entryCount = lorebook.book?.entries?.length || 0;
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-sky-500/50 hover:shadow-lg  flex flex-col h-full group",
      children: [(0, jsxRuntime.jsx)("div", {
        onClick: onEdit,
        onKeyDown: event => {
          ("Enter" === event.key || " " === event.key) && (event.preventDefault(), onEdit());
        },
        role: "button",
        tabIndex: 0,
        className: "p-4 flex-grow cursor-pointer hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 flex flex-col items-center justify-center min-h-[100px]",
        children: (0, jsxRuntime.jsxs)("h3", {
          className: "text-lg font-bold text-slate-200 group-hover:text-sky-400  text-center leading-snug break-words w-full",
          children: [lorebook.name, (0, jsxRuntime.jsxs)("span", {
            className: "ml-2 text-slate-500 text-base font-normal whitespace-nowrap",
            children: ["(", entryCount, ")"]
          })]
        })
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-2 border-t border-slate-700 bg-slate-900/30",
        children: [(0, jsxRuntime.jsxs)("button", {
          onClick: event => {
            event.stopPropagation();
            onDelete();
          },
          className: "p-3 text-sm font-bold text-red-400/80 hover:text-red-300 hover:bg-red-900/20  border-r border-slate-700 flex items-center justify-center gap-2",
          title: "Xóa sổ tay (có xác nhận)",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-4 w-4",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
              clipRule: "evenodd"
            })
          }), "Xóa"]
        }), (0, jsxRuntime.jsxs)("button", {
          onClick: event => {
            event.stopPropagation();
            onEdit();
          },
          className: "p-3 text-sm font-bold text-sky-400/80 hover:text-sky-300 hover:bg-sky-900/20  flex items-center justify-center gap-2",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-4 w-4",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              d: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
            })
          }), "Sửa"]
        })]
      })]
    });
  };
}
export function createLorebookUploadControl(getDependencies) {
  return function LorebookUploadControl({
    onUpload: onUpload,
    isLoading: isLoading
  }) {
    const {
      LoadingIndicator,
      jsxRuntime
    } = resolveLorebookControlDeps(getDependencies);
    return (0, jsxRuntime.jsxs)("div", {
      onClick: isLoading ? undefined : onUpload,
      onKeyDown: event => {
        !isLoading && ("Enter" === event.key || " " === event.key) && (event.preventDefault(), onUpload());
      },
      role: "button",
      tabIndex: isLoading ? -1 : 0,
      "aria-disabled": isLoading,
      "aria-label": "Tải lên Sổ tay Mới",
      className: "border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-sky-500/50 hover:bg-slate-800/30 cursor-pointer group"),
      children: [(0, jsxRuntime.jsx)("div", {
        className: "bg-slate-800 p-3 rounded-full mb-3 group- ",
        children: isLoading ? (0, jsxRuntime.jsx)(LoadingIndicator, {
          message: ""
        }) : (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-6 w-6 text-sky-500",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M12 4v16m8-8H4"
          })
        })
      }), (0, jsxRuntime.jsx)("h3", {
        className: "text-sm font-bold text-slate-300 group-hover:text-white ",
        children: "Tải lên Sổ tay Mới"
      }), (0, jsxRuntime.jsx)("p", {
        className: "mt-1 text-xs text-slate-500",
        children: "Hỗ trợ một hoặc nhiều tệp JSON"
      })]
    });
  };
}
export function createEntryPositionControl(getDependencies) {
  return function EntryPositionControl({
    value: value,
    onChange: onChange,
    className = ""
  }) {
    const {
      jsxRuntime,
      handleRadioKeyDown
    } = resolveLorebookControlDeps(getDependencies);
    let getOptionClassName = (isSelected, activeClass) => "flex-1 px-2 py-1 text-xs font-bold  flex items-center justify-center gap-1 " + (isSelected ? `${activeClass} text-white shadow-sm` : "text-slate-400 hover:text-slate-200 hover:bg-slate-600/50");
    return (0, jsxRuntime.jsxs)("div", {
      className: `flex flex-col gap-1 ${className}`,
      children: [(0, jsxRuntime.jsx)("label", {
        className: "text-sm font-medium text-slate-300 mb-1",
        children: "Vị trí"
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex bg-slate-700 border border-slate-600 rounded-md p-1 w-full",
        role: "radiogroup",
        "aria-label": "Vị trí chèn",
        children: [(0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": undefined === value,
          tabIndex: undefined === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange(undefined),
          className: `rounded-l-sm outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName(undefined === value, "bg-slate-600")}`,
          title: "Mặc định",
          children: "Mặc định"
        }), (0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": "before" === value,
          tabIndex: "before" === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange("before"),
          className: `outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName("before" === value, "bg-sky-600")}`,
          title: "Đầu Prompt",
          children: "Đầu"
        }), (0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": "after" === value,
          tabIndex: "after" === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange("after"),
          className: `rounded-r-sm outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName("after" === value, "bg-violet-600")}`,
          title: "Cuối Prompt",
          children: "Cuối"
        })]
      })]
    });
  };
}
export function createLorebookEntryCard(getDependencies) {
  return function LorebookEntryCard({
    entry: propEntry,
    index: index,
    onUpdate: onUpdate,
    onRemove: onRemove,
    onEdit: onEdit,
    syncStatus: syncStatus
  }) {
    const {
      jsxRuntime,
      ToggleSwitch
    } = resolveLorebookControlDeps(getDependencies);
    let isDeleted = !!propEntry.__deleted;
    let entryTitle = propEntry.comment || "Không có tiêu đề";
    let headingId = `lorebook-heading-${propEntry.uid || index}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    return (0, jsxRuntime.jsxs)("article", {
      "aria-labelledby": headingId,
      className: `group flex items-start gap-3 p-4 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none \n                ${isDeleted ? "bg-red-900/20 border-red-500/50 opacity-75 hover:opacity-100 hover:bg-red-900/30" : "bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-sky-500/50 " + (propEntry.enabled ? "" : "opacity-60")}\n            `,
      children: [(0, jsxRuntime.jsx)("div", {
        onClick: event => event.stopPropagation(),
        className: "flex-shrink-0 self-start mt-1",
        children: (0, jsxRuntime.jsx)(ToggleSwitch, {
          ariaLabel: undefined,
          checked: false !== propEntry.enabled,
          onChange: enabled => onUpdate(index, {
            ...propEntry,
            enabled: enabled
          }),
          disabled: isDeleted,
          clean: true
        })
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex-grow min-w-0 flex flex-col gap-2",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-2 flex-wrap",
          children: [(0, jsxRuntime.jsxs)("h3", {
            id: headingId,
            className: "font-bold text-base truncate m-0 flex items-center gap-2 " + (isDeleted ? "text-red-300 line-through" : false === propEntry.enabled ? "text-slate-500 line-through" : "text-slate-200"),
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
            })(), (0, jsxRuntime.jsx)("button", {
              type: "button",
              onClick: () => !isDeleted && onEdit(index),
              disabled: isDeleted,
              className: "rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
              children: entryTitle
            }), isDeleted && (0, jsxRuntime.jsx)("span", {
              className: "ml-2 text-xs text-red-400 font-normal italic",
              children: "(Đã đánh dấu xóa)"
            })]
          }), propEntry.keys && propEntry.keys.length > 0 && (0, jsxRuntime.jsx)("span", {
            className: "text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[200px] " + (isDeleted ? "bg-red-900/40 text-red-300 border-red-800" : "bg-slate-700 text-slate-400 border-slate-600"),
            children: propEntry.keys.join(", ")
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "text-xs font-mono p-3 rounded border whitespace-pre-wrap break-words select-text cursor-text  " + (isDeleted ? "bg-red-950/30 text-red-200/70 border-red-900/30" : "bg-slate-900/50 text-slate-300 border-slate-700/50 hover:bg-slate-900/70"),
          onClick: event => event.stopPropagation(),
          children: propEntry.content || (0, jsxRuntime.jsx)("span", {
            className: "text-slate-600 italic",
            children: "(Trống)"
          })
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex flex-col gap-3 flex-shrink-0 items-end self-start",
        children: [(0, jsxRuntime.jsx)("button", {
          onClick: event => {
            event.stopPropagation();
            onUpdate(index, {
              ...propEntry,
              constant: !propEntry.constant
            });
          },
          disabled: isDeleted,
          className: "px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded border  shadow-sm " + (propEntry.constant ? "bg-amber-900/40 text-amber-400 border-amber-600" : "bg-slate-700 text-slate-500 border-slate-600"),
          children: propEntry.constant ? "Hằng số: BẬT" : "Hằng số: TẮT"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-1 opacity-80 group-hover:opacity-100 ",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: event => {
              event.stopPropagation();
              onRemove(index);
            },
            className: "p-1.5 rounded-md  " + (isDeleted ? "text-green-400 hover:bg-green-900/30" : "text-slate-500 hover:text-red-400 hover:bg-slate-700"),
            "aria-label": isDeleted ? `Khôi phục mục ${propEntry.comment}` : `Xóa mục ${propEntry.comment}`,
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: isDeleted ? (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z",
                clipRule: "evenodd"
              }) : (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
                clipRule: "evenodd"
              })
            })
          })]
        })]
      })]
    });
  };
}
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
    } = resolveLorebookControlDeps(getDependencies);
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
            children: "📌"
          }), (0, jsxRuntime.jsx)("span", {
            children: isPinned ? "Đã ghim" : "Ghim"
          })]
        })]
      })]
    }) : null;
  };
}
export function createLorebookEntryList(getDependencies) {
  return function LorebookEntryList({
    entries: entries,
    onUpdate: onUpdate,
    className = "",
    statusMap: statusMap
  }) {
    const {
      EntrySelectionControl,
      LorebookEntryDialog,
      LorebookEntryCard,
      react,
      jsxRuntime
    } = resolveLorebookControlDeps(getDependencies);
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let [filterMode, setFilterMode] = (0, react.useState)("all");
    let [editingIndex, setEditingIndex] = (0, react.useState)(null);
    let handleUpdateEntry = (0, react.useCallback)((index, updatedEntry) => {
      let nextEntries = [...entries];
      updatedEntry.uid ||= `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      nextEntries[index] = updatedEntry;
      onUpdate(nextEntries);
    }, [entries, onUpdate]);
    let handleToggleDeleteEntry = (0, react.useCallback)(index => {
      let nextEntries = [...entries];
      nextEntries[index] = {
        ...nextEntries[index],
        __deleted: !nextEntries[index].__deleted
      };
      onUpdate(nextEntries);
    }, [entries, onUpdate]);
    let handleAddEntry = (0, react.useCallback)(() => {
      let newEntry = {
        keys: [],
        content: "",
        comment: "Mục mới",
        enabled: true,
        insertion_order: 100,
        selective: true,
        constant: false,
        use_regex: false,
        position: "before_char",
        uid: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      };
      onUpdate([...entries, newEntry]);
      setEditingIndex(entries.length);
    }, [entries, onUpdate]);
    let filteredEntries = entries.map((entry, index) => ({
      entry: entry,
      index: index
    })).filter(({
      entry: entry
    }) => {
      let matchesSearch = true;
      if (searchQuery) {
        let query = searchQuery.toLowerCase();
        matchesSearch = (entry.comment || "").toLowerCase().includes(query) || (entry.keys || []).some(key => key.toLowerCase().includes(query)) || (entry.content || "").toLowerCase().includes(query);
      }
      let matchesFilter = true;
      if ("enabled" === filterMode) {
        matchesFilter = false !== entry.enabled;
      } else {
        if ("disabled" === filterMode) {
          matchesFilter = false === entry.enabled;
        } else {
          "constant" === filterMode && (matchesFilter = true === entry.constant);
        }
      }
      return matchesSearch && matchesFilter;
    });
    let entryCounts = {
      all: entries.length,
      enabled: entries.filter(entry => false !== entry.enabled).length,
      disabled: entries.filter(entry => false === entry.enabled).length,
      constant: entries.filter(entry => true === entry.constant).length
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: `flex flex-col gap-4 ${className}`,
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex flex-col gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 shrink-0",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between gap-4",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "relative flex-grow",
            children: [(0, jsxRuntime.jsx)("div", {
              className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none",
              children: (0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                className: "h-4 w-4 text-slate-500",
                fill: "none",
                viewBox: "0 0 24 24",
                stroke: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                })
              })
            }), (0, jsxRuntime.jsx)("input", {
              type: "text",
              "aria-label": "Tìm kiếm mục sổ tay",
              value: searchQuery,
              onChange: event => setSearchQuery(event.target.value),
              placeholder: "Tìm kiếm...",
              className: "pl-9 w-full bg-slate-700 border border-slate-600 rounded-md py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "text-xs text-slate-500 font-mono whitespace-nowrap",
            children: [filteredEntries.length, " / ", entries.length]
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-2 flex-wrap",
          children: [(0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "all",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Tất cả",
            count: entryCounts.all
          }), (0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "enabled",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Đang bật",
            count: entryCounts.enabled
          }), (0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "disabled",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Đã tắt",
            count: entryCounts.disabled
          }), (0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "constant",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Hằng số",
            count: entryCounts.constant
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-1 min-h-0",
        children: 0 === filteredEntries.length ? (0, jsxRuntime.jsx)("div", {
          className: "text-center py-10 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700",
          children: (0, jsxRuntime.jsx)("p", {
            children: "Không tìm thấy mục nào."
          })
        }) : filteredEntries.map(({
          entry: entry,
          index: index
        }) => (0, jsxRuntime.jsx)(LorebookEntryCard, {
          entry: entry,
          index: index,
          onUpdate: handleUpdateEntry,
          onRemove: handleToggleDeleteEntry,
          onEdit: () => setEditingIndex(index),
          syncStatus: statusMap && entry.uid ? statusMap[entry.uid] : undefined
        }, entry.uid || index))
      }), (0, jsxRuntime.jsxs)("button", {
        onClick: handleAddEntry,
        className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg   flex items-center justify-center gap-2 border border-slate-600 hover:border-sky-500/50 group shrink-0",
        children: [(0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5  group- ",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
            clipRule: "evenodd"
          })
        }), (0, jsxRuntime.jsx)("span", {
          children: "Thêm Mục Mới"
        })]
      }), (0, jsxRuntime.jsx)(LorebookEntryDialog, {
        isOpen: null !== editingIndex,
        entry: null === editingIndex ? null : entries[editingIndex],
        onClose: () => setEditingIndex(null),
        onSave: updatedEntry => {
          null !== editingIndex && handleUpdateEntry(editingIndex, updatedEntry);
        }
      })]
    });
  };
}
export function createLorebookEntryDialog(getDependencies) {
  return function LorebookEntryDialog({
    isOpen: isOpen,
    entry: entry,
    onSave: onSave,
    onClose: onClose
  }) {
    const {
      EntryPositionControl,
      useDialogFocus,
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = resolveLorebookControlDeps(getDependencies);
    let [draftEntry, setDraftEntry] = (0, react.useState)(null);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    if ((0, react.useEffect)(() => {
      setDraftEntry(entry ? JSON.parse(JSON.stringify(entry)) : null);
    }, [entry, isOpen]), useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef), !isOpen || !draftEntry) return null;
    let updateDraftField = (field, value) => {
      setDraftEntry(previousEntry => previousEntry ? {
        ...previousEntry,
        [field]: value
      } : null);
    };
    return (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[100] p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "world-info-entry-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ",
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("header", {
          className: "p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl",
          children: [(0, jsxRuntime.jsx)("h3", {
            id: "world-info-entry-title",
            className: "text-xl font-bold text-sky-400",
            children: "Chỉnh sửa Mục World Info"
          }), (0, jsxRuntime.jsx)("button", {
            ref: closeButtonRef,
            onClick: onClose,
            className: "p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded ",
            "aria-label": "Đóng chỉnh sửa",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-6 w-6",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M6 18L18 6M6 6l12 12"
              })
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-6 overflow-y-auto custom-scrollbar space-y-6 flex-grow",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(TextInput, {
              label: "Tiêu đề (Bình luận)",
              value: draftEntry.comment || "",
              onChange: event => updateDraftField("comment", event.target.value),
              placeholder: "Đặt tên cho mục này..."
            }), (0, jsxRuntime.jsx)(TextInput, {
              label: "Từ khóa chính",
              value: (draftEntry.keys || []).join(", "),
              onChange: event => updateDraftField("keys", event.target.value.split(",").map(key => key.trim()).filter(Boolean)),
              placeholder: "Ví dụ: gươm, kiếm"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(TextInput, {
              label: "Từ khóa phụ",
              value: (draftEntry.secondary_keys || []).join(", "),
              onChange: event => updateDraftField("secondary_keys", event.target.value.split(",").map(key => key.trim()).filter(Boolean)),
              placeholder: "Ví dụ: cổ đại"
            }), (0, jsxRuntime.jsxs)("div", {
              className: "grid grid-cols-2 gap-4",
              children: [(0, jsxRuntime.jsx)(TextInput, {
                label: "Thứ tự chèn",
                type: "number",
                value: String(draftEntry.insertion_order ?? 100),
                onChange: event => updateDraftField("insertion_order", parseInt(event.target.value))
              }), (0, jsxRuntime.jsx)(EntryPositionControl, {
                value: (position => {
                  let positionText = String(position || "");
                  return positionText.includes("before") ? "before" : positionText.includes("after") ? "after" : undefined;
                })(draftEntry.position),
                onChange: selection => {
                  let position = "";
                  "before" === selection && (position = "before_char");
                  "after" === selection && (position = "after_char");
                  updateDraftField("position", position);
                }
              })]
            })]
          }), (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: draftEntry.content || "",
            onChange: event => updateDraftField("content", event.target.value),
            rows: 8
          }), (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-700/30 p-4 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "space-y-3",
              children: [(0, jsxRuntime.jsx)("label", {
                className: "block text-xs font-bold text-slate-400 uppercase",
                children: "Trạng thái"
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Đã bật",
                checked: false !== draftEntry.enabled,
                onChange: enabled => updateDraftField("enabled", enabled),
                clean: true
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Hằng số",
                checked: !!draftEntry.constant,
                onChange: enabled => updateDraftField("constant", enabled),
                clean: true,
                tooltip: "Luôn luôn gửi đi, bỏ qua kiểm tra từ khóa."
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "space-y-3",
              children: [(0, jsxRuntime.jsx)("label", {
                className: "block text-xs font-bold text-slate-400 uppercase",
                children: "Logic"
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Chọn lọc",
                checked: !!draftEntry.selective,
                onChange: enabled => updateDraftField("selective", enabled),
                clean: true,
                tooltip: "Chỉ kích hoạt khi từ khóa xuất hiện."
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Dùng Regex",
                checked: !!draftEntry.use_regex,
                onChange: enabled => updateDraftField("use_regex", enabled),
                clean: true,
                tooltip: "Xử lý từ khóa như biểu thức chính quy."
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "md:col-span-2 grid grid-cols-2 gap-4",
              children: [(0, jsxRuntime.jsx)(TextInput, {
                label: "Sticky (Duy trì)",
                type: "number",
                value: String(draftEntry.sticky || 0),
                onChange: event => updateDraftField("sticky", parseInt(event.target.value))
              }), (0, jsxRuntime.jsx)(TextInput, {
                label: "Cooldown (Hồi chiêu)",
                type: "number",
                value: String(draftEntry.cooldown || 0),
                onChange: event => updateDraftField("cooldown", parseInt(event.target.value))
              })]
            })]
          })]
        }), (0, jsxRuntime.jsxs)("footer", {
          className: "p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 ",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              onSave(draftEntry);
              onClose();
            },
            className: "px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white ",
            children: "Lưu Thay đổi"
          })]
        })]
      })
    });
  };
}
export function createAttachLorebookDialog(getDependencies) {
  return function AttachLorebookDialog({
    isOpen: isOpen,
    onClose: onClose,
    lorebooks: lorebooks,
    onAction: onAction
  }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime
    } = resolveLorebookControlDeps(getDependencies);
    let [selectedLorebookName, setSelectedLorebookName] = (0, react.useState)("");
    let selectedLorebook = lorebooks.find(lorebook => lorebook.name === selectedLorebookName);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);
    return isOpen ? (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 z-[120] bg-black/70  flex items-center justify-center p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "attach-lorebook-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md p-6",
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsx)("h3", {
          id: "attach-lorebook-title",
          className: "text-xl font-bold text-white mb-4",
          children: "Thêm Sổ tay vào Nhân vật"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsxs)("div", {
            children: [(0, jsxRuntime.jsx)("label", {
              htmlFor: "attach-lorebook-select",
              className: "block text-sm font-medium text-slate-300 mb-2",
              children: "Chọn Sổ tay Thế giới"
            }), (0, jsxRuntime.jsxs)("select", {
              id: "attach-lorebook-select",
              ref: closeButtonRef,
              value: selectedLorebookName,
              onChange: event => setSelectedLorebookName(event.target.value),
              className: "w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500",
              children: [(0, jsxRuntime.jsx)("option", {
                value: "",
                children: "-- Chọn sổ tay --"
              }), lorebooks.map(lorebook => (0, jsxRuntime.jsxs)("option", {
                value: lorebook.name,
                children: [lorebook.name, " (", lorebook.book.entries.length, " mục)"]
              }, lorebook.name))]
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-4 pt-2",
            children: [(0, jsxRuntime.jsxs)("button", {
              onClick: () => selectedLorebook && onAction("link", selectedLorebook),
              disabled: !selectedLorebook,
              className: "p-4 rounded-lg bg-amber-900/20 border border-amber-600/30 hover:bg-amber-900/40 hover:border-amber-500  text-left group disabled:opacity-50",
              children: [(0, jsxRuntime.jsx)("div", {
                className: "text-amber-400 font-bold mb-1 group-hover:text-amber-300",
                children: "🔗 Liên kết (Link)"
              }), (0, jsxRuntime.jsx)("p", {
                className: "text-xs text-slate-400",
                children: "Tạo một bản sao riêng của sổ tay này và gắn nhãn. Bạn có thể chỉnh sửa trực tiếp."
              })]
            }), (0, jsxRuntime.jsxs)("button", {
              onClick: () => selectedLorebook && onAction("merge", selectedLorebook),
              disabled: !selectedLorebook,
              className: "p-4 rounded-lg bg-sky-900/20 border border-sky-600/30 hover:bg-sky-900/40 hover:border-sky-500  text-left group disabled:opacity-50",
              children: [(0, jsxRuntime.jsx)("div", {
                className: "text-sky-400 font-bold mb-1 group-hover:text-sky-300",
                children: "📥 Gộp (Merge)"
              }), (0, jsxRuntime.jsx)("p", {
                className: "text-xs text-slate-400",
                children: "Trộn lẫn các mục vào Sổ tay Gốc (Nội bộ). Mất đi ranh giới giữa các sổ."
              })]
            })]
          }), (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: onClose,
            className: "w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-600",
            children: "Đóng"
          })]
        })]
      })
    }) : null;
  };
}
export function createLorebookLibrary(getDependencies) {
  return function LorebookLibrary() {
    const {
      LorebookUploadControl,
      FileNameDialog,
      LorebookListItem,
      LorebookManager,
      react,
      Icon,
      lorebookStore,
      jsxRuntime
    } = resolveLorebookControlDeps(getDependencies);
    let {
      lorebooks: lorebooks,
      isLoading: isLoading,
      error: error,
      loadLorebooks: loadLorebooks,
      updateLorebook: updateLorebook,
      deleteLorebook: deleteLorebook
    } = lorebookStore();
    let [activeLorebookName, setActiveLorebookName] = (0, react.useState)(null);
    let [isExportDialogOpen, setIsExportDialogOpen] = (0, react.useState)(false);
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let fileInputRef = (0, react.useRef)(null);
    let activeLorebook = lorebooks.find(lorebook => lorebook.name === activeLorebookName);
    let filteredLorebooks = (0, react.useMemo)(() => {
      let query = searchQuery.trim().toLocaleLowerCase("vi");
      return query ? lorebooks.filter(lorebook => lorebook.name.toLocaleLowerCase("vi").includes(query)) : lorebooks;
    }, [lorebooks, searchQuery]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "lorebook-library h-full flex flex-col",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "library-toolbar mb-6",
        children: [(0, jsxRuntime.jsxs)("div", {
          children: [(0, jsxRuntime.jsxs)("h2", {
            className: "text-2xl font-bold text-white",
            children: ["Thư viện Sổ tay Thế giới", (0, jsxRuntime.jsx)("span", {
              className: "sidebar-count",
              children: lorebooks.length
            })]
          }), (0, jsxRuntime.jsx)("p", {
            className: "text-sm text-slate-400 mt-1",
            children: "Quản lý kiến thức nền và dữ liệu thế giới dùng lại."
          })]
        }), (0, jsxRuntime.jsxs)("label", {
          className: "sidebar-search library-search",
          children: [(0, jsxRuntime.jsx)(Icon, {
            name: "search",
            className: "h-4 w-4"
          }), (0, jsxRuntime.jsx)("input", {
            type: "search",
            value: searchQuery,
            onChange: event => setSearchQuery(event.target.value),
            placeholder: "Tìm sổ tay...",
            "aria-label": "Tìm sổ tay thế giới"
          })]
        })]
      }), error && (0, jsxRuntime.jsxs)("div", {
        className: "bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-3",
        children: [(0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",
            clipRule: "evenodd"
          })
        }), error]
      }), (0, jsxRuntime.jsx)("input", {
        ref: fileInputRef,
        type: "file",
        "aria-label": "Nhập sổ tay JSON",
        className: "sr-only",
        accept: ".json",
        onChange: event => {
          event.target.files && event.target.files.length > 0 && (loadLorebooks(event.target.files), event.target.value = "");
        },
        multiple: true
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10",
        children: [(0, jsxRuntime.jsx)(LorebookUploadControl, {
          onUpload: () => fileInputRef.current?.click(),
          isLoading: isLoading
        }), filteredLorebooks.map(lorebook => (0, jsxRuntime.jsx)(LorebookListItem, {
          lorebook: lorebook,
          onEdit: () => setActiveLorebookName(lorebook.name),
          onDelete: () => (name => {
            window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${name}" không?`) && deleteLorebook(name);
          })(lorebook.name)
        }, lorebook.name)), searchQuery && 0 === filteredLorebooks.length && (0, jsxRuntime.jsx)("div", {
          className: "col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500",
          children: "Không tìm thấy sổ tay phù hợp."
        })]
      }), activeLorebook && (0, jsxRuntime.jsx)(LorebookManager, {
        initialEntries: activeLorebook.book.entries || [],
        onSave: entries => {
          if (!activeLorebook) return;
          let updatedLorebook = {
            ...activeLorebook,
            book: {
              ...activeLorebook.book,
              entries: entries
            }
          };
          updateLorebook(updatedLorebook);
          setActiveLorebookName(null);
        },
        onClose: () => setActiveLorebookName(null),
        onExport: () => {
          activeLorebook && setIsExportDialogOpen(true);
        },
        onDelete: () => {
          activeLorebook && window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${activeLorebook.name}" không?`) && (deleteLorebook(activeLorebook.name), setActiveLorebookName(null));
        },
        characterId: `global_lb_${activeLorebook.name}`
      }), (0, jsxRuntime.jsx)(FileNameDialog, {
        isOpen: isExportDialogOpen,
        onClose: () => setIsExportDialogOpen(false),
        onConfirm: fileName => {
          activeLorebook && ((lorebook, fileName) => {
            try {
              let book = lorebook.book;
              let downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(book, null, 2));
              let anchor = document.createElement("a");
              anchor.setAttribute("href", downloadUrl);
              anchor.setAttribute("download", fileName);
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            } catch (error) {
              console.error("Failed to export lorebook:", error);
              alert("An error occurred while trying to export the lorebook file.");
            }
          })(activeLorebook, fileName);
        },
        initialFileName: activeLorebook?.name || "Lorebook",
        title: "Xuất Sổ tay Thế giới",
        fileExtension: ".json"
      })]
    });
  };
}
