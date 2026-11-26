import { readBackupSetting } from '../../app/persistence/backup-codec.js';
// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveSettingsScreenDeps(getDependencies) {
  const deps = getDependencies();
  return {
    settingsStorage: deps.settingsStorage,
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    useToast: deps.useToast,
    SearchableSelect: deps.SearchableSelect,
    TextArea: deps.TextArea,
    NumberInput: deps.NumberInput,
    ToggleSwitch: deps.ToggleSwitch,
    LoadingIndicator: deps.LoadingIndicator,
    ModelTestButton: deps.ModelTestButton,
    buildSavedProbeTarget: deps.buildSavedProbeTarget,
    testModel: deps.testModel,
    connections: deps.connections,
    proxyPersistence: deps.proxyPersistence,
    EmbeddingProviderStatus: deps.EmbeddingProviderStatus,
    embeddingService: deps.embeddingService,
    smartScanDefaults: deps.smartScanDefaults,
    defaultGeminiModels: deps.defaultGeminiModels,
    getSmartScanSettings: deps.getSmartScanSettings,
    saveSmartScanSettings: deps.saveSmartScanSettings,
    useGeminiCatalog: deps.useGeminiCatalog,
    smartContextStorageKey: deps.smartContextStorageKey,
    smartContextDefaults: deps.smartContextDefaults,
    getSmartContextSettings: deps.getSmartContextSettings,
    actionSuggestionStorageKey: deps.actionSuggestionStorageKey,
    getConnectionSettings: deps.getConnectionSettings,
    getActionSuggestionSettings: deps.getActionSuggestionSettings,
    getProxyForTools: deps.getProxyForTools,
    getWritingRefinementSettings: deps.getWritingRefinementSettings,
    writingRefinementStorageKey: deps.writingRefinementStorageKey,
    sanitizeSpeechText: deps.sanitizeSpeechText,
    geminiSpeechVoices: deps.geminiSpeechVoices,
    speechSafetySettings: deps.speechSafetySettings,
    getAudioContext: deps.getAudioContext,
    decodeRawPcmBuffer: deps.decodeRawPcmBuffer,
    decodeBase64Bytes: deps.decodeBase64Bytes,
    speakNativeText: deps.speakNativeText,
    useSpeech: deps.useSpeech,
    GoogleGenAI: deps.GoogleGenAI,
    Modality: deps.Modality,
    nextGeminiKey: deps.nextGeminiKey,
    geminiSettingsKey: deps.geminiSettingsKey,
    geminiRotationKey: deps.geminiRotationKey,
    openRouterKeyStorageKey: deps.openRouterKeyStorageKey,
    proxyProfilesKey: deps.proxyProfilesKey,
    proxyPasswordKey: deps.proxyPasswordKey,
    backupSettingKeys: deps.backupSettingKeys,
    cardRuntimeStoragePrefix: deps.cardRuntimeStoragePrefix,
    arrayBufferToBase64: deps.arrayBufferToBase64,
    backupRestoreService: deps.backupRestoreService,
    diagnosticsState: deps.diagnosticsState,
    repositories: deps.repositories,
    characterStore: deps.characterStore,
    presetStore: deps.presetStore,
    lorebookStore: deps.lorebookStore,
    personaStore: deps.personaStore,
    readCardRuntimeEngineMode: deps.readCardRuntimeEngineMode,
    readCardRuntimeCompatMode: deps.readCardRuntimeCompatMode,
    cardRuntimeCompatEvent: deps.cardRuntimeCompatEvent,
    cardRuntimeEngineEvent: deps.cardRuntimeEngineEvent,
    cardRuntimeEngineKey: deps.cardRuntimeEngineKey,
    cardRuntimeCompatKey: deps.cardRuntimeCompatKey,
    SmartContextSettings: deps.SmartContextSettings,
    ActionSuggestionSettings: deps.ActionSuggestionSettings,
    ConnectionSettingsScreen: deps.ConnectionSettingsScreen,
    BackupSettings: deps.BackupSettings,
    SmartScanSettings: deps.SmartScanSettings,
    SpeechSettings: deps.SpeechSettings,
    CardRuntimeSettings: deps.CardRuntimeSettings,
    SettingsTab: deps.SettingsTab,
    LiterarySettings: deps.LiterarySettings,
    PersonaScreen: deps.PersonaScreen
  };
}
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
    } = resolveSettingsScreenDeps(getDependencies);
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
    } = resolveSettingsScreenDeps(getDependencies);
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
    } = resolveSettingsScreenDeps(getDependencies);
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
    } = resolveSettingsScreenDeps(getDependencies);
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
              children: ["Đang sử dụng ", usesProxyForTools || "proxy" === connectionSettings.source ? "Proxy Tool Model" : "OpenRouter Model", " (Được cấu hình trong Thiết lập API)"]
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
export function createSpeechSettings(getDependencies) {
  return function SpeechSettings() {
    const {
      sanitizeSpeechText,
      SearchableSelect,
      geminiSpeechVoices,
      speechSafetySettings,
      getAudioContext,
      decodeRawPcmBuffer,
      decodeBase64Bytes,
      speakNativeText,
      react,
      useToast,
      NumberInput,
      useSpeech,
      GoogleGenAI,
      jsxRuntime,
      ToggleSwitch,
      nextGeminiKey,
      Modality
    } = resolveSettingsScreenDeps(getDependencies);
    let {
      settings: speechSettings,
      updateSettings: updateSpeechSettings
    } = useSpeech();
    let {
      showToast: showToast
    } = useToast();
    let [isTestingVoice, setIsTestingVoice] = (0, react.useState)(false);
    let [nativeVoices, setNativeVoices] = (0, react.useState)([]);
    (0, react.useEffect)(() => {
      let refreshVoices = () => {
        let voices = window.speechSynthesis.getVoices().sort((firstVoice, secondVoice) => {
          let firstVietnamese = firstVoice.lang.includes("vi");
          let secondVietnamese = secondVoice.lang.includes("vi");
          return firstVietnamese && !secondVietnamese ? -1 : !firstVietnamese && secondVietnamese ? 1 : firstVoice.name.localeCompare(secondVoice.name);
        });
        setNativeVoices(voices);
      };
      refreshVoices();
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    }, []);
    let updateSetting = (field, value) => {
      updateSpeechSettings({
        ...speechSettings,
        [field]: value
      });
    };
    let isNativeProvider = "native" === speechSettings.tts_provider;
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsx)("h2", {
        className: "sr-only",
        children: "Cài đặt Giọng nói"
      }), (0, jsxRuntime.jsx)(ToggleSwitch, {
        label: "Bật Text-to-Speech (TTS) Toàn Cục",
        checked: speechSettings.tts_enabled ?? false,
        onChange: value => updateSetting("tts_enabled", value)
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-6   " + (speechSettings.tts_enabled ? "" : "opacity-50 pointer-events-none"),
        children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
          label: "Chế độ Đọc Streaming (Real-time)",
          checked: speechSettings.tts_streaming ?? false,
          onChange: value => updateSetting("tts_streaming", value)
        }), (0, jsxRuntime.jsx)(SearchableSelect, {
          label: "Nguồn Giọng Đọc (Provider)",
          value: speechSettings.tts_provider || "gemini",
          onChange: event => updateSetting("tts_provider", event.target.value),
          options: [{
            value: "gemini",
            label: "Gemini AI (Cloud)"
          }, {
            value: "native",
            label: "Trình duyệt (Native)"
          }]
        }), isNativeProvider ? (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4 border-l-2 border-slate-600 pl-4",
          children: [0 === nativeVoices.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-xs text-amber-400",
            children: "Không tìm thấy giọng đọc nào trong trình duyệt. Vui lòng kiểm tra lại thiết bị."
          }) : (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Giọng Đọc Trình Duyệt",
            value: speechSettings.tts_native_voice || nativeVoices[0]?.voiceURI || "",
            onChange: event => updateSetting("tts_native_voice", event.target.value),
            options: nativeVoices.map(voice => ({
              value: voice.voiceURI,
              label: voice.name
            }))
          }), (0, jsxRuntime.jsx)(NumberInput, {
            label: "Tốc độ (Rate)",
            value: speechSettings.tts_rate ?? 1,
            onChange: value => updateSetting("tts_rate", value),
            min: .1,
            max: 2,
            step: .1
          }), (0, jsxRuntime.jsx)(NumberInput, {
            label: "Cao độ (Pitch)",
            value: speechSettings.tts_pitch ?? 1,
            onChange: value => updateSetting("tts_pitch", value),
            min: 0,
            max: 2,
            step: .1
          })]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "space-y-4 border-l-2 border-slate-600 pl-4",
          children: (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Giọng đọc Gemini",
            value: speechSettings.tts_voice || "Kore",
            onChange: event => updateSetting("tts_voice", event.target.value),
            options: geminiSpeechVoices.map(voice => ({
              value: voice.id,
              label: voice.name
            }))
          })
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex justify-end pt-2",
          children: (0, jsxRuntime.jsx)("button", {
            onClick: async () => {
              if (!isTestingVoice) {
                setIsTestingVoice(true);
                try {
                  let sampleText = "Xin chào, đây là giọng đọc thử nghiệm. Hệ thống âm thanh đang hoạt động tốt.";
                  if ("gemini" === (speechSettings.tts_provider || "gemini")) await (async (text, voiceName = "Kore", onStart) => {
                    let apiKey = nextGeminiKey();
                    if (!apiKey) throw Error("API Key chưa được cấu hình.");
                    let cleanText = sanitizeSpeechText(text);
                    if (console.log("[TTS] Starting request...", {
                      originalLength: text.length,
                      cleanLength: cleanText.length,
                      voiceName: voiceName
                    }), !cleanText) throw Error("Không có nội dung văn bản hợp lệ để đọc (Văn bản có thể chỉ chứa ký tự đặc biệt).");
                    let client = new GoogleGenAI({
                      apiKey: apiKey
                    });
                    try {
                      let context = await getAudioContext();
                      console.log("[TTS] AudioContext ready/resumed");
                      console.log("[TTS] Sending API request...");
                      let response = await client.models.generateContent({
                        model: "gemini-2.5-flash-preview-tts",
                        contents: {
                          parts: [{
                            text: cleanText
                          }]
                        },
                        config: {
                          responseModalities: [Modality.AUDIO],
                          speechConfig: {
                            voiceConfig: {
                              prebuiltVoiceConfig: {
                                voiceName: voiceName
                              }
                            }
                          },
                          safetySettings: speechSafetySettings
                        }
                      });
                      console.log("[TTS] API Response received");
                      let candidate = response.candidates?.[0];
                      let encodedAudio = candidate?.content?.parts?.[0]?.inlineData?.data;
                      if (!encodedAudio) {
                        let finishReason = candidate?.finishReason;
                        let safetyRatings = candidate?.safetyRatings;
                        throw console.error("[TTS] No audio data.", {
                          finishReason: finishReason,
                          safetyRatings: safetyRatings
                        }), Error("SAFETY" === finishReason || "OTHER" === finishReason ? `AI từ chối đọc do nội dung nhạy cảm. (Reason: ${finishReason})` : `API trả về phản hồi rỗng. (Reason: ${finishReason || "Unknown"})`);
                      }
                      let audioBuffer;
                      let audioBytes = decodeBase64Bytes(encodedAudio);
                      console.log(`[TTS] Decoded ${audioBytes.length} bytes.`);
                      try {
                        let buffer = audioBytes.buffer.slice(0);
                        audioBuffer = await context.decodeAudioData(buffer);
                        console.log("[TTS] Standard decodeAudioData success.");
                      } catch (error) {
                        console.warn("[TTS] Standard decode failed, trying Raw PCM fallback...", error);
                        try {
                          audioBuffer = decodeRawPcmBuffer(audioBytes, context, 24e3);
                          console.log("[TTS] Raw PCM decode success.");
                        } catch (error) {
                          throw console.error("[TTS] All decoding attempts failed.", error), Error("Không thể giải mã dữ liệu âm thanh (Định dạng không hỗ trợ).");
                        }
                      }
                      return new Promise((resolve, reject) => {
                        try {
                          let source = context.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(context.destination);
                          source.onended = () => {
                            console.log("[TTS] Playback ended.");
                            resolve();
                          };
                          onStart && onStart();
                          source.start();
                          console.log("[TTS] Playback started.");
                        } catch (error) {
                          reject(error);
                        }
                      });
                    } catch (error) {
                      throw console.error("[TTS] Critical Error:", error), error;
                    }
                  })(sampleText, speechSettings.tts_voice || "Kore");else {
                    let voice = speechSettings.tts_native_voice || "";
                    let rate = speechSettings.tts_rate || 1;
                    let pitch = speechSettings.tts_pitch || 1;
                    await new Promise(resolve => {
                      speakNativeText(sampleText, voice, rate, pitch, undefined, () => resolve());
                    });
                  }
                  showToast("Đã phát âm thanh thử nghiệm thành công.", "success");
                } catch (error) {
                  showToast(`Lỗi thử nghiệm: ${error instanceof Error ? error.message : String(error)}`, "error");
                } finally {
                  setIsTestingVoice(false);
                }
              }
            },
            disabled: isTestingVoice,
            className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md  flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed",
            children: isTestingVoice ? (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsxs)("svg", {
                "aria-hidden": "true",
                className: " h-4 w-4 text-white",
                xmlns: "http://www.w3.org/2000/svg",
                fill: "none",
                viewBox: "0 0 24 24",
                children: [(0, jsxRuntime.jsx)("circle", {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }), (0, jsxRuntime.jsx)("path", {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                })]
              }), (0, jsxRuntime.jsx)("span", {
                children: "Đang tải..."
              })]
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
                  clipRule: "evenodd"
                })
              }), (0, jsxRuntime.jsx)("span", {
                children: "Nghe thử"
              })]
            })
          })
        })]
      })]
    });
  };
}
export function createBackupSettings(getDependencies) {
  return function BackupSettings() {
    const {
      geminiSettingsKey,
      geminiRotationKey,
      openRouterKeyStorageKey,
      personaStore,
      proxyProfilesKey,
      backupSettingKeys,
      proxyPasswordKey,
      cardRuntimeStoragePrefix,
      arrayBufferToBase64,
      backupRestoreService,
      connections,
      diagnosticsState,
      proxyPersistence,
      repositories,
      react,
      presetStore,
      useToast,
      characterStore,
      LoadingIndicator,
      lorebookStore,
      jsxRuntime
    } = resolveSettingsScreenDeps(getDependencies);
    const backupKeys = {
      gemini: geminiSettingsKey,
      rotation: geminiRotationKey,
      openrouter: openRouterKeyStorageKey,
      profiles: proxyProfilesKey,
      password: proxyPasswordKey
    };
    const backupStorage = {
      get local() {
        return localStorage;
      },
      get session() {
        return sessionStorage;
      },
      connections: connections,
      proxy: proxyPersistence,
      keys: backupKeys
    };
    const [isBackingUp, setIsBackingUp] = (0, react.useState)(false);
    const [isRestoring, setIsRestoring] = (0, react.useState)(false);
    const [isCleaning, setIsCleaning] = (0, react.useState)(false);
    const [pendingRecovery, setPendingRecovery] = (0, react.useState)(() => backupRestoreService?.getPendingRecovery?.() || null);
    const [isRecovering, setIsRecovering] = (0, react.useState)(false);
    const fileInputRef = (0, react.useRef)(null);
    const {
      showToast
    } = useToast();
    const {
      reloadCharacters
    } = characterStore();
    const {
      reloadPresets
    } = presetStore();
    const {
      reloadLorebooks
    } = lorebookStore();
    const {
      reloadPersonas
    } = personaStore();
    const refreshPendingRecovery = async () => {
      if (typeof backupRestoreService?.inspectPendingRecovery === "function") {
        try {
          const inspected = await backupRestoreService.inspectPendingRecovery();
          setPendingRecovery(inspected || null);
          return inspected || null;
        } catch {
          // Fall back to synchronous journal inspection if async store probe fails.
        }
      }
      const syncPending = backupRestoreService?.getPendingRecovery?.() || null;
      setPendingRecovery(syncPending);
      return syncPending;
    };
    if (typeof react.useEffect === "function") {
      (0, react.useEffect)(() => {
        let active = true;
        if (typeof backupRestoreService?.inspectPendingRecovery === "function") {
          Promise.resolve(backupRestoreService.inspectPendingRecovery()).then(inspected => {
            if (active) setPendingRecovery(inspected || null);
          }).catch(() => {});
        }
        return () => {
          active = false;
        };
      }, []);
    }
    const downloadBackupFile = file => {
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      showToast("Đã tải xuống file sao lưu.", "success");
    };
    const reloadAllCatalogs = () => Promise.all([reloadCharacters(), reloadPresets(), reloadLorebooks(), reloadPersonas()]);
    const handleRecovery = async strategy => {
      if (isRecovering || !backupRestoreService?.recover) return;
      setIsRecovering(true);
      try {
        await backupRestoreService.recover({
          strategy,
          journalId: pendingRecovery?.id
        });
        await reloadAllCatalogs();
        await refreshPendingRecovery();
        const successMessage = strategy === "retry-settings" ? "Đã áp dụng lại cài đặt thành công." : strategy === "rollback-idb" ? "Đã hoàn tác dữ liệu IndexedDB về trạng thái trước khôi phục." : "Đã đóng cảnh báo phục hồi.";
        showToast(successMessage, "success");
      } catch (error) {
        console.error("Backup Recovery Failed:", error);
        await refreshPendingRecovery();
        showToast(`Lỗi phục hồi: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsRecovering(false);
      }
    };
    const handleBackup = async () => {
      setIsBackingUp(true);
      try {
        const backupFile = await (async () => {
          try {
            const {
              characters,
              presets,
              lorebooks,
              personas,
              chatSessions
            } = await repositories.exportRecords();
            const appSettings = (() => {
              const collected = {};
              let totalSize = 0;
              backupSettingKeys.forEach(key => {
                const value = readBackupSetting(key, backupStorage);
                if (value !== null && value.length <= 5e6 && totalSize + value.length <= 5e7) {
                  collected[key] = value;
                  totalSize += value.length;
                }
              });
              let prefixedCount = 0;
              for (let index = 0; index < localStorage.length && prefixedCount < 1e3; index++) {
                const key = localStorage.key(index);
                if (!key?.startsWith(cardRuntimeStoragePrefix) || collected[key] !== undefined) continue;
                const value = localStorage.getItem(key);
                if (value === null || value.length > 5e6 || totalSize + value.length > 5e7) continue;
                collected[key] = value;
                totalSize += value.length;
                prefixedCount++;
              }
              return collected;
            })();
            const exportedCharacters = [];
            for (const character of characters) {
              exportedCharacters.push({
                card: character.card,
                fileName: character.fileName,
                avatarBase64: character.avatar ? await arrayBufferToBase64(character.avatar.buffer) : undefined,
                avatarType: character.avatar?.type
              });
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            const payload = {
              version: 1,
              timestamp: Date.now(),
              dataType: "full_system_backup",
              meta: {
                exportedBy: "AI Studio Card Tool",
                description: `Full System Backup - ${new Date().toLocaleString()}`
              },
              data: {
                characters: exportedCharacters,
                presets,
                lorebooks,
                personas,
                chatSessions,
                appSettings
              }
            };
            const jsonText = JSON.stringify(payload);
            const fileName = `FullBackup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
            return new File([jsonText], fileName, {
              type: "application/json"
            });
          } catch (error) {
            console.error("Full Backup Failed:", error);
            throw Error(`Lỗi sao lưu toàn bộ: ${error instanceof Error ? error.message : String(error)}`);
          }
        })();
        if (navigator.canShare && navigator.canShare({
          files: [backupFile]
        })) {
          try {
            await navigator.share({
              files: [backupFile],
              title: "SillyTavern Card Studio Backup",
              text: "Full system backup file."
            });
            showToast("Đã mở menu chia sẻ!", "success");
          } catch (shareError) {
            if (shareError.name !== "AbortError") downloadBackupFile(backupFile);
          }
        } else {
          downloadBackupFile(backupFile);
        }
      } catch (error) {
        showToast(`Lỗi sao lưu: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsBackingUp(false);
      }
    };
    const handleRestoreFileChange = async event => {
      if (!event.target.files || event.target.files.length === 0) return;
      const selectedFile = event.target.files[0];
      setIsRestoring(true);
      try {
        await (async file => {
          try {
            if (!file.size) throw Error("Tệp sao lưu trống.");
            if (file.size > 2e8) throw Error("Tệp sao lưu vượt quá giới hạn 200 MB.");
            const rawBackup = await new Response(file).json();
            if (!backupRestoreService || typeof backupRestoreService.restore !== "function") {
              throw Error("Dịch vụ khôi phục dữ liệu không khả dụng.");
            }
            try {
              await backupRestoreService.restore(rawBackup);
            } catch (error) {
              await refreshPendingRecovery();
              if (error?.idbCommitted) await reloadAllCatalogs();
              throw error;
            }
          } catch (error) {
            console.error("Full Restore Failed:", error);
            throw Error(`Lỗi khôi phục toàn bộ: ${error instanceof Error ? error.message : String(error)}`);
          }
        })(selectedFile);
        await refreshPendingRecovery();
        await reloadAllCatalogs();
        showToast("Khôi phục thành công! Dữ liệu đã được cập nhật.", "success");
      } catch (error) {
        console.error(error);
        showToast(`Lỗi khôi phục: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        event.target.value = "";
        setIsRestoring(false);
      }
    };
    const handleCleanup = async () => {
      if (!window.confirm("Bạn có chắc chắn muốn dọn dẹp dữ liệu rác? Thao tác này sẽ xóa vĩnh viễn các nhật ký gỡ lỗi (logs) và dữ liệu chuẩn đoán trong tất cả cuộc trò chuyện để giảm dung lượng bộ nhớ. Lịch sử chat chính vẫn được giữ nguyên.")) {
        return;
      }
      setIsCleaning(true);
      try {
        const result = await (async () => {
          try {
            const cleanupResult = await repositories.cleanupSessionDiagnostics();
            diagnosticsState.clearAll();
            return cleanupResult;
          } catch (error) {
            console.error("Cleanup Failed:", error);
            throw Error(`Lỗi dọn dẹp dữ liệu: ${error instanceof Error ? error.message : String(error)}`);
          }
        })();
        showToast(`Đã dọn dẹp xong ${result.sessionsCleaned} cuộc trò chuyện.`, "success");
      } catch (error) {
        showToast(`Lỗi dọn dẹp: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsCleaning(false);
      }
    };
    const recoveryActions = pendingRecovery?.availableActions || {
      canRetrySettings: false,
      canRollbackIdb: false,
      canDismiss: Boolean(pendingRecovery)
    };
    const showDismissButton = recoveryActions.canDismiss === true && recoveryActions.canRollbackIdb !== true;
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-8 ",
      children: [(0, jsxRuntime.jsx)("h2", {
        className: "text-xl font-bold text-sky-400 mb-2 border-b border-slate-700 pb-4",
        children: "Sao lưu & Khôi phục Hệ thống"
      }), pendingRecovery && (0, jsxRuntime.jsxs)("div", {
        role: "alert",
        className: "bg-amber-950/50 border border-amber-500/60 rounded-xl p-4 space-y-3",
        children: [(0, jsxRuntime.jsx)("h3", {
          className: "text-sm font-bold text-amber-300",
          children: "Phát hiện phiên khôi phục chưa hoàn tất"
        }), (0, jsxRuntime.jsx)("p", {
          className: "text-xs text-amber-100/90",
          children: "Dữ liệu IndexedDB đã được ghi nhưng phần cài đặt Web Storage chưa hoàn tất (hai kho lưu trữ không atomic). Chọn một hành động phục hồi khả dụng bên dưới."
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex flex-wrap gap-3",
          children: [recoveryActions.canRetrySettings === true && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("retry-settings"),
            className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Thử áp dụng lại cài đặt"
          }), recoveryActions.canRollbackIdb === true && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("rollback-idb"),
            className: "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Hoàn tác IndexedDB"
          }), showDismissButton && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("dismiss"),
            className: "px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Đóng cảnh báo"
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-1 md:grid-cols-2 gap-8",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-sky-500/50 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "w-16 h-16 bg-sky-900/30 text-sky-400 rounded-full flex items-center justify-center mb-4 text-3xl",
            children: "📤"
          }), (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-2",
            children: "Sao Lưu Toàn Bộ"
          }), (0, jsxRuntime.jsx)("p", {
            className: "text-xs text-amber-300/90",
            children: "Tệp sao lưu có thể chứa khóa API và mật khẩu proxy. Hãy giữ tệp ở nơi riêng tư."
          }), (0, jsxRuntime.jsx)("button", {
            onClick: handleBackup,
            disabled: isBackingUp,
            className: "w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-900/20  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4",
            children: isBackingUp ? (0, jsxRuntime.jsx)(LoadingIndicator, {
              message: "Đang xử lý..."
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
                  clipRule: "evenodd"
                })
              }), "Sao Lưu Ngay"]
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-emerald-500/50 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "w-16 h-16 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mb-4 text-3xl",
            children: "📥"
          }), (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-2",
            children: "Khôi Phục Dữ Liệu"
          }), (0, jsxRuntime.jsx)("input", {
            ref: fileInputRef,
            type: "file",
            "aria-label": "Chọn tệp khôi phục",
            accept: ".json",
            onChange: handleRestoreFileChange,
            className: "hidden"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => !isRestoring && fileInputRef.current?.click(),
            disabled: isRestoring,
            className: "w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4",
            children: isRestoring ? (0, jsxRuntime.jsx)(LoadingIndicator, {
              message: "Đang xử lý..."
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
                  clipRule: "evenodd"
                })
              }), "Chọn Tệp Khôi Phục"]
            })
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6 hover:border-orange-500/50 ",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "w-16 h-16 bg-orange-900/30 text-orange-400 rounded-full flex items-center justify-center text-3xl shrink-0",
          children: "🧹"
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex-grow text-center md:text-left",
          children: (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-1",
            children: "Dọn Dẹp Hệ Thống (Optimize)"
          })
        }), (0, jsxRuntime.jsx)("button", {
          onClick: handleCleanup,
          disabled: isCleaning,
          className: "w-full md:w-auto py-3 px-8 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
          children: isCleaning ? (0, jsxRuntime.jsx)(LoadingIndicator, {
            message: "Đang dọn..."
          }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
            children: [(0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z",
                clipRule: "evenodd"
              })
            }), "Dọn Dẹp Ngay"]
          })
        })]
      })]
    });
  };
}
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
    } = resolveSettingsScreenDeps(getDependencies);
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
export function createSettingsScreen(getDependencies) {
  return function SettingsScreen() {
    const {
      SmartContextSettings,
      ActionSuggestionSettings,
      ConnectionSettingsScreen,
      BackupSettings,
      SmartScanSettings,
      SpeechSettings,
      CardRuntimeSettings,
      react,
      SettingsTab,
      LiterarySettings,
      PersonaScreen,
      jsxRuntime
    } = resolveSettingsScreenDeps(getDependencies);
    let [activeTab, setActiveTab] = (0, react.useState)("persona");
    return (0, jsxRuntime.jsxs)("div", {
      className: "settings-shell max-w-7xl mx-auto",
      children: [(0, jsxRuntime.jsx)("div", {
        role: "tablist",
        "aria-label": "Mục cài đặt",
        className: "settings-nav",
        children: (0, jsxRuntime.jsxs)("div", {
          className: "settings-nav-list p-2 bg-slate-800 rounded-xl border border-slate-700",
          children: [(0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "persona",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Hồ sơ Người dùng"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "api",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Thiết lập API"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "backup",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Sao lưu & Khôi phục"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "html",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Thẻ HTML"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "actions",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Gợi ý Hành động"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "writing",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Cải thiện Cốt truyện"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "tts",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Giọng nói (TTS)"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "context",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Ngữ cảnh & Bộ nhớ"
          }), (0, jsxRuntime.jsx)(SettingsTab, {
            tabId: "smartscan",
            currentTab: activeTab,
            onClick: setActiveTab,
            children: "Quét Thông Minh"
          })]
        })
      }), (0, jsxRuntime.jsxs)("div", {
        id: `settings-subtabpanel-${activeTab}`,
        role: "tabpanel",
        "aria-labelledby": `settings-subtab-${activeTab}`,
        className: "settings-content focus:outline-none",
        tabIndex: 0,
        children: ["persona" === activeTab && (0, jsxRuntime.jsx)(PersonaScreen, {}), "api" === activeTab && (0, jsxRuntime.jsx)(ConnectionSettingsScreen, {}), "backup" === activeTab && (0, jsxRuntime.jsx)(BackupSettings, {}), "html" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-3xl mx-auto",
          children: (0, jsxRuntime.jsx)(CardRuntimeSettings, {})
        }), "actions" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto",
          children: (0, jsxRuntime.jsx)(ActionSuggestionSettings, {})
        }), "writing" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto",
          children: (0, jsxRuntime.jsx)(LiterarySettings, {})
        }), "tts" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto",
          children: (0, jsxRuntime.jsx)(SpeechSettings, {})
        }), "smartscan" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto",
          children: (0, jsxRuntime.jsx)(SmartScanSettings, {})
        }), "context" === activeTab && (0, jsxRuntime.jsx)("div", {
          className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-4xl mx-auto",
          children: (0, jsxRuntime.jsx)(SmartContextSettings, {})
        })]
      })]
    });
  };
}
