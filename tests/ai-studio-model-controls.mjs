import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const native=read('android-native/AiStudioTextPlugin.java');
const provider=read('src/providers/aistudio/text.js');
const gateway=read('src/providers/common/generation-gateway.js');
const transform=read('build/transforms/ai-studio-config.mjs');
assert.match(native,/public void listModels\(PluginCall call\)/);
const catalog=read('android-native/AiStudioModelCatalogReader.java');
assert.match(catalog,/DOCUMENT_START_SCRIPT/);
assert.match(catalog,/addDocumentStartJavaScript/);
assert.match(catalog,/fetch-response/);
assert.match(catalog,/xhr-response/);
assert.match(catalog,/openPicker/);
assert.match(catalog,/gemini-\[a-z0-9\]/);
assert.match(read('.github/workflows/android-apk.yml'),/webkit:1\.16\.0/);
assert.match(native,/MODEL_LIST_SCAN_JS/);
assert.match(native,/private void configureThinking\(PluginCall call,String prompt\)/);
assert.match(native,/AI_STUDIO_THINKING_NOT_SUPPORTED/);
// The provider resolves thinking once for both native dispatch and diagnostics.
assert.match(provider,/const resolvedThinking = resolveThinkingLevel\(thinkingLevel\)/);
assert.match(provider,/thinkingLevel: resolvedThinking, requestId/);
assert.match(provider,/sentThinking: resolvedThinking/);
assert.match(gateway,/aistudio\.generate\(\{ model: resolved\.model, prompt, signal, thinkingLevel \}\)/);
assert.match(transform,/Tải danh sách Model/);
assert.match(transform,/Chat Model ID/);
assert.match(transform,/Tool Model ID/);
assert.match(transform,/Mức suy nghĩ Chat/);
assert.match(transform,/Mức suy nghĩ Tool/);
assert.ok(transform.includes('value:t.aistudio_model??'), 'Chat custom ID must not be replaced by a fallback');
assert.ok(transform.includes('value:t.aistudio_tool_model??'), 'Tool custom ID must not be replaced by a fallback');
assert.ok(transform.includes('Mặc định theo trang web (AI Studio)'), 'Both model and thinking controls offer page default');
assert.ok(transform.includes('const list=Array.from(new Map'), 'Downloaded model IDs must be deduplicated');
assert.match(native,/!"default"\.equalsIgnoreCase\(modelId\)/);
assert.match(catalog,/isTextGenerationModel\(id\)/);
const { resolveAiStudioWebModelId } = await import('../src/providers/aistudio/text.js');
assert.equal(resolveAiStudioWebModelId('default'), '');
assert.equal(resolveAiStudioWebModelId('web_default'), '');
assert.equal(resolveAiStudioWebModelId('gemini-2.5-flash'), 'gemini-2.5-flash');
assert.equal(resolveAiStudioWebModelId('my-custom-model-id'), 'my-custom-model-id');
// Model discovery must mirror the reference WebView's cross-origin
// fetch/XHR observation and never fail silently.
assert.doesNotMatch(catalog,/origin!==location\.origin/);
assert.match(catalog,/MODEL_LOAD_STARTED/);
assert.match(catalog,/MODEL_LOAD_FAILED/);
assert.match(catalog,/MODEL_SCAN/);
assert.match(catalog,/MODEL_PAGE_NETWORK_ERROR/);
assert.match(catalog,/MODEL_PAGE_HTTP_ERROR/);
assert.match(catalog,/domCandidates/);
assert.match(native,/MODEL_LOAD_CLICK/);
assert.match(native,/THINKING_REQUESTED/);
assert.match(native,/THINKING_OPTION_CLICK/);
assert.match(native,/THINKING_VERIFIED/);
assert.match(native,/THINKING_UNVERIFIED/);
assert.match(native,/GENERATION_SETTINGS/);
assert.match(native,/result\.put\("appliedThinking",confirmedThinkingLevel\)/);
assert.match(provider,/sentThinking/);
assert.match(read('build/transforms/m4-chat-generation.mjs'),/thinkingLevel:ns\(\)\.aistudio_thinking/);
assert.match(transform,/SETTING_SAVED/);
assert.match(read('src/app/entry.js'),/installAiStudioModelControls/);
assert.match(read('build/build-production-bundle.mjs'),/aistudio-model-controls\.js/);
const { normalizeAiStudioModelCatalog } = await import('../src/diagnostics/aistudio-model-controls.js');
assert.deepEqual(normalizeAiStudioModelCatalog({models:[
  {id:'gemini-3-flash-preview'}, {id:'gemini-3-flash-preview'},
  {id:'gemini-embedding-001'}, {id:'gemini-2.5-pro'},
]}).map(x=>x.id),['gemini-2.5-pro','gemini-3-flash-preview']);
const calls=[];
globalThis.Capacitor={
  isNativePlatform:()=>true,
  async nativePromise(plugin,method,args){
    assert.equal(plugin,'AIStudioText');
    assert.equal(method,'generate');
    calls.push(args);
    return {text:'OK',appliedThinking:'high'};
  },
};
const provider2=(await import('../src/providers/aistudio/text.js')).createAiStudioTextProvider();
const out=await provider2.generate({prompt:'Test',model:'default',thinkingLevel:'high'});
assert.equal(out.response.text,'OK');
assert.equal(calls[0].thinkingLevel,'high');
assert.equal(calls[0].model,'');
delete globalThis.Capacitor;
console.log('AI Studio model and thinking UI integration: OK');
