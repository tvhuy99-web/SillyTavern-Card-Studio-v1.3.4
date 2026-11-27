import { abortError, awaitAbortable } from '../../core/async/cancellation.js';

export function createConversationService(deps) {
  const now = deps.now || (() => Date.now());
  const createAbortController = deps.createAbortController || (() => new AbortController());
  const streamFirstChunkTimeoutMs = deps.streamFirstChunkTimeoutMs ?? 120000;
  const streamIdleTimeoutMs = deps.streamIdleTimeoutMs ?? 30000;
  const streamGapWarningMs = deps.streamGapWarningMs ?? 5000;
  const yieldToBrowser = deps.yieldToBrowser || (() => new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  }));

  function captureOwnership(state) {
    const sessionId = state.sessionId;
    const revision = deps.getSessionRevision?.();
    return () => deps.getState().sessionId === sessionId && deps.getSessionRevision?.() === revision;
  }

  function updateArena(messageId, slot, updater, ownsSession) {
    if (!ownsSession()) return;
    const message = deps.getState().messages.find(item => item.id === messageId);
    if (!message?.arena) return;
    deps.updateMessage(messageId, { arena: updater(message.arena, slot) });
  }

  function streamTimeoutError(label, timeoutMs, chunkCount) {
    const error = new Error(
      chunkCount > 0
        ? `Luồng ${label} không nhận dữ liệu mới trong ${Math.round(timeoutMs / 1000)} giây.`
        : `Luồng ${label} không nhận được dữ liệu đầu tiên trong ${Math.round(timeoutMs / 1000)} giây.`,
    );
    error.code = 'STREAM_IDLE_TIMEOUT';
    return error;
  }

  async function* watchStream(stream, controller, label) {
    const iterator = stream[Symbol.asyncIterator]();
    const startedAt = now();
    let lastChunkAt = startedAt;
    let chunkCount = 0;
    let charCount = 0;
    let completed = false;

    try {
      while (!controller.signal.aborted) {

        const isAiStudio = String(label).startsWith('aistudio:');
        const timeoutMs = chunkCount === 0
          ? (isAiStudio ? Math.max(streamFirstChunkTimeoutMs, 320000) : streamFirstChunkTimeoutMs)
          : (isAiStudio ? Math.max(streamIdleTimeoutMs, 120000) : streamIdleTimeoutMs);
        let timeoutId;
        let result;
        try {
          result = await Promise.race([
            awaitAbortable(() => iterator.next(), controller.signal),
            new Promise((_, reject) => {
              timeoutId = setTimeout(
                () => reject(streamTimeoutError(label, timeoutMs, chunkCount)),
                timeoutMs,
              );
            }),
          ]);
        } catch (error) {
          if (error?.code === 'STREAM_IDLE_TIMEOUT') {
            deps.logSystemMessage?.(
              'error',
              'stream',
              `[STREAM] ${label}: timeout after ${chunkCount} chunks, ${charCount} chars.`,
            );
            try { controller.abort('stream-idle-timeout'); } catch {}
          }
          throw error;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        if (result?.done) {
          completed = true;
          break;
        }

        const timestamp = now();
        const gapMs = timestamp - lastChunkAt;
        chunkCount += 1;
        charCount += String(result?.value?.text || '').length;
        charCount += String(result?.value?.reasoning || '').length;
        if (chunkCount > 1 && gapMs >= streamGapWarningMs) {
          deps.logSystemMessage?.(
            'warn',
            'stream',
            `[STREAM] ${label}: gap ${Math.round(gapMs)}ms before chunk #${chunkCount}.`,
          );
        }
        lastChunkAt = timestamp;
        yield result.value;
      }
    } finally {
      if (!completed) {
        try {
          const returned = iterator.return?.();
          Promise.resolve(returned).catch(() => {});
        } catch {}
      }
      const durationMs = now() - startedAt;
      if (completed && durationMs >= 10000) {
        deps.logSystemMessage?.(
          'performance',
          'stream',
          `[STREAM] ${label}: completed ${chunkCount} chunks / ${charCount} chars in ${Math.round(durationMs)}ms.`,
        );
      }
    }
  }

  async function scanWorldInfo(state, content, options, turn, assertActive) {
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
      assertActive();
      const message = error instanceof Error ? error.message : String(error);
      console.error('[World Info] Scan failed unexpectedly:', error);
      deps.logSystemMessage?.(
        'error',
        'system',
        `[World Info] Scan failed unexpectedly; continuing without dynamic entries. Error: ${message}`,
      );
      scan = { activeEntries: [], updatedRuntimeState: state.worldInfoRuntime };
    }
    assertActive();
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

  function applyPromptVariables(prompt) {
    if (prompt?.updatedVariables && typeof prompt.updatedVariables === 'object') {
      deps.setSessionData({ variables: prompt.updatedVariables });
    }
    if (prompt?.updatedGlobalVariables && typeof prompt.updatedGlobalVariables === 'object') {
      deps.replaceGlobalVariables?.(prompt.updatedGlobalVariables);
    }
  }

  async function createPrompt(state, turn, scan, generatedEntries, forcedContent, assertActive) {
    if (forcedContent) {
      return { fullPrompt: '', rpgSnapshot: undefined, structuredPrompt: undefined };
    }
    const prompt = await deps.buildPrompt({
      state,
      userMessage: turn.userMessage,
      activeEntries: scan.activeEntries,
      generatedEntries,
    });
    assertActive();
    applyPromptVariables(prompt);
    deps.logPrompt(prompt.structuredPrompt);
    return prompt;
  }

  async function streamArenaSide({
    messageId, slot, model, provider, proxyConfig, prompt, preset, controller, ownsSession,
  }) {
    const signal = controller.signal;
    let content = '';
    try {
      const stream = deps.generationGateway.stream({
        prompt, preset, signal, model, source: provider, proxyConfig,
      });
      for await (const chunk of watchStream(
        stream,
        controller,
        `${provider || 'default'}:${model || slot}`,
      )) {
        if (signal.aborted || !ownsSession()) break;
        content = chunk.replaceText === true
          ? String(chunk.text || '')
          : content + String(chunk.text || '');
        deps.liveStream.publish(messageId, slot, content);
      }
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.withResult(arena, side, content, signal), ownsSession);
      return ownsSession() && !signal.aborted && Boolean(content.trim());
    } catch (error) {
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.withError(arena, side, error, signal, content), ownsSession);
      return false;
    } finally {
      updateArena(messageId, slot, (arena, side) =>
        deps.arenaState.complete(arena, side), ownsSession);
      deps.liveStream.clear(messageId, slot);
    }
  }

  async function generateArena(state, message, prompt, controller, ownsSession) {
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
    const abortSides = () => { controllerA.abort(); controllerB.abort(); };
    controller.signal.addEventListener('abort', abortSides, { once: true });
    if (controller.signal.aborted) abortSides();
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
          controller: controllerA, ownsSession,
        }),
        streamArenaSide({
          messageId: message.id,
          slot: 'modelB',
          model: pair.challenger.model,
          provider: pair.challenger.provider,
          proxyConfig: challengerProxyConfig,
          prompt,
          preset: state.preset,
          controller: controllerB, ownsSession,
        }),
      ]);
    } finally {
      controller.signal.removeEventListener('abort', abortSides);
      deps.removeAbortController(controllerA);
      deps.removeAbortController(controllerB);
    }
    if (ownsSession() && !controller.signal.aborted) deps.playSound('ai');
  }

  async function generateSingle(state, message, prompt, controller, ownsSession, assertActive) {
    let content = '';

    const connectionSource = deps.getConnectionSettings?.()?.source;
    if (state.preset.stream_response || connectionSource === 'aistudio') {
      const stream = deps.generationGateway.stream({
        prompt, preset: state.preset, signal: controller.signal,
      });
      let reasoning = '';
      try {
        const connection = deps.getConnectionSettings?.() || {};
        const source = connection.source || 'default';
        const model = source === 'gemini'
          ? connection.gemini_model
          : source === 'proxy'
            ? connection.proxy_model
            : source === 'aistudio' ? connection.aistudio_model : connection.openrouter_model;
        for await (const chunk of watchStream(
          stream,
          controller,
          `${source}:${model || 'default'}`,
        )) {
          if (controller.signal.aborted || !ownsSession()) break;
          content = chunk.replaceText === true
            ? String(chunk.text || '')
            : content + String(chunk.text || '');
          if (chunk.replaceReasoning === true) reasoning = String(chunk.reasoning || "");
          else if (chunk.reasoning) reasoning += chunk.reasoning;
          deps.liveStream.publish(message.id, 'main', content, reasoning || undefined);
        }
      } finally {
        if (ownsSession()) deps.updateMessage(message.id, {
          content,
          reasoning_content: reasoning || undefined,
        });
        deps.liveStream.clear(message.id, 'main');
      }
    } else {
      deps.updateMessage(message.id, { content: '...' });
      let result;
      try {
        result = await awaitAbortable(() => deps.generationGateway.generateOnce({
          prompt, preset: state.preset, signal: controller.signal,
        }), controller.signal);
        assertActive();
      } catch (error) {
        if (ownsSession() && controller.signal.aborted) deps.updateMessage(message.id, { content: '' });
        throw error;
      }
      content = result.response.text || '';
      deps.updateMessage(message.id, {
        content,
        reasoning_content: result.reasoning,
      });
    }
    if (ownsSession() && !controller.signal.aborted) {
      await deps.processAIResponse(content, message.id, false);
    }
  }

  async function send(rawContent, options = {}) {
    const initialState = deps.getState();
    if (!initialState.card || !initialState.preset || !String(rawContent ?? '').trim()) return;

    const ownsSession = captureOwnership(initialState);
    deps.setError(null);
    deps.setLoading(true);
    const controller = createAbortController();
    deps.addAbortController(controller);
    const assertActive = () => {
      if (!ownsSession() || controller.signal.aborted) throw abortError();
    };

    let succeeded = true;
    try {

      await yieldToBrowser();
      assertActive();

      if (typeof options.beforeTurn === 'function') {
        const prepared = await options.beforeTurn({ signal: controller.signal });
        assertActive();
        if (prepared === false) return false;
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
        state, content, options, turn, assertActive,
      );
      const prompt = await createPrompt(
        state, turn, scan, generatedEntries, options?.forcedContent, assertActive,
      );

      assertActive();
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
        await generateArena(state, message, prompt.fullPrompt, controller, ownsSession);
      } else {
        await generateSingle(state, message, prompt.fullPrompt, controller, ownsSession, assertActive);
      }
    } catch (error) {
      succeeded = false;
      const streamTimedOut = error?.code === 'STREAM_IDLE_TIMEOUT';
      if (ownsSession() && (streamTimedOut || !deps.turnPolicy.isAbortLike(error, controller.signal))) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        deps.setError('Lỗi: ' + message);
        deps.logSystemMessage('api-error', 'network', message);
      }
    } finally {
      deps.removeAbortController(controller);
      if (ownsSession() && deps.runtimeSize() === 0) deps.setLoading(false);
    }
    return succeeded && ownsSession() && !controller.signal.aborted;
  }

  async function retryArena(messageId, sideName) {
    const state = deps.getState();
    const message = state.messages.find(item => item.id === messageId);
    if (!message?.arena || !['A', 'B'].includes(sideName)) return false;
    const ownsSession = captureOwnership(state);
    const retry = deps.arenaState.prepareRetry(message.arena, sideName, deps.getConnectionSettings(), {
      modelId: state.arenaModelId, provider: state.arenaProvider, userProfileId: state.arenaUserProfileId,
    });
    if (!retry.model) {
      deps.notify?.('Không xác định được Model ID để thử lại.', 'error');
      return false;
    }
    const controller = createAbortController();
    deps.addAbortController(controller);
    deps.updateMessage(messageId, { arena: retry.arena });
    deps.setLoading(true);
    let enteredStream = false;
    try {
      await yieldToBrowser();
      if (!ownsSession() || controller.signal.aborted) throw abortError();
      const generatedEntries = state.generatedLorebookEntries || [];
      const activeUids = new Set(message.activeLorebookUids || []);
      const entries = [
        ...(state.card?.char_book?.entries || []),
        ...(deps.getLorebooks?.() || []).flatMap(book => book.book?.entries || []),
        ...generatedEntries,
      ];
      const prompt = await deps.buildPrompt({ state, messages: state.messages.filter(item => item.id !== messageId),
        activeEntries: entries.filter(entry => entry.uid && activeUids.has(entry.uid)), generatedEntries });
      if (!ownsSession() || controller.signal.aborted) throw abortError();
      applyPromptVariables(prompt);
      const proxyConfig = deps.arenaState.resolveProxyConfig(retry.provider, retry.profileId, deps.getProxyProfiles());
      enteredStream = true;
      return await streamArenaSide({ messageId, slot: retry.slot, model: retry.model, provider: retry.provider,
        proxyConfig, prompt: prompt.fullPrompt, preset: state.preset, controller, ownsSession });
    } catch (error) {
      updateArena(messageId, retry.slot, (arena, slot) => deps.arenaState.withError(arena, slot, error, controller.signal), ownsSession);
      return false;
    } finally {
      if (!enteredStream) {
        updateArena(messageId, retry.slot, (arena, slot) => deps.arenaState.complete(arena, slot), ownsSession);
        deps.liveStream.clear(messageId, retry.slot);
      }
      deps.removeAbortController(controller);
      if (ownsSession() && deps.runtimeSize() === 0) deps.setLoading(false);
    }
  }

  return Object.freeze({ send, retryArena });
}
