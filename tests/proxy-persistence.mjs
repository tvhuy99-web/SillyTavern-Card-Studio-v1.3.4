import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PROXY_PERSISTENCE_KEYS as K,
  createMemoryStorage,
  createProxyPersistence,
} from '../src/providers/proxy/persistence.js';
import { applyProxyPersistenceTransform } from '../build/transforms/proxy-persistence.mjs';

const local = createMemoryStorage({
  [K.profilesLegacy]: JSON.stringify([
    { id: 'p1', name: 'Primary', url: 'https://proxy.example', password: 'secret-1', legacyMode: true },
  ]),
  [K.rememberSecrets]: 'true',
  [K.proxyPasswordLegacy]: 'global-secret',
});
const session = createMemoryStorage();
const persistence = createProxyPersistence({ localStorage: local, sessionStorage: session });

assert.equal(local.getItem(K.profilesLegacy), null);
const canonical = JSON.parse(local.getItem(K.profilesCanonical));
assert.equal(canonical.length, 1);
assert.equal(Object.prototype.hasOwnProperty.call(canonical[0], 'password'), false);
assert.equal(persistence.getProfiles()[0].password, 'secret-1');
assert.equal(persistence.getPassword(), 'global-secret');

persistence.setProfiles([
  { id: 'p1', name: 'Primary', url: 'https://proxy.example', password: 'secret-2', protocol: 'openai' },
]);
persistence.setPassword('global-secret-2');

const newSession = createMemoryStorage();
const reloaded = createProxyPersistence({ localStorage: local, sessionStorage: newSession });
assert.equal(reloaded.getProfiles()[0].password, 'secret-2');
assert.equal(reloaded.getPassword(), 'global-secret-2');

reloaded.setRememberSecrets(false);
const privateReload = createProxyPersistence({
  localStorage: local,
  sessionStorage: createMemoryStorage(),
});
assert.equal(privateReload.getProfiles()[0].password, '');
assert.equal(privateReload.getPassword(), '');

privateReload.setProfiles([
  { id: 'p2', name: 'Second', url: 'https://second.example', password: 'temporary' },
]);
const exportedProfiles = privateReload.exportProfilesForBackup();
const imported = createProxyPersistence({
  localStorage: createMemoryStorage(),
  sessionStorage: createMemoryStorage(),
});
imported.importProfilesFromBackup(exportedProfiles);
assert.equal(imported.getProfiles()[0].id, 'p2');
assert.equal(imported.getProfiles()[0].password, 'temporary');

const legacyBundle = fs.readFileSync(
  new URL('../legacy/app-bundle-input-v1.3.6.js', import.meta.url),
  'utf8',
);
const transformed = applyProxyPersistenceTransform(legacyBundle);
assert.ok(transformed.includes('proxy-persistence-service-v1.3.6.js?v=1.3.6-m2-final'));
assert.ok(transformed.includes('Ghi nhớ Password / Key trên thiết bị này'));
assert.ok(!transformed.includes('sessionStorage.getItem(Mo)'));
assert.ok(!transformed.includes('sessionStorage.setItem(Mo,JSON.stringify(e))'));
assert.ok(!transformed.includes('sessionStorage.getItem(Oo)||""'));
assert.ok(!transformed.includes('sessionStorage.setItem(Oo,e.trim())'));
assert.ok(!transformed.includes('Storage.prototype.getItem ='));
assert.ok(transformed.includes('__stsProxyPersistence.exportProfilesForBackup()'));
assert.ok(transformed.includes('__stsProxyPersistence.importProfilesFromBackup(r)'));

console.log('proxy persistence ownership tests: OK');
