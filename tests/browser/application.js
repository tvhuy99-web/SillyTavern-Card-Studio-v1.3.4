const checks = [];
const check = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
const frame = document.querySelector('#app');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, label, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const doc = frame.contentDocument;
    if (doc?.querySelector('#root [role="alert"] code') && doc.querySelector('#root').textContent.includes('Hệ thống đã gặp sự cố')) throw Error('React ErrorBoundary: ' + doc.querySelector('#root [role="alert"] code').textContent);
    if (frame.contentWindow?.__STS_BUILD_PIPELINE__?.status === 'production-error') throw Error('Application bootstrap failed: ' + frame.contentWindow.__STS_BUILD_PIPELINE__.error);
    if (predicate()) return;
    await pause(80);
  }
  throw Error('Timed out: ' + label);
}
const doc = () => frame.contentDocument;
async function clickTab(id, panelId) {
  await waitFor(() => doc()?.getElementById(id), id);
  doc().getElementById(id).click();
  await waitFor(() => doc().getElementById(id)?.getAttribute('aria-selected') === 'true' && doc().getElementById(panelId), panelId);
  check(true, 'mount and navigate ' + panelId);
}
async function countRecords(dbName, stores) {
  return new Promise((resolve, reject) => {
    const request = frame.contentWindow.indexedDB.open(dbName, 6);
    request.onupgradeneeded = () => { request.transaction.abort(); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction(stores, 'readonly'), counts = {};
        for (const store of stores) { const count = tx.objectStore(store).count(); count.onsuccess = () => { counts[store] = count.result; }; }
        tx.oncomplete = () => { db.close(); resolve(counts); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (error) { db.close(); reject(error); }
    };
  });
}
let report;
try {
  frame.src = '/index.html';
  await waitFor(() => doc()?.querySelector('.app-shell') && frame.contentWindow.__STS_BUILD_PIPELINE__?.status === 'production-active', 'React root and application bootstrap', 20000);
  check(doc().querySelector('h1')?.textContent === 'SillyTavern Card Studio', 'actual React header');
  check(doc().querySelectorAll('.app-main-tabs [role="tab"]').length === 5, 'five main navigation tabs');
  const deadline = Date.now() + 15000;
  let counts;
  while (Date.now() < deadline) {
    try {
      const databases = await frame.contentWindow.indexedDB.databases();
      if (!databases.some(db => db.name === 'SillyTavernCardStudioDB' && db.version === 6)) { await pause(150); continue; }
      counts = await countRecords('SillyTavernCardStudioDB', ['characters','presets','userPersonas','chatSessions','lorebooks']); if (counts.characters && counts.presets && counts.userPersonas) break; } catch {}
    await pause(150);
  }
  check(counts?.characters > 0 && counts?.presets > 0 && counts?.userPersonas > 0, 'default catalog persisted in real IndexedDB');
  for (const tab of ['preset','lorebook','chat','settings']) await clickTab('tab-'+tab,'tabpanel-'+tab);
  await clickTab('settings-subtab-api','settings-subtabpanel-api');
  const selector = () => doc().querySelector('select[aria-label="Nhà cung cấp AI"]');
  await waitFor(selector,'API settings');
  check([...selector().options].map(option=>option.value).join(',') === 'gemini,openrouter,proxy,aistudio','four provider choices');
  const sectionLabels = {openrouter:'API Key (OpenRouter)',proxy:'Proxy URL',aistudio:'Mô hình Google AI Studio',gemini:'API Key (Gemini)'};
  for (const provider of ['openrouter','proxy','aistudio','gemini']) {
    const field=selector();

    Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLSelectElement.prototype,'value').set.call(field,provider);
    field.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    await waitFor(() => selector()?.value === provider && doc().getElementById('settings-subtabpanel-api')?.textContent.includes(sectionLabels[provider]), `provider ${provider}`);
    check(true, `provider selection ${provider}`);
  }
  await clickTab('tab-character','tabpanel-character');
  check(frame.contentWindow.__STS_BUILD_PIPELINE__.historicalTransformsExecuted === 0,'source build, no historical transforms');
  report={ok:true,checks};
} catch (error) { report={ok:false,checks,error:String(error?.stack||error)}; }
document.querySelector('#result').textContent=JSON.stringify(report);
await fetch('/__test_result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
