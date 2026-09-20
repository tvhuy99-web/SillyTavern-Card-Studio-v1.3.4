# Mốc 4 — Chat and generation domain ownership

## Goal

Move chat-turn business rules, conversation orchestration and provider generation logic out of the React/minified UI bundle without changing visible behavior or the iframe sandbox.

## Owners

- `src/features/chat/turn-policy.js`
- `src/features/chat/conversation-service.js`
- `src/providers/common/generation-gateway.js`
- `src/providers/common/generation-utils.js`
- `src/providers/proxy/generation.js`
- `src/providers/openrouter/generation.js`
- `src/providers/gemini/generation.js`
- `build/transforms/m4-chat-generation.mjs`

## What moved

The UI bundle no longer owns:

- creation of per-turn snapshots for variables/RPG/world-info;
- recent-three-message scan input and prompt-history projection;
- the send pipeline that coordinates Smart Scan, World Info, prompt creation, generation and post-processing;
- initial Arena pair generation, controller ownership and streaming update lifecycle;
- send-level abort and error classification;
- Gemini/OpenRouter/Proxy routing for chat generation;
- Proxy/OpenRouter request payloads and streaming SSE parsing.

`Sd` and `Cd` remain compatibility adapters because legacy callers still use those symbols. Their implementation delegates immediately to the owned Generation Gateway.

The React hook exposes a thin `sendMessage` adapter that calls `conversationService.send(content, options)`.

## Boundary

Smart Scan selection, prompt-builder internals and AI/RPG response processing are still legacy implementations at this point. M4 injects them into the conversation service behind explicit dependency boundaries instead of allowing the React send callback to compose them directly. This preserves behavior while making those implementations independently extractable later.

Arena selection/retry state transitions remain owned by the M5 Arena state machine. M4 owns only the initial two-provider conversation request lifecycle.

## Invariants

- no provider streaming parser lives inside the React bundle;
- no chat turn snapshot cloning lives inside `sendMessage`;
- no Smart Scan, prompt construction, generation or initial Arena orchestration lives inside the React `sendMessage` callback;
- no new runtime monkey patch is introduced;
- generated `assets/m4/**` files match their `src/**` owners exactly.
