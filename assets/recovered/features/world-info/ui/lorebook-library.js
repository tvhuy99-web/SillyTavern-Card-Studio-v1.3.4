// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

export function createLorebookListItem(getDependencies) {
  return function LorebookListItem({
    lorebook: lorebook,
    onEdit: onEdit,
    onDelete: onDelete
  }) {
    const {
      jsxRuntime
    } = getDependencies();
    let entryCount = lorebook.book?.entries?.length || 0;
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-sky-500/50 hover:shadow-lg  flex flex-col h-full group",
      children: [(0, jsxRuntime.jsx)("div", {
        onClick: onEdit,
        onKeyDown: event => {
          ("Enter" === event.key || " " === event.key) && (event.preventDefault(), onEdit());
        },
        role: "button",
        tabIndex: 0,
        className: "p-4 flex-grow cursor-pointer hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 flex flex-col items-center justify-center min-h-[100px]",
        children: (0, jsxRuntime.jsxs)("h3", {
          className: "text-lg font-bold text-slate-200 group-hover:text-sky-400  text-center leading-snug break-words w-full",
          children: [lorebook.name, (0, jsxRuntime.jsxs)("span", {
            className: "ml-2 text-slate-500 text-base font-normal whitespace-nowrap",
            children: ["(", entryCount, ")"]
          })]
        })
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-2 border-t border-slate-700 bg-slate-900/30",
        children: [(0, jsxRuntime.jsxs)("button", {
          onClick: event => {
            event.stopPropagation();
            onDelete();
          },
          className: "p-3 text-sm font-bold text-red-400/80 hover:text-red-300 hover:bg-red-900/20  border-r border-slate-700 flex items-center justify-center gap-2",
          title: "Xóa sổ tay (có xác nhận)",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-4 w-4",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
              clipRule: "evenodd"
            })
          }), "Xóa"]
        }), (0, jsxRuntime.jsxs)("button", {
          onClick: event => {
            event.stopPropagation();
            onEdit();
          },
          className: "p-3 text-sm font-bold text-sky-400/80 hover:text-sky-300 hover:bg-sky-900/20  flex items-center justify-center gap-2",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-4 w-4",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              d: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
            })
          }), "Sửa"]
        })]
      })]
    });
  };
}

export function createLorebookUploadControl(getDependencies) {
  return function LorebookUploadControl({
    onUpload: onUpload,
    isLoading: isLoading
  }) {
    const {
      LoadingIndicator,
      jsxRuntime
    } = getDependencies();
    return (0, jsxRuntime.jsxs)("div", {
      onClick: isLoading ? undefined : onUpload,
      onKeyDown: event => {
        !isLoading && ("Enter" === event.key || " " === event.key) && (event.preventDefault(), onUpload());
      },
      role: "button",
      tabIndex: isLoading ? -1 : 0,
      "aria-disabled": isLoading,
      "aria-label": "Tải lên Sổ tay Mới",
      className: "border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-sky-500/50 hover:bg-slate-800/30 cursor-pointer group"),
      children: [(0, jsxRuntime.jsx)("div", {
        className: "bg-slate-800 p-3 rounded-full mb-3 group- ",
        children: isLoading ? (0, jsxRuntime.jsx)(LoadingIndicator, {
          message: ""
        }) : (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-6 w-6 text-sky-500",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M12 4v16m8-8H4"
          })
        })
      }), (0, jsxRuntime.jsx)("h3", {
        className: "text-sm font-bold text-slate-300 group-hover:text-white ",
        children: "Tải lên Sổ tay Mới"
      }), (0, jsxRuntime.jsx)("p", {
        className: "mt-1 text-xs text-slate-500",
        children: "Hỗ trợ một hoặc nhiều tệp JSON"
      })]
    });
  };
}

export function createLorebookLibrary(getDependencies) {
  return function LorebookLibrary() {
    const {
      LorebookUploadControl,
      FileNameDialog,
      LorebookListItem,
      LorebookManager,
      react,
      Icon,
      lorebookStore,
      jsxRuntime
    } = getDependencies();
    let {
      lorebooks: lorebooks,
      isLoading: isLoading,
      error: error,
      loadLorebooks: loadLorebooks,
      updateLorebook: updateLorebook,
      deleteLorebook: deleteLorebook
    } = lorebookStore();
    let [activeLorebookName, setActiveLorebookName] = (0, react.useState)(null);
    let [isExportDialogOpen, setIsExportDialogOpen] = (0, react.useState)(false);
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let fileInputRef = (0, react.useRef)(null);
    let activeLorebook = lorebooks.find(lorebook => lorebook.name === activeLorebookName);
    let filteredLorebooks = (0, react.useMemo)(() => {
      let query = searchQuery.trim().toLocaleLowerCase("vi");
      return query ? lorebooks.filter(lorebook => lorebook.name.toLocaleLowerCase("vi").includes(query)) : lorebooks;
    }, [lorebooks, searchQuery]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "lorebook-library h-full flex flex-col",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "library-toolbar mb-6",
        children: [(0, jsxRuntime.jsxs)("div", {
          children: [(0, jsxRuntime.jsxs)("h2", {
            className: "text-2xl font-bold text-white",
            children: ["Thư viện Sổ tay Thế giới", (0, jsxRuntime.jsx)("span", {
              className: "sidebar-count",
              children: lorebooks.length
            })]
          }), (0, jsxRuntime.jsx)("p", {
            className: "text-sm text-slate-400 mt-1",
            children: "Quản lý kiến thức nền và dữ liệu thế giới dùng lại."
          })]
        }), (0, jsxRuntime.jsxs)("label", {
          className: "sidebar-search library-search",
          children: [(0, jsxRuntime.jsx)(Icon, {
            name: "search",
            className: "h-4 w-4"
          }), (0, jsxRuntime.jsx)("input", {
            type: "search",
            value: searchQuery,
            onChange: event => setSearchQuery(event.target.value),
            placeholder: "Tìm sổ tay...",
            "aria-label": "Tìm sổ tay thế giới"
          })]
        })]
      }), error && (0, jsxRuntime.jsxs)("div", {
        className: "bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-3",
        children: [(0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",
            clipRule: "evenodd"
          })
        }), error]
      }), (0, jsxRuntime.jsx)("input", {
        ref: fileInputRef,
        type: "file",
        "aria-label": "Nhập sổ tay JSON",
        className: "sr-only",
        accept: ".json",
        onChange: event => {
          event.target.files && event.target.files.length > 0 && (loadLorebooks(event.target.files), event.target.value = "");
        },
        multiple: true
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10",
        children: [(0, jsxRuntime.jsx)(LorebookUploadControl, {
          onUpload: () => fileInputRef.current?.click(),
          isLoading: isLoading
        }), filteredLorebooks.map(lorebook => (0, jsxRuntime.jsx)(LorebookListItem, {
          lorebook: lorebook,
          onEdit: () => setActiveLorebookName(lorebook.name),
          onDelete: () => (name => {
            window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${name}" không?`) && deleteLorebook(name);
          })(lorebook.name)
        }, lorebook.name)), searchQuery && 0 === filteredLorebooks.length && (0, jsxRuntime.jsx)("div", {
          className: "col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500",
          children: "Không tìm thấy sổ tay phù hợp."
        })]
      }), activeLorebook && (0, jsxRuntime.jsx)(LorebookManager, {
        initialEntries: activeLorebook.book.entries || [],
        onSave: entries => {
          if (!activeLorebook) return;
          let updatedLorebook = {
            ...activeLorebook,
            book: {
              ...activeLorebook.book,
              entries: entries
            }
          };
          updateLorebook(updatedLorebook);
          setActiveLorebookName(null);
        },
        onClose: () => setActiveLorebookName(null),
        onExport: () => {
          activeLorebook && setIsExportDialogOpen(true);
        },
        onDelete: () => {
          activeLorebook && window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${activeLorebook.name}" không?`) && (deleteLorebook(activeLorebook.name), setActiveLorebookName(null));
        },
        characterId: `global_lb_${activeLorebook.name}`
      }), (0, jsxRuntime.jsx)(FileNameDialog, {
        isOpen: isExportDialogOpen,
        onClose: () => setIsExportDialogOpen(false),
        onConfirm: fileName => {
          activeLorebook && ((lorebook, fileName) => {
            try {
              let book = lorebook.book;
              let downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(book, null, 2));
              let anchor = document.createElement("a");
              anchor.setAttribute("href", downloadUrl);
              anchor.setAttribute("download", fileName);
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            } catch (error) {
              console.error("Failed to export lorebook:", error);
              alert("An error occurred while trying to export the lorebook file.");
            }
          })(activeLorebook, fileName);
        },
        initialFileName: activeLorebook?.name || "Lorebook",
        title: "Xuất Sổ tay Thế giới",
        fileExtension: ".json"
      })]
    });
  };
}
