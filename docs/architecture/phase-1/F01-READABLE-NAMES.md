# F01 — Readable names (batch 1)

Baseline: `ab71bcd1c877807b631c6900c7d2312787733b9c` (phase1-latest-2026-11-26).

## Scope and evidence

- Rename 141 composition-root factory bindings using their factory identity, with hook-specific names for useDiagnostics, useConversation and useChatSession.
- 439 occurrences in each of the canonical host and its portable generated counterpart (435 ordinary occurrences, 4 shorthand expansions). The portable counterpart is not a second implementation.
- Preserve declaration kind, initialization order, dependency keys, displayName strings, imports, exports and runtime behavior. Four shorthand occurrences are expanded to explicit old-key/new-value pairs.
- Update eight existing lexical wiring tests to follow the renamed bindings; add a dedicated F01 regression gate. Do not weaken existing behavioral tests.
- Baseline lexical inventory: 198 short direct declarations, 156 short destructured bindings, 3 short import aliases (heuristic, not a complete AST inventory). 141 factory bindings are resolved by this batch. Do not extrapolate this ratio to the whole repository.

## Rename register

| Old binding | New binding |
|---|---|
| `kt` | `Icon` |
| `St` | `SectionNavigator` |
| `Ct` | `AppHeader` |
| `ln` | `CollapsibleSection` |
| `cn` | `Tooltip` |
| `un` | `CopyButton` |
| `dn` | `TextInput` |
| `hn` | `TextArea` |
| `pn` | `CharacterCoreSection` |
| `mn` | `LoadingIndicator` |
| `pl` | `ToastItem` |
| `ml` | `ToastProvider` |
| `gl` | `CharacterDialogueSection` |
| `fl` | `CharacterScenarioSection` |
| `yl` | `ToggleSwitch` |
| `bl` | `CharacterMetadataSection` |
| `vl` | `CharacterLorebookSection` |
| `xl` | `RegexScriptEditor` |
| `_l` | `RegexScriptList` |
| `wl` | `TavernScriptEditor` |
| `kl` | `TavernScriptList` |
| `Sl` | `CharacterExtensionsSection` |
| `Cl` | `SearchableSelect` |
| `Tl` | `RpgDatabaseEditor` |
| `Pl` | `MythicConfigurationDialog` |
| `Ml` | `CharacterRpgSection` |
| `Ll` | `CharacterDetailSections` |
| `Ql` | `FileNameDialog` |
| `ec` | `CharacterTools` |
| `Sc` | `EntryPositionControl` |
| `Cc` | `EntrySelectionControl` |
| `Ec` | `LorebookEntryDialog` |
| `Nc` | `LorebookEntryCard` |
| `Tc` | `LorebookEntryList` |
| `Yc` | `AttachLorebookDialog` |
| `Xc` | `LorebookManager` |
| `eu` | `CharacterScreen` |
| `tu` | `PresetBasicSection` |
| `nu` | `NumberInput` |
| `ru` | `SamplingSection` |
| `au` | `StringListInput` |
| `iu` | `GenerationControlSection` |
| `ou` | `InstructSection` |
| `su` | `ExperimentalSection` |
| `lu` | `PresetConfiguration` |
| `uu` | `InlineCopyButton` |
| `du` | `MacroReference` |
| `hu` | `PromptEditDialog` |
| `pu` | `PromptListItem` |
| `mu` | `PromptPreview` |
| `gu` | `PromptManager` |
| `_u` | `PresetTab` |
| `wu` | `PresetNameDialog` |
| `ku` | `PresetScreen` |
| `Su` | `LorebookListItem` |
| `Cu` | `LorebookUploadControl` |
| `Eu` | `LorebookLibrary` |
| `Iu` | `PersonaEditor` |
| `ju` | `PersonaScreen` |
| `Ed` | `ModelSelect` |
| `Nd` | `ConnectionSettingsScreen` |
| `Td` | `SmartScanSettings` |
| `Ad` | `SmartContextSettings` |
| `Id` | `ActionSuggestionSettings` |
| `jd` | `LiterarySettings` |
| `zd` | `SpeechProvider` |
| `Vd` | `SpeechSettings` |
| `Qd` | `BackupSettings` |
| `Zd` | `CardRuntimeSettings` |
| `eh` | `SettingsTab` |
| `th` | `SettingsScreen` |
| `nh` | `GreetingDialog` |
| `ah` | `StorySetupDialog` |
| `uh` | `SessionListItem` |
| `dh` | `StoryImportControl` |
| `hh` | `AdventureImportControl` |
| `ph` | `SessionListScreen` |
| `mh` | `useDiagnostics` |
| `fh` | `useConversation` |
| `lp` | `useChatSession` |
| `cp` | `ArenaSettingsDialog` |
| `up` | `ChatSettingsDialog` |
| `dp` | `QuickConnectionDialog` |
| `hp` | `SpeechControls` |
| `pp` | `QuickConnectionBadge` |
| `mp` | `ChatHeader` |
| `jp` | `CardFrame` |
| `Dp` | `StreamingHtmlPreview` |
| `Xg` | `MessageMenu` |
| `Qg` | `ThinkingPanel` |
| `Zg` | `StreamingThinkingPanel` |
| `ef` | `ArenaResponseSide` |
| `tf` | `ArenaResponsePanel` |
| `nf` | `ChatMessage` |
| `rf` | `ReadAloudButton` |
| `af` | `MessageList` |
| `sf` | `ChatComposer` |
| `lf` | `ImmersiveContainer` |
| `cf` | `ChatVisualEffects` |
| `df` | `LoadOlderButton` |
| `hf` | `TokenCountControl` |
| `pf` | `PromptSectionView` |
| `mf` | `SystemLogPanel` |
| `gf` | `NetworkLogItem` |
| `ff` | `NetworkLogPanel` |
| `yf` | `SmartScanLogItem` |
| `bf` | `SmartScanLogPanel` |
| `vf` | `MythicLogItem` |
| `xf` | `MythicLogPanel` |
| `_f` | `SummaryLogPanel` |
| `wf` | `WorldInfoLogPanel` |
| `kf` | `GenerateEntryButton` |
| `Sf` | `PromptLogPanel` |
| `Cf` | `ResponseLogPanel` |
| `Ef` | `WorldInfoScanPanel` |
| `Nf` | `DiagnosticsDialog` |
| `Tf` | `RelevanceTestDialog` |
| `Af` | `ActiveWorldInfoEntry` |
| `If` | `DynamicWorldInfoDialog` |
| `jf` | `GenerateEntryDialog` |
| `Df` | `AuthorNoteDialog` |
| `Of` | `ChatDialogs` |
| `Pf` | `ActionProposal` |
| `Mf` | `ActionSuggestionDialog` |
| `Lf` | `VariableTree` |
| `Ff` | `VariableHud` |
| `Bf` | `TableCellInput` |
| `Uf` | `RpgTableRow` |
| `Hf` | `RpgTableEditor` |
| `$f` | `RpgImportDialog` |
| `Gf` | `RpgHud` |
| `zf` | `CardPreviewDialog` |
| `qf` | `ErrorDecisionDialog` |
| `Vf` | `ChatHud` |
| `Kf` | `RpgNotification` |
| `Wf` | `StoryRevisionDialog` |
| `Jf` | `ChatSessionScreen` |
| `Yf` | `ChatRoute` |
| `Qf` | `CardPopupProvider` |
| `ay` | `MainTab` |
| `iy` | `ApplicationShell` |

## Remaining

Other recovered host service bindings, short dependency contract keys, minified callback/local variables inside feature modules, and legacy public/export aliases still require scope-aware review. Third-party vendor and embedded user/card data are excluded. This batch does not change UI, performance, architecture boundaries, or public data contracts.

## Validation

All target occurrences were classified as declaration, positional/value reference, displayName receiver, or explicitly preserved shorthand property before editing. Source and portable host counts matched. The editing environment cannot clone the repository (DNS unavailable), so Node build, AST validation and the full regression suite were not independently executed. CI on this branch is required before merge. Existing baseline CI does not validate this change.
