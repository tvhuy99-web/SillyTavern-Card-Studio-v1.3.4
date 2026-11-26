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
    SmartScanLogItem: deps.SmartScanLogItem
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
        children: [visibleLogs.map((log, index) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/30 border border-slate-700/50 rounded-lg p-3",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "flex justify-end mb-1",
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: log,
              label: "Copy",
              absolute: false
            })
          }), (0, jsxRuntime.jsx)("pre", {
            className: "text-[10px] text-emerald-300 font-mono whitespace-pre-wrap break-words",
            children: log
          })]
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
      children: logs.map((logString, index) => {
        let scan;
        try {
          scan = JSON.parse(logString);
        } catch {
          return null;
        }
        let isSelected = selectedIndex === index;
        return (0, jsxRuntime.jsxs)("div", {
          className: "border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden",
          children: [(0, jsxRuntime.jsxs)("button", {
            onClick: () => setSelectedIndex(isSelected ? null : index),
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
                  children: ["Lượt quét #", logs.length - index]
                }), (0, jsxRuntime.jsxs)("div", {
                  className: "text-[10px] text-zinc-500 font-mono",
                  children: [new Date(scan.timestamp).toLocaleTimeString(), " • ", scan.selectedItems.length, " mục được chọn"]
                })]
              })]
            }), isSelected ? (0, jsxRuntime.jsx)(Icon, {
              name: "chevronDown",
              className: "h-4 w-4"
            }) : (0, jsxRuntime.jsx)(Icon, {
              name: "chevronRight",
              className: "h-4 w-4"
            })]
          }), isSelected && (0, jsxRuntime.jsxs)("div", {
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
                children: scan.prompt
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
                children: scan.selectedItems.length > 0 ? scan.selectedItems.map((item, itemIndex) => (0, jsxRuntime.jsxs)("div", {
                  className: "flex items-center justify-between p-2 rounded bg-zinc-800/30 border border-zinc-800/50",
                  children: [(0, jsxRuntime.jsxs)("div", {
                    className: "flex flex-col",
                    children: [(0, jsxRuntime.jsx)("span", {
                      className: "text-xs font-medium text-zinc-300",
                      children: item.name
                    }), (0, jsxRuntime.jsxs)("span", {
                      className: "text-[10px] text-zinc-500 font-mono",
                      children: ["ID: ", item.id]
                    })]
                  }), (0, jsxRuntime.jsxs)("div", {
                    className: "flex items-center gap-2",
                    children: [(0, jsxRuntime.jsx)("div", {
                      className: "h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden",
                      children: (0, jsxRuntime.jsx)("div", {
                        className: "h-full bg-amber-500",
                        style: {
                          width: `${Math.min(100, 100 * item.score)}%`
                        }
                      })
                    }), (0, jsxRuntime.jsxs)("span", {
                      className: "text-[10px] font-mono font-bold text-amber-500 w-8 text-right",
                      children: [(100 * item.score).toFixed(0), "%"]
                    })]
                  })]
                }, itemIndex)) : (0, jsxRuntime.jsx)("div", {
                  className: "text-xs text-zinc-600 italic p-2",
                  children: "Không có mục nào được chọn trong lượt này."
                })
              })]
            })]
          })]
        }, index);
      })
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
        children: [visibleLogs.map((logString, index) => (0, jsxRuntime.jsx)(SmartScanLogItem, {
          logString: logString,
          index: index,
          total: logs.length
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
