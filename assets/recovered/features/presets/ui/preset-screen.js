import { createChoiceSelect } from "../../../ui/components/dialog-focus.js";

export function createPresetScreen(getDependencies) {
  const ChoiceSelect = createChoiceSelect(getDependencies);
  return function PresetScreen() {
    const {
      FileNameDialog,
      PresetTab,
      react,
      presetStore,
      PromptManager,
      useToast,
      PresetConfiguration,
      LoadingIndicator,
      jsxRuntime,
      PresetNameDialog
    } = getDependencies();
    const {
      presets,
      activePresetName,
      isLoading,
      error,
      addPreset,
      deleteActivePreset,
      updateActivePreset,
      setActivePresetName,
      duplicatePreset,
      createPreset,
      renamePreset
    } = presetStore();

    const [activeSubTab, setActiveSubTab] = react.useState("config");
    const [isExportDialogOpen, setIsExportDialogOpen] = (0, react.useState)(false);
    const [nameDialogState, setNameDialogState] = (0, react.useState)(null);
    const [isOptionsOpen, setIsOptionsOpen] = (0, react.useState)(false);
    const fileInputRef = (0, react.useRef)(null);
    const menuRef = (0, react.useRef)(null);
    const { showToast } = useToast();

    const activePreset = presets.find(preset => preset.name === activePresetName) || null;

    if (typeof react.useEffect === "function") {
      (0, react.useEffect)(() => {
        if (!isOptionsOpen) return;
        const handleOutsideClick = event => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOptionsOpen(false);
          }
        };
        const handleKeyDown = event => {
          if (event.key === "Escape") setIsOptionsOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
          document.removeEventListener("mousedown", handleOutsideClick);
          document.removeEventListener("keydown", handleKeyDown);
        };
      }, [isOptionsOpen]);
    }

    const runMenuAction = action => {
      setIsOptionsOpen(false);
      action();
    };

    const handleDeletePreset = () => {
      if (activePreset && window.confirm(`Bạn có chắc chắn muốn xóa preset "${activePreset.name}" không?`)) {
        deleteActivePreset();
      }
    };

    if (isLoading && presets.length === 0) {
      return (0, jsxRuntime.jsx)("div", {
        className: "flex justify-center items-center h-64",
        children: (0, jsxRuntime.jsx)(LoadingIndicator, {
          message: "Đang tải presets..."
        })
      });
    }

    const canDelete = Boolean(activePreset && activePreset.name !== "Mặc định");

    return (0, jsxRuntime.jsxs)("div", {
      className: "max-w-4xl mx-auto space-y-5",
      children: [
        (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3",
          children: [
            (0, jsxRuntime.jsx)("h2", {
              className: "text-xl font-bold text-slate-100",
              children: "Preset"
            }),
            (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-3",
              children: [
                (0, jsxRuntime.jsx)(ChoiceSelect, {
                  label: "Chọn Preset",
                  value: activePresetName || "",
                  onChange: event => setActivePresetName(event.target.value),
                  className: "flex-grow min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500",
                  options: presets.length === 0
                    ? [{ value: "", label: "Chưa có preset" }]
                    : presets.map(preset => ({ value: preset.name, label: preset.name }))
                }),
                (0, jsxRuntime.jsxs)("div", {
                  ref: menuRef,
                  className: "relative flex-shrink-0",
                  children: [
                    (0, jsxRuntime.jsx)("button", {
                      type: "button",
                      "aria-haspopup": "menu",
                      "aria-expanded": isOptionsOpen ? "true" : "false",
                      onClick: () => setIsOptionsOpen(open => !open),
                      className: "px-3.5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500",
                      children: "Tùy chọn khác"
                    }),
                    isOptionsOpen && (0, jsxRuntime.jsxs)("div", {
                      role: "menu",
                      "aria-label": "Tùy chọn Preset",
                      className: "absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-30",
                      children: [
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          onClick: () => runMenuAction(() => setNameDialogState("create")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800",
                          children: "Lưu thành Preset mới"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activePreset,
                          onClick: () => runMenuAction(() => setNameDialogState("clone")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Nhân bản"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activePreset,
                          onClick: () => runMenuAction(() => setNameDialogState("rename")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Đổi tên"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          onClick: () => runMenuAction(() => fileInputRef.current?.click()),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800",
                          children: "Nhập"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activePreset,
                          onClick: () => runMenuAction(() => activePreset && setIsExportDialogOpen(true)),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Xuất"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !canDelete,
                          onClick: () => runMenuAction(handleDeletePreset),
                          className: "w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/60 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Xóa"
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            error && (0, jsxRuntime.jsx)("p", {
              className: "text-red-400 text-xs p-2 bg-red-900/30 rounded",
              children: error
            }),
            (0, jsxRuntime.jsx)("input", {
              ref: fileInputRef,
              type: "file",
              "aria-label": "Nhập preset JSON",
              hidden: true,
              accept: ".json",
              onChange: event => {
                if (event.target.files && event.target.files.length > 0) {
                  addPreset(event.target.files[0]);
                  event.target.value = "";
                }
              }
            })
          ]
        }),
        activePreset ? (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [
            (0, jsxRuntime.jsx)("div", {
              role: "tablist",
              "aria-label": "Mục cài đặt preset",
              className: "flex justify-center",
              children: (0, jsxRuntime.jsxs)("div", {
                className: "p-1 bg-slate-800 rounded-lg flex space-x-1",
                children: [
                  (0, jsxRuntime.jsx)(PresetTab, {
                    tabId: "config",
                    currentTab: activeSubTab,
                    onClick: setActiveSubTab,
                    children: "Cấu hình"
                  }),
                  (0, jsxRuntime.jsx)(PresetTab, {
                    tabId: "prompts",
                    currentTab: activeSubTab,
                    onClick: setActiveSubTab,
                    children: "Lời nhắc"
                  })
                ]
              })
            }),
            (0, jsxRuntime.jsxs)("div", {
              id: `preset-subtabpanel-${activeSubTab}`,
              role: "tabpanel",
              "aria-labelledby": `preset-subtab-${activeSubTab}`,
              className: "focus:outline-none space-y-4",
              tabIndex: -1,
              children: [
                (0, jsxRuntime.jsx)("h2", {
                  className: "text-lg font-bold text-slate-200",
                  children: activeSubTab === "config" ? "Cấu hình" : "Lời nhắc"
                }),
                activeSubTab === "config" && (0, jsxRuntime.jsx)(PresetConfiguration, {
                  preset: activePreset,
                  onUpdate: updateActivePreset
                }),
                activeSubTab === "prompts" && (0, jsxRuntime.jsx)(PromptManager, {
                  preset: activePreset,
                  onUpdate: updateActivePreset
                })
              ]
            })
          ]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center py-16 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700",
          children: (0, jsxRuntime.jsx)("p", {
            className: "text-center text-slate-500 font-semibold",
            children: "Chọn hoặc tạo mới một preset"
          })
        }),
        (0, jsxRuntime.jsx)(FileNameDialog, {
          isOpen: isExportDialogOpen,
          onClose: () => setIsExportDialogOpen(false),
          onConfirm: fileName => {
            if (!activePreset) return;
            try {
              const exportPreset = JSON.parse(JSON.stringify(activePreset));
              delete exportPreset.prompt_order;
              Object.keys(exportPreset).forEach(key => {
                if (exportPreset[key] === null || exportPreset[key] === undefined) delete exportPreset[key];
                if (Array.isArray(exportPreset[key]) && exportPreset[key].length === 0 && (key === "stopping_strings" || key === "custom_stopping_strings")) {
                  delete exportPreset[key];
                }
              });
              const downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPreset, null, 2));
              const anchor = document.createElement("a");
              anchor.setAttribute("href", downloadUrl);
              anchor.setAttribute("download", fileName);
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            } catch (exportError) {
              console.error("Failed to export preset:", exportError);
              alert("An error occurred while trying to export the preset file.");
            }
          },
          initialFileName: activePreset?.name || "Preset",
          title: "Xuất Preset",
          fileExtension: ".json"
        }),
        (0, jsxRuntime.jsx)(PresetNameDialog, {
          isOpen: Boolean(nameDialogState),
          mode: nameDialogState,
          onClose: () => setNameDialogState(null),
          originalName: activePreset?.name || "",
          onConfirm: async name => {
            try {
              if (nameDialogState === "create") {
                await createPreset(name);
                showToast(`Đã tạo preset mới: "${name}"`, "success");
              } else if (nameDialogState === "clone" && activePreset) {
                await duplicatePreset(activePreset.name, name);
                showToast(`Đã nhân bản thành: "${name}"`, "success");
              } else if (nameDialogState === "rename" && activePreset) {
                await renamePreset(activePreset.name, name);
                showToast(`Đã đổi tên thành: "${name}"`, "success");
              }
            } catch (dialogError) {
              showToast(`Lỗi: ${dialogError instanceof Error ? dialogError.message : String(dialogError)}`, "error");
            } finally {
              setNameDialogState(null);
            }
          }
        })
      ]
    });
  };
}
