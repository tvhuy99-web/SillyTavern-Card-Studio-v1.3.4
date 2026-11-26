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
    let prepareCardForExport = (0, react.useCallback)(e => {
      let t = JSON.parse(JSON.stringify(e));
      if (t.attached_lorebooks && t.attached_lorebooks.length > 0) {
        let e = t.attached_lorebooks;
        let n = [...(t.char_book?.entries || [])];
        e.forEach(e => {
          let t = lorebooks.find(t => t.name === e);
          let r = n.some(t => t.source_lorebook === e);
          if (t && t.book.entries && !r) {
            let r = JSON.parse(JSON.stringify(t.book.entries));
            r.forEach(t => {
              t.source_lorebook = e;
              t.uid ||= `embed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            });
            n.push(...r);
          }
        });
        t.char_book ||= {
          entries: []
        };
        t.char_book.entries = n;
        delete t.attached_lorebooks;
      }
      t.char_book && 0 === t.char_book.entries.length && delete t.char_book;
      return t;
    }, [lorebooks]);
    let tokenStats = (0, react.useMemo)(() => {
      let t = estimateTokens(card.description);
      let n = estimateTokens(card.personality);
      let r = estimateTokens(card.first_mes);
      let a = estimateTokens(card.mes_example);
      return {
        description: t,
        personality: n,
        first_mes: r,
        mes_example: a,
        total: t + n + r + a
      };
    }, [card]);
    let openExportDialog = e => {
      setExportFormat(e);
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
              onChange: e => {
                let t = e.target.files?.[0];
                t && (setAvatar(URL.createObjectURL(t), t), e.target.value = "");
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
        onConfirm: async t => {
          let n = prepareCardForExport(card);
          if ("json" === exportFormat) ((e, t) => {
            let n = JSON.stringify(buildExportCard(e), null, 2);
            downloadBlob(new Blob([n], {
              type: "application/json;charset=utf-8"
            }), t);
          })(n, t);else {
            if (!card || !avatarFile) return;
            setIsExporting(true);
            setExportError("");
            try {
              await (async (e, t, n) => {
                let r = ((e, t) => {
                  let n = new Uint8Array(e);
                  if (!isPngBytes(n)) throw Error("Avatar không phải PNG hợp lệ sau khi chuyển đổi.");
                  let r = new DataView(e);
                  let a = [];
                  let i = null;
                  let o = 8;
                  let s = 0;
                  for (; o < n.byteLength;) {
                    if (++s > 1e5 || o + 12 > n.byteLength) throw Error("Cấu trúc chunk PNG không hợp lệ.");
                    let e = r.getUint32(o);
                    let t = o + 12 + e;
                    if (t > n.byteLength || t <= o) throw Error("PNG có chunk vượt quá giới hạn tệp.");
                    let l = new TextDecoder("latin1").decode(n.subarray(o + 4, o + 8));
                    let c = n.slice(o, t);
                    if ("IEND" === l) {
                      i = c;
                      break;
                    }
                    let u = false;
                    if ("tEXt" === l) {
                      let t = n.subarray(o + 8, o + 8 + e);
                      let r = t.indexOf(0);
                      if (r > 0) {
                        let e = new TextDecoder("latin1").decode(t.subarray(0, r)).toLowerCase();
                        u = "chara" === e || "ccv3" === e;
                      }
                    }
                    u || a.push(c);
                    o = t;
                  }
                  if (!i) throw Error("PNG bị hỏng hoặc thiếu chunk IEND.");
                  let l = [createPngTextChunk("chara", encodeBase64Utf8(JSON.stringify(buildExportCard(t, "v2"))))];
                  "v3" === resolveExportSpec(t, "auto") && l.push(createPngTextChunk("ccv3", encodeBase64Utf8(JSON.stringify(buildExportCard(t, "v3")))));
                  let c = 8 + [...a, ...l, i].reduce((e, t) => e + t.length, 0);
                  let u = new Uint8Array(c);
                  u.set(n.subarray(0, 8));
                  let d = 8;
                  for (let e of [...a, ...l, i]) u.set(e, d), d += e.length;
                  return u;
                })(await (async e => {
                  let t = new Uint8Array(await e.arrayBuffer());
                  if (isPngBytes(t)) return t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength);
                  let n;
                  let r = document.createElement("canvas");
                  let a = 0;
                  let i = 0;
                  let o = () => {};
                  if ("function" == typeof createImageBitmap) {
                    let t = await createImageBitmap(e);
                    a = t.width;
                    i = t.height;
                    n = t;
                    o = () => t.close();
                  } else {
                    let t = URL.createObjectURL(e);
                    let r = new Image();
                    try {
                      await new Promise((e, n) => {
                        r.onload = () => e();
                        r.onerror = () => n(Error("Trình duyệt không thể giải mã ảnh avatar này."));
                        r.src = t;
                      });
                    } catch (e) {
                      throw URL.revokeObjectURL(t), e;
                    }
                    a = r.naturalWidth;
                    i = r.naturalHeight;
                    n = r;
                    o = () => URL.revokeObjectURL(t);
                  }
                  try {
                    if (!a || !i || a * i > 1e8) throw Error("Kích thước avatar không hợp lệ hoặc quá lớn.");
                    r.width = a;
                    r.height = i;
                    let e = r.getContext("2d");
                    if (!e) throw Error("Trình duyệt không hỗ trợ chuyển avatar sang PNG.");
                    e.drawImage(n, 0, 0);
                  } finally {
                    o();
                  }
                  return (await new Promise((e, t) => r.toBlob(n => n ? e(n) : t(Error("Không thể chuyển avatar sang PNG.")), "image/png"))).arrayBuffer();
                })(t), e);
                downloadBlob(new Blob([Uint8Array.from(r).buffer], {
                  type: "image/png"
                }), n);
              })(n, avatarFile, t);
            } catch (e) {
              setExportError(e instanceof Error ? `Lỗi xuất PNG: ${e.message}` : "Đã xảy ra lỗi không xác định khi xuất tệp PNG.");
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
      let t = searchQuery.trim().toLocaleLowerCase("vi");
      return t ? characters.filter(e => `${e.card.name || ""} ${e.fileName || ""} ${(e.card.tags || []).join(" ")}`.toLocaleLowerCase("vi").includes(t)) : characters;
    }, [characters, searchQuery]);
    let activeEntry = activeCharacterFileName === NEW_CHARACTER_ID ? {
      card: draftCard,
      fileName: "New Character",
      avatarUrl: draftAvatarUrl,
      avatarFile: draftAvatarFile
    } : activeCharacterFileName ? characters.find(e => e.fileName === activeCharacterFileName) : null;
    return isLoading && 0 === characters.length ? (0, jsxRuntime.jsx)("div", {
      className: "flex justify-center items-center h-64",
      children: (0, jsxRuntime.jsx)(LoadingIndicator, {
        message: "Đang tải nhân vật..."
      })
    }) : isLorebookManagerOpen && activeEntry ? (0, jsxRuntime.jsx)(LorebookManager, {
      initialEntries: activeEntry.card.char_book?.entries || [],
      initialAttached: activeEntry.card.attached_lorebooks || [],
      onSave: (e, n) => {
        if (!activeEntry) return;
        let r = JSON.parse(JSON.stringify(activeEntry.card));
        r.char_book ||= {
          entries: []
        };
        r.char_book.entries = e;
        r.attached_lorebooks = n;
        if (activeCharacterFileName === NEW_CHARACTER_ID) {
          setDraftCard(r);
        } else {
          updateActiveCharacter(r);
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
            onChange: e => setSearchQuery(e.target.value),
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
            }) : filteredCharacters.map(e => (0, jsxRuntime.jsxs)("button", {
              onClick: () => setActiveCharacterFileName(e.fileName),
              className: "w-full text-left px-3 py-2 rounded-lg  text-sm font-medium flex items-center gap-3 " + (activeCharacterFileName === e.fileName ? "bg-sky-600/30 text-white ring-1 ring-sky-500/50" : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"),
              children: [(0, jsxRuntime.jsx)("div", {
                className: "w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600/50",
                children: e.avatarUrl ? (0, jsxRuntime.jsx)("img", {
                  src: e.avatarUrl,
                  alt: "",
                  className: "w-full h-full object-cover"
                }) : (0, jsxRuntime.jsx)("div", {
                  className: "w-full h-full flex items-center justify-center text-[10px] text-slate-500",
                  "aria-hidden": "true",
                  children: "?"
                })
              }), (0, jsxRuntime.jsx)("span", {
                className: "truncate",
                children: e.card.name || e.fileName
              })]
            }, e.fileName))
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
            onChange: e => {
              e.target.files && e.target.files.length > 0 && (loadCharacter(e.target.files[0]), e.target.value = "");
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
              setAvatar: (e, n) => {
                if (activeCharacterFileName === NEW_CHARACTER_ID) {
                  draftAvatarUrl && draftAvatarUrl !== e && URL.revokeObjectURL(draftAvatarUrl);
                  setDraftAvatarUrl(e);
                  setDraftAvatarFile(n);
                } else {
                  activeCharacterFileName && setAvatarForActiveCharacter(activeCharacterFileName, e, n);
                }
              },
              isNewCharacter: activeCharacterFileName === NEW_CHARACTER_ID,
              onSaveNew: async () => {
                if (draftCard.name.trim()) try {
                  await createNewCharacter(draftCard, draftAvatarFile);
                  showToast("Đã tạo nhân vật thành công!", "success");
                } catch (e) {
                  showToast(`Lỗi tạo nhân vật: ${e instanceof Error ? e.message : String(e)}`, "error");
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
      let t = searchQuery.trim().toLocaleLowerCase("vi");
      return t ? presets.filter(e => e.name.toLocaleLowerCase("vi").includes(t)) : presets;
    }, [presets, searchQuery]);
    let activePreset = presets.find(e => e.name === activePresetName) || null;
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
            onChange: e => setSearchQuery(e.target.value),
            placeholder: "Tìm preset...",
            "aria-label": "Tìm preset"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1",
          children: 0 === filteredPresets.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-slate-500 text-sm italic text-center py-4",
            children: searchQuery ? "Không tìm thấy preset phù hợp." : "Chưa có preset."
          }) : filteredPresets.map(e => (0, jsxRuntime.jsx)("button", {
            onClick: () => setActivePresetName(e.name),
            className: "w-full text-left px-3 py-2 rounded-lg text-sm font-medium truncate " + (activePresetName === e.name ? "bg-sky-600/30 text-white ring-1 ring-sky-500/50" : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"),
            children: e.name
          }, e.name))
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
            onChange: e => {
              e.target.files && e.target.files.length > 0 && (addPreset(e.target.files[0]), e.target.value = "");
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
        onConfirm: e => {
          activePreset && ((e, t) => {
            try {
              let n = JSON.parse(JSON.stringify(e));
              delete n.prompt_order;
              Object.keys(n).forEach(e => {
                (null === n[e] || undefined === n[e]) && delete n[e];
                Array.isArray(n[e]) && 0 === n[e].length && ("stopping_strings" === e || "custom_stopping_strings" === e) && delete n[e];
              });
              let r = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(n, null, 2));
              let a = document.createElement("a");
              a.setAttribute("href", r);
              a.setAttribute("download", t);
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (e) {
              console.error("Failed to export preset:", e);
              alert("An error occurred while trying to export the preset file.");
            }
          })(activePreset, e);
        },
        initialFileName: activePreset?.name || "Preset",
        title: "Xuất Preset",
        fileExtension: ".json"
      }), (0, jsxRuntime.jsx)(PresetNameDialog, {
        isOpen: !!nameDialogState,
        mode: nameDialogState,
        onClose: () => setNameDialogState(null),
        originalName: activePreset?.name || "",
        onConfirm: async e => {
          try {
            if ("create" === nameDialogState) {
              await createPreset(e);
              showToast(`Đã tạo preset mới: "${e}"`, "success");
            } else {
              if ("clone" === nameDialogState && activePreset) {
                await duplicatePreset(activePreset.name, e);
                showToast(`Đã nhân bản thành: "${e}"`, "success");
              } else {
                "rename" === nameDialogState && activePreset && (await renamePreset(activePreset.name, e), showToast(`Đã đổi tên thành: "${e}"`, "success"));
              }
            }
          } catch (e) {
            showToast(`Lỗi: ${e instanceof Error ? e.message : String(e)}`, "error");
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
        onChange: n => onUpdate({
          ...persona,
          name: n.target.value
        })
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex-grow flex flex-col",
        children: (0, jsxRuntime.jsx)(TextArea, {
          label: "Mô tả",
          value: persona.description,
          onChange: n => onUpdate({
            ...persona,
            description: n.target.value
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
    let selectedPersona = personas.find(e => e.id === selectedPersonaId) || null;
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
              let e = {
                id: `persona_${Date.now()}`,
                name: "Hồ sơ Mới",
                description: ""
              };
              addOrUpdatePersona(e);
              setSelectedPersonaId(e.id);
            },
            className: "text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold ",
            children: "+ Mới"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1",
          children: 0 === personas.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-slate-500 text-sm italic text-center py-4",
            children: "Chưa có hồ sơ nào."
          }) : personas.map(e => (0, jsxRuntime.jsx)("div", {
            className: "px-3 py-2 rounded-lg  text-sm font-medium " + (selectedPersonaId === e.id ? "bg-sky-600/30 ring-1 ring-sky-500/50" : "hover:bg-slate-700/50"),
            children: (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center justify-between",
              children: [(0, jsxRuntime.jsx)("button", {
                type: "button",
                className: "truncate flex-grow mr-4 cursor-pointer " + (selectedPersonaId === e.id ? "text-white" : "text-slate-400 hover:text-slate-200"),
                onClick: () => setSelectedPersonaId(e.id),
                children: e.name
              }), (0, jsxRuntime.jsx)("div", {
                className: "flex items-center gap-3 flex-shrink-0",
                children: (0, jsxRuntime.jsx)(ToggleSwitch, {
                  ariaLabel: `Đặt ${e.name} làm hồ sơ mặc định`,
                  checked: activePersonaId === e.id,
                  onChange: () => (e => {
                    setActivePersonaId(activePersonaId === e ? null : e);
                  })(e.id),
                  clean: true
                })
              })]
            })
          }, e.id))
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
