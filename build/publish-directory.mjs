import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
async function exists(path){try{await stat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
// Build into a private sibling directory. Retain a previous valid output until
// the new build has completed, and roll back on publication failure.
export async function publishDirectory(outputUrl,assemble){
  const output=fileURLToPath(outputUrl).replace(/[\\/]$/,'');
  const parent=dirname(output), name=basename(output), lock=output+'.lock', previous=output+'.previous';
  await mkdir(parent,{recursive:true});
  try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error(`Build already running or interrupted: ${lock}. Inspect and remove the lock only after confirming no build is active.`);throw e;}
  let stage;
  try{
    if(await exists(previous)){
      if(!await exists(output))await rename(previous,output);
      else await rm(previous,{recursive:true,force:true});
    }
    stage=await mkdtemp(join(parent,`.${name}.stage-`));
    await assemble(pathToFileURL(stage+'/'));
    if(await exists(output))await rename(output,previous);
    try{await rename(stage,output);}catch(e){if(await exists(previous))await rename(previous,output);throw e;}
    await rm(previous,{recursive:true,force:true});
  }finally{
    try{if(stage)await rm(stage,{recursive:true,force:true});}finally{await rm(lock,{recursive:true,force:true});}
  }
}
