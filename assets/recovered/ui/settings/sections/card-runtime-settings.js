export function createCardRuntimeSettings(getDependencies) {
  return function CardRuntimeSettings() {
    const {
      settingsStorage = globalThis.localStorage,
      readCardRuntimeEngineMode,
      readCardRuntimeCompatMode,
      cardRuntimeCompatEvent,
      react,
      cardRuntimeEngineEvent,
      cardRuntimeEngineKey,
      jsxRuntime,
      cardRuntimeCompatKey
    } = getDependencies();
    let [compatMode, setCompatMode] = (0, react.useState)(readCardRuntimeCompatMode);
    let [engineMode, setEngineMode] = (0, react.useState)(readCardRuntimeEngineMode);
    let activeLevel = "full" === compatMode && "official-local" === engineMode ? "advanced" : "basic";
    let updateCompatMode = mode => {
      typeof window > "u" || (settingsStorage.setItem(cardRuntimeCompatKey, mode), window.dispatchEvent(new CustomEvent(cardRuntimeCompatEvent, {
        detail: mode
      })));
      setCompatMode(mode);
    };
    let updateEngineMode = mode => {
      typeof window > "u" || (settingsStorage.setItem(cardRuntimeEngineKey, mode), window.dispatchEvent(new CustomEvent(cardRuntimeEngineEvent, {
        detail: mode
      })));
      setEngineMode(mode);
    };
    let selectLevel = level => {
      let isAdvanced = "advanced" === level;
      updateCompatMode(isAdvanced ? "full" : "safe");
      updateEngineMode(isAdvanced ? "official-local" : "current");
    };
    (0, react.useEffect)(() => {
      let handleCompatChange = event => {
        let mode = event.detail;
        ("full" === mode || "safe" === mode) && setCompatMode(mode);
      };
      let handleEngineChange = event => {
        let mode = event.detail;
        ("current" === mode || "official-local" === mode) && setEngineMode(mode);
      };
      window.addEventListener(cardRuntimeCompatEvent, handleCompatChange);
      window.addEventListener(cardRuntimeEngineEvent, handleEngineChange);
      return () => {
        window.removeEventListener(cardRuntimeCompatEvent, handleCompatChange);
        window.removeEventListener(cardRuntimeEngineEvent, handleEngineChange);
      };
    }, []);
    (0, react.useEffect)(() => {
      let expectedCompatMode = "advanced" === activeLevel ? "full" : "safe";
      let expectedEngineMode = "advanced" === activeLevel ? "official-local" : "current";
      compatMode === expectedCompatMode && engineMode === expectedEngineMode || selectLevel(activeLevel);
    }, [compatMode, engineMode, activeLevel]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-5",
      children: [(0, jsxRuntime.jsxs)("div", {
        children: [(0, jsxRuntime.jsx)("h2", {
          className: "text-xl font-bold text-white",
          children: "Chế độ cài đặt HTML"
        }), (0, jsxRuntime.jsx)("p", {
          className: "mt-1 text-sm text-slate-400",
          children: "Chọn một chế độ; quyền chạy thẻ và bộ xử lý sẽ được cấu hình đồng bộ tự động."
        })]
      }), (0, jsxRuntime.jsxs)("fieldset", {
        className: "grid gap-3",
        children: [(0, jsxRuntime.jsx)("legend", {
          className: "sr-only",
          children: "Mức cài đặt HTML"
        }), (0, jsxRuntime.jsx)("label", {
          className: "block cursor-pointer rounded-xl border p-4 " + ("advanced" === activeLevel ? "border-violet-500 bg-violet-950/30" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"),
          children: (0, jsxRuntime.jsxs)("span", {
            className: "flex items-start gap-3",
            children: [(0, jsxRuntime.jsx)("input", {
              type: "radio",
              name: "html-settings-level",
              "aria-label": "Chế độ Nâng cao",
              value: "advanced",
              checked: "advanced" === activeLevel,
              onChange: () => selectLevel("advanced"),
              className: "mt-1"
            }), (0, jsxRuntime.jsxs)("span", {
              className: "min-w-0 flex-1",
              children: [(0, jsxRuntime.jsxs)("span", {
                className: "flex flex-wrap items-center gap-2",
                children: [(0, jsxRuntime.jsx)("span", {
                  className: "font-semibold text-slate-100",
                  children: "Nâng cao"
                }), (0, jsxRuntime.jsx)("span", {
                  className: "rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-200",
                  children: "Mặc định"
                })]
              }), (0, jsxRuntime.jsx)("span", {
                className: "mt-1 block text-sm text-slate-400",
                children: "Cho phép đầy đủ các quyền chạy thẻ và bật bộ xử lý mới tương thích cao."
              }), (0, jsxRuntime.jsxs)("span", {
                className: "mt-3 flex flex-wrap gap-2 text-xs",
                children: [(0, jsxRuntime.jsx)("span", {
                  className: "rounded-md bg-sky-500/20 px-2 py-1 text-sky-200",
                  children: "Toàn quyền iframe"
                }), (0, jsxRuntime.jsx)("span", {
                  className: "rounded-md bg-violet-500/20 px-2 py-1 text-violet-200",
                  children: "Bộ xử lý mới"
                })]
              })]
            })]
          })
        }), (0, jsxRuntime.jsx)("label", {
          className: "block cursor-pointer rounded-xl border p-4 " + ("basic" === activeLevel ? "border-emerald-500 bg-emerald-950/30" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"),
          children: (0, jsxRuntime.jsxs)("span", {
            className: "flex items-start gap-3",
            children: [(0, jsxRuntime.jsx)("input", {
              type: "radio",
              name: "html-settings-level",
              "aria-label": "Chế độ Cơ bản",
              value: "basic",
              checked: "basic" === activeLevel,
              onChange: () => selectLevel("basic"),
              className: "mt-1"
            }), (0, jsxRuntime.jsxs)("span", {
              className: "min-w-0 flex-1",
              children: [(0, jsxRuntime.jsx)("span", {
                className: "block font-semibold text-slate-100",
                children: "Cơ bản"
              }), (0, jsxRuntime.jsx)("span", {
                className: "mt-1 block text-sm text-slate-400",
                children: "Thu gọn quyền chạy trong sandbox và dùng bộ xử lý cũ. Phù hợp cho người mới bắt đầu."
              }), (0, jsxRuntime.jsxs)("span", {
                className: "mt-3 flex flex-wrap gap-2 text-xs",
                children: [(0, jsxRuntime.jsx)("span", {
                  className: "rounded-md bg-emerald-900/30 px-2 py-1 text-emerald-100",
                  children: "Quyền hạn chế"
                }), (0, jsxRuntime.jsx)("span", {
                  className: "rounded-md bg-slate-700/50 px-2 py-1 text-slate-300",
                  children: "Bộ xử lý cũ"
                })]
              })]
            })]
          })
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "advanced" === activeLevel ? "rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100" : "rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-100",
        children: "advanced" === activeLevel ? "Chỉ nhập thẻ từ nguồn bạn tin cậy. Chế độ Nâng cao trao cho JavaScript trong thẻ quyền tương đương extension chạy trong trang SillyTavern." : "Chế độ Cơ bản cô lập thẻ trong sandbox; một số thẻ TavernHelper phức tạp có thể không chạy đầy đủ."
      })]
    });
  };
}
