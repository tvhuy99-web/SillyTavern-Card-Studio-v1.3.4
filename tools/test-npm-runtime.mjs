import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceModulePath } from '../build/source-layout.mjs';
import { createHash } from 'node:crypto';
import { npmRuntimeNames, npmAdapterExports } from '../build/npm-runtime/manifest.mjs';
const root=new URL('../dist-npm/',import.meta.url);

const report=JSON.parse(await readFile(new URL('npm-runtime-build.json',root),'utf8'));
const pins=JSON.parse(await readFile(new URL('../build/npm-runtime/package.json',import.meta.url),'utf8')).dependencies;
assert.deepEqual(report.packages,pins);
const lockBytes=await readFile(new URL('../build/npm-runtime/package-lock.json',import.meta.url));
assert.equal(report.lockSha256,createHash('sha256').update(lockBytes).digest('hex'));
const evidence=JSON.parse(await readFile(new URL('npm-dependency-evidence.json',root),'utf8'));
assert.equal(evidence.lockSha256,report.lockSha256);
assert.deepEqual(evidence.pins,pins);
const runtimes={};
for(const name of npmRuntimeNames){
  const file=sourceModulePath(`src/vendor/${name}.js`);
  const replacement=report.replacements.find(item=>item.path===file);
  assert.ok(replacement);
  assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),replacement.sha256);
  const module=await import(new URL(file,root));
  for(const symbol of npmAdapterExports[name]) assert.ok(symbol in module,`${name}: ${symbol}`);
  runtimes[name]=module;
}
const {b,v,wt,At,It,jt,enableMapSet}=runtimes['react-state-runtime'];
assert.equal(b.version,pins.react);assert.equal(typeof v.createRoot,'function');
assert.equal(b.isValidElement(wt.jsx('div',{children:'ok'})),true);
assert.deepEqual(jt.default.parse('{hello: 1,}'),{hello:1});
runtimes['immer-mapset'].installImmerMapSet(runtimes['react-state-runtime']);
const store=At(It(set=>({items:new Map(),add:(key,value)=>set(state=>{state.items.set(key,value);})})));
const before=store.getState().items;store.getState().add('a',2);assert.equal(before.size,0);assert.equal(store.getState().items.get('a'),2);
const sdk=runtimes['google-genai-runtime'];assert.equal(typeof sdk.vo,'function');assert.equal(sdk.Ce.BLOCK_NONE,'BLOCK_NONE');assert.equal(sdk.De.AUDIO,'AUDIO');assert.equal(sdk.xe.HIGH,'HIGH');
const {lodash}=runtimes['lodash-runtime'].createLodashRuntime();assert.equal(lodash.default.get({a:{b:2}},'a.b'),2);assert.equal(lodash.default.VERSION,pins.lodash);
const {markdown}=runtimes['markdown-runtime'].createMarkdownRuntime();assert.match(markdown.parse('**ok**'),/<strong>ok<\/strong>/);
assert.equal(typeof runtimes['html-sanitizer-runtime'].createHtmlSanitizerRuntime,'function');
console.log('Package-backed runtime ABI and basic behavior PASS; DOM sanitizer and mounted React remain browser acceptance.');
