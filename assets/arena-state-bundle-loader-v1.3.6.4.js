import { ARENA_STATE_PATCH_VERSION, patchArenaBundleSource } from './arena-state-bundle-transform-v1.3.6.4.js?v=1.0.0';

const ORIGINAL_BUNDLE_URL = new URL('./index-11db71a5-modeltest-v2-htmlmodes-v1.js?v=1.3.6-arena-source.1', import.meta.url).href;

function publishStatus(status, extra = {}) {
  window.__STS_ARENA_STATE_PATCH__ = Object.freeze({
    version: ARENA_STATE_PATCH_VERSION,
    status,
    sourceBundle: ORIGINAL_BUNDLE_URL,
    ...extra
  });
}

async function bootOriginal(reason) {
  console.warn('[Arena state patch] Falling back to original bundle.', reason);
  publishStatus('fallback-original', { reason: String(reason && reason.message || reason || 'unknown') });
  await import(ORIGINAL_BUNDLE_URL);
}

let transformed;
try {
  const response = await fetch(ORIGINAL_BUNDLE_URL, { cache: 'default' });
  if (!response.ok) throw new Error(`Failed to load original bundle: HTTP ${response.status}`);
  const source = await response.text();
  transformed = patchArenaBundleSource(source, ORIGINAL_BUNDLE_URL);
} catch (error) {
  await bootOriginal(error);
  transformed = null;
}

if (transformed) {
  publishStatus('patched-loading', { appliedCount: transformed.report.appliedCount });
  const blobUrl = URL.createObjectURL(new Blob([transformed.code], { type: 'text/javascript' }));
  try {
    await import(blobUrl);
    publishStatus('patched-active', { appliedCount: transformed.report.appliedCount });
  } catch (error) {
    const root = document.getElementById('root');
    const appHasMounted = !!(root && root.hasChildNodes());
    publishStatus('patched-runtime-error', {
      appliedCount: transformed.report.appliedCount,
      error: String(error && error.message || error || 'unknown')
    });
    if (!appHasMounted) {
      await bootOriginal(error);
    } else {
      console.error('[Arena state patch] Patched bundle failed after app mount; refusing double initialization.', error);
      throw error;
    }
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
