import { collectDependencyEvidence } from '../build/npm-runtime/dependency-policy.mjs';
const evidence=await collectDependencyEvidence(new URL('../build/npm-runtime/',import.meta.url));
console.log(JSON.stringify(evidence,null,2));
