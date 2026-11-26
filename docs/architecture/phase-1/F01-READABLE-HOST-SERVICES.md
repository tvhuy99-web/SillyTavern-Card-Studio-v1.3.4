# F01 — Host service and settings bindings (batch 3)

Rename 57 remaining short direct declarations and 27 settings-key destructured aliases in the composition root. 294 occurrences per canonical and generated host. Keep old dependency object property keys and factory-result keys explicit, not silently changed. No initialization order, storage key string, or UI behavior change. Three existing lexical wiring tests updated, F01 host gate extended.

The baseline heuristic identified 357 short top-level bindings (198 direct, 156 destructured, 3 imports). Batches 1 and 3 resolve all 198 direct declarations and 27 destructured settings bindings: 225/357 (63.0%) under that limited host inventory, not a repo-wide percentage. Remaining host candidates include other destructured aliases, import compatibility names and short local callback parameters. Batch 2 separately resolves 97 service-module bindings.

| Old | New |
|---|---|
| `Vt` | `listSavedSessions` |
| `Kt` | `loadSessionById` |
| `Wt` | `saveSessionRecord` |
| `Jt` | `deleteSessionRecord` |
| `Qt` | `prepareCharacterRecord` |
| `ns` | `getConnectionSettings` |
| `rs` | `saveConnectionSettings` |
| `cs` | `getProxyProfiles` |
| `us` | `saveProxyProfiles` |
| `ps` | `getOpenRouterCachedModels` |
| `ms` | `saveOpenRouterModels` |
| `gs` | `getActiveModelDisplayName` |
| `fs` | `getGeminiSettings` |
| `ys` | `nextGeminiKey` |
| `bs` | `getOpenRouterApiKey` |
| `vs` | `getProxyUrl` |
| `xs` | `getProxyPassword` |
| `_s` | `getProxyLegacyMode` |
| `Cs` | `getProxyForTools` |
| `Es` | `saveArenaSettings` |
| `Ns` | `backupSettingKeys` |
| `Ts` | `backupSettingKeySet` |
| `Ks` | `generateProxyToolText` |
| `Ws` | `fetchProxyModels` |
| `sl` | `createActiveGeminiClient` |
| `ll` | `buildActiveGeminiRequest` |
| `cl` | `generateGeminiToolText` |
| `ul` | `characterDialogueSafetySettings` |
| `El` | `builtInRpgDatabase` |
| `Nl` | `createDefaultRpgDatabase` |
| `Zl` | `estimateTokenCount` |
| `nc` | `loadLibraryModule` |
| `wc` | `builtInCharacter` |
| `Lc` | `loadEmbeddingIndex` |
| `Fc` | `getEmbeddingIndex` |
| `$c` | `embedQuery` |
| `Gc` | `cosineSimilarity` |
| `zc` | `hashEmbeddingText` |
| `qc` | `getEmbeddingEntryText` |
| `Vc` | `syncLorebookEmbeddings` |
| `Qc` | `NEW_CHARACTER_ID` |
| `Zc` | `emptyCharacterCard` |
| `fu` | `builtInPreset` |
| `Nu` | `defaultPersona` |
| `Tu` | `resolveActivePersona` |
| `Ru` | `fetchOpenRouterModels` |
| `zu` | `SYSTEM_LOG_EVENT` |
| `qu` | `dispatchSystemLog` |
| `_d` | `conversationSafetySettings` |
| `kd` | `generationSafetySettings` |
| `Sd` | `generateOnce` |
| `Cd` | `streamGeneration` |
| `Gd` | `SpeechContext` |
| `qd` | `useSpeech` |
| `gh` | `countModelMessages` |
| `uf` | `formatTimestamp` |
| `Xf` | `CardPopupContext` |
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

All 294 occurrences in each host were classified before editing; explicit legacy keys are retained. Local clone/build remains unavailable (DNS), so latest CI is required. No merge performed.
