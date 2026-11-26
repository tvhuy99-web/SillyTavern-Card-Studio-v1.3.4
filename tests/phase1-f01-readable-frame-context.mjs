import assert from 'node:assert/strict';
import { createFrameContext } from '../src/runtime/card-runtime/frame-context.js';
let seen;
const frame=createFrameContext({
  __stsBuildSmartStateBlock: data=>{seen=data;return {smartStateBlock:'state'};},
  __stsSelectInitialVariableOpening:()=>({text:'opening'}),
  __stsSeedInitialVariablesFromCard:()=>({variables:{seed:true}})
});
assert.deepEqual(Object.keys(frame),["baseFrameImportMap","updatedFrameImportMap","baseFrameLibrariesHtml","updatedFrameLibrariesHtml","serializeInlineJson","serializeElementAttributes","escapeHtmlAttribute","replaceFrameTemplates","buildFrameSmartStateBlock","buildVariableScopes","readScopedFrameStorage"]);
assert.equal(frame.escapeHtmlAttribute('&<>"\''),'&amp;&lt;&gt;&quot;&#39;');
assert.equal(frame.serializeElementAttributes({attributes:[{name:'title',value:'a&b'},{name:'onclick',value:'bad'}]}),' title="a&amp;b"');
assert.equal(frame.replaceFrameTemplates('AB A',{A:'short',AB:'long'}),'long short');
assert.equal(frame.serializeInlineJson('</script>'),'"<\\/script>"');
assert.equal(frame.buildFrameSmartStateBlock({hp:1},{name:'Hero'},['one','two'],1),'state');
assert.deepEqual(seen,{variables:{hp:1},card:{name:'Hero'},messages:['one']});
const scopes=frame.buildVariableScopes({},[{contextState:{hp:2}},{}],{messageId:0},[{value:{id:'custom'}}],{},0);
assert.deepEqual(scopes.chat,{seed:true});assert.deepEqual(scopes['message:0'],{hp:2});assert.deepEqual(scopes['message:1'],{});assert.deepEqual(scopes['script:custom'],{});
assert.deepEqual(frame.readScopedFrameStorage('local',{}),{});
assert.equal(frame.baseFrameImportMap.lodash,'https://esm.sh/lodash@4.17.21');
assert.equal(frame.updatedFrameImportMap.lodash,'https://esm.sh/lodash@4.18.1');
console.log('F01 frame context names and serialized runtime contracts OK');
