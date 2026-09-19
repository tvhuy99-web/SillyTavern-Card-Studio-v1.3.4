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
