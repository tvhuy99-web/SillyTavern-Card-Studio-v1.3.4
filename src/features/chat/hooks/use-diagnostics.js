// Custom hook composition. Dependencies are supplied by the application host.

function classifyDiagnosticLevel(line) {
  if (line.includes('[ERR]') || line.includes('[LỖI]') || line.includes('Error')) {
    return 'error';
  }
  if (line.includes('[WARN]') || line.includes('Cảnh báo')) {
    return 'warn';
  }
  if (line.includes('[OK]') || line.includes('-> [OK]')) {
    return 'script-success';
  }
  if (line.includes('[START]') || line.includes('[END]')) {
    return 'state';
  }
  if (line.includes('Kết quả mới:')) {
    return 'interaction';
  }
  return 'log';
}

export function createDiagnosticsHook(dependencies) {
  return () => {
    const {
      logs,
      addLogTurn,
      updateCurrentTurn,
      addSystemLog,
      addSmartScanLog,
      addMythicLog,
      addSelectionLog,
      clearLogs,
    } = dependencies.sessionStore();

    const startTurn = dependencies.react.useCallback(() => {
      addLogTurn({
        timestamp: Date.now(),
        prompt: [],
        response: '',
        systemLogs: [],
      });
    }, [addLogTurn]);

    const logPrompt = dependencies.react.useCallback(promptPayload => {
      updateCurrentTurn({
        prompt: typeof promptPayload === 'string'
          ? [{ id: 'legacy_raw', name: 'Raw Prompt', content: promptPayload, role: 'system' }]
          : promptPayload,
      });
    }, [updateCurrentTurn]);

    const logResponse = dependencies.react.useCallback(responseText => {
      updateCurrentTurn({ response: responseText });
    }, [updateCurrentTurn]);

    const logSummary = dependencies.react.useCallback(summaryText => {
      updateCurrentTurn({ summary: summaryText });
    }, [updateCurrentTurn]);

    const logSystemMessage = dependencies.react.useCallback((level, source, message, stack, payload) => {
      const logEntry = {
        level,
        source,
        message,
        stack,
        payload,
        timestamp: Date.now(),
      };
      addSystemLog(logEntry);
      updateCurrentTurn({ systemLogs: [logEntry] });
    }, [addSystemLog, updateCurrentTurn]);

    dependencies.react.useEffect(() => {
      const handleSystemLogEvent = event => {
        const { level, source, message, stack, payload } = event.detail;
        let formattedPayload = payload;
        if (typeof payload === 'object' && payload) {
          try {
            formattedPayload = JSON.stringify(payload, null, 2);
          } catch {
            formattedPayload = String(payload);
          }
        }
        logSystemMessage(level, source, message, stack, formattedPayload);
      };

      window.addEventListener(dependencies.systemLogEvent, handleSystemLogEvent);
      return () => {
        window.removeEventListener(dependencies.systemLogEvent, handleSystemLogEvent);
      };
    }, [logSystemMessage]);

    const logDiagnostic = dependencies.react.useCallback((diagnosticText, source = 'regex') => {
      if (!diagnosticText) {
        return;
      }
      const lines = diagnosticText.split('\n');
      const baseTimestamp = Date.now();
      const entries = [];

      lines.forEach((rawLine, index) => {
        const trimmedLine = rawLine.trim();
        if (!trimmedLine) {
          return;
        }
        entries.push({
          level: classifyDiagnosticLevel(trimmedLine),
          source,
          message: trimmedLine,
          timestamp: baseTimestamp + index,
        });
      });

      entries.forEach(entry => addSystemLog(entry));
      updateCurrentTurn({ systemLogs: entries.reverse() });
    }, [addSystemLog, updateCurrentTurn]);

    const logSmartScan = dependencies.react.useCallback((fullPrompt, rawResponse, latency) => {
      addSmartScanLog(JSON.stringify({ latency, fullPrompt, rawResponse }));
    }, [addSmartScanLog]);

    const logSelection = dependencies.react.useCallback((prompt, selectedItems) => {
      addSelectionLog(JSON.stringify({ timestamp: Date.now(), prompt, selectedItems }));
    }, [addSelectionLog]);

    const logMythic = dependencies.react.useCallback((fullPrompt, rawResponse, latency) => {
      addMythicLog(JSON.stringify({ latency, fullPrompt, rawResponse }));
    }, [addMythicLog]);

    const clearSystemLogs = dependencies.react.useCallback(() => {}, []);

    return {
      logs,
      startTurn,
      logPrompt,
      logResponse,
      logSummary,
      logDiagnostic,
      logSmartScan,
      logSelection,
      logMythic,
      logSystemMessage,
      clearLogs,
      clearSystemLogs,
    };
  };
}
