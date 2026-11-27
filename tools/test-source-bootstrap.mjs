import './node-web-globals.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root=pathToFileURL(resolve(process.env.APP_DIST||'dist-source')+'/');
const report=JSON.parse(await readFile(new URL('source-build.json',root),'utf8'));
assert.equal(report.layout,'source-esm');
const mountReached=Error('root lookup reached');
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};}
const noop=()=>{};
Object.assign(globalThis,{window:globalThis,localStorage:storage(),sessionStorage:storage(),location:new URL('https://example.invalid/'),addEventListener:noop,removeEventListener:noop,dispatchEvent:()=>true,document:{createElement:()=>({relList:{supports:()=>true},style:{},setAttribute:noop,removeAttribute:noop,appendChild:noop,cloneNode:()=>({style:{}})}),getElementById:id=>{if(id==='root')throw mountReached;return null},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,removeEventListener:noop,documentElement:{dataset:{}},body:{},readyState:'complete'}});
globalThis.fetch=()=>{throw Error('unexpected network during bootstrap')};
globalThis.Capacitor={getPlatform:()=> 'web'};
globalThis.MutationObserver=class {observe(){} disconnect(){}};
const timeout=globalThis.setTimeout, interval=globalThis.setInterval;
globalThis.setTimeout=(...args)=>timeout(...args).unref();
globalThis.setInterval=(...args)=>interval(...args).unref();
await assert.rejects(import(new URL('modules/app/entry.js',root)),error=>error===mountReached);
assert.equal(window.__STS_BUILD_PIPELINE__.status,'production-error');
assert.equal(window.__STS_RUNTIME_UX_GUARD__.version,'m5.1');
window.__STS_RUNTIME_UX_GUARD__.uninstall();
assert.equal(window.__STS_MODEL_CONNECTION_TEST__,undefined);
assert.equal(window.__STS_MODEL_TEST_UI__,undefined);
console.log(`Source-native ${report.runtime} entry and ESM graph reached React root lookup (DOM stub, no mount).`);
