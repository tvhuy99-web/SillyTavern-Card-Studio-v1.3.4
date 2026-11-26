
export function createSmartScanSettings(getDependencies) {
  return function SmartScanSettings() {
    const {
      SearchableSelect,
      smartScanDefaults,
      ModelTestButton,
      defaultGeminiModels,
      connections,
      EmbeddingProviderStatus,
      embeddingService,
      proxyPersistence,
      getSmartScanSettings,
      react,
      buildSavedProbeTarget,
      useToast,
      TextArea,
      saveSmartScanSettings,
      useGeminiCatalog,
      NumberInput,
      testModel,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    let [settings, setSettings] = (0, react.useState)(smartScanDefaults);
    let [isPromptOpen, setIsPromptOpen] = (0, react.useState)(false);
    let {
      showToast: showToast
    } = useToast();
    let {
      models: geminiModels
    } = useGeminiCatalog(defaultGeminiModels);
    (0, react.useEffect)(() => {
      let savedSettings = getSmartScanSettings();
      setSettings(savedSettings);
    }, []);
    let updateSetting = (field, value) => {
      let nextSettings = {
        ...settings,
        [field]: value
      };
      setSettings(nextSettings);
      saveSmartScanSettings(nextSettings);
    };
    let usesSemanticScan = ["semantic", "hybrid_fast", "ultimate"].includes(settings.mode);
    let usesLlmScan = ["llm_only", "ultimate"].includes(settings.mode);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex justify-between items-center mb-4",
        children: [(0, jsxRuntime.jsx)("h2", {
          className: "text-xl font-bold text-sky-400",
          children: "Smart Scan Toàn Cục"
        }), (0, jsxRuntime.jsx)(ToggleSwitch, {
          label: "Kích hoạt",
          checked: settings.enabled,
          onChange: value => updateSetting("enabled", value),
          clean: true
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-6   " + (settings.enabled ? "" : "opacity-50 pointer-events-none"),
        children: [(0, jsxRuntime.jsx)(SearchableSelect, {
          label: "Chế độ Quét",
          value: settings.mode,
          onChange: event => updateSetting("mode", event.target.value),
          options: [{
            value: "keyword",
            label: "1. Truyền thống (Chỉ Từ khóa)"
          }, {
            value: "semantic",
            label: "2. Ngữ nghĩa (Chỉ Embedding)"
          }, {
            value: "hybrid_fast",
            label: "3. Kết hợp Nhanh (Từ khóa + Embedding) - KHUYÊN DÙNG"
          }, {
            value: "llm_only",
            label: "4. Suy luận Sâu (Chỉ LLM)"
          }, {
            value: "ultimate",
            label: "5. Tối thượng (Từ khóa + Embedding + LLM)"
          }]
        }), usesSemanticScan && (0, jsxRuntime.jsxs)("div", {
          className: "bg-sky-900/20 border border-sky-500/30 p-4 rounded-lg space-y-4 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "flex items-center gap-2 mb-2",
            children: (0, jsxRuntime.jsx)("span", {
              className: "text-sky-400 font-bold text-sm uppercase tracking-wide",
              children: "Cài đặt Ngữ nghĩa (Embedding)"
            })
          }), (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Mô hình Embedding",
            value: settings.embedding_provider || "gemini",
            onChange: event => updateSetting("embedding_provider", event.target.value),
            options: embeddingService.listProviders().map(provider => ({
              value: provider.id,
              label: provider.label
            }))
          }), (0, jsxRuntime.jsx)(EmbeddingProviderStatus, {
            providerId: settings.embedding_provider || "gemini",
            showToast: showToast
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(NumberInput, {
              label: "Ngưỡng Tương đồng (Threshold)",
              value: settings.semantic_threshold || .7,
              onChange: value => updateSetting("semantic_threshold", value),
              min: .1,
              max: 1,
              step: .05
            }), (0, jsxRuntime.jsx)(NumberInput, {
              label: "Ngân sách Mục Ngữ nghĩa (Max Entries)",
              value: settings.max_semantic_entries || 20,
              onChange: value => updateSetting("max_semantic_entries", value),
              min: 1,
              max: 50,
              step: 1
            }), (0, jsxRuntime.jsx)(NumberInput, {
              label: "Số mục xử lý mỗi đợt",
              value: settings.embedding_batch_size || 30,
              onChange: value => updateSetting("embedding_batch_size", value),
              min: 1,
              max: 100,
              step: 1
            })]
          })]
        }), usesLlmScan && (0, jsxRuntime.jsxs)("div", {
          className: "bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg space-y-4 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "flex items-center gap-2 mb-2",
            children: (0, jsxRuntime.jsx)("span", {
              className: "text-indigo-400 font-bold text-sm uppercase tracking-wide",
              children: "Cài đặt Suy luận (LLM)"
            })
          }), (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4",
            children: [(0, jsxRuntime.jsx)(SearchableSelect, {
              label: "Chiến lược Nội dung",
              value: settings.scan_strategy || "efficient",
              onChange: event => updateSetting("scan_strategy", event.target.value),
              options: [{
                value: "efficient",
                label: "⚡ Tối ưu hóa (Cắt ngắn)"
              }, {
                value: "full",
                label: "🧠 Chính xác cao (Full)"
              }]
            }), (0, jsxRuntime.jsx)(SearchableSelect, {
              label: "Mô hình Quét (Khuyên dùng Flash)",
              value: settings.model || "gemini-3-flash-preview",
              onChange: event => updateSetting("model", event.target.value),
              options: geminiModels.map(model => ({
                value: model.id,
                label: model.name
              })),
              testButton: ModelTestButton && buildSavedProbeTarget && testModel ? (0, jsxRuntime.jsx)(ModelTestButton, {
                target: buildSavedProbeTarget({
                  provider: "gemini",
                  model: settings.model || "gemini-3-flash-preview",
                  connections: connections,
                  proxyPersistence: proxyPersistence
                }),
                testModel,
                notify: showToast
              }) : undefined
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(NumberInput, {
              label: "Độ sâu Quét (Tin nhắn)",
              value: settings.depth || 3,
              onChange: value => updateSetting("depth", value),
              min: 1,
              max: 10,
              step: 1
            }), (0, jsxRuntime.jsx)(NumberInput, {
              label: "Ngân sách Mục LLM (Max Entries)",
              value: settings.max_entries || 5,
              onChange: value => updateSetting("max_entries", value),
              min: 1,
              max: 50,
              step: 1
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "border-t border-slate-700 pt-4 mt-4",
            children: [(0, jsxRuntime.jsxs)("button", {
              onClick: () => setIsPromptOpen(!isPromptOpen),
              className: "text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2 font-semibold",
              children: [(0, jsxRuntime.jsx)("span", {
                "aria-hidden": "true",
                children: isPromptOpen ? "▼" : "▶"
              }), "Chỉnh sửa Lời nhắc Quét (System Prompt)"]
            }), isPromptOpen && (0, jsxRuntime.jsx)("div", {
              className: "mt-4 space-y-4 ",
              children: (0, jsxRuntime.jsx)(TextArea, {
                label: "Nội dung Prompt",
                value: settings.system_prompt || "",
                onChange: event => updateSetting("system_prompt", event.target.value),
                rows: 15
              })
            })]
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg mt-4",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 mb-2",
          children: (0, jsxRuntime.jsx)("span", {
            className: "text-emerald-400 font-bold text-sm uppercase tracking-wide",
            children: "AI Persistence (duy trì mục)"
          })
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "AI Sticky Duration (lượt AI phản hồi)",
          value: settings.aiStickyDuration,
          onChange: value => updateSetting("aiStickyDuration", value),
          min: 0,
          max: 20,
          step: 1
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "pt-4 border-t border-slate-700 flex justify-end",
        children: (0, jsxRuntime.jsx)("button", {
          onClick: () => {
            window.confirm("Bạn có chắc muốn khôi phục toàn bộ cấu hình quét về mặc định?") && (setSettings(smartScanDefaults), saveSmartScanSettings(smartScanDefaults), showToast("Đã khôi phục cấu hình mặc định.", "info"));
          },
          className: "text-xs text-red-400 hover:text-red-300 underline",
          children: "Khôi phục mặc định"
        })
      })]
    });
  };
}
