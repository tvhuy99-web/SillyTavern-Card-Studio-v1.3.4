const CHAR_BOOK_PREFIX = "__char__:";

export function createLorebookListItem(getDependencies) {
  return function LorebookListItem({
    lorebook,
    onEdit,
    onDelete
  }) {
    const { jsxRuntime } = getDependencies();
    const entryCount = lorebook.book?.entries?.length || 0;
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full group",
      children: [
        (0, jsxRuntime.jsx)("div", {
          onClick: onEdit,
          onKeyDown: event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onEdit();
            }
          },
          role: "button",
          tabIndex: 0,
          className: "p-4 flex-grow cursor-pointer hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 flex flex-col items-center justify-center min-h-[100px]",
          children: (0, jsxRuntime.jsxs)("h3", {
            className: "text-lg font-bold text-slate-200 group-hover:text-sky-400 text-center leading-snug break-words w-full",
            children: [lorebook.name, (0, jsxRuntime.jsxs)("span", {
              className: "ml-2 text-slate-500 text-base font-normal whitespace-nowrap",
              children: ["(", entryCount, ")"]
            })]
          })
        }),
        (0, jsxRuntime.jsxs)("div", {
          className: "grid grid-cols-2 border-t border-slate-700 bg-slate-900/30",
          children: [
            (0, jsxRuntime.jsx)("button", {
              type: "button",
              onClick: event => {
                event.stopPropagation();
                onDelete();
              },
              className: "p-3 text-sm font-bold text-red-400/80 hover:text-red-300 hover:bg-red-900/20 border-r border-slate-700",
              children: "Xóa"
            }),
            (0, jsxRuntime.jsx)("button", {
              type: "button",
              onClick: event => {
                event.stopPropagation();
                onEdit();
              },
              className: "p-3 text-sm font-bold text-sky-400/80 hover:text-sky-300 hover:bg-sky-900/20",
              children: "Sửa"
            })
          ]
        })
      ]
    });
  };
}

export function createLorebookUploadControl(getDependencies) {
  return function LorebookUploadControl({
    onUpload,
    isLoading
  }) {
    const { LoadingIndicator, jsxRuntime } = getDependencies();
    return (0, jsxRuntime.jsxs)("div", {
      onClick: isLoading ? undefined : onUpload,
      onKeyDown: event => {
        if (!isLoading && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onUpload();
        }
      },
      role: "button",
      tabIndex: isLoading ? -1 : 0,
      "aria-disabled": isLoading,
      "aria-label": "Tải lên Sổ tay Mới",
      className: "border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-sky-500/50 hover:bg-slate-800/30 cursor-pointer group"),
      children: [
        isLoading ? (0, jsxRuntime.jsx)(LoadingIndicator, { message: "" }) : null,
        (0, jsxRuntime.jsx)("h3", {
          className: "text-sm font-bold text-slate-300 group-hover:text-white",
          children: "Tải lên Sổ tay Mới"
        })
      ]
    });
  };
}

export function createLorebookLibrary(getDependencies) {
  return function LorebookLibrary() {
    const {
      FileNameDialog,
      LorebookEntryList,
      react,
      lorebookStore,
      characterStore,
      useToast,
      jsxRuntime
    } = getDependencies();

    const {
      lorebooks,
      error,
      loadLorebooks,
      createLorebook,
      renameLorebook,
      updateLorebook,
      deleteLorebook
    } = lorebookStore();

    const charStoreApi = typeof characterStore === "function" ? characterStore() : { characters: [] };
    const characters = charStoreApi.characters || [];
    const updateCharacterByFileName = charStoreApi.updateCharacter || null;
    const setActiveCharacterFileName = charStoreApi.setActiveCharacterFileName || null;
    const updateActiveCharacter = charStoreApi.updateActiveCharacter || null;

    const toastApi = typeof useToast === "function" ? useToast() : null;
    const showToast = toastApi?.showToast || (() => {});

    const allBooks = (0, react.useMemo)(() => {
      const standalone = lorebooks.map(book => ({
        id: book.name,
        kind: "standalone",
        name: book.name,
        isGlobal: Boolean(book.isGlobal || book.book?.isGlobal),
        entries: book.book?.entries || [],
        record: book,
        label: `${book.name}${book.isGlobal || book.book?.isGlobal ? " [Toàn cầu]" : ""}`
      }));
      const characterBooks = characters.map(character => {
        const displayName = `${character.card?.name || character.fileName} (Mặc định)`;
        const isGlobal = Boolean(character.card?.char_book?.isGlobal);
        return {
          id: `${CHAR_BOOK_PREFIX}${character.fileName}`,
          kind: "character",
          fileName: character.fileName,
          name: displayName,
          isGlobal,
          entries: character.card?.char_book?.entries || [],
          character,
          label: `${displayName}${isGlobal ? " [Toàn cầu]" : ""}`
        };
      });
      return [...standalone, ...characterBooks];
    }, [lorebooks, characters]);

    const [selectedId, setSelectedId] = (0, react.useState)(() => allBooks[0]?.id || "");
    const [isOptionsOpen, setIsOptionsOpen] = (0, react.useState)(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = (0, react.useState)(false);
    const [nameDialogMode, setNameDialogMode] = (0, react.useState)(null);
    const [nameInput, setNameInput] = (0, react.useState)("");
    const [isMergeDialogOpen, setIsMergeDialogOpen] = (0, react.useState)(false);
    const [mergeSourceId, setMergeSourceId] = (0, react.useState)("");

    const fileInputRef = (0, react.useRef)(null);
    const menuRef = (0, react.useRef)(null);

    const activeBook = allBooks.find(book => book.id === selectedId) || allBooks[0] || null;
    const effectiveSelectedId = activeBook?.id || "";

    if (typeof react.useEffect === "function") {
      (0, react.useEffect)(() => {
        if (!isOptionsOpen) return;
        const handleOutside = event => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOptionsOpen(false);
          }
        };
        const handleKey = event => {
          if (event.key === "Escape") setIsOptionsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
          document.removeEventListener("mousedown", handleOutside);
          document.removeEventListener("keydown", handleKey);
        };
      }, [isOptionsOpen]);
    }

    const persistCharacterBook = (character, nextCharBook) => {
      const updatedCard = {
        ...character.card,
        char_book: nextCharBook
      };
      if (typeof updateCharacterByFileName === "function") {
        updateCharacterByFileName(character.fileName, updatedCard);
      } else if (typeof setActiveCharacterFileName === "function" && typeof updateActiveCharacter === "function") {
        setActiveCharacterFileName(character.fileName);
        updateActiveCharacter(updatedCard);
      }
    };

    const handleUpdateEntries = nextEntries => {
      if (!activeBook) return;
      if (activeBook.kind === "standalone") {
        updateLorebook({
          ...activeBook.record,
          book: {
            ...(activeBook.record.book || {}),
            entries: nextEntries
          }
        });
      } else {
        persistCharacterBook(activeBook.character, {
          ...(activeBook.character.card?.char_book || {}),
          entries: nextEntries
        });
      }
    };

    const handleToggleGlobal = () => {
      if (!activeBook) return;
      const nextGlobal = !activeBook.isGlobal;
      if (activeBook.kind === "standalone") {
        updateLorebook({
          ...activeBook.record,
          isGlobal: nextGlobal,
          book: {
            ...(activeBook.record.book || {}),
            isGlobal: nextGlobal
          }
        });
      } else {
        persistCharacterBook(activeBook.character, {
          ...(activeBook.character.card?.char_book || { entries: [] }),
          isGlobal: nextGlobal
        });
      }
      showToast(
        nextGlobal
          ? `Đã bật áp dụng toàn cầu cho "${activeBook.name}".`
          : `Đã bỏ áp dụng toàn cầu cho "${activeBook.name}".`,
        "success"
      );
    };

    const openNameDialog = mode => {
      setNameDialogMode(mode);
      if (mode === "rename" && activeBook) setNameInput(activeBook.name);
      else if (mode === "duplicate" && activeBook) setNameInput(`${activeBook.name.replace(/\s*\(Mặc định\)$/, "")} (Bản sao)`);
      else setNameInput("");
    };

    const handleConfirmNameDialog = async () => {
      const cleanName = nameInput.trim();
      if (!cleanName) {
        showToast("Tên sổ tay không được để trống.", "error");
        return;
      }
      try {
        if (nameDialogMode === "create") {
          if (typeof createLorebook === "function") {
            await createLorebook(cleanName, []);
          } else {
            await updateLorebook({ name: cleanName, isGlobal: false, book: { name: cleanName, entries: [] } });
          }
          setSelectedId(cleanName);
          showToast(`Đã tạo sổ tay "${cleanName}".`, "success");
        } else if (nameDialogMode === "rename" && activeBook?.kind === "standalone") {
          if (typeof renameLorebook === "function") {
            await renameLorebook(activeBook.name, cleanName);
            setSelectedId(cleanName);
            showToast(`Đã đổi tên thành "${cleanName}".`, "success");
          }
        } else if (nameDialogMode === "duplicate" && activeBook) {
          if (typeof createLorebook === "function") {
            await createLorebook(cleanName, activeBook.entries, { isGlobal: false });
          }
          setSelectedId(cleanName);
          showToast(`Đã nhân bản thành sổ tay độc lập "${cleanName}".`, "success");
        }
        setNameDialogMode(null);
      } catch (dialogError) {
        showToast(`Lỗi: ${dialogError instanceof Error ? dialogError.message : String(dialogError)}`, "error");
      }
    };

    const mergeCandidates = allBooks.filter(book => book.id !== effectiveSelectedId);

    const openMergeDialog = () => {
      if (!activeBook) return;
      setMergeSourceId(mergeCandidates[0]?.id || "");
      setIsMergeDialogOpen(true);
    };

    const handleConfirmMerge = () => {
      if (!activeBook || !mergeSourceId) {
        setIsMergeDialogOpen(false);
        return;
      }
      const sourceBook = allBooks.find(book => book.id === mergeSourceId);
      if (!sourceBook) {
        setIsMergeDialogOpen(false);
        return;
      }
      const cloned = JSON.parse(JSON.stringify(sourceBook.entries || [])).map((entry, idx) => ({
        ...entry,
        uid: `merged_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        source_lorebook: undefined,
        enabled: entry.enabled !== false
      }));
      handleUpdateEntries([...activeBook.entries, ...cloned]);
      showToast(`Đã gộp ${cloned.length} quy tắc từ "${sourceBook.name}".`, "success");
      setIsMergeDialogOpen(false);
    };

    const handleDeleteBook = () => {
      if (!activeBook || activeBook.kind !== "standalone") return;
      if (window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${activeBook.name}" không?`)) {
        deleteLorebook(activeBook.name);
        const remaining = allBooks.find(book => book.id !== activeBook.id);
        setSelectedId(remaining?.id || "");
      }
    };

    const runMenuAction = action => {
      setIsOptionsOpen(false);
      action();
    };

    const isCharacterDefault = activeBook?.kind === "character";

    return (0, jsxRuntime.jsxs)("div", {
      className: "max-w-4xl mx-auto space-y-5",
      children: [
        (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3",
          children: [
            (0, jsxRuntime.jsx)("h2", {
              className: "text-xl font-bold text-slate-100",
              children: "Sổ tay Thế giới"
            }),
            (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-3",
              children: [
                (0, jsxRuntime.jsx)("select", {
                  "aria-label": "Chọn sổ tay thế giới",
                  value: effectiveSelectedId,
                  onChange: event => setSelectedId(event.target.value),
                  className: "flex-grow min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500",
                  children: allBooks.length === 0
                    ? (0, jsxRuntime.jsx)("option", { value: "", children: "Chưa có sổ tay nào" })
                    : allBooks.map(book => (0, jsxRuntime.jsx)("option", {
                        value: book.id,
                        children: book.label
                      }, book.id))
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
                      "aria-label": "Tùy chọn Sổ tay Thế giới",
                      className: "absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-30",
                      children: [
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          onClick: () => runMenuAction(() => openNameDialog("create")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800",
                          children: "Tạo mới sổ tay"
                        }),
                        !isCharacterDefault && (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeBook,
                          onClick: () => runMenuAction(() => openNameDialog("rename")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Đổi tên"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeBook,
                          onClick: () => runMenuAction(() => openNameDialog("duplicate")),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Nhân bản"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeBook || mergeCandidates.length === 0,
                          onClick: () => runMenuAction(openMergeDialog),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Gộp"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeBook,
                          onClick: () => runMenuAction(handleToggleGlobal),
                          className: "w-full text-left px-4 py-2.5 text-sm text-sky-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: activeBook?.isGlobal ? "Bỏ áp dụng toàn cầu" : "Áp dụng toàn cầu"
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
                          disabled: !activeBook,
                          onClick: () => runMenuAction(() => setIsExportDialogOpen(true)),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Xuất"
                        }),
                        !isCharacterDefault && (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeBook,
                          onClick: () => runMenuAction(handleDeleteBook),
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
              "aria-label": "Nhập sổ tay JSON",
              className: "sr-only",
              accept: ".json",
              multiple: true,
              onChange: event => {
                if (event.target.files && event.target.files.length > 0) {
                  loadLorebooks(event.target.files);
                  event.target.value = "";
                }
              }
            })
          ]
        }),
        activeBook && LorebookEntryList
          ? (0, jsxRuntime.jsx)(LorebookEntryList, {
              entries: activeBook.entries,
              onUpdate: handleUpdateEntries
            })
          : (0, jsxRuntime.jsx)("div", {
              className: "flex items-center justify-center py-16 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700",
              children: (0, jsxRuntime.jsx)("p", {
                className: "text-center text-slate-500 font-semibold",
                children: "Chưa có sổ tay nào. Hãy tạo mới hoặc nhập từ Tùy chọn khác."
              })
            }),
        nameDialogMode && (0, jsxRuntime.jsx)("div", {
          className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4",
          onClick: () => setNameDialogMode(null),
          children: (0, jsxRuntime.jsxs)("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": nameDialogMode === "create" ? "Tạo mới sổ tay" : nameDialogMode === "rename" ? "Đổi tên sổ tay" : "Nhân bản sổ tay",
            className: "w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4",
            onClick: event => event.stopPropagation(),
            children: [
              (0, jsxRuntime.jsx)("h3", {
                className: "text-lg font-bold text-slate-100",
                children: nameDialogMode === "create" ? "Tạo mới sổ tay" : nameDialogMode === "rename" ? "Đổi tên sổ tay" : "Nhân bản thành sổ tay độc lập"
              }),
              (0, jsxRuntime.jsx)("input", {
                type: "text",
                "aria-label": "Tên sổ tay",
                value: nameInput,
                onChange: event => setNameInput(event.target.value),
                placeholder: "Nhập tên sổ tay...",
                className: "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              }),
              (0, jsxRuntime.jsxs)("div", {
                className: "flex justify-end gap-2",
                children: [
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    onClick: () => setNameDialogMode(null),
                    className: "px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold",
                    children: "Hủy"
                  }),
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    onClick: handleConfirmNameDialog,
                    className: "px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold",
                    children: "Đồng ý"
                  })
                ]
              })
            ]
          })
        }),
        isMergeDialogOpen && (0, jsxRuntime.jsx)("div", {
          className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4",
          onClick: () => setIsMergeDialogOpen(false),
          children: (0, jsxRuntime.jsxs)("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Gộp sổ tay",
            className: "w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4",
            onClick: event => event.stopPropagation(),
            children: [
              (0, jsxRuntime.jsx)("h3", {
                className: "text-lg font-bold text-slate-100",
                children: "Gộp sổ tay"
              }),
              (0, jsxRuntime.jsx)("select", {
                "aria-label": "Chọn sổ tay cần gộp",
                value: mergeSourceId,
                onChange: event => setMergeSourceId(event.target.value),
                className: "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500",
                children: mergeCandidates.map(book => (0, jsxRuntime.jsx)("option", {
                  value: book.id,
                  children: book.label
                }, book.id))
              }),
              (0, jsxRuntime.jsxs)("div", {
                className: "flex justify-end gap-2",
                children: [
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    onClick: () => setIsMergeDialogOpen(false),
                    className: "px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold",
                    children: "Hủy"
                  }),
                  (0, jsxRuntime.jsx)("button", {
                    type: "button",
                    disabled: !mergeSourceId,
                    onClick: handleConfirmMerge,
                    className: "px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-40",
                    children: "Đồng ý"
                  })
                ]
              })
            ]
          })
        }),
        (0, jsxRuntime.jsx)(FileNameDialog, {
          isOpen: isExportDialogOpen,
          onClose: () => setIsExportDialogOpen(false),
          onConfirm: fileName => {
            if (!activeBook) return;
            try {
              const payload = activeBook.kind === "standalone"
                ? activeBook.record.book
                : { name: activeBook.name, entries: activeBook.entries };
              const downloadUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
              const anchor = document.createElement("a");
              anchor.setAttribute("href", downloadUrl);
              anchor.setAttribute("download", fileName);
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            } catch (exportError) {
              console.error("Failed to export lorebook:", exportError);
              showToast("Lỗi khi xuất sổ tay.", "error");
            }
          },
          initialFileName: activeBook?.name?.replace(/\s*\(Mặc định\)$/, "") || "lorebook",
          title: "Xuất Sổ tay Thế giới",
          fileExtension: ".json"
        })
      ]
    });
  };
}
