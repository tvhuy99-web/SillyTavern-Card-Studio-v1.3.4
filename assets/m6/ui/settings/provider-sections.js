import { openAiStudioSession } from '../../../m4/providers/aistudio/text.js';
const modelTestProps = (modelTest, provider, model) => {
    const button = modelTest?.(provider, model);
    return button ? { testButton: button } : {};
};
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
export function renderProxySection({ LoadingIndicator, ModelSelect, TextInput, ToggleSwitch, modelTest, createProfile, loadProxyModels, clearProxyCatalog, invalidateProxyCatalog, pingProxy, jsxRuntime, legacyMode, pingError, pingLoading, pingStatus, profileFileRef, profileId, profiles, proxyForTools, proxyLoading, proxyModelOptions, proxyPassword, proxyPersistence, proxyUrl, rememberProxySecrets, saveProfiles, selectProfile, setLegacyMode, setProfileId, setProfiles, setProxyForTools, setProxyModels, setProxyPassword, setProxyUrl, setRememberProxySecrets, setSettings, settings, showToast, updateSetting }) { return jsxRuntime.jsxs("div", {
    className: "space-y-6 ", children: [jsxRuntime.jsxs("div", {
            className: "bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col gap-3", children: [jsxRuntime.jsxs("div", {
                    className: "flex items-center justify-between", children: [jsxRuntime.jsx("label", {
                            className: "text-xs font-bold text-slate-400 uppercase tracking-wide", children: "Quản lý Cấu hình (Profile)"
                        }), jsxRuntime.jsxs("div", {
                            className: "flex gap-2", children: [jsxRuntime.jsx("input", {
                                    type: "file", "aria-label": "Nhập cấu hình proxy JSON", ref: profileFileRef, accept: ".json", className: "hidden", onChange: event => { let file = event.target.files?.[0]; if (!file)
                                        return; let reader = new FileReader; reader.onload = loadEvent => { try {
                                        let parsedProfiles = JSON.parse(loadEvent.target?.result);
                                        if (Array.isArray(parsedProfiles)) {
                                            let importedProfiles = parsedProfiles.map(profile => ({
                                                ...profile, id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                                            })), updatedProfiles = [...profiles, ...importedProfiles];
                                            saveProfiles(updatedProfiles), setProfiles(updatedProfiles), showToast(`Đã nhập ${importedProfiles.length} cấu hình.`, "success");
                                        }
                                        else
                                            showToast("File không hợp lệ.", "error");
                                    }
                                    catch {
                                        showToast("Lỗi nhập file JSON.", "error");
                                    } }, reader.readAsText(file), event.target.value = ""; }
                                }), jsxRuntime.jsx("button", {
                                    onClick: () => profileFileRef.current?.click(), className: "text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300", title: "Nhập Profile", children: "Nhập"
                                }), jsxRuntime.jsx("button", {
                                    onClick: () => { if (0 === profiles.length)
                                        return void showToast("Không có cấu hình nào để xuất.", "warning"); let downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2)), anchor = document.createElement("a"); anchor.href = downloadUrl, anchor.download = `ProxyProfiles_${Date.now()}.json`, document.body.appendChild(anchor), anchor.click(), document.body.removeChild(anchor); }, className: "text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300", title: "Xuất Profile", children: "Xuất"
                                })]
                        })]
                }), jsxRuntime.jsxs("div", {
                    className: "flex gap-2 items-center", children: [jsxRuntime.jsxs("select", {
                            "aria-label": "Cấu hình proxy", value: profileId, onChange: event => selectProfile(event.target.value), className: "flex-grow bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white", children: [jsxRuntime.jsx("option", {
                                    value: "", children: "-- Chọn cấu hình --"
                                }), profiles.map(profile => jsxRuntime.jsx("option", {
                                    value: profile.id, children: profile.name
                                }, profile.id))]
                        }), jsxRuntime.jsx("button", {
                            onClick: () => { if (!profileId)
                                return void createProfile(); let updatedProfiles = profiles.map(profile => profile.id === profileId ? {
                                ...profile, url: proxyUrl, password: proxyPassword, legacyMode: legacyMode, proxyForTools: proxyForTools, protocol: settings.proxy_protocol, chatModel: settings.proxy_model, toolModel: settings.proxy_tool_model
                            } : profile); try { saveProfiles(updatedProfiles); setProfiles(updatedProfiles); showToast("Đã cập nhật cấu hình hiện tại.", "success"); } catch { showToast("Không thể lưu Profile.", "error"); } }, className: "px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm font-bold", title: "Lưu thay đổi vào Profile hiện tại", children: "Lưu"
                        }), jsxRuntime.jsx("button", {
                            onClick: createProfile, className: "px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold", title: "Tạo Profile mới từ cài đặt hiện tại", children: "+"
                        }), jsxRuntime.jsx("button", {
                            onClick: () => { if (!profileId || !confirm("Bạn có chắc chắn muốn xóa cấu hình này không?"))
                                return; let remainingProfiles = profiles.filter(profile => profile.id !== profileId); try { saveProfiles(remainingProfiles); } catch { showToast("Không thể xóa Profile.", "error"); return; } setProfiles(remainingProfiles), setProfileId(""), setSettings(previousSettings => ({
                                ...previousSettings, proxy_profile_id: ""
                            })), showToast("Đã xóa cấu hình.", "info"); }, disabled: !profileId, className: "px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded text-sm font-bold disabled:opacity-50", title: "Xóa Profile", children: "✕"
                        })]
                })]
        }), jsxRuntime.jsxs("div", {
            className: "space-y-4 border border-slate-700 p-4 rounded-lg bg-slate-900/30", children: [jsxRuntime.jsxs("div", {
                    children: [jsxRuntime.jsx("label", {
                            className: "block text-sm font-medium text-slate-300 mb-1", children: "Proxy URL"
                        }), jsxRuntime.jsxs("div", {
                            className: "flex gap-2", children: [jsxRuntime.jsx("input", {
                                    type: "text", "aria-label": "Proxy URL", value: proxyUrl, onChange: event => { invalidateProxyCatalog(); if (event.target.value.trim() !== proxyUrl.trim()) setProxyPassword(''); setProxyUrl(event.target.value); }, className: "flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white font-mono text-sm", placeholder: "http://127.0.0.1:8889"
                                }), jsxRuntime.jsx("button", {
                                    onClick: loadProxyModels, disabled: proxyLoading, className: "px-3 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center justify-center", title: "Tải danh sách Model từ Proxy", children: proxyLoading ? jsxRuntime.jsx(LoadingIndicator, {
                                        message: ""
                                    }) : jsxRuntime.jsx("svg", {
                                        "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: jsxRuntime.jsx("path", {
                                            fillRule: "evenodd", d: "M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z", clipRule: "evenodd"
                                        })
                                    })
                                }), jsxRuntime.jsx("button", {
                                    onClick: () => { window.confirm("Bạn có chắc muốn xoá toàn bộ Models đã lưu cho máy chủ này? Lần kết nối tới (hoặc nhấn nút tải bên cạnh) sẽ tải lại danh sách mới.") && (clearProxyCatalog(), setProxyModels([]), showToast("Đã xoá danh sách Models lưu trữ.", "success")); }, className: "px-3 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 flex items-center justify-center border border-red-900/50", title: "Xoá Models lưu cục bộ (kể cả Model nhập tay)", children: jsxRuntime.jsx("svg", {
                                        xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: jsxRuntime.jsx("path", {
                                            fillRule: "evenodd", d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z", clipRule: "evenodd"
                                        })
                                    })
                                }), jsxRuntime.jsx("button", {
                                    onClick: pingProxy, disabled: pingLoading, className: "px-4 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:bg-slate-600", children: "Ping"
                                })]
                        }), "success" === pingStatus && jsxRuntime.jsx("p", {
                            className: "text-xs text-green-400 mt-1", children: "Kết nối OK."
                        }), "error" === pingStatus && jsxRuntime.jsxs("p", {
                            className: "text-xs text-red-400 mt-1", children: ["Lỗi: ", pingError]
                        })]
                }), jsxRuntime.jsx(TextInput, {
                    label: "Password / Key", value: proxyPassword, onChange: event => { invalidateProxyCatalog(); setProxyPassword(event.target.value); }, type: "password"
                }), jsxRuntime.jsx(ToggleSwitch, {
                    label: "Ghi nhớ Password / Key trên thiết bị này", checked: rememberProxySecrets, onChange: remember => { try { proxyPersistence.setRememberSecrets(remember); setRememberProxySecrets(remember); } catch { showToast("Không thể lưu tùy chọn ghi nhớ Proxy.", "error"); } }
                }), jsxRuntime.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-4 pt-2", children: [jsxRuntime.jsx("div", {
                            children: jsxRuntime.jsx(ToggleSwitch, {
                                label: "Legacy Mode", checked: legacyMode, onChange: value => { invalidateProxyCatalog(); setLegacyMode(value); }
                            })
                        }), jsxRuntime.jsx("div", {
                            children: jsxRuntime.jsx(ToggleSwitch, {
                                label: "Proxy cho Tools", checked: proxyForTools, onChange: setProxyForTools
                            })
                        })]
                })]
        }), jsxRuntime.jsxs("div", {
            className: "bg-slate-900/50 p-4 rounded-lg border border-slate-700", children: [jsxRuntime.jsx("label", {
                    className: "block text-sm font-bold text-sky-400 mb-3", children: "Giao thức Proxy"
                }), jsxRuntime.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [jsxRuntime.jsxs("button", {
                            onClick: () => updateSetting("proxy_protocol", "openai"), "aria-pressed": "google_native" !== settings.proxy_protocol, className: "p-3 rounded-lg border text-sm flex items-center justify-center gap-2  " + ("google_native" === settings.proxy_protocol ? "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700" : "bg-indigo-600/30 border-indigo-500 text-indigo-200"), children: [jsxRuntime.jsx("span", {
                                    children: "🌐"
                                }), " Chuẩn OpenAI"]
                        }), jsxRuntime.jsxs("button", {
                            onClick: () => updateSetting("proxy_protocol", "google_native"), "aria-pressed": "google_native" === settings.proxy_protocol, className: "p-3 rounded-lg border text-sm flex items-center justify-center gap-2  " + ("google_native" === settings.proxy_protocol ? "bg-amber-600/30 border-amber-500 text-amber-200" : "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700"), children: [jsxRuntime.jsx("span", {
                                    children: "⚡"
                                }), " Google Native"]
                        })]
                })]
        }), jsxRuntime.jsxs("div", {
            className: "grid grid-cols-1 gap-4", children: [jsxRuntime.jsx(ModelSelect, {
                    provider: "proxy", label: "Chat Model ID", value: settings.proxy_model, ...modelTestProps(modelTest, "proxy", settings.proxy_model), onChange: modelId => updateSetting("proxy_model", modelId), options: proxyModelOptions
                }), jsxRuntime.jsx(ModelSelect, {
                    provider: "proxy", label: "Tool Model ID", value: settings.proxy_tool_model, ...modelTestProps(modelTest, "proxy", settings.proxy_tool_model), onChange: modelId => updateSetting("proxy_tool_model", modelId), options: proxyModelOptions
                })]
        })]
}); }
