import {
  expandReferencedLorebookLines,
  renderEjsTemplate,
} from './ejs-template-renderer.js';

function yieldMacrotask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

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
