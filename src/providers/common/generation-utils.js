export function clampNumber(value, fallback, options = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(options.max ?? Infinity, Math.max(options.min ?? -Infinity, number));
}

export function optionalPositiveInt(value, options = {}) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  const integer = Math.trunc(number);
  const min = Math.max(1, Math.trunc(options.min ?? 1));
  if (integer < min) return undefined;
  return Math.min(options.max ?? Infinity, integer);
}

export function optionalFiniteNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  if (number < (options.min ?? -Infinity)) return undefined;
  if (number > (options.max ?? Infinity)) return undefined;
  return number;
}

export function optionalNonNegativeInt(value, options = {}) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  const integer = Math.trunc(number);
  const min = Math.max(0, Math.trunc(options.min ?? 0));
  if (integer < min) return undefined;
  return Math.min(options.max ?? Infinity, integer);
}

export function buildSamplerSettings(preset = {}, options = {}) {
  const settings = {};
  const topP = optionalFiniteNumber(preset.top_p, { min: 0, max: 1 });
  const topK = optionalNonNegativeInt(preset.top_k);
  const typicalP = optionalFiniteNumber(preset.typical_p, { min: 0, max: 1 });
  const minP = optionalFiniteNumber(preset.min_p, { min: 0, max: 1 });
  const repetitionPenalty = optionalFiniteNumber(
    preset.repetition_penalty ?? preset.rep_pen,
    { min: 0 },
  );
  const frequencyPenalty = optionalFiniteNumber(
    preset.frequency_penalty,
    { min: -2, max: 2 },
  );
  const presencePenalty = optionalFiniteNumber(
    preset.presence_penalty,
    { min: -2, max: 2 },
  );

  if (topP !== undefined) settings.top_p = topP;
  if (options.includeTopK !== false && topK !== undefined) settings.top_k = topK;
  if (options.includeTypicalP !== false && typicalP !== undefined) settings.typical_p = typicalP;
  if (options.includeMinP !== false && minP !== undefined) settings.min_p = minP;
  if (options.includeRepetitionPenalty !== false && repetitionPenalty !== undefined) {
    settings.repetition_penalty = repetitionPenalty;
  }
  if (options.includeFrequencyPenalty !== false && frequencyPenalty !== undefined) {
    settings.frequency_penalty = frequencyPenalty;
  }
  if (options.includePresencePenalty !== false && presencePenalty !== undefined) {
    settings.presence_penalty = presencePenalty;
  }
  return settings;
}

export function buildGeminiSamplerSettings(preset = {}) {
  const settings = buildSamplerSettings(preset);
  const gemini = {};
  if (settings.top_p !== undefined) gemini.topP = settings.top_p;
  if (settings.top_k !== undefined && settings.top_k > 0) gemini.topK = settings.top_k;
  if (settings.frequency_penalty !== undefined) gemini.frequencyPenalty = settings.frequency_penalty;
  if (settings.presence_penalty !== undefined) gemini.presencePenalty = settings.presence_penalty;
  return gemini;
}

export class SseDataBuffer {
  constructor() {
    this.buffer = '';
    this.dataLines = [];
  }

  push(chunk, flush = false) {
    this.buffer += chunk;
    const events = [];
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      this.consumeLine(line, events);
      newline = this.buffer.indexOf('\n');
    }
    if (flush) {
      if (this.buffer) this.consumeLine(this.buffer.replace(/\r$/, ''), events);
      this.buffer = '';
      this.dispatch(events);
    }
    return events;
  }

  consumeLine(line, events) {
    if (line === '') {
      this.dispatch(events);
      return;
    }
    if (line.startsWith(':')) return;
    if (line === 'data') {
      this.dataLines.push('');
      return;
    }
    if (line.startsWith('data:')) {
      let value = line.slice(5);
      if (value.startsWith(' ')) value = value.slice(1);
      this.dataLines.push(value);
    }
  }

  dispatch(events) {
    if (this.dataLines.length) events.push(this.dataLines.join('\n'));
    this.dataLines = [];
  }
}

export async function* readSseResponse(response, { signal, parseEvent }) {
  if (!response.body) throw new Error('No response body received');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const buffer = new SseDataBuffer();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of buffer.push(decoder.decode(value, { stream: true }))) {
        const parsed = parseEvent(event);
        if (parsed !== null && parsed !== undefined && parsed !== '') yield parsed;
      }
      if (signal?.aborted) return;
    }
    for (const event of buffer.push(decoder.decode(), true)) {
      const parsed = parseEvent(event);
      if (parsed !== null && parsed !== undefined && parsed !== '') yield parsed;
    }
  } catch (error) {
    if (signal?.aborted) return;
    throw error;
  }
}

export function networkLogId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

export async function openAiCompatibleError(response, prefix) {
  let message = prefix + ': ' + response.status;
  try {
    const text = await response.text();
    if (!text) return message;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
      else if (parsed?.message) message = String(parsed.message);
      else message = text;
    } catch {
      message = text;
    }
  } catch {}
  return message;
}
