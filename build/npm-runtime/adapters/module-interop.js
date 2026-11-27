export function commonJsFactory(factory, cache) {
  return () => { if (!cache) { cache = { exports: {} }; factory(cache.exports, cache); } return cache.exports; };
}
export function wrapModule(value, nodeMode) {
  const result = value == null ? {} : Object.create(Object.getPrototypeOf(value));
  if (nodeMode || !value?.__esModule) Object.defineProperty(result, 'default', { value, enumerable: true });
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    for (const key of Object.getOwnPropertyNames(value)) {
      if (!Object.prototype.hasOwnProperty.call(result, key)) Object.defineProperty(result, key, { get: () => value[key], enumerable: !!Object.getOwnPropertyDescriptor(value, key)?.enumerable });
    }
  }
  return result;
}
export function unsupportedRequire(name) { throw Object.assign(Error(`Dynamic require of ${name} is not supported in browser`), { code: 'MODULE_NOT_FOUND' }); }
