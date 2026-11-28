import { selectTurnMemoryHistory } from '../../chat/history-policy.js';
import { extractStoryContent } from '../story-content.js';

function yieldMacrotask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function findCurrentPageStartIndex(historyMessages, summarizedModelTurns) {
  if (summarizedModelTurns <= 0) {
    return 0;
  }
  let countedTurns = 0;
  for (let index = 0; index < historyMessages.length; index += 1) {
    if (index === 0 || historyMessages[index].role === 'model') {
      countedTurns += 1;
      if (countedTurns === summarizedModelTurns) {
        return index + 1;
      }
    }
  }
  return historyMessages.length;
}

function selectMessageSourceContent(message, preferOriginalRaw = false) {
  if (preferOriginalRaw && message.originalRawContent) {
    return message.originalRawContent;
  }
  if (message.content && message.content.trim()) {
    return message.content;
  }
  return message.originalRawContent || '';
}

export async function buildHistoryContext({
  historyMessages,
  longTermSummaries,
  summaryChunkSize,
  contextMode,
  userName,
  characterName,
  userPersonaDescription,
  card,
  preset,
  disableInteractiveMode,
  expandMacros,
  deps,
}) {
  const longTermSummaryText = longTermSummaries.length > 0
    ? `${longTermSummaries.join('\n\n---\n\n')}`
    : 'Đây là khởi đầu của cuộc trò chuyện.';

  const pageStartIndex = findCurrentPageStartIndex(
    historyMessages,
    longTermSummaries.length * summaryChunkSize,
  );
  let currentPageMessages = summaryChunkSize === 0
    ? selectTurnMemoryHistory(historyMessages, longTermSummaries)
    : historyMessages.slice(pageStartIndex);
  if (contextMode === 'ai_only') {
    currentPageMessages = currentPageMessages.filter(
      message => message.role === 'model' || message.role === 'system',
    );
  }

  const useOfficialPromptRegex = deps.getRegexEngineMode() === 'official-local' && !disableInteractiveMode;
  const regexMacros = {
    user: userName,
    char: characterName,
    bot: characterName,
    first_mes: card.first_mes || '',
    persona: userPersonaDescription,
    persona_description: userPersonaDescription,
  };
  const promptRegexCache = new WeakMap();

  const applyPromptRegex = (message, sourceText) => {
    if (!useOfficialPromptRegex) {
      return sourceText;
    }
    const messageIndex = historyMessages.indexOf(message);
    const depth = messageIndex >= 0
      ? Math.max(0, historyMessages.length - 1 - messageIndex)
      : undefined;
    const cachedResult = promptRegexCache.get(message);
    if (cachedResult && cachedResult.source === sourceText && cachedResult.depth === depth) {
      return cachedResult.value;
    }
    const placement = message.role === 'user' ? [1] : [2];
    const processed = deps.processRegex(
      sourceText,
      card.extensions?.regex_scripts || [],
      placement,
      {
        engineMode: 'official-local',
        isMarkdown: false,
        isPrompt: true,
        depth,
        ...deps.extractRegexScripts(undefined, preset),
        macros: regexMacros,
      },
    ).displayContent;
    promptRegexCache.set(message, { source: sourceText, depth, value: processed });
    return processed;
  };

  const currentPageLines = [];
  for (let messageIndex = 0; messageIndex < currentPageMessages.length; messageIndex += 1) {
    const message = currentPageMessages[messageIndex];
    const rawContent = selectMessageSourceContent(
      message,
      useOfficialPromptRegex || Boolean(disableInteractiveMode),
    );
    const regexProcessedContent = applyPromptRegex(message, rawContent);
    const storyContent = extractStoryContent(regexProcessedContent);
    const expandedContent = expandMacros(storyContent);

    let formattedLine = null;
    if (expandedContent.trim()) {
      if (message.role === 'user') {
        formattedLine = `${userName}: ${expandedContent}`;
      } else if (message.role === 'system') {
        formattedLine = `System: ${expandedContent}`;
      } else {
        formattedLine = `${characterName}: ${expandedContent}`;
      }
    }

    if (formattedLine) {
      currentPageLines.push(formattedLine);
    }
    if (messageIndex > 0 && messageIndex % 4 === 0) {
      await yieldMacrotask();
    }
  }

  if (currentPageLines.length === 0) {
    currentPageLines.push(
      contextMode === 'ai_only'
        ? 'Bắt đầu phần tự thuật mới.'
        : 'Bắt đầu trang hội thoại mới.',
    );
  }
  const currentPageHistoryText = currentPageLines.join('\n');

  const lastTurnLines = [];
  let lastModelIndex = -1;
  for (let index = historyMessages.length - 1; index >= 0; index -= 1) {
    if (historyMessages[index].role === 'model') {
      lastModelIndex = index;
      break;
    }
  }

  if (lastModelIndex !== -1) {
    let turnStartIndex = lastModelIndex;
    for (let index = lastModelIndex - 1; index >= 0; index -= 1) {
      const role = historyMessages[index].role;
      if (role === 'user') {
        turnStartIndex = index;
        if (index > 0 && historyMessages[index - 1].role === 'model') {
          break;
        }
      } else if (role === 'model') {
        break;
      }
    }

    historyMessages.slice(turnStartIndex, lastModelIndex + 1).forEach(message => {
      const rawContent = selectMessageSourceContent(message, true);
      const expandedContent = expandMacros(applyPromptRegex(message, rawContent));
      if (expandedContent.trim()) {
        const speakerName = message.role === 'user' ? userName : characterName;
        lastTurnLines.push(`${speakerName}: ${expandedContent}`);
      }
    });
  } else {
    lastTurnLines.push('Chưa có lượt nào gần đây.');
  }
  const lastTurnText = lastTurnLines.join('\n');

  return {
    longTermSummaryText,
    currentPageLines,
    currentPageHistoryText,
    lastTurnLines,
    lastTurnText,
  };
}
