# F01 — Readable service names (batch 2)

Batch 2 builds on `3798fe6d4bc91e4ac43f25fedb4166a88e90fac6`. Rename 97 top-level service bindings inside eight recovered first-party modules (288 identifier occurrences in canonical source). Generated portable mirrors are synchronized. The legacy factory result keys remain unchanged via explicit key/value pairs. No public data fields, storage strings, callback bodies, declaration kinds or dependency keys were intentionally changed.

| Canonical source | Bindings | Occurrences |
|---|---:|---:|
| `src/app/state/settings-keys.js` | 27 | 55 |
| `src/features/speech/audio-conversion.js` | 4 | 11 |
| `src/features/rpg/rpg-import.js` | 2 | 4 |
| `src/features/catalog/character-export.js` | 12 | 36 |
| `src/features/catalog/character-file.js` | 19 | 95 |
| `src/features/speech/speech-engine.js` | 7 | 22 |
| `src/runtime/card-runtime/host/compatibility-data.js` | 14 | 38 |
| `src/runtime/card-runtime/host/context-adapters.js` | 12 | 27 |

## Rename register

### app/state/settings-keys.js

| Old | New |
|---|---|
| `xo` | `cardRuntimeCompatibilityKey` |
| `_o` | `cardRuntimeCompatibilityEvent` |
| `wo` | `cardRuntimeEngineKey` |
| `ko` | `cardRuntimeEngineEvent` |
| `So` | `readCardRuntimeCompatibilityMode` |
| `Co` | `readCardRuntimeEngineMode` |
| `Eo` | `arenaSettingsKey` |
| `No` | `activePersonaIdKey` |
| `To` | `cardRuntimeStoragePrefix` |
| `Ao` | `geminiSettingsKey` |
| `Io` | `geminiRotationKey` |
| `jo` | `openRouterApiKeyStorageKey` |
| `Do` | `proxyUrlKey` |
| `Oo` | `proxyPasswordKey` |
| `Ro` | `proxyLegacyModeKey` |
| `Po` | `proxyForToolsKey` |
| `Mo` | `proxyProfilesKey` |
| `Fo` | `geminiModelCatalogKey` |
| `Bo` | `openRouterModelCatalogKey` |
| `Uo` | `globalConnectionKey` |
| `Ho` | `smartScanSettingsKey` |
| `$o` | `smartContextSettingsKey` |
| `Go` | `actionSuggestionSettingsKey` |
| `zo` | `writingRefinementSettingsKey` |
| `qo` | `speechSettingsKey` |
| `Vo` | `defaultGeminiModels` |
| `Ko` | `defaultProxyModels` |

### features/speech/audio-conversion.js

| Old | New |
|---|---|
| `Dd` | `audioContext` |
| `Od` | `getAudioContext` |
| `Rd` | `decodeBase64Bytes` |
| `Pd` | `decodeRawPcmBuffer` |

### features/rpg/rpg-import.js

| Old | New |
|---|---|
| `Ol` | `rpgPromptMacros` |
| `Rl` | `importChatSheetsDatabase` |

### features/catalog/character-export.js

| Old | New |
|---|---|
| `Fl` | `PNG_SIGNATURE` |
| `Bl` | `isRecordObject` |
| `Ul` | `crc32LookupTable` |
| `Hl` | `encodeBase64Utf8` |
| `$l` | `createPngTextChunk` |
| `Gl` | `cleanExportValue` |
| `zl` | `convertLegacyScript` |
| `ql` | `resolveExportSpec` |
| `Vl` | `buildExportData` |
| `Kl` | `buildExportCard` |
| `Wl` | `isPngBytes` |
| `Jl` | `downloadBlob` |

### features/catalog/character-file.js

| Old | New |
|---|---|
| `rc` | `MAX_CARD_METADATA_BYTES` |
| `ac` | `MAX_EMBEDDED_ASSET_BYTES` |
| `ic` | `PNG_SIGNATURE` |
| `oc` | `isRecordObject` |
| `sc` | `isPngBytes` |
| `lc` | `parseCardJson` |
| `cc` | `decodePngBase64Metadata` |
| `uc` | `yieldToEventLoop` |
| `dc` | `copyLegacyField` |
| `hc` | `toText` |
| `pc` | `toTextArray` |
| `mc` | `mergeCardObjects` |
| `gc` | `normalizeCharacterCard` |
| `fc` | `resolveEmbeddedAssetPath` |
| `yc` | `getAssetMimeType` |
| `bc` | `dataUrlToFile` |
| `vc` | `findIconAsset` |
| `xc` | `encodeBytesBase64` |
| `_c` | `parseCharacterFile` |

### features/speech/speech-engine.js

| Old | New |
|---|---|
| `Md` | `speechSafetySettings` |
| `Ld` | `generateGeminiSpeech` |
| `Fd` | `nativeSpeechGeneration` |
| `Bd` | `stopNativeSpeech` |
| `Ud` | `speakNativeText` |
| `Hd` | `geminiSpeechVoices` |
| `$d` | `sanitizeSpeechText` |

### runtime/card-runtime/host/compatibility-data.js

| Old | New |
|---|---|
| `yh` | `applySamplingOverrides` |
| `vh` | `isRecordObject` |
| `xh` | `cloneRuntimeValue` |
| `_h` | `assertPayloadSize` |
| `wh` | `resolveMessageIndex` |
| `kh` | `resolveMessageRange` |
| `Sh` | `toInternalRole` |
| `Ch` | `toRuntimeMessage` |
| `Eh` | `toRuntimeMessages` |
| `Nh` | `normalizeRuntimeScope` |
| `Ah` | `runtimeVariableStorageKey` |
| `Ih` | `runtimeWebStorageKey` |
| `jh` | `readRuntimeRecord` |
| `Dh` | `writeRuntimeRecord` |

### runtime/card-runtime/host/context-adapters.js

| Old | New |
|---|---|
| `Hh` | `DEFAULT_RPC_TIMEOUT_MS` |
| `$h` | `normalizeImportedName` |
| `Gh` | `getCharacterSummary` |
| `zh` | `findCharacter` |
| `qh` | `normalizeImportedCharacter` |
| `Vh` | `readTextPayload` |
| `Kh` | `getActiveCardFrames` |
| `Wh` | `broadcastRuntimeMessage` |
| `Jh` | `emitRuntimeEvent` |
| `Yh` | `classifyRuntimeError` |
| `Xh` | `buildRuntimeScope` |
| `Zh` | `resolveGenerationPreset` |

The new service-contract test checks factory result keys and representative functions. Existing local callback variables and cross-module legacy keys remain in scope for a future scope-aware pass. The editing environment has no clone/build access; CI must validate both commits before merge. This is partial F01, not a final repository-wide readability certification.
