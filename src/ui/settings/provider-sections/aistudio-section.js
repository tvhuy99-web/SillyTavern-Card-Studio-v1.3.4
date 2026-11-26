import { openAiStudioSession } from '../../../providers/aistudio/text.js';
import { modelTestProps } from './model-test-props.js';
// Provider-specific render helpers. These are pure render functions, not mounted components.
// Preserve the previous element tree and hook ownership in the screen controller.
export function renderAiStudioSection({ ModelSelect, modelTest, aiStudioLoading, aiStudioModels, aiStudioStatus, aiStudioVisible, aiStudioVisibilityBusy, changeAiStudioVisibility, loadAiStudioModels, clearAiStudioModels, defaultGeminiModels, jsxRuntime, settings, showToast, updateSetting }) { return jsxRuntime.jsxs("div", {
    className: "space-y-4", children: [jsxRuntime.jsxs("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-600 space-y-4", children: [jsxRuntime.jsxs("div", {
                    className: "flex flex-wrap justify-between gap-3 items-center", children: [jsxRuntime.jsx("div", {
                            className: "font-bold text-sky-300", children: "Mô hình Google AI Studio"
                        }), jsxRuntime.jsxs("div", {
                            className: "flex flex-wrap gap-2", children: [jsxRuntime.jsx("button", {
                                    type: "button", disabled: aiStudioLoading, onClick: loadAiStudioModels, className: "rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-50 px-3 py-2 text-sm text-white", children: aiStudioLoading ? "Đang tải..." : "Tải danh sách Model"
                                }), jsxRuntime.jsx("button", {
                                    type: "button", disabled: aiStudioLoading, onClick: clearAiStudioModels, className: "rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm text-white", children: "Xóa danh sách"
                                })]
                        })]
                }), jsxRuntime.jsxs("div", {
                    className: "grid grid-cols-1 gap-4", children: [jsxRuntime.jsx(ModelSelect, {
                            provider: "aistudio", label: "Chat Model ID", value: settings.aistudio_model ?? "default", ...modelTestProps(modelTest, "aistudio", settings.aistudio_model ?? "default"), onChange: modelId => updateSetting("aistudio_model", modelId), options: Array.from(new Map([{
                                    id: "default", name: "Mặc định theo trang web (AI Studio)"
                                }, {
                                    id: "gemini-2.5-flash", name: "Gemini 2.5 Flash"
                                }, {
                                    id: "gemini-2.5-pro", name: "Gemini 2.5 Pro"
                                }, ...defaultGeminiModels, ...aiStudioModels].filter(model => model && model.id).map(model => [model.id, model])).values())
                        }), jsxRuntime.jsx(ModelSelect, {
                            provider: "aistudio", label: "Tool Model ID", value: settings.aistudio_tool_model ?? "default", ...modelTestProps(modelTest, "aistudio", settings.aistudio_tool_model ?? "default"), onChange: modelId => updateSetting("aistudio_tool_model", modelId), options: Array.from(new Map([{
                                    id: "default", name: "Mặc định theo trang web (AI Studio)"
                                }, {
                                    id: "gemini-2.5-flash", name: "Gemini 2.5 Flash"
                                }, {
                                    id: "gemini-2.5-pro", name: "Gemini 2.5 Pro"
                                }, ...defaultGeminiModels, ...aiStudioModels].filter(model => model && model.id).map(model => [model.id, model])).values())
                        })]
                }), jsxRuntime.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [jsxRuntime.jsxs("label", {
                            className: "text-sm text-indigo-200 block", children: [jsxRuntime.jsx("span", {
                                    className: "block mb-2 font-bold", children: "Mức suy nghĩ Chat"
                                }), jsxRuntime.jsxs("select", {
                                    "aria-label": "Mức suy nghĩ Chat", className: "w-full rounded bg-slate-800 border border-slate-600 p-2 text-white", value: settings.aistudio_thinking || "default", onChange: event => updateSetting("aistudio_thinking", event.target.value), children: [jsxRuntime.jsx("option", {
                                            value: "default", children: "Mặc định theo trang web (AI Studio)"
                                        }), jsxRuntime.jsx("option", {
                                            value: "minimal", children: "Tối thiểu"
                                        }), jsxRuntime.jsx("option", {
                                            value: "low", children: "Thấp"
                                        }), jsxRuntime.jsx("option", {
                                            value: "medium", children: "Trung bình"
                                        }), jsxRuntime.jsx("option", {
                                            value: "high", children: "Cao"
                                        })]
                                })]
                        }), jsxRuntime.jsxs("label", {
                            className: "text-sm text-indigo-200 block", children: [jsxRuntime.jsx("span", {
                                    className: "block mb-2 font-bold", children: "Mức suy nghĩ Tool"
                                }), jsxRuntime.jsxs("select", {
                                    "aria-label": "Mức suy nghĩ Tool", className: "w-full rounded bg-slate-800 border border-slate-600 p-2 text-white", value: settings.aistudio_tool_thinking || "default", onChange: event => updateSetting("aistudio_tool_thinking", event.target.value), children: [jsxRuntime.jsx("option", {
                                            value: "default", children: "Mặc định theo trang web (AI Studio)"
                                        }), jsxRuntime.jsx("option", {
                                            value: "minimal", children: "Tối thiểu"
                                        }), jsxRuntime.jsx("option", {
                                            value: "low", children: "Thấp"
                                        }), jsxRuntime.jsx("option", {
                                            value: "medium", children: "Trung bình"
                                        }), jsxRuntime.jsx("option", {
                                            value: "high", children: "Cao"
                                        })]
                                })]
                        })]
                }), jsxRuntime.jsx("p", {
                    className: "text-xs text-amber-200", children: "Các mức suy nghĩ phụ thuộc model và giao diện Google AI Studio. Nếu không áp dụng được, ứng dụng sẽ báo lỗi thay vì lặng lẽ bỏ qua."
                }), ...(aiStudioStatus ? [jsxRuntime.jsxs("div", {
                    'data-sts-aistudio-model-status': true, role: 'status', 'aria-live': 'polite',
                    className: 'p-3 rounded-lg border border-slate-500 bg-slate-900 text-sm whitespace-pre-wrap break-words',
                    children: [jsxRuntime.jsx('strong', { className: aiStudioStatus.kind === 'error' ? 'text-rose-300' : aiStudioStatus.kind === 'success' ? 'text-green-300' : '', children: aiStudioStatus.message }), jsxRuntime.jsx('div', {className:'mt-1',children:aiStudioStatus.detail})]
                })] : [])]
        }), jsxRuntime.jsxs("label", {
            className: "flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/60 p-3 cursor-pointer", children: [jsxRuntime.jsx("input", {
                    type: "checkbox", checked: aiStudioVisible, disabled: aiStudioVisibilityBusy, onChange: event => changeAiStudioVisibility(event.target.checked), className: "h-5 w-5 accent-indigo-500", "aria-label": "Hiển thị trang web AI Studio"
                }), jsxRuntime.jsx("span", {
                    className: "text-sm text-white font-semibold", children: "Hiển thị trang web AI Studio"
                })]
        }), jsxRuntime.jsx("button", {
            type: "button", onClick: async () => { try {
                await openAiStudioSession();
            }
            catch (error) {
                showToast("AI Studio: " + (error?.message || String(error)), "error");
            } }, className: "bg-indigo-600 hover:bg-indigo-500 text-white rounded px-4 py-2", children: "Mở Google / AI Studio để đăng nhập"
        })]
}); }
