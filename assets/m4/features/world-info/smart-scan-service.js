function buildCandidateText(entries, strategy = 'efficient') {
  const constants = [];
  const candidates = [];
  for (const entry of entries) {
    if (!entry?.uid || entry.enabled === false) continue;
    let content = entry.content || '';
    if (strategy === 'efficient') {
      if (content.length > 400) content = content.slice(0, 300) + '\n... (đã lược bỏ) ...\n' + content.slice(-100);
    } else if (content.length > 20000) {
      content = content.slice(0, 20000) + '\n... (đã lược bỏ vì quá lớn > 20k) ...';
    }
    content = content.replace(/\n/g, ' ');
    const active = String(entry.uid).startsWith('mythic_') ? ' [ACTIVE]' : '';
    const block = `[${entry.constant ? 'Hằng số' : 'ID: ' + entry.uid}${active}]\n` +
      `- Tên: ${entry.name || entry.comment || 'Không tên'}\n` +
      `- Từ khóa: ${(entry.keys || []).join(', ')}\n` +
      `- Nội dung: "${content}"`;
    (entry.constant ? constants : candidates).push(block);
  }
  return { contextString: constants.join('\n\n'), candidateString: candidates.join('\n\n') };
}

function parseSelection(rawResponse, parseJson) {
  let selected = [];
  try {
    const parsed = parseJson(rawResponse);
    selected = Array.isArray(parsed) ? parsed : parsed?.selected_ids || [];
  } catch (error) {
    console.warn('[Smart Scan] JSON Parse Failed. Trying regex fallback...', error);
    const match = rawResponse.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = parseJson(match[0]);
        selected = Array.isArray(parsed) ? parsed : [];
      } catch {
        selected = [];
      }
    }
  }
  return Array.isArray(selected) ? selected.map(String) : [];
}

function buildVariableState(variables) {
  if (!variables || Object.keys(variables).length === 0) return '';
  return Object.entries(variables).map(([key, value]) => {
    if (Array.isArray(value) && value.length > 1 && typeof value[1] === 'string') {
      return `- ${key}: ${value[0]} (${value[1]})`;
    }
    return `- ${key}: ${JSON.stringify(value)}`;
  }).join('\n');
}

export async function scanWorldInfo(input, deps) {
  const settings = deps.getSettings() || {};
  const entries = [
    ...(input.card?.char_book?.entries || []),
    ...(input.generatedEntries || []),
  ].filter(entry => entry?.uid && input.worldInfoState?.[entry.uid] !== false);

  let llmSelected = [];
  let semanticSelected = [];
  const semanticScores = {};
  let smartScanLog;

  const mode = settings.mode || 'keyword';
  const llmEnabled = settings.enabled && ['llm_only', 'ultimate'].includes(mode);
  const semanticEnabled = settings.enabled && ['semantic', 'hybrid_fast', 'ultimate'].includes(mode);
  const keywordEnabled = !settings.enabled || ['keyword', 'hybrid_fast', 'ultimate'].includes(mode);
  const forced = Array.isArray(input.forceActiveUids) && input.forceActiveUids.length > 0;

  if (semanticEnabled && !forced) {
    const searchable = new Set(entries.filter(entry => !entry.constant).map(entry => entry.uid));
    if (searchable.size > 0) {
      input.setScanning?.(true);
      try {
        const query = String(input.scanInput || '');
        if (query.trim()) {
          const queryVector = await deps.embed(query);
          const indexName = input.card?.fileName || input.card?.name || 'default';
          await deps.loadIndex(indexName);
          const matches = deps.getIndex(indexName)
            .filter(item => searchable.has(item.uid))
            .map(item => ({ uid: item.uid, score: deps.cosine(queryVector, item.vector) }));
          const best = {};
          for (const match of matches) {
            if (!best[match.uid] || match.score > best[match.uid]) best[match.uid] = match.score;
          }
          for (const [uid, score] of Object.entries(best)) semanticScores[uid] = score;
          const threshold = settings.semantic_threshold || 0.7;
          const limit = settings.max_semantic_entries || 20;
          semanticSelected = Object.entries(best)
            .map(([uid, score]) => ({ uid, score }))
            .filter(item => item.score >= threshold)
            .sort((left, right) => right.score - left.score)
            .slice(0, limit)
            .map(item => item.uid);
        }
      } catch (error) {
        console.error('[Semantic Scan] Error:', error);
        deps.logSystemMessage('error', 'system', `[Semantic Scan] Failed, falling back to keyword. Error: ${error}`);
        deps.onSemanticError?.(error);
      } finally {
        input.setScanning?.(false);
      }
    }
  }

  if (llmEnabled) {
    if (forced) {
      llmSelected = input.forceActiveUids;
      deps.logSystemMessage('state', 'system', `[Smart Scan] Skipped API call. Reusing ${llmSelected.length} UIDs from previous turn.`);
    } else {
      input.setScanning?.(true);
      const started = Date.now();
      try {
        const depth = settings.depth || 3;
        const history = (input.promptHistory || []).slice(-depth).map(message => {
          if (message.role === 'model') {
            const match = String(message.content || '').match(/<content>([\s\S]*?)<\/content>/);
            return match ? match[1].trim() : message.content;
          }
          return message.content;
        }).join('\n');
        const variableState = buildVariableState(input.variables);
        const { contextString, candidateString } = buildCandidateText(entries, settings.scan_strategy || 'efficient');
        if (candidateString) {
          const template = settings.system_prompt ||
            'Nhiệm vụ: Chọn các ID mục World Info cần thiết cho tình huống này.\nTrạng thái: {{state}}\nInput: {{input}}\nỨng viên: {{candidates}}\n\nTrả về mảng JSON ["id1", "id2"]';
          const prompt = template
            .replace('{{history}}', history)
            .replace('{{context}}', contextString)
            .replace('{{candidates}}', candidateString)
            .replace('{{input}}', input.content || input.scanInput || '')
            .replace('{{state}}', variableState);
          let rawResponse = await deps.callSelectionModel(prompt, settings.model || 'gemini-3.1-flash-lite-preview');
          rawResponse = String(rawResponse || '').replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
          const selected = parseSelection(rawResponse, deps.parseJson);
          llmSelected = selected.slice(0, settings.max_entries || 5);
          smartScanLog = { fullPrompt: prompt, rawResponse, latency: Date.now() - started };
        }
      } catch (error) {
        console.error('[Smart Scan] Error:', error);
        deps.logSystemMessage?.(
          'error',
          'system',
          `[Smart Scan] LLM selection failed; continuing with deterministic World Info fallback. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        deps.onLlmError?.(error);
      } finally {
        input.setScanning?.(false);
      }
    }
  }

  const selected = Array.from(new Set([...llmSelected, ...semanticSelected]));
  const selectionData = {
    prompt: smartScanLog?.fullPrompt || `Semantic Search (Threshold: ${settings.semantic_threshold || 0.7})`,
    selectedItems: selected.map(uid => {
      const entry = entries.find(candidate => candidate.uid === uid);
      return { id: uid, score: semanticScores[uid] || 1, name: entry?.name || entry?.comment || 'Không tên' };
    }),
  };

  return {
    ...deps.resolveWorldInfo(
      input.scanInput,
      entries,
      input.worldInfoState,
      input.worldInfoRuntime,
      input.worldInfoPinned,
      selected,
      !keywordEnabled,
      input.sequence,
      settings.aiStickyDuration,
    ),
    smartScanLog,
    selectionData,
  };
}
