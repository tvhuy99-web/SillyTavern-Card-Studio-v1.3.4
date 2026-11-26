// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

export function createCharacterScreen(getDependencies) {
  return function CharacterScreen() {
    const {
      CharacterDetailSections,
      NEW_CHARACTER_ID,
      LorebookManager,
      emptyCharacterCard,
      react,
      CharacterTools,
      useToast,
      characterStore,
      Icon,
      LoadingIndicator,
      jsxRuntime
    } = getDependencies();
    let {
      characters: characters,
      activeCharacterFileName: activeCharacterFileName,
      isLoading: isLoading,
      error: error,
      loadCharacter: loadCharacter,
      deleteActiveCharacter: deleteActiveCharacter,
      updateActiveCharacter: updateActiveCharacter,
      createNewCharacter: createNewCharacter,
      setActiveCharacterFileName: setActiveCharacterFileName,
      setAvatarForActiveCharacter: setAvatarForActiveCharacter
    } = characterStore();
    let [isLorebookManagerOpen, setIsLorebookManagerOpen] = (0, react.useState)(false);
    let fileInputRef = (0, react.useRef)(null);
    let {
      showToast: showToast
    } = useToast();
    let [draftCard, setDraftCard] = (0, react.useState)(emptyCharacterCard);
    let [draftAvatarUrl, setDraftAvatarUrl] = (0, react.useState)(null);
    let [draftAvatarFile, setDraftAvatarFile] = (0, react.useState)(null);
    let [searchQuery, setSearchQuery] = (0, react.useState)("");
    let filteredCharacters = (0, react.useMemo)(() => {
      let query = searchQuery.trim().toLocaleLowerCase("vi");
      return query ? characters.filter(character => `${character.card.name || ""} ${character.fileName || ""} ${(character.card.tags || []).join(" ")}`.toLocaleLowerCase("vi").includes(query)) : characters;
    }, [characters, searchQuery]);
    let activeEntry = activeCharacterFileName === NEW_CHARACTER_ID ? {
      card: draftCard,
      fileName: "New Character",
      avatarUrl: draftAvatarUrl,
      avatarFile: draftAvatarFile
    } : activeCharacterFileName ? characters.find(character => character.fileName === activeCharacterFileName) : null;
    return isLoading && 0 === characters.length ? (0, jsxRuntime.jsx)("div", {
      className: "flex justify-center items-center h-64",
      children: (0, jsxRuntime.jsx)(LoadingIndicator, {
        message: "Đang tải nhân vật..."
      })
    }) : isLorebookManagerOpen && activeEntry ? (0, jsxRuntime.jsx)(LorebookManager, {
      initialEntries: activeEntry.card.char_book?.entries || [],
      initialAttached: activeEntry.card.attached_lorebooks || [],
      onSave: (entries, attachedLorebooks) => {
        if (!activeEntry) return;
        let updatedCard = JSON.parse(JSON.stringify(activeEntry.card));
        updatedCard.char_book ||= {
          entries: []
        };
        updatedCard.char_book.entries = entries;
        updatedCard.attached_lorebooks = attachedLorebooks;
        if (activeCharacterFileName === NEW_CHARACTER_ID) {
          setDraftCard(updatedCard);
        } else {
          updateActiveCharacter(updatedCard);
        }
        setIsLorebookManagerOpen(false);
      },
      onClose: () => setIsLorebookManagerOpen(false),
      characterId: activeEntry.fileName
    }) : (0, jsxRuntime.jsxs)("div", {
      className: "workspace-grid grid grid-cols-1 md:grid-cols-3 gap-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "workspace-sidebar md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3 max-h-[calc(100vh-150px)]",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between",
          children: [(0, jsxRuntime.jsxs)("h2", {
            className: "text-lg font-bold text-slate-200",
            children: ["Nhân vật", (0, jsxRuntime.jsx)("span", {
              className: "sidebar-count",
              children: characters.length
            })]
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              setDraftCard(JSON.parse(JSON.stringify(emptyCharacterCard)));
              draftAvatarUrl && URL.revokeObjectURL(draftAvatarUrl);
              setDraftAvatarUrl(null);
              setDraftAvatarFile(null);
              setActiveCharacterFileName(NEW_CHARACTER_ID);
            },
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
            placeholder: "Tìm tên, tệp hoặc thẻ...",
            "aria-label": "Tìm nhân vật"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex-grow overflow-hidden flex flex-col",
          children: (0, jsxRuntime.jsx)("div", {
            className: "flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1",
            children: 0 === filteredCharacters.length ? (0, jsxRuntime.jsx)("p", {
              className: "text-slate-500 text-sm italic text-center py-4",
              children: searchQuery ? "Không tìm thấy nhân vật phù hợp." : "Chưa có nhân vật. Hãy tải lên hoặc tạo mới."
            }) : filteredCharacters.map(character => (0, jsxRuntime.jsxs)("button", {
              onClick: () => setActiveCharacterFileName(character.fileName),
              className: "w-full text-left px-3 py-2 rounded-lg  text-sm font-medium flex items-center gap-3 " + (activeCharacterFileName === character.fileName ? "bg-sky-600/30 text-white ring-1 ring-sky-500/50" : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"),
              children: [(0, jsxRuntime.jsx)("div", {
                className: "w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600/50",
                children: character.avatarUrl ? (0, jsxRuntime.jsx)("img", {
                  src: character.avatarUrl,
                  alt: "",
                  className: "w-full h-full object-cover"
                }) : (0, jsxRuntime.jsx)("div", {
                  className: "w-full h-full flex items-center justify-center text-[10px] text-slate-500",
                  "aria-hidden": "true",
                  children: "?"
                })
              }), (0, jsxRuntime.jsx)("span", {
                className: "truncate",
                children: character.card.name || character.fileName
              })]
            }, character.fileName))
          })
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mt-auto space-y-2 flex-shrink-0 pt-3 border-t border-slate-700/50",
          children: [error && (0, jsxRuntime.jsx)("p", {
            className: "text-red-400 text-xs p-2 bg-red-900/30 rounded",
            children: error
          }), (0, jsxRuntime.jsx)("input", {
            ref: fileInputRef,
            type: "file",
            "aria-label": "Tệp nhân vật để nhập",
            className: "sr-only",
            accept: ".png,.apng,.json,.charx,application/json,application/zip,image/png",
            onChange: event => {
              event.target.files && event.target.files.length > 0 && (loadCharacter(event.target.files[0]), event.target.value = "");
            },
            "aria-hidden": "true",
            tabIndex: -1
          }), (0, jsxRuntime.jsxs)("div", {
            className: "grid grid-cols-2 gap-2",
            children: [(0, jsxRuntime.jsx)("button", {
              onClick: () => fileInputRef.current?.click(),
              className: "w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 text-xs rounded-lg  ",
              children: "Tải lên (Import)"
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => {
                activeEntry && window.confirm(`Bạn có chắc chắn muốn xóa nhân vật "${activeEntry.card.name || activeEntry.fileName}" không?`) && deleteActiveCharacter();
              },
              disabled: !activeEntry || activeCharacterFileName === NEW_CHARACTER_ID,
              className: "w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg   disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/50",
              children: "Xóa"
            })]
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "workspace-content md:col-span-2",
        children: activeEntry ? (0, jsxRuntime.jsxs)("div", {
          className: "app-editor-grid grid grid-cols-1 lg:grid-cols-3 gap-6",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "lg:col-span-2",
            children: (0, jsxRuntime.jsx)(CharacterDetailSections, {
              card: activeEntry.card,
              onUpdate: activeCharacterFileName === NEW_CHARACTER_ID ? setDraftCard : updateActiveCharacter,
              onOpenLorebook: () => setIsLorebookManagerOpen(true)
            })
          }), (0, jsxRuntime.jsx)("div", {
            className: "app-tool-column lg:col-span-1",
            children: (0, jsxRuntime.jsx)(CharacterTools, {
              card: activeEntry.card,
              onUpdate: activeCharacterFileName === NEW_CHARACTER_ID ? setDraftCard : updateActiveCharacter,
              fileName: activeEntry.fileName,
              avatarUrl: activeEntry.avatarUrl,
              avatarFile: activeEntry.avatarFile,
              setAvatar: (url, file) => {
                if (activeCharacterFileName === NEW_CHARACTER_ID) {
                  draftAvatarUrl && draftAvatarUrl !== url && URL.revokeObjectURL(draftAvatarUrl);
                  setDraftAvatarUrl(url);
                  setDraftAvatarFile(file);
                } else {
                  activeCharacterFileName && setAvatarForActiveCharacter(activeCharacterFileName, url, file);
                }
              },
              isNewCharacter: activeCharacterFileName === NEW_CHARACTER_ID,
              onSaveNew: async () => {
                if (draftCard.name.trim()) try {
                  await createNewCharacter(draftCard, draftAvatarFile);
                  showToast("Đã tạo nhân vật thành công!", "success");
                } catch (error) {
                  showToast(`Lỗi tạo nhân vật: ${error instanceof Error ? error.message : String(error)}`, "error");
                } else showToast("Tên nhân vật không được để trống!", "error");
              }
            })
          })]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 min-h-[60vh]",
          children: (0, jsxRuntime.jsx)("div", {
            className: "text-center text-slate-500",
            children: (0, jsxRuntime.jsx)("p", {
              className: "font-semibold",
              children: "Chọn hoặc tạo mới nhân vật"
            })
          })
        })
      })]
    });
  };
}
