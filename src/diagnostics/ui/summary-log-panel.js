function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    Icon: deps.Icon,
    PromptSectionView: deps.PromptSectionView,
    getSmartContextSettings: deps.getSmartContextSettings
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
    if (stats?.memoryMode === "turn") {
      return (0, jsxRuntime.jsxs)("div", {
        className: "space-y-3",
        children: [(0, jsxRuntime.jsx)("p", {
          className: "text-sm text-slate-300",
          children: "Tóm tắt theo từng lượt: " + longTermSummaries.length + " bản ghi"
        }), longTermSummaries.length === 0 ? (0, jsxRuntime.jsx)("p", {
          className: "text-xs text-slate-500",
          children: "Chưa có tóm tắt được trích xuất."
        }) : longTermSummaries.map((summary, index) => (0, jsxRuntime.jsxs)("details", {
          className: "bg-slate-900/30 border border-slate-700 rounded-lg",
          children: [(0, jsxRuntime.jsx)("summary", {
            className: "p-3 text-sm font-semibold text-amber-400 cursor-pointer",
            children: "Tóm tắt #" + (index + 1) + " (Dữ liệu bền vững)"
          }), (0, jsxRuntime.jsxs)("div", {
            className: "p-3 border-t border-slate-700 space-y-2",
            children: [(0, jsxRuntime.jsx)(CopyButton, { textToCopy: summary }), (0, jsxRuntime.jsx)("p", {
              className: "text-xs text-slate-300 whitespace-pre-wrap",
              children: summary
            })]
          })]
        }, index))]
      });
    }
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
    let buildSummaryPreview = summaryIndex => {
      let settings = getSmartContextSettings();
      let chunkSize = summarySize || settings.summarization_chunk_size || 10;
      let systemPrompt = settings.summarization_prompt || "";
      let previousSummaries = longTermSummaries.slice(0, summaryIndex).slice(-5);
      previousSummaries.map((summary, index) => `[Tóm tắt cũ #${index + 1}]: ${summary.substring(0, 100)}...`);
      let contextDescription = previousSummaries.length > 0 ? `Bao gồm ${previousSummaries.length} gói tóm tắt liền trước.` : "(Chưa có bối cảnh trước đó)";
      let startIndex = 0;
      let endIndex = messages.length;
      let modelCount = 0;
      let startTurn = summaryIndex * chunkSize;
      let endTurn = (summaryIndex + 1) * chunkSize;
      for (let index = 0; index < messages.length; index++) if ("model" === messages[index].role && (modelCount++, modelCount === startTurn && (startIndex = index + 1), modelCount === endTurn)) {
        endIndex = index + 1;
        break;
      }
      0 === summaryIndex && (startIndex = 0);
      let chatLines = messages.slice(startIndex, endIndex).map(message => `[${"user" === message.role ? "User" : "model" === message.role ? "Char" : "System"}] ${message.content.replace(/<[^>]*>/g, "").trim()}`);
      let dataDescription = chatLines.length > 0 ? `Bao gồm ${chatLines.length} tin nhắn (từ lượt ${startTurn + 1} đến ${modelCount}).` : "(Không tìm thấy dữ liệu tương ứng trong lịch sử hiện tại)";
      return [{
        id: "sys",
        name: "System Instruction (Template)",
        content: systemPrompt,
        role: "system"
      }, {
        id: "ctx",
        name: "Previous Context (Rolling Window)",
        content: contextDescription,
        role: "system",
        subSections: previousSummaries.length > 0 ? previousSummaries : undefined
      }, {
        id: "dat",
        name: "Target Data (Chat Slice)",
        content: dataDescription,
        role: "user",
        subSections: chatLines.length > 0 ? chatLines : undefined
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
                } catch (error) {
                  console.error("Retry failed", error);
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
        children: longTermSummaries.map((summary, index) => {
          let preview = buildSummaryPreview(index);
          return (0, jsxRuntime.jsxs)("details", {
            className: "group bg-slate-900/30 border border-slate-700/50 rounded-lg",
            children: [(0, jsxRuntime.jsxs)("summary", {
              className: "px-3 py-2 cursor-pointer hover:bg-slate-800/50  select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50",
              children: [(0, jsxRuntime.jsxs)("div", {
                className: "flex items-center gap-2",
                children: [(0, jsxRuntime.jsxs)("span", {
                  className: "text-xs font-semibold text-amber-400",
                  children: ["Tóm tắt #", index + 1]
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
                    children: "Lời nhắc Tóm tắt (Reconstructed)"
                  }), (0, jsxRuntime.jsx)("span", {
                    className: " group-open/prompt:rotate-90  text-[8px]",
                    "aria-hidden": "true",
                    children: "▶"
                  })]
                }), (0, jsxRuntime.jsx)("div", {
                  className: "space-y-2 mt-2",
                  children: preview.map(section => (0, jsxRuntime.jsx)(PromptSectionView, {
                    section: section
                  }, section.id))
                })]
              }), (0, jsxRuntime.jsx)("div", {
                className: "absolute top-3 right-3 z-10 flex gap-1",
                children: (0, jsxRuntime.jsx)(CopyButton, {
                  textToCopy: summary || "",
                  absolute: true
                })
              }), (0, jsxRuntime.jsx)("div", {
                className: "text-[10px] text-green-400 font-bold mb-1",
                children: "Kết quả (Result)"
              }), (0, jsxRuntime.jsx)("div", {
                className: "bg-amber-900/10 border border-amber-900/30 p-3 rounded mb-2",
                children: (0, jsxRuntime.jsx)("p", {
                  className: "text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap",
                  children: summary
                })
              }), onRegenerate && (0, jsxRuntime.jsx)("div", {
                className: "flex justify-end pt-2 border-t border-slate-700/30",
                children: (0, jsxRuntime.jsx)("button", {
                  onClick: () => (async summaryIndex => {
                    if (onRegenerate && !expandedIndices.has(summaryIndex)) {
                      setExpandedIndices(previous => new Set(previous).add(summaryIndex));
                      try {
                        await onRegenerate(summaryIndex);
                      } catch (error) {
                        console.error("Regenerate failed", error);
                        alert(`Lỗi khi tạo lại tóm tắt: ${error instanceof Error ? error.message : String(error)}`);
                      } finally {
                        setExpandedIndices(previous => {
                          let next = new Set(previous);
                          next.delete(summaryIndex);
                          return next;
                        });
                      }
                    }
                  })(index),
                  disabled: expandedIndices.has(index),
                  className: "text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-sky-700 text-slate-400 hover:text-white  border border-slate-600 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed",
                  children: expandedIndices.has(index) ? "Đang tạo lại..." : "Thử lại (Regenerate)"
                })
              })]
            })]
          }, index);
        })
      })]
    });
  };
}
