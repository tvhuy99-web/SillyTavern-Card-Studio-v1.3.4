// Canonical owner & facade for World Info Embedding Service
// (Gemini Embedding 2, EmbeddingGemma 300M Q4 - Offline, EmbeddingGemma 2 Text 270M INT4, Qwen3-Embedding 0.6B Q4 - Offline).
import { createSerialQueue } from '../../core/async/serial-queue.js';
import { getNativeEmbeddingPlugin } from './native-embedding-bridge.js';
import {
  getEmbeddingGemma2Status,
  downloadEmbeddingGemma2,
  removeEmbeddingGemma2,
} from './embeddinggemma2-litert-bridge.js';
import { createEmbeddingIndexRepository } from './embedding-index-repository.js';
import {
  EMBEDDING_PROVIDERS,
  resolveEmbeddingProvider,
  getEmbeddingProvider,
  recordMatchesProvider,
} from './embedding/embedding-provider-registry.js';
import {
  formatEmbeddingQuery,
  formatEmbeddingDocument,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
} from './embedding/embedding-text.js';
import { cosineSimilarity } from './embedding/embedding-math.js';
import { providerIsCached, deleteProviderCache } from './embedding/local-model-cache.js';
import {
  planLocalEmbeddingBatch,
  createLocalEmbeddingBatchPlanner,
  isNativeAndroidEmbeddingHost,
  configureTransformersEnvironment,
  createLocalRuntimeManager,
} from './embedding/local-model-runtime.js';
import { createWorldInfoSyncJournal } from './embedding/embedding-sync-journal.js';
import { syncEmbeddingIndexOwned } from './embedding/embedding-index-sync.js';

export {
  EMBEDDING_PROVIDERS,
  resolveEmbeddingProvider,
  getEmbeddingProvider,
  formatEmbeddingQuery,
  formatEmbeddingDocument,
  cosineSimilarity,
  hashEmbeddingText,
  buildEmbeddingEntryText,
  chunkEmbeddingText,
  planLocalEmbeddingBatch,
  createLocalEmbeddingBatchPlanner,
  isNativeAndroidEmbeddingHost,
  configureTransformersEnvironment,
  createWorldInfoSyncJournal,
};

export function createEmbeddingService(deps) {
  const indexRepository = deps.indexRepository || createEmbeddingIndexRepository();
  const runtimeManager = createLocalRuntimeManager();
  const memoryIndexes = new Map();
  const indexLoads = new Map();
  const activeSyncs = new Set();
  // All local entrypoints share the same runtime/disposal owner. The sync
  // implementation calls internal inference directly to avoid nested queues.
  const runLocal = createSerialQueue();

  const settings = () => deps.getSettings?.() || {};
  const activeProvider = () => resolveEmbeddingProvider(settings());
  const memoryKey = (characterId, provider = activeProvider()) => `${characterId}::${provider.indexKey}`;

  async function geminiEmbed(texts) {
    const apiKey = deps.getGeminiApiKey?.();
    if (!apiKey) throw new Error('Missing Gemini API Key. Please configure it in settings.');
    if (!texts.length) return [];
    const provider = getEmbeddingProvider('gemini');
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
    const runtime = await runtimeManager.ensureLocalRuntime(provider, {
      localOnly: true,
      onProgress: options.onProgress,
      onStage: options.onStage,
    });
    return runtime.embed(texts, options.onMeasurement);
  }

  async function embedQuery(text, providerId) {
    const provider = providerId === undefined ? activeProvider() : getEmbeddingProvider(providerId);
    const value = formatEmbeddingQuery(provider.id, text);
    const vectors = await (provider.kind === 'local'
      ? runLocal(() => embedTexts(provider, [value]))
      : embedTexts(provider, [value]));
    return vectors[0] || [];
  }

  async function loadIndex(characterId, providerId) {
    const provider = providerId === undefined ? activeProvider() : getEmbeddingProvider(providerId);
    const key = memoryKey(characterId, provider);
    if (!characterId || memoryIndexes.has(key)) return;
    if (indexLoads.has(key)) return indexLoads.get(key);
    const loading = indexRepository.listByCharacter(characterId)
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

  function getIndex(characterId, providerId) {
    const provider = providerId === undefined ? activeProvider() : getEmbeddingProvider(providerId);
    const map = memoryIndexes.get(memoryKey(characterId, provider));
    if (!map) return [];
    const output = [];
    for (const records of map.values()) output.push(...records);
    return output;
  }

  async function syncIndex(characterId, entries, onProgress) {
    const config = { ...settings() };
    const provider = resolveEmbeddingProvider(config);
    // One sync at a time per character/provider index; local engines also
    // share a runtime and disposal lifecycle across character indexes.
    const lock = provider.kind === 'local' ? 'local-runtime' : memoryKey(characterId, provider);
    if (activeSyncs.has(lock)) throw Error('Đồng bộ embedding đang được thực hiện.');
    activeSyncs.add(lock);
    const syncContext = {
      deps,
      indexRepository,
      memoryIndexes,
      memoryKey,
      runtimeManager,
      embedTexts,
      loadIndex,
    };
    try {
      return await (provider.kind === 'local'
        ? runLocal(() => syncEmbeddingIndexOwned(syncContext, characterId, entries, onProgress, config, provider))
        : syncEmbeddingIndexOwned(syncContext, characterId, entries, onProgress, config, provider));
    } finally {
      activeSyncs.delete(lock);
    }
  }

  async function getProviderStatus(providerId) {
    const provider = getEmbeddingProvider(providerId);
    if (provider.id === 'embeddinggemma2') {
      const status = await getEmbeddingGemma2Status();
      return { ...status, provider };
    }
    if (provider.kind === 'online') {
      const available = !!deps.getGeminiApiKey?.();
      return {
        status: available ? 'ready' : 'missing_key',
        progress: available ? 100 : 0,
        provider,
      };
    }
    if (runtimeManager.hasRuntime(provider.id)) return { status: 'ready', progress: 100, provider };
    if (runtimeManager.isLoading(provider.id)) return { status: 'loading', progress: 0, provider };
    let cached = await providerIsCached(provider);
    if (!cached && isNativeAndroidEmbeddingHost() && provider.id === 'embeddinggemma') {
      const plugin = getNativeEmbeddingPlugin();
      cached = !!(plugin && (await plugin.status()).modelReady);
    }
    return {
      status: cached ? 'cached' : 'missing',
      progress: 0,
      provider,
    };
  }

  async function prepareProvider(providerId, onProgress) {
    const provider = getEmbeddingProvider(providerId);
    return provider.kind === 'local'
      ? runLocal(() => prepareProviderOwned(provider, onProgress))
      : prepareProviderOwned(provider, onProgress);
  }

  async function prepareProviderOwned(provider, onProgress) {
    if (provider.id === 'embeddinggemma2') {
      await downloadEmbeddingGemma2(onProgress);
      return getProviderStatus(provider.id);
    }
    if (provider.kind !== 'local') return getProviderStatus(provider.id);
    await runtimeManager.ensureLocalRuntime(provider, { localOnly: false, onProgress });
    // Downloaded model weights stay in browser cache; do not retain a second
    // full ONNX model in RAM while the user prepares other providers.
    await runtimeManager.disposeUnusedLocalRuntimes();
    return getProviderStatus(provider.id);
  }

  async function deleteProvider(providerId) {
    const provider = getEmbeddingProvider(providerId);
    return provider.kind === 'local'
      ? runLocal(() => deleteProviderOwned(provider))
      : deleteProviderOwned(provider);
  }

  async function deleteProviderOwned(provider) {
    await runtimeManager.disposeProviderRuntime(provider.id);
    if (provider.id === 'embeddinggemma2') {
      await removeEmbeddingGemma2();
      return getProviderStatus(provider.id);
    }
    await deleteProviderCache(provider);
    if (isNativeAndroidEmbeddingHost() && provider.id === 'embeddinggemma') {
      const plugin = getNativeEmbeddingPlugin();
      if (plugin) await plugin.deleteModel();
    }
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
