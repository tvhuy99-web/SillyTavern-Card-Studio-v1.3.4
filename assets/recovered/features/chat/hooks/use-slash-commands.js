// Extracted custom hook. Its caller preserves the original unconditional hook order.

const MAX_EXECUTION_STEPS = 5000;

function parseSlashScriptCommands(scriptText) {
  return scriptText
    .replace(/"([^"]*)"/g, quoted => quoted.replace(/\|/g, '%%PIPE%%'))
    .split(/[\n|]+/)
    .map(command => command.trim())
    .filter(Boolean);
}

function indexScriptLabels(commands) {
  const labels = {};
  commands.forEach((commandText, index) => {
    let labelName = '';
    if (commandText.toLowerCase().startsWith('/label')) {
      const tokens = commandText.trim().split(/\s+/);
      if (tokens.length > 1) {
        labelName = tokens[1];
      }
    } else if (commandText.startsWith('::') && commandText.endsWith('::')) {
      labelName = commandText.slice(2, -2).trim();
    } else if (commandText.startsWith(':')) {
      labelName = commandText.slice(1).trim();
    }
    if (labelName) {
      labels[labelName] = index;
    }
  });
  return labels;
}

async function runSlashScript(scriptText, context, dependencies) {
  const commands = parseSlashScriptCommands(scriptText);
  const labels = indexScriptLabels(commands);
  const executionState = {
    pc: 0,
    commands,
    labels,
    flowStack: [],
    maxSteps: MAX_EXECUTION_STEPS,
    lastResult: '',
  };

  let stepCount = 0;
  while (executionState.pc < executionState.commands.length) {
    stepCount += 1;
    if (stepCount > executionState.maxSteps) {
      context.log('error', 'Script terminated: Max execution steps reached (Possible infinite loop).');
      break;
    }

    const rawCommand = executionState.commands[executionState.pc];
    executionState.pc += 1;

    if (rawCommand.startsWith(':') || rawCommand.toLowerCase().startsWith('/label')) {
      continue;
    }

    let resolvedCommand = rawCommand
      .replace(/%%PIPE%%/g, '|')
      .replace(/{{\s*pipe\s*}}/gi, executionState.lastResult);
    resolvedCommand = dependencies.expandSlashMacros(resolvedCommand, context);

    const tokens = dependencies.tokenizeSlashCommand(resolvedCommand);
    if (tokens.length === 0) {
      continue;
    }

    const commandName = tokens[0].startsWith('/')
      ? tokens[0].slice(1).toLowerCase()
      : tokens[0].toLowerCase();
    const args = tokens.slice(1);
    const rawArgsText = resolvedCommand
      .substring(resolvedCommand.indexOf(tokens[0]) + tokens[0].length)
      .trim();
    const isCurrentlyExecutable = executionState.flowStack.every(frame => frame.isExecutable);

    if (commandName === 'if') {
      let conditionResult = false;
      if (isCurrentlyExecutable && args.length >= 3) {
        try {
          conditionResult = dependencies.compareSlashValues(args[0], args[1], args[2]);
        } catch {}
      }
      executionState.flowStack.push({
        type: 'IF',
        isExecutable: isCurrentlyExecutable && conditionResult,
        complete: isCurrentlyExecutable && conditionResult,
      });
      continue;
    }

    if (commandName === 'elseif' || commandName === 'elif') {
      if (executionState.flowStack.length === 0) {
        continue;
      }
      const activeFrame = executionState.flowStack[executionState.flowStack.length - 1];
      const parentExecutable = executionState.flowStack
        .slice(0, -1)
        .every(frame => frame.isExecutable);

      if (!parentExecutable || activeFrame.complete) {
        activeFrame.isExecutable = false;
      } else {
        let conditionResult = false;
        if (args.length >= 3) {
          try {
            conditionResult = dependencies.compareSlashValues(args[0], args[1], args[2]);
          } catch {}
        }
        if (conditionResult) {
          activeFrame.isExecutable = true;
          activeFrame.complete = true;
        } else {
          activeFrame.isExecutable = false;
        }
      }
      continue;
    }

    if (commandName === 'else') {
      if (executionState.flowStack.length === 0) {
        continue;
      }
      const activeFrame = executionState.flowStack[executionState.flowStack.length - 1];
      const parentExecutable = executionState.flowStack
        .slice(0, -1)
        .every(frame => frame.isExecutable);

      if (!parentExecutable || activeFrame.complete) {
        activeFrame.isExecutable = false;
      } else {
        activeFrame.isExecutable = true;
        activeFrame.complete = true;
      }
      continue;
    }

    if (commandName === 'endif' || commandName === 'fi') {
      if (executionState.flowStack.length > 0) {
        executionState.flowStack.pop();
      }
      continue;
    }

    if (!isCurrentlyExecutable) {
      continue;
    }

    const commandHandler = dependencies.slashCommandHandlers[commandName];
    if (commandHandler) {
      try {
        const result = await commandHandler(args, context, rawArgsText, executionState);
        if (result === false) {
          break;
        }
        if (result !== undefined && result !== true) {
          executionState.lastResult = String(result);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.log('error', `Error executing /${commandName}: ${errorMessage}`);
      }
    } else if (!commandName.startsWith('/')) {
      context.sendMessage(resolvedCommand, 'user');
    }
  }

  return executionState.lastResult;
}

export function useSlashCommands(
  dependencies,
  {
    card,
    persona,
    saveSession,
    sendMessage,
    addSystemMessage,
    logSystemMessage,
    updateVisualState,
    showToast,
    showPopup,
  },
) {
  const { setVariables, setQuickReplies, setIsInputLocked } = dependencies.sessionStore();

  const executeSlashCommands = dependencies.react.useCallback(async scriptInput => {
    if (!scriptInput.trim()) {
      return '';
    }

    const executionContext = {
      variables: dependencies.sessionStore.getState().variables,
      setVariables: nextVariables => {
        setVariables(nextVariables);
        saveSession({ variables: nextVariables });
      },
      sendMessage: (text, senderRole = 'user') => {
        if (senderRole === 'user') {
          sendMessage(text);
        } else {
          addSystemMessage(text);
        }
      },
      triggerSystemAction: (actionName, payload) => {
        logSystemMessage('interaction', 'system', `System Action: ${actionName}`, undefined, payload);
      },
      characterName: card?.name || 'Character',
      userPersonaName: persona?.name || 'User',
      log: (severity, message) => {
        let level = 'log';
        if (severity === 'error') {
          level = 'error';
        } else if (severity === 'warn') {
          level = 'warn';
        }
        logSystemMessage(level, 'script', message);
      },
      setVisualState: updateVisualState,
      showToast,
      showPopup,
      setQuickReplies,
      setIsInputLocked,
    };

    return runSlashScript(scriptInput, executionContext, dependencies);
  }, [
    card,
    persona,
    saveSession,
    sendMessage,
    addSystemMessage,
    logSystemMessage,
    updateVisualState,
    showToast,
    showPopup,
    setVariables,
    setQuickReplies,
    setIsInputLocked,
  ]);

  return { executeSlashCommands };
}
