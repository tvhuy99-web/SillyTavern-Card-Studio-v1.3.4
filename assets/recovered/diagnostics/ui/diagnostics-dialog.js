function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    Icon: deps.Icon,
    GenerateEntryButton: deps.GenerateEntryButton,
    SystemLogPanel: deps.SystemLogPanel,
    SmartScanLogPanel: deps.SmartScanLogPanel,
    PromptLogPanel: deps.PromptLogPanel,
    ResponseLogPanel: deps.ResponseLogPanel,
    SummaryLogPanel: deps.SummaryLogPanel,
    MythicLogPanel: deps.MythicLogPanel,
    NetworkLogPanel: deps.NetworkLogPanel,
    WorldInfoScanPanel: deps.WorldInfoScanPanel
  };
}
export function createDiagnosticsDialog(getDependencies) {
  return function DiagnosticsDialog({
    logs: logs,
    messages: messages,
    onClearLogs: onClearLogs,
    onInspectState: onInspectState,
    isImmersive: isImmersive,
    onLorebookCreatorOpen: onLorebookCreatorOpen,
    summaryStats: summaryStats,
    longTermSummaries: longTermSummaries,
    summaryQueue: summaryQueue,
    onForceSummarize: onForceSummarize,
    onRegenerateSummary: onRegenerateSummary,
    onRetryFailedTask: onRetryFailedTask,
    onRetryMythic: onRetryMythic
  }) {
    const {
      ResponseLogPanel,
      WorldInfoScanPanel,
      PromptLogPanel,
      SummaryLogPanel,
      react,
      SmartScanLogPanel,
      NetworkLogPanel,
      GenerateEntryButton,
      Icon,
      SystemLogPanel,
      jsxRuntime,
      MythicLogPanel
    } = resolveDiagnosticDeps(getDependencies);
    let [isMaximized, setIsMaximized] = (0, react.useState)(false);
    if (isImmersive) return null;
    let errorCount = logs.systemLog.filter(log => log.level.includes("error")).length;
    let hasFailedSummary = summaryQueue?.some(task => "failed" === task.status);
    return (0, jsxRuntime.jsxs)("div", {
      className: "mt-4 border-t border-slate-700/50",
      children: [(0, jsxRuntime.jsxs)("button", {
        onClick: () => setIsMaximized(!isMaximized),
        className: "w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800  text-slate-300 rounded-t-lg group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/50",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-2",
          children: [(0, jsxRuntime.jsx)(Icon, {
            name: "tool",
            className: "h-4 w-4"
          }), (0, jsxRuntime.jsx)("span", {
            className: "font-bold text-sm group-hover:text-white ",
            children: "Bảng Gỡ Lỗi & Dữ Liệu Hệ Thống"
          }), (errorCount > 0 || hasFailedSummary) && (0, jsxRuntime.jsxs)("span", {
            className: "bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-500/30 flex items-center gap-1 ",
            children: [(0, jsxRuntime.jsx)("span", {
              "aria-hidden": "true",
              children: "●"
            }), " ", hasFailedSummary ? "Lỗi Tóm Tắt" : `${errorCount} Lỗi`]
          })]
        }), (0, jsxRuntime.jsx)(Icon, {
          name: isMaximized ? "collapse" : "expand",
          className: "h-4 w-4"
        })]
      }), isMaximized && (0, jsxRuntime.jsxs)("div", {
        className: "bg-slate-900/50 border-x border-b border-slate-800 rounded-b-lg p-2  max-h-[70vh] overflow-y-auto custom-scrollbar",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-sky-400 uppercase tracking-wider mb-2 border-b border-sky-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "1. Bảng điều khiển Hệ thống (Console)"
            })
          }), (0, jsxRuntime.jsx)(SystemLogPanel, {
            logs: logs.systemLog,
            onInspectState: onInspectState,
            onClearLogs: onClearLogs
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 border-b border-indigo-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "2. Công cụ AI"
            })
          }), (0, jsxRuntime.jsx)(GenerateEntryButton, {
            onOpen: onLorebookCreatorOpen
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-fuchsia-400 uppercase tracking-wider mb-2 border-b border-fuchsia-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "3. Nhật ký Smart Scan"
            })
          }), (0, jsxRuntime.jsx)(SmartScanLogPanel, {
            logs: logs.smartScanLog
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-violet-400 uppercase tracking-wider mb-2 border-b border-violet-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "4. Lời nhắc Gửi đi (Prompts)"
            })
          }), (0, jsxRuntime.jsx)(PromptLogPanel, {
            turns: logs.turns
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 border-b border-blue-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "5. Phản hồi AI (Raw Response)"
            })
          }), (0, jsxRuntime.jsx)(ResponseLogPanel, {
            turns: logs.turns
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 border-b border-amber-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "6. Tóm tắt (Summaries)"
            })
          }), (0, jsxRuntime.jsx)(SummaryLogPanel, {
            turns: logs.turns,
            messages: messages || [],
            stats: summaryStats,
            longTermSummaries: longTermSummaries,
            summaryQueue: summaryQueue,
            onForceSummarize: onForceSummarize,
            onRegenerate: onRegenerateSummary,
            onRetry: onRetryFailedTask
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex items-center justify-between border-b border-rose-500/20 pb-1 mb-2",
            children: [(0, jsxRuntime.jsx)("h3", {
              className: "text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2",
              children: (0, jsxRuntime.jsx)("span", {
                children: "7. Nhật ký Mythic Engine (RPG)"
              })
            }), onRetryMythic && (0, jsxRuntime.jsxs)("button", {
              onClick: event => {
                event.stopPropagation();
                onRetryMythic();
              },
              className: "px-2 py-0.5 text-[10px] bg-rose-600 hover:bg-rose-500 text-white rounded shadow-sm border border-rose-400/50 flex items-center gap-1 ",
              title: "Buộc chạy lại logic RPG cho lượt hội thoại cuối cùng (ngay cả khi log trống)",
              children: [(0, jsxRuntime.jsx)(Icon, {
                name: "refresh",
                className: "h-3.5 w-3.5"
              }), "Force Run"]
            })]
          }), (0, jsxRuntime.jsx)(MythicLogPanel, {
            logs: logs.mythicLog,
            onRetry: onRetryMythic
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 border-b border-cyan-500/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "8. Network Inspector (CURL)"
            })
          }), (0, jsxRuntime.jsx)(NetworkLogPanel, {
            logs: logs.networkLog
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mb-6",
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 border-b border-amber-600/20 pb-1 flex items-center gap-2",
            children: (0, jsxRuntime.jsx)("span", {
              children: "9. Kết quả Chọn World Info (AI/Semantic)"
            })
          }), (0, jsxRuntime.jsx)(WorldInfoScanPanel, {
            logs: logs.selectionLog || []
          })]
        })]
      })]
    });
  };
}
