# R1.2 | Sổ đăng ký mã chết và mã dư thừa

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

Trạng thái: CONFIRMED_DUPLICATE = nội dung giống hệt; CANDIDATE = cần AST và behavior; ACTIVE_DUPLICATE = còn caller; TRANSITIONAL = xóa sau replacement; PROTECTED = không xóa trước contract test.

| ID | Đối tượng | Trạng thái | Điều kiện xóa/hợp nhất |
|---|---|---|---|
| DC-001–012 | Pc, Mc, Hc, Bc, Uc, Wc, jc, Ac, Dc, Oc, Rc, Ic (legacy embedding) | CANDIDATE | Scope AST + không caller ngoài cụm; kiểm tra schema DB; sync/relevance tests |
| DUP-001 | AI Studio model loader React + DOM interceptor | ACTIVE_DUPLICATE | Một catalog service; Android/login/error/loading parity |
| DUP-002–004 | Model test, proxy/tool generation, provider routing, Gemini helpers | ACTIVE_DUPLICATE | Chat/tool/test contract, proxy protocols, unknown IDs, cancel |
| DUP-005–007 | Gc/zc/qc và cosineSimilarity/hashEmbeddingText/buildEmbeddingEntryText | ACTIVE_DUPLICATE | Golden hash/vector/format fixtures |
| DUP-008–009 | Config reads/defaults | ACTIVE_DUPLICATE | Migration, explicit config snapshot, no silent fallback |
| DUP-010 | Smart State host/runtime | CANDIDATE | So sánh semantics và isolation, giữ adapter nếu cần |
| DUP-011 | 21 root API ghi đè | CANDIDATE | Kiểm tra alias capture và init order; facade tests |
| GEN-001 | 34 cặp src/assets identical SHA, 300.944 byte | CONFIRMED_DUPLICATE | Build dist, Netlify/APK/portable-root deployment parity, update tests |
| TR-001 | legacy bundle + 12 transforms | TRANSITIONAL | Source parity và không còn runtime/build dependency |
| KEEP-001 | JSZip bridge | PROTECTED | JSZip import thực tế |
| KEEP-002 | RPC, globals, MVU, slash, Android plugin ABI, schema migration | PROTECTED | Contract tests trước bất kỳ removal |

### DUP-011: 21 tên cần kiểm tra
Character: getCharacterNames, getCharacterIds, getCurrentCharacterName, getCurrentCharacterId, getCharacter.
Persona: getPersonaNames, getPersonaIds, getCurrentPersonaName, getCurrentPersonaId, getPersonaAvatarPath, getPersona.
Preset: getPresetNames, getLoadedPresetName, getPreset, loadPreset.
Extension: isAdmin, getExtensionType, getExtensionStatus, getExtensionInstallationInfo, isInstalledExtension.
EJS: EjsTemplate.
Template khai báo trước token compatibility; fragment ghi đè sau. Không kết luận mọi khai báo ban đầu đều vô dụng nếu chưa kiểm tra alias và side effect.

### Quy trình
Ghi baseline -> AST scope/refs -> dynamic contract inventory -> characterize -> thay thế/xóa theo cụm -> build -> regression + smoke -> cập nhật register. Không xóa mã thư viện minify thủ công. Không dùng số dòng giảm làm gate. Chưa có ứng viên được phê duyệt xóa vô điều kiện.

### P07 implementation update (after P05–P06)
DC-001–012: verified by scope AST before migration and removed from generated production; original legacy input retained. DUP-005–007: source-owned aliases now replace the separate implementations. Behavioral checks are simulated; real browser/Android migration and integration remain open. See [IMPLEMENTATION-P07.md](IMPLEMENTATION-P07.md) and `evidence/p07-before-ast.json`, `evidence/p07-after-ast.json`.

### Phase 1 Finalization Cleanup Update (Waves 2–5, branch `refactor/phase1-finalization`)
All items below were verified across static/dynamic references, build manifests, runtime contracts, and full regression suites before deletion:

| ID | Removed File / Symbol | Replacement / Canonical Owner | Verification |
|---|---|---|---|
| **E05-RM-01** | `src/ui/model-connection-test.js`, `assets/m6/ui/model-connection-test.js`, `installModelConnectionTestEnhancer`, `window.__STS_MODEL_CONNECTION_TEST__`, `window.__STS_MODEL_TEST_UI__` | `src/ui/settings/model-test-button.js` (`ModelTestButton`, `buildSavedProbeTarget`) across all 7 migrated screens/dialogs | `tests/phase1-e05-no-dom-enhancer.mjs`, `npm test` (76/76 PASS) |
| **E04-RM-01** | `src/providers/common/legacy-response-utils.js` + `assets/recovered/providers/common/legacy-response-utils.js` (incl. unused dead class `zs`, `$s`, `Gs`) | `src/providers/common/generation-utils.js` (`clampNumber`, `optionalPositiveInt`) | `tests/phase1-e04-provider-matrix.mjs`, `npm test` (76/76 PASS) |
| **E04-RM-02** | `src/providers/common/legacy-transport.js` + `assets/recovered/providers/common/legacy-transport.js` | `src/providers/common/http-transport.js` (`createHttpTransport`) & `src/diagnostics/network-redaction.js` (`redactNetworkLog`) | `tests/phase1-e04-provider-matrix.mjs`, `npm test` (76/76 PASS) |
| **E04-RM-03** | `src/providers/common/legacy-generation-adapters.js` + `assets/recovered/providers/common/legacy-generation-adapters.js` + 3x duplicate Gemini safety settings (`ul`, `_d`, `kd`) | `src/providers/gemini/config.js` (`DEFAULT_GEMINI_SAFETY_SETTINGS`, `createGeminiClient`, `buildGeminiRequest`) & `generation-gateway.js` | `tests/phase1-e04-provider-matrix.mjs`, `npm test` (76/76 PASS) |
| **E07-RM-01** | `src/features/prompts/legacy-prompt-builder.js` + `assets/recovered/features/prompts/legacy-prompt-builder.js` | `src/features/prompts/story-content.js` (`extractStoryContent`), `src/features/prompts/prompt-assembler.js` (`createPromptAssembler`), `prompt-service.js` | `tests/phase1-e07-prompt-parity.mjs`, `tests/architecture-m4.mjs`, `npm test` (76/76 PASS) |
| **E03-RM-01** | Dead aliases `qs`, `Ou` and 3 duplicate imports in `src/app/host.js` | Removed directly from `src/app/host.js` | `node tools/audit-module-graph.cjs --check` (0 cycles, 0 violations) |
| **E08-RM-01** | Transitional `src/app/host.js:55` import of `../../assets/card-runtime-core-builder-v1.3.6.js` | Canonical `src/runtime/card-runtime/core-builder.js` (Rule B08 satisfied) | `tests/phase1-e08-rpc-manifest.mjs`, `node tools/audit-module-graph.cjs --check` |

**Retained with explicit justification (pending E01 cutover / BLK-001):**
- Portable build mirror files in `assets/m4/`, `assets/m5/`, `assets/m6/`, `assets/m8/`, `assets/recovered/` and `src/vendor/` snapshots remain required while `capacitor.config.json` (`webDir: "dist"`) and portable deployment remain the default until E01 npm-backed build (`BLK-001`) is unblocked.

### Priority 4 Disposition Update — 11 Unused Export Candidates (`audit:quality`, commit `626297b`+)
All 11 `potentiallyUnused` export candidates flagged by the initial `tools/audit-phase1-quality.mjs` run across `src/core/`, `src/providers/`, `src/app/persistence/`, and `src/diagnostics/` were audited against `src/`, `tests/`, `tools/`, and `build/`:

| Symbol | File | Disposition | Rationale |
|---|---|---|---|
| `DEFAULT_CHANNEL_NAME` | `src/app/persistence/cross-tab-sync.js` | **Internalized (`export` removed)** | Default parameter constant used only inside `createCrossTabSync`; no external callers or tests. |
| `DEFAULT_STORAGE_KEY` | `src/app/persistence/cross-tab-sync.js` | **Internalized (`export` removed)** | Default parameter constant used only inside `createCrossTabSync`; no external callers or tests. |
| `redactValue` | `src/diagnostics/network-redaction.js` | **Internalized (`export` removed)** | Recursive helper used only by `redactBody` / `redactNetworkLog`; external callers use `redactNetworkLog`, `redactHeaders`, `redactUrl`, `redactBody`. |
| `AI_STUDIO_SOURCE` | `src/providers/aistudio/text.js` | **Internalized (`export` removed)** | Internal constant with zero external imports across `src/`, `tests/`, `tools/`, and `build/`. |
| `optionalFiniteNumber` | `src/providers/common/generation-utils.js` | **Internalized (`export` removed)** | Internal sampler helper used only by `buildSamplerSettings`. |
| `optionalNonNegativeInt` | `src/providers/common/generation-utils.js` | **Internalized (`export` removed)** | Internal sampler helper used only by `buildSamplerSettings`. |
| `GEMINI_THINKING_LEVEL_HIGH` | `src/providers/gemini/config.js` | **Internalized (`export` removed)** | Internal default constant used only by `buildGeminiRequest`. |
| `recordAiStudioDiagnostic` | `src/diagnostics/aistudio-log.js` | **Retained (`documentedPublicApi`)** | Public AI Studio diagnostic logger API (also exposed via `window.__STS_AI_STUDIO_LOGS__.record`). |
| `exportAiStudioDiagnostics` | `src/diagnostics/aistudio-log.js` | **Retained (`documentedPublicApi`)** | Public AI Studio diagnostic export API (also exposed via `window.__STS_AI_STUDIO_LOGS__.export`). |
| `SseDataBuffer` | `src/providers/common/generation-utils.js` | **Retained (`documentedPublicApi`)** | Public SSE streaming parser primitive for provider adapters and contract tests. |
| `normalizeGeminiModels` | `src/providers/common/model-catalog.js` | **Retained (`documentedPublicApi`)** | Public Gemini catalog normalization API for model catalog consumers and tests. |

### P1 Final Quality Audit — 6 Additional Unused Export Candidates, 123-Factory Classification & Semantic Ownership Review (commit `0bc11fe`+)

#### A. Disposition of 6 Newly Reviewed Export Candidates
| Symbol | File | Disposition | Rationale |
|---|---|---|---|
| `reportFailure` | `src/app/state/runtime-state.js` | **Retained (`documentedPublicApi`)** | Public runtime failure-reporting contract (also exposed on `runtimeState.reportFailure`). |
| `clearFailure` | `src/app/state/runtime-state.js` | **Retained (`documentedPublicApi`)** | Public runtime failure-clearing contract (also exposed on `runtimeState.clearFailure`). |
| `normalizeSideOnLoad` | `src/features/arena/state-machine.js` (+ `assets/m5/features/arena/state-machine.js`) | **Internalized (`export` removed)** | Helper used only inside `normalizeArenaMessageOnLoad`; no external callers or tests. |
| `useRuntimeBridge` | `src/features/chat/hooks/use-card-runtime.js` (+ `assets/recovered/features/chat/hooks/use-card-runtime.js`) | **Internalized (`export` removed)** | Internal hook helper called only by `useCardRuntime`; no external callers or tests. |
| `updateSessionVisualState` | `src/features/chat/hooks/use-chat-session.js` (+ `assets/recovered/features/chat/hooks/use-chat-session.js`) | **Internalized (`export` removed)** | Internal helper called only within `useChatSession`; no external callers or tests. |
| `buildMythicDatabase` | `src/features/state/smart-state-service.js` (+ `assets/smart-state-service-v1.3.6.js`) | **Internalized (`export` removed)** | Internal helper called only by `buildSmartStateBlock`; no external callers or tests. |

#### B. Architectural Classification of the 123 `getDependencies` Factories
Rather than removing abstractions to shrink counts, `tools/audit-phase1-quality.mjs` classifies all 123 factories by architectural purpose:
- **Composition-Root DI Factories (`66`)**: Legitimate React/DI factories in modules with semantic dependency resolvers (`diagnostic-panels.js`, `character-sections.js`, `catalog-screens.js`, `message-rendering.js`, `session-screens.js`, `rpg-screens.js`, `connection-settings-screen.js`). `src/app/host.js` now passes clean semantic keys (with 161 duplicate 2-letter keys removed across 65 calls).
- **Stateful / Lifecycle Provider Factories (`3`)**: Context provider factories in `src/ui/shell/providers.js` (`ToastProvider`, `SpeechProvider`, `CardPopupProvider`).
- **Transitional Legacy-Key Factories (`54`)**: Remaining unmigrated UI factories across 7 files (`chat-controls.js`, `preset-sections.js`, `lorebook-controls.js`, `world-info-screens.js`, `file-name-dialog.js`, `input-controls.js`, `settings-screens.js`) slated for incremental semantic contract migration.

#### C. Semantic Ownership Review & Limitations
- `tools/audit-phase1-quality.mjs` audits an explicit 11-domain canonical ownership inventory (`Providers`, `Prompts`, `Persistence & Backup`, `Settings`, `Chat & Session`, `Arena`, `World Info & Lorebook`, `Catalog`, `RPG & Smart State`, `Card Runtime`, `Android Bridge`) using ESM import-graph resolution rather than plain substring matching.
- **Explicit limitation**: Automated static ownership inventory and ESM import-graph resolution verify canonical file presence, absence of banned legacy duplicates, and import reachability, but do **not** prove absence of duplicated inline logic inside unrelated modules; semantic deduplication still requires AST or manual domain review.

### S05 Final Unused Export Disposition (commit `4f605fc`+)
All 3 remaining unused export candidates identified by the ESM import-graph audit were verified and resolved (`unjustifiedUnusedExportsCount: 0`):

| Symbol | File (+ mirror) | Disposition | Rationale |
|---|---|---|---|
| `compactModelMessages` | `src/features/chat/turn-policy.js` | **Retained (`documentedPublicApi`)** | Public `turn-policy` API exported both standalone and on `chatTurnPolicy.compactModelMessages` (consumed by `conversation-service.js`, `use-card-runtime.js`, `tests/m4-chat-turn-policy.mjs`, `tests/architecture-m4.mjs`). |
| `extractCardExtensionVariables` | `src/features/state/initial-variable-service.js` (+ `assets/initial-variable-service-v1.3.6.js`) | **Internalized (`export` removed)** | Zero external imports across `src/`, `tests/`, `tools/`, and `build/`; kept internal and invoked at line 374. |
| `CONNECTION_DEFAULTS` | `src/providers/common/generation-gateway.js` (+ `assets/m4/providers/common/generation-gateway.js`) | **Removed redundant re-export** | All callers import `CONNECTION_DEFAULTS` directly from canonical `src/providers/common/provider-registry.js` (canonical export untouched). |
