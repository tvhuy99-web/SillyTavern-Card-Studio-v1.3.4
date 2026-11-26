// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    LoadOlderButton: deps.LoadOlderButton,
    TokenCountControl: deps.TokenCountControl,
    PromptSectionView: deps.PromptSectionView
  };
}
export function createPromptSectionView(getDependencies) {
  return function PromptSectionView({
    section: section
  }) {
    const {
      react,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let hasSubSections = section.subSections && section.subSections.length > 0;
    let contentLines = (0, react.useMemo)(() => section.content.split("\n"), [section.content]);
    let isHighlightSection = (0, react.useMemo)(() => ["Replacement", "Stop Strings"].some(keyword => section.name.toLowerCase().includes(keyword.toLowerCase())), [section.name]);
    let handleKeyDown = event => {
      let element = event.currentTarget;
      if ("ArrowDown" === event.key) {
        event.preventDefault();
        let sibling = element.nextElementSibling;
        sibling && sibling.tabIndex >= 0 && sibling.focus();
      } else if ("ArrowUp" === event.key) {
        event.preventDefault();
        let sibling = element.previousElementSibling;
        sibling && sibling.tabIndex >= 0 && sibling.focus();
      }
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-950 border border-slate-700 rounded-lg overflow-hidden mb-2 shadow-sm",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "bg-slate-800/50 px-3 py-2 flex justify-between items-center border-b border-slate-700/50 sticky top-0 z-10 ",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 overflow-hidden",
          children: (0, jsxRuntime.jsxs)("h4", {
            className: "text-xs font-bold text-violet-300 truncate",
            title: section.name,
            children: [section.name, hasSubSections && (0, jsxRuntime.jsxs)("span", {
              className: "ml-2 text-[9px] text-emerald-400 font-normal border border-emerald-800 px-1 rounded bg-emerald-900/30",
              children: ["Expanded View (", section.subSections?.length, ")"]
            }), !hasSubSections && isHighlightSection && (0, jsxRuntime.jsx)("span", {
              className: "ml-2 text-[9px] text-slate-500 font-normal border border-slate-700 px-1 rounded bg-slate-900",
              children: "List Mode"
            })]
          })
        }), (0, jsxRuntime.jsx)(CopyButton, {
          textToCopy: section.content,
          absolute: false
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "p-2 flex flex-col gap-1 bg-slate-900/30 max-h-[400px] overflow-y-auto custom-scrollbar group",
        children: hasSubSections ? section.subSections.map((subSection, index) => (0, jsxRuntime.jsxs)("div", {
          tabIndex: 0,
          onKeyDown: handleKeyDown,
          className: "bg-slate-900/80 border border-slate-700/50 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-2 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap  cursor-text mb-1",
          children: [(0, jsxRuntime.jsxs)("span", {
            className: "text-slate-600 select-none mr-2",
            children: ["#", index + 1]
          }), subSection]
        }, index)) : isHighlightSection ? contentLines.map((line, index) => line.trim() ? (0, jsxRuntime.jsx)("div", {
          tabIndex: 0,
          onKeyDown: handleKeyDown,
          className: "bg-slate-950/80 border border-slate-800 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-1.5 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap  cursor-text",
          children: line
        }, index) : null) : (0, jsxRuntime.jsx)("div", {
          tabIndex: 0,
          className: "bg-slate-950/80 border border-slate-800 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:outline-none rounded px-2 py-2 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap ",
          children: section.content || (0, jsxRuntime.jsx)("span", {
            className: "text-slate-600 italic",
            children: "(Nội dung trống)"
          })
        })
      })]
    });
  };
}
export function createPromptLogPanel(getDependencies) {
  return function PromptLogPanel({
    turns: turns
  }) {
    const {
      react,
      LoadOlderButton,
      TokenCountControl,
      PromptSectionView,
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
        children: "Chưa có dữ liệu lời nhắc."
      }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [visibleTurns.map((turn, index) => (0, jsxRuntime.jsxs)("details", {
          className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("summary", {
            className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsxs)("span", {
                className: "text-xs font-semibold text-violet-400",
                children: ["Lượt #", totalTurns - index]
              }), (0, jsxRuntime.jsx)("span", {
                className: "text-[10px] text-slate-500",
                children: new Date(turn.timestamp).toLocaleTimeString()
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsx)(TokenCountControl, {
                sections: turn.prompt
              }), (0, jsxRuntime.jsxs)("span", {
                className: "text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded",
                children: [turn.prompt.length, " mục"]
              }), (0, jsxRuntime.jsx)("span", {
                className: " group-open:rotate-90  text-slate-500 text-[10px]",
                "aria-hidden": "true",
                children: "▶"
              })]
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "p-3 space-y-2 border-t border-slate-700/50",
            children: [(0, jsxRuntime.jsx)("div", {
              className: "flex justify-end mb-2",
              children: (0, jsxRuntime.jsx)(CopyButton, {
                textToCopy: turn.prompt.map(section => section.content).join("\n\n"),
                label: "Sao chép tất cả",
                absolute: false
              })
            }), 0 === turn.prompt.length ? (0, jsxRuntime.jsx)("p", {
              className: "text-xs text-slate-600 italic",
              children: "Không có dữ liệu prompt."
            }) : turn.prompt.map(section => (0, jsxRuntime.jsx)(PromptSectionView, {
              section: section
            }, section.id))]
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
