import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticHandler } from '../server.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist=resolve(root,process.env.APP_DIST||'dist');
const serve=await createStaticHandler(dist);
const sourceLayout=await stat(resolve(dist,'modules/app/entry.js')).then(s=>s.isFile(),()=>false);
const browser = process.env.CHROME_BIN || ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'].find(cmd => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0);
if (!browser) throw new Error('Chromium/Chrome required. Set CHROME_BIN.');
const profile = await mkdtemp(join(tmpdir(), 'stcs-storage-'));
let finish;
const result = new Promise(resolve => { finish = resolve; });
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/__test_result') {
      let body = ''; for await (const chunk of req) body += chunk;
      finish(JSON.parse(body)); res.end('OK'); return;
    }
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!pathname.startsWith('/tests/browser/'))return serve(req,res);
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(resolve(root,'tests/browser')+sep)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
let child, timeout;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/tests/browser/persistence.html?layout=${sourceLayout?'source':'portable'}`;
  const args = ['--headless', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, ...(process.getuid?.() === 0 || process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : []), url];
  child = spawn(browser, args, { stdio: 'ignore' });
  child.on('error', error => finish({ ok: false, error: String(error) }));
  child.on('exit', code => finish({ ok: false, error: `Browser exited (${code}) before test result` }));
  timeout = setTimeout(() => finish({ ok: false, error: 'Browser test timed out' }), 30000);
  const report = await result;
  for (const label of report.checks || []) console.log('PASS ' + label);
  if (!report.ok) throw new Error(report.error);
  console.log(`Browser IndexedDB: ${report.checks.length} checks passed`);
} finally {
  clearTimeout(timeout);
  if (child && child.exitCode === null && child.signalCode === null) { const done = new Promise(resolve => child.once('exit', resolve)); child.kill(); await done; }
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
