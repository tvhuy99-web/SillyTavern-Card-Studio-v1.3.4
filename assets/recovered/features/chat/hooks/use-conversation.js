import { createStandaloneMythic } from '../standalone-mythic.js';
import { useResponsePipeline } from './use-response-pipeline.js';
import { useSmartScan } from './use-smart-scan.js';

// Custom hook composition. Dependencies are supplied by the application host.
export function createConversationHook(dependencies) {
  return () => {
    const chatStore = dependencies.ol();
    const {
      processAIResponse: runOutputPipeline,
      createPlaceholderMessage,
    } = useResponsePipeline(dependencies);
    const { lorebooks } = dependencies.sn();
    const diagnostics = dependencies.mh();
    const { scanInput } = useSmartScan(dependencies, chatStore.card);
    const { showToast } = dependencies.hl();

    const [interactiveError, setInteractiveError] = dependencies.b.useState({
      hasError: false,
      title: '',
      message: '',
      canIgnore: true,
    });
    const decisionResolverRef = dependencies.b.useRef(null);

    const playSound = dependencies.b.useCallback(soundType => {
      const { visualState } = dependencies.ol.getState();
      if (visualState.systemSoundEnabled === false) {
        return;
      }
      let soundUrl = '';
      if (soundType === 'ai') {
        soundUrl = visualState.aiSoundUrl || '';
      }
      if (soundType === 'rpg') {
        soundUrl = visualState.rpgSoundUrl || '';
      }
      if (soundUrl) {
        const audio = new Audio(soundUrl);
        audio.volume = 0.5;
        audio.play().catch(error => console.warn('Sound play error:', error));
      }
    }, []);

    // Preserve unconditional hook order for interactive error decision prompt.
    dependencies.b.useCallback((title, message, error, canIgnore = true) => new Promise(resolve => {
      const errorDetails = error instanceof Error ? error.message : String(error);
      setInteractiveError({
        hasError: true,
        title,
        message,
        errorDetails,
        canIgnore,
      });
      decisionResolverRef.current = resolve;
    }), []);

    const handleUserDecision = dependencies.b.useCallback(decision => {
      setInteractiveError(previous => ({ ...previous, hasError: false }));
      if (decisionResolverRef.current) {
        decisionResolverRef.current(decision);
        decisionResolverRef.current = null;
      }
    }, []);

    const stopGeneration = dependencies.b.useCallback(() => {
      const currentState = dependencies.ol.getState();
      if (dependencies.__stsRuntimeState.size() > 0) {
        currentState.abortAll();
        chatStore.setLoading(false);
        diagnostics.logSystemMessage(
          'interaction',
          'system',
          'Người dùng đã dừng quá trình tạo.',
        );
      }
    }, [chatStore, diagnostics]);

    const runStandaloneMythic = dependencies.b.useMemo(() => createStandaloneMythic({
      readState: () => dependencies.ol.getState(),
      runtime: dependencies.__stsRuntimeState,
      readSettings: dependencies.ns,
      proxyForTools: dependencies.Cs,
      readLorebooks: () => dependencies.sn.getState().lorebooks,
      formatTables: dependencies.el,
      buildPrompt: dependencies.Zs,
      defaultPrompt: dependencies.Js,
      tableSnapshot: dependencies.Qs,
      parseActions: dependencies.tl,
      applyActions: dependencies.nl,
      buildLorebook: dependencies.rl,
      log: diagnostics.logSystemMessage,
      logMythic: diagnostics.logMythic,
      playSound,
      generate: async ({ provider, model, prompt, maxTokens, signal }) => {
        if (provider === 'aistudio') {
          return dependencies.__stsAiStudioToolText(prompt, model, signal);
        }
        if (provider === 'proxy') {
          return dependencies.Ks(
            prompt,
            model,
            dependencies.ns().proxy_protocol,
            0,
            maxTokens,
            signal,
          );
        }
        const apiKey = dependencies.ys();
        if (!apiKey) {
          throw new Error('Không tìm thấy API Key Gemini.');
        }
        const response = await new dependencies.vo({ apiKey }).models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            safetySettings: dependencies.Ys,
            maxOutputTokens: maxTokens,
            abortSignal: signal,
          },
        });
        return response.text || '';
      },
    }), []);

    const handleProcessedResponse = dependencies.b.useCallback(
      (content, messageId, forced = false) => dependencies.__stsProcessAIResponse(
        { content, messageId, forced },
        {
          getState: () => dependencies.ol.getState(),
          getSessionRevision: dependencies.__stsRuntimeState.getSessionRevision,
          processOutput: runOutputPipeline,
          logResponse: diagnostics.logResponse,
          playSound,
          logSystemMessage: diagnostics.logSystemMessage,
          parseRpgActions: dependencies.tl,
          applyRpgActions: dependencies.nl,
          buildGeneratedLorebookEntries: dependencies.rl,
          nextSequence: dependencies.gh,
          setSessionData: chatStore.setSessionData,
          updateMessage: chatStore.updateMessage,
          setRpgNotification: chatStore.setRpgNotification,
          setGeneratedLorebookEntries: chatStore.setGeneratedLorebookEntries,
          runStandaloneMythic,
        },
      ),
      [chatStore, lorebooks, diagnostics, runOutputPipeline, playSound, runStandaloneMythic],
    );

    const handleArenaSelection = dependencies.b.useCallback(async (messageId, selectedSide) => {
      const currentState = dependencies.ol.getState();
      const targetMessage = currentState.messages.find(message => message.id === messageId);
      if (!targetMessage || !targetMessage.arena) {
        return;
      }

      const arenaDecision = dependencies.__stsArenaState.select(targetMessage.arena, selectedSide);
      if (!arenaDecision.ok) {
        diagnostics.logSystemMessage(
          'error',
          'system',
          `Arena: Không thể chọn ${selectedSide} vì phản hồi chưa hoàn tất hợp lệ.`,
        );
        return;
      }

      if (dependencies.__stsRuntimeState.size() > 0) {
        currentState.abortAll();
      }

      const selectedContent = arenaDecision.content;
      const selectedModelName = arenaDecision.name;
      chatStore.updateMessage(messageId, {
        content: selectedContent,
        arena: { ...targetMessage.arena, selected: selectedSide },
      });
      diagnostics.logSystemMessage(
        'interaction',
        'system',
        `Arena: Người dùng chọn ${selectedSide} (${selectedModelName}). Bắt đầu xử lý logic...`,
      );
      chatStore.setLoading(true);

      const sessionRevision = dependencies.__stsRuntimeState.getSessionRevision();
      try {
        await handleProcessedResponse(selectedContent, messageId, false);
      } finally {
        if (
          sessionRevision === dependencies.__stsRuntimeState.getSessionRevision()
          && dependencies.__stsRuntimeState.size() === 0
        ) {
          chatStore.setLoading(false);
        }
      }
    }, [chatStore, diagnostics, handleProcessedResponse]);

    const handleArenaRetry = (messageId, side) => conversationService.retryArena(messageId, side);

    const manualMythicTrigger = dependencies.b.useCallback(async () => {
      const currentState = dependencies.ol.getState();
      if (!currentState.card?.rpg_data) {
        showToast('Không tìm thấy dữ liệu RPG.', 'warning');
        return;
      }
      const latestModelMessage = [...currentState.messages]
        .reverse()
        .find(message => message.role === 'model');

      if (latestModelMessage && !currentState.isLoading && !currentState.isSummarizing) {
        const sessionRevision = dependencies.__stsRuntimeState.getSessionRevision();
        chatStore.setLoading(true);
        try {
          await runStandaloneMythic(latestModelMessage.content, latestModelMessage.id);
        } finally {
          if (
            sessionRevision === dependencies.__stsRuntimeState.getSessionRevision()
            && dependencies.__stsRuntimeState.size() === 0
          ) {
            chatStore.setLoading(false);
          }
        }
      }
    }, [chatStore, showToast, runStandaloneMythic]);

    const conversationService = dependencies.__stsCreateConversationService({
      getState: () => dependencies.ol.getState(),
      getSessionRevision: dependencies.__stsRuntimeState.getSessionRevision,
      setError: chatStore.setError,
      setLoading: chatStore.setLoading,
      startTurn: diagnostics.startTurn,
      addAbortController: chatStore.addAbortController,
      removeAbortController: chatStore.removeAbortController,
      addMessage: chatStore.addMessage,
      updateMessage: chatStore.updateMessage,
      setMessages: chatStore.setMessages,
      setSessionData: chatStore.setSessionData,
      replaceGlobalVariables: nextGlobalVariables => {
        const persisted = dependencies.__stsWriteGlobalVariables(nextGlobalVariables);
        try {
          dependencies.Wh({
            type: 'CARD_RUNTIME_STATE_UPDATE',
            payload: { variableScopes: { global: persisted } },
          });
        } catch {}
        return persisted;
      },
      turnPolicy: dependencies.__stsChatTurnPolicy,
      nextSequence: dependencies.gh,
      preprocessInput: (rawText, state) => (
        state.visualState.disableInteractiveMode
          ? rawText
          : dependencies.gd(
              rawText,
              state.card.extensions?.regex_scripts || [],
              [1],
              {
                isMarkdown: false,
                isPrompt: true,
                depth: 0,
                ...dependencies.Zu(state.extensionSettings, state.preset),
                macros: {
                  char: state.card.name,
                  bot: state.card.name,
                  user: state.persona?.name || 'User',
                },
              },
            ).displayContent
      ),
      scanWorldInfo: scanInput,
      logSmartScan: diagnostics.logSmartScan,
      logSelection: diagnostics.logSelection,
      buildPrompt: promptInput => dependencies.__stsBuildConversationPrompt(promptInput, {
        lorebooks,
        buildBaseSections: dependencies.vd,
        getSummaryChunkSize: () => dependencies.os().summarization_chunk_size || 12,
        buildPromptCore: dependencies.xd,
        onTiming: timing => {
          if (timing.totalMs >= 500) {
            diagnostics.logSystemMessage(
              'warn',
              'performance',
              `[PERF] Prompt build ${Math.round(timing.totalMs)}ms (core ${Math.round(timing.coreMs)}ms, ${timing.messageCount} messages, ${timing.characterCount} chars).`,
            );
          }
        },
      }),
      logPrompt: diagnostics.logPrompt,
      createPlaceholderMessage,
      getConnectionSettings: dependencies.ns,
      getProxyProfiles: dependencies.cs,
      getLorebooks: () => lorebooks,
      notify: showToast,
      arenaState: dependencies.__stsArenaState,
      generationGateway: dependencies.__stsGenerationGateway,
      liveStream: dependencies.__stsLiveStreamStore,
      processAIResponse: handleProcessedResponse,
      playSound,
      logSystemMessage: diagnostics.logSystemMessage,
      runtimeSize: () => dependencies.__stsRuntimeState.size(),
    });

    const sendMessage = dependencies.b.useCallback(
      (content, options) => conversationService.send(content, options),
      [conversationService],
    );

    return {
      sendMessage,
      stopGeneration,
      interactiveError,
      handleUserDecision,
      manualMythicTrigger,
      processAIResponse: runOutputPipeline,
      handleArenaSelection,
      handleArenaRetry,
    };
  };
}
