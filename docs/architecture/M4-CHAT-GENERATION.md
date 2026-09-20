# Mốc 4 — Business logic outside React UI

## Status

**Complete.** React/UI no longer owns the chat send pipeline, provider generation, Smart Scan selection algorithm, prompt assembly orchestration, AI/RPG response processing, or Arena retry prompt assembly.

## Source owners

- `src/features/chat/turn-policy.js`
- `src/features/chat/conversation-service.js`
- `src/features/chat/response-processor.js`
- `src/features/world-info/smart-scan-service.js`
- `src/features/prompts/prompt-service.js`
- `src/providers/common/generation-gateway.js`
- `src/providers/common/generation-utils.js`
- `src/providers/proxy/generation.js`
- `src/providers/openrouter/generation.js`
- `src/providers/gemini/generation.js`
- `build/transforms/m4-chat-generation.mjs`

## Ownership after M4

The React bundle is now an adapter layer for the affected paths:

- `sendMessage` delegates to `conversationService.send()`;
- the World Info hook delegates Smart Scan selection to `smart-scan-service` and retains only React scanning-state wiring plus legacy output rendering;
- prompt construction for normal sends and Arena retries delegates to `prompt-service`;
- AI response post-processing delegates to `response-processor`;
- provider request construction, routing and streaming live under the generation gateway/providers.

The legacy low-level prompt primitives (`vd`/`xd`), regex/output renderer, World Info resolver, and Mythic parser/applicator remain compatibility dependencies injected into the owned services. They are no longer composed inside React event handlers. Moving those low-level engines to fully readable source is a later source-recovery concern, not an M4 UI/business-ownership boundary.

## Invariants

- no provider streaming parser lives inside React callbacks;
- no Smart Scan semantic/LLM selection algorithm lives inside the React hook;
- no prompt assembly recipe lives inside send or Arena retry callbacks;
- no integrated RPG response state transition lives inside the React hook;
- no chat-turn snapshot cloning lives inside `sendMessage`;
- no new runtime monkey patch is introduced;
- generated `assets/m4/**` files match their `src/**` owners exactly.

## Regression coverage

- `tests/architecture-m4.mjs`
- `tests/m4-generation-gateway.mjs`
- `tests/m4-chat-turn-policy.mjs`
- `tests/m4-conversation-service.mjs`
- `tests/m4-smart-scan-service.mjs`
- `tests/m4-prompt-service.mjs`
- `tests/m4-response-processor.mjs`
