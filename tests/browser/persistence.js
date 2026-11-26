// Select one deployed layout; no fallback to repository assets or another build.
const sourceLayout = new URL(location.href).searchParams.get('layout') === 'source';
const { APP_DATABASE, createAppDatabase } = await import(sourceLayout ? '/modules/app/persistence/app-database.js' : '/assets/m5/app/persistence/app-database.js');
const { createEntityRepositories, prepareCharacterRecord } = await import(sourceLayout ? '/modules/app/persistence/entity-repositories.js' : '/assets/m5/app/persistence/entity-repositories.js');
const { normalizePresetConfig, normalizePresetList } = await import(sourceLayout ? '/modules/features/presets/prompt-normalizer.js' : '/assets/prompt-normalizer-v1.3.6.js');

const checks = [];
function check(condition, label) { if (!condition) throw new Error(label); checks.push(label); }
async function rejects(action, label) { let rejected = false; try { await action(); } catch { rejected = true; } check(rejected, label); }
function fixture(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 5);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('character_session', { keyPath: 'id' }).put({ id: 'historical', value: 'preserve me' });
      db.createObjectStore('characters', { keyPath: 'fileName' }).put({ fileName: 'old.json', card: { name: 'Old' }, extra: 'keep' });
      db.createObjectStore('chatSessions', { keyPath: 'sessionId' }).put({ sessionId: 'old-chat', characterFileName: 'old.json', chatHistory: [{ role: 'model', content: 'old' }], futureField: { a: 1 } });
      const presets = db.createObjectStore('presets', { keyPath: 'name' });
      presets.createIndex('uniqueMarker', 'uniqueMarker', { unique: true });
      presets.put({ name: 'Original', uniqueMarker: 'reserved', prompts: [] });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { request.result.close(); resolve(); };
  });
}
async function run() {
  check(APP_DATABASE.name === 'SillyTavernCardStudioDB' && APP_DATABASE.version === 6, 'database identity unchanged');
  const name = 'phase1-p05-fixture';
  await fixture(name);
  const database = createAppDatabase({ name });
  const repos = createEntityRepositories({ database, normalizePreset: normalizePresetConfig, normalizePresetList });
  check((await repos.characters.get('old.json')).extra === 'keep', 'v5 character survives upgrade');
  check((await repos.sessions.get('old-chat')).futureField.a === 1, 'unknown session data survives upgrade');
  check((await database.read('character_session', 'get', ['historical'])).value === 'preserve me', 'historical store not silently deleted');
  check((await repos.lorebooks.list()).length === 0 && (await repos.personas.list()).length === 0, 'missing stores created');
  const avatar = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
  const char = await prepareCharacterRecord({ fileName: 'new.json', card: { name: 'New' }, avatarFile: avatar, avatarUrl: 'blob:transient' });
  check(!('avatarUrl' in char) && char.avatar.buffer.byteLength === 3, 'avatar serialization preserves bytes not transient URL');
  const preset = { name: 'New preset', prompts: [{ identifier: 'a', enabled: true }], prompt_order: [{ identifier: 'a', enabled: true }] };
  await repos.mergeRecords({ characters: [char], presets: [preset], lorebooks: [{ name: 'Lore', book: { entries: [] } }], personas: [{ id: 'p', name: 'Persona' }], chatSessions: [{ sessionId: 'new-chat', characterFileName: 'new.json', chatHistory: [] }] });
  check((await repos.characters.get('new.json')).avatar.buffer.byteLength === 3, 'avatar survives real IDB roundtrip');
  check(!('prompt_order' in await repos.presets.get('New preset')), 'preset normalized on write');
  check((await repos.personas.get('p')).name === 'Persona' && (await repos.lorebooks.get('Lore')).book.entries.length === 0, 'five-store merge succeeds');
  check((await repos.sessions.get('old-chat')).futureField.a === 1, 'merge retains unrelated sessions');
  await rejects(() => repos.mergeRecords({ characters: [{ fileName: 'old.json', card: { name: 'Wrong' } }], presets: [{ name: 'Conflict', uniqueMarker: 'reserved' }], chatSessions: [{ sessionId: 'bad-async', chatHistory: [] }] }), 'async constraint failure rejects whole restore');
  check((await repos.characters.get('old.json')).card.name === 'Old' && !(await repos.sessions.get('bad-async')), 'async failure rolls back other stores');
  await rejects(() => repos.mergeRecords({ characters: [{ fileName: 'bad-sync', card: {} }], chatSessions: [{ chatHistory: [] }] }), 'synchronous invalid key rejects whole restore');
  check(!(await repos.characters.get('bad-sync')), 'synchronous failure rolls back earlier puts');
  await repos.sessions.put({ sessionId: 'new-chat', characterFileName: 'new.json', chatHistory: [{ content: 'replacement' }] });
  check((await repos.sessions.get('new-chat')).chatHistory[0].content === 'replacement', 'overwrite replaces record without pre-delete');
  await repos.sessions.put({ sessionId: 'new-chat-2', characterFileName: 'new.json', presetName: 'New preset', chatHistory: [], futureField: { keep: true } });
  await repos.renamePreset('New preset', 'Renamed preset');
  check((await repos.sessions.get('new-chat-2')).presetName === 'Renamed preset', 'preset rename migrates chat references');
  const staleSnapshot = { ...(await repos.openSessionForEditing('new-chat-2')), presetName: 'New preset', chatHistory: [], logs: ['transient'] };
  await repos.saveExistingSession(staleSnapshot);
  const saved = await repos.sessions.get('new-chat-2');
  check(saved.presetName === 'Renamed preset' && saved.futureField.keep && !('logs' in saved), 'autosave preserves renamed preset and unknown fields');
  const anotherTab = createEntityRepositories({ database: createAppDatabase({ name }), normalizePreset: normalizePresetConfig, normalizePresetList });
  const otherEditor = await anotherTab.openSessionForEditing('new-chat-2');
  check(otherEditor.__stsRecordGeneration !== staleSnapshot.__stsRecordGeneration, 'another repository claims new edit ownership');
  await rejects(() => repos.saveExistingSession(staleSnapshot), 'prior editor cannot overwrite newer owner');
  await anotherTab.saveExistingSession({...otherEditor,chatHistory:[{content:'new editor'}]});
  check((await repos.sessions.get('new-chat-2')).chatHistory[0].content === 'new editor', 'new editor can persist');
  await repos.sessions.put({...saved,chatHistory:[{content:'replacement'}]});
  await rejects(() => repos.saveExistingSession(staleSnapshot), 'old incarnation cannot overwrite replacement');
  const exportSnapshot = await repos.exportRecords();
  check(exportSnapshot.chatSessions.some(session => session.sessionId === 'new-chat-2') && exportSnapshot.presets.some(preset => preset.name === 'Renamed preset'), 'consistent backup snapshot');
  await rejects(() => repos.mergeRecords({ chatSessions: [staleSnapshot, staleSnapshot] }), 'duplicate keys rejected before restore');
  check(await repos.removeCharacterAndSessions('new.json') === 2, 'character cascade removes exactly two linked sessions');
  check(!(await repos.characters.get('new.json')) && !(await repos.sessions.get('new-chat')) && !(await repos.sessions.get('new-chat-2')), 'cascade commits character and chat deletion together');
  await rejects(() => repos.saveExistingSession(staleSnapshot), 'stale autosave cannot resurrect deleted session');
  check(!(await repos.sessions.get('new-chat-2')), 'deleted session remains absent');
  check(Boolean(await repos.characters.get('old.json')) && Boolean(await repos.sessions.get('old-chat')), 'unrelated character and session survive cascade');
  await repos.lorebooks.remove('Lore'); await repos.personas.remove('p'); await repos.presets.remove('Renamed preset');
  check(!(await repos.lorebooks.get('Lore')) && !(await repos.personas.get('p')) && !(await repos.presets.get('Renamed preset')), 'named repository removal succeeds');
}
let report;
try { await run(); report = { ok: true, checks }; }
catch (error) { report = { ok: false, checks, error: error.stack || String(error) }; }
await fetch('/__test_result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
document.body.textContent = report.ok ? 'PASS' : 'FAIL';
