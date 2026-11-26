import assert from 'node:assert/strict';
import { createSettingsKeys } from '../src/app/state/settings-keys.js';
import { createAudioConversion } from '../src/features/speech/audio-conversion.js';
import { createRpgImport } from '../src/features/rpg/rpg-import.js';
import { createCharacterExport } from '../src/features/catalog/character-export.js';
import { createCharacterFileCodec } from '../src/features/catalog/character-file.js';
import { createSpeechEngine } from '../src/features/speech/speech-engine.js';
import { createRuntimeCompatibilityData } from '../src/runtime/card-runtime/host/compatibility-data.js';
import { createRuntimeContextAdapters } from '../src/runtime/card-runtime/host/context-adapters.js';

const factories = [createSettingsKeys, createAudioConversion, createRpgImport, createCharacterExport, createCharacterFileCodec, () => createSpeechEngine({ke:{},Ce:{}}), createRuntimeCompatibilityData, createRuntimeContextAdapters];
const expected = [["xo","_o","wo","ko","So","Co","Eo","No","To","Ao","Io","jo","Do","Oo","Ro","Po","Mo","Fo","Bo","Uo","Ho","$o","Go","zo","qo","Vo","Ko"],["Od","Rd","Pd"],["Ol","Rl"],["Hl","$l","ql","Kl","Wl","Jl"],["oc","mc","gc","_c"],["Md","Ld","Bd","Ud","Hd","$d"],["yh","vh","xh","_h","wh","kh","Sh","Ch","Eh","Nh","Ah","Ih","jh","Dh"],["Hh","$h","Gh","zh","qh","Vh","Kh","Wh","Jh","Yh","Xh","Zh"]];
const names = [{"xo":"cardRuntimeCompatibilityKey","_o":"cardRuntimeCompatibilityEvent","wo":"cardRuntimeEngineKey","ko":"cardRuntimeEngineEvent","So":"readCardRuntimeCompatibilityMode","Co":"readCardRuntimeEngineMode","Eo":"arenaSettingsKey","No":"activePersonaIdKey","To":"cardRuntimeStoragePrefix","Ao":"geminiSettingsKey","Io":"geminiRotationKey","jo":"openRouterApiKeyStorageKey","Do":"proxyUrlKey","Oo":"proxyPasswordKey","Ro":"proxyLegacyModeKey","Po":"proxyForToolsKey","Mo":"proxyProfilesKey","Fo":"geminiModelCatalogKey","Bo":"openRouterModelCatalogKey","Uo":"globalConnectionKey","Ho":"smartScanSettingsKey","$o":"smartContextSettingsKey","Go":"actionSuggestionSettingsKey","zo":"writingRefinementSettingsKey","qo":"speechSettingsKey","Vo":"defaultGeminiModels","Ko":"defaultProxyModels"},{"Od":"getAudioContext","Rd":"decodeBase64Bytes","Pd":"decodeRawPcmBuffer"},{"Ol":"rpgPromptMacros","Rl":"importChatSheetsDatabase"},{"Hl":"encodeBase64Utf8","$l":"createPngTextChunk","ql":"resolveExportSpec","Kl":"buildExportCard","Wl":"isPngBytes","Jl":"downloadBlob"},{"oc":"isRecordObject","mc":"mergeCardObjects","gc":"normalizeCharacterCard","_c":"parseCharacterFile"},{"Md":"speechSafetySettings","Ld":"generateGeminiSpeech","Bd":"stopNativeSpeech","Ud":"speakNativeText","Hd":"geminiSpeechVoices","$d":"sanitizeSpeechText"},{"yh":"applySamplingOverrides","vh":"isRecordObject","xh":"cloneRuntimeValue","_h":"assertPayloadSize","wh":"resolveMessageIndex","kh":"resolveMessageRange","Sh":"toInternalRole","Ch":"toRuntimeMessage","Eh":"toRuntimeMessages","Nh":"normalizeRuntimeScope","Ah":"runtimeVariableStorageKey","Ih":"runtimeWebStorageKey","jh":"readRuntimeRecord","Dh":"writeRuntimeRecord"},{"Hh":"DEFAULT_RPC_TIMEOUT_MS","$h":"normalizeImportedName","Gh":"getCharacterSummary","zh":"findCharacter","qh":"normalizeImportedCharacter","Vh":"readTextPayload","Kh":"getActiveCardFrames","Wh":"broadcastRuntimeMessage","Jh":"emitRuntimeEvent","Yh":"classifyRuntimeError","Xh":"buildRuntimeScope","Zh":"resolveGenerationPreset"}];
for (let index = 0; index < factories.length; index++) {
  const service = factories[index]();
  assert.deepEqual(Object.keys(service), expected[index], 'legacy factory keys must remain compatible');
  for (const [key, name] of Object.entries(names[index])) {
    if (typeof service[key] === 'function' && !['wh','Nh','Ah','Ih','jh'].includes(key)) assert.equal(service[key].name, name, key);
  }
}
assert.equal(createSettingsKeys().Eo, 'arena_settings');
assert.deepEqual([...createAudioConversion().Rd('AQID')], [1,2,3]);
assert.equal(createCharacterExport().ql({spec:'chara_card_v3'}, 'auto'), 'v3');
assert.equal(createCharacterFileCodec().oc({}), true);
assert.equal(createCharacterFileCodec().oc([]), false);
assert.equal(createRuntimeCompatibilityData().Sh('assistant'), 'model');
console.log('F01 service names and legacy contract parity: OK');
