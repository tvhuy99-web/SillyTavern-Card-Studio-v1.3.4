// Recovered from the application host. One owner; dependency getters preserve late binding.

const PROTECTED_TOKEN_SUFFIX = '___';

const BLOCK_CONTAINER_TAGS = new Set([
  'div', 'main', 'section', 'article', 'aside', 'nav', 'form',
  'template', 'details', 'svg', 'canvas',
]);

const EXTENDED_HTML_TAGS = new Set([
  'div', 'main', 'section', 'article', 'aside', 'nav', 'form', 'template',
  'details', 'svg', 'canvas', 'table', 'ul', 'ol', 'dialog', 'fieldset',
  'figure', 'picture', 'video', 'audio', 'iframe', 'span', 'img', 'html',
  'head', 'body', 'header', 'footer', 'p', 'a', 'button', 'input', 'select',
  'textarea',
]);

const RESOURCE_HEADER_TAGS = new Set(['link', 'style', 'script']);

const VOID_HTML_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const HTML_TAG_DETECT_RE = new RegExp(
  '<(?:!doctype|html|head|body|div|main|section|article|aside|nav|form|'
  + 'template|details|svg|canvas|table|ul|ol|dialog|fieldset|figure|picture|'
  + 'video|audio|iframe|span|img|header|footer|p|a|button|input|select|'
  + 'textarea|script|style)\\b',
  'i',
);

const CUSTOM_ELEMENT_RE = /<[a-z][\w.:]*-[\w.:-]+\b/i;

function unwrapCodeFence(blockText) {
  const match = blockText.match(/^```(?:text|html|xml|javascript|js|css)?\s*([\s\S]*?)\s*```$/i);
  return match && match[1] ? match[1].trim() : blockText.trim();
}

function isInteractiveTag(tagName, includeExtended) {
  return includeExtended
    ? EXTENDED_HTML_TAGS.has(tagName) || tagName.includes('-')
    : BLOCK_CONTAINER_TAGS.has(tagName);
}

function containsHtmlMarkup(text) {
  const lowerText = text.toLowerCase();
  if (['html>', '<head', '<body'].some(token => lowerText.includes(token))) {
    return true;
  }
  return HTML_TAG_DETECT_RE.test(text) || CUSTOM_ELEMENT_RE.test(text);
}

function parseTagAt(sourceText, startIndex) {
  if (sourceText[startIndex] !== '<') {
    return null;
  }

  if (sourceText.startsWith('<!--', startIndex)) {
    const commentEnd = sourceText.indexOf('-->', startIndex + 4);
    return {
      name: '!--',
      closing: false,
      selfClosing: true,
      end: commentEnd >= 0 ? commentEnd + 3 : sourceText.length,
    };
  }

  let activeQuote = '';
  let cursor = startIndex + 1;
  for (; cursor < sourceText.length; cursor += 1) {
    const currentChar = sourceText[cursor];
    if (activeQuote) {
      if (currentChar === activeQuote && sourceText[cursor - 1] !== '\\') {
        activeQuote = '';
      }
    } else if (currentChar === '"' || currentChar === "'") {
      activeQuote = currentChar;
    } else if (currentChar === '>') {
      cursor += 1;
      break;
    }
  }

  const rawTag = sourceText.slice(startIndex, cursor);
  const tagMatch = rawTag.match(/^<\s*(\/?)\s*([A-Za-z][\w:-]*)/);
  if (!tagMatch) {
    return {
      name: '',
      closing: false,
      selfClosing: true,
      end: cursor,
    };
  }

  const tagName = tagMatch[2].toLowerCase();
  return {
    name: tagName,
    closing: Boolean(tagMatch[1]),
    selfClosing: /\/\s*>$/.test(rawTag) || VOID_HTML_TAGS.has(tagName),
    end: cursor,
  };
}

function extractBalancedHtmlBlock(sourceText, includeExtended = false) {
  const openTagRe = /<([A-Za-z][\w:-]*)\b/g;
  let firstMatch = null;
  let candidateMatch;

  while ((candidateMatch = openTagRe.exec(sourceText)) !== null) {
    if (isInteractiveTag(candidateMatch[1].toLowerCase(), includeExtended)) {
      firstMatch = candidateMatch;
      break;
    }
  }

  if (!firstMatch || firstMatch.index < 0) {
    return null;
  }

  let blockStart = firstMatch.index;
  const leadingResourceTag = [...sourceText.slice(0, blockStart).matchAll(/<(?:link|style|script)\b/gi)].at(-1);
  if (leadingResourceTag && typeof leadingResourceTag.index === 'number') {
    blockStart = leadingResourceTag.index;
  }

  const tagStack = [];
  let sawInteractiveTag = false;
  let lastBalancedEnd = -1;
  let cursor = blockStart;

  while (cursor < sourceText.length) {
    const nextAngle = sourceText.indexOf('<', cursor);
    if (nextAngle < 0) {
      break;
    }

    const parsedTag = parseTagAt(sourceText, nextAngle);
    if (!parsedTag) {
      cursor = nextAngle + 1;
      continue;
    }

    cursor = parsedTag.end;
    if (!parsedTag.name || parsedTag.name === '!--') {
      continue;
    }

    if (!parsedTag.closing && isInteractiveTag(parsedTag.name, includeExtended)) {
      sawInteractiveTag = true;
    }

    if (!parsedTag.closing && (parsedTag.name === 'script' || parsedTag.name === 'style') && !parsedTag.selfClosing) {
      const closeTagRe = new RegExp(`<\\/\\s*${parsedTag.name}\\s*>`, 'ig');
      closeTagRe.lastIndex = cursor;
      const closeMatch = closeTagRe.exec(sourceText);
      cursor = closeMatch ? closeTagRe.lastIndex : sourceText.length;
      if (tagStack.length === 0 && sawInteractiveTag) {
        lastBalancedEnd = cursor;
      }
      continue;
    }

    if (parsedTag.closing) {
      const stackIndex = tagStack.lastIndexOf(parsedTag.name);
      if (stackIndex >= 0) {
        tagStack.splice(stackIndex);
      }
    } else if (!parsedTag.selfClosing) {
      tagStack.push(parsedTag.name);
    }

    if (sawInteractiveTag && tagStack.length === 0) {
      lastBalancedEnd = cursor;
      const nextNonSpaceOffset = sourceText.slice(cursor).search(/\S/);
      if (nextNonSpaceOffset < 0) {
        break;
      }
      const nextTagPos = cursor + nextNonSpaceOffset;
      const nextTag = parseTagAt(sourceText, nextTagPos);
      if (!nextTag || (!isInteractiveTag(nextTag.name, includeExtended) && !RESOURCE_HEADER_TAGS.has(nextTag.name))) {
        break;
      }
      cursor = nextTagPos;
    }
  }

  const blockEnd = lastBalancedEnd > blockStart
    ? lastBalancedEnd
    : (sawInteractiveTag ? sourceText.length : -1);

  return blockEnd > blockStart ? sourceText.slice(blockStart, blockEnd).trim() : null;
}

function extractLegacyInteractiveBlocks(sourceText) {
  const blocks = [];
  let match;

  const fencedRe = /```(?:text|html|xml|javascript)?\s*([\s\S]*?)\s*```/gi;
  while ((match = fencedRe.exec(sourceText)) !== null) {
    const inner = match[1].trim();
    if (
      inner
      && (inner.includes('<div')
        || inner.includes('<script')
        || inner.includes('<style')
        || inner.includes('<details')
        || inner.includes('<!DOCTYPE'))
    ) {
      blocks.push(inner);
    }
  }

  const htmlDocRe = /(?:<!DOCTYPE html>)?\s*<html[^>]*>[\s\S]*?<\/html>/gi;
  while ((match = htmlDocRe.exec(sourceText)) !== null) {
    blocks.push(match[0].trim());
  }

  const scriptRe = /<script[^>]*>[\s\S]*?<\/script>/gi;
  while ((match = scriptRe.exec(sourceText)) !== null) {
    const scriptText = match[0];
    if (!blocks.some(existing => existing.includes(scriptText))) {
      blocks.push(scriptText.trim());
    }
  }

  const balancedBlock = extractBalancedHtmlBlock(sourceText);
  if (balancedBlock && !blocks.includes(balancedBlock)) {
    blocks.push(balancedBlock);
  }

  return blocks;
}

function compileOfficialRegex(patternText) {
  const slashMatch = patternText.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/);
  return slashMatch ? new RegExp(slashMatch[1], slashMatch[2]) : new RegExp(patternText);
}

function compileLegacyRegex(patternText) {
  const slashMatch = patternText.match(/^\/(.*?)\/([gimsuy]*)$/);
  return slashMatch ? new RegExp(slashMatch[1], slashMatch[2]) : new RegExp(patternText, 'g');
}

function escapeRegExpLiteral(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function substituteFindRegexMacros(findRegex, substituteMode, macros) {
  if (!substituteMode || !macros) {
    return findRegex;
  }
  return findRegex.replace(/{{\s*([^{}]+?)\s*}}/g, (fullMatch, rawKey) => {
    const key = rawKey.trim();
    if (!(key in macros)) {
      return fullMatch;
    }
    const rawValue = String(macros[key] ?? '');
    return substituteMode === 2 ? escapeRegExpLiteral(rawValue) : rawValue;
  });
}

function replaceMacrosCaseInsensitive(text, macros) {
  if (!macros) {
    return text;
  }
  const macroMap = new Map(
    Object.entries(macros).map(([key, value]) => [key.toLowerCase(), String(value ?? '')]),
  );
  return text.replace(/{{\s*([^{}]+?)\s*}}/g, (fullMatch, rawKey) => {
    const normalizedKey = rawKey.trim().toLowerCase();
    return macroMap.has(normalizedKey) ? macroMap.get(normalizedKey) : fullMatch;
  });
}

function formatOfficialReplacement(
  replaceTemplate,
  matchedText,
  captureGroups,
  namedGroups,
  trimStrings = [],
  macros,
) {
  const applyTrims = rawValue => trimStrings.reduce((accumulator, trimToken) => {
    const resolvedTrim = replaceMacrosCaseInsensitive(String(trimToken || ''), macros);
    return resolvedTrim ? accumulator.split(resolvedTrim).join('') : accumulator;
  }, String(rawValue ?? ''));

  const withCaptures = replaceTemplate
    .replace(/{{\s*match\s*}}/gi, '$0')
    .replace(/\$(\d+)|\$<([^>]+)>/g, (_placeholder, groupNumber, groupName) => {
      if (groupNumber !== undefined) {
        const numericIndex = Number(groupNumber);
        return applyTrims(numericIndex === 0 ? matchedText : captureGroups[numericIndex - 1]);
      }
      return applyTrims(namedGroups?.[String(groupName)]);
    });

  return replaceMacrosCaseInsensitive(withCaptures, macros);
}

function shouldRunOfficialScript(script, targetPlacements, options) {
  if (script.disabled || !script.findRegex) {
    return false;
  }
  const placements = script.placement?.length ? script.placement : [2];
  if (!targetPlacements.some(target => placements.includes(target))) {
    return false;
  }

  const isMarkdown = options.isMarkdown ?? targetPlacements.includes(2);
  const isPrompt = options.isPrompt ?? targetPlacements.includes(1);
  if (
    (script.markdownOnly || script.promptOnly)
    && !((isMarkdown && script.markdownOnly) || (isPrompt && script.promptOnly))
  ) {
    return false;
  }
  if (options.isEdit && !script.runOnEdit) {
    return false;
  }
  if (typeof options.depth === 'number') {
    const minDepth = script.minDepth ?? -1;
    const maxDepth = script.maxDepth ?? -1;
    if ((minDepth >= 0 && options.depth < minDepth) || (maxDepth >= 0 && options.depth > maxDepth)) {
      return false;
    }
  }
  return true;
}

function collectOfficialInteractiveBlocks(sourceText) {
  let match;
  const fencedBlocks = [];
  const fencedRe = /```(?:text|html|xml|javascript|js)?\s*([\s\S]*?)\s*```/gi;
  while ((match = fencedRe.exec(sourceText)) !== null) {
    const inner = match[1].trim();
    if (inner && containsHtmlMarkup(inner)) {
      fencedBlocks.push(inner);
    }
  }
  if (fencedBlocks.length > 0) {
    return Array.from(new Set(fencedBlocks));
  }

  const documentBlocks = [];
  const addUniqueBlock = candidate => {
    const trimmed = candidate.trim();
    if (trimmed && !documentBlocks.some(existing => existing.includes(trimmed))) {
      documentBlocks.push(trimmed);
    }
  };

  const htmlDocRe = /(?:<!DOCTYPE html>)?\s*<html[^>]*>[\s\S]*?<\/html>/gi;
  while ((match = htmlDocRe.exec(sourceText)) !== null) {
    addUniqueBlock(match[0]);
  }
  if (documentBlocks.length > 0) {
    return Array.from(new Set(documentBlocks));
  }

  const headBodyRe = /<head\b[^>]*>[\s\S]*?<\/head>\s*<body\b[^>]*>[\s\S]*?<\/body>/gi;
  while ((match = headBodyRe.exec(sourceText)) !== null) {
    addUniqueBlock(match[0]);
  }
  const bodyRe = /<body\b[^>]*>[\s\S]*?<\/body>/gi;
  while ((match = bodyRe.exec(sourceText)) !== null) {
    addUniqueBlock(match[0]);
  }
  const headRe = /<head\b[^>]*>[\s\S]*?<\/head>/gi;
  while ((match = headRe.exec(sourceText)) !== null) {
    addUniqueBlock(match[0]);
  }
  if (documentBlocks.length > 0) {
    return Array.from(new Set(documentBlocks));
  }

  const balancedHtml = extractBalancedHtmlBlock(sourceText, true);
  if (balancedHtml) {
    return [balancedHtml];
  }

  const standaloneScripts = [];
  const scriptRe = /<script[^>]*>[\s\S]*?<\/script>/gi;
  while ((match = scriptRe.exec(sourceText)) !== null) {
    standaloneScripts.push(match[0].trim());
  }
  return Array.from(new Set(standaloneScripts));
}

function extractOfficialInteractiveResult(sourceText) {
  const blocks = collectOfficialInteractiveBlocks(sourceText);
  if (blocks.length === 0) {
    return {
      displayContent: sourceText,
      interactiveHtml: null,
      interactiveHtmlBlocks: [],
    };
  }

  let displayContent = sourceText.replace(
    /```(?:text|html|xml|javascript|js)?\s*([\s\S]*?)\s*```/gi,
    (fullMatch, inner) => (blocks.includes(inner.trim()) ? '' : fullMatch),
  );
  for (const block of blocks) {
    displayContent = displayContent.replace(block, '');
  }
  displayContent = displayContent
    .replace(/<\/?(?:maintext|opening|StatusPlaceHolderImpl|Status_?block)\s*\/?>/gi, '')
    .trim();

  return {
    displayContent,
    interactiveHtml: blocks.join('\n'),
    interactiveHtmlBlocks: blocks,
  };
}

function runOfficialRegexPipeline(inputText, scripts = [], targetPlacements = [2], options = {}) {
  const diagnosticLines = [
    `[START] Regex Pipeline (Target: ${targetPlacements.join(',')}). Strategy: Official source order.`,
  ];
  let currentText = inputText;

  for (const script of scripts || []) {
    if (!shouldRunOfficialScript(script, targetPlacements, options)) {
      continue;
    }
    try {
      const compiledRegex = compileOfficialRegex(
        substituteFindRegexMacros(script.findRegex, script.substituteRegex, options.macros),
      );
      const previousText = currentText;
      currentText = currentText.replace(compiledRegex, (matchedText, ...restArgs) => {
        const argList = [...restArgs];
        const maybeGroups = argList.at(-1);
        const namedGroups = maybeGroups && typeof maybeGroups === 'object'
          ? argList.pop()
          : undefined;
        argList.pop();
        argList.pop();
        return formatOfficialReplacement(
          script.replaceString || '',
          matchedText,
          argList,
          namedGroups,
          script.trimStrings || [],
          options.macros,
        );
      });
      if (previousText !== currentText) {
        diagnosticLines.push(` -> [OK] Script "${script.scriptName}" applied.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      diagnosticLines.push(` -> [ERR] Script "${script.scriptName}": ${errorMessage}`);
    }
  }

  const extraction = targetPlacements.includes(2)
    ? extractOfficialInteractiveResult(currentText)
    : { displayContent: currentText, interactiveHtml: null, interactiveHtmlBlocks: [] };

  if (extraction.interactiveHtml) {
    diagnosticLines.push('[EXTRACT] Prepared post-regex interactive content for Iframe.');
  }

  return {
    ...extraction,
    diagnosticLog: diagnosticLines.join('\n'),
  };
}

function maskProtectedBlocks(sourceText) {
  const artifacts = [];
  let maskedText = sourceText;
  let tokenPrefix = '___ST_PROTECTED_BLOCK_';
  while (sourceText.includes(tokenPrefix)) {
    tokenPrefix = `_${tokenPrefix}`;
  }

  const maskPattern = pattern => {
    maskedText = maskedText.replace(pattern, matched => {
      const artifactIndex = artifacts.length;
      artifacts.push(matched);
      return `${tokenPrefix}${artifactIndex}${PROTECTED_TOKEN_SUFFIX}`;
    });
  };

  maskPattern(/```[\s\S]*?```/g);
  maskPattern(/(?:<!DOCTYPE html>)?\s*<html[^>]*>[\s\S]*?<\/html>/gi);
  maskPattern(/<script[^>]*>[\s\S]*?<\/script>/gi);
  maskPattern(/<style[^>]*>[\s\S]*?<\/style>/gi);

  return { maskedText, artifacts, tokenPrefix };
}

function runLegacyMaskingPipeline(inputText, scripts = [], targetPlacements = [2]) {
  const diagnosticLines = [
    `[START] Regex Pipeline (Target: ${targetPlacements.join(',')}). Strategy: Masking.`,
  ];
  const { maskedText, artifacts, tokenPrefix } = maskProtectedBlocks(inputText);
  let processedText = maskedText;

  if (artifacts.length > 0) {
    diagnosticLines.push(`[MASK] Protected ${artifacts.length} code blocks from regex modification.`);
  }

  const applicableScripts = [...(scripts || []).filter(script => {
    if (script.disabled) {
      return false;
    }
    const placements = script.placement && script.placement.length > 0 ? script.placement : [2];
    return targetPlacements.some(target => placements.includes(target)) && Boolean(script.findRegex);
  })].sort((left, right) => {
    const leftProducesHtml = left.replaceString.includes('```') || left.replaceString.includes('<div');
    const rightProducesHtml = right.replaceString.includes('```') || right.replaceString.includes('<div');
    if (leftProducesHtml && !rightProducesHtml) return -1;
    if (!leftProducesHtml && rightProducesHtml) return 1;
    return 0;
  });

  if (applicableScripts.length > 0) {
    applicableScripts.forEach(script => {
      try {
        const compiledRegex = compileLegacyRegex(script.findRegex);
        const previousText = processedText;
        processedText = previousText.replace(compiledRegex, script.replaceString);
        for (const trimToken of script.trimStrings || []) {
          if (trimToken) {
            processedText = processedText.split(trimToken).join('');
          }
        }
        if (previousText !== processedText) {
          diagnosticLines.push(` -> [OK] Script "${script.scriptName}" applied.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        diagnosticLines.push(` -> [ERR] Script "${script.scriptName}": ${errorMessage}`);
      }
    });
  }

  processedText = processedText.replace(
    /(^|[;{]\s*|\n\s*):\s*((?:translate|scale|rotate)[XYZ3d]*\([^;{}]+\))/gim,
    '$1transform: $2',
  );

  const isDisplayTarget = targetPlacements.includes(2);
  let interactiveHtml = null;
  let displayContent = processedText;

  if (isDisplayTarget) {
    const artifactHtmlBlocks = artifacts
      .map(unwrapCodeFence)
      .filter(block => /<(?:!doctype|html|div|script|style|details|svg|canvas)\b/i.test(block));
    const combinedBlocks = [
      ...artifactHtmlBlocks,
      ...extractLegacyInteractiveBlocks(inputText),
      ...extractLegacyInteractiveBlocks(processedText),
    ];
    const deduplicatedBlocks = Array.from(new Set(combinedBlocks)).filter(
      (block, index, list) => !list.some(
        (other, otherIndex) => otherIndex !== index && other.length > block.length && other.includes(block),
      ),
    );

    if (deduplicatedBlocks.length > 0) {
      interactiveHtml = deduplicatedBlocks.join('\n');
      diagnosticLines.push(`[EXTRACT] Prepared ${deduplicatedBlocks.length} interactive blocks for Iframe.`);
    }

    displayContent = displayContent
      .replace(new RegExp(`${tokenPrefix}\\d+${PROTECTED_TOKEN_SUFFIX}`, 'g'), '')
      .replace(/```(?:text|html|xml|javascript)?\s*([\s\S]*?)\s*```/gi, '')
      .replace(
        /<\/?(maintext|opening|StatusPlaceHolderImpl|Status_?block)>[\s\S]*?<\/?(maintext|opening|StatusPlaceHolderImpl|Status_?block)>/gi,
        '',
      )
      .replace(/<\/?(maintext|opening|StatusPlaceHolderImpl|Status_?block)\/?>/gi, '')
      .trim();
  } else {
    displayContent = displayContent.replace(
      new RegExp(`${tokenPrefix}(\\d+)${PROTECTED_TOKEN_SUFFIX}`, 'g'),
      (_match, indexText) => artifacts[Number.parseInt(indexText, 10)] || '',
    );
  }

  return {
    displayContent,
    interactiveHtml,
    diagnosticLog: diagnosticLines.join('\n'),
  };
}

export function createRegexProcessing(dependencies = {}) {
  const processRegex = (inputText, cardScripts = [], targetPlacements = [2], options = {}) => {
    const engineMode = options.engineMode ?? dependencies.readCardRuntimeEngineMode();
    if (engineMode === 'official-local') {
      const mergedScripts = [
        ...(options.globalScripts || []),
        ...(options.presetScripts || []),
        ...(cardScripts || []),
      ];
      return runOfficialRegexPipeline(inputText, mergedScripts, targetPlacements, options);
    }
    return runLegacyMaskingPipeline(inputText, cardScripts, targetPlacements);
  };

  return { processRegex };
}
