import { modelTestProps } from './model-test-props.js';
// Provider-specific render helpers. These are pure render functions, not mounted components.
// Preserve the previous element tree and hook ownership in the screen controller.
export function renderOpenRouterSection({ LoadingIndicator, SearchableSelect, ToggleSwitch, modelTest, filteredOpenRouterModels, freeOnly, jsxRuntime, keyChecking, keyStatus, loadOpenRouterModels, openRouterKey, openRouterLoading, openRouterModels, request, setFreeOnly, setKeyChecking, setKeyStatus, setOpenRouterKey, settings, updateSetting }) { return jsxRuntime.jsxs("div", {
    className: "space-y-6 ", children: [jsxRuntime.jsxs("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700", children: [jsxRuntime.jsx("label", {
                    className: "block text-sm font-bold text-indigo-300 mb-2", children: "Mô hình OpenRouter"
                }), openRouterLoading ? jsxRuntime.jsx(LoadingIndicator, {
                    message: "Đang tải danh sách..."
                }) : jsxRuntime.jsxs("div", {
                    className: "flex gap-2", children: [jsxRuntime.jsx("div", {
                            className: "flex-grow", children: jsxRuntime.jsx(SearchableSelect, {
                                ariaLabel: "Mô hình OpenRouter", options: filteredOpenRouterModels.map(model => ({
                                    value: model.id, label: `${model.name} (${"0" === model.pricing.prompt ? "Free" : "$"})`
                                })), value: settings.openrouter_model, ...modelTestProps(modelTest, "openrouter", settings.openrouter_model), onChange: event => updateSetting("openrouter_model", event.target.value), placeholder: "Chọn mô hình..."
                            })
                        }), jsxRuntime.jsx("button", {
                            onClick: loadOpenRouterModels, className: "px-3 bg-slate-700 rounded hover:bg-slate-600 text-slate-300", title: "Tải lại danh sách", "aria-label": "Tải lại danh sách mô hình", children: "↻"
                        })]
                }), jsxRuntime.jsx("div", {
                    className: "mt-2", children: jsxRuntime.jsx(ToggleSwitch, {
                        label: "Chỉ hiện model miễn phí", checked: freeOnly, onChange: setFreeOnly
                    })
                })]
        }), jsxRuntime.jsxs("div", {
            children: [jsxRuntime.jsx("h4", {
                    className: "font-bold text-slate-300 mb-3", children: "API Key (OpenRouter)"
                }), jsxRuntime.jsxs("div", {
                    className: "flex gap-2", children: [jsxRuntime.jsx("input", {
                            type: "password", "aria-label": "API Key OpenRouter", value: openRouterKey, onChange: event => setOpenRouterKey(event.target.value), className: "flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white", placeholder: "sk-or-..."
                        }), jsxRuntime.jsx("button", {
                            onClick: async () => { if (openRouterKey) {
                                setKeyChecking(!0), setKeyStatus("idle");
                                try {
                                    await async function (apiKey) { if (!(await request("https://openrouter.ai/api/v1/auth/key", {
                                        method: "GET", headers: {
                                            Authorization: `Bearer ${apiKey}`
                                        }
                                    })).ok)
                                        throw Error("Invalid API Key"); return !0; }(openRouterKey), setKeyStatus("success"), 0 === openRouterModels.length && loadOpenRouterModels();
                                }
                                catch {
                                    setKeyStatus("error");
                                }
                                finally {
                                    setKeyChecking(!1);
                                }
                            } }, disabled: keyChecking, className: "px-4 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:bg-slate-600", children: keyChecking ? "..." : "Check"
                        })]
                }), "success" === keyStatus && jsxRuntime.jsx("p", {
                    className: "text-xs text-green-400 mt-1", children: "Key hợp lệ."
                }), "error" === keyStatus && jsxRuntime.jsx("p", {
                    className: "text-xs text-red-400 mt-1", children: "Key không hợp lệ."
                })]
        })]
}); }
