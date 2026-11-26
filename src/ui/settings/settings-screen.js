
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
    } = getDependencies();
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
