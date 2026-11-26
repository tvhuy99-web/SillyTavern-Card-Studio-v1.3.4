// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    Icon: deps.Icon,
    LoadOlderButton: deps.LoadOlderButton,
    TokenCountControl: deps.TokenCountControl,
    GenerateEntryButton: deps.GenerateEntryButton,
    PromptSectionView: deps.PromptSectionView,
    SystemLogPanel: deps.SystemLogPanel,
    NetworkLogItem: deps.NetworkLogItem,
    NetworkLogPanel: deps.NetworkLogPanel,
    SmartScanLogItem: deps.SmartScanLogItem,
    SmartScanLogPanel: deps.SmartScanLogPanel,
    MythicLogItem: deps.MythicLogItem,
    MythicLogPanel: deps.MythicLogPanel,
    SummaryLogPanel: deps.SummaryLogPanel,
    WorldInfoLogPanel: deps.WorldInfoLogPanel,
    PromptLogPanel: deps.PromptLogPanel,
    ResponseLogPanel: deps.ResponseLogPanel,
    WorldInfoScanPanel: deps.WorldInfoScanPanel,
    formatTimestamp: deps.formatTimestamp,
    formatDiagnostic: deps.formatDiagnostic,
    normalizeDiagnostic: deps.normalizeDiagnostic,
    diagnosticStorageKey: deps.diagnosticStorageKey,
    redactNetworkLog: deps.redactNetworkLog,
    getSmartContextSettings: deps.getSmartContextSettings
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
    let isHighlightSection = (0, react.useMemo)(() => ["Replacement", "Stop Strings"].some(t => section.name.toLowerCase().includes(t.toLowerCase())), [section.name]);
    let handleKeyDown = e => {
      let t = e.currentTarget;
      if ("ArrowDown" === e.key) {
        e.preventDefault();
        let n = t.nextElementSibling;
        n && n.tabIndex >= 0 && n.focus();
      } else if ("ArrowUp" === e.key) {
        e.preventDefault();
        let n = t.previousElementSibling;
        n && n.tabIndex >= 0 && n.focus();
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
        children: hasSubSections ? section.subSections.map((e, t) => (0, jsxRuntime.jsxs)("div", {
          tabIndex: 0,
          onKeyDown: handleKeyDown,
          className: "bg-slate-900/80 border border-slate-700/50 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-2 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap  cursor-text mb-1",
          children: [(0, jsxRuntime.jsxs)("span", {
            className: "text-slate-600 select-none mr-2",
            children: ["#", t + 1]
          }), e]
        }, t)) : isHighlightSection ? contentLines.map((e, t) => e.trim() ? (0, jsxRuntime.jsx)("div", {
          tabIndex: 0,
          onKeyDown: handleKeyDown,
          className: "bg-slate-950/80 border border-slate-800 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-1.5 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap  cursor-text",
          children: e
        }, t) : null) : (0, jsxRuntime.jsx)("div", {
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
    let getLogColorClass = e => {
      let {
        level: t,
        source: n
      } = e;
      if ("console" === n && "error" === t) return "text-orange-400 bg-orange-900/10 border-orange-900/30";
      if ("network" === n) return "text-pink-400 bg-pink-900/10 border-pink-900/30";
      switch (t) {
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
      let t = logs;
      if ("errors" === activeFilter) {
        t = t.filter(e => e.level.includes("error"));
      } else if ("warn" === activeFilter) {
        t = t.filter(e => "warn" === e.level);
      } else if ("iframe" === activeFilter) {
        t = t.filter(e => "iframe" === e.source);
      } else if ("card-runtime" === activeFilter) {
        t = t.filter(e => "card-runtime" === e.source);
      } else if ("diagnostic" === activeFilter) {
        t = t.filter(e => "diagnostic" === e.source);
      } else if ("aistudio" === activeFilter) {
        t = t.filter(e => "aistudio" === e.source);
      } else if ("regex" === activeFilter) {
        t = t.filter(e => "regex" === e.source);
      } else if ("variable" === activeFilter) {
        t = t.filter(e => "variable" === e.source);
      } else if ("state" === activeFilter) {
        t = t.filter(e => "state" === e.level);
      } else if ("console" === activeFilter) {
        t = t.filter(e => "console" === e.source);
      } else if ("network" === activeFilter) {
        t = t.filter(e => "network" === e.source);
      }
      if (searchQuery.trim()) {
        let e = searchQuery.toLowerCase();
        t = t.filter(t => t.message.toLowerCase().includes(e));
      }
      return t;
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
          }].map(e => (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              setActiveFilter(e.id);
              setVisibleCount(50);
            },
            className: "px-2 py-0.5 text-[9px] uppercase font-bold rounded " + (activeFilter === e.id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"),
            children: e.label
          }, e.id))
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50",
          children: [(0, jsxRuntime.jsx)("input", {
            type: "text",
            "aria-label": "Tìm kiếm nhật ký",
            placeholder: "Tìm kiếm log...",
            value: searchQuery,
            onChange: e => setSearchQuery(e.target.value),
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
                let e = filteredLogs.map(e => `[${formatTimestamp(e.timestamp)}] [${e.source.toUpperCase()}] [${e.level.toUpperCase()}] ${e.message}`).join("\n");
                navigator.clipboard.writeText(e);
              },
              className: "px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 border border-slate-600",
              title: "Sao chép log đang hiển thị",
              children: "Sao chép log"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                let t = logs.filter(e => "diagnostic" === e.source || "aistudio" === e.source).map(e => e.message.trim()).filter(Boolean);
                let n = (() => {
                  if (typeof window > "u") return [];
                  try {
                    let e = JSON.parse(window.localStorage.getItem(diagnosticStorageKey) || "[]");
                    return Array.isArray(e) ? e.map(e => normalizeDiagnostic(e)) : [];
                  } catch {
                    return [];
                  }
                })().map(formatDiagnostic);
                let r = Array.from(new Set([...t, ...n]));
                let a = ["GÓI BÁO CÁO CHẨN ĐOÁN", `Thời gian xuất: ${new Date().toLocaleString()}`, `Số báo cáo: ${r.length}`, "", r.length ? r.join("\n\n==============================\n\n") : "Chưa có lỗi chẩn đoán nào được ghi nhận."].join("\n");
                navigator.clipboard.writeText(a);
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
          children: [visibleLogs.map((e, t) => (0, jsxRuntime.jsxs)("div", {
            className: `p-1.5 border-b border-slate-800/50 flex gap-2 ${getLogColorClass(e)}`,
            children: [(0, jsxRuntime.jsx)("span", {
              className: "opacity-50 flex-shrink-0",
              children: formatTimestamp(e.timestamp)
            }), (0, jsxRuntime.jsx)("span", {
              className: "font-bold uppercase opacity-70 w-14 flex-shrink-0 truncate text-center border border-white/10 rounded bg-black/20 text-[9px] px-1",
              children: e.source
            }), (0, jsxRuntime.jsx)("span", {
              className: "break-words flex-grow",
              children: e.message
            })]
          }, t)), (0, jsxRuntime.jsx)(LoadOlderButton, {
            visibleCount: visibleCount,
            totalCount: filteredLogs.length,
            onLoadMore: () => setVisibleCount(e => e + 50),
            step: 50
          })]
        })
      })]
    });
  };
}
export function createNetworkLogPanel(getDependencies) {
  return function NetworkLogPanel({
    logs: logs
  }) {
    const {
      react,
      LoadOlderButton,
      NetworkLogItem,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [visibleCount, setVisibleCount] = (0, react.useState)(3);
    return logs && 0 !== logs.length ? (0, jsxRuntime.jsxs)("div", {
      className: "space-y-1",
      children: [logs.slice(0, visibleCount).map((e, t) => (0, jsxRuntime.jsx)(NetworkLogItem, {
        log: e
      }, e.id || t)), (0, jsxRuntime.jsx)(LoadOlderButton, {
        visibleCount: visibleCount,
        totalCount: logs.length,
        onLoadMore: () => setVisibleCount(e => e + 3),
        step: 3
      })]
    }) : (0, jsxRuntime.jsx)("div", {
      className: "p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
      children: "Chưa có nhật ký mạng nào."
    });
  };
}
export function createSmartScanLogPanel(getDependencies) {
  return function SmartScanLogPanel({
    logs: logs
  }) {
    const {
      react,
      LoadOlderButton,
      jsxRuntime,
      SmartScanLogItem
    } = resolveDiagnosticDeps(getDependencies);
    let [visibleCount, setVisibleCount] = (0, react.useState)(3);
    let visibleLogs = logs.slice(0, visibleCount);
    return (0, jsxRuntime.jsx)("div", {
      className: "space-y-4",
      children: 0 === visibleLogs.length ? (0, jsxRuntime.jsx)("div", {
        className: "p-4 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
        children: "Chưa có dữ liệu Smart Scan."
      }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [visibleLogs.map((t, n) => (0, jsxRuntime.jsx)(SmartScanLogItem, {
          logString: t,
          index: n,
          total: logs.length
        }, n)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: logs.length,
          onLoadMore: () => setVisibleCount(e => e + 3),
          step: 3
        })]
      })
    });
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
        children: [visibleLogs.map((n, r) => (0, jsxRuntime.jsx)(MythicLogItem, {
          logString: n,
          index: r,
          total: logs.length,
          onRetry: onRetry,
          isLatest: 0 === r
        }, r)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: logs.length,
          onLoadMore: () => setVisibleCount(e => e + 3),
          step: 3
        })]
      })
    });
  };
}
export function createSummaryLogPanel(getDependencies) {
  return function SummaryLogPanel({
    messages: messages,
    stats: stats,
    onForceSummarize: onForceSummarize,
    longTermSummaries = [],
    summaryQueue = [],
    onRegenerate: onRegenerate,
    onRetry: onRetry
  }) {
    const {
      react,
      Icon,
      getSmartContextSettings,
      PromptSectionView,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [expandedIndices, setExpandedIndices] = (0, react.useState)(new Set());
    let [showPromptModal, setShowPromptModal] = (0, react.useState)(false);
    let summaryCount = stats?.summaryCount || 0;
    let messageCount = stats?.messageCount || 0;
    let contextDepth = stats?.contextDepth || 20;
    let queueLength = stats?.queueLength || 0;
    let summarySize = stats?.chunkSize;
    let currentCount = messageCount;
    let progressPercent = Math.min(100, Math.floor(currentCount / contextDepth * 100));
    let isThresholdReached = currentCount >= contextDepth;
    let hasQueuedTasks = queueLength > 0;
    let hasFailedTask = "failed" === (summaryQueue.length > 0 ? summaryQueue[0] : null)?.status;
    let buildSummaryPreview = e => {
      let n = getSmartContextSettings();
      let r = summarySize || n.summarization_chunk_size || 10;
      let i = n.summarization_prompt || "";
      let o = longTermSummaries.slice(0, e).slice(-5);
      o.map((e, t) => `[Tóm tắt cũ #${t + 1}]: ${e.substring(0, 100)}...`);
      let s = o.length > 0 ? `Bao gồm ${o.length} gói tóm tắt liền trước.` : "(Chưa có bối cảnh trước đó)";
      let l = 0;
      let c = messages.length;
      let u = 0;
      let d = e * r;
      let h = (e + 1) * r;
      for (let e = 0; e < messages.length; e++) if ("model" === messages[e].role && (u++, u === d && (l = e + 1), u === h)) {
        c = e + 1;
        break;
      }
      0 === e && (l = 0);
      let p = messages.slice(l, c).map(e => `[${"user" === e.role ? "User" : "model" === e.role ? "Char" : "System"}] ${e.content.replace(/<[^>]*>/g, "").trim()}`);
      let m = p.length > 0 ? `Bao gồm ${p.length} tin nhắn (từ lượt ${d + 1} đến ${u}).` : "(Không tìm thấy dữ liệu tương ứng trong lịch sử hiện tại)";
      return [{
        id: "sys",
        name: "⚙️ System Instruction (Template)",
        content: i,
        role: "system"
      }, {
        id: "ctx",
        name: "📚 Previous Context (Rolling Window)",
        content: s,
        role: "system",
        subSections: o.length > 0 ? o : undefined
      }, {
        id: "dat",
        name: "💬 Target Data (Chat Slice)",
        content: m,
        role: "user",
        subSections: p.length > 0 ? p : undefined
      }];
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-4",
      children: [stats && (0, jsxRuntime.jsxs)("div", {
        className: "bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "grid grid-cols-2 gap-4 mb-3",
          children: [(0, jsxRuntime.jsxs)("div", {
            children: [(0, jsxRuntime.jsx)("p", {
              className: "text-[10px] text-slate-400 uppercase font-bold",
              children: "Số lượng Tóm tắt"
            }), (0, jsxRuntime.jsxs)("p", {
              className: "text-lg font-mono text-sky-400 font-bold",
              children: [summaryCount, " ", (0, jsxRuntime.jsx)("span", {
                className: "text-xs text-slate-500 font-normal",
                children: "gói"
              })]
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            children: [(0, jsxRuntime.jsx)("p", {
              className: "text-[10px] text-slate-400 uppercase font-bold",
              children: "Lượt Mới (Trong Bộ Nhớ)"
            }), (0, jsxRuntime.jsxs)("p", {
              className: "text-lg font-mono font-bold " + (isThresholdReached ? "text-amber-400 " : "text-slate-300"),
              children: ["~", currentCount, " ", (0, jsxRuntime.jsxs)("span", {
                className: "text-xs text-slate-500 font-normal",
                children: ["/ ", contextDepth, " lượt"]
              })]
            })]
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "w-full bg-slate-900 rounded-full h-2 mb-3 overflow-hidden border border-slate-700/50",
          children: (0, jsxRuntime.jsx)("div", {
            className: "h-full   " + (hasFailedTask ? "bg-red-600" : isThresholdReached ? "bg-amber-500" : "bg-sky-600"),
            style: {
              width: `${progressPercent}%`
            }
          })
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex justify-between items-center gap-2",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "text-[10px] text-slate-500 flex-grow",
            children: hasFailedTask ? (0, jsxRuntime.jsxs)("span", {
              className: "text-red-400 font-bold flex items-center gap-1",
              children: [(0, jsxRuntime.jsx)(Icon, {
                name: "error",
                className: "h-3.5 w-3.5"
              }), "Lỗi tóm tắt!"]
            }) : queueLength > 0 ? `Đang xử lý ${queueLength} tác vụ...` : isThresholdReached ? "Hệ thống nên tự động tóm tắt ngay." : "Chưa đủ dữ liệu."
          }), hasFailedTask && onRetry && (0, jsxRuntime.jsx)("button", {
            onClick: async () => {
              if (onRetry && !showPromptModal) {
                setShowPromptModal(true);
                try {
                  await onRetry();
                } catch (e) {
                  console.error("Retry failed", e);
                } finally {
                  setShowPromptModal(false);
                }
              }
            },
            disabled: showPromptModal,
            className: "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider  bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 flex items-center gap-2 ",
            children: showPromptModal ? "Đang thử..." : "Thử lại (Retry)"
          }), !hasFailedTask && onForceSummarize && (0, jsxRuntime.jsx)("button", {
            onClick: onForceSummarize,
            disabled: !isThresholdReached || hasQueuedTasks,
            className: "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider  flex items-center gap-2 " + (hasQueuedTasks ? "bg-slate-700 text-slate-500 cursor-wait" : isThresholdReached ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20" : "bg-slate-700 text-slate-500 opacity-50 cursor-not-allowed"),
            children: hasQueuedTasks ? "Đang chạy..." : "Buộc Tóm Tắt"
          })]
        })]
      }), 0 === longTermSummaries.length ? (0, jsxRuntime.jsx)("div", {
        className: "p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
        children: "Chưa có tóm tắt nào được tạo (Dữ liệu trống)."
      }) : (0, jsxRuntime.jsx)("div", {
        className: "flex flex-col gap-2",
        children: longTermSummaries.map((e, t) => {
          let n = buildSummaryPreview(t);
          return (0, jsxRuntime.jsxs)("details", {
            className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
            children: [(0, jsxRuntime.jsxs)("summary", {
              className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
              children: [(0, jsxRuntime.jsxs)("div", {
                className: "flex items-center gap-2",
                children: [(0, jsxRuntime.jsxs)("span", {
                  className: "text-xs font-semibold text-amber-400",
                  children: ["Tóm tắt #", t + 1]
                }), (0, jsxRuntime.jsx)("span", {
                  className: "text-[10px] text-slate-500 italic",
                  children: "(Dữ liệu Bền vững)"
                })]
              }), (0, jsxRuntime.jsx)("span", {
                className: " group-open:rotate-90  text-slate-500 text-[10px]",
                "aria-hidden": "true",
                children: "▶"
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "p-3 border-t border-slate-700/50 relative",
              children: [(0, jsxRuntime.jsxs)("details", {
                className: "mb-4 group/prompt border-l-2 border-indigo-500/30 pl-2",
                children: [(0, jsxRuntime.jsxs)("summary", {
                  className: "cursor-pointer text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mb-2 flex items-center gap-2",
                  children: [(0, jsxRuntime.jsx)("span", {
                    children: "📤 Lời nhắc Tóm tắt (Reconstructed)"
                  }), (0, jsxRuntime.jsx)("span", {
                    className: " group-open/prompt:rotate-90  text-[8px]",
                    "aria-hidden": "true",
                    children: "▶"
                  })]
                }), (0, jsxRuntime.jsx)("div", {
                  className: "space-y-2 mt-2",
                  children: n.map(e => (0, jsxRuntime.jsx)(PromptSectionView, {
                    section: e
                  }, e.id))
                })]
              }), (0, jsxRuntime.jsx)("div", {
                className: "absolute top-3 right-3 z-10 flex gap-1",
                children: (0, jsxRuntime.jsx)(CopyButton, {
                  textToCopy: e || "",
                  absolute: true
                })
              }), (0, jsxRuntime.jsx)("div", {
                className: "text-[10px] text-green-400 font-bold mb-1",
                children: "📥 Kết quả (Result)"
              }), (0, jsxRuntime.jsx)("div", {
                className: "bg-amber-900/10 border border-amber-900/30 p-3 rounded mb-2",
                children: (0, jsxRuntime.jsx)("p", {
                  className: "text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap",
                  children: e
                })
              }), onRegenerate && (0, jsxRuntime.jsx)("div", {
                className: "flex justify-end pt-2 border-t border-slate-700/30",
                children: (0, jsxRuntime.jsx)("button", {
                  onClick: () => (async e => {
                    if (onRegenerate && !expandedIndices.has(e)) {
                      setExpandedIndices(t => new Set(t).add(e));
                      try {
                        await onRegenerate(e);
                      } catch (e) {
                        console.error("Regenerate failed", e);
                        alert(`Lỗi khi tạo lại tóm tắt: ${e instanceof Error ? e.message : String(e)}`);
                      } finally {
                        setExpandedIndices(t => {
                          let n = new Set(t);
                          n.delete(e);
                          return n;
                        });
                      }
                    }
                  })(t),
                  disabled: expandedIndices.has(t),
                  className: "text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-sky-700 text-slate-400 hover:text-white  border border-slate-600 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed",
                  children: expandedIndices.has(t) ? "Đang tạo lại..." : "Thử lại (Regenerate)"
                })
              })]
            })]
          }, t);
        })
      })]
    });
  };
}
export function createWorldInfoLogPanel(getDependencies) {
  return function WorldInfoLogPanel({
    logs: logs
  }) {
    const {
      react,
      LoadOlderButton,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [visibleCount, setVisibleCount] = (0, react.useState)(3);
    let visibleLogs = logs.slice(0, visibleCount);
    return (0, jsxRuntime.jsx)("div", {
      className: "space-y-2",
      children: 0 === visibleLogs.length ? (0, jsxRuntime.jsx)("div", {
        className: "p-4 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
        children: "Chưa có mục World Info nào được kích hoạt."
      }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [visibleLogs.map((e, t) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/30 border border-slate-700/50 rounded-lg p-3",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "flex justify-end mb-1",
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: e,
              label: "Copy",
              absolute: false
            })
          }), (0, jsxRuntime.jsx)("pre", {
            className: "text-[10px] text-emerald-300 font-mono whitespace-pre-wrap break-words",
            children: e
          })]
        }, t)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: logs.length,
          onLoadMore: () => setVisibleCount(e => e + 3),
          step: 3
        })]
      })
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
        children: [visibleTurns.map((e, t) => (0, jsxRuntime.jsxs)("details", {
          className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("summary", {
            className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsxs)("span", {
                className: "text-xs font-semibold text-violet-400",
                children: ["Lượt #", totalTurns - t]
              }), (0, jsxRuntime.jsx)("span", {
                className: "text-[10px] text-slate-500",
                children: new Date(e.timestamp).toLocaleTimeString()
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsx)(TokenCountControl, {
                sections: e.prompt
              }), (0, jsxRuntime.jsxs)("span", {
                className: "text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded",
                children: [e.prompt.length, " mục"]
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
                textToCopy: e.prompt.map(e => e.content).join("\n\n"),
                label: "Sao chép tất cả",
                absolute: false
              })
            }), 0 === e.prompt.length ? (0, jsxRuntime.jsx)("p", {
              className: "text-xs text-slate-600 italic",
              children: "Không có dữ liệu prompt."
            }) : e.prompt.map(e => (0, jsxRuntime.jsx)(PromptSectionView, {
              section: e
            }, e.id))]
          })]
        }, t)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: totalTurns,
          onLoadMore: () => setVisibleCount(e => e + 3),
          step: 3
        })]
      })
    });
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
        children: [visibleTurns.map((e, t) => (0, jsxRuntime.jsxs)("details", {
          className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("summary", {
            className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [(0, jsxRuntime.jsxs)("span", {
                className: "text-xs font-semibold text-emerald-400",
                children: ["Lượt #", totalTurns - t]
              }), (0, jsxRuntime.jsx)("span", {
                className: "text-[10px] text-slate-500",
                children: new Date(e.timestamp).toLocaleTimeString()
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
                textToCopy: e.response,
                absolute: true
              })
            }), (0, jsxRuntime.jsx)("pre", {
              className: "bg-slate-950 p-3 rounded border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre-wrap break-words",
              children: e.response || "(Chưa có phản hồi)"
            })]
          })]
        }, t)), (0, jsxRuntime.jsx)(LoadOlderButton, {
          visibleCount: visibleCount,
          totalCount: totalTurns,
          onLoadMore: () => setVisibleCount(e => e + 3),
          step: 3
        })]
      })
    });
  };
}
export function createWorldInfoScanPanel(getDependencies) {
  return function WorldInfoScanPanel({
    logs: logs
  }) {
    const {
      react,
      Icon,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [selectedIndex, setSelectedIndex] = react.useState(0);
    return 0 === logs.length ? (0, jsxRuntime.jsxs)("div", {
      className: "flex flex-col items-center justify-center py-12 text-zinc-500",
      children: [(0, jsxRuntime.jsx)(Icon, {
        name: "search",
        className: "mb-2 h-7 w-7"
      }), (0, jsxRuntime.jsx)("p", {
        className: "text-sm font-medium",
        children: "Chưa có dữ liệu quét World Info."
      }), (0, jsxRuntime.jsx)("p", {
        className: "text-xs opacity-60",
        children: "Dữ liệu sẽ xuất hiện sau khi bạn gửi tin nhắn."
      })]
    }) : (0, jsxRuntime.jsx)("div", {
      className: "space-y-3 p-1",
      children: logs.map((r, a) => {
        let i;
        try {
          i = JSON.parse(r);
        } catch {
          return null;
        }
        let o = selectedIndex === a;
        return (0, jsxRuntime.jsxs)("div", {
          className: "border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden",
          children: [(0, jsxRuntime.jsxs)("button", {
            onClick: () => setSelectedIndex(o ? null : a),
            className: "w-full flex items-center justify-between p-3 hover:bg-zinc-800/50  text-left",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-3",
              children: [(0, jsxRuntime.jsx)("div", {
                className: "p-1.5 rounded bg-amber-500/10 text-amber-500",
                children: (0, jsxRuntime.jsx)(Icon, {
                  name: "search",
                  className: "h-4 w-4"
                })
              }), (0, jsxRuntime.jsxs)("div", {
                children: [(0, jsxRuntime.jsxs)("div", {
                  className: "text-sm font-medium text-zinc-200",
                  children: ["Lượt quét #", logs.length - a]
                }), (0, jsxRuntime.jsxs)("div", {
                  className: "text-[10px] text-zinc-500 font-mono",
                  children: [new Date(i.timestamp).toLocaleTimeString(), " • ", i.selectedItems.length, " mục được chọn"]
                })]
              })]
            }), o ? (0, jsxRuntime.jsx)(Icon, {
              name: "chevronDown",
              className: "h-4 w-4"
            }) : (0, jsxRuntime.jsx)(Icon, {
              name: "chevronRight",
              className: "h-4 w-4"
            })]
          }), o && (0, jsxRuntime.jsxs)("div", {
            className: "border-t border-zinc-800 p-4 space-y-4",
            children: [(0, jsxRuntime.jsxs)("div", {
              children: [(0, jsxRuntime.jsxs)("div", {
                className: "flex items-center gap-2 mb-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider",
                children: [(0, jsxRuntime.jsx)(Icon, {
                  name: "file",
                  className: "h-4 w-4"
                }), "Lời nhắc gửi đi"]
              }), (0, jsxRuntime.jsx)("div", {
                className: "bg-black/40 rounded p-3 text-xs text-zinc-400 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-zinc-800/50 leading-relaxed",
                children: i.prompt
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              children: [(0, jsxRuntime.jsxs)("div", {
                className: "flex items-center gap-2 mb-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider",
                children: [(0, jsxRuntime.jsx)(Icon, {
                  name: "check",
                  className: "h-4 w-4"
                }), "Các mục đã chọn & Độ phù hợp"]
              }), (0, jsxRuntime.jsx)("div", {
                className: "space-y-2",
                children: i.selectedItems.length > 0 ? i.selectedItems.map((e, t) => (0, jsxRuntime.jsxs)("div", {
                  className: "flex items-center justify-between p-2 rounded bg-zinc-800/30 border border-zinc-800/50",
                  children: [(0, jsxRuntime.jsxs)("div", {
                    className: "flex flex-col",
                    children: [(0, jsxRuntime.jsx)("span", {
                      className: "text-xs font-medium text-zinc-300",
                      children: e.name
                    }), (0, jsxRuntime.jsxs)("span", {
                      className: "text-[10px] text-zinc-500 font-mono",
                      children: ["ID: ", e.id]
                    })]
                  }), (0, jsxRuntime.jsxs)("div", {
                    className: "flex items-center gap-2",
                    children: [(0, jsxRuntime.jsx)("div", {
                      className: "h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden",
                      children: (0, jsxRuntime.jsx)("div", {
                        className: "h-full bg-amber-500",
                        style: {
                          width: `${Math.min(100, 100 * e.score)}%`
                        }
                      })
                    }), (0, jsxRuntime.jsxs)("span", {
                      className: "text-[10px] font-mono font-bold text-amber-500 w-8 text-right",
                      children: [(100 * e.score).toFixed(0), "%"]
                    })]
                  })]
                }, t)) : (0, jsxRuntime.jsx)("div", {
                  className: "text-xs text-zinc-600 italic p-2",
                  children: "Không có mục nào được chọn trong lượt này."
                })
              })]
            })]
          })]
        }, a);
      })
    });
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
    let errorCount = logs.systemLog.filter(e => e.level.includes("error")).length;
    let hasFailedSummary = summaryQueue?.some(e => "failed" === e.status);
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
              onClick: e => {
                e.stopPropagation();
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
export function createNetworkLogItem(react, getDependencies) {
  return (0, react.memo)(function NetworkLogItem({
    log: log
  }) {
    const {
      redactNetworkLog,
      react: reactRuntime,
      Icon,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let [isExpanded, setIsExpanded] = (0, reactRuntime.useState)(false);
    let formattedTime = new Date(log.timestamp).toLocaleTimeString();
    let curlCommand = (0, reactRuntime.useMemo)(() => isExpanded ? ((e, t = false) => {
      t && (e = redactNetworkLog(e));
      let n = `curl -X ${e.method} "${e.url}" \\\n`;
      if (e.headers && Object.entries(e.headers).forEach(([e, t]) => {
        n += `  -H "${e}: ${t}" \\\n`;
      }), e.body) {
        let t = "";
        if ("string" == typeof e.body) t = e.body;else try {
          t = JSON.stringify(e.body, null, 2);
        } catch {
          t = String(e.body);
        }
        let r = t.replace(/'/g, "'\\''");
        n += `  -d '${r}'`;
      } else n = n.slice(0, -3);
      return n;
    })(log, true) : "", [log, isExpanded]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "mb-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30  ",
      children: [(0, jsxRuntime.jsxs)("button", {
        onClick: () => setIsExpanded(!isExpanded),
        className: "w-full flex items-center justify-between p-2 hover:bg-slate-800/50  text-left group",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-3 overflow-hidden",
          children: [(0, jsxRuntime.jsx)("span", {
            className: `text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${(e => {
              switch (e) {
                case "gemini":
                  return "bg-teal-900/40 text-teal-400 border-teal-800";
                case "openrouter":
                  return "bg-purple-900/40 text-purple-400 border-purple-800";
                case "proxy":
                  return "bg-cyan-900/40 text-cyan-400 border-cyan-800";
                default:
                  return "bg-slate-700 text-slate-400 border-slate-600";
              }
            })(log.source)}`,
            children: log.source
          }), (0, jsxRuntime.jsx)("span", {
            className: `text-[10px] w-8 ${(e => "POST" === e ? "text-blue-400 font-bold" : "GET" === e ? "text-yellow-400 font-bold" : "text-slate-400")(log.method)}`,
            children: log.method
          }), (0, jsxRuntime.jsx)("span", {
            className: "text-[10px] text-slate-400 truncate font-mono opacity-80",
            title: log.url,
            children: log.url.length > 50 ? "..." + log.url.slice(-50) : log.url
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-3 pl-2",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-[9px] text-slate-600 font-mono whitespace-nowrap",
            children: formattedTime
          }), (0, jsxRuntime.jsx)("span", {
            children: (0, jsxRuntime.jsx)(Icon, {
              name: isExpanded ? "chevronDown" : "chevronRight",
              className: "h-4 w-4"
            })
          })]
        })]
      }), isExpanded && (0, jsxRuntime.jsxs)("div", {
        className: "border-t border-slate-800 bg-slate-950/50 p-3 ",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex justify-between items-center mb-2",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-[10px] text-slate-500 font-bold uppercase",
            children: "CURL Command"
          }), (0, jsxRuntime.jsx)(CopyButton, {
            textToCopy: curlCommand,
            label: "Copy CURL",
            absolute: false
          })]
        }), (0, jsxRuntime.jsx)("pre", {
          className: "text-[10px] text-slate-300 font-mono whitespace-pre-wrap break-all bg-black/20 p-2 rounded border border-slate-800",
          children: curlCommand
        })]
      })]
    });
  });
}
export function createSmartScanLogItem(react, getDependencies) {
  return (0, react.memo)(function SmartScanLogItem({
    logString: logString,
    index: index,
    total: total
  }) {
    const {
      react: reactRuntime,
      CopyButton,
      jsxRuntime
    } = resolveDiagnosticDeps(getDependencies);
    let parsedLog = (0, reactRuntime.useMemo)(() => {
      try {
        return JSON.parse(logString);
      } catch {
        return {
          fullPrompt: logString,
          rawResponse: "Error parsing log",
          latency: 0
        };
      }
    }, [logString]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-900/30 border border-fuchsia-500/20 rounded-lg p-3",
      children: [(0, jsxRuntime.jsx)("div", {
        className: "flex justify-between items-center mb-2 border-b border-fuchsia-500/20 pb-2",
        children: (0, jsxRuntime.jsxs)("span", {
          className: "text-xs font-bold text-fuchsia-400",
          children: ["Scan #", total - index, " ", (0, jsxRuntime.jsxs)("span", {
            className: "text-slate-500 font-normal",
            children: ["(", parsedLog.latency, "ms)"]
          })]
        })
      }), (0, jsxRuntime.jsxs)("details", {
        className: "mb-2 group",
        children: [(0, jsxRuntime.jsxs)("summary", {
          className: "cursor-pointer text-[10px] text-slate-400 hover:text-sky-400 font-bold mb-1 flex items-center gap-2",
          children: [(0, jsxRuntime.jsx)("span", {
            children: "📤 Lời nhắc Gửi đi (Outgoing Prompt)"
          }), (0, jsxRuntime.jsx)("span", {
            className: " group-open:rotate-90  text-[8px]",
            "aria-hidden": "true",
            children: "▶"
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "relative mt-1",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "absolute top-1 right-1 z-10",
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: parsedLog.fullPrompt,
              absolute: false
            })
          }), (0, jsxRuntime.jsx)("pre", {
            className: "text-[9px] text-slate-300 font-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded border border-slate-700/50 max-h-40 overflow-y-auto custom-scrollbar",
            children: parsedLog.fullPrompt
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "relative",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex justify-between items-center mb-1",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-[10px] text-green-400 font-bold",
            children: "📥 Phản hồi Thô (AI Response)"
          }), (0, jsxRuntime.jsx)(CopyButton, {
            textToCopy: parsedLog.rawResponse,
            label: "Copy JSON",
            absolute: false
          })]
        }), (0, jsxRuntime.jsx)("pre", {
          className: "text-[10px] text-indigo-200 font-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded border border-indigo-500/20",
          children: parsedLog.rawResponse
        })]
      })]
    });
  });
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
      let t = {
        latency: 0,
        fullPrompt: "",
        rawResponse: ""
      };
      try {
        t = JSON.parse(logString);
      } catch {
        t.fullPrompt = logString;
      }
      let n = (e => {
        let t = [];
        let n = e.indexOf("<Cấu trúc bảng & Luật lệ>");
        if (-1 === n) return [{
          id: "mythic_raw",
          name: "Raw Prompt (Unstructured)",
          content: e,
          role: "system"
        }];
        let r = e.substring(0, n).trim();
        r && t.push({
          id: "mythic_system",
          name: "🎛️ System Instructions (Chỉ dẫn)",
          content: r,
          role: "system"
        });
        let a = e.match(/<Cấu trúc bảng & Luật lệ>([\s\S]*?)<\/Cấu trúc bảng & Luật lệ>/);
        a && t.push({
          id: "mythic_schema",
          name: "📐 Schema & Rules (Cấu trúc bảng)",
          content: a[1].trim(),
          role: "system"
        });
        let i = e.match(/<Dữ liệu tham khảo \(Lorebook\)>([\s\S]*?)<\/Dữ liệu tham khảo \(Lorebook\)>/);
        if (i) {
          let e = i[1].trim();
          let n = e.split("### [Lore:").filter(Boolean).map(e => "### [Lore:" + e);
          t.push({
            id: "mythic_lore",
            name: "📚 Lorebook Reference (Dữ liệu tham khảo)",
            content: e,
            role: "system",
            subSections: n.length > 0 ? n : undefined
          });
        }
        let o = e.match(/<Dữ liệu bảng hiện tại>([\s\S]*?)<\/Dữ liệu bảng hiện tại>/);
        o && t.push({
          id: "mythic_data",
          name: "💾 Current Database (Dữ liệu hiện tại)",
          content: o[1].trim(),
          role: "system"
        });
        let s = e.match(/<Dữ liệu chính văn>([\s\S]*?)<\/Dữ liệu chính văn>/);
        s && t.push({
          id: "mythic_chat",
          name: "💬 Chat Context (Chính văn)",
          content: s[1].trim(),
          role: "system"
        });
        let l = e.match(/LUẬT CHUNG:([\s\S]*)$/);
        l && t.push({
          id: "mythic_global",
          name: "⚖️ Global Rules (Luật chung)",
          content: l[1].trim(),
          role: "system"
        });
        return t;
      })(t.fullPrompt);
      return {
        parsedLog: t,
        structuredPrompt: n
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
              children: "📤 Lời nhắc Gửi đi (Outgoing Prompt)"
            }), (0, jsxRuntime.jsx)("span", {
              className: " group-open:rotate-90  text-[8px]",
              "aria-hidden": "true",
              children: "▶"
            })]
          }), (0, jsxRuntime.jsx)("div", {
            onClick: e => e.stopPropagation(),
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: parsedLog.fullPrompt,
              label: "Sao chép tất cả",
              absolute: false
            })
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "mt-2 space-y-2 pl-2 border-l border-slate-800",
          children: structuredPrompt.map(e => (0, jsxRuntime.jsx)(PromptSectionView, {
            section: e
          }, e.id))
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "relative",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex justify-between items-center mb-1",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-[10px] text-orange-400 font-bold",
            children: "📥 Phản hồi Thô (AI Response)"
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
