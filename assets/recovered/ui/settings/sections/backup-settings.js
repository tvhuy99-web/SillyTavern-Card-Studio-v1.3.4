import { readBackupSetting } from '../../../app/persistence/backup-codec.js';

export function createBackupSettings(getDependencies) {
  return function BackupSettings() {
    const {
      geminiSettingsKey,
      geminiRotationKey,
      openRouterKeyStorageKey,
      personaStore,
      proxyProfilesKey,
      backupSettingKeys,
      proxyPasswordKey,
      cardRuntimeStoragePrefix,
      arrayBufferToBase64,
      backupRestoreService,
      connections,
      diagnosticsState,
      proxyPersistence,
      repositories,
      react,
      presetStore,
      useToast,
      characterStore,
      LoadingIndicator,
      lorebookStore,
      jsxRuntime
    } = getDependencies();
    const backupKeys = {
      gemini: geminiSettingsKey,
      rotation: geminiRotationKey,
      openrouter: openRouterKeyStorageKey,
      profiles: proxyProfilesKey,
      password: proxyPasswordKey
    };
    const backupStorage = {
      get local() {
        return localStorage;
      },
      get session() {
        return sessionStorage;
      },
      connections: connections,
      proxy: proxyPersistence,
      keys: backupKeys
    };
    const [isBackingUp, setIsBackingUp] = (0, react.useState)(false);
    const [backupProgress, setBackupProgress] = (0, react.useState)("Đang xử lý...");
    const [isRestoring, setIsRestoring] = (0, react.useState)(false);
    const [isCleaning, setIsCleaning] = (0, react.useState)(false);
    const [pendingRecovery, setPendingRecovery] = (0, react.useState)(() => backupRestoreService?.getPendingRecovery?.() || null);
    const [isRecovering, setIsRecovering] = (0, react.useState)(false);
    const fileInputRef = (0, react.useRef)(null);
    const {
      showToast
    } = useToast();
    const {
      reloadCharacters
    } = characterStore();
    const {
      reloadPresets
    } = presetStore();
    const {
      reloadLorebooks
    } = lorebookStore();
    const {
      reloadPersonas
    } = personaStore();
    const refreshPendingRecovery = async () => {
      if (typeof backupRestoreService?.inspectPendingRecovery === "function") {
        try {
          const inspected = await backupRestoreService.inspectPendingRecovery();
          setPendingRecovery(inspected || null);
          return inspected || null;
        } catch {

        }
      }
      const syncPending = backupRestoreService?.getPendingRecovery?.() || null;
      setPendingRecovery(syncPending);
      return syncPending;
    };
    if (typeof react.useEffect === "function") {
      (0, react.useEffect)(() => {
        let active = true;
        if (typeof backupRestoreService?.inspectPendingRecovery === "function") {
          Promise.resolve(backupRestoreService.inspectPendingRecovery()).then(inspected => {
            if (active) setPendingRecovery(inspected || null);
          }).catch(() => {});
        }
        return () => {
          active = false;
        };
      }, []);
    }
    const downloadBackupFile = file => {
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      showToast("Đã tải xuống file sao lưu.", "success");
    };
    const reloadAllCatalogs = () => Promise.all([reloadCharacters(), reloadPresets(), reloadLorebooks(), reloadPersonas()]);
    const handleRecovery = async strategy => {
      if (isRecovering || !backupRestoreService?.recover) return;
      setIsRecovering(true);
      try {
        await backupRestoreService.recover({
          strategy,
          journalId: pendingRecovery?.id
        });
        await reloadAllCatalogs();
        await refreshPendingRecovery();
        const successMessage = strategy === "retry-settings" ? "Đã áp dụng lại cài đặt thành công." : strategy === "rollback-idb" ? "Đã hoàn tác dữ liệu IndexedDB về trạng thái trước khôi phục." : "Đã đóng cảnh báo phục hồi.";
        showToast(successMessage, "success");
      } catch (error) {
        console.error("Backup Recovery Failed:", error);
        await refreshPendingRecovery();
        showToast(`Lỗi phục hồi: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsRecovering(false);
      }
    };
    const handleBackup = async () => {
      setIsBackingUp(true);
      setBackupProgress("Đang gom dữ liệu sao lưu...");
      try {
        const backupFile = await (async () => {
          try {
            const {
              characters,
              presets,
              lorebooks,
              personas,
              chatSessions
            } = await repositories.exportRecords();
            const appSettings = (() => {
              const collected = {};
              let totalSize = 0;
              backupSettingKeys.forEach(key => {
                const value = readBackupSetting(key, backupStorage);
                if (value !== null && value.length <= 5e6 && totalSize + value.length <= 5e7) {
                  collected[key] = value;
                  totalSize += value.length;
                }
              });
              let prefixedCount = 0;
              for (let index = 0; index < localStorage.length && prefixedCount < 1e3; index++) {
                const key = localStorage.key(index);
                if (!key?.startsWith(cardRuntimeStoragePrefix) || collected[key] !== undefined) continue;
                const value = localStorage.getItem(key);
                if (value === null || value.length > 5e6 || totalSize + value.length > 5e7) continue;
                collected[key] = value;
                totalSize += value.length;
                prefixedCount++;
              }
              return collected;
            })();
            const exportedCharacters = [];
            for (const character of characters) {
              exportedCharacters.push({
                card: character.card,
                fileName: character.fileName,
                avatarBase64: character.avatar ? await arrayBufferToBase64(character.avatar.buffer) : undefined,
                avatarType: character.avatar?.type
              });
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            const payload = {
              version: 1,
              timestamp: Date.now(),
              dataType: "full_system_backup",
              meta: {
                exportedBy: "AI Studio Card Tool",
                description: `Full System Backup - ${new Date().toLocaleString()}`
              },
              data: {
                characters: exportedCharacters,
                presets,
                lorebooks,
                personas,
                chatSessions,
                appSettings
              }
            };
            const jsonText = JSON.stringify(payload);
            const fileName = `FullBackup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
            return new File([jsonText], fileName, {
              type: "application/json"
            });
          } catch (error) {
            console.error("Full Backup Failed:", error);
            throw Error(`Lỗi sao lưu toàn bộ: ${error instanceof Error ? error.message : String(error)}`);
          }
        })();
        if (typeof globalThis.__cardStudioExportAndroidBlob === "function") {
          setBackupProgress("Chọn nơi lưu tệp (đừng thoát app khi đang ghi)...");
          try {
            const saved = await globalThis.__cardStudioExportAndroidBlob({
              blob: backupFile,
              filename: backupFile.name,
              onProgress: (written, total) => {
                const doneMb = (written / (1024 * 1024)).toFixed(1);
                const totalMb = (total / (1024 * 1024)).toFixed(1);
                setBackupProgress(`Đang ghi sao lưu (${doneMb}/${totalMb} MB)...`);
              }
            });
            const finalMb = (saved.bytes / (1024 * 1024)).toFixed(1);
            showToast(`Đã lưu file sao lưu thành công (${finalMb} MB).`, "success");
          } catch (androidError) {
            const msg = androidError instanceof Error ? androidError.message : String(androidError);
            if (/Người dùng đã hủy lưu tệp/.test(msg)) {
              showToast("Đã hủy thao tác sao lưu.", "info");
            } else {
              throw androidError;
            }
          }
        } else if (navigator.canShare && navigator.canShare({
          files: [backupFile]
        })) {
          try {
            await navigator.share({
              files: [backupFile],
              title: "SillyTavern Card Studio Backup",
              text: "Full system backup file."
            });
            showToast("Đã mở menu chia sẻ!", "success");
          } catch (shareError) {
            if (shareError.name !== "AbortError") downloadBackupFile(backupFile);
          }
        } else {
          downloadBackupFile(backupFile);
        }
      } catch (error) {
        showToast(`Lỗi sao lưu: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsBackingUp(false);
        setBackupProgress("Đang xử lý...");
      }
    };
    const handleRestoreFileChange = async event => {
      if (!event.target.files || event.target.files.length === 0) return;
      const selectedFile = event.target.files[0];
      setIsRestoring(true);
      try {
        await (async file => {
          try {
            if (!file.size) throw Error("Tệp sao lưu trống.");
            if (file.size > 2e8) throw Error("Tệp sao lưu vượt quá giới hạn 200 MB.");
            let rawBackup;
            try {
              rawBackup = await new Response(file).json();
            } catch (parseError) {
              const detail = parseError instanceof Error ? parseError.message : String(parseError);
              throw Error(`Tệp sao lưu JSON bị cắt ngang hoặc hỏng cấu trúc (có thể quá trình sao lưu trước đó bị ngắt trước khi ghi xong): ${detail}`);
            }
            if (!backupRestoreService || typeof backupRestoreService.restore !== "function") {
              throw Error("Dịch vụ khôi phục dữ liệu không khả dụng.");
            }
            try {
              await backupRestoreService.restore(rawBackup);
            } catch (error) {
              await refreshPendingRecovery();
              if (error?.idbCommitted) await reloadAllCatalogs();
              throw error;
            }
          } catch (error) {
            console.error("Full Restore Failed:", error);
            throw Error(`Lỗi khôi phục toàn bộ: ${error instanceof Error ? error.message : String(error)}`);
          }
        })(selectedFile);
        await refreshPendingRecovery();
        await reloadAllCatalogs();
        showToast("Khôi phục thành công! Dữ liệu đã được cập nhật.", "success");
      } catch (error) {
        console.error(error);
        showToast(`Lỗi khôi phục: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        event.target.value = "";
        setIsRestoring(false);
      }
    };
    const handleCleanup = async () => {
      if (!window.confirm("Bạn có chắc chắn muốn dọn dẹp dữ liệu rác? Thao tác này sẽ xóa vĩnh viễn các nhật ký gỡ lỗi (logs) và dữ liệu chuẩn đoán trong tất cả cuộc trò chuyện để giảm dung lượng bộ nhớ. Lịch sử chat chính vẫn được giữ nguyên.")) {
        return;
      }
      setIsCleaning(true);
      try {
        const result = await (async () => {
          try {
            const cleanupResult = await repositories.cleanupSessionDiagnostics();
            diagnosticsState.clearAll();
            return cleanupResult;
          } catch (error) {
            console.error("Cleanup Failed:", error);
            throw Error(`Lỗi dọn dẹp dữ liệu: ${error instanceof Error ? error.message : String(error)}`);
          }
        })();
        showToast(`Đã dọn dẹp xong ${result.sessionsCleaned} cuộc trò chuyện.`, "success");
      } catch (error) {
        showToast(`Lỗi dọn dẹp: ${error instanceof Error ? error.message : String(error)}`, "error");
      } finally {
        setIsCleaning(false);
      }
    };
    const recoveryActions = pendingRecovery?.availableActions || {
      canRetrySettings: false,
      canRollbackIdb: false,
      canDismiss: Boolean(pendingRecovery)
    };
    const showDismissButton = recoveryActions.canDismiss === true && recoveryActions.canRollbackIdb !== true;
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-8 ",
      children: [(0, jsxRuntime.jsx)("h2", {
        className: "text-xl font-bold text-sky-400 mb-2 border-b border-slate-700 pb-4",
        children: "Sao lưu & Khôi phục Hệ thống"
      }), pendingRecovery && (0, jsxRuntime.jsxs)("div", {
        role: "alert",
        className: "bg-amber-950/50 border border-amber-500/60 rounded-xl p-4 space-y-3",
        children: [(0, jsxRuntime.jsx)("h3", {
          className: "text-sm font-bold text-amber-300",
          children: "Phát hiện phiên khôi phục chưa hoàn tất"
        }), (0, jsxRuntime.jsx)("p", {
          className: "text-xs text-amber-100/90",
          children: "Dữ liệu IndexedDB đã được ghi nhưng phần cài đặt Web Storage chưa hoàn tất (hai kho lưu trữ không atomic). Chọn một hành động phục hồi khả dụng bên dưới."
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex flex-wrap gap-3",
          children: [recoveryActions.canRetrySettings === true && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("retry-settings"),
            className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Thử áp dụng lại cài đặt"
          }), recoveryActions.canRollbackIdb === true && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("rollback-idb"),
            className: "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Hoàn tác IndexedDB"
          }), showDismissButton && (0, jsxRuntime.jsx)("button", {
            type: "button",
            disabled: isRecovering,
            onClick: () => handleRecovery("dismiss"),
            className: "px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold rounded-lg disabled:opacity-50",
            children: "Đóng cảnh báo"
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "grid grid-cols-1 md:grid-cols-2 gap-8",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-sky-500/50 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "w-16 h-16 bg-sky-900/30 text-sky-400 rounded-full flex items-center justify-center mb-4 text-3xl",
            children: ""
          }), (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-2",
            children: "Sao Lưu Toàn Bộ"
          }), (0, jsxRuntime.jsx)("p", {
            className: "text-xs text-amber-300/90",
            children: "Tệp sao lưu có thể chứa khóa API và mật khẩu proxy. Hãy giữ tệp ở nơi riêng tư."
          }), (0, jsxRuntime.jsx)("button", {
            onClick: handleBackup,
            disabled: isBackingUp,
            className: "w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-900/20  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4",
            children: isBackingUp ? (0, jsxRuntime.jsx)(LoadingIndicator, {
              message: backupProgress
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
                  clipRule: "evenodd"
                })
              }), "Sao Lưu Ngay"]
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-emerald-500/50 ",
          children: [(0, jsxRuntime.jsx)("div", {
            className: "w-16 h-16 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mb-4 text-3xl",
            children: ""
          }), (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-2",
            children: "Khôi Phục Dữ Liệu"
          }), (0, jsxRuntime.jsx)("input", {
            ref: fileInputRef,
            type: "file",
            "aria-label": "Chọn tệp khôi phục",
            accept: ".json",
            onChange: handleRestoreFileChange,
            className: "hidden"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => !isRestoring && fileInputRef.current?.click(),
            disabled: isRestoring,
            className: "w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4",
            children: isRestoring ? (0, jsxRuntime.jsx)(LoadingIndicator, {
              message: "Đang xử lý..."
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
                  clipRule: "evenodd"
                })
              }), "Chọn Tệp Khôi Phục"]
            })
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6 hover:border-orange-500/50 ",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "w-16 h-16 bg-orange-900/30 text-orange-400 rounded-full flex items-center justify-center text-3xl shrink-0",
          children: ""
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex-grow text-center md:text-left",
          children: (0, jsxRuntime.jsx)("h3", {
            className: "text-lg font-bold text-slate-200 mb-1",
            children: "Dọn Dẹp Hệ Thống (Optimize)"
          })
        }), (0, jsxRuntime.jsx)("button", {
          onClick: handleCleanup,
          disabled: isCleaning,
          className: "w-full md:w-auto py-3 px-8 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
          children: isCleaning ? (0, jsxRuntime.jsx)(LoadingIndicator, {
            message: "Đang dọn..."
          }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
            children: [(0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z",
                clipRule: "evenodd"
              })
            }), "Dọn Dẹp Ngay"]
          })
        })]
      })]
    });
  };
}
