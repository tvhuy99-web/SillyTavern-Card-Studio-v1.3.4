// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.
function resolveCatalogScreenDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    Icon: deps.Icon,
    LoadingIndicator: deps.LoadingIndicator,
    TextInput: deps.TextInput,
    TextArea: deps.TextArea,
    ToggleSwitch: deps.ToggleSwitch,
    useToast: deps.useToast,
    FileNameDialog: deps.FileNameDialog,
    lorebookStore: deps.lorebookStore,
    characterStore: deps.characterStore,
    presetStore: deps.presetStore,
    personaStore: deps.personaStore,
    CharacterDetailSections: deps.CharacterDetailSections,
    CharacterTools: deps.CharacterTools,
    LorebookManager: deps.LorebookManager,
    PromptManager: deps.PromptManager,
    PresetConfiguration: deps.PresetConfiguration,
    PresetNameDialog: deps.PresetNameDialog,
    PresetTab: deps.PresetTab,
    PersonaEditor: deps.PersonaEditor,
    NEW_CHARACTER_ID: deps.NEW_CHARACTER_ID,
    emptyCharacterCard: deps.emptyCharacterCard,
    encodeBase64Utf8: deps.encodeBase64Utf8,
    createPngTextChunk: deps.createPngTextChunk,
    resolveExportSpec: deps.resolveExportSpec,
    buildExportCard: deps.buildExportCard,
    isPngBytes: deps.isPngBytes,
    downloadBlob: deps.downloadBlob,
    estimateTokens: deps.estimateTokens
  };
}
export function createCharacterTools(getDependencies) {
  return function CharacterTools({
    card: card,
    fileName: fileName,
    avatarUrl: avatarUrl,
    avatarFile: avatarFile,
    setAvatar: setAvatar,
    isNewCharacter = false,
    onSaveNew: onSaveNew
  }) {
    const {
      createPngTextChunk,
      encodeBase64Utf8,
      downloadBlob,
      buildExportCard,
      FileNameDialog,
      isPngBytes,
      estimateTokens,
      react,
      LoadingIndicator,
      resolveExportSpec,
      lorebookStore,
      jsxRuntime
    } = resolveCatalogScreenDeps(getDependencies);
    let {
      lorebooks: lorebooks
    } = lorebookStore();
    let [isExporting, setIsExporting] = (0, react.useState)(false);
    let [exportError, setExportError] = (0, react.useState)("");
    let avatarInputRef = (0, react.useRef)(null);
    let [isFileNameDialogOpen, setIsFileNameDialogOpen] = (0, react.useState)(false);
    let [exportFormat, setExportFormat] = (0, react.useState)("json");
    let prepareCardForExport = (0, react.useCallback)(sourceCard => {
      let exportCard = JSON.parse(JSON.stringify(sourceCard));
      if (exportCard.attached_lorebooks && exportCard.attached_lorebooks.length > 0) {
        let attachedNames = exportCard.attached_lorebooks;
        let mergedEntries = [...(exportCard.char_book?.entries || [])];
        attachedNames.forEach(lorebookName => {
          let lorebook = lorebooks.find(item => item.name === lorebookName);
          let alreadyIncluded = mergedEntries.some(entry => entry.source_lorebook === lorebookName);
          if (lorebook && lorebook.book.entries && !alreadyIncluded) {
            let clonedEntries = JSON.parse(JSON.stringify(lorebook.book.entries));
            clonedEntries.forEach(entry => {
              entry.source_lorebook = lorebookName;
              entry.uid ||= `embed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            });
            mergedEntries.push(...clonedEntries);
          }
        });
        exportCard.char_book ||= {
          entries: []
        };
        exportCard.char_book.entries = mergedEntries;
        delete exportCard.attached_lorebooks;
      }
      exportCard.char_book && 0 === exportCard.char_book.entries.length && delete exportCard.char_book;
      return exportCard;
    }, [lorebooks]);
    let tokenStats = (0, react.useMemo)(() => {
      let descriptionTokens = estimateTokens(card.description);
      let personalityTokens = estimateTokens(card.personality);
      let greetingTokens = estimateTokens(card.first_mes);
      let exampleTokens = estimateTokens(card.mes_example);
      return {
        description: descriptionTokens,
        personality: personalityTokens,
        first_mes: greetingTokens,
        mes_example: exampleTokens,
        total: descriptionTokens + personalityTokens + greetingTokens + exampleTokens
      };
    }, [card]);
    let openExportDialog = format => {
      setExportFormat(format);
      setIsFileNameDialogOpen(true);
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "app-tool-panel bg-slate-800/50 p-6 rounded-xl shadow-lg space-y-6 flex flex-col",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex-grow space-y-6",
        children: [(0, jsxRuntime.jsxs)("div", {
          children: [(0, jsxRuntime.jsx)("h3", {
            className: "text-xl font-bold text-sky-400 mb-2",
            children: "Công cụ Thẻ"
          }), (0, jsxRuntime.jsx)("p", {
            className: "text-sm text-slate-400 mb-4",
            children: "Quản lý tài nguyên, kiểm tra token và xuất bản."
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/50 p-4 rounded-lg",
          children: [(0, jsxRuntime.jsx)("h4", {
            className: "font-semibold text-lg text-slate-200 mb-3",
            children: "Số lượng token ước tính"
          }), (0, jsxRuntime.jsxs)("dl", {
            className: "grid grid-cols-2 gap-x-4 gap-y-2 text-sm",
            children: [(0, jsxRuntime.jsx)("dt", {
              className: "text-slate-400",
              children: "Mô tả:"
            }), (0, jsxRuntime.jsx)("dd", {
              className: "text-right font-mono text-amber-400",
              children: tokenStats.description
            }), (0, jsxRuntime.jsx)("dt", {
              className: "text-slate-400",
              children: "Tính cách:"
            }), (0, jsxRuntime.jsx)("dd", {
              className: "text-right font-mono text-amber-400",
              children: tokenStats.personality
            }), (0, jsxRuntime.jsx)("dt", {
              className: "text-slate-400",
              children: "Lời chào đầu tiên:"
            }), (0, jsxRuntime.jsx)("dd", {
              className: "text-right font-mono text-amber-400",
              children: tokenStats.first_mes
            }), (0, jsxRuntime.jsx)("dt", {
              className: "text-slate-400",
              children: "Ví dụ hội thoại:"
            }), (0, jsxRuntime.jsx)("dd", {
              className: "text-right font-mono text-amber-400",
              children: tokenStats.mes_example
            }), (0, jsxRuntime.jsx)("div", {
              className: "border-t border-slate-700 col-span-2 my-1"
            }), (0, jsxRuntime.jsx)("dt", {
              className: "text-slate-300 font-bold",
              children: "Tổng token cốt lõi:"
            }), (0, jsxRuntime.jsx)("dd", {
              className: "text-right font-mono text-amber-300 font-bold",
              children: tokenStats.total
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "token-budget mt-4 pt-3 border-t border-slate-700/70",
            children: [(0, jsxRuntime.jsxs)("div", {
              className: "mb-2 flex items-center justify-between text-xs",
              children: [(0, jsxRuntime.jsx)("span", {
                className: "font-semibold text-slate-400",
                children: "Mốc tham chiếu 8K"
              }), (0, jsxRuntime.jsxs)("span", {
                className: tokenStats.total > 8192 ? "font-mono font-bold text-rose-400" : tokenStats.total > 6553 ? "font-mono font-bold text-amber-400" : "font-mono font-bold text-emerald-400",
                children: [Math.min(100, Math.round(tokenStats.total / 8192 * 100)), "%"]
              })]
            }), (0, jsxRuntime.jsx)("div", {
              className: "h-2 overflow-hidden rounded-full bg-slate-950/80",
              children: (0, jsxRuntime.jsx)("div", {
                className: "h-full rounded-full transition-all " + (tokenStats.total > 8192 ? "bg-rose-500" : tokenStats.total > 6553 ? "bg-amber-500" : "bg-emerald-500"),
                style: {
                  width: `${Math.min(100, tokenStats.total / 8192 * 100)}%`
                }
              })
            }), (0, jsxRuntime.jsx)("p", {
              className: "mt-2 text-[11px] leading-relaxed text-slate-500",
              children: tokenStats.total > 8192 ? "Nội dung cốt lõi đã vượt mốc tham chiếu; nên rút gọn trước khi dùng mô hình có cửa sổ ngữ cảnh nhỏ." : "Đây là mốc tham chiếu, không phải giới hạn bắt buộc của thẻ."
            })]
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "flex-shrink-0 space-y-4 pt-6 border-t border-slate-700",
        children: [(0, jsxRuntime.jsx)("h3", {
          className: "text-xl font-bold text-sky-400",
          children: isNewCharacter ? "Tạo Avatar" : "Xuất Thẻ"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-4",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "w-24 h-24 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group",
            children: avatarUrl ? (0, jsxRuntime.jsx)("img", {
              src: avatarUrl,
              alt: "Avatar",
              className: "w-full h-full object-cover"
            }) : (0, jsxRuntime.jsx)("div", {
              className: "w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2 border border-slate-700",
              children: "Chưa có avatar"
            })
          }), (0, jsxRuntime.jsxs)("div", {
            className: "flex-grow",
            children: [(0, jsxRuntime.jsx)("input", {
              type: "file",
              "aria-label": "Chọn ảnh đại diện",
              accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
              onChange: event => {
                let file = event.target.files?.[0];
                file && (setAvatar(URL.createObjectURL(file), file), event.target.value = "");
              },
              className: "sr-only",
              ref: avatarInputRef
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => avatarInputRef.current?.click(),
              className: "w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg  ",
              children: avatarUrl ? "Thay đổi Avatar" : "Tải lên Avatar"
            }), (0, jsxRuntime.jsx)("p", {
              className: "text-xs text-slate-500 mt-2",
              children: "Hỗ trợ PNG, JPEG, WebP, GIF và AVIF; khi xuất thẻ sẽ tự chuyển sang PNG."
            })]
          })]
        }), exportError && (0, jsxRuntime.jsx)("p", {
          className: "text-red-400 bg-red-900/50 p-3 rounded-lg text-sm",
          children: exportError
        }), isNewCharacter ? (0, jsxRuntime.jsxs)("button", {
          onClick: onSaveNew,
          className: "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg   shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
              clipRule: "evenodd"
            })
          }), "Lưu Nhân Vật Mới"]
        }) : (0, jsxRuntime.jsxs)("div", {
          className: "grid grid-cols-2 gap-2",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: () => openExportDialog("json"),
            className: "w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg  ",
            children: "Xuất ra JSON"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => openExportDialog("png"),
            disabled: !avatarFile || isExporting,
            className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg  ",
            children: isExporting ? (0, jsxRuntime.jsx)(LoadingIndicator, {
              message: ""
            }) : "Xuất ra PNG"
          })]
        })]
      }), (0, jsxRuntime.jsx)(FileNameDialog, {
        isOpen: isFileNameDialogOpen,
        onClose: () => setIsFileNameDialogOpen(false),
        onConfirm: async fileName => {
          let exportCard = prepareCardForExport(card);
          if ("json" === exportFormat) ((cardData, downloadName) => {
            let json = JSON.stringify(buildExportCard(cardData), null, 2);
            downloadBlob(new Blob([json], {
              type: "application/json;charset=utf-8"
            }), downloadName);
          })(exportCard, fileName);else {
            if (!card || !avatarFile) return;
            setIsExporting(true);
            setExportError("");
            try {
              await (async (cardData, sourceFile, downloadName) => {
                let pngWithMetadata = ((arrayBuffer, cardData) => {
                  let bytes = new Uint8Array(arrayBuffer);
                  if (!isPngBytes(bytes)) throw Error("Avatar không phải PNG hợp lệ sau khi chuyển đổi.");
                  let view = new DataView(arrayBuffer);
                  let chunks = [];
                  let endChunk = null;
                  let offset = 8;
                  let chunkCount = 0;
                  for (; offset < bytes.byteLength;) {
                    if (++chunkCount > 1e5 || offset + 12 > bytes.byteLength) throw Error("Cấu trúc chunk PNG không hợp lệ.");
                    let chunkLength = view.getUint32(offset);
                    let nextOffset = offset + 12 + chunkLength;
                    if (nextOffset > bytes.byteLength || nextOffset <= offset) throw Error("PNG có chunk vượt quá giới hạn tệp.");
                    let chunkType = new TextDecoder("latin1").decode(bytes.subarray(offset + 4, offset + 8));
                    let chunk = bytes.slice(offset, nextOffset);
                    if ("IEND" === chunkType) {
                      endChunk = chunk;
                      break;
                    }
                    let isCardMetadata = false;
                    if ("tEXt" === chunkType) {
                      let chunkData = bytes.subarray(offset + 8, offset + 8 + chunkLength);
                      let separator = chunkData.indexOf(0);
                      if (separator > 0) {
                        let keyword = new TextDecoder("latin1").decode(chunkData.subarray(0, separator)).toLowerCase();
                        isCardMetadata = "chara" === keyword || "ccv3" === keyword;
                      }
                    }
                    isCardMetadata || chunks.push(chunk);
                    offset = nextOffset;
                  }
                  if (!endChunk) throw Error("PNG bị hỏng hoặc thiếu chunk IEND.");
                  let metadataChunks = [createPngTextChunk("chara", encodeBase64Utf8(JSON.stringify(buildExportCard(cardData, "v2"))))];
                  "v3" === resolveExportSpec(cardData, "auto") && metadataChunks.push(createPngTextChunk("ccv3", encodeBase64Utf8(JSON.stringify(buildExportCard(cardData, "v3")))));
                  let totalBytes = 8 + [...chunks, ...metadataChunks, endChunk].reduce((total, chunk) => total + chunk.length, 0);
                  let output = new Uint8Array(totalBytes);
                  output.set(bytes.subarray(0, 8));
                  let writeOffset = 8;
                  for (let chunk of [...chunks, ...metadataChunks, endChunk]) output.set(chunk, writeOffset), writeOffset += chunk.length;
                  return output;
                })(await (async file => {
                  let bytes = new Uint8Array(await file.arrayBuffer());
                  if (isPngBytes(bytes)) return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                  let imageSource;
                  let canvas = document.createElement("canvas");
                  let width = 0;
                  let height = 0;
                  let cleanup = () => {};
                  if ("function" == typeof createImageBitmap) {
                    let bitmap = await createImageBitmap(file);
                    width = bitmap.width;
                    height = bitmap.height;
                    imageSource = bitmap;
                    cleanup = () => bitmap.close();
                  } else {
                    let url = URL.createObjectURL(file);
                    let image = new Image();
                    try {
                      await new Promise((resolve, reject) => {
                        image.onload = () => resolve();
                        image.onerror = () => reject(Error("Trình duyệt không thể giải mã ảnh avatar này."));
                        image.src = url;
                      });
                    } catch (error) {
                      throw URL.revokeObjectURL(url), error;
                    }
                    width = image.naturalWidth;
                    height = image.naturalHeight;
                    imageSource = image;
                    cleanup = () => URL.revokeObjectURL(url);
                  }
                  try {
                    if (!width || !height || width * height > 1e8) throw Error("Kích thước avatar không hợp lệ hoặc quá lớn.");
                    canvas.width = width;
                    canvas.height = height;
                    let context = canvas.getContext("2d");
                    if (!context) throw Error("Trình duyệt không hỗ trợ chuyển avatar sang PNG.");
                    context.drawImage(imageSource, 0, 0);
                  } finally {
                    cleanup();
                  }
                  return (await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Không thể chuyển avatar sang PNG.")), "image/png"))).arrayBuffer();
                })(sourceFile), cardData);
                downloadBlob(new Blob([Uint8Array.from(pngWithMetadata).buffer], {
                  type: "image/png"
                }), downloadName);
              })(exportCard, avatarFile, fileName);
            } catch (error) {
              setExportError(error instanceof Error ? `Lỗi xuất PNG: ${error.message}` : "Đã xảy ra lỗi không xác định khi xuất tệp PNG.");
            } finally {
              setIsExporting(false);
            }
          }
        },
        initialFileName: fileName || card.name || "character",
        title: "json" === exportFormat ? "Xuất thẻ JSON" : "Xuất thẻ PNG",
        fileExtension: "json" === exportFormat ? ".json" : ".png"
      })]
    });
  };
}
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
    } = resolveCatalogScreenDeps(getDependencies);
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
    } = resolveCatalogScreenDeps(getDependencies);
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
export function createPersonaEditor(getDependencies) {
  return function PersonaEditor({
    persona: persona,
    onUpdate: onUpdate
  }) {
    const {
      TextInput,
      TextArea,
      jsxRuntime
    } = resolveCatalogScreenDeps(getDependencies);
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-6 rounded-xl space-y-4 h-full flex flex-col",
      children: [(0, jsxRuntime.jsx)("h3", {
        className: "text-xl font-bold text-sky-400",
        children: "Chỉnh sửa Hồ sơ"
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Tên Hồ sơ",
        value: persona.name,
        onChange: event => onUpdate({
          ...persona,
          name: event.target.value
        })
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex-grow flex flex-col",
        children: (0, jsxRuntime.jsx)(TextArea, {
          label: "Mô tả",
          value: persona.description,
          onChange: event => onUpdate({
            ...persona,
            description: event.target.value
          }),
          rows: 10,
          containerClassName: "flex-grow flex flex-col",
          className: "flex-grow",
          placeholder: "Mô tả về con người, tính cách, hoặc vai trò bạn muốn nhập vai..."
        })
      })]
    });
  };
}
export function createPersonaScreen(getDependencies) {
  return function PersonaScreen() {
    const {
      personaStore,
      PersonaEditor,
      react,
      LoadingIndicator,
      jsxRuntime,
      ToggleSwitch
    } = resolveCatalogScreenDeps(getDependencies);
    let {
      personas: personas,
      activePersonaId: activePersonaId,
      isLoading: isLoading,
      error: error,
      addOrUpdatePersona: addOrUpdatePersona,
      deletePersona: deletePersona,
      setActivePersonaId: setActivePersonaId
    } = personaStore();
    let [selectedPersonaId, setSelectedPersonaId] = (0, react.useState)(null);
    let selectedPersona = personas.find(persona => persona.id === selectedPersonaId) || null;
    return isLoading ? (0, jsxRuntime.jsx)(LoadingIndicator, {
      message: "Đang tải hồ sơ..."
    }) : (0, jsxRuntime.jsxs)("div", {
      className: "grid grid-cols-1 md:grid-cols-3 gap-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between",
          children: [(0, jsxRuntime.jsx)("h2", {
            className: "text-lg font-bold text-slate-200",
            children: "Danh sách Hồ sơ"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              let newPersona = {
                id: `persona_${Date.now()}`,
                name: "Hồ sơ Mới",
                description: ""
              };
              addOrUpdatePersona(newPersona);
              setSelectedPersonaId(newPersona.id);
            },
            className: "text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold ",
            children: "+ Mới"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1",
          children: 0 === personas.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-slate-500 text-sm italic text-center py-4",
            children: "Chưa có hồ sơ nào."
          }) : personas.map(persona => (0, jsxRuntime.jsx)("div", {
            className: "px-3 py-2 rounded-lg  text-sm font-medium " + (selectedPersonaId === persona.id ? "bg-sky-600/30 ring-1 ring-sky-500/50" : "hover:bg-slate-700/50"),
            children: (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center justify-between",
              children: [(0, jsxRuntime.jsx)("button", {
                type: "button",
                className: "truncate flex-grow mr-4 cursor-pointer " + (selectedPersonaId === persona.id ? "text-white" : "text-slate-400 hover:text-slate-200"),
                onClick: () => setSelectedPersonaId(persona.id),
                children: persona.name
              }), (0, jsxRuntime.jsx)("div", {
                className: "flex items-center gap-3 flex-shrink-0",
                children: (0, jsxRuntime.jsx)(ToggleSwitch, {
                  ariaLabel: `Đặt ${persona.name} làm hồ sơ mặc định`,
                  checked: activePersonaId === persona.id,
                  onChange: () => (personaId => {
                    setActivePersonaId(activePersonaId === personaId ? null : personaId);
                  })(persona.id),
                  clean: true
                })
              })]
            })
          }, persona.id))
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mt-auto pt-3 border-t border-slate-700/50",
          children: [error && (0, jsxRuntime.jsx)("p", {
            className: "text-red-400 text-xs p-2 bg-red-900/30 rounded mb-2",
            children: error
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              selectedPersonaId && window.confirm("Bạn có chắc chắn muốn xóa hồ sơ này không?") && (deletePersona(selectedPersonaId), setSelectedPersonaId(null));
            },
            disabled: !selectedPersonaId,
            className: "w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/50 ",
            children: "Xóa"
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "md:col-span-2",
        children: selectedPersona ? (0, jsxRuntime.jsx)(PersonaEditor, {
          persona: selectedPersona,
          onUpdate: addOrUpdatePersona
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 min-h-[40vh]",
          children: (0, jsxRuntime.jsx)("div", {
            className: "text-center text-slate-500",
            children: (0, jsxRuntime.jsx)("p", {
              className: "font-semibold",
              children: "Chọn một hồ sơ để chỉnh sửa"
            })
          })
        })
      })]
    });
  };
}
