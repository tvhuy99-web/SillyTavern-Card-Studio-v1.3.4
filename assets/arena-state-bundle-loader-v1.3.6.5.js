import { ARENA_STATE_PATCH_VERSION, patchArenaBundleSource } from './arena-state-bundle-transform-v1.3.6.4.js?v=1.0.0';
import { CORE_RELIABILITY_PATCH_VERSION, patchCoreReliabilityBundleSource } from './core-reliability-bundle-transform-v1.3.6.4.js?v=1.0.2';
import { ARENA_CANCELLATION_PATCH_VERSION, patchArenaCancellationBundleSource } from './arena-cancellation-bundle-transform-v1.3.6.5.js?v=1.0.0';

const ORIGINAL_BUNDLE_URL = new URL('./index-11db71a5-modeltest-v2-htmlmodes-v1.js?v=1.3.6-arena-source.3', import.meta.url).href;

function publishArenaStatus(status, extra = {}) {
  window.__STS_ARENA_STATE_PATCH__ = Object.freeze({
    version: ARENA_STATE_PATCH_VERSION,
    status,
    sourceBundle: ORIGINAL_BUNDLE_URL,
    ...extra
  });
}

function publishCoreStatus(status, extra = {}) {
  window.__STS_CORE_RELIABILITY_PATCH__ = Object.freeze({
    version: CORE_RELIABILITY_PATCH_VERSION,
    status,
    sourceBundle: ORIGINAL_BUNDLE_URL,
    ...extra
  });
}

function publishCancellationStatus(status, extra = {}) {
  window.__STS_ARENA_CANCELLATION_PATCH__ = Object.freeze({
    version: ARENA_CANCELLATION_PATCH_VERSION,
    status,
    sourceBundle: ORIGINAL_BUNDLE_URL,
    ...extra
  });
}

async function bootOriginal(reason) {
  console.warn('[Arena state patch] Falling back to original bundle.', reason);
  publishArenaStatus('fallback-original', { reason: String(reason && reason.message || reason || 'unknown') });
  publishCoreStatus('not-applied', { reason: 'Arena transform unavailable' });
  publishCancellationStatus('not-applied', { reason: 'Arena transform unavailable' });
  await import(ORIGINAL_BUNDLE_URL);
}

let transformed;
try {
  const response = await fetch(ORIGINAL_BUNDLE_URL, { cache: 'default' });
  if (!response.ok) throw new Error(`Failed to load original bundle: HTTP ${response.status}`);
  const source = await response.text();
  transformed = patchArenaBundleSource(source, ORIGINAL_BUNDLE_URL);
  publishArenaStatus('patched-source', { appliedCount: transformed.report.appliedCount });

  try {
    const coreTransformed = patchCoreReliabilityBundleSource(transformed.code);
    transformed = {
      code: coreTransformed.code,
      report: transformed.report,
      coreReport: coreTransformed.report
    };
    publishCoreStatus('patched-source', { appliedCount: coreTransformed.report.appliedCount });
  } catch (coreError) {
    console.error('[Core reliability patch] Transform failed; continuing with Arena-only bundle.', coreError);
    publishCoreStatus('fallback-arena-only', {
      reason: String(coreError && coreError.message || coreError || 'unknown')
    });
  }

  // Cancellation repair must run after the existing Arena/Core transforms because
  // it intentionally targets their normalized output. If it cannot be applied
  // exactly, fail closed to the original bundle rather than partially patching
  // cancellation semantics.
  const cancellationTransformed = patchArenaCancellationBundleSource(transformed.code);
  transformed = {
    ...transformed,
    code: cancellationTransformed.code,
    cancellationReport: cancellationTransformed.report
  };
  publishCancellationStatus('patched-source', { appliedCount: cancellationTransformed.report.appliedCount });
} catch (error) {
  await bootOriginal(error);
  transformed = null;
}

if (transformed) {
  publishArenaStatus('patched-loading', { appliedCount: transformed.report.appliedCount });
  if (transformed.coreReport) {
    publishCoreStatus('patched-loading', { appliedCount: transformed.coreReport.appliedCount });
  }
  if (transformed.cancellationReport) {
    publishCancellationStatus('patched-loading', { appliedCount: transformed.cancellationReport.appliedCount });
  }

  const blobUrl = URL.createObjectURL(new Blob([transformed.code], { type: 'text/javascript' }));
  try {
    await import(blobUrl);
    publishArenaStatus('patched-active', { appliedCount: transformed.report.appliedCount });
    if (transformed.coreReport) {
      publishCoreStatus('patched-active', { appliedCount: transformed.coreReport.appliedCount });
    }
    if (transformed.cancellationReport) {
      publishCancellationStatus('patched-active', { appliedCount: transformed.cancellationReport.appliedCount });
    }
  } catch (error) {
    const root = document.getElementById('root');
    const appHasMounted = !!(root && root.hasChildNodes());
    publishArenaStatus('patched-runtime-error', {
      appliedCount: transformed.report.appliedCount,
      error: String(error && error.message || error || 'unknown')
    });
    if (transformed.coreReport) {
      publishCoreStatus('patched-runtime-error', {
        appliedCount: transformed.coreReport.appliedCount,
        error: String(error && error.message || error || 'unknown')
      });
    }
    if (transformed.cancellationReport) {
      publishCancellationStatus('patched-runtime-error', {
        appliedCount: transformed.cancellationReport.appliedCount,
        error: String(error && error.message || error || 'unknown')
      });
    }
    if (!appHasMounted) {
      await bootOriginal(error);
    } else {
      console.error('[Bundle patch] Patched bundle failed after app mount; refusing double initialization.', error);
      throw error;
    }
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
