// Recovered from the application host. One owner; dependency getters preserve late binding.

function resolveCharacterName(card) {
  return String(card.nickname || card.name || 'Character').trim() || 'Character';
}

function resolvePromptOverride(cardValue, presetValue) {
  const cardText = cardValue == null ? '' : String(cardValue);
  const presetText = presetValue == null ? '' : String(presetValue);
  return cardText.trim() ? cardText.replace(/{{original}}/gi, presetText) : presetText;
}

function replaceNamedMacro(templateText, macroName, replacementValue) {
  return templateText.replace(new RegExp(`{{\\s*${macroName}\\s*}}`, 'gi'), () => replacementValue);
}

function expandBasicMacros(templateText, context) {
  if (!templateText) {
    return '';
  }

  const card = context.card;
  const characterName = resolveCharacterName(card);
  const userName = context.userName || 'User';
  const userInput = context.userInput || '';
  const messages = context.messages || [];
  const lastMessage = messages.at(-1)?.content || '';
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content || '';
  const lastCharMessage = [...messages].reverse().find(message => message.role === 'model')?.content || '';
  const now = context.now || new Date();

  const macroValues = {
    char: characterName,
    character: characterName,
    user: userName,
    user_input: userInput,
    input: userInput,
    prompt: userInput,
    first_mes: card.first_mes || '',
    mes_example: card.mes_example || '',
    description: card.description || '',
    personality: card.personality || '',
    scenario: card.scenario || '',
    char_persona: card.personality || card.char_persona || '',
    persona: context.userPersonaDescription || '',
    persona_description: context.userPersonaDescription || '',
    system_prompt: context.systemPrompt ?? card.system_prompt ?? '',
    post_history_instructions: context.postHistoryInstructions ?? card.post_history_instructions ?? '',
    lastmessage: lastMessage,
    last_message: lastMessage,
    lastusermessage: lastUserMessage,
    last_user_message: lastUserMessage,
    lastcharmessage: lastCharMessage,
    last_char_message: lastCharMessage,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString(),
    weekday: now.toLocaleDateString(undefined, { weekday: 'long' }),
    isodate: now.toISOString().slice(0, 10),
    isotime: now.toISOString().slice(11, 19),
    newline: '\n',
    noop: '',
  };

  let expanded = templateText;
  for (const [macroName, macroValue] of Object.entries(macroValues)) {
    expanded = replaceNamedMacro(expanded, macroName, macroValue);
  }

  return expanded
    .replace(/<user>/gi, userName)
    .replace(/<(?:char|bot)>/gi, characterName);
}

function pickRandomOption(rawOptions, separatorPattern) {
  const candidates = rawOptions
    .split(separatorPattern)
    .map(item => item.trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    return '';
  }

  if (candidates.length === 2 && candidates.every(item => Number.isFinite(Number(item)))) {
    const minValue = Math.ceil(Math.min(Number(candidates[0]), Number(candidates[1])));
    const maxValue = Math.floor(Math.max(Number(candidates[0]), Number(candidates[1])));
    if (maxValue >= minValue) {
      return String(Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function expandRandomMacros(templateText) {
  if (!templateText) {
    return '';
  }

  return templateText
    .replace(
      /{{\s*(?:dice|roll)\s*(?:::?|\s+)\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi,
      (_match, rawCount, rawSides, rawModifier) => {
        const diceCount = Math.max(1, Math.min(100, Number.parseInt(rawCount || '1', 10) || 1));
        const diceSides = Math.max(1, Math.min(1000000, Number.parseInt(rawSides, 10) || 1));
        let total = 0;
        for (let rollIndex = 0; rollIndex < diceCount; rollIndex += 1) {
          total += Math.floor(Math.random() * diceSides) + 1;
        }
        if (rawModifier) {
          total += Number.parseInt(rawModifier.replace(/\s/g, ''), 10) || 0;
        }
        return String(total);
      },
    )
    .replace(/{{\s*(?:random|pick)::([\s\S]*?)}}/gi, (_match, rawOptions) => pickRandomOption(rawOptions, /::/))
    .replace(
      /{{\s*(?:random|pick)(?::|\s+)([\s\S]*?)}}/gi,
      (_match, rawOptions) => pickRandomOption(rawOptions, rawOptions.includes('::') ? /::/ : /,/),
    );
}

function firstArrayOrEmpty(...candidates) {
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? found : [];
}

function extractRegexScripts(extensionSettings, preset) {
  return {
    globalScripts: firstArrayOrEmpty(
      extensionSettings?.regex,
      extensionSettings?.regex_scripts,
      extensionSettings?.regex?.scripts,
    ),
    presetScripts: firstArrayOrEmpty(
      preset?.extensions?.regex_scripts,
      preset?.regex_scripts,
      preset?.extensions?.regex?.scripts,
    ),
  };
}

export function createMacroProcessing(dependencies = {}) {
  return {
    resolveCharacterName,
    resolvePromptOverride,
    expandBasicMacros,
    expandRandomMacros,
    extractRegexScripts,
  };
}
