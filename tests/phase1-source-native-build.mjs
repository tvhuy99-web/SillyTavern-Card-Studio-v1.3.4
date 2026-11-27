import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm, writeFile, mkdir, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { browserSources, sourceModulePath, sourceStaticAssets, verifySourceOwnership, assembleSourceDeployment } from '../build/source-layout.mjs';
import { publishDirectory } from '../build/publish-directory.mjs';
import { vendorAssets, runtimeCoreOutput } from '../build/asset-manifest.mjs';
import { createStaticHandler, resolvePublicRoute } from '../server.js';
const root=new URL('../',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
await verifySourceOwnership();
const folder=await mkdtemp(join(tmpdir(),'stcs-source-'));
const output=pathToFileURL(join(folder,'site')+'/');
try{

  await publishDirectory(output,assembleSourceDeployment);
  const report=JSON.parse(await readFile(new URL('source-build.json',output),'utf8'));
  assert.equal(report.runtime,'snapshot');assert.equal(report.modules,browserSources.length);
  const actual=(await readdir(output,{recursive:true,withFileTypes:true})).filter(e=>e.isFile()).map(e=>relative(fileURLToPath(output),join(e.parentPath,e.name)).replaceAll('\\','/')).sort();
  assert.deepEqual(actual,[...report.files.map(e=>e.path),'source-build.json'].sort());
  for(const item of report.files){const bytes=await readFile(new URL(item.path,output));assert.equal(bytes.length,item.bytes);assert.equal(sha(bytes),item.sha256);}

  for(const source of browserSources){const bytes=await readFile(new URL(sourceModulePath(source),output));assert.deepEqual(bytes,await readFile(new URL(source,root)),source);assert.doesNotMatch(bytes.toString(),/^(?:import|export)[^\n]*from ['"][^'"\n]+\.js\?v=/m,source);}
  for(const asset of vendorAssets)assert.deepEqual(await readFile(new URL(asset,output)),await readFile(new URL(asset,root)));
  assert.deepEqual(await readFile(new URL('modules/runtime/card-runtime/core-builder.js',output)),await readFile(new URL('src/runtime/card-runtime/core-builder.js',root)));
  for(const asset of sourceStaticAssets)await access(new URL(asset,output));
  for(const absent of ['assets/app-production-v1.3.6.js','assets/app-entry-v1.3.6.js',runtimeCoreOutput,'assets/recovered/','assets/m4/features/','src/','build/','modules/runtime/card-runtime/core.template.js','modules/runtime/card-runtime/bridge/rpc-client.js'])await assert.rejects(access(new URL(absent,output)),{code:'ENOENT'});
  const html=await readFile(new URL('index.html',output),'utf8');assert.match(html,/src="\.\/modules\/app\/entry\.js"/);

  const entry=await readFile(new URL('modules/app/entry.js',output),'utf8');assert.match(entry,/new URL\('\.\/host\.js', import\.meta\.url\)/);
  const host=await readFile(new URL('modules/app/host.js',output),'utf8');assert.doesNotMatch(host,/^import[^\n]*\.js\?v=/m);assert.ok(!host.includes('../../assets/card-runtime-core-builder'));assert.ok(host.includes("from '../runtime/card-runtime/core-builder.js'"));

  await writeFile(join(folder,'package.json'),' {"type":"module"}');
  const boot=spawnSync(process.execPath,[fileURLToPath(new URL('tools/test-source-bootstrap.mjs',root))],{env:{...process.env,APP_DIST:fileURLToPath(output)},encoding:'utf8'});
  assert.equal(boot.status,0,boot.stderr+boot.stdout);
  const handler=await createStaticHandler(fileURLToPath(output));
  async function request(url,accept=''){const result={};await handler({url,method:'GET',headers:{accept}},{writeHead(status,headers){Object.assign(result,{status,headers});},end(body){result.body=body;}});return result;}
  const js=await request('/modules/app/entry.js');assert.equal(js.status,200);assert.match(js.headers['Content-Type'],/javascript/);assert.equal(String(js.body),entry);
  assert.equal((await request('/modules/missing.js','text/html')).status,404);assert.equal((await request('/src/app/entry.js')).status,404);
  assert.equal(resolvePublicRoute('/modules/app/entry.js').status,404);

  await assert.rejects(publishDirectory(output,async stage=>{await writeFile(new URL('index.html',stage),'broken');throw Error('build failed');}),/build failed/);
  assert.equal(await readFile(new URL('index.html',output),'utf8'),html);
  await mkdir(join(folder,'site.lock'));
  await assert.rejects(publishDirectory(output,assembleSourceDeployment),/already running or interrupted/);
  await rm(join(folder,'site.lock'),{recursive:true});
  await publishDirectory(output,assembleSourceDeployment);
  assert.equal(await readFile(new URL('source-build.json',output),'utf8'),JSON.stringify(report,null,2)+'\n','Rebuild must be deterministic');
}finally{await rm(folder,{recursive:true,force:true});}
console.log('Source-native build: owned module parity, real ESM bootstrap, deterministic manifest, public route and failed-build recovery PASS.');
