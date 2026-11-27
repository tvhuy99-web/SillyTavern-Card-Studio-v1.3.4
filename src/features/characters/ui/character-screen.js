import { createChoiceSelect } from '../../../ui/components/dialog-focus.js';
const CHARACTER_TABS = [
  { id: "basic", label: "Cơ bản" },
  { id: "dialogue", label: "Hội thoại & Kịch bản" },
  { id: "world", label: "Sổ tay & RPG" },
  { id: "advanced", label: "Nâng cao" }
];

export function createCharacterScreen(getDependencies) {
  const ChoiceSelect = createChoiceSelect(getDependencies);
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
      LoadingIndicator,
      jsxRuntime
    } = getDependencies();
    const {
      characters,
      activeCharacterFileName,
      isLoading,
      error,
      loadCharacter,
      deleteActiveCharacter,
      updateActiveCharacter,
      createNewCharacter,
      setActiveCharacterFileName,
      setAvatarForActiveCharacter
    } = characterStore();

    const [isLorebookManagerOpen, setIsLorebookManagerOpen] = (0, react.useState)(false);
    const [activeSubTab, setActiveSubTab] = (0, react.useState)("basic");
    const [isOptionsOpen, setIsOptionsOpen] = (0, react.useState)(false);
    const [isExportModalOpen, setIsExportModalOpen] = (0, react.useState)(false);
    const fileInputRef = (0, react.useRef)(null);
    const menuRef = (0, react.useRef)(null);
    const { showToast } = useToast();

    const [draftCard, setDraftCard] = (0, react.useState)(emptyCharacterCard);
    const [draftAvatarUrl, setDraftAvatarUrl] = (0, react.useState)(null);
    const [draftAvatarFile, setDraftAvatarFile] = (0, react.useState)(null);

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

    const isNewCharacter = activeCharacterFileName === NEW_CHARACTER_ID;
    const activeEntry = isNewCharacter
      ? {
          card: draftCard,
          fileName: "New Character",
          avatarUrl: draftAvatarUrl,
          avatarFile: draftAvatarFile
        }
      : activeCharacterFileName
        ? characters.find(character => character.fileName === activeCharacterFileName) || null
        : null;

    const handleStartCreate = () => {
      setDraftCard(JSON.parse(JSON.stringify(emptyCharacterCard)));
      if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
      setDraftAvatarUrl(null);
      setDraftAvatarFile(null);
      setActiveCharacterFileName(NEW_CHARACTER_ID);
      setActiveSubTab("basic");
    };

    const handleDeleteCharacter = () => {
      if (activeEntry && !isNewCharacter && window.confirm(`Bạn có chắc chắn muốn xóa nhân vật "${activeEntry.card.name || activeEntry.fileName}" không?`)) {
        deleteActiveCharacter();
      }
    };

    const runMenuAction = action => {
      setIsOptionsOpen(false);
      action();
    };

    const handleSetAvatar = (url, file) => {
      if (isNewCharacter) {
        if (draftAvatarUrl && draftAvatarUrl !== url) URL.revokeObjectURL(draftAvatarUrl);
        setDraftAvatarUrl(url);
        setDraftAvatarFile(file);
      } else if (activeCharacterFileName) {
        setAvatarForActiveCharacter(activeCharacterFileName, url, file);
      }
    };

    const handleSaveNew = async () => {
      if (!draftCard.name.trim()) {
        showToast("Tên nhân vật không được để trống!", "error");
        return;
      }
      try {
        await createNewCharacter(draftCard, draftAvatarFile);
        showToast("Đã tạo nhân vật thành công!", "success");
      } catch (saveError) {
        showToast(`Lỗi tạo nhân vật: ${saveError instanceof Error ? saveError.message : String(saveError)}`, "error");
      }
    };

    if (isLoading && characters.length === 0) {
      return (0, jsxRuntime.jsx)("div", {
        className: "flex justify-center items-center h-64",
        children: (0, jsxRuntime.jsx)(LoadingIndicator, {
          message: "Đang tải nhân vật..."
        })
      });
    }

    if (isLorebookManagerOpen && activeEntry) {
      return (0, jsxRuntime.jsx)(LorebookManager, {
        initialEntries: activeEntry.card.char_book?.entries || [],
        initialAttached: activeEntry.card.attached_lorebooks || [],
        onSave: (entries, attachedLorebooks) => {
          const updatedCard = JSON.parse(JSON.stringify(activeEntry.card));
          updatedCard.char_book ||= { entries: [] };
          updatedCard.char_book.entries = entries;
          updatedCard.attached_lorebooks = attachedLorebooks;
          if (isNewCharacter) {
            setDraftCard(updatedCard);
          } else {
            updateActiveCharacter(updatedCard);
          }
          setIsLorebookManagerOpen(false);
        },
        onClose: () => setIsLorebookManagerOpen(false),
        characterId: activeEntry.fileName
      });
    }

    const activeTabMeta = CHARACTER_TABS.find(tab => tab.id === activeSubTab) || CHARACTER_TABS[0];
    const sharedToolProps = activeEntry ? {
      card: activeEntry.card,
      onUpdate: isNewCharacter ? setDraftCard : updateActiveCharacter,
      fileName: activeEntry.fileName,
      avatarUrl: activeEntry.avatarUrl,
      avatarFile: activeEntry.avatarFile,
      setAvatar: handleSetAvatar,
      isNewCharacter,
      onSaveNew: handleSaveNew
    } : null;

    return (0, jsxRuntime.jsxs)("div", {
      className: "max-w-4xl mx-auto space-y-5",
      children: [
        (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3",
          children: [
            (0, jsxRuntime.jsx)("h2", {
              className: "text-xl font-bold text-slate-100",
              children: "Nhân vật"
            }),
            (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-3",
              children: [
                (0, jsxRuntime.jsxs)(ChoiceSelect, {
                  "aria-label": "Chọn nhân vật",
                  value: activeCharacterFileName || "",
                  onChange: event => setActiveCharacterFileName(event.target.value),
                  className: "flex-grow min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500",
                  children: [
                    isNewCharacter && (0, jsxRuntime.jsx)("option", {
                      value: NEW_CHARACTER_ID,
                      children: draftCard.name?.trim() ? `${draftCard.name.trim()} (Mới)` : "Nhân vật mới (chưa lưu)"
                    }),
                    characters.length === 0 && !isNewCharacter
                      ? (0, jsxRuntime.jsx)("option", { value: "", children: "Chưa có nhân vật" })
                      : characters.map(character => (0, jsxRuntime.jsx)("option", {
                          value: character.fileName,
                          children: character.card.name || character.fileName
                        }, character.fileName))
                  ]
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
                      "aria-label": "Tùy chọn nhân vật",
                      className: "absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-30",
                      children: [
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          onClick: () => runMenuAction(handleStartCreate),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800",
                          children: "Tạo mới"
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
                          disabled: !activeEntry || isNewCharacter,
                          onClick: () => runMenuAction(() => setIsExportModalOpen(true)),
                          className: "w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
                          children: "Xuất"
                        }),
                        (0, jsxRuntime.jsx)("button", {
                          type: "button",
                          role: "menuitem",
                          disabled: !activeEntry || isNewCharacter,
                          onClick: () => runMenuAction(handleDeleteCharacter),
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
              "aria-label": "Tệp nhân vật để nhập",
              className: "sr-only",
              accept: ".png,.apng,.json,.charx,application/json,application/zip,image/png",
              onChange: event => {
                if (event.target.files && event.target.files.length > 0) {
                  loadCharacter(event.target.files[0]);
                  event.target.value = "";
                }
              },
              "aria-hidden": "true",
              tabIndex: -1
            })
          ]
        }),
        activeEntry ? (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [
            (0, jsxRuntime.jsx)("div", {
              role: "tablist",
              "aria-label": "Mục chỉnh sửa nhân vật",
              className: "flex flex-wrap justify-center gap-1 p-1 bg-slate-800 rounded-lg",
              children: CHARACTER_TABS.map(tab => (0, jsxRuntime.jsx)("button", {
                id: `character-subtab-${tab.id}`,
                type: "button",
                role: "tab",
                "aria-selected": activeSubTab === tab.id ? "true" : "false",
                "aria-controls": `character-subtabpanel-${tab.id}`,
                onClick: () => setActiveSubTab(tab.id),
                className: "px-3.5 py-2 text-sm font-semibold rounded-md transition-colors " + (
                  activeSubTab === tab.id
                    ? "bg-sky-600 text-white shadow"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                ),
                children: tab.label
              }, tab.id))
            }),
            (0, jsxRuntime.jsxs)("div", {
              id: `character-subtabpanel-${activeSubTab}`,
              role: "tabpanel",
              "aria-labelledby": `character-subtab-${activeSubTab}`,
              className: "focus:outline-none space-y-4",
              children: [
                (0, jsxRuntime.jsx)("h2", {
                  className: "text-lg font-bold text-slate-200",
                  children: activeTabMeta.label
                }),
                (0, jsxRuntime.jsx)(CharacterDetailSections, {
                  card: activeEntry.card,
                  onUpdate: isNewCharacter ? setDraftCard : updateActiveCharacter,
                  onOpenLorebook: () => setIsLorebookManagerOpen(true),
                  activeTab: activeSubTab,
                  avatarSlot: (0, jsxRuntime.jsx)(CharacterTools, {
                    ...sharedToolProps,
                    section: "avatar"
                  }),
                  tokensSlot: (0, jsxRuntime.jsx)(CharacterTools, {
                    ...sharedToolProps,
                    section: "tokens"
                  })
                })
              ]
            }),
            isNewCharacter && (0, jsxRuntime.jsx)(CharacterTools, {
              ...sharedToolProps,
              section: "save-new"
            }),
            (0, jsxRuntime.jsx)(CharacterTools, {
              ...sharedToolProps,
              section: "export-modal",
              isExportModalOpen,
              onCloseExportModal: () => setIsExportModalOpen(false)
            })
          ]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center py-16 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700",
          children: (0, jsxRuntime.jsx)("p", {
            className: "text-center text-slate-500 font-semibold",
            children: "Chọn hoặc tạo mới nhân vật"
          })
        })
      ]
    });
  };
}
