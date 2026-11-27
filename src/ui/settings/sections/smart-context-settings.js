export function createSmartContextSettings(getDependencies) {
  return function SmartContextSettings() {
    const {
      settingsStorage = globalThis.localStorage,
      smartContextStorageKey,
      SearchableSelect,
      smartContextDefaults,
      react,
      useToast,
      TextArea,
      NumberInput,
      getSmartContextSettings,
      jsxRuntime
    } = getDependencies();
    let {
      showToast: showToast
    } = useToast();
    let [settings, setSettings] = (0, react.useState)(smartContextDefaults);
    (0, react.useEffect)(() => {
      setSettings(getSmartContextSettings());
    }, []);
    let updateSetting = (field, value) => {
      let nextSettings = {
        ...settings,
        [field]: value
      };
      settingsStorage.setItem(smartContextStorageKey, JSON.stringify(nextSettings));
      setSettings(nextSettings);
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-8",
      children: [(0, jsxRuntime.jsx)("h2", {
        className: "text-xl font-bold text-sky-400 mb-4",
        children: "Smart Context & Memory (Toàn Cục)"
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "space-y-6",
          children: [(0, jsxRuntime.jsx)(NumberInput, {
            label: "Ngưỡng Kích Hoạt Tóm Tắt (Context Depth)",
            value: settings.context_depth || 20,
            onChange: value => updateSetting("context_depth", value),
            min: 4,
            max: 100,
            step: 2
          }), (0, jsxRuntime.jsx)(NumberInput, {
            label: "Kích Thước Gói Tóm Tắt (Chunk Size)",
            value: settings.summarization_chunk_size || 10,
            onChange: value => updateSetting("summarization_chunk_size", value),
            min: 1,
            max: settings.context_depth || 20,
            step: 1
          }), (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Chế độ Ghép nối Lịch sử",
            value: settings.context_mode || "standard",
            onChange: event => updateSetting("context_mode", event.target.value),
            options: [{
              value: "standard",
              label: "Tiêu chuẩn (Cả User & AI)"
            }, {
              value: "ai_only",
              label: "Chế độ Tự thuật (Chỉ AI)"
            }]
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center",
            children: [(0, jsxRuntime.jsx)("label", {
              className: "block text-sm font-medium text-slate-300",
              children: "Lời nhắc Tóm tắt Toàn cục (Global)"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                window.confirm("Bạn có chắc muốn khôi phục Lời nhắc Tóm tắt về mặc định không?") && (updateSetting("summarization_prompt", smartContextDefaults.summarization_prompt), showToast("Đã khôi phục lời nhắc tóm tắt.", "success"));
              },
              className: "text-xs text-red-400 hover:text-red-300 hover:underline",
              children: "Khôi phục Mặc định"
            })]
          }), (0, jsxRuntime.jsx)(TextArea, {
            label: "",
            ariaLabel: "Lời nhắc Tóm tắt Toàn cục",
            value: settings.summarization_prompt || "",
            onChange: event => updateSetting("summarization_prompt", event.target.value),
            rows: 15,
            className: "font-mono text-xs"
          })]
        })]
      })]
    });
  };
}
