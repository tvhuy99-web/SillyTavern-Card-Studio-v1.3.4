// Network discovery and installed cache format are owned here, not UI handlers.
const KEYS = Object.freeze({ gemini: 'sillyTavernStudio_geminiModels', openrouter: 'sillyTavernStudio_openrouterModels' });
const record = value => value && typeof value === 'object' && !Array.isArray(value);
function unique(items, transform) {
  const result = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const value = transform(item);
    if (value?.id && !result.has(value.id)) result.set(value.id, value);
  }
  return [...result.values()];
}
function basic(item) {
  if (!record(item) || typeof item.id !== 'string' || !item.id.trim()) return null;
  return { id: item.id.trim(), name: String(item.name || item.id).trim() || item.id };
}
function openRouter(item) {
  const value = basic(item);
  return value && { ...item, ...value, pricing: { prompt: '', completion: '', ...(record(item.pricing) ? item.pricing : {}) } };
}
export function normalizeGeminiModels(items) {
  return unique(items, item => {
    if (!item?.supportedGenerationMethods?.includes?.('generateContent') || !Array.isArray(item.supportedGenerationMethods)) return null;
    return basic({ id: String(item.name || item.baseModelId || '').replace(/^models\//, ''), name: item.displayName });
  }).sort((a,b) => a.name.localeCompare(b.name,'vi',{numeric:true,sensitivity:'base'}) || a.id.localeCompare(b.id));
}
const proxyModels = items => unique(items, item => basic({id:item?.id, name:item?.id})).sort((a,b)=>a.id.localeCompare(b.id));
export function createModelCatalog({ storage, request, geminiRequest = request, normalizeProxyUrl, getGeminiKey }) {
  const subscribers = new Set();
  const read = (key, fallback) => { try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const write = (key,value) => storage.setItem(key,JSON.stringify(value));
  const readGemini = () => unique(read(KEYS.gemini,[]),basic);
  const readOpenRouter = () => unique(read(KEYS.openrouter,[]),openRouter);
  // Authenticated catalogs are deliberately process-local: never write a raw
  // credential or a reusable credential fingerprint into Web Storage.
  const targetCache = new Map();
  const pendingRefreshes = new Map();
  const targetKey = target => JSON.stringify([normalizeProxyUrl(String(target.url || '')), target.protocol || 'openai', !!target.legacyMode, String(target.id || ''), String(target.password || '')]);
  function readProxyTarget(target) {
    const entry = target?.url && targetCache.get(targetKey(target));
    return entry ? unique([...entry.discovered, ...entry.manual], basic) : [];
  }
  function updateProxyCache(key, patch) {
    const previous = targetCache.get(key) || {discovered: [], manual: []};
    targetCache.delete(key); targetCache.set(key, {...previous, ...patch});
    while (targetCache.size > 64) targetCache.delete(targetCache.keys().next().value);
  }
  // Only manually configured IDs survive a network catalog replacement.
  function mergeProxyTarget(target, items) {
    if (!target?.url) return;
    const key = targetKey(target), previous = targetCache.get(key);
    updateProxyCache(key, {manual: unique([...(previous?.manual || []), ...(Array.isArray(items) ? items : [])], basic)});
  }
  function clearProxyTarget(target) {
    if (!target?.url) return;
    const key = targetKey(target);
    targetCache.delete(key);
    pendingRefreshes.delete(key);
  }
  async function refreshProxyTarget(target, { isCurrent = () => true } = {}) {
    if (!target?.url?.trim()) throw Error('Chưa cấu hình Proxy URL.');
    const key = targetKey(target), ticket = {};
    pendingRefreshes.set(key, ticket);
    try {
      const models = await loadProxy(target);
      if (pendingRefreshes.get(key) !== ticket || target.signal?.aborted || !isCurrent()) return null;
      updateProxyCache(key, {discovered: unique(models, basic)});
      return models;
    } finally {
      if (pendingRefreshes.get(key) === ticket) pendingRefreshes.delete(key);
    }
  }
  async function fetchPages(base, key, fetcher, signal) {
    const items=[]; const seen=new Set(); let token='';
    for(let page=0;page<10;page++) {
      const url=new URL(base); url.searchParams.set('pageSize','1000'); if(token) url.searchParams.set('pageToken',token);
      const response=await fetcher(url.toString(),{method:'GET',headers:{Accept:'application/json',...(key?{'x-goog-api-key':key}:{})},signal});
      if (!response.ok) throw new Error(`Không thể tải danh sách model (HTTP ${response.status}).`);
      const payload=await response.json();
      if (!Array.isArray(payload?.models)) throw new Error('Danh sách model không hợp lệ.');
      items.push(...payload.models); token=typeof payload.nextPageToken==='string'?payload.nextPageToken:'';
      if (!token) return normalizeGeminiModels(items);
      if(seen.has(token)) throw new Error('Model catalog pagination repeated.'); seen.add(token);
    }
    throw new Error('Model catalog exceeded pagination limit.');
  }
  function proxyEndpoint({url,password='',legacyMode=false,protocol='openai',signal}) {
    if (!String(url || '').trim()) throw new Error('Chưa cấu hình Proxy URL.');
    const base=normalizeProxyUrl(url);
    if(protocol==='google_native') return {url:`${base.replace(/\/v1beta(?:\/models)?$/,'')}/v1beta/models`,headers:{Accept:'application/json',...(password?{'x-goog-api-key':password}:{})},signal};
    if(protocol!=='openai') throw new Error(`Giao thức Proxy không được hỗ trợ: ${protocol}`);
    return {url:`${base}/v1/models`,headers:legacyMode?{}:{'Content-Type':'application/json',...(password?{Authorization:`Bearer ${password}`}:{})},signal};
  }
  async function loadProxy(target) {
      const endpoint=proxyEndpoint(target);
      if(target.protocol==='google_native') return fetchPages(endpoint.url,target.password,request,target.signal);
      const response=await request(endpoint.url,{method:'GET',headers:endpoint.headers,signal:endpoint.signal});
      if(response.status===404) return [];
      if(!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
      const payload=await response.json(); const list=Array.isArray(payload)?payload:payload?.data;
      if(!Array.isArray(list)) throw new Error('Proxy model catalog is invalid.');
      return proxyModels(list);
  }
  // A later refresh wins; an earlier response cannot replace the newer cache.
  let geminiRevision=0;
  return Object.freeze({
    readGemini, readOpenRouter, readProxyTarget, mergeProxyTarget, clearProxyTarget,
    subscribeGemini(listener) { subscribers.add(listener); return ()=>subscribers.delete(listener); },
    async loadGemini(explicitKey, signal) {
      const revision=++geminiRevision;
      const key=getGeminiKey(explicitKey);
      if (!key) throw new Error('Không tìm thấy API Key Gemini. Hãy cấu hình API key cá nhân.');
      const models=await fetchPages('https://generativelanguage.googleapis.com/v1beta/models',key,geminiRequest,signal);
      if (!models.length) throw new Error('Google Gemini không trả về model hỗ trợ generateContent.');
      if (signal?.aborted) throw new DOMException('Aborted','AbortError');
      if(revision===geminiRevision) { write(KEYS.gemini,models); for(const listener of subscribers) { try { listener(models); } catch {} } }
      return models;
    },
    async loadOpenRouter(signal) {
      const response=await request('https://openrouter.ai/api/v1/models',{method:'GET',signal});
      if(!response.ok) throw new Error(`OpenRouter Models Error: HTTP ${response.status}`);
      const payload=await response.json(); if(!Array.isArray(payload?.data)) throw new Error('OpenRouter model catalog is invalid.');
      return unique(payload.data,openRouter);
    },
    saveOpenRouter(items) { write(KEYS.openrouter,unique(items,openRouter)); },
    loadProxy, refreshProxyTarget,
    async probeProxy(target) {
      const endpoint=proxyEndpoint(target);
      const response=await request(endpoint.url,{method:'GET',headers:endpoint.headers,signal:endpoint.signal});
      if(!response.ok || response.type==='opaque') throw new Error(`Không xác minh được endpoint danh sách model (HTTP ${response.status || 'không xác định'}).`);
      return true;
    },
  });
}

/** Resolve explicit profile without falling back to global credentials. */
export function resolveCatalogTarget({ profileId, profiles, global }) {
  if (!profileId) return { ...global, id: '' };
  const profile = profiles.find(item => item.id === profileId);
  if (!profile) throw Error('Cấu hình Proxy đã chọn không còn tồn tại.');
  return { id: profile.id, url: profile.url, password: profile.password, legacyMode: profile.legacyMode, protocol: profile.protocol };
}
/** Publish only while the dialog still owns this connection. */
export async function refreshDialogProxyCatalog({ catalog, target, signal, isCurrent, publish }) {
  if (!target.url?.trim()) throw Error('Chưa cấu hình Proxy URL.');
  const current = () => !signal?.aborted && isCurrent();
  if (!current()) return;
  publish(catalog.readProxyTarget(target));
  const models = await catalog.refreshProxyTarget({ ...target, signal }, {isCurrent: current});
  if (models === null || !current()) return;
  publish(catalog.readProxyTarget(target));
}
