
export function createActionSuggestionSettings(getDependencies) {
  return function ActionSuggestionSettings() {
    const {
      settingsStorage = globalThis.localStorage,
      SearchableSelect,
      actionSuggestionStorageKey,
      ModelTestButton,
      connections,
      proxyPersistence,
      react,
      buildSavedProbeTarget,
      useToast,
      TextArea,
      useGeminiCatalog,
      getConnectionSettings,
      getActionSuggestionSettings,
      testModel,
      jsxRuntime,
      ToggleSwitch
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
    let usesGemini = "gemini" === connectionSettings.source;
    (0, react.useEffect)(() => {
      let savedSettings = getActionSuggestionSettings();
      setIsEnabled(savedSettings.enabled);
      setGeminiModel(savedSettings.gemini_model);
      setSystemPrompt(savedSettings.action_suggestion_prompt);
    }, []);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        children: [(0, jsxRuntime.jsx)("h2", {
          className: "text-xl font-bold text-sky-400 mb-4",
          children: "Cài đặt Gợi ý Hành động"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Bật Gợi ý Hành động",
            checked: isEnabled,
            onChange: setIsEnabled
          }), isEnabled && usesGemini && (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700",
            children: [(0, jsxRuntime.jsx)("label", {
              className: "block text-sm font-bold text-indigo-300 mb-2",
              children: "Mô hình Google Gemini (Chuyên dụng)"
            }), (0, jsxRuntime.jsx)(SearchableSelect, {
              ariaLabel: "Mô hình Google Gemini",
              value: geminiModel,
              onChange: event => setGeminiModel(event.target.value),
              options: geminiModels.map(model => ({
                value: model.id,
                label: model.name
              })),
              disabled: isLoadingModels,
              testButton: ModelTestButton && buildSavedProbeTarget && testModel ? (0, jsxRuntime.jsx)(ModelTestButton, {
                target: buildSavedProbeTarget({
                  provider: "gemini",
                  model: geminiModel,
                  connections: connections,
                  proxyPersistence: proxyPersistence
                }),
                testModel,
                notify: showToast
              }) : undefined
            })]
          }), isEnabled && !usesGemini && (0, jsxRuntime.jsx)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700",
            children: (0, jsxRuntime.jsxs)("p", {
              className: "text-sm text-slate-300",
              children: ["Đang sử dụng ", "proxy" === connectionSettings.source ? "Proxy Tool Model" : "OpenRouter Model", " (Được cấu hình trong Thiết lập API)"]
            })
          }), isEnabled && (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700",
            children: [(0, jsxRuntime.jsx)("h3", {
              className: "text-sm font-bold text-sky-300 mb-2",
              children: "Tùy chỉnh Lời nhắc (Prompt)"
            }), (0, jsxRuntime.jsx)(TextArea, {
              label: "Lời nhắc (System Prompt)",
              value: systemPrompt,
              onChange: event => setSystemPrompt(event.target.value),
              rows: 15,
              placeholder: "Nhập lời nhắc tuỳ chỉnh cho Gợi ý hành động..."
            })]
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex justify-end border-t border-slate-700 pt-4",
        children: (0, jsxRuntime.jsx)("button", {
          onClick: () => {
            (nextSettings => {
              settingsStorage.setItem(actionSuggestionStorageKey, JSON.stringify(nextSettings));
            })({
              enabled: isEnabled,
              gemini_model: geminiModel,
              action_suggestion_prompt: systemPrompt
            });
            showToast("Đã lưu cấu hình Gợi ý hành động", "success");
          },
          className: "bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg",
          children: "Lưu cấu hình"
        })
      })]
    });
  };
}
