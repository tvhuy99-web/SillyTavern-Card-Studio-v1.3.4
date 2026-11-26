import assert from 'node:assert/strict';
import { APP_DATABASE } from '../src/app/persistence/app-database.js';
import { createEntityRepositories } from '../src/app/persistence/entity-repositories.js';

// Deterministic transaction double: callbacks queue more requests, mutations
// commit only after the entire queue succeeds. Real IDB cases also live in tests/browser.
const stores = Object.fromEntries(Object.keys(APP_DATABASE.stores).map(key => [key, new Map()]));
const transactions = [];
let failCursor = false;
const database = {
  async read(store, method, args) { return structuredClone(method === 'getAll' ? [...stores[store].values()] : stores[store].get(args[0])); },
  async transaction(names, mode, work) {
    transactions.push({names,mode});
    const draft = Object.fromEntries(names.map(name => [name, structuredClone(stores[name])]));
    const queue = [];
    let result;
    const request = read => { const req = {}; queue.push(() => { req.result = structuredClone(read()); req.onsuccess?.(); }); return req; };
    const tx = { objectStore(name) {
      assert.ok(names.includes(name));
      const data = draft[name], keyPath = APP_DATABASE.stores[name];
      const write = (value, add = false) => { assert.equal(mode,'readwrite'); const key = value[keyPath]; assert.equal(typeof key,'string'); queue.push(() => { if (add && data.has(key)) throw Error('duplicate'); data.set(key,structuredClone(value)); }); };
      return {
        get: key => request(() => data.get(key)), getAll: () => request(() => [...data.values()]),
        put: value => write(value), add: value => write(value,true), delete: key => queue.push(() => data.delete(key)),
        openCursor() {
          const req = {}; let keys, i=0;
          const step = () => { keys ??= [...data.keys()]; const key=keys[i++]; req.result = key === undefined ? null : { value: structuredClone(data.get(key)), update(value) { queue.push(() => { if(failCursor) throw Error('cursor write failed'); data.set(key,structuredClone(value)); }); }, delete() { queue.push(() => data.delete(key)); }, continue() { queue.push(step); } }; req.onsuccess?.(); };
          queue.push(step); return req;
        },
      };
    }};
    work(tx, value => {result=value;}, error => {throw error;});
    while(queue.length) queue.shift()();
    if(mode==='readwrite') for(const name of names) stores[name]=draft[name];
    return result;
  },
};
const repos=createEntityRepositories({database,normalizePreset:value=>value,normalizePresetList:value=>value});
await repos.mergeRecords({characters:[{fileName:'A'},{fileName:'B'}],presets:[{name:'P'},{name:'Other'}],chatSessions:[{sessionId:'a',characterFileName:'A',presetName:'P',futureField:{x:1},logs:['old']},{sessionId:'b',characterFileName:'B',presetName:'P'},{sessionId:'c',characterFileName:'B',presetName:'Other'}]});
const before=transactions.length;
const snapshot=await repos.exportRecords();
assert.equal(transactions.length,before+1); assert.equal(transactions.at(-1).mode,'readonly'); assert.equal(transactions.at(-1).names.length,5); assert.equal(snapshot.chatSessions.length,3);
assert.equal(snapshot.characters.length,2);
const beforeBad=transactions.length;
await assert.rejects(repos.mergeRecords({characters:[{fileName:'A'},{fileName:'A'}]}),/trùng lặp/);
await assert.rejects(repos.mergeRecords({chatSessions:[{}]}),/sessionId/);
assert.equal(transactions.length,beforeBad);
await repos.renamePreset('P','New');
assert.equal((await repos.sessions.get('a')).presetName,'New');assert.equal((await repos.sessions.get('b')).presetName,'New');assert.equal((await repos.sessions.get('c')).presetName,'Other');
const editA=await repos.openSessionForEditing('a');
await repos.saveExistingSession({...editA,presetName:'P',chatHistory:[{content:'new'}],logs:['transient']});
const saved=await repos.sessions.get('a');assert.deepEqual(saved.futureField,{x:1});assert.equal(saved.presetName,'New');assert.ok(!Object.hasOwn(saved,'logs'));
await assert.rejects(repos.renamePreset('New','Other'),/duplicate/);
failCursor=true;await assert.rejects(repos.renamePreset('New','Fail'),/cursor write failed/);failCursor=false;
assert.ok(await repos.presets.get('New'));assert.equal(await repos.presets.get('Fail'),undefined);assert.equal((await repos.sessions.get('a')).presetName,'New');
await assert.rejects(repos.saveExistingSession({...saved,characterFileName:'B'}),/deleted or replaced/);
await repos.removeCharacterAndSessions('A');await assert.rejects(repos.saveExistingSession(saved),/deleted or replaced/);assert.equal(await repos.sessions.get('a'),undefined);
await repos.sessions.put({sessionId:'orphan',characterFileName:'missing',presetName:'New'});await assert.rejects(repos.saveExistingSession(await repos.openSessionForEditing('orphan')),/no longer exists/);
console.log('Block D persistence: one snapshot, validation, migration rollback, non-resurrecting writes OK.');

// Replacement and restore rotate an internal identity even with identical primary keys.
const previous=await repos.openSessionForEditing('b');
await repos.sessions.put({...previous,chatHistory:[{content:'replacement'}]});
await assert.rejects(repos.saveExistingSession(previous),/deleted or replaced/);
const replaced=await repos.openSessionForEditing('b');assert.notEqual(replaced.__stsRecordGeneration,previous.__stsRecordGeneration);
await repos.mergeRecords({chatSessions:[{...replaced,chatHistory:[{content:'restored'}]}]});
await assert.rejects(repos.saveExistingSession(replaced),/deleted or replaced/);
const afterRestore=await repos.openSessionForEditing('b');assert.equal(afterRestore.chatHistory[0].content,'restored');
assert.ok(!(await repos.exportRecords()).chatSessions.some(record=>'__stsRecordGeneration' in record));
stores.chatSessions.set('legacy',{sessionId:'legacy',characterFileName:'B',presetName:'New'});
const legacy=await repos.openSessionForEditing('legacy');assert.ok(legacy.__stsRecordGeneration);assert.equal((await repos.openSessionForEditing('legacy')).__stsRecordGeneration,legacy.__stsRecordGeneration);
await repos.saveExistingSession({...legacy,chatHistory:[{content:'old format editable'}]});
// Two application instances share a database. Latest opener claims edit ownership;
// old snapshots must not overwrite the new editor even with the same session ID.
const second=createEntityRepositories({database,normalizePreset:value=>value,normalizePresetList:value=>value});
const fromFirst=await repos.openSessionForEditing('b');
const fromSecond=await second.openSessionForEditing('b');
assert.notEqual(fromFirst.__stsRecordGeneration,fromSecond.__stsRecordGeneration);
await assert.rejects(repos.saveExistingSession({...fromFirst,chatHistory:[{content:'stale tab'}]}),/deleted or replaced/);
await second.saveExistingSession({...fromSecond,chatHistory:[{content:'new editor'}]});
assert.equal((await repos.sessions.get('b')).chatHistory[0].content,'new editor');
assert.equal((await second.openSessionForEditing('b')).__stsRecordGeneration,fromSecond.__stsRecordGeneration);
const reopened=await repos.openSessionForEditing('b');
assert.notEqual(reopened.__stsRecordGeneration,fromSecond.__stsRecordGeneration);
await assert.rejects(second.saveExistingSession(fromSecond),/deleted or replaced/);
assert.ok(!(await repos.exportRecords()).chatSessions.some(record=>'__stsRecordEditor' in record));
console.log('Block D3: repository-instance edit ownership and backup privacy PASS');
// A route that has already unmounted must not steal another tab's editor token.
const held = await second.openSessionForEditing('b');
assert.equal(await repos.openSessionForEditing('b',()=>false),undefined);
await second.saveExistingSession({...held,chatHistory:[{content:'still the editor'}]});
assert.equal((await repos.sessions.get('b')).chatHistory[0].content,'still the editor');
