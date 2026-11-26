// Extracted custom hook. Its caller preserves the original unconditional hook order.

function dispatchToastError(message) {
  window.dispatchEvent(new CustomEvent('toast', {
    detail: { message, type: 'error' },
  }));
}

export function useSmartScan(dependencies, fallbackCard) {
  const [isScanning, setIsScanning] = dependencies.react.useState(false);
  const { lorebooks } = dependencies.lorebookStore();

  const scanInput = dependencies.react.useCallback(request => dependencies.__stsScanWorldInfo(
    {
      scanInput: request?.scanInput ?? '',
      worldInfoState: request?.state?.worldInfoState ?? {},
      worldInfoRuntime: request?.state?.worldInfoRuntime ?? {},
      worldInfoPinned: request?.state?.worldInfoPinned ?? {},
      preset: request?.state?.preset ?? {},
      promptHistory: request?.promptHistory ?? [],
      content: request?.content ?? '',
      variables: request?.state?.variables ?? {},
      generatedEntries: request?.generatedEntries ?? [],
      sequence: request?.sequence ?? 0,
      forceActiveUids: request?.forceActiveUids,
      card: request?.state?.card ?? fallbackCard,
      lorebooks,
      setScanning: setIsScanning,
    },
    {
      getSettings: dependencies.getSmartScanSettings,
      embed: dependencies.embedQuery,
      loadIndex: dependencies.loadEmbeddingIndex,
      getIndex: dependencies.getEmbeddingIndex,
      cosine: dependencies.cosineSimilarity,
      logSystemMessage: dependencies.dispatchSystemLog,
      onSemanticError: error => {
        if (error.message?.includes('API Key')) {
          dispatchToastError('Vui lòng cấu hình Gemini API Key trong phần Cài đặt để sử dụng Semantic Search.');
        } else if (error.message?.includes('chưa được tải')) {
          dispatchToastError(error.message);
        } else {
          dispatchToastError('Lỗi Semantic Search, chuyển sang quét từ khóa.');
        }
      },
      callSelectionModel: async (promptText, defaultModel) => {
        const connectionSettings = dependencies.getConnectionSettings();
        if (connectionSettings.source === 'aistudio') {
          return dependencies.__stsAiStudioToolText(
            promptText,
            connectionSettings.aistudio_tool_model || connectionSettings.aistudio_model || defaultModel,
          );
        }
        if (dependencies.getProxyForTools()) {
          const proxySettings = dependencies.getConnectionSettings();
          return dependencies.generateProxyToolText(
            promptText,
            proxySettings.proxy_tool_model || proxySettings.proxy_model || defaultModel,
            proxySettings.proxy_protocol,
          );
        }
        const response = await dependencies.generateGeminiToolText(defaultModel, promptText, { temp: 0 }, dependencies.conversationSafetySettings);
        return response.text || '[]';
      },
      parseJson: dependencies.parseRelaxedJson,
      resolveWorldInfo: dependencies.__stsCreateUidSafeWorldInfoResolver(dependencies.resolveWorldInfo),
    },
  ), [fallbackCard, lorebooks]);

  const processOutput = dependencies.react.useCallback(async (rawOutput, variables) => {
    const {
      updatedVariables,
      cleanedText,
      variableLog,
    } = await dependencies.executeUpdateVariableBlock(rawOutput, variables);

    const {
      displayContent,
      interactiveHtml,
      interactiveHtmlBlocks,
      diagnosticLog,
    } = dependencies.processRegex(
      cleanedText,
      fallbackCard?.extensions?.regex_scripts || [],
      [2],
      { isMarkdown: true, isPrompt: false, depth: 0 },
    );

    return {
      updatedVariables,
      displayContent,
      interactiveHtml,
      interactiveHtmlBlocks,
      diagnosticLog,
      variableLog,
      originalRawContent: rawOutput,
    };
  }, [fallbackCard]);

  return {
    scanInput,
    processOutput,
    isScanning,
  };
}
