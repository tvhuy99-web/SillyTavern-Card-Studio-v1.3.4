const PRODUCTION_BUNDLE_URL = new URL('./app-production-v1.3.6.js?v=1.3.6-m3.3', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M3-owned-card-runtime',
    status,
    productionBundle: PRODUCTION_BUNDLE_URL,
    ...extra
  });
}

publish('loading-production');

try {
  await import(PRODUCTION_BUNDLE_URL);
  publish('production-active', {
    promptRecovery: 'preset-boundary',
    cardRuntime: 'owned-source',
    legacyGlobalMonkeyPatches: false
  });
} catch (error) {
  publish('production-error', {
    error: String(error && error.message || error || 'unknown')
  });
  console.error('[M3 boot] Production bundle failed to initialize.', error);
  throw error;
}
