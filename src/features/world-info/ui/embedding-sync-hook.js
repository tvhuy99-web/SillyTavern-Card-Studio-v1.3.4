// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createEmbeddingSyncHook(dependencies = {}) {
  var useEmbeddingSync = (lorebookId, entries) => {
    let [statusMap, setStatusMap] = (0,dependencies.react.useState)({});
    let [isSyncing, setIsSyncing] = (0,dependencies.react.useState)(false);
    let [syncProgress, setSyncProgress] = (0,dependencies.react.useState)({current:0,total:0});
    let {showToast} = (0, dependencies.useToast)();
    let checkStatus = (0,dependencies.react.useCallback)(async () => {
      if (!lorebookId) return;
      let provider = (0, dependencies.getSmartScanSettings)().embedding_provider || "gemini";
      await (0, dependencies.loadEmbeddingIndex)(lorebookId, provider);
      let indexedEntries = (0, dependencies.getEmbeddingIndex)(lorebookId, provider);
      let indexByUid = new Map;
      indexedEntries.forEach(entry => {
        if (!indexByUid.has(entry.uid)) indexByUid.set(entry.uid, []);
        indexByUid.get(entry.uid).push(entry);
      });
      let nextStatus = {};
      let eligibleEntries = entries.filter(entry => entry.uid && entry.content && entry.content.trim().length > 0);
      await Promise.all(eligibleEntries.map(async entry => {
        if (!entry.uid) return;
        let matches = indexByUid.get(entry.uid);
        if (matches && matches.length !== 0) {
          let hash = await (0, dependencies.hashEmbeddingText)((0, dependencies.getEmbeddingEntryText)(entry));
          nextStatus[entry.uid] = matches[0].contentHash === hash ? "synced" : "needs_sync";
        } else nextStatus[entry.uid] = "not_synced";
      }));
      setStatusMap(nextStatus);
    }, [lorebookId, entries]);
    (0,dependencies.react.useEffect)(() => { checkStatus(); }, [checkStatus]);
    let enabledEntries = entries.filter(entry => entry.uid && entry.content && entry.content.trim().length > 0 && false !== entry.enabled);
    return {
      statusMap: statusMap, isSyncing: isSyncing, syncProgress: syncProgress,
      syncedCount: enabledEntries.filter(entry => "synced" === statusMap[entry.uid]).length,
      totalCount: enabledEntries.length,
      handleSync: async () => {
        let settings = (0, dependencies.getSmartScanSettings)();
        if (settings.enabled && ["semantic","hybrid_fast","ultimate"].includes(settings.mode)) {
          if (lorebookId && entries.length !== 0) {
            setIsSyncing(true);
            try {
              await (0, dependencies.syncLorebookEmbeddings)(lorebookId, entries.filter(entry => false !== entry.enabled), (current, total) => setSyncProgress({current:current,total:total}));
              showToast("Đồng bộ Semantic Search thành công!","success");
              await checkStatus();
            } catch (error) {
              console.error("Sync error:", error);
              showToast(`Lỗi đồng bộ: ${error.message}`,"error");
            } finally {
              setIsSyncing(false);
              setSyncProgress({current:0,total:0});
            }
          }
        } else showToast("Smart Scan hoặc Semantic Search đang tắt.","info");
      },
      checkStatus: checkStatus
    };
  };
  return { useEmbeddingSync };
}
