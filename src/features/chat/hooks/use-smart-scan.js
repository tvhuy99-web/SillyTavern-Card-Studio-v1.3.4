// Extracted custom hook. Its caller preserves the original unconditional hook order.

function dispatchToastError(message) {
  window.dispatchEvent(new CustomEvent('toast', {
    detail: { message, type: 'error' },
  }));
}

export function useSmartScan(dependencies, fallbackCard) {
  const [isScanning, setIsScanning] = dependencies.b.useState(false);
  const { lorebooks } = dependencies.sn();

  const scanInput = dependencies.b.useCallback(request => dependencies.__stsScanWorldInfo(
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
      getSettings: dependencies.as,
      embed: dependencies.$c,
      loadIndex: dependencies.Lc,
      getIndex: dependencies.Fc,
      cosine: dependencies.Gc,
      logSystemMessage: dependencies.qu,
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
        const connectionSettings = dependencies.ns();
        if (connectionSettings.source === 'aistudio') {
          return dependencies.__stsAiStudioToolText(
            promptText,
            connectionSettings.aistudio_tool_model || connectionSettings.aistudio_model || defaultModel,
          );
        }
        if (dependencies.Cs()) {
          const proxySettings = dependencies.ns();
          return dependencies.Ks(
            promptText,
            proxySettings.proxy_tool_model || proxySettings.proxy_model || defaultModel,
            proxySettings.proxy_protocol,
          );
        }
        const response = await dependencies.cl(defaultModel, promptText, { temp: 0 }, dependencies._d);
        return response.text || '[]';
      },
      parseJson: dependencies.As,
      resolveWorldInfo: dependencies.__stsCreateUidSafeWorldInfoResolver(dependencies.ch),
    },
  ), [fallbackCard, lorebooks]);

  const processOutput = dependencies.b.useCallback(async (rawOutput, variables) => {
    const {
      updatedVariables,
      cleanedText,
      variableLog,
    } = await dependencies.$u(rawOutput, variables);

    const {
      displayContent,
      interactiveHtml,
      interactiveHtmlBlocks,
      diagnosticLog,
    } = dependencies.gd(
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
