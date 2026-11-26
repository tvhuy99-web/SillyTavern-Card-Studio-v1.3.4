import { modelTestProps } from './model-test-props.js';
// Provider-specific render helpers. These are pure render functions, not mounted components.
// Preserve the previous element tree and hook ownership in the screen controller.
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
