import { assembleSourceDeployment } from './source-layout.mjs';
import { publishDirectory } from './publish-directory.mjs';
await publishDirectory(new URL('../dist-source/',import.meta.url),assembleSourceDeployment);
console.log('Source-native ESM build: dist-source/ (snapshot runtime, no asset relocation)');
