# Mốc 4 — Chat and generation domain ownership

## Goal

Move chat-turn business rules and provider generation logic out of the React/minified UI bundle without changing the current UI or iframe sandbox.

## Owners

- `src/features/chat/turn-policy.js`
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
- Arena turn snapshot construction;
- send-level abort classification;
- Gemini/OpenRouter/Proxy routing for chat generation;
- Proxy/OpenRouter request payloads and streaming SSE parsing.

`Sd` and `Cd` remain only as compatibility adapters because the legacy minified UI still calls those symbols. Their implementation delegates immediately to the owned Generation Gateway.

The obsolete inline Proxy chat generator `Vs` is removed from production output.

## Boundary

React still orchestrates state updates, UI streaming refresh cadence and post-processing. Arena retry/state-machine and DOM recovery guards remain separate migration targets; they are not silently folded into M4.

## Invariants

- no provider streaming parser lives inside the React bundle;
- no chat turn snapshot cloning lives inside `sendMessage`;
- no new runtime monkey patch is introduced;
- generated `assets/m4/**` files match their `src/**` owners exactly.
