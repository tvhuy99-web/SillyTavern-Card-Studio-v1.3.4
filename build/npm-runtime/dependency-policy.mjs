// A candidate pin is not a verified installation. Require the actual npm lock
// and record the installed package metadata without asserting license clearance.
import { readFile, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const exactVersion=/^\d+\.\d+\.\d+$/;
export function verifyPackageLock(manifest,lock){
  assert.ok(lock.lockfileVersion>=3,'Require npm lockfile v3 or newer');
  assert.ok(lock.packages && lock.packages[''],'Missing lock root');
  assert.deepEqual(lock.packages[''].dependencies,manifest.dependencies,'Lock root pins differ from manifest');
  for(const [name,version] of Object.entries(manifest.dependencies)){
    assert.match(version,exactVersion,`Non-exact pin: ${name}`);
    assert.equal(lock.packages['node_modules/'+name]?.version,version,`Lock version mismatch: ${name}`);
  }
  for(const [path,item] of Object.entries(lock.packages)){
    if(!path)continue;
    assert.ok(/^node_modules\/(?:[^/]+\/)*[^/]+$/.test(path)&&path.split('/').every(s=>s!=='.'&&s!=='..'),'Unexpected lock package path: '+path);
    assert.ok(!item.link,'Unexpected linked package: '+path);
    assert.equal(typeof item.version,'string',path);
    assert.ok(item.resolved,'Missing resolved source: '+path);
    const url=new URL(item.resolved);
    assert.ok(url.protocol==='https:'&&url.hostname==='registry.npmjs.org'&&!url.username&&!url.password&&!url.search&&!url.hash&&(!url.port||url.port==='443'),`Unapproved package origin: ${path}`);
    assert.match(item.integrity||'',/^sha512-[A-Za-z0-9+/]+={0,2}$/,'Missing SHA-512 integrity: '+path);
    assert.equal(Buffer.from(item.integrity.slice(7),'base64').length,64,'Invalid SHA-512 integrity: '+path);
  }
  return Object.keys(lock.packages).length-1;
}
export async function collectDependencyEvidence(runtimeRoot){
  const manifest=JSON.parse(await readFile(new URL('package.json',runtimeRoot),'utf8'));
  const lockBytes=await readFile(new URL('package-lock.json',runtimeRoot)).catch(error=>{throw Error('Actual npm lockfile required. Run npm install --prefix build/npm-runtime first.',{cause:error});});
  const lock=JSON.parse(lockBytes);
  const lockCount=verifyPackageLock(manifest,lock);
  const root=await realpath(fileURLToPath(runtimeRoot));
  const packages=[];
  for(const [path,item] of Object.entries(lock.packages).sort(([a],[b])=>a.localeCompare(b))){
    if(!path)continue;
    const directory=resolve(root,path);
    let actual;
    try{actual=await realpath(directory);}catch(error){if(error.code==='ENOENT'&&item.optional){packages.push({path,version:item.version,optional:true,installed:false,license:item.license??null});continue;}throw error;}
    assert.ok(actual.startsWith(root+sep),'Installed package escapes isolated dependency root: '+path);
    const metadata=JSON.parse(await readFile(resolve(actual,'package.json'),'utf8'));
    assert.equal(metadata.version,item.version,'Installed version differs from lock: '+path);
    const entries=await readdir(actual,{withFileTypes:true});
    const licenses=[];
    for(const file of entries.filter(e=>e.isFile()&&/^(licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(e.name)).sort((a,b)=>a.name.localeCompare(b.name))){
      const bytes=await readFile(resolve(actual,file.name));
      licenses.push({file:file.name,bytes:bytes.length,sha256:sha(bytes)});
    }
    packages.push({path,name:metadata.name,version:metadata.version,installed:true,license:metadata.license??item.license??null,licenses});
  }
  return {schemaVersion:1,lockSha256:sha(lockBytes),lockCount,pins:manifest.dependencies,packages,notice:'Installed manifest and license-file inventory only; not a legal license clearance or verification of every installed byte.'};
}
