const LONG_PRESS_DELAY_MS = 500;

export function createLorebookEntryCard(getDependencies) {
  return function LorebookEntryCard({
    entry: propEntry,
    index,
    onUpdate,
    onEdit,
    onOpenActions,
    actionsOpen = false,
    syncStatus
  }) {
    const {
      react,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    const useRef = react?.useRef;
    const pressTimerRef = useRef ? useRef(null) : { current: null };
    const longPressFiredRef = useRef ? useRef(false) : { current: false };

    const entryTitle = propEntry.comment?.trim() || "Không có tiêu đề";

    const clearPressTimer = () => {
      if (pressTimerRef.current !== null) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };

    const startLongPress = event => {
      const anchor = event.currentTarget;
      clearPressTimer();
      longPressFiredRef.current = false;
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        longPressFiredRef.current = true;
        onOpenActions?.(index, anchor);
      }, LONG_PRESS_DELAY_MS);
    };

    react.useEffect?.(() => clearPressTimer, []);
    react.useEffect?.(() => {
      if (!actionsOpen) longPressFiredRef.current = false;
    }, [actionsOpen]);

    const handleTitleClick = event => {
      event.stopPropagation();
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        return;
      }
      onEdit?.(index);
    };

    const handleContextMenu = event => {
      event.preventDefault();
      event.stopPropagation();
      clearPressTimer();
      if (longPressFiredRef.current) return;
      longPressFiredRef.current = true;
      onOpenActions?.(index, event.currentTarget);
    };

    return (0, jsxRuntime.jsxs)("article", {
      className: `flex items-start gap-3 p-3.5 border rounded-lg bg-slate-800 border-slate-700 hover:border-sky-500/50 ${propEntry.enabled === false ? "opacity-60" : ""}`,
      children: [
        (0, jsxRuntime.jsx)("div", {
          onClick: event => event.stopPropagation(),
          className: "flex-shrink-0 self-start mt-1",
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: propEntry.enabled !== false ? "Đã chọn" : "Chưa chọn",
            checked: propEntry.enabled !== false,
            onChange: enabled => onUpdate(index, {
              ...propEntry,
              enabled
            }),
            clean: true
          })
        }),
        (0, jsxRuntime.jsxs)("div", {
          className: "flex-grow min-w-0 flex flex-col gap-2",
          children: [
            (0, jsxRuntime.jsxs)("h3", {
              className: "font-semibold text-base leading-6 m-0 flex items-center gap-2 " + (propEntry.enabled === false ? "text-slate-500 line-through" : "text-slate-100"),
              children: [
                syncStatus === "synced" && (0, jsxRuntime.jsx)("span", {
                  title: "Đã đồng bộ Semantic",
                  "aria-hidden": "true",
                  className: "w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
                }),
                syncStatus === "needs_sync" && (0, jsxRuntime.jsx)("span", {
                  title: "Cần đồng bộ Semantic",
                  "aria-hidden": "true",
                  className: "w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"
                }),
                (0, jsxRuntime.jsx)("button", {
                  type: "button",
                  onClick: handleTitleClick,
                  onContextMenu: handleContextMenu,
                  onPointerDown: startLongPress,
                  onPointerUp: clearPressTimer,
                  onPointerCancel: clearPressTimer,
                  onPointerLeave: clearPressTimer,
                  className: "w-full select-none rounded text-left hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
                  children: entryTitle
                })
              ]
            }),
            (0, jsxRuntime.jsx)("p", {
              className: "text-sm leading-6 whitespace-pre-wrap break-words text-slate-300",
              children: propEntry.content || (0, jsxRuntime.jsx)("span", {
                className: "text-slate-500 italic",
                children: "(Trống)"
              })
            })
          ]
        }),
        (0, jsxRuntime.jsx)("button", {
          type: "button",
          "aria-pressed": propEntry.constant ? "true" : "false",
          onClick: event => {
            event.stopPropagation();
            onUpdate(index, {
              ...propEntry,
              constant: !propEntry.constant
            });
          },
          className: "flex-shrink-0 self-start px-2.5 py-1.5 text-xs font-semibold rounded border " + (
            propEntry.constant
              ? "bg-amber-900/40 text-amber-300 border-amber-600"
              : "bg-slate-700 text-slate-400 border-slate-600 hover:text-slate-200"
          ),
          children: propEntry.constant ? "Hằng số: BẬT" : "Hằng số: TẮT"
        })
      ]
    });
  };
}
