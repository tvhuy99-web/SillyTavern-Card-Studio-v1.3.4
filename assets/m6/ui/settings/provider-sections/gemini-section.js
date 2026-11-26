import { modelTestProps } from './model-test-props.js';
// Provider-specific render helpers. These are pure render functions, not mounted components.
// Preserve the previous element tree and hook ownership in the screen controller.
export function renderGeminiSection({ LoadingIndicator, SearchableSelect, ToggleSwitch, modelTest, connections, geminiKeysText, geminiLoading, geminiModels, jsxRuntime, refreshGeminiModels, setGeminiKeysText, setUseDefaultGeminiKey, settings, showToast, updateSetting, useDefaultGeminiKey }) { return jsxRuntime.jsxs("div", {
    className: "space-y-6 ", children: [jsxRuntime.jsxs("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700", children: [jsxRuntime.jsx("label", {
                    className: "block text-sm font-bold text-indigo-300 mb-2", children: "Mô hình Chính"
                }), jsxRuntime.jsxs("div", {
                    className: "flex gap-2", children: [jsxRuntime.jsx("div", {
                            className: "flex-grow", children: jsxRuntime.jsx(SearchableSelect, {
                                ariaLabel: "Mô hình Chính", value: settings.gemini_model, ...modelTestProps(modelTest, "gemini", settings.gemini_model), onChange: event => updateSetting("gemini_model", event.target.value), options: geminiModels.map(model => ({
                                    value: model.id, label: model.name
                                }))
                            })
                        }), jsxRuntime.jsx("button", {
                            onClick: async () => { let apiKey = useDefaultGeminiKey ? connections.getGeminiCatalogKeyForEnvironment() : undefined; if (!useDefaultGeminiKey) {
                                let keys = geminiKeysText.split("\n").map(key => key.trim()).filter(key => "" !== key);
                                if (!(keys.length > 0))
                                    return void showToast("Vui lòng nhập API Key.", "warning");
                                apiKey = keys[0];
                            } try {
                                let models = await refreshGeminiModels(apiKey);
                                showToast(`Đã tải ${models.length} models từ Google Gemini.`, "success");
                            }
                            catch (error) {
                                showToast(`Lỗi tải models: ${error.message}`, "error");
                            } }, disabled: geminiLoading, className: "px-3 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center justify-center", title: "Tải danh sách Model từ Google Gemini", children: geminiLoading ? jsxRuntime.jsx(LoadingIndicator, {
                                message: ""
                            }) : jsxRuntime.jsx("svg", {
                                "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: jsxRuntime.jsx("path", {
                                    fillRule: "evenodd", d: "M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z", clipRule: "evenodd"
                                })
                            })
                        })]
                })]
        }), jsxRuntime.jsxs("div", {
            children: [jsxRuntime.jsx("h4", {
                    className: "font-bold text-slate-300 mb-3", children: "API Key (Gemini)"
                }), jsxRuntime.jsxs("div", {
                    className: "space-y-4 pl-2 border-l-2 border-slate-700", children: [jsxRuntime.jsx(ToggleSwitch, {
                            label: "Sử dụng API Key Mặc định (Environment)", checked: useDefaultGeminiKey, onChange: setUseDefaultGeminiKey
                        }), !useDefaultGeminiKey && jsxRuntime.jsx("textarea", {
                            "aria-label": "API Key Gemini", value: geminiKeysText, onChange: event => setGeminiKeysText(event.target.value), rows: 3, className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 font-mono text-xs", placeholder: "Nhập API Key cá nhân (Mỗi dòng 1 key)..."
                        })]
                })]
        })]
}); }
