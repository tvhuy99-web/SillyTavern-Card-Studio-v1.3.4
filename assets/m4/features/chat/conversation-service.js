export function createConversationService(deps) {
  const now = deps.now || (() => Date.now());
  const createAbortController = deps.createAbortController || (() => new AbortController());
  const streamUpdateInterval = deps.streamUpdateInterval ?? 100;

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
    } catch {
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
      for await (const chunk of stream) {
        if (signal.aborted) break;
        content += chunk.text || '';
        const timestamp = now();
        if (timestamp - lastPaint > streamUpdateInterval) {
          updateArena(messageId, slot, (arena, side) =>
            deps.arenaState.withContent(arena, side, content));
          lastPaint = timestamp;
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
    const state = deps.getState();
    if (!state.card || !state.preset || !String(rawContent ?? '').trim()) return;
    const content = deps.preprocessInput(rawContent, state);
    if (!String(content ?? '').trim()) return;

    deps.setError(null);
    deps.setLoading(true);
    deps.startTurn();
    const controller = createAbortController();
    deps.addAbortController(controller);

    const turn = deps.turnPolicy.beginTurn({
      state,
      content,
      sequence: deps.nextSequence(state.messages),
    });
    deps.addMessage(turn.userMessage);

    let succeeded = true;
    try {
      const { scan, generatedEntries } = await scanWorldInfo(
        state, content, options, turn,
      );
      const prompt = await createPrompt(
        state, turn, scan, generatedEntries, options?.forcedContent,
      );

      const message = deps.createPlaceholderMessage('model');
      message.rpgState = turn.rpgState;
      message.worldInfoRuntime = scan.updatedRuntimeState;
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
