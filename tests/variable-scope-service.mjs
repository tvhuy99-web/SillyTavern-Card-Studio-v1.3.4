import assert from 'node:assert/strict';
import {
  GLOBAL_VARIABLES_STORAGE_KEY,
  normalizePromptVariableScopes,
  readGlobalVariables,
  writeGlobalVariables,
} from '../src/features/state/variable-scope-service.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

const storage = createStorage();
assert.deepEqual(readGlobalVariables(storage), {});
assert.deepEqual(writeGlobalVariables({ campaign: 'A', nested: { value: 2 } }, storage), {
  campaign: 'A',
  nested: { value: 2 },
});
assert.deepEqual(readGlobalVariables(storage), { campaign: 'A', nested: { value: 2 } });

const migrated = normalizePromptVariableScopes(
  { hp: 10, globals: { legacy: 1, campaign: 'old' } },
  { campaign: 'new', canonical: true },
);
assert.deepEqual(migrated.chat, { hp: 10 });
assert.deepEqual(migrated.global, { legacy: 1, campaign: 'new', canonical: true });
assert.deepEqual([...migrated.migratedLegacyGlobalKeys].sort(), ['campaign', 'legacy']);

const broken = createStorage({ [GLOBAL_VARIABLES_STORAGE_KEY]: '{not-json' });
assert.deepEqual(readGlobalVariables(broken), {});

console.log('Variable scope service checks: OK');
