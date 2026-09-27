const DB_NAME = 'LorebookEmbeddingsDB';
const DB_VERSION = 2;
const STORE_NAME = 'embeddings';
const TRANSFORMERS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';
const TRANSFORMERS_CACHE_KEY = 'st-card-studio-embedding-models-v1';
const QWEN_TASK = 'Given the current roleplay context, retrieve the most relevant World Info passages for the ongoing scene.';

export const EMBEDDING_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'gemini',
    label: 'Gemini Embedding 2 - Online',
    shortLabel: 'Gemini Online',
    kind: 'online',
    modelId: 'gemini-embedding-2-preview',
    indexKey: 'gemini:gemini-embedding-2-preview:v1',
    dimensions: null,
    sizeLabel: 'Online',
  }),
  Object.freeze({
    id: 'embeddinggemma',
    label: 'EmbeddingGemma 300M Q4 - Offline · Nhẹ',
    shortLabel: 'EmbeddingGemma 300M',
    kind: 'local',
    modelId: 'huggingworld/embeddinggemma-300m-ONNX',
    indexKey: 'embeddinggemma:300m:q4:768:v1',
    dtype: 'q4',
    dimensions: 768,
    maxLength: 2048,
    pooling: 'mean',
    sizeLabel: '~220 MB',
    cacheHints: ['onnx/model_q4.onnx', 'onnx/model_q4.onnx_data'],
  }),
  Object.freeze({
    id: 'qwen3',
    label: 'Qwen3-Embedding 0.6B Q4 - Offline · Chất lượng cao',
    shortLabel: 'Qwen3 0.6B',
    kind: 'local',
    modelId: 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
    indexKey: 'qwen3:0.6b:q4:1024:v1',
    dtype: 'q4',
    dimensions: 1024,
    maxLength: 8192,
    pooling: 'last_token',
    sizeLabel: '~0.9 GB',
    cacheHints: ['onnx/model_q4.onnx'],
  }),
]);

const PROVIDER_MAP = new Map(EMBEDDING_PROVIDERS.map(provider => [provider.id, provider]));

export function resolveEmbeddingProvider(settings) {
  return PROVIDER_MAP.get(settings?.embedding_provider) || PROVIDER_MAP.get('gemini');
}

export function getEmbeddingProvider(id) {
  return PROVIDER_MAP.get(id) || PROVIDER_MAP.get('gemini');
}

export function formatEmbeddingQuery(providerId, text) {
  const value = String(text || '').trim();
  if (providerId === 'embeddinggemma') return `task: search result | query: ${value}`;
  if (providerId === 'qwen3') return `Instruct: ${QWEN_TASK}\nQuery:${value}`;
  return value;
}

export function formatEmbeddingDocument(providerId, text, title = 'none') {
  const value = String(text || '').trim();
  if (providerId === 'embeddinggemma') {
    const safeTitle = String(title || 'none').replace(/[\r\n|]+/g, ' ').trim() || 'none';
    return `title: ${safeTitle} | text: ${value}`;
  }
  return value;
}

export function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return leftNorm === 0 || rightNorm === 0
    ? 0
    : dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
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

function normalizeTensorRows(tensor) {
  if (!tensor) return [];
  if (typeof tensor.tolist === 'function') {
    const rows = tensor.tolist();
    if (!Array.isArray(rows)) return [];
    if (rows.length > 0 && typeof rows[0] === 'number') return [rows];
    return rows;
  }
  const data = tensor.data;
  const dims = tensor.dims;
  if (!data || !Array.isArray(dims) || dims.length !== 2) return [];
  const [rows, columns] = dims;
  const output = [];
  for (let row = 0; row < rows; row += 1) {
    output.push(Array.from(data.slice(row * columns, (row + 1) * columns)));
  }
  return output;
}

function normalizeRows(rows) {
  return rows.map(row => {
    const vector = Array.from(row || [], Number);
    let sum = 0;
    for (const value of vector) sum += value * value;
    const norm = Math.sqrt(sum);
    return norm > 0 ? vector.map(value => value / norm) : vector;
  });
}

function preferredDevice() {
  return typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm';
}

async function openEmbeddingDb() {
  if (typeof indexedDB === 'undefined') throw new Error('Trình duyệt không hỗ trợ IndexedDB.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = event => reject(event?.target?.error || new Error('Failed to open IndexedDB'));
    request.onsuccess = event => resolve(event.target.result);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (event.oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('characterId', 'characterId', { unique: false });
        store.createIndex('uid', 'uid', { unique: false });
      }
    };
  });
}

async function putRecord(record) {
  const db = await openEmbeddingDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = event => reject(event?.target?.error || new Error('Failed to store embedding'));
  });
}

async function getRecordsByCharacter(characterId) {
  const db = await openEmbeddingDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction([STORE_NAME], 'readonly')
      .objectStore(STORE_NAME)
      .index('characterId')
      .getAll(characterId);
    request.onsuccess = event => resolve(event.target.result || []);
    request.onerror = event => reject(event?.target?.error || new Error('Failed to read embeddings'));
  });
}

async function getRecordsByUid(uid) {
  const db = await openEmbeddingDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction([STORE_NAME], 'readonly')
      .objectStore(STORE_NAME)
      .index('uid')
      .getAll(uid);
    request.onsuccess = event => resolve(event.target.result || []);
    request.onerror = event => reject(event?.target?.error || new Error('Failed to read embedding UID'));
  });
}

async function deleteRecords(records) {
  if (!records.length) return;
  const db = await openEmbeddingDb();
  await new Promise((resolve, reject) => {
    const store = db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME);
    let completed = 0;
    for (const record of records) {
      const request = store.delete(record.id);
      request.onsuccess = () => {
        completed += 1;
        if (completed === records.length) resolve();
      };
      request.onerror = event => reject(event?.target?.error || new Error('Failed to delete embedding'));
    }
  });
}

function recordProviderId(record) {
  return record?.provider || 'gemini';
}

function recordIndexKey(record) {
  if (record?.indexKey) return record.indexKey;
  if (!record?.provider || record.provider === 'gemini') return PROVIDER_MAP.get('gemini').indexKey;
  return '';
}

function recordMatchesProvider(record, provider) {
  return recordProviderId(record) === provider.id && recordIndexKey(record) === provider.indexKey;
}

async function deleteUidForProvider(uid, characterId, provider) {
  const records = await getRecordsByUid(uid);
  await deleteRecords(records.filter(record =>
    record.characterId === characterId && recordMatchesProvider(record, provider)));
}

function recordId(characterId, uid, chunkIndex, provider) {
  if (provider.id === 'gemini') return `${characterId}::${uid}_${chunkIndex}`;
  return `${characterId}::${provider.id}::${uid}_${chunkIndex}`;
}

async function getTransformersModule() {
  const module = await import(TRANSFORMERS_MODULE_URL);
  if (module?.env) {
    module.env.useBrowserCache = true;
    module.env.useWasmCache = true;
    module.env.cacheKey = TRANSFORMERS_CACHE_KEY;
  }
  return module;
}

function progressAdapter(callback) {
  if (typeof callback !== 'function') return undefined;
  return info => {
    if (info?.status === 'progress_total') {
      callback({ status: 'loading', progress: Number(info.progress) || 0, loaded: info.loaded, total: info.total });
    } else if (info?.status === 'progress') {
      callback({ status: 'loading', progress: Number(info.progress) || 0, loaded: info.loaded, total: info.total, file: info.file });
    } else if (info?.status === 'ready') {
      callback({ status: 'ready', progress: 100 });
    }
  };
}

async function cacheKeys() {
  if (typeof caches === 'undefined') return [];
  const names = await caches.keys();
  const preferred = names.includes(TRANSFORMERS_CACHE_KEY)
    ? [TRANSFORMERS_CACHE_KEY]
    : names.filter(name => /transformers/i.test(name));
  const requests = [];
  for (const name of preferred) {
    const cache = await caches.open(name);
    requests.push(...await cache.keys());
  }
  return requests.map(request => request.url);
}

async function providerIsCached(provider) {
  if (provider.kind !== 'local') return true;
  try {
    const urls = await cacheKeys();
    const modelNeedle = provider.modelId.toLowerCase();
    const related = urls.filter(url => url.toLowerCase().includes(modelNeedle));
    if (related.length === 0) return false;
    return provider.cacheHints.every(hint => related.some(url => url.toLowerCase().includes(hint.toLowerCase())));
  } catch {
    return false;
  }
}

async function deleteProviderCache(provider) {
  if (typeof caches === 'undefined' || provider.kind !== 'local') return;
  const names = await caches.keys();
  for (const name of names) {
    if (name !== TRANSFORMERS_CACHE_KEY && !/transformers/i.test(name)) continue;
    const cache = await caches.open(name);
    const requests = await cache.keys();
    await Promise.all(requests
      .filter(request => request.url.toLowerCase().includes(provider.modelId.toLowerCase()))
      .map(request => cache.delete(request)));
  }
}

export function createEmbeddingService(deps) {
  const modelRuntimes = new Map();
  const modelLoads = new Map();
  const memoryIndexes = new Map();
  const indexLoads = new Map();

  const settings = () => deps.getSettings?.() || {};
  const activeProvider = () => resolveEmbeddingProvider(settings());
  const memoryKey = (characterId, provider = activeProvider()) => `${characterId}::${provider.indexKey}`;

  async function createLocalRuntime(provider, onProgress, localOnly = false) {
    if (provider.kind !== 'local') throw new Error('Provider này không phải mô hình cục bộ.');
    const transformers = await getTransformersModule();
    const callback = progressAdapter(onProgress);
    const common = {
      dtype: provider.dtype,
      device: preferredDevice(),
      progress_callback: callback,
      local_files_only: localOnly,
    };

    try {
      if (provider.id === 'embeddinggemma') {
        const tokenizer = await transformers.AutoTokenizer.from_pretrained(provider.modelId, {
          progress_callback: callback,
          local_files_only: localOnly,
        });
        const model = await transformers.AutoModel.from_pretrained(provider.modelId, common);
        return {
          provider,
          async embed(texts) {
            const inputs = await tokenizer(texts, {
              padding: true,
              truncation: true,
              max_length: provider.maxLength,
            });
            const output = await model(inputs);
            const tensor = output.sentence_embedding || output.pooler_output;
            if (!tensor) throw new Error('EmbeddingGemma không trả về sentence_embedding.');
            return normalizeRows(normalizeTensorRows(tensor));
          },
          async dispose() {
            try { await model.dispose?.(); } catch {}
          },
        };
      }

      const extractor = await transformers.pipeline('feature-extraction', provider.modelId, common);
      return {
        provider,
        async embed(texts) {
          const tensor = await extractor(texts, {
            pooling: provider.pooling,
            normalize: true,
            truncation: true,
            max_length: provider.maxLength,
          });
          return normalizeRows(normalizeTensorRows(tensor));
        },
        async dispose() {
          try { await extractor.dispose?.(); } catch {}
        },
      };
    } catch (error) {
      if (common.device !== 'webgpu') throw error;
      const fallback = { ...common, device: 'wasm' };
      if (provider.id === 'embeddinggemma') {
        const tokenizer = await transformers.AutoTokenizer.from_pretrained(provider.modelId, {
          progress_callback: callback,
          local_files_only: localOnly,
        });
        const model = await transformers.AutoModel.from_pretrained(provider.modelId, fallback);
        return {
          provider,
          async embed(texts) {
            const inputs = await tokenizer(texts, {
              padding: true,
              truncation: true,
              max_length: provider.maxLength,
            });
            const output = await model(inputs);
            const tensor = output.sentence_embedding || output.pooler_output;
            if (!tensor) throw new Error('EmbeddingGemma không trả về sentence_embedding.');
            return normalizeRows(normalizeTensorRows(tensor));
          },
          async dispose() {
            try { await model.dispose?.(); } catch {}
          },
        };
      }
      const extractor = await transformers.pipeline('feature-extraction', provider.modelId, fallback);
      return {
        provider,
        async embed(texts) {
          const tensor = await extractor(texts, {
            pooling: provider.pooling,
            normalize: true,
            truncation: true,
            max_length: provider.maxLength,
          });
          return normalizeRows(normalizeTensorRows(tensor));
        },
        async dispose() {
          try { await extractor.dispose?.(); } catch {}
        },
      };
    }
  }

  async function ensureLocalRuntime(provider, options = {}) {
    if (modelRuntimes.has(provider.id)) return modelRuntimes.get(provider.id);
    if (modelLoads.has(provider.id)) return modelLoads.get(provider.id);
    if (options.localOnly && !(await providerIsCached(provider))) {
      throw new Error(`Mô hình ${provider.shortLabel} chưa được tải. Hãy tải mô hình trong Cài đặt Smart Scan trước.`);
    }
    const loading = createLocalRuntime(provider, options.onProgress, !!options.localOnly)
      .then(runtime => {
        modelRuntimes.set(provider.id, runtime);
        modelLoads.delete(provider.id);
        return runtime;
      })
      .catch(error => {
        modelLoads.delete(provider.id);
        throw error;
      });
    modelLoads.set(provider.id, loading);
    return loading;
  }

  async function geminiEmbed(texts) {
    const apiKey = deps.getGeminiApiKey?.();
    if (!apiKey) throw new Error('Missing Gemini API Key. Please configure it in settings.');
    if (!texts.length) return [];
    const provider = PROVIDER_MAP.get('gemini');
    const client = deps.createGeminiClient(apiKey);
    const vectors = [];
    for (let offset = 0; offset < texts.length; offset += 100) {
      const batch = texts.slice(offset, offset + 100);
      deps.addNetworkLog?.({
        id: `embedding-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        url: `https://generativelanguage.googleapis.com/v1beta/models/${provider.modelId}:embedContent`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { model: provider.modelId, contents: batch, _meta: { batchSize: batch.length } },
        source: 'gemini',
      });
      const response = await client.models.embedContent({
        model: provider.modelId,
        contents: batch.map(text => ({ role: 'user', parts: [{ text }] })),
      });
      if (!response?.embeddings?.length) throw new Error('API trả về mảng embedding rỗng hoặc không hợp lệ.');
      vectors.push(...response.embeddings.map(item => item.values || []));
      if (offset + 100 < texts.length) await new Promise(resolve => setTimeout(resolve, 300));
    }
    return vectors;
  }

  async function embedTexts(provider, texts, options = {}) {
    if (provider.id === 'gemini') return geminiEmbed(texts);
    const runtime = await ensureLocalRuntime(provider, { localOnly: true, onProgress: options.onProgress });
    return runtime.embed(texts);
  }

  async function embedQuery(text) {
    const provider = activeProvider();
    const value = formatEmbeddingQuery(provider.id, text);
    const vectors = await embedTexts(provider, [value]);
    return vectors[0] || [];
  }

  async function loadIndex(characterId) {
    const provider = activeProvider();
    const key = memoryKey(characterId, provider);
    if (!characterId || memoryIndexes.has(key)) return;
    if (indexLoads.has(key)) return indexLoads.get(key);
    const loading = getRecordsByCharacter(characterId)
      .then(records => {
        const map = new Map();
        for (const record of records) {
          if (!recordMatchesProvider(record, provider)) continue;
          if (!map.has(record.uid)) map.set(record.uid, []);
          map.get(record.uid).push(record);
        }
        for (const recordsForUid of map.values()) {
          recordsForUid.sort((left, right) => String(left.id).localeCompare(String(right.id)));
        }
        memoryIndexes.set(key, map);
        indexLoads.delete(key);
      })
      .catch(error => {
        indexLoads.delete(key);
        throw error;
      });
    indexLoads.set(key, loading);
    return loading;
  }

  function getIndex(characterId) {
    const map = memoryIndexes.get(memoryKey(characterId));
    if (!map) return [];
    const output = [];
    for (const records of map.values()) output.push(...records);
    return output;
  }

  async function syncIndex(characterId, entries, onProgress) {
    const config = settings();
    if (!config.enabled || !['semantic', 'hybrid_fast', 'ultimate'].includes(config.mode)) {
      throw new Error('Smart Scan hoặc Semantic Search đang tắt.');
    }
    if (!characterId) throw new Error('Character ID is required for sync.');
    const provider = activeProvider();
    if (provider.kind === 'local') await ensureLocalRuntime(provider, { localOnly: true });

    await loadIndex(characterId);
    const key = memoryKey(characterId, provider);
    const index = memoryIndexes.get(key) || new Map();
    memoryIndexes.set(key, index);
    const searchable = (entries || []).filter(entry => entry?.uid && entry?.content?.trim());
    const pending = [];

    await Promise.all(searchable.map(async entry => {
      const text = buildEmbeddingEntryText(entry);
      const contentHash = await hashEmbeddingText(text);
      const existing = index.get(entry.uid);
      if (!existing?.length || existing[0].contentHash !== contentHash) {
        pending.push({
          entry,
          chunks: chunkEmbeddingText(text, 1000),
          hash: contentHash,
        });
      }
    }));

    let complete = searchable.length - pending.length;
    onProgress?.(complete, searchable.length);
    const requestedBatchSize = config.embedding_batch_size || 30;
    const batchSize = provider.id === 'qwen3'
      ? Math.min(requestedBatchSize, 4)
      : provider.id === 'embeddinggemma'
        ? Math.min(requestedBatchSize, 8)
        : requestedBatchSize;

    for (let offset = 0; offset < pending.length; offset += batchSize) {
      const group = pending.slice(offset, offset + batchSize);
      const flattened = [];
      for (const item of group) {
        item.chunks.forEach((chunk, chunkIndex) => {
          flattened.push({
            entry: item.entry,
            chunk,
            chunkIndex,
            hash: item.hash,
            text: formatEmbeddingDocument(provider.id, chunk, item.entry.name || item.entry.comment || 'none'),
          });
        });
      }

      const vectors = await embedTexts(provider, flattened.map(item => item.text));
      const byUid = new Map();
      flattened.forEach((item, vectorIndex) => {
        if (!byUid.has(item.entry.uid)) byUid.set(item.entry.uid, []);
        byUid.get(item.entry.uid).push(vectors[vectorIndex]);
      });

      for (const item of group) {
        const uid = item.entry.uid;
        const vectorsForUid = byUid.get(uid);
        if (!vectorsForUid || vectorsForUid.length !== item.chunks.length || vectorsForUid.some(vector => !vector?.length)) {
          throw new Error(`Dữ liệu trả về bị thiếu cho mục: ${item.entry.comment || uid}`);
        }
        await deleteUidForProvider(uid, characterId, provider);
        index.set(uid, []);
        for (let chunkIndex = 0; chunkIndex < item.chunks.length; chunkIndex += 1) {
          const record = {
            id: recordId(characterId, uid, chunkIndex, provider),
            uid,
            characterId,
            provider: provider.id,
            indexKey: provider.indexKey,
            contentHash: item.hash,
            vector: vectorsForUid[chunkIndex],
            updatedAt: Date.now(),
          };
          await putRecord(record);
          index.get(uid).push(record);
        }
      }

      complete += group.length;
      onProgress?.(Math.min(complete, searchable.length), searchable.length);
      if (offset + batchSize < pending.length && provider.id === 'gemini') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const validUids = new Set(searchable.map(entry => entry.uid));
    for (const [uid] of Array.from(index.entries())) {
      if (validUids.has(uid)) continue;
      await deleteUidForProvider(uid, characterId, provider);
      index.delete(uid);
    }
  }

  async function getProviderStatus(providerId) {
    const provider = getEmbeddingProvider(providerId);
    if (provider.kind === 'online') {
      const available = !!deps.getGeminiApiKey?.();
      return {
        status: available ? 'ready' : 'missing_key',
        progress: available ? 100 : 0,
        provider,
      };
    }
    if (modelRuntimes.has(provider.id)) return { status: 'ready', progress: 100, provider };
    if (modelLoads.has(provider.id)) return { status: 'loading', progress: 0, provider };
    return {
      status: (await providerIsCached(provider)) ? 'cached' : 'missing',
      progress: 0,
      provider,
    };
  }

  async function prepareProvider(providerId, onProgress) {
    const provider = getEmbeddingProvider(providerId);
    if (provider.kind !== 'local') return getProviderStatus(provider.id);
    await ensureLocalRuntime(provider, { localOnly: false, onProgress });
    return getProviderStatus(provider.id);
  }

  async function deleteProvider(providerId) {
    const provider = getEmbeddingProvider(providerId);
    const runtime = modelRuntimes.get(provider.id);
    modelRuntimes.delete(provider.id);
    modelLoads.delete(provider.id);
    try { await runtime?.dispose?.(); } catch {}
    await deleteProviderCache(provider);
    return getProviderStatus(provider.id);
  }

  function listProviders() {
    return EMBEDDING_PROVIDERS.map(provider => ({ ...provider }));
  }

  return Object.freeze({
    listProviders,
    getProviderInfo: getEmbeddingProvider,
    getProviderStatus,
    prepareProvider,
    deleteProvider,
    embedQuery,
    loadIndex,
    getIndex,
    syncIndex,
    cosine: cosineSimilarity,
    hashText: hashEmbeddingText,
    entryText: buildEmbeddingEntryText,
    chunkText: chunkEmbeddingText,
  });
}
