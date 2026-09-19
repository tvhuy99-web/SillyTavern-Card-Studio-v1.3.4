const PRODUCTION_BUNDLE_URL = new URL('./app-production-v1.3.6.js?v=1.3.6-m3.1', import.meta.url).href;
const LEGACY_PROMPT_COMPAT_URL = new URL('./prompt-order-identifier-fix-v1.3.6.js?v=1.3.6.2', import.meta.url).href;
const LEGACY_CARD_DEPENDENCY_COMPAT_URL = new URL('./card-runtime-dependency-compat-v1.3.6.2.js?v=1.0.0', import.meta.url).href;
const LEGACY_FALLBACK_URL = new URL('./arena-state-bundle-loader-v1.3.6.5.js?v=1.0.1', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M3-external-card-runtime',
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
    cardRuntime: 'external-module'
  });
} catch (error) {
  const root = document.getElementById('root');
  const appHasMounted = !!(root && root.hasChildNodes());

  publish('production-error', {
    error: String(error && error.message || error || 'unknown')
  });

  if (appHasMounted) {
    console.error('[M3 boot] Production bundle failed after app mount; refusing double initialization.', error);
    throw error;
  }

  console.warn('[M3 boot] Production bundle failed before mount; enabling isolated legacy fallback.', error);
  publish('fallback-loading', {
    error: String(error && error.message || error || 'unknown')
  });

  // These monkey patches exist only to preserve the old runtime-patched bundle
  // as a last-resort fallback. They are never loaded on the normal M2/M3 path.
  await import(LEGACY_PROMPT_COMPAT_URL);
  await import(LEGACY_CARD_DEPENDENCY_COMPAT_URL);
  await import(LEGACY_FALLBACK_URL);

  publish('fallback-active', {
    legacyPromptCompatibility: true,
    legacyCardDependencyCompatibility: true
  });
}
