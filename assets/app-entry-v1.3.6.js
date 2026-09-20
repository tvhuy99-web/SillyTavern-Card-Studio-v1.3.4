import { proxyPersistence as __stsProxyPersistence } from './proxy-persistence-service-v1.3.6.js?v=1.3.6-m2-final';
import { installModelConnectionTestEnhancer } from './m6/ui/model-connection-test.js?v=1.3.6-m6.2';
import { installRuntimeUxGuard } from './m5/ui/runtime-guard.js?v=1.3.6-m6.2';

const PRODUCTION_BUNDLE_URL = new URL('./app-production-v1.3.6.js?v=1.3.6-m6.2', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M6-complete',
    status,
    productionBundle: PRODUCTION_BUNDLE_URL,
    promptRecovery: 'preset-boundary',
    cardRuntime: 'modular-owned-source',
    proxyPersistence: 'owned-provider-service',
    chatDomain: 'owned-conversation-service',
    generationDomain: 'owned-provider-gateway',
    worldInfoDomain: 'owned-smart-scan-service',
    promptDomain: 'owned-prompt-service',
    responseDomain: 'owned-response-processor',
    statePersistence: 'tiered-owned-state',
    arenaState: 'owned-state-machine',
    runtimeGuard: 'service-driven',
    uiSemantics: 'source-build-owned',
    accessibility: 'semantic-controls',
    modelTestUi: 'owned-enhancer',
    ...extra
  });
}

installRuntimeUxGuard();
installModelConnectionTestEnhancer({ proxyPersistence: __stsProxyPersistence });
publish('loading-production');

try {
  await import(PRODUCTION_BUNDLE_URL);
  publish('production-active');
} catch (error) {
  publish('production-error', {
    error: String(error && error.message || error || 'unknown')
  });
  console.error('[M6 boot] Production bundle failed to initialize.', error);
  throw error;
}
