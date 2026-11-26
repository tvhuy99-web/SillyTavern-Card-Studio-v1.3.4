// Serve the actual built portable app and run a browser-only acceptance harness.
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticHandler } from '../server.js';
const root = fileURLToPath(new URL('../',import.meta.url));
const dist=resolve(root,process.env.APP_DIST || 'dist'), fixtures=resolve(root,'tests/browser');
const browser=process.env.CHROME_BIN||['chromium','chromium-browser','google-chrome','google-chrome-stable'].find(cmd=>spawnSync(cmd,['--version'],{stdio:'ignore'}).status===0);
if(!browser) throw Error('Chromium/Chrome required; set CHROME_BIN.');
const serve=await createStaticHandler(dist); // Same headers and public routes as the deployed app.
const profile=await mkdtemp(join(tmpdir(),'stcs-app-browser-'));
let settle;const result=new Promise(resolve=>settle=resolve);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    if(req.method==='POST'&&req.url==='/__test_result'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('result too large');}
      settle(JSON.parse(body));res.end('OK');return;
    }
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith('/__tests/'))return serve(req,res);
    const base=fixtures;
    const file=resolve(base,'.'+path.slice('/__tests'.length));
    if(!file.startsWith(base+sep)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
let child,timer;
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const url=`http://127.0.0.1:${server.address().port}/__tests/application.html`;
  const args=['--headless','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--no-proxy-server',`--user-data-dir=${profile}`,...(process.getuid?.()===0||process.env.CHROME_NO_SANDBOX==='1'?['--no-sandbox']:[]),url];
  child=spawn(browser,args,{stdio:'ignore'});
  child.on('error',error=>settle({ok:false,error:String(error)}));
  child.on('exit',code=>settle({ok:false,error:`Browser exited (${code}) before acceptance result`}));
  timer=setTimeout(()=>settle({ok:false,error:'Browser application acceptance timed out without result'}),Number(process.env.STCS_BROWSER_TIMEOUT_MS)||90000);
  const report=await result;
  for(const label of report.checks||[])console.log('PASS '+label);
  if(!report.ok)throw Error(report.error);
  console.log(`Browser application: ${report.checks.length} checks passed`);
}finally{
  clearTimeout(timer);
  if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
