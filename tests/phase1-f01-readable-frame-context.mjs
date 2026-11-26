import assert from 'node:assert/strict';
import { createFrameContext } from '../src/runtime/card-runtime/frame-context.js';
let seen;
const frame=createFrameContext({
  __stsBuildSmartStateBlock: data=>{seen=data;return {smartStateBlock:'state'};},
  __stsSelectInitialVariableOpening:()=>({text:'opening'}),
  __stsSeedInitialVariablesFromCard:()=>({variables:{seed:true}})
});
assert.deepEqual(Object.keys(frame),['bp','vp','_p','wp','kp','Sp','Cp','Ep','Np','Ap','Ip']);
assert.equal(frame.Cp('&<>"\''),'&amp;&lt;&gt;&quot;&#39;');
assert.equal(frame.Sp({attributes:[{name:'title',value:'a&b'},{name:'onclick',value:'bad'}]}),' title="a&amp;b"');
assert.equal(frame.Ep('AB A',{A:'short',AB:'long'}),'long short');
assert.equal(frame.kp('</script>'),'"<\\/script>"');
assert.equal(frame.Np({hp:1},{name:'Hero'},['one','two'],1),'state');
assert.deepEqual(seen,{variables:{hp:1},card:{name:'Hero'},messages:['one']});
const scopes=frame.Ap({},[{contextState:{hp:2}},{}],{messageId:0},[{value:{id:'custom'}}],{},0);
assert.deepEqual(scopes.chat,{seed:true});assert.deepEqual(scopes['message:0'],{hp:2});assert.deepEqual(scopes['message:1'],{});assert.deepEqual(scopes['script:custom'],{});
assert.deepEqual(frame.Ip('local',{}),{});
assert.equal(frame.bp.lodash,'https://esm.sh/lodash@4.17.21');
assert.equal(frame.vp.lodash,'https://esm.sh/lodash@4.18.1');
console.log('F01 frame context names and serialized runtime contracts OK');
