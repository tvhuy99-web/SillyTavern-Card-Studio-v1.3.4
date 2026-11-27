export function createPromptEditDialog(getDependencies) {
  return function PromptEditDialog({
    isOpen: isOpen,
    prompt: prompt,
    onSave: onSave,
    onClose: onClose
  }) {
    const {
      useDialogFocus,
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    let [draftPrompt, setDraftPrompt] = (0, react.useState)(null);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    if ((0, react.useEffect)(() => {
      setDraftPrompt(prompt ? JSON.parse(JSON.stringify(prompt)) : null);
    }, [prompt, isOpen]), useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef), !isOpen || !draftPrompt) return null;
    let updateDraftField = (field, value) => {
      setDraftPrompt(previousPrompt => previousPrompt ? {
        ...previousPrompt,
        [field]: value
      } : null);
    };
    return (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4   " + (isOpen ? "opacity-100" : "opacity-0 pointer-events-none"),
      onClick: onClose,
      "aria-hidden": !isOpen,
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "prompt-modal-title",
        className: "bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col   " + (isOpen ? "scale-100" : "scale-95"),
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("header", {
          className: "p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("h2", {
            id: "prompt-modal-title",
            className: "text-xl font-bold text-sky-400",
            children: "Chỉnh sửa Lời nhắc"
          }), (0, jsxRuntime.jsx)("button", {
            ref: closeButtonRef,
            "aria-label": "Đóng",
            onClick: onClose,
            className: "p-1 text-slate-400 hover:text-white",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-6 w-6",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M6 18L18 6M6 6l12 12"
              })
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-6 space-y-4 overflow-y-auto",
          children: [(0, jsxRuntime.jsx)(TextInput, {
            label: "Tên Lời nhắc",
            value: draftPrompt.name,
            onChange: event => updateDraftField("name", event.target.value)
          }), (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: draftPrompt.content,
            onChange: event => updateDraftField("content", event.target.value),
            rows: 12
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Gửi kèm Tiêu đề",
            checked: draftPrompt.include_title ?? false,
            onChange: value => updateDraftField("include_title", value)
          })]
        }), (0, jsxRuntime.jsxs)("footer", {
          className: "p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 text-sm font-medium rounded-md   text-slate-300 bg-slate-700 hover:bg-slate-600",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => onSave(draftPrompt),
            className: "px-4 py-2 text-sm font-medium rounded-md   bg-sky-600 text-white hover:bg-sky-700",
            children: "Lưu Thay đổi"
          })]
        })]
      })
    });
  };
}

export function createPresetNameDialog(getDependencies) {
  return function PresetNameDialog({
    isOpen: isOpen,
    mode: mode,
    originalName: originalName,
    onClose: onClose,
    onConfirm: onConfirm
  }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime
    } = getDependencies();
    let [presetName, setPresetName] = (0, react.useState)("");
    let dialogRef = (0, react.useRef)(null);
    let inputRef = (0, react.useRef)(null);
    useDialogFocus(isOpen, onClose, inputRef, dialogRef);
    (0, react.useEffect)(() => {
      isOpen && mode && (setPresetName("clone" === mode ? `${originalName} (Copy)` : "rename" === mode ? originalName : "New Preset"), setTimeout(() => {
        dialogRef.current && (dialogRef.current.focus(), dialogRef.current.select());
      }, 50));
    }, [isOpen, mode, originalName]);
    let handleConfirm = () => {
      presetName.trim() && onConfirm(presetName.trim());
    };
    return isOpen && mode ? (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[200] p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "preset-name-dialog-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: inputRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-sm ",
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center",
          children: [(0, jsxRuntime.jsx)("h3", {
            id: "preset-name-dialog-title",
            className: "text-lg font-bold text-white",
            children: "create" === mode ? "Tạo Preset Mới" : "rename" === mode ? "Đổi tên Preset" : "Nhân bản Preset"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "text-slate-400 hover:text-white",
            "aria-label": "Đóng",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
                clipRule: "evenodd"
              })
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-6",
          children: [(0, jsxRuntime.jsx)("label", {
            htmlFor: "preset-name-input",
            className: "block text-sm font-medium text-slate-300 mb-2",
            children: "Tên Preset"
          }), (0, jsxRuntime.jsx)("input", {
            id: "preset-name-input",
            ref: dialogRef,
            type: "text",
            value: presetName,
            onChange: event => setPresetName(event.target.value),
            onKeyDown: event => {
              if ("Enter" === event.key) {
                handleConfirm();
              } else {
                "Escape" === event.key && onClose();
              }
            },
            className: "w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 transition",
            placeholder: "Nhập tên..."
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end gap-3",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: handleConfirm,
            className: "px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold",
            children: "Xác nhận"
          })]
        })]
      })
    }) : null;
  };
}
