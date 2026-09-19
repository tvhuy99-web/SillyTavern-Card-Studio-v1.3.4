const PRODUCTION_BUNDLE_URL = new URL('./app-production-v1.3.6.js?v=1.3.6-m1.1', import.meta.url).href;
const LEGACY_FALLBACK_URL = new URL('./arena-state-bundle-loader-v1.3.6.5.js?v=1.0.1', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M1-static-prepatched-bundle',
    status,
    productionBundle: PRODUCTION_BUNDLE_URL,
    ...extra
  });
}

publish('loading-production');

try {
  await import(PRODUCTION_BUNDLE_URL);
  publish('production-active');
} catch (error) {
  const root = document.getElementById('root');
  const appHasMounted = !!(root && root.hasChildNodes());

  publish('production-error', {
    error: String(error && error.message || error || 'unknown')
  });

  if (appHasMounted) {
    console.error('[M1 boot] Production bundle failed after app mount; refusing double initialization.', error);
    throw error;
  }

  console.warn('[M1 boot] Static production bundle failed before mount; using legacy runtime-patch fallback.', error);
  publish('fallback-loading', {
    error: String(error && error.message || error || 'unknown')
  });
  await import(LEGACY_FALLBACK_URL);
  publish('fallback-active');
}
