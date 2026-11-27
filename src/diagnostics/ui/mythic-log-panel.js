function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    Icon: deps.Icon,
    LoadOlderButton: deps.LoadOlderButton,
    PromptSectionView: deps.PromptSectionView,
    MythicLogItem: deps.MythicLogItem
  };
}
export function createMythicLogPanel(getDependencies) {
  return function MythicLogPanel({
    logs: logs,
    onRetry: onRetry
  }) {
    const {
      react,
      LoadOlderButton,
      MythicLogItem,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [visibleCount, setVisibleCount] = (0, react.useState)(3);
    let visibleLogs = logs.slice(0, visibleCount);
    return (0, jsxRuntime.jsx)("div", {
      className: "space-y-4",
      children: 0 === visibleLogs.length ? (0, jsxRuntime.jsx)("div", {
        className: "p-4 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
        children: "Chưa có dữ liệu Mythic Engine."
      }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [visibleLogs.map((logString, index) => (0, jsxRuntime.jsx)(MythicLogItem, {
          logString: logString,
          index: index,
          total: logs.length,
          onRetry: onRetry,
          isLatest: 0 === index
        }, index)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: logs.length,
          onLoadMore: () => setVisibleCount(count => count + 3),
          step: 3
        })]
      })
    });
  };
}
export function createMythicLogItem(react, getDependencies) {
  return (0, react.memo)(function MythicLogItem({
    logString: logString,
    index: index,
    total: total,
    onRetry: onRetry,
    isLatest: isLatest
  }) {
    const {
      react: reactRuntime,
      Icon,
      PromptSectionView,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let {
      parsedLog: parsedLog,
      structuredPrompt: structuredPrompt
    } = (0, reactRuntime.useMemo)(() => {
      let parsed = {
        latency: 0,
        fullPrompt: "",
        rawResponse: ""
      };
      try {
        parsed = JSON.parse(logString);
      } catch {
        parsed.fullPrompt = logString;
      }
      let structured = (prompt => {
        let sections = [];
        let schemaIndex = prompt.indexOf("<Cấu trúc bảng & Luật lệ>");
        if (-1 === schemaIndex) return [{
          id: "mythic_raw",
          name: "Raw Prompt (Unstructured)",
          content: prompt,
          role: "system"
        }];
        let systemText = prompt.substring(0, schemaIndex).trim();
        systemText && sections.push({
          id: "mythic_system",
          name: "System Instructions (Chỉ dẫn)",
          content: systemText,
          role: "system"
        });
        let schemaMatch = prompt.match(/<Cấu trúc bảng & Luật lệ>([\s\S]*?)<\/Cấu trúc bảng & Luật lệ>/);
        schemaMatch && sections.push({
          id: "mythic_schema",
          name: "Schema & Rules (Cấu trúc bảng)",
          content: schemaMatch[1].trim(),
          role: "system"
        });
        let lorebookMatch = prompt.match(/<Dữ liệu tham khảo \(Lorebook\)>([\s\S]*?)<\/Dữ liệu tham khảo \(Lorebook\)>/);
        if (lorebookMatch) {
          let lorebookText = lorebookMatch[1].trim();
          let lorebookSections = lorebookText.split("### [Lore:").filter(Boolean).map(section => "### [Lore:" + section);
          sections.push({
            id: "mythic_lore",
            name: "Lorebook Reference (Dữ liệu tham khảo)",
            content: lorebookText,
            role: "system",
            subSections: lorebookSections.length > 0 ? lorebookSections : undefined
          });
        }
        let databaseMatch = prompt.match(/<Dữ liệu bảng hiện tại>([\s\S]*?)<\/Dữ liệu bảng hiện tại>/);
        databaseMatch && sections.push({
          id: "mythic_data",
          name: "Current Database (Dữ liệu hiện tại)",
          content: databaseMatch[1].trim(),
          role: "system"
        });
        let chatMatch = prompt.match(/<Dữ liệu chính văn>([\s\S]*?)<\/Dữ liệu chính văn>/);
        chatMatch && sections.push({
          id: "mythic_chat",
          name: "Chat Context (Chính văn)",
          content: chatMatch[1].trim(),
          role: "system"
        });
        let rulesMatch = prompt.match(/LUẬT CHUNG:([\s\S]*)$/);
        rulesMatch && sections.push({
          id: "mythic_global",
          name: "Global Rules (Luật chung)",
          content: rulesMatch[1].trim(),
          role: "system"
        });
        return sections;
      })(parsed.fullPrompt);
      return {
        parsedLog: parsed,
        structuredPrompt: structured
      };
    }, [logString]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-900/30 border border-rose-500/20 rounded-lg p-3 relative group",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex justify-between items-center mb-2 border-b border-rose-500/20 pb-2",
        children: [(0, jsxRuntime.jsxs)("span", {
          className: "text-xs font-bold text-rose-400",
          children: ["Medusa Cycle #", total - index, " ", (0, jsxRuntime.jsxs)("span", {
            className: "text-slate-500 font-normal",
            children: ["(", parsedLog.latency, "ms)"]
          })]
        }), isLatest && onRetry && (0, jsxRuntime.jsxs)("button", {
          onClick: onRetry,
          className: "text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white shadow-lg ",
          children: [(0, jsxRuntime.jsx)(Icon, {
            name: "refresh",
            className: "h-3.5 w-3.5"
          }), "Tạo lại (Re-run)"]
        })]
      }), (0, jsxRuntime.jsxs)("details", {
        className: "mb-2 group",
        children: [(0, jsxRuntime.jsxs)("summary", {
          className: "cursor-pointer text-[10px] text-slate-400 hover:text-sky-400 font-bold mb-1 flex items-center justify-between rounded hover:bg-slate-800/50 p-1  select-none",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex items-center gap-2",
            children: [(0, jsxRuntime.jsx)("span", {
              children: "Lời nhắc Gửi đi (Outgoing Prompt)"
            }), (0, jsxRuntime.jsx)("span", {
              className: " group-open:rotate-90  text-[8px]",
              "aria-hidden": "true",
              children: "▶"
            })]
          }), (0, jsxRuntime.jsx)("div", {
            onClick: event => event.stopPropagation(),
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: parsedLog.fullPrompt,
              label: "Sao chép tất cả",
              absolute: false
            })
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "mt-2 space-y-2 pl-2 border-l border-slate-800",
          children: structuredPrompt.map(section => (0, jsxRuntime.jsx)(PromptSectionView, {
            section: section
          }, section.id))
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "relative",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex justify-between items-center mb-1",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-[10px] text-orange-400 font-bold",
            children: "Phản hồi Thô (AI Response)"
          }), (0, jsxRuntime.jsx)(CopyButton, {
            textToCopy: parsedLog.rawResponse,
            label: "Copy",
            absolute: false
          })]
        }), (0, jsxRuntime.jsx)("pre", {
          className: "text-[10px] text-orange-100 font-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded border border-rose-500/20 max-h-60 overflow-y-auto custom-scrollbar",
          children: parsedLog.rawResponse
        })]
      })]
    });
  });
}
