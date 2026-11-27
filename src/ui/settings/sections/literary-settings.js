export function createLiterarySettings(getDependencies) {
  return function LiterarySettings() {
    const {
      settingsStorage = globalThis.localStorage,
      SearchableSelect,
      getProxyForTools,
      ModelTestButton,
      connections,
      proxyPersistence,
      react,
      buildSavedProbeTarget,
      useToast,
      TextArea,
      useGeminiCatalog,
      getWritingRefinementSettings,
      getConnectionSettings,
      testModel,
      jsxRuntime,
      ToggleSwitch,
      writingRefinementStorageKey
    } = getDependencies();
    let {
      showToast: showToast
    } = useToast();
    let [isEnabled, setIsEnabled] = (0, react.useState)(false);
    let [geminiModel, setGeminiModel] = (0, react.useState)("");
    let [systemPrompt, setSystemPrompt] = (0, react.useState)("");
    let {
      models: geminiModels,
      isLoading: isLoadingModels
    } = useGeminiCatalog([]);
    let connectionSettings = getConnectionSettings();
    let usesProxyForTools = getProxyForTools();
    let usesGemini = !usesProxyForTools && "gemini" === connectionSettings.source;
    (0, react.useEffect)(() => {
      let savedSettings = getWritingRefinementSettings();
      setIsEnabled(savedSettings.enabled);
      setGeminiModel(savedSettings.gemini_model);
      setSystemPrompt(savedSettings.writing_refinement_prompt);
    }, []);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        children: [(0, jsxRuntime.jsx)("h2", {
          className: "text-xl font-bold text-teal-400 mb-4",
          children: "Cài đặt Cải thiện Văn chương"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Bật Cải thiện Văn chương",
            checked: isEnabled,
            onChange: setIsEnabled
          }), isEnabled && (0, jsxRuntime.jsx)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700",
            children: (0, jsxRuntime.jsx)("p", {
              className: "text-sm text-slate-300",
              children: "Đang sử dụng mô hình chung từ Thiết lập API → API phụ."
            })
          }), isEnabled && (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700",
            children: [(0, jsxRuntime.jsx)("h3", {
              className: "text-sm font-bold text-teal-300 mb-2",
              children: "Tùy chỉnh Lời nhắc (Prompt)"
            }), (0, jsxRuntime.jsx)(TextArea, {
              label: "Lời nhắc (System Prompt)",
              value: systemPrompt,
              onChange: event => setSystemPrompt(event.target.value),
              rows: 17,
              placeholder: "Nhập lời nhắc tuỳ chỉnh cho Cải thiện Văn chương..."
            })]
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex justify-end border-t border-slate-700 pt-4",
        children: (0, jsxRuntime.jsx)("button", {
          onClick: () => {
            (nextSettings => {
              settingsStorage.setItem(writingRefinementStorageKey, JSON.stringify(nextSettings));
            })({
              enabled: isEnabled,
              gemini_model: geminiModel,
              writing_refinement_prompt: systemPrompt
            });
            showToast("Đã lưu cấu hình Cải thiện văn chương", "success");
          },
          className: "bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-colors",
          children: "Lưu cấu hình"
        })
      })]
    });
  };
}
