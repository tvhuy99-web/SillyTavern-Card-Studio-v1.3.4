import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { verifyPackageLock, collectDependencyEvidence } from '../build/npm-runtime/dependency-policy.mjs';
import { installImmerMapSet } from '../build/npm-runtime/adapters/immer-mapset.js';
// Synthetic lock fixture tests the validator, never used as the project's lockfile.
const manifest={dependencies:{foo:'1.2.3'}};
const item={version:'1.2.3',resolved:'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',integrity:'sha512-'+Buffer.alloc(64,1).toString('base64'),license:'MIT'};
const lock={lockfileVersion:3,packages:{'':{dependencies:manifest.dependencies},'node_modules/foo':item,'node_modules/optional':{...item,optional:true,version:'2.0.0'}}};
assert.equal(verifyPackageLock(manifest,lock),2);
for(const bad of [{version:'1.2.4'},{resolved:'https://example.invalid/foo.tgz'},{resolved:'http://registry.npmjs.org/foo.tgz'},{integrity:'sha512-bad'},{link:true}]){
 const candidate=structuredClone(lock);Object.assign(candidate.packages['node_modules/foo'],bad);assert.throws(()=>verifyPackageLock(manifest,candidate));
}
const folder=await mkdtemp(join(tmpdir(),'stcs-npm-policy-'));
try{
 const root=pathToFileURL(folder+'/');await writeFile(join(folder,'package.json'),JSON.stringify(manifest));
 await assert.rejects(collectDependencyEvidence(root),/Actual npm lockfile required/);
 await writeFile(join(folder,'package-lock.json'),JSON.stringify(lock));
 await mkdir(join(folder,'node_modules','foo'),{recursive:true});
 await writeFile(join(folder,'node_modules','foo','package.json'),JSON.stringify({name:'foo',version:'1.2.3',license:'MIT'}));
 await writeFile(join(folder,'node_modules','foo','LICENSE'),'fixture license');
 const evidence=await collectDependencyEvidence(root);assert.equal(evidence.lockCount,2);assert.equal(evidence.packages[0].installed,true);assert.equal(evidence.packages[0].licenses.length,1);assert.equal(evidence.packages[1].installed,false);
 await writeFile(join(folder,'node_modules','foo','package.json'),JSON.stringify({name:'foo',version:'2.0.0'}));await assert.rejects(collectDependencyEvidence(root),/Installed version differs/);
}finally{await rm(folder,{recursive:true,force:true});}
let calls=0;installImmerMapSet({enableMapSet:()=>calls++});assert.equal(calls,1);assert.throws(()=>installImmerMapSet({}),/missing enableMapSet/);
console.log('npm dependency policy: real lock required, exact pins, registry integrity, installed versions, license inventory and public Immer adapter checks PASS (fixture, not registry installation).');
