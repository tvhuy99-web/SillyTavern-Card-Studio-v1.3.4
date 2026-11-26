// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

export function createPresetScreen(getDependencies) {
  return function PresetScreen() {
    const {
      FileNameDialog,
      PresetTab,
      react,
      presetStore,
      PromptManager,
      useToast,
      Icon,
      PresetConfiguration,
      LoadingIndicator,
      jsxRuntime,
      PresetNameDialog
    } = getDependencies();
    let {
      presets: presets,
      activePresetName: activePresetName,
      isLoading: isLoading,
      error: error,
      addPreset: addPreset,
      deleteActivePreset: deleteActivePreset,
      updateActivePreset: updateActivePreset,
      setActivePresetName: setActivePresetName,
      revertActivePreset: revertActivePreset,
      duplicatePreset: duplicatePreset,
      createPreset: createPreset,
      renamePreset: renamePreset
    } = presetStore();
    let [activeSubTab, setActiveSubTab] = react.useState("config");
    let [isExportDialogOpen, setIsExportDialogOpen] = (0, react.useState)(false);
    let [nameDialogState, setNameDialogState] = (0, react.useState)(null);
    let fileInputRef = (0, react.useRef)(null);
    let {
      showToast: showToast
    } = useToast();
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let filteredPresets = (0, react.useMemo)(() => {
      let query = searchQuery.trim().toLocaleLowerCase("vi");
      return query ? presets.filter(preset => preset.name.toLocaleLowerCase("vi").includes(query)) : presets;
    }, [presets, searchQuery]);
    let activePreset = presets.find(preset => preset.name === activePresetName) || null;
    return isLoading && 0 === presets.length ? (0, jsxRuntime.jsx)("div", {
      className: "flex justify-center items-center h-64",
      children: (0, jsxRuntime.jsx)(LoadingIndicator, {
        message: "Đang tải presets..."
      })
    }) : (0, jsxRuntime.jsxs)("div", {
      className: "workspace-grid grid grid-cols-1 md:grid-cols-3 gap-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "workspace-sidebar md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between",
          children: [(0, jsxRuntime.jsxs)("h2", {
            className: "text-lg font-bold text-slate-200",
            children: ["Preset", (0, jsxRuntime.jsx)("span", {
              className: "sidebar-count",
              children: presets.length
            })]
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => setNameDialogState("create"),
            className: "text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold ",
            children: "+ Mới"
          })]
        }), (0, jsxRuntime.jsxs)("label", {
          className: "sidebar-search",
          children: [(0, jsxRuntime.jsx)(Icon, {
            name: "search",
            className: "h-4 w-4"
          }), (0, jsxRuntime.jsx)("input", {
            type: "search",
            value: searchQuery,
            onChange: event => setSearchQuery(event.target.value),
            placeholder: "Tìm preset...",
            "aria-label": "Tìm preset"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1",
          children: 0 === filteredPresets.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-slate-500 text-sm italic text-center py-4",
            children: searchQuery ? "Không tìm thấy preset phù hợp." : "Chưa có preset."
          }) : filteredPresets.map(preset => (0, jsxRuntime.jsx)("button", {
            onClick: () => setActivePresetName(preset.name),
            className: "w-full text-left px-3 py-2 rounded-lg text-sm font-medium truncate " + (activePresetName === preset.name ? "bg-sky-600/30 text-white ring-1 ring-sky-500/50" : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"),
            children: preset.name
          }, preset.name))
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mt-auto space-y-2 pt-3 border-t border-slate-700/50",
          children: [error && (0, jsxRuntime.jsx)("p", {
            className: "text-red-400 text-xs p-2 bg-red-900/30 rounded",
            children: error
          }), (0, jsxRuntime.jsx)("input", {
            ref: fileInputRef,
            type: "file",
            "aria-label": "Nhập preset JSON",
            className: "sr-only",
            accept: ".json",
            onChange: event => {
              event.target.files && event.target.files.length > 0 && (addPreset(event.target.files[0]), event.target.value = "");
            }
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-2",
            children: [(0, jsxRuntime.jsx)("button", {
              onClick: () => fileInputRef.current?.click(),
              className: "w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg  text-xs",
              children: "Tải lên"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                activePreset && setIsExportDialogOpen(true);
              },
              disabled: !activePreset,
              className: "w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg  text-xs disabled:opacity-50",
              children: "Xuất"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-2",
            children: [(0, jsxRuntime.jsx)("button", {
              onClick: () => setNameDialogState("clone"),
              disabled: !activePreset,
              className: "w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg  text-xs disabled:opacity-50",
              children: "Nhân bản"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => setNameDialogState("rename"),
              disabled: !activePreset,
              className: "w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg  text-xs disabled:opacity-50",
              children: "Đổi tên"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-2",
            children: [(0, jsxRuntime.jsx)("button", {
              onClick: revertActivePreset,
              disabled: !activePreset,
              className: "w-full bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 font-semibold py-1.5 px-3 text-xs rounded-lg   disabled:opacity-50 border border-amber-900/50",
              children: "Hoàn tác"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                activePreset && window.confirm(`Bạn có chắc chắn muốn xóa preset "${activePreset.name}" không?`) && deleteActivePreset();
              },
              disabled: !activePreset || "Mặc định" === activePreset.name,
              className: "w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg   disabled:opacity-50 border border-red-900/50",
              children: "Xóa"
            })]
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "workspace-content md:col-span-2",
        children: activePreset ? (0, jsxRuntime.jsxs)("div", {
          children: [(0, jsxRuntime.jsx)("div", {
            role: "tablist",
            "aria-label": "Mục cài đặt preset",
            className: "mb-4 flex justify-center",
            children: (0, jsxRuntime.jsxs)("div", {
              className: "p-1 bg-slate-800 rounded-lg flex space-x-1",
              children: [(0, jsxRuntime.jsx)(PresetTab, {
                tabId: "config",
                currentTab: activeSubTab,
                onClick: setActiveSubTab,
                children: "Cấu hình"
              }), (0, jsxRuntime.jsx)(PresetTab, {
                tabId: "prompts",
                currentTab: activeSubTab,
                onClick: setActiveSubTab,
                children: "Lời nhắc"
              })]
            })
          }), (0, jsxRuntime.jsxs)("div", {
            id: `preset-subtabpanel-${activeSubTab}`,
            role: "tabpanel",
            "aria-labelledby": `preset-subtab-${activeSubTab}`,
            className: "focus:outline-none",
            tabIndex: 0,
            children: ["config" === activeSubTab && (0, jsxRuntime.jsx)(PresetConfiguration, {
              preset: activePreset,
              onUpdate: updateActivePreset
            }), "prompts" === activeSubTab && (0, jsxRuntime.jsx)(PromptManager, {
              preset: activePreset,
              onUpdate: updateActivePreset
            })]
          })]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700",
          children: (0, jsxRuntime.jsx)("div", {
            className: "text-center text-slate-500",
            children: (0, jsxRuntime.jsx)("p", {
              className: "font-semibold",
              children: "Chọn hoặc tạo mới một preset"
            })
          })
        })
      }), (0, jsxRuntime.jsx)(FileNameDialog, {
        isOpen: isExportDialogOpen,
        onClose: () => setIsExportDialogOpen(false),
        onConfirm: fileName => {
          activePreset && ((preset, downloadName) => {
            try {
              let exportPreset = JSON.parse(JSON.stringify(preset));
              delete exportPreset.prompt_order;
              Object.keys(exportPreset).forEach(key => {
                (null === exportPreset[key] || undefined === exportPreset[key]) && delete exportPreset[key];
                Array.isArray(exportPreset[key]) && 0 === exportPreset[key].length && ("stopping_strings" === key || "custom_stopping_strings" === key) && delete exportPreset[key];
              });
              let downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPreset, null, 2));
              let anchor = document.createElement("a");
              anchor.setAttribute("href", downloadUrl);
              anchor.setAttribute("download", downloadName);
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            } catch (error) {
              console.error("Failed to export preset:", error);
              alert("An error occurred while trying to export the preset file.");
            }
          })(activePreset, fileName);
        },
        initialFileName: activePreset?.name || "Preset",
        title: "Xuất Preset",
        fileExtension: ".json"
      }), (0, jsxRuntime.jsx)(PresetNameDialog, {
        isOpen: !!nameDialogState,
        mode: nameDialogState,
        onClose: () => setNameDialogState(null),
        originalName: activePreset?.name || "",
        onConfirm: async name => {
          try {
            if ("create" === nameDialogState) {
              await createPreset(name);
              showToast(`Đã tạo preset mới: "${name}"`, "success");
            } else {
              if ("clone" === nameDialogState && activePreset) {
                await duplicatePreset(activePreset.name, name);
                showToast(`Đã nhân bản thành: "${name}"`, "success");
              } else {
                "rename" === nameDialogState && activePreset && (await renamePreset(activePreset.name, name), showToast(`Đã đổi tên thành: "${name}"`, "success"));
              }
            }
          } catch (error) {
            showToast(`Lỗi: ${error instanceof Error ? error.message : String(error)}`, "error");
          } finally {
            setNameDialogState(null);
          }
        }
      })]
    });
  };
}
