export function createPromptPreview(getDependencies) {
  return function PromptPreview({
    prompts: prompts
  }) {
    const {
      react,
      CopyButton,
      jsxRuntime
    } = getDependencies();
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    let previewText = (0, react.useMemo)(() => prompts.filter(prompt => prompt.enabled).map(prompt => prompt.include_title ? `--- ${prompt.name} ---\n${prompt.content}` : prompt.content).join("\n\n"), [prompts]);
    return (0, jsxRuntime.jsxs)("details", {
      className: "bg-slate-800/50 rounded-xl shadow-lg open:mb-6  ",
      open: isExpanded,
      onToggle: event => setIsExpanded(event.target.open),
      children: [(0, jsxRuntime.jsxs)("summary", {
        className: "p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center",
        children: [(0, jsxRuntime.jsx)("span", {
          children: "Xem trước Lời nhắc Gửi đi Cuối cùng"
        }), (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          className: "w-5 h-5 text-slate-400    " + (isExpanded ? "rotate-180" : ""),
          xmlns: "http://www.w3.org/2000/svg",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M19 9l-7 7-7-7"
          })
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "p-4 pt-0",
        children: (0, jsxRuntime.jsxs)("div", {
          className: "relative",
          children: [(0, jsxRuntime.jsx)("textarea", {
            "aria-label": "Bản xem trước lời nhắc",
            readOnly: true,
            value: previewText,
            rows: 15,
            className: "w-full bg-slate-900/50 border border-slate-700 rounded-md p-3 text-slate-300 font-mono text-xs focus:outline-none"
          }), (0, jsxRuntime.jsx)("div", {
            className: "absolute top-2 right-2",
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: previewText,
              absolute: false
            })
          })]
        })
      })]
    });
  };
}

export function createMacroReference(getDependencies) {
  return function MacroReference() {
    const {
      react,
      macroReference,
      InlineCopyButton,
      jsxRuntime
    } = getDependencies();
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    return (0, jsxRuntime.jsxs)("details", {
      className: "bg-slate-800/50 rounded-xl shadow-lg open:mb-6   border border-slate-700/50",
      open: isExpanded,
      onToggle: event => setIsExpanded(event.target.open),
      children: [(0, jsxRuntime.jsxs)("summary", {
        className: "p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center hover:bg-slate-800/80 rounded-xl ",
        children: [(0, jsxRuntime.jsxs)("span", {
          className: "flex items-center gap-2",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
              clipRule: "evenodd"
            })
          }), "Tham khảo Biến giữ chỗ (Macros)"]
        }), (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          className: "w-5 h-5 text-slate-400    " + (isExpanded ? "rotate-180" : ""),
          xmlns: "http://www.w3.org/2000/svg",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M19 9l-7 7-7-7"
          })
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar",
        children: macroReference.map(macro => (0, jsxRuntime.jsx)(InlineCopyButton, {
          macro: macro
        }, macro.name))
      })]
    });
  };
}
