/**
 * Base prompt section construction and per-section placeholder, variable macro,
 * and EJS template rendering.
 */

import { renderEjsTemplate } from './ejs-template-renderer.js';
import { applyPromptVariableMacros } from './prompt-variable-operations.js';

const VALID_DEPTH_PROMPT_ROLES = ['system', 'user', 'assistant'];

/**
 * Builds the ordered list of base prompt sections from a character card and
 * preset configuration using already-resolved assembler dependencies.
 *
 * @param {Record<string, any>} card
 * @param {Record<string, any>} preset
 * @param {Record<string, any>} resolvedDeps
 * @returns {{ baseSections: Array<{ id: string, name: string, content: string, role: string }> }}
 */
export function buildBasePromptSections(card, preset, resolvedDeps) {
  let baseSections = (preset.prompts || [])
    .filter(promptItem => promptItem.enabled === true && promptItem.content)
    .map((promptItem, index) => ({
      id: promptItem.identifier || `prompt_${index}`,
      name: promptItem.name || 'Untitled Prompt',
      content: promptItem.content,
      role: promptItem.role || 'system',
    }));

  const resolvedSystemPrompt = resolvedDeps.resolvePromptOverride(
    card.system_prompt,
    preset.system_prompt,
  );
  const resolvedPostHistoryInstructions = resolvedDeps.resolvePromptOverride(
    card.post_history_instructions,
    preset.post_history_instructions,
  );

  const hasSystemPromptPlaceholder = baseSections.some(
    section => /{{\s*system_prompt\s*}}/i.test(section.content),
  );
  const hasPostHistoryPlaceholder = baseSections.some(
    section => /{{\s*post_history_instructions\s*}}/i.test(section.content),
  );

  baseSections = baseSections.map(section => ({
    ...section,
    content: section.content
      .replace(/{{\s*system_prompt\s*}}/gi, resolvedSystemPrompt)
      .replace(/{{\s*post_history_instructions\s*}}/gi, resolvedPostHistoryInstructions),
  }));

  if (resolvedSystemPrompt.trim() && !hasSystemPromptPlaceholder) {
    baseSections.unshift({
      id: 'character_system_prompt',
      name: 'Character System Prompt',
      content: resolvedSystemPrompt,
      role: 'system',
    });
  }

  const depthPrompt = card.extensions?.depth_prompt;
  if (depthPrompt && typeof depthPrompt.prompt === 'string' && depthPrompt.prompt.trim()) {
    const depthSuffix = Number.isFinite(Number(depthPrompt.depth))
      ? ` (depth ${depthPrompt.depth})`
      : '';
    baseSections.push({
      id: 'character_depth_prompt',
      name: `Character Depth Prompt${depthSuffix}`,
      content: depthPrompt.prompt,
      role: VALID_DEPTH_PROMPT_ROLES.includes(depthPrompt.role) ? depthPrompt.role : 'system',
    });
  }

  if (resolvedPostHistoryInstructions.trim() && !hasPostHistoryPlaceholder) {
    baseSections.push({
      id: 'character_post_history_instructions',
      name: 'Character Post-History Instructions',
      content: resolvedPostHistoryInstructions,
      role: 'system',
    });
  }

  return { baseSections };
}

/**
 * Evaluates each base section in order: collects sub-sections, expands macros
 * and variable mutations, substitutes context placeholders, and renders EJS.
 *
 * @param {Record<string, any>} params
 * @returns {Promise<{
 *   structuredPrompt: Array<Record<string, any>>,
 *   chatVariables: Record<string, any>,
 *   globalVariables: Record<string, any>,
 * }>}
 */
export async function renderStructuredPromptSections({
  baseSections,
  card,
  userName,
  authorNote,
  currentUserInput,
  allDefinitions,
  externalLorebooks,
  disableInteractiveMode,
  longTermSummaries,
  worldInfoBeforeItems,
  worldInfoAfterItems,
  allWorldInfoItems,
  worldInfoBeforeText,
  worldInfoAfterText,
  allWorldInfoText,
  smartStateBlock,
  logicStore,
  mythicDatabase,
  rpgHybridTable,
  mythicInstructionBlock,
  visualState,
  longTermSummaryText,
  currentPageLines,
  currentPageHistoryText,
  lastTurnLines,
  lastTurnText,
  initialChatVariables,
  initialGlobalVariables,
  expandMacros,
  deps,
}) {
  let chatVariables = initialChatVariables;
  let globalVariables = initialGlobalVariables;
  const structuredPrompt = [];

  for (const section of baseSections) {
    let subSections;
    let sectionContent = section.content;
    const appendSubSections = items => {
      if (!subSections) {
        subSections = [];
      }
      subSections.push(...items);
    };

    if (sectionContent.includes('{{worldInfo_before}}')) {
      appendSubSections(worldInfoBeforeItems);
    }
    if (sectionContent.includes('{{worldInfo_after}}')) {
      appendSubSections(worldInfoAfterItems);
    }
    if (sectionContent.includes('{{worldInfo}}')) {
      appendSubSections(allWorldInfoItems);
    }
    if (sectionContent.includes('{{long_term_summary}}')) {
      appendSubSections(longTermSummaries.length > 0 ? longTermSummaries : ['Chưa có tóm tắt dài hạn.']);
    }
    if (sectionContent.includes('{{current_page_history}}')) {
      appendSubSections(currentPageLines);
    }
    if (sectionContent.includes('{{last_turn}}')) {
      appendSubSections(lastTurnLines);
    }

    sectionContent = expandMacros(sectionContent);
    sectionContent = sectionContent.replace(/{{(\/\/|#).*?}}/gi, '');
    sectionContent = sectionContent.replace(/\s*{{trim}}\s*/gi, '');
    sectionContent = deps.expandRandomMacros(sectionContent);

    const variableMacroResult = applyPromptVariableMacros(
      sectionContent,
      chatVariables,
      globalVariables,
      deps,
    );
    sectionContent = variableMacroResult.content;
    chatVariables = variableMacroResult.chatVariables;
    globalVariables = variableMacroResult.globalVariables;

    sectionContent = sectionContent
      .replace(/{{worldInfo_before}}/g, worldInfoBeforeText)
      .replace(/{{worldInfo_after}}/g, worldInfoAfterText)
      .replace(/{{worldInfo}}/g, allWorldInfoText)
      .replace(/{{char}}/g, card.name || '')
      .replace(/{{user}}/g, userName)
      .replace(/<user>/g, userName)
      .replace(/{{smart_state_block}}/g, smartStateBlock)
      .replace(/{{current_variables_state}}/g, logicStore)
      .replace(/{{mythic_database}}/g, mythicDatabase)
      .replace(/{{rpg_hybrid_table}}/g, rpgHybridTable)
      .replace(/{{mythic_instruction_block}}/g, mythicInstructionBlock)
      .replace(/{{last_state}}/g, visualState)
      .replace(/{{author_note}}/g, authorNote || '')
      .replace(/{{long_term_summary}}/g, longTermSummaryText)
      .replace(/{{current_page_history}}/g, currentPageHistoryText)
      .replace(/{{last_turn}}/g, lastTurnText)
      .replace(/{{user_input}}/g, currentUserInput)
      .replace(/{{prompt}}/g, currentUserInput)
      .replace(/{{get_message_variable::([^}]+)}}/gi, (_match, rawKey) => {
        const variableKey = rawKey.trim();
        const value = deps.getVariable(chatVariables, variableKey);
        if (value === undefined) {
          return '';
        }
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      })
      .replace(/{{all_definitions}}/g, allDefinitions)
      .replace(/{{description}}/g, card.description || '')
      .replace(/{{personality}}/g, card.personality || '')
      .replace(/{{scenario}}/g, card.scenario || '')
      .replace(/{{mes_example}}/g, card.mes_example || '');

    if (!disableInteractiveMode) {
      const templateVariables = { ...chatVariables, user: userName };
      sectionContent = await renderEjsTemplate(
        sectionContent,
        templateVariables,
        card,
        externalLorebooks,
        0,
        deps,
      );
      sectionContent = expandMacros(sectionContent);
    }

    sectionContent = sectionContent.trim();
    if (sectionContent) {
      structuredPrompt.push({
        ...section,
        content: sectionContent,
        subSections,
      });
    }
  }

  return {
    structuredPrompt,
    chatVariables,
    globalVariables,
  };
}
