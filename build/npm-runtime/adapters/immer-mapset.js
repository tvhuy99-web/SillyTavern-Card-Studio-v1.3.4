// Same application-facing initializer, using the public API of the ONE bundled Immer instance.
export function installImmerMapSet(runtime) {
  if (typeof runtime.enableMapSet !== 'function') throw Error('Official Immer runtime missing enableMapSet');
  runtime.enableMapSet();
}
