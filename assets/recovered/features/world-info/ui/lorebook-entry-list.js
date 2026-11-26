// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

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
    } = getDependencies();
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
