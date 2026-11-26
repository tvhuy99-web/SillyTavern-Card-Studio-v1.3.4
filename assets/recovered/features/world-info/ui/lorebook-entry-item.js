// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

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
    } = getDependencies();
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
