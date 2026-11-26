# F01 — Host binding closure

Target branch: phase1-latest-2026-11-26. The preceding F01 commits were fast-forwarded into this branch; no new branch or PR was created.

This batch restores 129 destructured local names and 5 import aliases. Across prior batches, all 198 direct declarations, 156 destructured bindings, and five short named import aliases in the host are now descriptive under the lexical inventory. Earlier reports counted only three of the five imports. Legacy factory keys, getter keys, exported aliases n/t, declaration kinds and initialization order are preserved. Local callback parameters are not covered by this inventory.

The source host and generated portable counterpart use the same rename map. The F01 test checks direct declarations, destructured locals, named import aliases and generated host parity. The environment cannot clone GitHub; CI remains necessary. Do not interpret this as repository-wide completion.

## Observed separate issue (not changed in F01)

Several CardFrame dependency names in host wiring appear inconsistent with the actual values returned by createFrameContext (e.g. formatCardChatHistory receives the variable-scope builder). The rename follows the actual factory implementation, preserving the existing wiring exactly. This requires behavioral investigation and is not corrected as part of a naming-only task.

## Rename register

| Old | New |
|---|---|
| `Mt` | `normalizeLorebook` |
| `Lt` | `parseLorebookFile` |
| `Jo` | `smartScanDefaults` |
| `Yo` | `smartContextDefaults` |
| `Xo` | `actionSuggestionPrompt` |
| `Qo` | `writingRefinementPrompt` |
| `Zo` | `actionSuggestionDefaults` |
| `es` | `writingRefinementDefaults` |
| `ts` | `speechDefaults` |
| `as` | `getSmartScanSettings` |
| `is` | `saveSmartScanSettings` |
| `os` | `getSmartContextSettings` |
| `ss` | `getActionSuggestionSettings` |
| `ls` | `getWritingRefinementSettings` |
| `As` | `parseRelaxedJson` |
| `Is` | `truncateText` |
| `js` | `relativeTimeUnits` |
| `Hs` | `request` |
| `Js` | `defaultMythicSystemPrompt` |
| `Ys` | `defaultMythicSafetySettings` |
| `Xs` | `formatRpgHybridTable` |
| `Qs` | `createRpgRowSnapshot` |
| `Zs` | `buildMythicPrompt` |
| `el` | `filterRpgDatabaseByActiveEntries` |
| `tl` | `parseRpgActions` |
| `nl` | `applyRpgActions` |
| `rl` | `buildLinkedLorebookEntries` |
| `il` | `initialSessionState` |
| `jl` | `useGeminiCatalog` |
| `Ol` | `rpgPromptMacros` |
| `Rl` | `importChatSheetsDatabase` |
| `Hl` | `encodeBase64Utf8` |
| `$l` | `createPngTextChunk` |
| `ql` | `resolveExportSpec` |
| `Kl` | `buildExportCard` |
| `Wl` | `isPngBytes` |
| `Jl` | `downloadBlob` |
| `Xl` | `useDialogFocus` |
| `oc` | `isRecordObject` |
| `mc` | `mergeCardObjects` |
| `gc` | `normalizeCharacterCard` |
| `_c` | `parseCharacterFile` |
| `Jc` | `useEmbeddingSync` |
| `cu` | `macroReference` |
| `yu` | `parsePresetFile` |
| `xu` | `handleRadioKeyDown` |
| `Pu` | `lodash` |
| `Lu` | `runIsolatedScript` |
| `Uu` | `getVariable` |
| `$u` | `executeUpdateVariableBlock` |
| `Gu` | `mutateVariable` |
| `Vu` | `resolveCharacterName` |
| `Ku` | `resolvePromptOverride` |
| `Ju` | `expandBasicMacros` |
| `Xu` | `expandRandomMacros` |
| `Zu` | `extractRegexScripts` |
| `gd` | `processRegex` |
| `vd` | `buildBaseSections` |
| `xd` | `assemblePrompt` |
| `wd` | `generateSummary` |
| `Od` | `getAudioContext` |
| `Rd` | `decodeBase64Bytes` |
| `Pd` | `decodeRawPcmBuffer` |
| `Md` | `speechSafetySettings` |
| `Ld` | `generateGeminiSpeech` |
| `Bd` | `stopNativeSpeech` |
| `Ud` | `speakNativeText` |
| `Hd` | `geminiSpeechVoices` |
| `$d` | `sanitizeSpeechText` |
| `Kd` | `MAX_AVATAR_BASE64_LENGTH` |
| `Wd` | `isPlainObject` |
| `Jd` | `assertBackupArray` |
| `Yd` | `encodeBufferToBase64` |
| `Xd` | `decodeBase64ToBuffer` |
| `rh` | `readEpub` |
| `ch` | `resolveWorldInfo` |
| `yh` | `applySamplingOverrides` |
| `vh` | `isRuntimeRecordObject` |
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
| `Oh` | `diagnosticStorageKey` |
| `Lh` | `createDiagnostic` |
| `Fh` | `normalizeDiagnostic` |
| `Bh` | `formatDiagnostic` |
| `Uh` | `appendDiagnostic` |
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
| `Bm` | `markdownParser` |
| `Hm` | `toArray` |
| `Yg` | `htmlSanitizer` |
| `of` | `slashCommandHints` |
| `Rf` | `defaultCopilotSystemPrompt` |
| `Zf` | `ErrorBoundary` |
| `ry` | `InitialLoader` |
| `tp` | `tokenizeSlashCommand` |
| `ip` | `expandSlashMacros` |
| `op` | `compareSlashValues` |
| `sp` | `slashCommandHandlers` |
| `bp` | `baseFrameImportMap` |
| `vp` | `updatedFrameImportMap` |
| `_p` | `baseFrameLibrariesHtml` |
| `wp` | `updatedFrameLibrariesHtml` |
| `kp` | `serializeInlineJson` |
| `Sp` | `serializeElementAttributes` |
| `Cp` | `escapeHtmlAttribute` |
| `Ep` | `replaceFrameTemplates` |
| `Np` | `buildFrameSmartStateBlock` |
| `Ap` | `buildVariableScopes` |
| `Ip` | `readScopedFrameStorage` |
| `c` | `unsupportedRequire` |
| `l` | `wrapModule` |
| `o` | `commonJsFactory` |
| `Bs` | `redactNetworkLog` |
| `bd` | `extractStoryContent` |
