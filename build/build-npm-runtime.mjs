import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { npmRuntimeNames, npmAdapterExports } from './npm-runtime/manifest.mjs';
import { collectDependencyEvidence } from './npm-runtime/dependency-policy.mjs';
import { assembleSourceDeployment, sourceModulePath } from './source-layout.mjs';
import { publishDirectory } from './publish-directory.mjs';
const root=new URL('../',import.meta.url), runtimeRoot=new URL('npm-runtime/',import.meta.url);
const require=createRequire(new URL('package.json',runtimeRoot));
let esbuild;
try { esbuild=require('esbuild'); } catch(error){throw Error('Install isolated dependencies first: npm install --prefix build/npm-runtime',{cause:error});}
const evidence=await collectDependencyEvidence(runtimeRoot);
await publishDirectory(new URL('dist-npm/',root),stage=>assembleSourceDeployment(stage,{replaceModules:async(stage)=>{
  const replacements=[];
  for(const name of npmRuntimeNames){
    const destination=sourceModulePath(`src/vendor/${name}.js`);
    const outfile=new URL(destination,stage);
    await mkdir(new URL('./',outfile),{recursive:true});
    const result=await esbuild.build({entryPoints:[fileURLToPath(new URL(`adapters/${name}.js`,runtimeRoot))],outfile:fileURLToPath(outfile),bundle:true,format:'esm',platform:'browser',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},metafile:true,legalComments:'eof'});
    const entry=Object.values(result.metafile.outputs).find(entry=>entry.entryPoint);
    if(!entry)throw Error('Missing esbuild entry: '+name);
    for(const symbol of npmAdapterExports[name])if(!entry.exports.includes(symbol))throw Error(`${name} missing export ${symbol}`);
    if(entry.imports.some(i=>i.external))throw Error(`${name} has unresolved external imports`);
    const bytes=await readFile(outfile);
    replacements.push({path:destination,sha256:createHash('sha256').update(bytes).digest('hex'),inputs:Object.keys(result.metafile.inputs).sort()});
  }
  await writeFile(new URL('npm-runtime-build.json',stage),JSON.stringify({schemaVersion:2,packages:evidence.pins,lockSha256:evidence.lockSha256,replacements},null,2)+'\n');
  await writeFile(new URL('npm-dependency-evidence.json',stage),JSON.stringify(evidence,null,2)+'\n');
}}));
console.log('npm runtime build: dist-npm/ (source-native ESM, committed portable assets unchanged)');
