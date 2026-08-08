import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(resolve(here, '../assets/proxy-persistence-fix-v1.3.5.js'), 'utf8');

class Storage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

function makeDocument() {
  return {
    readyState: 'loading',
    documentElement: null,
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        style: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        addEventListener() {},
        querySelector() { return null; }
      };
    }
  };
}

function boot(localSeed = {}, sessionSeed = {}) {
  const localStorage = new Storage(localSeed);
  const sessionStorage = new Storage(sessionSeed);
  const sandbox = {
    console,
    Storage,
    localStorage,
    sessionStorage,
    document: makeDocument(),
    MutationObserver: undefined,
    CustomEvent: function CustomEvent() {},
    CSS: { escape: value => value },
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

const PROFILES = 'sillyTavernStudio_proxyProfiles';

// Persistent metadata is authoritative; stale session metadata must never win.
let env = boot(
  { [PROFILES]: JSON.stringify([{ id: 'new', url: 'https://new.example' }]) },
  { [PROFILES]: JSON.stringify([{ id: 'old', url: 'https://old.example' }]) }
);
assert.deepEqual(JSON.parse(env.localStorage.getItem(PROFILES)).map(profile => profile.id), ['new']);
assert.deepEqual(JSON.parse(env.sessionStorage.getItem(PROFILES)).map(profile => profile.id), ['new']);

// Legacy secrets are stripped from physical localStorage and retained for the current session.
env = boot({
  [PROFILES]: JSON.stringify([{ id: 'p1', url: 'https://proxy.example', password: 'session-secret' }])
});
const physicalLocal = JSON.parse(env.localStorage.map.get(PROFILES));
assert.equal(physicalLocal[0].password, undefined);
assert.equal(JSON.parse(env.sessionStorage.getItem(PROFILES))[0].password, 'session-secret');
assert.equal(env.__STS_PROXY_PERSISTENCE__.getProfileStatus('p1').requiresSecret, true);

// A fresh session keeps the profile but intentionally drops a session-only secret.
const freshLocalSeed = Object.fromEntries(env.localStorage.map.entries());
env = boot(freshLocalSeed, {});
assert.equal(JSON.parse(env.localStorage.getItem(PROFILES))[0].id, 'p1');
assert.equal(JSON.parse(env.localStorage.getItem(PROFILES))[0].password, undefined);
assert.equal(env.__STS_PROXY_PERSISTENCE__.getProfileStatus('p1').requiresSecret, true);
assert.equal(env.__STS_PROXY_PERSISTENCE__.getProfileStatus('p1').hasSecret, false);

// Writes through sessionStorage are normalized into the same persistent source of truth.
env.sessionStorage.setItem(PROFILES, JSON.stringify([
  { id: 'p2', url: 'https://two.example', password: 'remember-me' }
]));
assert.equal(JSON.parse(env.localStorage.getItem(PROFILES))[0].id, 'p2');
assert.equal(JSON.parse(env.localStorage.getItem(PROFILES))[0].password, 'remember-me');
assert.equal(JSON.parse(env.localStorage.map.get(PROFILES))[0].password, undefined);

// Opt-in remembered secrets survive a brand-new session.
env.__STS_PROXY_PERSISTENCE__.setRememberSecrets(true);
const rememberedLocalSeed = Object.fromEntries(env.localStorage.map.entries());
env = boot(rememberedLocalSeed, {});
assert.equal(env.__STS_PROXY_PERSISTENCE__.isRememberingSecrets(), true);
assert.equal(JSON.parse(env.localStorage.getItem(PROFILES))[0].password, 'remember-me');

console.log('proxy persistence tests: OK');
