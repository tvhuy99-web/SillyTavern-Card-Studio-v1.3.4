// Minimal Vite/CommonJS bridge required by the bundled JSZip module.
function n(path) {
  const error = new Error('Dynamic require of "' + path + '" is not supported in the browser bundle.');
  error.code = 'MODULE_NOT_FOUND';
  throw error;
}
function t(factory, cache) {
  return function requireModule() {
    if (!cache) {
      cache = { exports: {} };
      factory(cache.exports, cache);
    }
    return cache.exports;
  };
}
export { n, t };
