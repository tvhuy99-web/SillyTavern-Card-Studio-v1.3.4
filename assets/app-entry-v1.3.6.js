import { installRuntimeUxGuard } from './m5/ui/runtime-guard.js?v=1.3.6-m5.1';

const PRODUCTION_BUNDLE_URL = new URL('./app-production-v1.3.6.js?v=1.3.6-m5.1', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M5-complete',
    status,
    productionBundle: PRODUCTION_BUNDLE_URL,
    promptRecovery: 'preset-boundary',
    cardRuntime: 'modular-owned-source',
    proxyPersistence: 'owned-provider-service',
    chatDomain: 'owned-turn-policy',
    generationDomain: 'owned-provider-gateway',
    statePersistence: 'tiered-owned-state',
    arenaState: 'owned-state-machine',
    runtimeGuard: 'service-driven',
    ...extra
  });
}

installRuntimeUxGuard();
publish('loading-production');

try {
  await import(PRODUCTION_BUNDLE_URL);
  publish('production-active');
} catch (error) {
  publish('production-error', {
    error: String(error && error.message || error || 'unknown')
  });
  console.error('[M5 boot] Production bundle failed to initialize.', error);
  throw error;
}
