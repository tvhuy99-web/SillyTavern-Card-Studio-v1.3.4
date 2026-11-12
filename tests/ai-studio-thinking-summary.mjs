import assert from 'node:assert/strict';
import { createAiStudioTextProvider } from '../src/providers/aistudio/text.js';
const listeners=new Map();
globalThis.Capacitor={
 isNativePlatform:()=>true,
 Plugins:{AIStudioText:{async addListener(name,fn){listeners.set(name,fn);return{async remove(){listeners.delete(name)}};}}},
 async nativePromise(_,method,args){
  if(method==='cancel')return{};
  assert.equal(method,'generate');
  for(const [delay,text,reasoning] of [[8,'Đáp án','Tóm tắt suy nghĩ ban đầu'],[15,'Đáp án đã chỉnh','Tóm tắt suy nghĩ đã chỉnh']]){
   setTimeout(()=>listeners.get('textProgress')?.({requestId:args.requestId,text,reasoning,replace:true,replaceReasoning:true}),delay);
  }
  return await new Promise(resolve=>setTimeout(()=>resolve({text:'Đáp án cuối',reasoning:'Tóm tắt suy nghĩ cuối'}),35));
 }
};
const events=[];
for await(const chunk of createAiStudioTextProvider().stream({prompt:'test',model:'gemini-2.5-flash'}))events.push(chunk);
assert.equal(events.at(-1).text,'Đáp án cuối');
assert.equal(events.at(-1).reasoning,'Tóm tắt suy nghĩ cuối');
assert.equal(events.at(-1).replaceReasoning,true);
assert.equal(events.length,3);
assert.equal(listeners.size,0);
delete globalThis.Capacitor;
console.log('AI Studio visible thinking summary snapshot test OK');
