// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

export function createEntryPositionControl(getDependencies) {
  return function EntryPositionControl({
    value: value,
    onChange: onChange,
    className = ""
  }) {
    const {
      jsxRuntime,
      handleRadioKeyDown
    } = getDependencies();
    let getOptionClassName = (isSelected, activeClass) => "flex-1 px-2 py-1 text-xs font-bold  flex items-center justify-center gap-1 " + (isSelected ? `${activeClass} text-white shadow-sm` : "text-slate-400 hover:text-slate-200 hover:bg-slate-600/50");
    return (0, jsxRuntime.jsxs)("div", {
      className: `flex flex-col gap-1 ${className}`,
      children: [(0, jsxRuntime.jsx)("label", {
        className: "text-sm font-medium text-slate-300 mb-1",
        children: "Vị trí"
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex bg-slate-700 border border-slate-600 rounded-md p-1 w-full",
        role: "radiogroup",
        "aria-label": "Vị trí chèn",
        children: [(0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": undefined === value,
          tabIndex: undefined === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange(undefined),
          className: `rounded-l-sm outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName(undefined === value, "bg-slate-600")}`,
          title: "Mặc định",
          children: "Mặc định"
        }), (0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": "before" === value,
          tabIndex: "before" === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange("before"),
          className: `outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName("before" === value, "bg-sky-600")}`,
          title: "Đầu Prompt",
          children: "Đầu"
        }), (0, jsxRuntime.jsx)("button", {
          role: "radio",
          "aria-checked": "after" === value,
          tabIndex: "after" === value ? 0 : -1,
          onKeyDown: handleRadioKeyDown,
          onClick: () => onChange("after"),
          className: `rounded-r-sm outline-none focus:ring-1 focus:ring-sky-500 ${getOptionClassName("after" === value, "bg-violet-600")}`,
          title: "Cuối Prompt",
          children: "Cuối"
        })]
      })]
    });
  };
}

export function createLorebookEntryDialog(getDependencies) {
  return function LorebookEntryDialog({
    isOpen: isOpen,
    entry: entry,
    onSave: onSave,
    onClose: onClose
  }) {
    const {
      EntryPositionControl,
      useDialogFocus,
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    let [draftEntry, setDraftEntry] = (0, react.useState)(null);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    if ((0, react.useEffect)(() => {
      setDraftEntry(entry ? JSON.parse(JSON.stringify(entry)) : null);
    }, [entry, isOpen]), useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef), !isOpen || !draftEntry) return null;
    let updateDraftField = (field, value) => {
      setDraftEntry(previousEntry => previousEntry ? {
        ...previousEntry,
        [field]: value
      } : null);
    };
    return (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[100] p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "world-info-entry-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ",
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("header", {
          className: "p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl",
          children: [(0, jsxRuntime.jsx)("h3", {
            id: "world-info-entry-title",
            className: "text-xl font-bold text-sky-400",
            children: "Chỉnh sửa Mục World Info"
          }), (0, jsxRuntime.jsx)("button", {
            ref: closeButtonRef,
            onClick: onClose,
            className: "p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded ",
            "aria-label": "Đóng chỉnh sửa",
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
          className: "p-6 overflow-y-auto custom-scrollbar space-y-6 flex-grow",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(TextInput, {
              label: "Tiêu đề (Bình luận)",
              value: draftEntry.comment || "",
              onChange: event => updateDraftField("comment", event.target.value),
              placeholder: "Đặt tên cho mục này..."
            }), (0, jsxRuntime.jsx)(TextInput, {
              label: "Từ khóa chính",
              value: (draftEntry.keys || []).join(", "),
              onChange: event => updateDraftField("keys", event.target.value.split(",").map(key => key.trim()).filter(Boolean)),
              placeholder: "Ví dụ: gươm, kiếm"
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [(0, jsxRuntime.jsx)(TextInput, {
              label: "Từ khóa phụ",
              value: (draftEntry.secondary_keys || []).join(", "),
              onChange: event => updateDraftField("secondary_keys", event.target.value.split(",").map(key => key.trim()).filter(Boolean)),
              placeholder: "Ví dụ: cổ đại"
            }), (0, jsxRuntime.jsxs)("div", {
              className: "grid grid-cols-2 gap-4",
              children: [(0, jsxRuntime.jsx)(TextInput, {
                label: "Thứ tự chèn",
                type: "number",
                value: String(draftEntry.insertion_order ?? 100),
                onChange: event => updateDraftField("insertion_order", parseInt(event.target.value))
              }), (0, jsxRuntime.jsx)(EntryPositionControl, {
                value: (position => {
                  let positionText = String(position || "");
                  return positionText.includes("before") ? "before" : positionText.includes("after") ? "after" : undefined;
                })(draftEntry.position),
                onChange: selection => {
                  let position = "";
                  "before" === selection && (position = "before_char");
                  "after" === selection && (position = "after_char");
                  updateDraftField("position", position);
                }
              })]
            })]
          }), (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: draftEntry.content || "",
            onChange: event => updateDraftField("content", event.target.value),
            rows: 8
          }), (0, jsxRuntime.jsxs)("div", {
            className: "bg-slate-700/30 p-4 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "space-y-3",
              children: [(0, jsxRuntime.jsx)("label", {
                className: "block text-xs font-bold text-slate-400 uppercase",
                children: "Trạng thái"
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Đã bật",
                checked: false !== draftEntry.enabled,
                onChange: enabled => updateDraftField("enabled", enabled),
                clean: true
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Hằng số",
                checked: !!draftEntry.constant,
                onChange: enabled => updateDraftField("constant", enabled),
                clean: true,
                tooltip: "Luôn luôn gửi đi, bỏ qua kiểm tra từ khóa."
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "space-y-3",
              children: [(0, jsxRuntime.jsx)("label", {
                className: "block text-xs font-bold text-slate-400 uppercase",
                children: "Logic"
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Chọn lọc",
                checked: !!draftEntry.selective,
                onChange: enabled => updateDraftField("selective", enabled),
                clean: true,
                tooltip: "Chỉ kích hoạt khi từ khóa xuất hiện."
              }), (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: "Dùng Regex",
                checked: !!draftEntry.use_regex,
                onChange: enabled => updateDraftField("use_regex", enabled),
                clean: true,
                tooltip: "Xử lý từ khóa như biểu thức chính quy."
              })]
            }), (0, jsxRuntime.jsxs)("div", {
              className: "md:col-span-2 grid grid-cols-2 gap-4",
              children: [(0, jsxRuntime.jsx)(TextInput, {
                label: "Sticky (Duy trì)",
                type: "number",
                value: String(draftEntry.sticky || 0),
                onChange: event => updateDraftField("sticky", parseInt(event.target.value))
              }), (0, jsxRuntime.jsx)(TextInput, {
                label: "Cooldown (Hồi chiêu)",
                type: "number",
                value: String(draftEntry.cooldown || 0),
                onChange: event => updateDraftField("cooldown", parseInt(event.target.value))
              })]
            })]
          })]
        }), (0, jsxRuntime.jsxs)("footer", {
          className: "p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 ",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              onSave(draftEntry);
              onClose();
            },
            className: "px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white ",
            children: "Lưu Thay đổi"
          })]
        })]
      })
    });
  };
}
