function resolveDiagnosticDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    CopyButton: deps.CopyButton,
    Icon: deps.Icon,
    LoadOlderButton: deps.LoadOlderButton,
    NetworkLogItem: deps.NetworkLogItem,
    redactNetworkLog: deps.redactNetworkLog
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
      children: [logs.slice(0, visibleCount).map((log, index) => (0, jsxRuntime.jsx)(NetworkLogItem, {
        log: log
      }, log.id || index)), (0, jsxRuntime.jsx)(LoadOlderButton, {
        visibleCount: visibleCount,
        totalCount: logs.length,
        onLoadMore: () => setVisibleCount(count => count + 3),
        step: 3
      })]
    }) : (0, jsxRuntime.jsx)("div", {
      className: "p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800",
      children: "Chưa có nhật ký mạng nào."
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
    let curlCommand = (0, reactRuntime.useMemo)(() => isExpanded ? ((entry, shouldRedact = false) => {
      shouldRedact && (entry = redactNetworkLog(entry));
      let command = `curl -X ${entry.method} "${entry.url}" \\\n`;
      if (entry.headers && Object.entries(entry.headers).forEach(([header, value]) => {
        command += `  -H "${header}: ${value}" \\\n`;
      }), entry.body) {
        let bodyText = "";
        if ("string" == typeof entry.body) bodyText = entry.body;else try {
          bodyText = JSON.stringify(entry.body, null, 2);
        } catch {
          bodyText = String(entry.body);
        }
        let escapedBody = bodyText.replace(/'/g, "'\\''");
        command += `  -d '${escapedBody}'`;
      } else command = command.slice(0, -3);
      return command;
    })(log, true) : "", [log, isExpanded]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "mb-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30  ",
      children: [(0, jsxRuntime.jsxs)("button", {
        onClick: () => setIsExpanded(!isExpanded),
        className: "w-full flex items-center justify-between p-2 hover:bg-slate-800/50  text-left group",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-3 overflow-hidden",
          children: [(0, jsxRuntime.jsx)("span", {
            className: `text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${(provider => {
              switch (provider) {
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
            className: `text-[10px] w-8 ${(method => "POST" === method ? "text-blue-400 font-bold" : "GET" === method ? "text-yellow-400 font-bold" : "text-slate-400")(log.method)}`,
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
