export function createCharacterTools(getDependencies) {
  return function CharacterTools({
    card: card,
    fileName: fileName,
    avatarUrl: avatarUrl,
    avatarFile: avatarFile,
    setAvatar: setAvatar,
    isNewCharacter = false,
    onSaveNew: onSaveNew,
    section = "all",
    isExportModalOpen = false,
    onCloseExportModal = () => {}
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
    } = getDependencies();
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
    const renderAvatarControl = () => (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3",
      children: [
        (0, jsxRuntime.jsx)("h3", {
          className: "text-base font-semibold text-slate-200",
          children: "Ảnh đại diện"
        }),
        (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center gap-4",
          children: [
            (0, jsxRuntime.jsx)("div", {
              className: "w-20 h-20 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden",
              children: avatarUrl ? (0, jsxRuntime.jsx)("img", {
                src: avatarUrl,
                alt: "Avatar",
                className: "w-full h-full object-cover"
              }) : (0, jsxRuntime.jsx)("div", {
                className: "w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2 border border-slate-700",
                children: "Chưa có avatar"
              })
            }),
            (0, jsxRuntime.jsxs)("div", {
              className: "flex-grow",
              children: [
                (0, jsxRuntime.jsx)("input", {
                  type: "file",
                  "aria-label": "Chọn ảnh đại diện",
                  accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
                  onChange: event => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setAvatar(URL.createObjectURL(file), file);
                      event.target.value = "";
                    }
                  },
                  className: "sr-only",
                  ref: avatarInputRef
                }),
                (0, jsxRuntime.jsx)("button", {
                  type: "button",
                  onClick: () => avatarInputRef.current?.click(),
                  className: "w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg",
                  children: avatarUrl ? "Thay đổi Avatar" : "Tải lên Avatar"
                }),
                (0, jsxRuntime.jsx)("p", {
                  className: "text-xs text-slate-500 mt-2",
                  children: "Hỗ trợ PNG, JPEG, WebP, GIF và AVIF; khi xuất thẻ sẽ tự chuyển sang PNG."
                })
              ]
            })
          ]
        })
      ]
    });
    const renderTokensControl = () => (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-4 rounded-xl border border-slate-700/60",
      children: [
        (0, jsxRuntime.jsx)("h3", {
          className: "font-semibold text-base text-slate-200 mb-3",
          children: "Số lượng token ước tính"
        }),
        (0, jsxRuntime.jsxs)("dl", {
          className: "grid grid-cols-2 gap-x-4 gap-y-2 text-sm",
          children: [
            (0, jsxRuntime.jsx)("dt", { className: "text-slate-400", children: "Mô tả:" }),
            (0, jsxRuntime.jsx)("dd", { className: "text-right font-mono text-amber-400", children: tokenStats.description }),
            (0, jsxRuntime.jsx)("dt", { className: "text-slate-400", children: "Tính cách:" }),
            (0, jsxRuntime.jsx)("dd", { className: "text-right font-mono text-amber-400", children: tokenStats.personality }),
            (0, jsxRuntime.jsx)("dt", { className: "text-slate-400", children: "Lời chào đầu tiên:" }),
            (0, jsxRuntime.jsx)("dd", { className: "text-right font-mono text-amber-400", children: tokenStats.first_mes }),
            (0, jsxRuntime.jsx)("dt", { className: "text-slate-400", children: "Ví dụ hội thoại:" }),
            (0, jsxRuntime.jsx)("dd", { className: "text-right font-mono text-amber-400", children: tokenStats.mes_example }),
            (0, jsxRuntime.jsx)("div", { className: "border-t border-slate-700 col-span-2 my-1" }),
            (0, jsxRuntime.jsx)("dt", { className: "text-slate-300 font-bold", children: "Tổng token cốt lõi:" }),
            (0, jsxRuntime.jsx)("dd", { className: "text-right font-mono text-amber-300 font-bold", children: tokenStats.total })
          ]
        })
      ]
    });
    if (section === "avatar") return renderAvatarControl();
    if (section === "tokens") return renderTokensControl();
    if (section === "save-new") {
      return (0, jsxRuntime.jsx)("button", {
        type: "button",
        onClick: onSaveNew,
        className: "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2",
        children: "Lưu Nhân Vật Mới"
      });
    }
    const handleConfirmExport = async fileName => {
      let exportCard = prepareCardForExport(card);
      if ("json" === exportFormat) {
        let json = JSON.stringify(buildExportCard(exportCard), null, 2);
        downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), fileName);
        return;
      }
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
            if (exportFormat === "png-v3" || (exportFormat === "png" && "v3" === resolveExportSpec(cardData, "auto"))) {
              metadataChunks.push(createPngTextChunk("ccv3", encodeBase64Utf8(JSON.stringify(buildExportCard(cardData, "v3")))));
            }
            let totalBytes = 8 + [...chunks, ...metadataChunks, endChunk].reduce((total, chunk) => total + chunk.length, 0);
            let output = new Uint8Array(totalBytes);
            output.set(bytes.subarray(0, 8));
            let writeOffset = 8;
            for (let chunk of [...chunks, ...metadataChunks, endChunk]) {
              output.set(chunk, writeOffset);
              writeOffset += chunk.length;
            }
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
                URL.revokeObjectURL(url);
                throw error;
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
          downloadBlob(new Blob([Uint8Array.from(pngWithMetadata).buffer], { type: "image/png" }), downloadName);
        })(exportCard, avatarFile, fileName);
      } catch (error) {
        setExportError(error instanceof Error ? `Lỗi xuất PNG: ${error.message}` : "Đã xảy ra lỗi không xác định khi xuất tệp PNG.");
      } finally {
        setIsExporting(false);
      }
    };
    if (section === "export-modal") {
      return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
        children: [
          isExportModalOpen && (0, jsxRuntime.jsx)("div", {
            className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4",
            onClick: onCloseExportModal,
            children: (0, jsxRuntime.jsxs)("div", {
              role: "dialog",
              "aria-modal": "true",
              "aria-label": "Chọn định dạng xuất nhân vật",
              className: "w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4",
              onClick: event => event.stopPropagation(),
              children: [
                (0, jsxRuntime.jsx)("h3", {
                  className: "text-lg font-bold text-slate-100",
                  children: "Xuất nhân vật"
                }),
                exportError && (0, jsxRuntime.jsx)("p", {
                  className: "text-red-400 bg-red-900/50 p-3 rounded-lg text-sm",
                  children: exportError
                }),
                (0, jsxRuntime.jsxs)("div", {
                  className: "space-y-2",
                  children: [
                    (0, jsxRuntime.jsx)("button", {
                      type: "button",
                      onClick: () => {
                        onCloseExportModal();
                        openExportDialog("json");
                      },
                      className: "w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700",
                      children: "Xuất ra JSON"
                    }),
                    (0, jsxRuntime.jsx)("button", {
                      type: "button",
                      disabled: !avatarFile || isExporting,
                      onClick: () => {
                        onCloseExportModal();
                        openExportDialog("png-v2");
                      },
                      className: "w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed",
                      children: "Xuất ra PNG (V2)"
                    }),
                    (0, jsxRuntime.jsx)("button", {
                      type: "button",
                      disabled: !avatarFile || isExporting,
                      onClick: () => {
                        onCloseExportModal();
                        openExportDialog("png-v3");
                      },
                      className: "w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed",
                      children: "Xuất ra PNG (V3)"
                    })
                  ]
                }),
                !avatarFile && (0, jsxRuntime.jsx)("p", {
                  className: "text-xs text-slate-400",
                  children: "Cần có ảnh đại diện để xuất định dạng PNG."
                }),
                (0, jsxRuntime.jsx)("button", {
                  type: "button",
                  onClick: onCloseExportModal,
                  className: "w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold",
                  children: "Đóng"
                })
              ]
            })
          }),
          (0, jsxRuntime.jsx)(FileNameDialog, {
            isOpen: isFileNameDialogOpen,
            onClose: () => setIsFileNameDialogOpen(false),
            onConfirm: handleConfirmExport,
            initialFileName: fileName || card.name || "character",
            title: exportFormat === "json" ? "Xuất thẻ JSON" : exportFormat === "png-v3" ? "Xuất thẻ PNG (V3)" : "Xuất thẻ PNG (V2)",
            fileExtension: exportFormat === "json" ? ".json" : ".png"
          })
        ]
      });
    }
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
