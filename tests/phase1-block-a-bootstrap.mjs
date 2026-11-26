import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Import the actual emitted ESM graph, not a concatenation or isolated syntax check.
// Stop at root lookup so this can run without a browser DOM implementation.
const mountReached = Error('root lookup reached');
function storage() { const m = new Map(); return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}; }
const noop=()=>{};
Object.assign(globalThis,{window:globalThis,localStorage:storage(),sessionStorage:storage(),location:new URL('https://example.invalid/'),addEventListener:noop,removeEventListener:noop,dispatchEvent:()=>true,document:{createElement:()=>({relList:{supports:()=>true},style:{},setAttribute:noop,removeAttribute:noop,appendChild:noop,cloneNode:()=>({style:{}})}),getElementById:id=>{if(id==='root')throw mountReached;return null},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,removeEventListener:noop,documentElement:{dataset:{}},body:{},readyState:'complete'}});
globalThis.fetch=()=>{throw Error('unexpected network during bootstrap')};
await assert.rejects(import('../assets/app-production-v1.3.6.js'),error=>error===mountReached);
assert.equal(window.__STS_MODEL_CONNECTION_TEST__,undefined);
assert.equal(window.__STS_MODEL_TEST_UI__,undefined);
const vendor=await import('../assets/recovered/vendor/react-state-runtime.js');
const sdk=await import('../assets/recovered/vendor/google-genai-runtime.js');
assert.equal(typeof vendor.b.createElement,'function');assert.equal(typeof vendor.v.createRoot,'function');assert.equal(typeof vendor.wt.jsx,'function');assert.equal(typeof sdk.vo,'function');assert.equal(sdk.De.AUDIO,'AUDIO');
const records=JSON.parse(await readFile(new URL('../docs/architecture/phase-1/evidence/block-a-recovery-parity.json',import.meta.url),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');let count=0,comparators=0;
for (const record of records.filter(r=>!r.stateOwner&&!r.defaultData)) {
  const module=await import(new URL('../assets/recovered/'+record.path.slice(4),import.meta.url));
  const factory=module['create'+record.name];assert.equal(typeof factory,'function',record.name);
  const deferred=()=>{throw Error('dependencies read before render: '+record.name)};
  const component=record.wrapper?factory(vendor.b,deferred):factory(deferred);
  if(record.wrapper==='memo'){assert.equal(component.$$typeof,Symbol.for('react.memo'));assert.equal(typeof component.type,'function');if(record.wrapperComparator){assert.equal(typeof component.compare,'function',record.name);assert.equal(component.compare.length,2,record.name);comparators++;}else assert.equal(component.compare,null);}
  else if(record.wrapper==='forwardRef'){assert.equal(component.$$typeof,Symbol.for('react.forward_ref'));assert.equal(typeof component.render,'function');}
  else assert.equal(typeof component,'function',record.name);
  count++;
}
assert.equal(count,71);assert.equal(comparators,2);
console.log('Block A: emitted ESM bootstrap reaches React root lookup; 71 UI factories and original memo comparators OK (DOM stub, no mount).');
