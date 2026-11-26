# R1.3 | Hợp đồng công khai và dữ liệu

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

## Bảo toàn ABI hiện hữu
| Boundary | Hợp đồng cần khóa | Kiểm thử |
|---|---|---|
| Card runtime | HANDSHAKE_INIT/ACK, CARD_RUNTIME_RPC (requestId, method, args, context), state update, event order, timeout, ready promise | iframe safe/full/official-local, timeout, fixture Card |
| TavernHelper/MVU | getVariables/replaceVariables, chat/worldbook/character/persona/preset, macros/regex/slash, storage/audio, event APIs | fixture script gọi động |
| RPC | generation.generate/stop/stopAll/models; character.create/delete/replace/select; preset.get/load/create/delete/rename/replace; lorebook.entries.get/replace/create/delete; variables.replace; storage.set/remove/clear; extension.settings.save; raw.import.*; chat.refresh/reload/rename/save | manifest đầy đủ trích từ cả host và iframe trước migration |
| Android | AIStudioText (openSession, generate, cancel, listModels, visibility/background); WorldInfoEmbeddingNative; EmbeddingGemma2LiteRT; AndroidExportFile | JS payload/event + Java annotations; native device |
| Storage | session snapshot, IndexedDB schemas, browser keys, remembered/session secrets | snapshot round-trip, upgrade copy, old data fixture |
| Import/export | Card PNG/JSON/CHARX, chat, preset, lorebook, regex, persona | round-trip golden fixtures |

## Dữ liệu cần giữ nguyên hoặc migrate có kiểm chứng
- `LorebookEmbeddingsDB`, version 2, `embeddings`; giữ id/uid/characterId/contentHash/vector và cache semantics.
- `st-card-studio:card-runtime:v2:variables:global`.
- `sillyTavernStudio_globalConnection`, `sillyTavernStudio_apiSettings`, `sillyTavernStudio_openRouterApiKey`, model caches, proxy legacy and canonical keys (xem PROXY_PERSISTENCE_KEYS). Không log credential.
- Session: chatHistory, summaries, queues, variables, extensionSettings, worldInfo state/pins/runtime, visualState, authorNote, RPG, generated lorebook, arena selections, IDs.
- `sts_ai_studio_model_list`, engine-mode/compatibility-mode, application/version metadata; Android package/signing identity và versionCode tương thích update.

## Hợp đồng đích (internal, illustrative)
`ConnectionSnapshot`: providerId, profileId, chatModel, toolModel, protocol, settings, credentialRef. Immutable per request; không chứa secret trong log.
`GenerationRequest`: purpose, providerId, model, messages/prompt, sampler settings, signal, optional provider options. `GenerationResult`: text, reasoning?, finishReason?. Stream events hỗ trợ append và replace (AI Studio snapshot), error, finish, cancellation.
`ProviderAdapter`: capabilities, validate, generate, optional stream/listModels/testConnection theo capabilities, explicit unavailable error. Không yêu cầu AI Studio giả lập capability không có. Unknown provider phải bị reject; giữ default cũ hợp lệ qua migration.
`SessionRepository`: load, save, migrate; `CredentialRepository`: resolve/save/clear, session/persistent policy. `ModelCatalog`: list/refresh/cache by provider+profile, không reload.

Danh mục này là baseline một phần; chưa phải ABI manifest hoàn chỉnh. Không đổi public API/format ở Phase 1 nếu chưa có adapter backward-compatible và test. Không đồng nhất dữ liệu cache với dữ liệu người dùng.
