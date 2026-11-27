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
          children: [ "Tham khảo Biến giữ chỗ (Macros)"]
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
