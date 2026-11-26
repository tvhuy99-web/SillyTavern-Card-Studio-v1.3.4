import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const native=read('android-native/AiStudioTextPlugin.java');
const provider=read('src/providers/aistudio/text.js');
const gateway=read('src/providers/common/generation-gateway.js');
const sections=read('src/ui/settings/provider-sections.js');
const controller=read('src/ui/settings/settings-controller.js');
assert.match(native,/public void listModels\(PluginCall call\)/);
const catalog=read('android-native/AiStudioModelCatalogReader.java');
assert.match(catalog,/DOCUMENT_START_SCRIPT/);
assert.match(catalog,/addDocumentStartJavaScript/);
assert.match(catalog,/fetch-response/);
assert.match(catalog,/xhr-response/);
assert.match(catalog,/openPicker/);
assert.match(catalog,/gemini-\[a-z0-9\]/);
assert.match(read('android-native/config/native-dependencies.gradle'),/webkit:1\.16\.0/);
assert.doesNotMatch(native,/MODEL_LIST_SCAN_JS/);
assert.match(catalog,/__STS_MODEL_CATALOG_V2__/);
assert.match(native,/private void configureThinking\(PluginCall call,String prompt\)/);
assert.match(native,/AI_STUDIO_THINKING_NOT_SUPPORTED/);
// The provider resolves thinking once for both native dispatch and diagnostics.
assert.match(provider,/const resolvedThinking = resolveThinkingLevel\(thinkingLevel\)/);
assert.match(provider,/thinkingLevel: resolvedThinking, requestId/);
assert.match(provider,/sentThinking: resolvedThinking/);
assert.match(gateway,/entry\.adapter\.generate\(args\)/);
assert.match(sections,/Tải danh sách Model/);
assert.match(sections,/Chat Model ID/);
assert.match(sections,/Tool Model ID/);
assert.match(sections,/Mức suy nghĩ Chat/);
assert.match(sections,/Mức suy nghĩ Tool/);
assert.ok(sections.includes('value: settings.aistudio_model ??'), 'Chat custom ID must not be replaced by a fallback');
assert.ok(sections.includes('value: settings.aistudio_tool_model ??'), 'Tool custom ID must not be replaced by a fallback');
assert.ok(sections.includes('Mặc định theo trang web (AI Studio)'), 'Both model and thinking controls offer page default');
assert.match(controller,/createAiStudioCatalog/);
assert.match(sections,/onClick: loadAiStudioModels/);
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
assert.match(read('src/providers/common/provider-registry.js'),/aistudio_thinking/);
assert.match(controller,/SETTING_SAVED/);
assert.doesNotMatch(read('src/app/entry.js'),/installAiStudioModelControls/);
assert.match(read('src/ui/settings/settings-controller.js'),/MODEL_BUTTON_SUCCESS/);
assert.match(read('src/ui/settings/provider-sections.js'),/data-sts-aistudio-model-status/);
const { copiedAssets } = await import('../build/asset-manifest.mjs');
assert.ok(!copiedAssets.some(([source]) => source === 'src/diagnostics/aistudio-model-controls.js'));
const { normalizeAiStudioModelCatalog } = await import('../src/providers/aistudio/model-catalog.js');
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
