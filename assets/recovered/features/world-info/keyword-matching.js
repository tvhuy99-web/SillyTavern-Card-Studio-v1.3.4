// Recovered from the application host. One owner; dependency getters preserve late binding.

const MAX_RECURSION_DEPTH = 2;

function escapeRegexLiteral(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesTextToken(haystack, needle, caseSensitive, matchWholeWords) {
  if (!matchWholeWords) {
    return caseSensitive
      ? haystack.includes(needle)
      : haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
  }

  try {
    const flags = caseSensitive ? 'u' : 'iu';
    const boundaryRe = new RegExp(
      `(?:^|[^\\p{L}\\p{N}_])${escapeRegexLiteral(needle)}(?=$|[^\\p{L}\\p{N}_])`,
      flags,
    );
    return boundaryRe.test(haystack);
  } catch {
    return caseSensitive
      ? haystack.includes(needle)
      : haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
  }
}

function compileScannerRegex(patternText, caseSensitive) {
  if (!patternText) {
    return null;
  }
  try {
    const slashMatch = patternText.match(/^\/(.*?)\/([gimsuy]*)$/);
    return slashMatch
      ? new RegExp(slashMatch[1], slashMatch[2])
      : new RegExp(patternText, caseSensitive ? '' : 'i');
  } catch (error) {
    console.warn(`[WorldInfoScanner] Invalid Regex: ${patternText}`, error);
    return null;
  }
}

function matchesKeywordExpression(expression, haystack, useRegex, caseSensitive, matchWholeWords) {
  if (!expression || !haystack) {
    return false;
  }

  if (useRegex) {
    const compiled = compileScannerRegex(expression, caseSensitive);
    if (!compiled) {
      return false;
    }
    compiled.lastIndex = 0;
    return compiled.test(haystack);
  }

  const conjunctTerms = expression.split('&').map(term => term.trim());
  for (const term of conjunctTerms) {
    if (!term) {
      continue;
    }
    if (term.startsWith('!')) {
      const negatedTerm = term.substring(1).trim();
      if (negatedTerm && matchesTextToken(haystack, negatedTerm, caseSensitive, matchWholeWords)) {
        return false;
      }
    } else if (!matchesTextToken(haystack, term, caseSensitive, matchWholeWords)) {
      return false;
    }
  }
  return true;
}

function passesDeterministicProbability(entry, turnSequence) {
  if (!entry.use_probability) {
    return true;
  }
  const threshold = Math.max(0, Math.min(100, Number(entry.probability ?? 100)));
  let fnvHash = 2166136261;
  const seedKey = `${entry.uid || entry.id || entry.comment || ''}:${turnSequence}`;
  for (let index = 0; index < seedKey.length; index += 1) {
    fnvHash ^= seedKey.charCodeAt(index);
    fnvHash = Math.imul(fnvHash, 16777619);
  }
  return ((fnvHash >>> 0) % 100) < threshold;
}

function isEntryEnabled(entry, worldInfoState) {
  return worldInfoState[entry.uid] === undefined
    ? entry.enabled !== false
    : worldInfoState[entry.uid];
}

function scanSinglePass(
  scanText,
  allEntries,
  worldInfoState = {},
  runtimeState = {},
  turnSequence = 0,
  forcedUidSet = new Set(),
  allowKeywordMatching = true,
) {
  const matchedEntries = [];
  const touchedUids = new Set();

  for (const entry of allEntries) {
    if (!entry.uid || !isEntryEnabled(entry, worldInfoState) || !passesDeterministicProbability(entry, turnSequence)) {
      continue;
    }

    const entryRuntime = runtimeState[entry.uid] || {
      stickyDuration: 0,
      cooldownDuration: 0,
      lastActiveTurn: undefined,
    };
    const isForced = forcedUidSet.has(entry.uid);
    if (!isForced && entryRuntime.cooldownDuration > 0) {
      continue;
    }

    if (entry.constant) {
      matchedEntries.push(entry);
      continue;
    }

    let primaryMatched = false;
    if (allowKeywordMatching && entry.keys && entry.keys.length > 0) {
      for (const keyExpression of entry.keys) {
        if (
          matchesKeywordExpression(
            keyExpression,
            scanText,
            Boolean(entry.use_regex),
            Boolean(entry.case_sensitive),
            Boolean(entry.match_whole_words),
          )
        ) {
          primaryMatched = true;
          break;
        }
      }
    }

    let activated = false;
    if (isForced) {
      activated = true;
    } else if (primaryMatched) {
      let secondarySatisfied = true;
      if (!entry.use_regex && entry.selective === true && entry.secondary_keys && entry.secondary_keys.length > 0) {
        secondarySatisfied = false;
        for (const secondaryExpression of entry.secondary_keys) {
          if (
            matchesKeywordExpression(
              secondaryExpression,
              scanText,
              false,
              Boolean(entry.case_sensitive),
              Boolean(entry.match_whole_words),
            )
          ) {
            secondarySatisfied = true;
            break;
          }
        }
      }
      if (secondarySatisfied) {
        activated = true;
      }
    }

    if (activated) {
      matchedEntries.push(entry);
      touchedUids.add(entry.uid);
    }
  }

  return { matchedEntries, touchedUids };
}

function resolveWorldInfo(
  initialScanText,
  allEntries,
  worldInfoState,
  runtimeState,
  pinnedState = {},
  forcedUids = [],
  skipKeywordScan = false,
  turnSequence = 0,
  forcedStickyTurns = 0,
) {
  let recursionDepth = 0;
  const activeUidSet = new Set();
  const touchedUidSet = new Set();
  const forcedUidSet = new Set(forcedUids);

  allEntries
    .filter(entry => Boolean(
      entry.constant
      && entry.uid
      && passesDeterministicProbability(entry, turnSequence)
      && isEntryEnabled(entry, worldInfoState),
    ))
    .forEach(entry => activeUidSet.add(entry.uid));

  allEntries
    .filter(entry => entry.uid && pinnedState[entry.uid] && worldInfoState[entry.uid] !== false)
    .forEach(entry => activeUidSet.add(entry.uid));

  for (const uid in runtimeState) {
    const matchedEntry = allEntries.find(entry => entry.uid === uid);
    if (matchedEntry && isEntryEnabled(matchedEntry, worldInfoState) && runtimeState[uid].stickyDuration > 0) {
      activeUidSet.add(uid);
    }
  }

  forcedUids.forEach(uid => {
    if (worldInfoState[uid] !== false) {
      touchedUidSet.add(uid);
    }
  });

  if (!skipKeywordScan || forcedUids.length > 0) {
    let currentScanText = initialScanText;
    while (recursionDepth <= MAX_RECURSION_DEPTH) {
      const { matchedEntries, touchedUids } = scanSinglePass(
        currentScanText,
        allEntries,
        worldInfoState,
        runtimeState,
        turnSequence,
        forcedUidSet,
        !skipKeywordScan,
      );

      let discoveredNewEntry = false;
      let nextRecursionText = '';
      for (const entry of matchedEntries) {
        if (!entry.uid) {
          continue;
        }
        if (touchedUids.has(entry.uid)) {
          touchedUidSet.add(entry.uid);
        }
        if (!activeUidSet.has(entry.uid)) {
          activeUidSet.add(entry.uid);
          discoveredNewEntry = true;
          const recursionDisabled = entry.extensions?.exclude_recursion === true
            || entry.extensions?.prevent_recursion === true
            || entry.extensions?.non_recursive === true;
          if (!recursionDisabled) {
            nextRecursionText += `\n${entry.content}`;
          }
        }
      }

      if (!discoveredNewEntry) {
        break;
      }
      currentScanText = nextRecursionText;
      recursionDepth += 1;
    }
  }

  const updatedRuntimeState = {};
  for (const uid in runtimeState) {
    updatedRuntimeState[uid] = { ...runtimeState[uid] };
    updatedRuntimeState[uid].stickyDuration = Math.max(0, updatedRuntimeState[uid].stickyDuration - 1);
    updatedRuntimeState[uid].cooldownDuration = Math.max(0, updatedRuntimeState[uid].cooldownDuration - 1);
  }

  const activeEntries = allEntries.filter(entry => entry.uid && activeUidSet.has(entry.uid));
  for (const entry of activeEntries) {
    if (!entry.uid) {
      continue;
    }
    if (!updatedRuntimeState[entry.uid]) {
      updatedRuntimeState[entry.uid] = {
        stickyDuration: 0,
        cooldownDuration: 0,
        lastActiveTurn: turnSequence,
      };
    }
    if (touchedUidSet.has(entry.uid)) {
      updatedRuntimeState[entry.uid].lastActiveTurn = turnSequence;
    }

    const baseSticky = entry.sticky && entry.sticky > 0 ? entry.sticky : 0;
    let effectiveSticky = baseSticky;
    if (forcedUidSet.has(entry.uid) && forcedStickyTurns > 0) {
      effectiveSticky = Math.max(baseSticky, forcedStickyTurns);
    }
    if (effectiveSticky > 0 && touchedUidSet.has(entry.uid)) {
      updatedRuntimeState[entry.uid].stickyDuration = Math.max(
        updatedRuntimeState[entry.uid].stickyDuration,
        effectiveSticky,
      );
    }
    if (entry.cooldown && entry.cooldown > 0) {
      updatedRuntimeState[entry.uid].cooldownDuration = entry.cooldown;
    }
  }

  activeEntries.sort((left, right) => (left.insertion_order || 0) - (right.insertion_order || 0));

  return { activeEntries, updatedRuntimeState };
}

export function createKeywordMatching(dependencies = {}) {
  return { resolveWorldInfo };
}
