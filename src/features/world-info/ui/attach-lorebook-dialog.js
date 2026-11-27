export function createAttachLorebookDialog(getDependencies) {
  return function AttachLorebookDialog({
    isOpen: isOpen,
    onClose: onClose,
    lorebooks: lorebooks,
    onAction: onAction
  }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime
    } = getDependencies();
    let [selectedLorebookName, setSelectedLorebookName] = (0, react.useState)("");
    let selectedLorebook = lorebooks.find(lorebook => lorebook.name === selectedLorebookName);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);
    return isOpen ? (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 z-[120] bg-black/70  flex items-center justify-center p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "attach-lorebook-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md p-6",
        onClick: event => event.stopPropagation(),
        children: [(0, jsxRuntime.jsx)("h3", {
          id: "attach-lorebook-title",
          className: "text-xl font-bold text-white mb-4",
          children: "Thêm Sổ tay vào Nhân vật"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsxs)("div", {
            children: [(0, jsxRuntime.jsx)("label", {
              htmlFor: "attach-lorebook-select",
              className: "block text-sm font-medium text-slate-300 mb-2",
              children: "Chọn Sổ tay Thế giới"
            }), (0, jsxRuntime.jsxs)("select", {
              id: "attach-lorebook-select",
              ref: closeButtonRef,
              value: selectedLorebookName,
              onChange: event => setSelectedLorebookName(event.target.value),
              className: "w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500",
              children: [(0, jsxRuntime.jsx)("option", {
                value: "",
                children: "-- Chọn sổ tay --"
              }), lorebooks.map(lorebook => (0, jsxRuntime.jsxs)("option", {
                value: lorebook.name,
                children: [lorebook.name, " (", lorebook.book.entries.length, " mục)"]
              }, lorebook.name))]
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-4 pt-2",
            children: [(0, jsxRuntime.jsxs)("button", {
              onClick: () => selectedLorebook && onAction("link", selectedLorebook),
              disabled: !selectedLorebook,
              className: "p-4 rounded-lg bg-amber-900/20 border border-amber-600/30 hover:bg-amber-900/40 hover:border-amber-500  text-left group disabled:opacity-50",
              children: [(0, jsxRuntime.jsx)("div", {
                className: "text-amber-400 font-bold mb-1 group-hover:text-amber-300",
                children: "Liên kết (Link)"
              }), (0, jsxRuntime.jsx)("p", {
                className: "text-xs text-slate-400",
                children: "Tạo một bản sao riêng của sổ tay này và gắn nhãn. Bạn có thể chỉnh sửa trực tiếp."
              })]
            }), (0, jsxRuntime.jsxs)("button", {
              onClick: () => selectedLorebook && onAction("merge", selectedLorebook),
              disabled: !selectedLorebook,
              className: "p-4 rounded-lg bg-sky-900/20 border border-sky-600/30 hover:bg-sky-900/40 hover:border-sky-500  text-left group disabled:opacity-50",
              children: [(0, jsxRuntime.jsx)("div", {
                className: "text-sky-400 font-bold mb-1 group-hover:text-sky-300",
                children: "Gộp (Merge)"
              }), (0, jsxRuntime.jsx)("p", {
                className: "text-xs text-slate-400",
                children: "Trộn lẫn các mục vào Sổ tay Gốc (Nội bộ). Mất đi ranh giới giữa các sổ."
              })]
            })]
          }), (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: onClose,
            className: "w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-600",
            children: "Đóng"
          })]
        })]
      })
    }) : null;
  };
}
