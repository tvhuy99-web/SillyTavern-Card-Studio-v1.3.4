export const EMBEDDING_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'gemini',
    label: 'Gemini Embedding 2 (Stable) - Online',
    shortLabel: 'Gemini Online',
    kind: 'online',
    modelId: 'gemini-embedding-2',
    indexKey: 'gemini:gemini-embedding-2:v1',
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
    id: 'embeddinggemma2',
    label: 'EmbeddingGemma 2 Text 270M INT4 - Offline Android · LiteRT',
    shortLabel: 'EmbeddingGemma 2 Text 270M',
    kind: 'local',
    modelId: 'litert-community/embeddinggemma-2-text-270m-litert-lm',
    indexKey: 'embeddinggemma2:text270m:int4:768:litertlm:v1',
    dimensions: 768,
    maxLength: 2048,
    sizeLabel: '~165 MB',
    cacheHints: [],
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

export function getEmbeddingProvider(providerId) {
  return PROVIDER_MAP.get(providerId) || PROVIDER_MAP.get('gemini');
}

function recordProviderId(record) {
  return record?.provider || 'gemini';
}

function recordIndexKey(record) {
  if (record?.indexKey) return record.indexKey;
  if (!record?.provider || record.provider === 'gemini') return PROVIDER_MAP.get('gemini').indexKey;
  return '';
}

export function recordMatchesProvider(record, provider) {
  return recordProviderId(record) === provider.id && recordIndexKey(record) === provider.indexKey;
}

export function recordId(characterId, uid, chunkIndex, provider) {
  if (provider.id === 'gemini') return `${characterId}::${uid}_${chunkIndex}`;
  return `${characterId}::${provider.id}::${uid}_${chunkIndex}`;
}
