export function createEntrySelectionControl(getDependencies) {
  return function EntrySelectionControl({
    filter,
    currentFilter,
    onClick,
    label,
    count,
  }) {
    const { jsxRuntime } = getDependencies();
    const isActive = currentFilter === filter;

    return jsxRuntime.jsxs('button', {
      onClick: () => onClick(filter),
      'aria-pressed': isActive,
      className: `px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 outline-none focus:ring-2 focus:ring-sky-500 ${
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

export function createLorebookEntryList(getDependencies) {
  return function LorebookEntryList({
    entries,
    onUpdate,
    className = "",
    statusMap
  }) {
    const {
      LorebookEntryDialog,
      LorebookEntryCard,
      react,
      jsxRuntime
    } = getDependencies();

    const [filterMode, setFilterMode] = (0, react.useState)("all");
    const [editingIndex, setEditingIndex] = (0, react.useState)(null);
    const [actionIndex, setActionIndex] = (0, react.useState)(null);

    if (typeof react.useEffect === "function") {
      (0, react.useEffect)(() => {
        if (actionIndex === null) return;
        const handleKeyDown = event => {
          if (event.key === "Escape") setActionIndex(null);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }, [actionIndex]);
    }

    const createBlankEntry = () => ({
      keys: [],
      content: "",
      comment: "Quy tắc mới",
      enabled: true,
      insertion_order: 100,
      selective: true,
      constant: false,
      use_regex: false,
      position: "before_char",
      uid: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });

    const handleUpdateEntry = (0, react.useCallback)((index, updatedEntry) => {
      const nextEntries = [...entries];
      updatedEntry.uid ||= `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      nextEntries[index] = updatedEntry;
      onUpdate(nextEntries);
    }, [entries, onUpdate]);

    const handleDeleteEntry = (0, react.useCallback)(index => {
      const nextEntries = entries.filter((_, entryIndex) => entryIndex !== index);
      onUpdate(nextEntries);
    }, [entries, onUpdate]);

    const handleAddEntry = (0, react.useCallback)(() => {
      const newEntry = createBlankEntry();
      onUpdate([...entries, newEntry]);
      setEditingIndex(entries.length);
    }, [entries, onUpdate]);

    const handleInsertEntryBelow = (0, react.useCallback)(index => {
      const nextEntries = [...entries];
      nextEntries.splice(index + 1, 0, createBlankEntry());
      onUpdate(nextEntries);
      setEditingIndex(index + 1);
    }, [entries, onUpdate]);

    const filteredEntries = entries.map((entry, index) => ({
      entry,
      index
    })).filter(({ entry }) => {
      if (filterMode === "enabled") return entry.enabled !== false;
      if (filterMode === "disabled") return entry.enabled === false;
      if (filterMode === "constant") return entry.constant === true;
      return true;
    });

    const actionEntry = actionIndex !== null ? entries[actionIndex] : null;

    return (0, jsxRuntime.jsxs)("div", {
      className: `flex flex-col gap-4 ${className}`,
      children: [
        (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between gap-3 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700 shrink-0",
          children: [
            (0, jsxRuntime.jsxs)("select", {
              "aria-label": "Lọc quy tắc sổ tay",
              value: filterMode,
              onChange: event => setFilterMode(event.target.value),
              className: "bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500",
              children: [
                (0, jsxRuntime.jsx)("option", { value: "all", children: "Tất cả" }),
                (0, jsxRuntime.jsx)("option", { value: "enabled", children: "Đã bật" }),
                (0, jsxRuntime.jsx)("option", { value: "disabled", children: "Đã tắt" }),
                (0, jsxRuntime.jsx)("option", { value: "constant", children: "Hằng số" })
              ]
            }),
            (0, jsxRuntime.jsxs)("span", {
              className: "text-xs text-slate-400 font-mono",
              children: [filteredEntries.length, " / ", entries.length]
            })
          ]
        }),
        (0, jsxRuntime.jsx)("div", {
          className: "flex-grow space-y-2.5 overflow-y-auto custom-scrollbar min-h-0",
          children: filteredEntries.length === 0
            ? (0, jsxRuntime.jsx)("div", {
                className: "text-center py-8 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700",
                children: (0, jsxRuntime.jsx)("p", {
                  children: entries.length === 0 ? "Sổ tay này chưa có quy tắc nào." : "Không có quy tắc nào khớp với bộ lọc này."
                })
              })
            : filteredEntries.map(({ entry, index }) => (0, jsxRuntime.jsx)(LorebookEntryCard, {
                entry,
                index,
                onUpdate: handleUpdateEntry,
                onEdit: () => setEditingIndex(index),
                onOpenActions: setActionIndex,
                syncStatus: statusMap && entry.uid ? statusMap[entry.uid] : undefined
              }, entry.uid || index))
        }),
        entries.length === 0 && (0, jsxRuntime.jsx)("button", {
          type: "button",
          onClick: handleAddEntry,
          className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-600 shrink-0",
          children: "Tạo mới quy tắc"
        }),
        actionEntry && (0, jsxRuntime.jsx)("div", {
          className: "fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4",
          onClick: () => setActionIndex(null),
          children: (0, jsxRuntime.jsxs)("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": `Tùy chọn cho ${actionEntry.comment?.trim() || "Không có tiêu đề"}`,
            className: "w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden",
            onClick: event => event.stopPropagation(),
            children: [
              (0, jsxRuntime.jsx)("div", {
                className: "px-4 py-3 border-b border-slate-800 text-sm font-semibold text-slate-200 truncate",
                children: actionEntry.comment?.trim() || "Không có tiêu đề"
              }),
              (0, jsxRuntime.jsxs)("div", {
                className: "py-1",
                children: [
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    onClick: () => {
                      const idx = actionIndex;
                      setActionIndex(null);
                      handleInsertEntryBelow(idx);
                    },
                    className: "w-full text-left px-4 py-3 text-sm text-slate-100 hover:bg-slate-800",
                    children: "Tạo mới quy tắc"
                  }),
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    onClick: () => {
                      const idx = actionIndex;
                      setActionIndex(null);
                      handleDeleteEntry(idx);
                    },
                    className: "w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-950/60",
                    children: "Xóa"
                  })
                ]
              })
            ]
          })
        }),
        (0, jsxRuntime.jsx)(LorebookEntryDialog, {
          isOpen: editingIndex !== null,
          entry: editingIndex === null ? null : entries[editingIndex],
          onClose: () => setEditingIndex(null),
          onSave: updatedEntry => {
            if (editingIndex !== null) handleUpdateEntry(editingIndex, updatedEntry);
          }
        })
      ]
    });
  };
}
