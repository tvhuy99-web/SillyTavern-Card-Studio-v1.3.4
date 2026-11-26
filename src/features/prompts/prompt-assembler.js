/**
 * Canonical prompt assembly engine for SillyTavern Card Studio.
 *
 * Thin orchestrator delegating base section building, World Info placement,
 * history context formatting, prompt variable operations, and isolated EJS
 * worker rendering to dedicated submodules under `./assembler/`.
 */

import { extractStoryContent } from './story-content.js';
import { createMacroProcessing } from './macro-processing.js';
import { createRegexProcessing } from '../chat/regex-processing.js';
import { createTableProcessing } from '../rpg/table-processing.js';
import { buildSmartStateBlock } from '../state/smart-state-service.js';
import {
  normalizePromptVariableScopes,
  readGlobalVariables,
} from '../state/variable-scope-service.js';
import {
  buildBasePromptSections,
  renderStructuredPromptSections,
} from './assembler/base-section-builder.js';
import { buildHistoryContext } from './assembler/history-context-builder.js';
import {
  defaultGetVariable,
  defaultMutateVariable,
} from './assembler/prompt-variable-operations.js';
import { buildWorldInfoSections } from './assembler/world-info-placement.js';

const defaultMacroHelpers = createMacroProcessing({});
const defaultTableHelpers = createTableProcessing({
  HarmCategory: {},
  HarmBlockThreshold: {},
  parseRelaxedJson: text => JSON.parse(text),
});

/**
 * Resolves semantic or legacy dependency bindings into a single normalized table.
 *
 * @param {Record<string, any>} [rawDependencies={}]
 * @returns {Record<string, any>}
 */
function resolveAssemblerDependencies(rawDependencies = {}) {
  const deps = rawDependencies && typeof rawDependencies === 'object' ? rawDependencies : {};

  const getRegexEngineMode = deps.getRegexEngineMode
    || (() => 'official-local');

  const defaultRegexProcessor = createRegexProcessing({
    get readCardRuntimeEngineMode() {
      return getRegexEngineMode;
    },
  });

  return {
    getRegexEngineMode,
    processRegex: deps.processRegex || defaultRegexProcessor.processRegex,
    extractRegexScripts: deps.extractRegexScripts || defaultMacroHelpers.extractRegexScripts,
    resolveCharacterName: deps.resolveCharacterName || defaultMacroHelpers.resolveCharacterName,
    resolvePromptOverride: deps.resolvePromptOverride || defaultMacroHelpers.resolvePromptOverride,
    expandBasicMacros: deps.expandBasicMacros || defaultMacroHelpers.expandBasicMacros,
    expandRandomMacros: deps.expandRandomMacros || defaultMacroHelpers.expandRandomMacros,
    getVariable: deps.getVariable || defaultGetVariable,
    mutateVariable: deps.mutateVariable || defaultMutateVariable,
    filterRpgDatabaseByActiveEntries: deps.filterRpgDatabaseByActiveEntries || defaultTableHelpers.filterRpgDatabaseByActiveEntries,
    formatRpgHybridTable: deps.formatRpgHybridTable || defaultTableHelpers.formatRpgHybridTable,
    createRpgRowSnapshot: deps.createRpgRowSnapshot || defaultTableHelpers.createRpgRowSnapshot,
    buildMythicPrompt: deps.buildMythicPrompt || defaultTableHelpers.buildMythicPrompt,
    defaultMythicSystemPrompt: deps.defaultMythicSystemPrompt ?? defaultTableHelpers.defaultMythicSystemPrompt,
    normalizePromptVariableScopes: deps.normalizePromptVariableScopes
      || deps.__stsNormalizePromptVariableScopes
      || normalizePromptVariableScopes,
    readGlobalVariables: deps.readGlobalVariables
      || deps.__stsReadGlobalVariables
      || readGlobalVariables,
    buildSmartStateBlock: deps.buildSmartStateBlock
      || deps.__stsBuildSmartStateBlock
      || buildSmartStateBlock,
    loadOptionalModule: deps.loadOptionalModule || (async loader => loader()),
    runIsolatedScript: deps.runIsolatedScript
      || (() => Promise.reject(new Error('Isolated card scripts require a browser environment.'))),
    logSystemMessage: deps.logSystemMessage || (() => {}),
  };
}

/**
 * Builds the ordered list of base prompt sections from a character card and
 * preset configuration.
 *
 * @param {Record<string, any>} card
 * @param {Record<string, any>} preset
 * @param {Record<string, any>} [dependencies]
 * @returns {{ baseSections: Array<{ id: string, name: string, content: string, role: string }> }}
 */
export function buildBaseSections(card, preset, dependencies) {
  const resolvedDeps = dependencies && typeof dependencies === 'object'
    && ('resolvePromptOverride' in dependencies || 'Ku' in dependencies)
    ? resolveAssemblerDependencies(dependencies)
    : resolveAssemblerDependencies();

  return buildBasePromptSections(card, preset, resolvedDeps);
}

/**
 * Assembles the final prompt text, structured sections, RPG snapshot, and
 * updated chat/global variable scopes.
 */
export async function assemblePrompt(
  baseSections,
  messages,
  authorNote,
  card,
  longTermSummaries,
  summaryChunkSize,
  variables,
  legacyVisualState,
  externalLorebooks = [],
  contextMode = 'standard',
  userName = 'User',
  worldInfoState,
  activeEntries,
  worldInfoPlacement,
  preset,
  disableInteractiveMode,
  userPersonaDescription = '',
  dependencies,
) {
  const deps = resolveAssemblerDependencies(dependencies);

  if (messages.length === 0) {
    throw new Error('Không thể tạo phản hồi cho một lịch sử trống.');
  }

  deps.logSystemMessage(
    'log',
    'system',
    `[PROMPT-DEBUG] Start constructing prompt. Variable count: ${Object.keys(variables).length}`,
  );

  const historyMessages = messages.slice(0, -1);
  const currentUserInput = messages[messages.length - 1].content;
  const characterName = deps.resolveCharacterName(card);
  const resolvedSystemPrompt = deps.resolvePromptOverride(card.system_prompt, preset?.system_prompt);
  const resolvedPostHistoryInstructions = deps.resolvePromptOverride(
    card.post_history_instructions,
    preset?.post_history_instructions,
  );
  const allDefinitions = [
    card.description,
    card.personality,
    card.scenario,
    card.mes_example,
  ].filter(Boolean).join('\n\n');

  const expandMacros = text => deps.expandBasicMacros(text, {
    card,
    userName,
    userPersonaDescription,
    userInput: currentUserInput,
    messages,
    systemPrompt: resolvedSystemPrompt,
    postHistoryInstructions: resolvedPostHistoryInstructions,
  });

  const worldInfo = await buildWorldInfoSections({
    card,
    worldInfoState,
    activeEntries,
    worldInfoPlacement,
    preset,
    variables,
    userName,
    externalLorebooks,
    expandMacros,
    deps,
  });

  const normalizedScopes = deps.normalizePromptVariableScopes(
    variables,
    deps.readGlobalVariables(),
  );

  const smartStatePayload = deps.buildSmartStateBlock({
    variables: normalizedScopes.chat,
    messages,
    card,
    legacyVisualState,
  });

  let mythicInstructionBlock = '';
  if (card.rpg_data?.settings?.executionMode === 'integrated' && card.rpg_data) {
    const filteredRpgData = deps.filterRpgDatabaseByActiveEntries(card.rpg_data, activeEntries || []);
    const combinedLorebookText = [...worldInfo.allWorldInfoItems].join('\n');
    mythicInstructionBlock = deps.buildMythicPrompt(
      card.rpg_data.settings.customSystemPrompt || deps.defaultMythicSystemPrompt,
      filteredRpgData,
      '',
      combinedLorebookText,
    );
  }

  const historyContext = await buildHistoryContext({
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
  });

  const {
    structuredPrompt,
    chatVariables,
    globalVariables,
  } = await renderStructuredPromptSections({
    baseSections,
    card,
    userName,
    authorNote,
    currentUserInput,
    allDefinitions,
    externalLorebooks,
    disableInteractiveMode,
    longTermSummaries,
    worldInfoBeforeItems: worldInfo.worldInfoBeforeItems,
    worldInfoAfterItems: worldInfo.worldInfoAfterItems,
    allWorldInfoItems: worldInfo.allWorldInfoItems,
    worldInfoBeforeText: worldInfo.worldInfoBeforeText,
    worldInfoAfterText: worldInfo.worldInfoAfterText,
    allWorldInfoText: worldInfo.allWorldInfoText,
    smartStateBlock: smartStatePayload.smartStateBlock,
    logicStore: smartStatePayload.logicStore,
    mythicDatabase: smartStatePayload.mythicDatabase,
    rpgHybridTable: worldInfo.rpgHybridTable,
    mythicInstructionBlock,
    visualState: smartStatePayload.visualState,
    longTermSummaryText: historyContext.longTermSummaryText,
    currentPageLines: historyContext.currentPageLines,
    currentPageHistoryText: historyContext.currentPageHistoryText,
    lastTurnLines: historyContext.lastTurnLines,
    lastTurnText: historyContext.lastTurnText,
    initialChatVariables: normalizedScopes.chat,
    initialGlobalVariables: normalizedScopes.global,
    expandMacros,
    deps,
  });

  return {
    fullPrompt: structuredPrompt
      .map(section => section.content)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    structuredPrompt,
    rpgSnapshot: worldInfo.rpgSnapshot,
    updatedVariables: chatVariables,
    updatedGlobalVariables: globalVariables,
  };
}

/**
 * Creates a prompt assembler bound to a shared dependency container.
 */
export function createPromptAssembler(dependencies = {}) {
  const boundDeps = resolveAssemblerDependencies(dependencies);

  return {
    extractStoryContent,
    buildBaseSections(card, preset) {
      return buildBaseSections(card, preset, boundDeps);
    },
    assemblePrompt(
      baseSections,
      messages,
      authorNote,
      card,
      longTermSummaries,
      summaryChunkSize,
      variables,
      legacyVisualState,
      externalLorebooks = [],
      contextMode = 'standard',
      userName = 'User',
      worldInfoState,
      activeEntries,
      worldInfoPlacement,
      preset,
      disableInteractiveMode,
      userPersonaDescription = '',
    ) {
      return assemblePrompt(
        baseSections,
        messages,
        authorNote,
        card,
        longTermSummaries,
        summaryChunkSize,
        variables,
        legacyVisualState,
        externalLorebooks,
        contextMode,
        userName,
        worldInfoState,
        activeEntries,
        worldInfoPlacement,
        preset,
        disableInteractiveMode,
        userPersonaDescription,
        boundDeps,
      );
    },
  };
}
