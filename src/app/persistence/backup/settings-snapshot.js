import { STORE_CONFIG } from './backup-constants.js';
import { isPlainObject, prepareBackupSettings } from '../backup-codec.js';

export function computeAddedKeys(previousRecords, incomingRecords) {
  const addedKeys = {};
  for (const [batchKey, _repoKey, keyPath] of STORE_CONFIG) {
    const existingKeys = new Set((previousRecords?.[batchKey] || []).map(record => record?.[keyPath]));
    addedKeys[batchKey] = (incomingRecords?.[batchKey] || [])
      .map(record => record?.[keyPath])
      .filter(key => typeof key === 'string' && !existingKeys.has(key));
  }
  return addedKeys;
}

export function capturePreviousSettingsSnapshot(storage, backupOptions, incomingEntries) {
  const scopedKeys = new Set();
  for (const key of backupOptions?.allowed || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const key of Object.values(backupOptions?.keys || {})) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const key of storage?.proxy?.getOwnedStorageKeys?.() || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }
  for (const [key] of incomingEntries || []) {
    if (typeof key === 'string' && key) scopedKeys.add(key);
  }

  const prefix = backupOptions?.prefix;
  if (typeof prefix === 'string' && prefix) {
    for (const store of [storage?.local, storage?.session]) {
      if (!store || typeof store.length !== 'number' || typeof store.key !== 'function') continue;
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (typeof key === 'string' && key.startsWith(prefix)) scopedKeys.add(key);
      }
    }
  }

  const localEntries = [];
  const sessionEntries = [];
  const addedSettingsKeys = [];

  for (const key of scopedKeys) {
    const prevLocal = storage?.local?.getItem?.(key) ?? null;
    const prevSession = storage?.session?.getItem?.(key) ?? null;
    localEntries.push([key, prevLocal]);
    sessionEntries.push([key, prevSession]);
    if (prevLocal === null && prevSession === null) {
      addedSettingsKeys.push(key);
    }
  }

  return {
    local: localEntries,
    session: sessionEntries,
    addedSettingsKeys,
  };
}

export function restorePreviousSettingsSnapshot(previousSettings, storage) {
  const stores = [
    [storage?.local, previousSettings?.local || []],
    [storage?.session, previousSettings?.session || []],
  ];
  for (const [target, pairs] of stores) {
    if (!target || typeof target.getItem !== 'function') continue;
    for (const [key, previousValue] of pairs) {
      const current = target.getItem(key);
      if (current === previousValue) continue;
      if (previousValue === null || previousValue === undefined) {
        target.removeItem(key);
      } else {
        target.setItem(key, previousValue);
      }
    }
  }
}

