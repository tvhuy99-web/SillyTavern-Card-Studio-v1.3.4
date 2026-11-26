import { createStandaloneMythic } from '../standalone-mythic.js';
import { useResponsePipeline } from './use-response-pipeline.js';
import { useSmartScan } from './use-smart-scan.js';

// Custom hook composition. Dependencies are supplied by the application host.
export function createConversationHook(dependencies) {
  return () => {
    const chatStore = dependencies.sessionStore();
    const {
      processAIResponse: runOutputPipeline,
      createPlaceholderMessage,
    } = useResponsePipeline(dependencies);
    const { lorebooks } = dependencies.lorebookStore();
    const diagnostics = dependencies.useDiagnostics();
    const { scanInput } = useSmartScan(dependencies, chatStore.card);
    const { showToast } = dependencies.useToast();

    const [interactiveError, setInteractiveError] = dependencies.react.useState({
      hasError: false,
      title: '',
      message: '',
      canIgnore: true,
    });
    const decisionResolverRef = dependencies.react.useRef(null);

    const playSound = dependencies.react.useCallback(soundType => {
      const { visualState } = dependencies.sessionStore.getState();
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
    dependencies.react.useCallback((title, message, error, canIgnore = true) => new Promise(resolve => {
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

    const handleUserDecision = dependencies.react.useCallback(decision => {
      setInteractiveError(previous => ({ ...previous, hasError: false }));
      if (decisionResolverRef.current) {
        decisionResolverRef.current(decision);
        decisionResolverRef.current = null;
      }
    }, []);

    const stopGeneration = dependencies.react.useCallback(() => {
      const currentState = dependencies.sessionStore.getState();
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

    const runStandaloneMythic = dependencies.react.useMemo(() => createStandaloneMythic({
      readState: () => dependencies.sessionStore.getState(),
      runtime: dependencies.__stsRuntimeState,
      readSettings: dependencies.getConnectionSettings,
      proxyForTools: dependencies.getProxyForTools,
      readLorebooks: () => dependencies.lorebookStore.getState().lorebooks,
      formatTables: dependencies.filterRpgDatabaseByActiveEntries,
      buildPrompt: dependencies.buildMythicPrompt,
      defaultPrompt: dependencies.defaultMythicSystemPrompt,
      tableSnapshot: dependencies.createRpgRowSnapshot,
      parseActions: dependencies.parseRpgActions,
      applyActions: dependencies.applyRpgActions,
      buildLorebook: dependencies.buildLinkedLorebookEntries,
      log: diagnostics.logSystemMessage,
      logMythic: diagnostics.logMythic,
      playSound,
      generate: async ({ provider, model, prompt, maxTokens, signal }) => {
        if (provider === 'aistudio') {
          return dependencies.__stsAiStudioToolText(prompt, model, signal);
        }
        if (provider === 'proxy') {
          return dependencies.generateProxyToolText(
            prompt,
            model,
            dependencies.getConnectionSettings().proxy_protocol,
            0,
            maxTokens,
            signal,
          );
        }
        const apiKey = dependencies.nextGeminiKey();
        if (!apiKey) {
          throw new Error('Không tìm thấy API Key Gemini.');
        }
        const response = await new dependencies.GoogleGenAI({ apiKey }).models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            safetySettings: dependencies.defaultMythicSafetySettings,
            maxOutputTokens: maxTokens,
            abortSignal: signal,
          },
        });
        return response.text || '';
      },
    }), []);

    const handleProcessedResponse = dependencies.react.useCallback(
      (content, messageId, forced = false) => dependencies.__stsProcessAIResponse(
        { content, messageId, forced },
        {
          getState: () => dependencies.sessionStore.getState(),
          getSessionRevision: dependencies.__stsRuntimeState.getSessionRevision,
          processOutput: runOutputPipeline,
          logResponse: diagnostics.logResponse,
          playSound,
          logSystemMessage: diagnostics.logSystemMessage,
          parseRpgActions: dependencies.parseRpgActions,
          applyRpgActions: dependencies.applyRpgActions,
          buildGeneratedLorebookEntries: dependencies.buildLinkedLorebookEntries,
          nextSequence: dependencies.countModelMessages,
          setSessionData: chatStore.setSessionData,
          updateMessage: chatStore.updateMessage,
          setRpgNotification: chatStore.setRpgNotification,
          setGeneratedLorebookEntries: chatStore.setGeneratedLorebookEntries,
          runStandaloneMythic,
        },
      ),
      [chatStore, lorebooks, diagnostics, runOutputPipeline, playSound, runStandaloneMythic],
    );

    const handleArenaSelection = dependencies.react.useCallback(async (messageId, selectedSide) => {
      const currentState = dependencies.sessionStore.getState();
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

    const manualMythicTrigger = dependencies.react.useCallback(async () => {
      const currentState = dependencies.sessionStore.getState();
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
      getState: () => dependencies.sessionStore.getState(),
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
          dependencies.broadcastRuntimeMessage({
            type: 'CARD_RUNTIME_STATE_UPDATE',
            payload: { variableScopes: { global: persisted } },
          });
        } catch {}
        return persisted;
      },
      turnPolicy: dependencies.__stsChatTurnPolicy,
      nextSequence: dependencies.countModelMessages,
      preprocessInput: (rawText, state) => (
        state.visualState.disableInteractiveMode
          ? rawText
          : dependencies.processRegex(
              rawText,
              state.card.extensions?.regex_scripts || [],
              [1],
              {
                isMarkdown: false,
                isPrompt: true,
                depth: 0,
                ...dependencies.extractRegexScripts(state.extensionSettings, state.preset),
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
        buildBaseSections: dependencies.buildBaseSections,
        getSummaryChunkSize: () => dependencies.getSmartContextSettings().summarization_chunk_size || 12,
        buildPromptCore: dependencies.assemblePrompt,
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
      getConnectionSettings: dependencies.getConnectionSettings,
      getProxyProfiles: dependencies.getProxyProfiles,
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

    const sendMessage = dependencies.react.useCallback(
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
