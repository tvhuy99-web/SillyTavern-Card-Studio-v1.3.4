export const TRANSFORMERS_CACHE_KEY = 'st-card-studio-embedding-models-v1';

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

export async function providerIsCached(provider) {
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

export async function deleteProviderCache(provider) {
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
