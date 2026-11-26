import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PROXY_PERSISTENCE_KEYS as K,
  createMemoryStorage,
  createProxyPersistence,
} from '../src/providers/proxy/persistence.js';

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

const sections = fs.readFileSync(new URL('../src/ui/settings/provider-sections/proxy-section.js', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('../src/app/persistence/backup-codec.js', import.meta.url), 'utf8');
assert.match(sections,/Ghi nhớ Password/);
assert.match(settings,/exportProfilesForBackup/);
assert.match(settings,/importProfilesFromBackup/);
assert.doesNotMatch(sections,/Storage.prototype.getItem =/);
console.log('proxy persistence ownership tests: OK');
