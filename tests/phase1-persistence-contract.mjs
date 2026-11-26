import { readRecoveredHostView } from './helpers/recovered-host-view.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_DATABASE, createAppDatabase } from '../src/app/persistence/app-database.js';
import { createEntityRepositories, prepareCharacterRecord } from '../src/app/persistence/entity-repositories.js';
import { normalizePresetConfig, normalizePresetList } from '../src/features/presets/prompt-normalizer.js';

assert.deepEqual(APP_DATABASE, { name: 'SillyTavernCardStudioDB', version: 6, stores: { lorebooks: 'name', characters: 'fileName', presets: 'name', chatSessions: 'sessionId', userPersonas: 'id' } });
// Test the driver independently from repositories. Events are explicitly controlled;
// this is a transaction protocol simulation, not a real browser storage engine.
let openCount = 0, tx, request;
const created = [];
const db = {
  objectStoreNames: { contains: name => name === 'characters' },
  createObjectStore: (name, config) => created.push([name, config.keyPath]),
  close() {},
  transaction(stores, mode) {
    tx = { stores, mode, abort() { this.onabort(); }, objectStore() { return { get() { return request = {}; } }; } };
    return tx;
  },
};
let failOpen = true;
const indexedDB = { open(name, version) {
  assert.equal(name, APP_DATABASE.name); assert.equal(version, 6); openCount++;
  const req = { result: db }; queueMicrotask(() => {
    if (failOpen) { failOpen = false; req.error = Error('open failed'); req.onerror(); }
    else { req.onupgradeneeded(); req.onsuccess(); }
  }); return req;
} };
const database = createAppDatabase({ indexedDB });
await assert.rejects(database.read('characters', 'get', ['x']), /IndexedDB/);
const read = database.read('characters', 'get', ['x']);
await new Promise(resolve => setImmediate(resolve));
assert.equal(openCount, 2, 'failed open must allow retry');
assert.deepEqual(created, [['lorebooks','name'],['presets','name'],['chatSessions','sessionId'],['userPersonas','id']]);
let settled = false; read.then(() => { settled = true; });
request.result = { fileName: 'x' }; request.onsuccess(); await Promise.resolve();
assert.equal(settled, false, 'read must wait for transaction commit');
tx.oncomplete(); assert.deepEqual(await read, { fileName: 'x' });
const failed = database.transaction(['characters'], 'readwrite', () => { throw new Error('DataError'); }, 'write failed');
await assert.rejects(failed, error => error.message === 'write failed' && error.cause.message === 'DataError');
const aborted = database.transaction(['characters'], 'readwrite', () => {}, 'async failed');
await new Promise(resolve => setImmediate(resolve)); tx.error = Error('ConstraintError'); tx.onabort();
await assert.rejects(aborted, error => error.cause.message === 'ConstraintError');
const success = database.transaction(['characters'], 'readwrite', (_, result) => result(42));
await new Promise(resolve => setImmediate(resolve)); tx.oncomplete(); assert.equal(await success, 42);

// Repository contract: inspect the exact set of writes and transaction scope.
const transactions = [];
const records = [{ name: 'P', prompts: [], prompt_order: [] }];
const simulated = {
  read: async (store, method) => method === 'getAll' ? records : records[0],
  async transaction(stores, mode, enqueue) {
    const writes = []; transactions.push({ stores, mode, writes });
    let result, cursorRequest;
    const entries = [{ characterFileName: 'a' }, { characterFileName: 'b' }, { characterFileName: 'a' }];
    const target = { objectStore: store => ({ put: value => writes.push([store,'put',value]), delete: key => writes.push([store,'delete',key]), openCursor: () => cursorRequest = {} }) };
    enqueue(target, value => result = value, error => { throw error; });
    if (cursorRequest) {
      for (const [i, value] of entries.entries()) { cursorRequest.result = { value, delete: () => writes.push(['chatSessions','delete',i]), continue() {} }; cursorRequest.onsuccess(); }
      cursorRequest.result = null; cursorRequest.onsuccess();
    }
    return result;
  }
};
const repos = createEntityRepositories({ database: simulated, normalizePreset: normalizePresetConfig, normalizePresetList });
assert.equal('prompt_order' in (await repos.presets.list())[0], false);
assert.equal('prompt_order' in await repos.presets.get('P'), false);
await repos.presets.put(records[0]); assert.equal('prompt_order' in transactions.at(-1).writes[0][2], false);
const card = await prepareCharacterRecord({ card: { name: 'a' }, fileName: 'a', avatarFile: new File(['abc'], 'a.png', {type:'image/png'}), avatarUrl: 'blob:x' });
assert.equal(card.avatar.buffer.byteLength, 3); assert.equal('avatarUrl' in card, false);
const session = { sessionId: 's', chatHistory: [], futureField: 'keep' };
await repos.mergeRecords({ characters: [card], presets: records, lorebooks: [{ name: 'L' }], personas: [{ id: 'u' }], chatSessions: [session] });
const merged = transactions.at(-1);
assert.deepEqual(merged.stores, ['characters','presets','lorebooks','userPersonas','chatSessions']);
assert.equal(merged.writes.length, 5); assert.equal(merged.writes.at(-1)[2].futureField, 'keep');
assert.equal(await repos.removeCharacterAndSessions('a'), 2);
assert.deepEqual(transactions.at(-1).writes, [['chatSessions','delete',0],['chatSessions','delete',2],['characters','delete','a']]);
await repos.sessions.remove('s'); assert.deepEqual(transactions.at(-1).writes, [['chatSessions','delete','s']]);
const prod = readRecoveredHostView();
assert.ok(!prod.includes('indexedDB.open("SillyTavernCardStudioDB",6)'));
assert.ok(prod.includes('Wt=__stsRepositories.sessions.put'));
assert.ok(prod.includes('createCharacterMutations({ get, set, repositories'));
assert.ok(readFileSync(new URL('../src/features/catalog/catalog-mutations.js',import.meta.url),'utf8').includes('await repositories.removeCharacterAndSessions(id)'));
assert.ok(readFileSync(new URL('../src/app/persistence/backup-restore-service.js',import.meta.url),'utf8').includes('await (repositories.restoreRecords ?? repositories.mergeRecords)(staged.records,'));
assert.ok(/await\s+(?:__stsBackupRestoreService|backupRestoreService)\.restore\(rawBackup\)/.test(readFileSync(new URL('../src/ui/settings/settings-screens.js',import.meta.url),'utf8')));
assert.ok(/await\s+(?:__stsRepositories|repositories)\.mergeRecords\(\{\s*characters:\s*\[\s*await\s+(?:Qt|normalizeCharacterForSave)\(/.test(prod));
assert.ok(!prod.includes('await Jt(i)}}catch{}await Wt('));
console.log('P05 persistence ownership, commit/abort protocol and transaction boundaries: OK');
