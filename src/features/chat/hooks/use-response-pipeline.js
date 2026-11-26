// Extracted custom hook. Its caller preserves the original unconditional hook order.

const CHOICE_TAG_RE = /\[CHOICE:\s*(?:["'“「])(.*?)(?:["'”」])\s*\]/gi;

function extractQuickReplyChoices(rawResponseText) {
  const choices = [];
  const matcher = new RegExp(CHOICE_TAG_RE.source, CHOICE_TAG_RE.flags);
  let match;

  while ((match = matcher.exec(rawResponseText)) !== null) {
    if (match[1]) {
      const label = match[1].trim();
      if (label) {
        choices.push({ label, message: label });
      }
    }
  }
  return choices;
}

export function useResponsePipeline(dependencies) {
  const {
    setVariables,
    updateMessage,
    card,
    setQuickReplies,
    visualState,
  } = dependencies.ol();

  const processAIResponse = dependencies.b.useCallback(async (rawContent, messageId) => {
    const initialState = dependencies.ol.getState();
    const initialRevision = dependencies.__stsRuntimeState.getSessionRevision();

    const ownsCurrentMessage = () => {
      const currentState = dependencies.ol.getState();
      return (
        currentState.sessionId === initialState.sessionId
        && dependencies.__stsRuntimeState.getSessionRevision() === initialRevision
        && currentState.variables === initialState.variables
        && currentState.messages.find(message => message.id === messageId)
          === initialState.messages.find(message => message.id === messageId)
        && initialState.messages.some(message => message.id === messageId)
      );
    };

    if (!ownsCurrentMessage()) {
      return false;
    }

    const extractedChoices = extractQuickReplyChoices(rawContent);
    let displayContent = rawContent;
    let interactiveHtml = null;
    let interactiveHtmlBlocks = [];
    const currentVariables = dependencies.ol.getState().variables;
    let updatedVariables = currentVariables;

    if (!initialState.visualState.disableInteractiveMode) {
      const scriptResult = await dependencies.$u(rawContent, currentVariables);
      if (!ownsCurrentMessage()) {
        return false;
      }

      updatedVariables = scriptResult.updatedVariables;
      displayContent = scriptResult.cleanedText;

      const cardRegexScripts = initialState.card?.extensions?.regex_scripts || [];
      const latestState = dependencies.ol.getState();
      const regexResult = dependencies.gd(displayContent, cardRegexScripts, [2], {
        isMarkdown: true,
        isPrompt: false,
        depth: 0,
        ...dependencies.Zu(latestState.extensionSettings, latestState.preset),
        macros: {
          char: latestState.card?.name || 'Character',
          bot: latestState.card?.name || 'Character',
          user: latestState.persona?.name || 'User',
        },
      });

      displayContent = regexResult.displayContent;
      interactiveHtml = regexResult.interactiveHtml;
      interactiveHtmlBlocks = regexResult.interactiveHtmlBlocks || [];
    }

    if (!ownsCurrentMessage()) {
      return false;
    }

    if (updatedVariables !== currentVariables) {
      setVariables(updatedVariables);
    }
    if (extractedChoices.length > 0) {
      setQuickReplies(extractedChoices);
    }

    updateMessage(messageId, {
      content: displayContent,
      interactiveHtml: interactiveHtml || undefined,
      interactiveHtmlBlocks: interactiveHtmlBlocks.length > 0 ? interactiveHtmlBlocks : undefined,
      originalRawContent: rawContent,
      contextState: updatedVariables,
    });

    return {
      updatedVariables,
      displayContent,
      interactiveHtml,
      interactiveHtmlBlocks,
    };
  }, [card, setVariables, updateMessage, setQuickReplies, visualState.disableInteractiveMode]);

  const createPlaceholderMessage = dependencies.b.useCallback(role => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    role,
    content: '...',
    timestamp: Date.now(),
  }), []);

  return {
    processAIResponse,
    createPlaceholderMessage,
  };
}
