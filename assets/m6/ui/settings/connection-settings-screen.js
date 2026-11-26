import { buildProbeTarget, createModelTestButton } from './model-test-button.js';
import { useConnectionSettings } from './settings-controller.js';
import { renderGeminiSection, renderOpenRouterSection, renderAiStudioSection, renderProxySection } from './provider-sections.js';
// Transitional React factory: the legacy host supplies its existing React instance and bindings lazily.
export function createConnectionSettingsScreen(jsxRuntime, react, getDependencies) {
    const ModelTestButton = createModelTestButton(jsxRuntime, react);
    return function ConnectionSettingsScreen() {
        const dependencies = getDependencies();
        const { LoadingIndicator, ModelSelect, SearchableSelect, TextInput, ToggleSwitch, connections, defaultGeminiModels, proxyPersistence, request, saveProfiles } = dependencies;
        const { showToast, settings, setSettings, useDefaultGeminiKey, setUseDefaultGeminiKey, geminiKeysText, setGeminiKeysText, openRouterKey, setOpenRouterKey, openRouterModels, openRouterLoading, freeOnly, setFreeOnly, proxyUrl, setProxyUrl, proxyPassword, setProxyPassword, legacyMode, setLegacyMode, proxyForTools, setProxyForTools, pingLoading, pingStatus, pingError, setProxyModels, proxyLoading, profiles, setProfiles, profileId, setProfileId, profileFileRef, saveStatus, keyChecking, setKeyChecking, keyStatus, setKeyStatus, geminiModels, geminiLoading, refreshGeminiModels, updateSetting, loadOpenRouterModels, filteredOpenRouterModels, selectProfile, createProfile, proxyModelOptions, aiStudioModels, aiStudioLoading, rememberProxySecrets, setRememberProxySecrets, loadProxyModels, applySettings, clearProxyCatalog, invalidateProxyCatalog, pingProxy, loadAiStudioModels, clearAiStudioModels, aiStudioStatus, aiStudioVisible, aiStudioVisibilityBusy, changeAiStudioVisibility } = useConnectionSettings({
            ...dependencies, react
        });
        const modelTest = (provider, model) => dependencies.testModel ? jsxRuntime.jsx(ModelTestButton, {
            target: buildProbeTarget({ provider, model, useDefaultGeminiKey, geminiKeysText, openRouterKey, proxy: { url: proxyUrl, password: proxyPassword, legacyMode, protocol: settings.proxy_protocol }, connections }),
            testModel: dependencies.testModel, notify: showToast,
        }) : undefined;
        return jsxRuntime.jsxs("div", {
            className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-8", children: [jsxRuntime.jsxs("div", {
                    children: [jsxRuntime.jsx("h2", {
                            className: "text-xl font-bold text-sky-400 mb-4", children: "1. Chọn Nguồn Kết Nối (API Source)"
                        }), jsxRuntime.jsxs("select", {
                            value: settings.source, onChange: e => updateSetting("source", e.target.value), "aria-label": "Nhà cung cấp AI", className: "w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-sky-500 outline-none", children: [jsxRuntime.jsx("option", {
                                    value: "gemini", children: "Google Gemini"
                                }), jsxRuntime.jsx("option", {
                                    value: "openrouter", children: "OpenRouter"
                                }), jsxRuntime.jsx("option", {
                                    value: "proxy", children: "Reverse Proxy"
                                }), jsxRuntime.jsx("option", {
                                    value: "aistudio", children: "Tài khoản Google / AI Studio"
                                })]
                        })]
                }), jsxRuntime.jsx("div", {
                    className: "border-t border-slate-700"
                }), jsxRuntime.jsxs("div", {
                    children: [jsxRuntime.jsx("h3", {
                            className: "text-xl font-bold text-sky-400 mb-4", children: "2. Cấu hình Chi tiết"
                        }), "gemini" === settings.source && renderGeminiSection({
                            LoadingIndicator, SearchableSelect, ToggleSwitch, modelTest, connections, geminiKeysText, geminiLoading, geminiModels, jsxRuntime, refreshGeminiModels, setGeminiKeysText, setUseDefaultGeminiKey, settings, showToast, updateSetting, useDefaultGeminiKey
                        }), "openrouter" === settings.source && renderOpenRouterSection({
                            LoadingIndicator, SearchableSelect, ToggleSwitch, modelTest, filteredOpenRouterModels, freeOnly, jsxRuntime, keyChecking, keyStatus, loadOpenRouterModels, openRouterKey, openRouterLoading, openRouterModels, request, setFreeOnly, setKeyChecking, setKeyStatus, setOpenRouterKey, settings, updateSetting
                        }), "aistudio" === settings.source && renderAiStudioSection({
                            ModelSelect, modelTest, aiStudioLoading, aiStudioModels, aiStudioStatus, aiStudioVisible, aiStudioVisibilityBusy, changeAiStudioVisibility, loadAiStudioModels, clearAiStudioModels, defaultGeminiModels, jsxRuntime, settings, showToast, updateSetting
                        }), "proxy" === settings.source && renderProxySection({
                            LoadingIndicator, ModelSelect, TextInput, ToggleSwitch, modelTest, createProfile, loadProxyModels, clearProxyCatalog, invalidateProxyCatalog, pingProxy, jsxRuntime, legacyMode, pingError, pingLoading, pingStatus, profileFileRef, profileId, profiles, proxyForTools, proxyLoading, proxyModelOptions, proxyPassword, proxyPersistence, proxyUrl, rememberProxySecrets, saveProfiles, selectProfile, setLegacyMode, setProfileId, setProfiles, setProxyForTools, setProxyModels, setProxyPassword, setProxyUrl, setRememberProxySecrets, setSettings, settings, showToast, updateSetting
                        })]
                }), jsxRuntime.jsxs("div", {
                    className: "border-t border-slate-700 pt-6", children: [jsxRuntime.jsx("h3", {
                            className: "text-xl font-bold text-sky-400 mb-4", children: "3. Cấu hình Nâng cao"
                        }), jsxRuntime.jsxs("div", {
                            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4", children: [jsxRuntime.jsx(ToggleSwitch, {
                                    label: "Tự động Kết nối Trực tiếp (Direct Fetch Bypass)", checked: settings.directFetchBypass ?? !0, onChange: e => updateSetting("directFetchBypass", e)
                                }), jsxRuntime.jsx("p", {
                                    className: "text-xs text-slate-400 ml-8", children: "Bỏ qua máy chủ trung gian (proxy) đối với các API an toàn (như Google, OpenRouter) để tối ưu tốc độ và tránh lỗi timeout. Tắt chế độ này có thể giải quyết các vấn đề CORS trên một số trình duyệt, nhưng tăng nguy cơ lỗi Timeout."
                                })]
                        })]
                }), jsxRuntime.jsxs("div", {
                    className: "flex justify-end items-center gap-4 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/90 p-2  rounded-b-xl", children: ["saved" === saveStatus && jsxRuntime.jsx("span", {
                            className: "text-sm text-green-400 font-bold ", children: "Đã lưu!"
                        }), "error" === saveStatus && jsxRuntime.jsx("span", {
                            className: "text-sm text-red-400 font-bold", children: "Lỗi khi lưu!"
                        }), jsxRuntime.jsx("button", {
                            onClick: applySettings, className: "bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-lg  active:scale-95 shadow-lg shadow-sky-900/30", children: "Áp Dụng"
                        })]
                })]
        });
    };
}
