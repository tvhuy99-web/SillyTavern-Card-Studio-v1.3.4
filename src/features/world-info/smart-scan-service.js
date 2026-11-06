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

const DEFAULT_LLM_SELECTION_MODEL = 'gemini-3.5-flash-lite';
// Never override an explicitly selected model. Failed models must report an error,
// not be silently replaced by another model.
export function resolveSmartScanLlmModel(model) {
  return String(model || '').trim() || DEFAULT_LLM_SELECTION_MODEL;
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
  const cardEntries = input.card?.char_book?.entries || [];
  const attachedLorebookNames = new Set(
    Array.isArray(input.card?.attached_lorebooks)
      ? input.card.attached_lorebooks.map(String)
      : [],
  );
  const hydratedLorebookNames = new Set(
    cardEntries
      .map(entry => String(entry?.source_lorebook || ''))
      .filter(Boolean),
  );
  const attachedEntries = (input.lorebooks || []).flatMap(lorebook => {
    const lorebookName = String(lorebook?.name || '');
    return attachedLorebookNames.has(lorebookName)
      && !hydratedLorebookNames.has(lorebookName)
      ? (lorebook?.book?.entries || [])
      : [];
  });
  const entries = [
    ...cardEntries,
    ...attachedEntries,
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

  // A SillyTavern Lorebook may use numeric UIDs while IndexedDB and logs
  // serialize them as strings. Match by canonical key but return the original
  // entry UID type to the World Info resolver.
  const entryUidByKey = new Map(
    entries.filter(entry => entry?.uid != null).map(entry => [String(entry.uid), entry.uid]),
  );
  const logSemantic = message => deps.logSystemMessage?.(
    'state', 'system', '[Semantic Scan][DIAG] ' + message,
  );

  if (semanticEnabled && !forced) {
    const searchable = new Set(
      entries.filter(entry => !entry.constant).map(entry => String(entry.uid)),
    );
    if (searchable.size > 0) {
      input.setScanning?.(true);
      try {
        const query = String(input.scanInput || '');
        const thresholdValue = Number(settings.semantic_threshold);
        const threshold = Number.isFinite(thresholdValue)
          && settings.semantic_threshold !== undefined
          && settings.semantic_threshold !== null
          && settings.semantic_threshold !== ''
          ? thresholdValue : 0.7;
        const requestedLimit = Number(settings.max_semantic_entries);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.floor(requestedLimit) : 20;
        if (query.trim()) {
          const queryVector = await deps.embed(query);
          if (!queryVector?.length || !Array.from(queryVector).every(Number.isFinite)) {
            throw new Error('Embedding truy vấn rỗng hoặc chứa giá trị không hợp lệ.');
          }
          const indexName = input.card?.fileName || input.card?.name || 'default';
          await deps.loadIndex(indexName);
          const records = deps.getIndex(indexName) || [];
          const matches = [];
          let eligibleVectors = 0;
          let invalidDimensions = 0;
          for (const item of records) {
            if (!searchable.has(String(item.uid))) continue;
            if (!item.vector || item.vector.length !== queryVector.length) {
              invalidDimensions++;
              continue;
            }
            eligibleVectors++;
            const score = deps.cosine(queryVector, item.vector);
            if (!Number.isFinite(score)) continue;
            matches.push({ uid: String(item.uid), score });
          }
          const best = new Map();
          for (const match of matches) {
            if (!best.has(match.uid) || match.score > best.get(match.uid)) {
              best.set(match.uid, match.score);
            }
          }
          for (const [uid, score] of best) semanticScores[uid] = score;
          semanticSelected = [...best]
            .map(([uid, score]) => ({ uid, score }))
            .filter(item => item.score >= threshold)
            .sort((left, right) => right.score - left.score)
            .slice(0, limit)
            .map(item => entryUidByKey.get(item.uid));
          const scores = [...best.values()];
          const highest = scores.length ? Math.max(...scores) : null;
          const lowest = scores.length ? Math.min(...scores) : null;
          const fmt = value => value == null ? 'không có' : value.toFixed(3);
          logSemantic('mode=' + mode + '; threshold=' + threshold + '; limit=' + limit
            + '; queryChars=' + query.length + '; queryDim=' + queryVector.length
            + '; enabledUIDs=' + searchable.size + '; indexedVectors=' + records.length
            + '; eligibleVectors=' + eligibleVectors
            + '; badDimensions=' + invalidDimensions + '; scoredUIDs=' + best.size
            + '; minScore=' + fmt(lowest) + '; maxScore=' + fmt(highest)
            + '; selected=' + semanticSelected.length);
          if (!records.length) logSemantic('Chỉ mục rỗng cho nhân vật hiện tại. Hãy đồng bộ Lorebook với model đang chọn.');
          else if (!eligibleVectors) logSemantic('Có chỉ mục nhưng không có vector hợp lệ cho những UID được bật; kiểm tra model/chỉ mục/UID.');
          else if (!semanticSelected.length) logSemantic('Đã so khớp nhưng không mục nào đạt threshold. Xem maxScore phía trên.');
        } else {
          logSemantic('Không tạo embedding vì scanInput rỗng; không phải lỗi ngưỡng.');
        }
      } catch (error) {
        console.error('[Semantic Scan] Error:', error);
        deps.logSystemMessage?.('error', 'system', '[Semantic Scan] Failed'
          + (keywordEnabled ? '; keyword scan remains independently enabled' : '; semantic-only mode, no fallback')
          + '. Error: ' + String(error));
        deps.onSemanticError?.(error);
      } finally {
        input.setScanning?.(false);
      }
    } else {
      logSemantic('Không có mục Lorebook động đang bật. Không tính embedding.');
    }
  } else if (semanticEnabled && forced) {
    logSemantic('Lượt tạo lại dùng UID đã chọn từ lượt trước (forceActiveUids); bỏ qua quét mới theo chủ ý.');
  }

  if (llmEnabled) {
    if (forced) {
      llmSelected = input.forceActiveUids;
      smartScanLog = {
        fullPrompt: '[Không gửi yêu cầu mới: sử dụng lại lựa chọn từ lượt trước]',
        rawResponse: `[SKIPPED] Không gọi LLM. Đã dùng lại ${llmSelected.length} UID.`,
        latency: 0,
      };
      deps.logSystemMessage('state', 'system', `[Smart Scan] Skipped API call. Reusing ${llmSelected.length} UIDs from previous turn.`);
    } else {
      input.setScanning?.(true);
      const started = Date.now();
      let requestPrompt = '';
      let requestedModel = '';
      let rawResponseText = '';
      let attemptedRequest = false;
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
          requestedModel = resolveSmartScanLlmModel(settings.model);
          requestPrompt = prompt;
          attemptedRequest = true;
          // Record the exact outbound prompt before calling the provider. Persist
          // the result (including errors) into section 3 of Smart Scan diagnostics.
          smartScanLog = {
            fullPrompt: requestPrompt,
            rawResponse: '[ĐÃ GỬI] Chưa có phản hồi từ mô hình ' + requestedModel,
            latency: 0,
          };
          rawResponseText = String(await deps.callSelectionModel(prompt, requestedModel) || '');
          const cleanedResponse = rawResponseText
            .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
            .trim();
          const selected = parseSelection(cleanedResponse, deps.parseJson);
          const eligibleUids = new Set(entries.filter(entry => !entry.constant).map(entry => String(entry.uid)));
          llmSelected = selected
            .filter(uid => eligibleUids.has(uid))
            .slice(0, settings.max_entries || 5)
            .map(uid => entryUidByKey.get(uid));
          smartScanLog = { fullPrompt: requestPrompt, rawResponse: rawResponseText, latency: Date.now() - started };
        } else {
          smartScanLog = {
            fullPrompt: '[Không gửi yêu cầu: không có mục World Info động để chọn]',
            rawResponse: '[SKIPPED] Không gọi LLM vì không có ứng viên.',
            latency: 0,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Smart Scan] Error:', error);
        // Without this record, a provider error makes both the sent prompt and
        // the error/response disappear from the Smart Scan journal.
        smartScanLog = {
          fullPrompt: requestPrompt || '[Không gửi yêu cầu: lỗi trước khi chuẩn bị xong prompt]',
          rawResponse: (rawResponseText ? rawResponseText + '\n\n' : '') +
            `[LỖI ${attemptedRequest ? 'GỌI LLM' : 'CHUẨN BỊ'}]${requestedModel ? ' ' + requestedModel : ''}: ${message}`,
          latency: Date.now() - started,
        };
        deps.logSystemMessage?.(
          'error',
          'system',
          `[Smart Scan] LLM selection failed${keywordEnabled ? '; keyword scan is independently enabled' : '; no fallback in LLM-only mode'}. Error: ${message}`,
        );
        deps.onLlmError?.(error);
      } finally {
        input.setScanning?.(false);
      }
    }
  }

  const selected = [...new Map(
    [...llmSelected, ...semanticSelected].map(uid => [String(uid), uid]),
  ).values()];
  const selectionData = {
    prompt: smartScanLog?.fullPrompt || `Semantic Search (Threshold: ${settings.semantic_threshold ?? 0.7})`,
    selectedItems: selected.map(uid => {
      const entry = entries.find(candidate => String(candidate.uid) === String(uid));
      return {
        id: uid,
        score: semanticScores[String(uid)] ?? 1,
        name: entry?.name || entry?.comment || 'Không tên',
      };
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
