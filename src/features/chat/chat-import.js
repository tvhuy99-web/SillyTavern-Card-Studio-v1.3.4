export function parseImportedChat(text, { now = Date.now, clone = structuredClone, maxMessages = 20000 } = {}) {
  let rows;
  try {
    const value = JSON.parse(text);
    rows = Array.isArray(value) ? value : Array.isArray(value?.chat) ? value.chat : [];
  } catch {
    rows = text.split(/\r?\n/).filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    if (rows[0] && typeof rows[0] === 'object' && !('mes' in rows[0]) && !('content' in rows[0])) rows.shift();
  }
  const stamp = now();
  return rows.slice(0, maxMessages).filter(row => row && typeof row === 'object' && !Array.isArray(row)).map((row, index) => ({
    id: String(row.id || `imported-${stamp}-${index}`),
    role: row.role === 'assistant' || row.role === 'model' || row.is_user === false ? 'model' : row.role === 'system' ? 'system' : 'user',
    content: String(row.content ?? row.mes ?? ''),
    timestamp: Number(row.timestamp || Date.parse(row.send_date) || stamp),
    ...(row.name === undefined ? {} : { name: String(row.name) }),
    ...(row.is_hidden === undefined ? row.is_system === undefined ? {} : { is_hidden: !!row.is_system } : { is_hidden: !!row.is_hidden }),
    contextState: clone(row.data || row.variables || {}),
    extra: { ...(row.extra && typeof row.extra === 'object' && !Array.isArray(row.extra) ? clone(row.extra) : {}), __sillyTavernRaw: clone(row) },
    ...(Array.isArray(row.swipes) ? { swipes: row.swipes.map(String) } : {}),
    ...(Array.isArray(row.swipe_data) ? { swipes_data: clone(row.swipe_data) } : Array.isArray(row.swipes_data) ? { swipes_data: clone(row.swipes_data) } : {}),
    ...(Array.isArray(row.swipes_info) ? { swipes_info: clone(row.swipes_info) } : {}),
    ...(row.swipe_id === undefined ? {} : { swipe_id: Math.max(0, Math.trunc(Number(row.swipe_id) || 0)) }),
    ...Object.fromEntries(['reasoning', 'tool_calls', 'attachments'].filter(key => row[key] !== undefined).map(key => [key, clone(row[key])])),
  }));
}
