// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    LoadOlderButton: deps.LoadOlderButton,
    formatTimestamp: deps.formatTimestamp,
    formatDiagnostic: deps.formatDiagnostic,
    normalizeDiagnostic: deps.normalizeDiagnostic,
    diagnosticStorageKey: deps.diagnosticStorageKey
  };
}
export function createSystemLogPanel(getDependencies) {
  return function SystemLogPanel({
    logs: logs,
    onInspectState: onInspectState,
    onClearLogs: onClearLogs
  }) {
    const {
      formatDiagnostic,
      normalizeDiagnostic,
      diagnosticStorageKey,
      react,
      LoadOlderButton,
      formatTimestamp,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [activeFilter, setActiveFilter] = (0, react.useState)("all");
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let [visibleCount, setVisibleCount] = (0, react.useState)(50);
    let getLogColorClass = log => {
      let {
        level: level,
        source: source
      } = log;
      if ("console" === source && "error" === level) return "text-orange-400 bg-orange-900/10 border-orange-900/30";
      if ("network" === source) return "text-pink-400 bg-pink-900/10 border-pink-900/30";
      switch (level) {
        case "error":
        case "script-error":
        case "api-error":
          return "text-red-400 bg-red-900/10 border-red-900/30";
        case "warn":
          return "text-amber-400 bg-amber-900/10 border-amber-900/30";
        case "script-success":
          return "text-green-400";
        case "interaction":
          return "text-sky-400";
        case "api":
          return "text-violet-400";
        case "state":
          return "text-teal-400";
        default:
          return "text-slate-300";
      }
    };
    let filteredLogs = (0, react.useMemo)(() => {
      let matches = logs;
      if ("errors" === activeFilter) {
        matches = matches.filter(log => log.level.includes("error"));
      } else if ("warn" === activeFilter) {
        matches = matches.filter(log => "warn" === log.level);
      } else if ("iframe" === activeFilter) {
        matches = matches.filter(log => "iframe" === log.source);
      } else if ("card-runtime" === activeFilter) {
        matches = matches.filter(log => "card-runtime" === log.source);
      } else if ("diagnostic" === activeFilter) {
        matches = matches.filter(log => "diagnostic" === log.source);
      } else if ("aistudio" === activeFilter) {
        matches = matches.filter(log => "aistudio" === log.source);
      } else if ("regex" === activeFilter) {
        matches = matches.filter(log => "regex" === log.source);
      } else if ("variable" === activeFilter) {
        matches = matches.filter(log => "variable" === log.source);
      } else if ("state" === activeFilter) {
        matches = matches.filter(log => "state" === log.level);
      } else if ("console" === activeFilter) {
        matches = matches.filter(log => "console" === log.source);
      } else if ("network" === activeFilter) {
        matches = matches.filter(log => "network" === log.source);
      }
      if (searchQuery.trim()) {
        let query = searchQuery.toLowerCase();
        matches = matches.filter(log => log.message.toLowerCase().includes(query));
      }
      return matches;
    }, [logs, activeFilter, searchQuery]);
    let visibleLogs = filteredLogs.slice(0, visibleCount);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-4 text-xs",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex flex-col gap-2",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex gap-1 flex-wrap",
          children: [{
            id: "all",
            label: "Tất cả"
          }, {
            id: "errors",
            label: "Lỗi"
          }, {
            id: "warn",
            label: "Cảnh báo"
          }, {
            id: "console",
            label: "Browser Console"
          }, {
            id: "network",
            label: "Mạng"
          }, {
            id: "iframe",
            label: "Iframe"
          }, {
            id: "card-runtime",
            label: "Thẻ HTML"
          }, {
            id: "diagnostic",
            label: "Chẩn đoán"
          }, {
            id: "aistudio",
            label: "AI Studio"
          }, {
            id: "regex",
            label: "Regex"
          }, {
            id: "variable",
            label: "Biến số"
          }, {
            id: "state",
            label: "Trạng thái"
          }].map(filter => (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              setActiveFilter(filter.id);
              setVisibleCount(50);
            },
            className: "px-2 py-0.5 text-[9px] uppercase font-bold rounded " + (activeFilter === filter.id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"),
            children: filter.label
          }, filter.id))
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50",
          children: [(0, jsxRuntime.jsx)("input", {
            type: "text",
            "aria-label": "Tìm kiếm nhật ký",
            placeholder: "Tìm kiếm log...",
            value: searchQuery,
            onChange: event => setSearchQuery(event.target.value),
            className: "bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] flex-grow min-w-[100px]"
          }), (0, jsxRuntime.jsxs)("div", {
            className: "flex items-center gap-1",
            children: [(0, jsxRuntime.jsx)("button", {
              onClick: onInspectState,
              className: "px-2 py-1 bg-teal-600/20 text-teal-400 border border-teal-600/30 rounded hover:bg-teal-600/40",
              title: "Kiểm tra trạng thái biến",
              children: "🔍 State"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                let text = filteredLogs.map(log => `[${formatTimestamp(log.timestamp)}] [${log.source.toUpperCase()}] [${log.level.toUpperCase()}] ${log.message}`).join("\n");
                navigator.clipboard.writeText(text);
              },
              className: "px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 border border-slate-600",
              title: "Sao chép log đang hiển thị",
              children: "Sao chép log"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                let liveReports = logs.filter(log => "diagnostic" === log.source || "aistudio" === log.source).map(log => log.message.trim()).filter(Boolean);
                let storedReports = (() => {
                  if (typeof window > "u") return [];
                  try {
                    let storedLogs = JSON.parse(window.localStorage.getItem(diagnosticStorageKey) || "[]");
                    return Array.isArray(storedLogs) ? storedLogs.map(log => normalizeDiagnostic(log)) : [];
                  } catch {
                    return [];
                  }
                })().map(formatDiagnostic);
                let reports = Array.from(new Set([...liveReports, ...storedReports]));
                let reportText = ["GÓI BÁO CÁO CHẨN ĐOÁN", `Thời gian xuất: ${new Date().toLocaleString()}`, `Số báo cáo: ${reports.length}`, "", reports.length ? reports.join("\n\n==============================\n\n") : "Chưa có lỗi chẩn đoán nào được ghi nhận."].join("\n");
                navigator.clipboard.writeText(reportText);
              },
              className: "px-2 py-1 bg-sky-700/30 text-sky-300 rounded hover:bg-sky-700/50 border border-sky-600/40",
              title: "Sao chép toàn bộ báo cáo chẩn đoán để gửi cho người sửa lỗi",
              children: "Xuất báo cáo lỗi"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                (() => {
                  if (!(typeof window > "u")) try {
                    window.localStorage.removeItem(diagnosticStorageKey);
                  } catch {}
                })();
                onClearLogs();
              },
              className: "px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/40",
              title: "Xóa toàn bộ log và chẩn đoán đã lưu",
              children: "Xóa log"
            })]
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "bg-slate-900/30 rounded-md font-mono text-[10px] border border-slate-700 max-h-[300px] overflow-y-auto custom-scrollbar",
        children: 0 === visibleLogs.length ? (0, jsxRuntime.jsx)("div", {
          className: "p-4 text-center text-slate-600 italic",
          children: "Không có log hệ thống nào khớp với bộ lọc."
        }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
          children: [visibleLogs.map((log, index) => (0, jsxRuntime.jsxs)("div", {
            className: `p-1.5 border-b border-slate-800/50 flex gap-2 ${getLogColorClass(log)}`,
            children: [(0, jsxRuntime.jsx)("span", {
              className: "opacity-50 flex-shrink-0",
              children: formatTimestamp(log.timestamp)
            }), (0, jsxRuntime.jsx)("span", {
              className: "font-bold uppercase opacity-70 w-14 flex-shrink-0 truncate text-center border border-white/10 rounded bg-black/20 text-[9px] px-1",
              children: log.source
            }), (0, jsxRuntime.jsx)("span", {
              className: "break-words flex-grow",
              children: log.message
            })]
          }, index)), (0, jsxRuntime.jsx)(LoadOlderButton, {
            visibleCount: visibleCount,
            totalCount: filteredLogs.length,
            onLoadMore: () => setVisibleCount(count => count + 50),
            step: 50
          })]
        })
      })]
    });
  };
}
