import { cp } from 'node:fs/promises';
import { deploymentRoots, verifyAssetInventory } from './asset-manifest.mjs';
import { publishDirectory } from './publish-directory.mjs';
const root=new URL('../',import.meta.url);
await verifyAssetInventory();
await publishDirectory(new URL('dist/',root),async(stage)=>{
  for(const name of deploymentRoots)await cp(new URL(name,root),new URL(name,stage),{recursive:true});
});
console.log('Portable static app built in dist/');
