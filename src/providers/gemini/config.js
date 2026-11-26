import { clampNumber, optionalPositiveInt } from '../common/generation-utils.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-pro-preview';
const GEMINI_THINKING_LEVEL_HIGH = 'HIGH';

export const DEFAULT_GEMINI_SAFETY_SETTINGS = Object.freeze([
  Object.freeze({ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }),
  Object.freeze({ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }),
  Object.freeze({ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }),
  Object.freeze({ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }),
]);

export function createGeminiClient(apiKeyOrOptions, options = {}) {
  const isOptionsObject = apiKeyOrOptions !== null
    && typeof apiKeyOrOptions === 'object'
    && !Array.isArray(apiKeyOrOptions);

  const resolvedOptions = isOptionsObject ? apiKeyOrOptions : options;
  const explicitKey = isOptionsObject ? apiKeyOrOptions.apiKey : apiKeyOrOptions;
  const resolvedKey = String(explicitKey ?? resolvedOptions.getApiKey?.() ?? '').trim();

  if (!resolvedKey) {
    throw new Error('API Key không được định cấu hình. Vui lòng đặt nó trong Cài đặt API.');
  }

  const ClientCtor = resolvedOptions.ClientCtor || resolvedOptions.GoogleGenAI;
  if (typeof ClientCtor !== 'function') {
    throw new TypeError('Gemini SDK client constructor (ClientCtor) is required.');
  }

  return new ClientCtor({ apiKey: resolvedKey });
}

export function buildGeminiRequest(
  prompt,
  preset = {},
  safetySettings = DEFAULT_GEMINI_SAFETY_SETTINGS,
  options = {},
) {
  const safePreset = preset || {};
  const topK = optionalPositiveInt(safePreset.top_k);
  const thinkingBudget = Number(safePreset.thinking_budget);
  const hasThinkingBudget = Boolean(
    safePreset.thinking_budget && Number.isFinite(thinkingBudget) && thinkingBudget > 0,
  );

  const config = {
    safetySettings,
    temperature: clampNumber(safePreset.temp, 1, { min: 0, max: 2 }),
    topP: clampNumber(safePreset.top_p, 0.95, { min: 0, max: 1 }),
    maxOutputTokens: Math.trunc(clampNumber(safePreset.max_tokens, 4096, { min: 1 })),
    stopSequences: safePreset.stopping_strings,
    thinkingConfig: hasThinkingBudget
      ? { thinkingLevel: options.thinkingLevelHigh ?? GEMINI_THINKING_LEVEL_HIGH }
      : undefined,
  };

  if (topK !== undefined) {
    config.topK = topK;
  }

  return {
    model: safePreset.model || DEFAULT_GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config,
  };
}
