/**
 * World Info entry partitioning, before/after formatting, and RPG hybrid table
 * snapshot assembly.
 */

import {
  expandReferencedLorebookLines,
  renderEjsTemplate,
} from './ejs-template-renderer.js';

/**
 * Yields briefly to the event loop to keep long prompt builds responsive.
 *
 * @returns {Promise<void>}
 */
function yieldMacrotask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Partitions active World Info entries into `before` and `after` groups sorted
 * by `insertion_order`.
 *
 * @param {Record<string, any>} card
 * @param {Record<string, boolean> | undefined} worldInfoState
 * @param {Array<Record<string, any>> | undefined} activeEntries
 * @param {Record<string, string> | undefined} worldInfoPlacement
 * @returns {{ before: Array<Record<string, any>>, after: Array<Record<string, any>> }}
 */
function partitionWorldInfoEntries(card, worldInfoState, activeEntries, worldInfoPlacement) {
  const entries = activeEntries
    ? [...activeEntries]
    : [...(card.char_book?.entries || [])].filter(entry => {
        if (!entry.content || !entry.content.trim() || !entry.uid) {
          return false;
        }
        const defaultEnabled = entry.enabled !== false;
        return worldInfoState ? (worldInfoState[entry.uid] ?? defaultEnabled) : defaultEnabled;
      });

  entries.sort((left, right) => (left.insertion_order || 0) - (right.insertion_order || 0));

  const before = [];
  const after = [];
  entries.forEach(entry => {
    const placementOverride = entry.uid && worldInfoPlacement ? worldInfoPlacement[entry.uid] : undefined;
    if (placementOverride === 'before') {
      before.push(entry);
    } else if (placementOverride === 'after') {
      after.push(entry);
    } else if ((entry.position || '').toLowerCase().includes('after')) {
      after.push(entry);
    } else {
      before.push(entry);
    }
  });

  return { before, after };
}

/**
 * Formats before/after World Info blocks and builds the RPG hybrid table and
 * row snapshot when RPG data is attached to the card.
 *
 * @param {{
 *   card: Record<string, any>,
 *   worldInfoState?: Record<string, boolean>,
 *   activeEntries?: Array<Record<string, any>>,
 *   worldInfoPlacement?: Record<string, string>,
 *   preset?: Record<string, any>,
 *   variables: Record<string, any>,
 *   userName: string,
 *   externalLorebooks: Array<Record<string, any>>,
 *   expandMacros: (text: string) => string,
 *   deps: Record<string, any>,
 * }} params
 * @returns {Promise<{
 *   worldInfoBeforeItems: string[],
 *   worldInfoAfterItems: string[],
 *   allWorldInfoItems: string[],
 *   worldInfoBeforeText: string,
 *   worldInfoAfterText: string,
 *   allWorldInfoText: string,
 *   rpgHybridTable: string,
 *   rpgSnapshot: any,
 * }>}
 */
export async function buildWorldInfoSections({
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
}) {
  let rpgSnapshot;
  const { before: beforeEntries, after: afterEntries } = partitionWorldInfoEntries(
    card,
    worldInfoState,
    activeEntries,
    worldInfoPlacement,
  );

  const worldInfoFormat = preset?.wi_format || '[{{keys}}: {{content}}]';
  let rpgHybridTable = '';
  if (card.rpg_data) {
    const combinedEntries = [...beforeEntries, ...afterEntries];
    const filteredRpgData = deps.filterRpgDatabaseByActiveEntries(card.rpg_data, combinedEntries);
    rpgHybridTable = deps.formatRpgHybridTable(filteredRpgData);
    rpgSnapshot = deps.createRpgRowSnapshot(filteredRpgData);
  }

  const nonMythicBeforeEntries = beforeEntries.filter(
    entry => !String(entry.uid || '').startsWith('mythic_'),
  );
  const nonMythicAfterEntries = afterEntries.filter(
    entry => !String(entry.uid || '').startsWith('mythic_'),
  );

  const formatWorldInfoEntries = async entries => {
    const formattedEntries = [];
    let processedCount = 0;
    for (const entry of entries) {
      const templateVariables = { ...variables, user: userName };
      let renderedContent = await renderEjsTemplate(
        entry.content,
        templateVariables,
        card,
        externalLorebooks,
        0,
        deps,
      );
      renderedContent = await expandReferencedLorebookLines(
        renderedContent,
        variables,
        card,
        externalLorebooks,
        deps,
      );

      if (renderedContent && !renderedContent.trim() && !renderedContent.includes('[SYSTEM ERROR')) {
        processedCount += 1;
        if (processedCount % 4 === 0) await yieldMacrotask();
        continue;
      }
      if (!renderedContent) {
        processedCount += 1;
        if (processedCount % 4 === 0) await yieldMacrotask();
        continue;
      }

      renderedContent = expandMacros(renderedContent);
      const formattedEntry = worldInfoFormat
        .replace(/{{keys}}/g, (entry.keys || []).join(', '))
        .replace(/{{content}}/g, renderedContent.trim());
      formattedEntries.push(formattedEntry);

      processedCount += 1;
      if (processedCount % 4 === 0) await yieldMacrotask();
    }
    return formattedEntries;
  };

  const worldInfoBeforeItems = await formatWorldInfoEntries(nonMythicBeforeEntries);
  const worldInfoAfterItems = await formatWorldInfoEntries(nonMythicAfterEntries);
  const allWorldInfoItems = [...worldInfoBeforeItems, ...worldInfoAfterItems];

  return {
    worldInfoBeforeItems,
    worldInfoAfterItems,
    allWorldInfoItems,
    worldInfoBeforeText: worldInfoBeforeItems.join('\n'),
    worldInfoAfterText: worldInfoAfterItems.join('\n'),
    allWorldInfoText: allWorldInfoItems.join('\n'),
    rpgHybridTable,
    rpgSnapshot,
  };
}
