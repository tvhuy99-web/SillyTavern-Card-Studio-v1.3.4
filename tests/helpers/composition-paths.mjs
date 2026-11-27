import { copiedAssets, hostSource, productionOutput } from '../../build/asset-manifest.mjs';
const owners = copiedAssets.filter(([source]) => source.startsWith('src/app/composition/') && source.endsWith('.js'));
export const sourceCompositionPaths = [hostSource, ...owners.map(([source]) => source)];
export const portableCompositionPaths = [productionOutput, ...owners.map(([, output]) => output)].map(output => '../' + output);
