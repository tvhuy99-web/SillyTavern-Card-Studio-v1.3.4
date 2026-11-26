import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copiedAssets, verifyAssetInventory } from '../build/asset-manifest.mjs';
import { npmRuntimeNames, npmAdapterExports } from '../build/npm-runtime/manifest.mjs';
import { resolvePublicRoute, createStaticHandler } from '../server.js';
import { commonJsFactory, wrapModule, unsupportedRequire } from '../build/npm-runtime/adapters/module-interop.js';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
await assert.rejects(access(new URL('legacy/',root)),{code:'ENOENT'});
await assert.rejects(access(new URL('build/transforms/',root)),{code:'ENOENT'});
await verifyAssetInventory();
const pins=JSON.parse(await read('build/npm-runtime/package.json')).dependencies;
for(const version of Object.values(pins))assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(pins.react,pins['react-dom']);
for(const name of npmRuntimeNames){
  const source=`src/vendor/${name}.js`;
  assert.equal(copiedAssets.filter(([p])=>p===source).length,1);
  const file=new URL(`build/npm-runtime/adapters/${name}.js`,root);
  const parsed=spawnSync(process.execPath,['--check',fileURLToPath(file)],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
  const adapter=await read(`build/npm-runtime/adapters/${name}.js`);
  for(const symbol of npmAdapterExports[name])assert.match(adapter,new RegExp('\\b'+symbol+'\\b'));
}
assert.equal(spawnSync(process.execPath,[fileURLToPath(new URL('tools/vendor-inventory.mjs',root))],{stdio:'inherit'}).status,0);
let calls=0;const load=commonJsFactory((exports,module)=>{calls++;module.exports={foo:1};});
assert.equal(load(),load());assert.equal(calls,1);assert.equal(wrapModule(load(),1).default.foo,1);assert.throws(()=>unsupportedRequire('node:fs'),{code:'MODULE_NOT_FOUND'});
assert.deepEqual(resolvePublicRoute('/api/generate'),{status:501,file:'api-unavailable.json'});
assert.equal(resolvePublicRoute('/src/app/host.js','text/html').status,404);
assert.equal(resolvePublicRoute('/.git/config').status,400);
assert.equal(resolvePublicRoute('/assets/%2e%2e%2fserver.js').status,400);
assert.equal(resolvePublicRoute('/assets/missing.js').file,'assets/missing.js');
assert.equal(resolvePublicRoute('/some/route','text/html').file,'index.html');
const folder=await mkdtemp(join(tmpdir(),'sts-c-static-'));
try{
  await mkdir(join(folder,'assets'));await writeFile(join(folder,'index.html'),'<html>ok</html>');await writeFile(join(folder,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n');await writeFile(join(folder,'assets','main.js'),'export const ok=true;');await writeFile(join(folder,'api-unavailable.json'),'{}');
  const handler=await createStaticHandler(folder);
  async function request(url,method='GET',accept='') { const result={};await handler({url,method,headers:{accept}},{writeHead(status,headers){Object.assign(result,{status,headers});},end(body){result.body=body;}});return result; }
  const js=await request('/assets/main.js');assert.equal(js.status,200);assert.match(js.headers['Content-Type'],/javascript/);assert.equal(js.headers['X-Content-Type-Options'],'nosniff');assert.match(String(js.body),/export/);
  const head=await request('/assets/main.js','HEAD');assert.equal(head.body,undefined);assert.equal(head.headers['Content-Length'],js.headers['Content-Length']);
  assert.equal((await request('/assets/not-found.js','GET','text/html')).status,404);
  assert.equal((await request('/api/generate')).status,501);
  assert.equal((await request('/','POST')).status,405);
  assert.equal((await request('/_headers')).status,404);
}finally{await rm(folder,{recursive:true,force:true});}
console.log('Block C: historical pipeline absent, package adapter contracts, vendor integrity and portable server routes OK (npm dependency build not executed).');
