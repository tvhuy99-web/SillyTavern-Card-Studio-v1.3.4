// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    LoadOlderButton: deps.LoadOlderButton
  };
}
export function createResponseLogPanel(getDependencies) {
  return function ResponseLogPanel({
    turns: turns
  }) {
    const {
      react,
      LoadOlderButton,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [visibleCount, setVisibleCount] = (0, react.useState)(3);
    let totalTurns = turns.length;
    let visibleTurns = turns.slice(0, visibleCount);
    return (0, jsxRuntime.jsx)("div", {
      className: "space-y-2",
      children: 0 === visibleTurns.length ? (0, jsxRuntime.jsx)("div", {
        className: "p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
        children: "Chưa có dữ liệu phản hồi."
      }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [visibleTurns.map((turn, index) => (0, jsxRuntime.jsxs)("details", {
          className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("summary", {
            className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsxs)("span", {
                className: "text-xs font-semibold text-emerald-400",
                children: ["Lượt #", totalTurns - index]
              }), (0, jsxRuntime.jsx)("span", {
                className: "text-[10px] text-slate-500",
                children: new Date(turn.timestamp).toLocaleTimeString()
              })]
            }), (0, jsxRuntime.jsx)("span", {
              className: " group-open:rotate-90  text-slate-500 text-[10px]",
              "aria-hidden": "true",
              children: "▶"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "p-3 border-t border-slate-700/50 relative",
            children: [(0, jsxRuntime.jsx)("div", {
              className: "absolute top-3 right-3 z-10",
              children: (0, jsxRuntime.jsx)(CopyButton, {
                textToCopy: turn.response,
                absolute: true
              })
            }), (0, jsxRuntime.jsx)("pre", {
              className: "bg-slate-950 p-3 rounded border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre-wrap break-words",
              children: turn.response || "(Chưa có phản hồi)"
            })]
          })]
        }, index)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: totalTurns,
          onLoadMore: () => setVisibleCount(count => count + 3),
          step: 3
        })]
      })
    });
  };
}
