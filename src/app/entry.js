import { installAndroidExportInterceptor } from '../diagnostics/android-export-download.js';
import { installRuntimeUxGuard } from '../ui/runtime-guard.js';

installAndroidExportInterceptor();

const PRODUCTION_BUNDLE_URL = new URL('./host.js', import.meta.url).href;

function publish(status, extra = {}) {
  window.__STS_BUILD_PIPELINE__ = Object.freeze({
    stage: 'M7-complete',
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
    modelTestUi: 'react-owned',
    geminiModelList: 'owned-provider-catalog',
    assetPolicy: 'generated-vendor-static-only',
    hostSource: 'source-owned-recovered-host',
    historicalTransformsExecuted: 0,
    runtimePatchScripts: 'none',
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
  console.error('[M7 boot] Production bundle failed to initialize.', error);
  throw error;
}
