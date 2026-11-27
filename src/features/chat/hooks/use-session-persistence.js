import { useSessionView } from './session-view.js';
export function useSessionPersistence(dependencies, sessionId) {
  const {
    setSessionData,
    setError,
    setLoading,
    resetStore,
    messages,
    variables,
    extensionSettings,
    worldInfoState,
    worldInfoRuntime,
    worldInfoPinned,
    worldInfoPlacement,
    generatedLorebookEntries,
    storyQueue,
    longTermSummaries,
    summaryChunkSize,
    summaryQueue,
    visualState,
    authorNote,
    lastStateBlock,
    card,
    preset,
    persona,
    isArenaMode,
    arenaModelId,
    arenaProvider,
    arenaUserProfileId,
  } = useSessionView(dependencies.sessionStore);
  const { characters, isLoading: charactersLoading } = (0, dependencies.characterStore)();
  const { presets, isLoading: presetsLoading } = (0, dependencies.presetStore)();
  const { personas, isLoading: personasLoading } = (0, dependencies.personaStore)();
  const { showToast } = (0, dependencies.useToast)();
  const loadedRef = (0, dependencies.react.useRef)(false);
  const revisionAnchorRef = (0, dependencies.react.useRef)({ base: 0, hydrated: 0 });

  const autosave = (0, dependencies.react.useMemo)(
    () => {
      const initialRevision = dependencies.__stsRuntimeState.getSessionRevision();
      revisionAnchorRef.current = { base: initialRevision, hydrated: initialRevision };
      return (0, dependencies.__stsCreateSessionSaveCoordinator)({
      sessionId,
      initialRevision,
      getState: () => dependencies.sessionStore.getState(),
      captureSnapshot: (state, overrides) => dependencies.__stsSessionPersistence.createSessionSnapshot(
        state,
        overrides,
        { snippet: dependencies.truncateText, now: Date.now },
      ),
      queue: dependencies.__stsSessionWriteQueue,
      getRevision: () => {
        const current = dependencies.__stsRuntimeState.getSessionRevision();
        const anchor = revisionAnchorRef.current;
        return current === anchor.hydrated ? anchor.base : current;
      },
      isBusy: state => dependencies.__stsRuntimeState.isBusy() || state.isLoading,
      isRestoreInProgress: () => Boolean(dependencies.__stsBackupRestoreService?.isRestoreInProgress?.()),
      getRestoreEpoch: () => dependencies.__stsBackupRestoreService?.getRestoreEpoch?.() ?? 0,
      subscribeRestoreLifecycle: listener => dependencies.__stsBackupRestoreService?.subscribeRestoreLifecycle?.(listener) || (() => {}),
      onOwnershipLost: () => showToast(
        'Phiên trò chuyện này đã được mở hoặc thay đổi ở tab khác. Tự động lưu đã tạm dừng để tránh ghi đè dữ liệu.',
        'warning',
      ),
      onError: () => showToast(
        'Không lưu được phiên. Phiên có thể đã được mở ở tab khác; hãy sao lưu nội dung trước khi mở lại.',
        'error',
      ),
    });
    },
    [sessionId],
  );

  (0, dependencies.react.useEffect)(() => {
    if (!sessionId) {
      resetStore();
      setLoading(false);
      loadedRef.current = false;
      return;
    }

    if (sessionId !== dependencies.sessionStore.getState().sessionId) {
      loadedRef.current = false;
      if (dependencies.sessionStore.getState().sessionId) {
        dependencies.__stsRuntimeState.invalidateSession('session-route-change');
      }
    }

    if (charactersLoading || presetsLoading || personasLoading) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    if (!loadedRef.current || sessionId !== dependencies.sessionStore.getState().sessionId) {
      (async () => {
        if (!loadedRef.current) setLoading(true);
        setError(null);
        try {
          await dependencies.__stsSessionWriteQueue.drain();
          if (cancelled) return;

          let record = await dependencies.__stsRepositories.openSessionForEditing(sessionId, () => !cancelled);
          if (cancelled) return;
          if (!record) throw Error('Không tìm thấy phiên trò chuyện trong Database.');

          dependencies.__stsCrossTabSync?.publish?.('session-claimed', {
            sessionId,
            generation: record.__stsRecordGeneration,
          });

          const loaded = dependencies.__stsSessionPersistence.normalizeLoadedSession(record);
          record = loaded.record;

          const foundCard = characters.find(item => item.fileName === record.characterFileName)?.card;
          const foundPersona = personas.find(item => item.id === record.userPersonaId) || null;
          if (!foundCard) throw Error(`Không tìm thấy thẻ nhân vật: "${record.characterFileName}".`);

          let foundPreset = presets.find(item => item.name === record.presetName);
          let presetHealed = false;
          if (!foundPreset) {
            const fallbackPreset = presets.find(item => item.name === 'Mặc định') || presets[0];
            if (!fallbackPreset) {
              throw Error(`Không tìm thấy Preset: "${record.presetName}" và không có preset nào khác để thay thế.`);
            }
            console.warn(`[Session] Preset '${record.presetName}' missing. Auto-healing to '${fallbackPreset.name}'.`);
            foundPreset = fallbackPreset;
            record.presetName = fallbackPreset.name;
            presetHealed = true;
          }

          const hydratedCard = { ...foundCard, fileName: record.characterFileName };
          if (record.rpgState) hydratedCard.rpg_data = record.rpgState;
          const runtimeExtensions = record.extensionSettings?.__cardRuntimeCardExtensions;
          if (runtimeExtensions && typeof runtimeExtensions === 'object') {
            hydratedCard.extensions = { ...(hydratedCard.extensions || {}), ...runtimeExtensions };
          }
          const runtimeCharacterBook = record.extensionSettings?.__cardRuntimeCharacterBook;
          if (runtimeCharacterBook && typeof runtimeCharacterBook === 'object' && Array.isArray(runtimeCharacterBook.entries)) {
            hydratedCard.char_book = runtimeCharacterBook;
          }

          let variablesHealed = false;
          if (!record.variables || Object.keys(record.variables).length === 0) {
            const seed = (0, dependencies.__stsSeedSessionInitialVariablesFromCard)(
              {},
              hydratedCard,
              String(record.chatHistory?.[0]?.originalRawContent || record.chatHistory?.[0]?.content || hydratedCard?.first_mes || ''),
              text => dependencies.relaxedJson.default.parse(text),
            );
            if (Object.keys(seed.variables).length) {
              record.variables = seed.variables;
              if (
                Array.isArray(record.chatHistory) &&
                record.chatHistory.length &&
                (!record.chatHistory[0].contextState || Object.keys(record.chatHistory[0].contextState).length === 0)
              ) {
                record.chatHistory[0] = {
                  ...record.chatHistory[0],
                  contextState: JSON.parse(JSON.stringify(record.variables)),
                };
              }
              variablesHealed = true;
            }
          }

          const needsSaveAfterHeal = loaded.needsRewrite || variablesHealed;
          setSessionData({
            sessionId,
            __stsRecordGeneration: record.__stsRecordGeneration,
            card: hydratedCard,
            preset: foundPreset,
            persona: foundPersona,
            mergedSettings: (0, dependencies.applySamplingOverrides)(hydratedCard, foundPreset),
            messages: record.chatHistory,
            variables: record.variables || {},
            extensionSettings: record.extensionSettings || {},
            visualState: record.visualState || {},
            authorNote: record.authorNote || '',
            lastStateBlock: record.lastStateBlock || '',
            longTermSummaries: record.longTermSummaries || [],
            summaryChunkSize: record.summaryChunkSize ?? null,
            summaryQueue: record.summaryQueue || [],
            storyQueue: record.storyQueue || [],
            worldInfoRuntime: record.worldInfoRuntime || {},
            worldInfoPinned: record.worldInfoPinned || {},
            worldInfoPlacement: record.worldInfoPlacement || {},
            initialDiagnosticLog: '',
            generatedLorebookEntries: record.generatedLorebookEntries || [],
            logs: dependencies.__stsDiagnosticsState.activate(record.sessionId || sessionId),
            isArenaMode: record.isArenaMode || false,
            arenaModelId: record.arenaModelId || null,
            arenaProvider: record.arenaProvider || null,
            arenaUserProfileId: record.arenaProfileId || null,
          });

          let nextWorldInfoState = {};
          if (record.worldInfoState) {
            nextWorldInfoState = record.worldInfoState;
          } else if (foundCard.char_book?.entries) {
            foundCard.char_book.entries.forEach(entry => {
              if (entry.uid) nextWorldInfoState[entry.uid] = entry.enabled !== false;
            });
          }
          setSessionData({ worldInfoState: nextWorldInfoState });
          revisionAnchorRef.current = { ...revisionAnchorRef.current, hydrated: dependencies.__stsRuntimeState.getSessionRevision() };
          loadedRef.current = true;

          if ((needsSaveAfterHeal || presetHealed) && !dependencies.__stsBackupRestoreService?.isRestoreInProgress?.()) {
            await dependencies.__stsSessionWriteQueue.enqueue(record);
          }
          if (presetHealed && !cancelled) {
            showToast(`Preset cũ không tồn tại. Đã tự động chuyển sang "${foundPreset.name}".`, 'warning');
          }
        } catch (error) {
          if (cancelled) return;
          console.error('Session load error:', error);
          setError(error instanceof Error ? error.message : 'Không thể tải phiên trò chuyện.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    charactersLoading,
    presetsLoading,
    personasLoading,
    characters,
    presets,
    personas,
    setSessionData,
    setError,
    setLoading,
    resetStore,
    showToast,
  ]);

  (0, dependencies.react.useEffect)(() => {
    const sync = dependencies.__stsCrossTabSync;
    if (!sessionId || !sync || typeof sync.subscribe !== 'function') return;

    const unsubscribeClaimed = sync.subscribe('session-claimed', event => {
      if (event?.payload?.sessionId !== sessionId) return;
      autosave.cancelTimer();
      dependencies.__stsRuntimeState.invalidateSession('cross-tab-session-claimed');
      showToast(
        'Phiên trò chuyện này vừa được mở ở tab khác. Tự động lưu đã tạm dừng để tránh ghi đè dữ liệu.',
        'warning',
      );
    });

    const unsubscribeRestore = sync.subscribe('restore-completed', event => {
      if (!event?.payload?.ok) return;
      autosave.cancelTimer();
      dependencies.__stsRuntimeState.invalidateSession('cross-tab-restore-completed');
      showToast(
        'Dữ liệu hệ thống vừa được khôi phục ở tab khác. Hãy tải lại phiên để cập nhật.',
        'info',
      );
    });

    return () => {
      unsubscribeClaimed?.();
      unsubscribeRestore?.();
    };
  }, [sessionId, autosave, showToast]);

  const saveSession = (0, dependencies.react.useCallback)(
    (overrides = {}) => autosave.flush({ force: true, overrides }),
    [autosave],
  );

  (0, dependencies.react.useEffect)(() => {
    if (loadedRef.current && autosave.markDirty()) {
      return () => autosave.cancelTimer();
    }
  }, [
    sessionId,
    messages,
    variables,
    extensionSettings,
    worldInfoState,
    worldInfoRuntime,
    worldInfoPinned,
    worldInfoPlacement,
    generatedLorebookEntries,
    storyQueue,
    longTermSummaries,
    summaryChunkSize,
    summaryQueue,
    visualState,
    authorNote,
    lastStateBlock,
    card,
    preset,
    persona,
    isArenaMode,
    arenaModelId,
    arenaProvider,
    arenaUserProfileId,
    autosave,
  ]);

  (0, dependencies.react.useEffect)(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const handlePageHide = () => {
      if (loadedRef.current && !dependencies.__stsBackupRestoreService?.isRestoreInProgress?.()) {
        autosave.flush().catch(() => {});
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [autosave]);

  (0, dependencies.react.useEffect)(
    () => () => {
      if (!dependencies.__stsBackupRestoreService?.isRestoreInProgress?.()) {
        autosave.flush().catch(error => console.error('Final session save failed:', error));
      }
      autosave.dispose?.();
    },
    [autosave],
  );

  const changePreset = (0, dependencies.react.useCallback)(
    async presetName => {
      const state = dependencies.sessionStore.getState();
      if (!state.card) return;
      const nextPreset = presets.find(item => item.name === presetName);
      if (nextPreset) {
        setSessionData({
          preset: nextPreset,
          mergedSettings: (0, dependencies.applySamplingOverrides)(state.card, nextPreset),
        });
        await saveSession({ preset: nextPreset });
        console.log(`[Session] Live Tuned to preset: ${nextPreset.name}`);
      }
    },
    [presets, setSessionData, saveSession],
  );

  const changePersona = (0, dependencies.react.useCallback)(
    async personaId => {
      const nextPersona = (personaId && personas.find(item => item.id === personaId)) || null;
      setSessionData({ persona: nextPersona });
      await saveSession({ persona: nextPersona });
    },
    [personas, setSessionData, saveSession],
  );

  return {
    saveSession,
    changePreset,
    changePersona,
  };
}
