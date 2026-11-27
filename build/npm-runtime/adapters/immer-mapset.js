export function installImmerMapSet(runtime) {
  if (typeof runtime.enableMapSet !== 'function') throw Error('Official Immer runtime missing enableMapSet');
  runtime.enableMapSet();
}
