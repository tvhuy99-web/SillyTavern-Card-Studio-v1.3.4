import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { vendorAssets } from '../build/asset-manifest.mjs';
import { npmRuntimeNames } from '../build/npm-runtime/manifest.mjs';
const root=new URL('../',import.meta.url);
const manifestFile=new URL('docs/architecture/phase-1/evidence/block-c-vendor-inventory.json',root);
const pins=JSON.parse(await readFile(new URL('build/npm-runtime/package.json',root),'utf8')).dependencies;
const evidence={
  'src/vendor/react-state-runtime.js':{libraries:['React','ReactDOM','Zustand','Immer','JSON5'],detectedVersions:{react:'19.2.7',reactDom:'19.2.7'},provenance:'Recovered bundle; exact Zustand, Immer and JSON5 versions unverified'},
  'src/vendor/google-genai-runtime.js':{libraries:['Google GenAI'],detectedVersions:{'@google/genai':'1.52.0'},provenance:'Version string in recovered SDK; package identity not independently verified'},
  'src/vendor/lodash-runtime.js':{libraries:['Lodash'],detectedVersions:{lodash:'4.18.1'},provenance:'Recovered bundle version field'},
  'src/vendor/markdown-runtime.js':{libraries:['Marked'],detectedVersions:{},provenance:'Exact version unverified'},
  'src/vendor/html-sanitizer-runtime.js':{libraries:['DOMPurify'],detectedVersions:{dompurify:'3.4.12'},provenance:'Recovered bundle version field'},
  'src/vendor/immer-mapset.js':{libraries:['Immer Map/Set plugin'],detectedVersions:{},provenance:'Extracted internal plugin; exact version unverified'},
};
const paths=[...Object.keys(evidence),...vendorAssets].sort();
const files=[];
for(const path of paths){const bytes=await readFile(new URL(path,root));files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...evidence[path]||{provenance:'Static asset retained from original repository'},licenseStatus:'not independently verified'});}
const report={schemaVersion:1,notice:'Integrity inventory only, not a completed license audit. Package pins are candidate or snapshot version strings; registry availability has not been verified.',packagePins:pins,npmRuntimeAdapters:npmRuntimeNames,files};
if(process.argv.includes('--write'))await writeFile(manifestFile,JSON.stringify(report,null,2)+'\n');
else assert.deepEqual(report,JSON.parse(await readFile(manifestFile,'utf8')),'Vendor inventory changed: review provenance before regenerating');
console.log(`Vendor integrity: ${files.length} files verified; license review remains open.`);
