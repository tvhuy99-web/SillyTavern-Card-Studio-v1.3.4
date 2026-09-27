export function createConversationService(deps) {
  const now = deps.now || (() => Date.now());
  const createAbortController = deps.createAbortController || (() => new AbortController());
  const streamUpdateInterval = deps.streamUpdateInterval ?? 300;
  const streamMinChars = deps.streamMinChars ?? 24;
  const yieldToBrowser = deps.yieldToBrowser || (() => new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  }));

  function updateArena(messageId, slot, updater) {
    const message = deps.getState().messages.find(item => item.id === messageId);
    if (!message?.arena) return;
    deps.updateMessage(messageId, { arena: updater(message.arena, slot) });
  }

  async function scanWorldInfo(state, content, options, turn) {
    const generatedEntries = state.generatedLorebookEntries || [];
    const context = deps.turnPolicy.buildContext(
      Array.isArray(state.messages) ? [...state.messages] : [],
      content,
      options?.forcedContent,
    );
    let scan;
    try {
      scan = await deps.scanWorldInfo({
        scanInput: context.scanInput,
        promptHistory: context.promptHistory,
        content,
        state,
        generatedEntries,
        sequence: turn.sequence,
        forceActiveUids: options?.forceActiveUids,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[World Info] Scan failed unexpectedly:', error);
      deps.logSystemMessage?.(
        'error',
        'system',
        `[World Info] Scan failed unexpectedly; continuing without dynamic entries. Error: ${message}`,
      );
      scan = { activeEntries: [], updatedRuntimeState: state.worldInfoRuntime };
    }
    scan = {
      ...scan,
      activeEntries: Array.isArray(scan?.activeEntries) ? scan.activeEntries : [],
      updatedRuntimeState: scan?.updatedRuntimeState ?? state.worldInfoRuntime,
    };
    deps.setSessionData({ worldInfoRuntime: scan.updatedRuntimeState });
    if (scan.smartScanLog) {
      deps.logSmartScan(
        scan.smartScanLog.fullPrompt,
        scan.smartScanLog.rawResponse,
        scan.smartScanLog.latency,
      );
    }
    if (scan.selectionData) {
      deps.logSelection(scan.selectionData.prompt, scan.selectionData.selectedItems);
    }
    return { scan, generatedEntries };
  }

  async function createPrompt(state, turn, scan, generatedEntries, forcedContent) {
    if (forcedContent) {
      return { fullPrompt: '', rpgSnapshot: undefined, structuredPrompt: undefined };
    }
    const prompt = await deps.buildPrompt({
      state,
      userMessage: turn.userMessage,
      activeEntries: scan.activeEntries,
      generatedEntries,
    });
    if (prompt?.updatedVariables && typeof prompt.updatedVariables === 'object') {
      deps.setSessionData({ variables: prompt.updatedVariables });
    }
    if (prompt?.updatedGlobalVariables && typeof prompt.updatedGlobalVariables === 'object') {
      deps.replaceGlobalVariables?.(prompt.updatedGlobalVariables);
    }
    deps.logPrompt(prompt.structuredPrompt);
    return prompt;
  }

  async function streamArenaSide({
    messageId, slot, model, provider, proxyConfig, prompt, preset, signal,
  }) {
    let content = '';
    try {
      const stream = deps.generationGateway.stream({
        prompt, preset, signal, model, source: provider, proxyConfig,
      });
      let lastPaint = now();
      let lastPaintLength = 0;
      for await (const chunk of stream) {
        if (signal.aborted) break;
        content += chunk.text || '';
        const timestamp = now();
        const charDelta = content.length - lastPaintLength;
        if (
          timestamp - lastPaint >= streamUpdateInterval &&
          charDelta >= streamMinChars
        ) {
          updateArena(messageId, slot, (arena, side) =>
            deps.arenaState.withContent(arena, side, content));
          lastPaint = timestamp;
          lastPaintLength = content.length;
        }
      }
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.withResult(arena, side, content, signal));
    } catch (error) {
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.withError(arena, side, error, signal, content));
    } finally {
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.complete(arena, side));
    }
  }

  async function generateArena(state, message, prompt) {
    const connection = deps.getConnectionSettings();
    const pair = deps.arenaState.describePair(message.arena, { ...state, ...connection });
    const profiles = deps.getProxyProfiles();
    const mainProxyConfig = deps.arenaState.resolveProxyConfig(
      pair.main.provider, pair.main.profileId, profiles,
    );
    const challengerProxyConfig = deps.arenaState.resolveProxyConfig(
      pair.challenger.provider, pair.challenger.profileId, profiles,
    );
    const controllerA = createAbortController();
    const controllerB = createAbortController();
    deps.addAbortController(controllerA);
    deps.addAbortController(controllerB);
    try {
      await Promise.allSettled([
        streamArenaSide({
          messageId: message.id,
          slot: 'modelA',
          model: pair.main.model,
          provider: pair.main.provider,
          proxyConfig: mainProxyConfig,
          prompt,
          preset: state.preset,
          signal: controllerA.signal,
        }),
        streamArenaSide({
          messageId: message.id,
          slot: 'modelB',
          model: pair.challenger.model,
          provider: pair.challenger.provider,
          proxyConfig: challengerProxyConfig,
          prompt,
          preset: state.preset,
          signal: controllerB.signal,
        }),
      ]);
    } finally {
      deps.removeAbortController(controllerA);
      deps.removeAbortController(controllerB);
    }
    deps.playSound('ai');
  }

  async function generateSingle(state, message, prompt, controller) {
    let content = '';
    if (state.preset.stream_response) {
      const stream = deps.generationGateway.stream({
        prompt, preset: state.preset, signal: controller.signal,
      });
      let reasoning = '';
      let lastPaint = now();
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        content += chunk.text || '';
        if (chunk.reasoning) reasoning += chunk.reasoning;
        const timestamp = now();
        if (timestamp - lastPaint > streamUpdateInterval) {
          deps.updateMessage(message.id, {
            content,
            reasoning_content: reasoning || undefined,
          });
          lastPaint = timestamp;
        }
      }
      deps.updateMessage(message.id, {
        content,
        reasoning_content: reasoning || undefined,
      });
    } else {
      deps.updateMessage(message.id, { content: '...' });
      const result = await deps.generationGateway.generateOnce({
        prompt, preset: state.preset,
      });
      content = result.response.text || '';
      deps.updateMessage(message.id, {
        content,
        reasoning_content: result.reasoning,
      });
    }
    if (!controller.signal.aborted) {
      await deps.processAIResponse(content, message.id, false);
    }
  }

  async function send(rawContent, options = {}) {
    const initialState = deps.getState();
    if (!initialState.card || !initialState.preset || !String(rawContent ?? '').trim()) return;

    deps.setError(null);
    deps.setLoading(true);
    const controller = createAbortController();
    deps.addAbortController(controller);

    let succeeded = true;
    try {
      // Let React/Zustand paint the busy state before preprocessing, rewind work,
      // state snapshots, Smart Scan, or prompt construction can occupy the main thread.
      await yieldToBrowser();
      if (controller.signal.aborted) return false;

      if (typeof options.beforeTurn === 'function') {
        const prepared = await options.beforeTurn({ signal: controller.signal });
        if (prepared === false || controller.signal.aborted) return false;
      }

      const state = deps.getState();
      const content = deps.preprocessInput(rawContent, state);
      if (!String(content ?? '').trim()) return false;

      deps.startTurn();
      const turn = deps.turnPolicy.beginTurn({
        state,
        content,
        sequence: deps.nextSequence(state.messages),
      });
      deps.addMessage(turn.userMessage);

      const { scan, generatedEntries } = await scanWorldInfo(
        state, content, options, turn,
      );
      const prompt = await createPrompt(
        state, turn, scan, generatedEntries, options?.forcedContent,
      );

      const compactedHistory = deps.turnPolicy.compactModelMessages(
        deps.getState().messages,
        { keepLatest: false },
      );
      if (compactedHistory.changed) deps.setMessages(compactedHistory.messages);

      const message = deps.createPlaceholderMessage('model');
      message.rpgState = turn.rpgState;
      message.worldInfoRuntime = scan.updatedRuntimeState;
      message.worldInfoState = turn.worldInfoState;
      message.rpgSnapshot = prompt.rpgSnapshot;
      message.activeLorebookUids = scan.activeEntries
        .map(entry => entry.uid)
        .filter(Boolean);

      if (state.isArenaMode && state.arenaModelId && !options?.forcedContent) {
        message.arena = deps.turnPolicy.createArenaState(
          deps.getConnectionSettings(), state,
        );
        message.content = '';
      }
      deps.addMessage(message);

      if (options?.forcedContent) {
        const forcedContent = options.forcedContent;
        deps.updateMessage(message.id, { content: forcedContent });
        if (!controller.signal.aborted) {
          await deps.processAIResponse(forcedContent, message.id, true);
        }
      } else if (state.isArenaMode && state.arenaModelId) {
        await generateArena(state, message, prompt.fullPrompt);
      } else {
        await generateSingle(state, message, prompt.fullPrompt, controller);
      }
    } catch (error) {
      succeeded = false;
      if (!deps.turnPolicy.isAbortLike(error, controller.signal)) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        deps.setError('Lỗi: ' + message);
        deps.logSystemMessage('api-error', 'network', message);
      }
    } finally {
      deps.removeAbortController(controller);
      if (deps.runtimeSize() === 0) deps.setLoading(false);
    }
    return succeeded && !controller.signal.aborted;
  }

  return Object.freeze({ send });
}
