// Source-native deployment: publish browser modules at their original relative
// positions, without the historical portable asset path relocation.
import { cp, mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { posix, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { copiedAssets, deploymentRoots, entrySource, hostSource, entryOutput, vendorAssets } from './asset-manifest.mjs';
import { buildCardRuntimeAssets } from './build-card-runtime.mjs';
const root = new URL('../', import.meta.url);
export const modulePrefix = 'modules/';
export function sourceModulePath(source) {
  assert.ok(source.startsWith('src/') && source.endsWith('.js') && posix.normalize(source) === source, `Invalid source module: ${source}`);
  return modulePrefix + source.slice(4);
}
const buildOnly = ['src/runtime/card-runtime/core.template.js','src/runtime/card-runtime/bridge/rpc-client.js'];
export const browserSources = Object.freeze([entrySource,hostSource,...copiedAssets.map(([source])=>source).filter(source=>source.endsWith('.js'))].sort());
export const sourceStaticAssets = Object.freeze([...vendorAssets,...copiedAssets.filter(([source])=>!source.endsWith('.js')).map(([,output])=>output)]);
export async function verifySourceOwnership() {
  const actual=(await readdir(new URL('src/',root),{recursive:true,withFileTypes:false})).filter(p=>p.endsWith('.js')).map(p=>'src/'+p.replaceAll('\\','/')).sort();
  assert.deepEqual(actual,[...browserSources,...buildOnly].sort(),'Every JS source needs exactly one browser or build-only owner');
  assert.equal(new Set(browserSources).size,browserSources.length);
}
export function renderSourceIndex(html) {
  const entry = `./${entryOutput}?v=1.3.6-m7.5`;
  assert.equal(html.split(entry).length,2,'Expected exactly one portable HTML entry');
  return html.replace(entry,`./${sourceModulePath(entrySource)}`);
}
async function copyOwned(source,destination,stage) {
  const output=new URL(destination,stage);
  await mkdir(new URL('./',output),{recursive:true});
  await cp(new URL(source,root),output,{recursive:true});
}
export async function assembleSourceDeployment(stage,{replaceModules}={}) {
  await verifySourceOwnership();
  for(const name of deploymentRoots.filter(name=>name!=='assets'&&name!=='index.html')) await copyOwned(name,name,stage);
  await writeFile(new URL('index.html',stage),renderSourceIndex(await readFile(new URL('index.html',root),'utf8')));
  for(const source of browserSources) await copyOwned(source,sourceModulePath(source),stage);
  for(const name of vendorAssets) await copyOwned(name,name,stage);
  for(const [source,output] of copiedAssets.filter(([source])=>!source.endsWith('.js'))) await copyOwned(source,output,stage);
  await buildCardRuntimeAssets({coreOutput:new URL(sourceModulePath('src/runtime/card-runtime/core-builder.js'),stage),rendererOutput:null});
  if(replaceModules) await replaceModules(stage);
  for(const asset of sourceStaticAssets) assert.ok((await stat(new URL(asset,stage))).isFile(),asset);
  // Cache policy covers the new module namespace; keep the original CSP intact.
  const headers=new URL('_headers',stage);
  await writeFile(headers,(await readFile(headers,'utf8')).trimEnd()+'\n\n/modules/*\n  Cache-Control: public, max-age=0, must-revalidate\n');
  const files=(await readdir(stage,{recursive:true,withFileTypes:true})).filter(e=>e.isFile());
  const manifest=[];
  for(const entry of files){
    const path=relative(fileURLToPath(stage),join(entry.parentPath,entry.name)).replaceAll('\\','/');
    const bytes=await readFile(new URL(path,stage));
    manifest.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  manifest.sort((a,b)=>a.path.localeCompare(b.path));
  await writeFile(new URL('source-build.json',stage),JSON.stringify({schemaVersion:1,layout:'source-esm',runtime:replaceModules?'npm':'snapshot',modules:browserSources.length,files:manifest},null,2)+'\n');
}
