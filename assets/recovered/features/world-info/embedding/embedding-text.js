const QWEN_TASK = 'Given the current roleplay context, retrieve the most relevant World Info passages for the ongoing scene.';

export function formatEmbeddingQuery(providerId, text) {
  const value = String(text || '').trim();
  if (providerId === 'embeddinggemma' || providerId === 'embeddinggemma2') return `task: search result | query: ${value}`;
  if (providerId === 'qwen3') return `Instruct: ${QWEN_TASK}\nQuery:${value}`;
  return value;
}

export function formatEmbeddingDocument(providerId, text, title = 'none') {
  const value = String(text || '').trim();
  if (providerId === 'embeddinggemma' || providerId === 'embeddinggemma2') {
    const safeTitle = String(title || 'none').replace(/[\r\n|]+/g, ' ').trim() || 'none';
    return `title: ${safeTitle} | text: ${value}`;
  }
  return value;
}

export async function hashEmbeddingText(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function buildEmbeddingEntryText(entry) {
  const title = entry?.name || entry?.comment;
  return `${title ? `Name: ${title} | ` : ''}` +
    `${entry?.keys?.length ? `Keys: ${entry.keys.join(', ')} | ` : ''}` +
    `Content: ${entry?.content || ''}`;
}

export function chunkEmbeddingText(value, targetChars = 1000) {
  const limit = Math.max(100, Math.floor(targetChars) || 1000);
  let remaining = String(value || '').trim();
  if (!remaining) return [];
  const chunks = [];
  while (remaining.length > limit) {
    const minimumBreak = Math.floor(limit * 0.6);
    const window = remaining.slice(0, limit + 1);
    const newline = window.lastIndexOf('\n');
    const space = window.lastIndexOf(' ');
    const bestBreak = Math.max(newline, space);
    const cut = bestBreak >= minimumBreak ? bestBreak : limit;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
