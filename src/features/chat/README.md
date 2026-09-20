# Chat domain

Mốc 4 gives chat orchestration an explicit non-React owner.

- `turn-policy.js` owns immutable turn snapshots, context projection, Arena turn snapshots and abort classification.
- `conversation-service.js` owns the send pipeline: input preparation boundary, Smart Scan/World Info coordination, prompt construction boundary, provider generation, initial Arena generation, streaming updates, error handling and post-processing dispatch.

React keeps rendering, hook wiring and interactive UI state. Legacy Smart Scan, prompt-builder and response/RPG implementations are still injected as dependencies while they are migrated module by module; their orchestration no longer lives in the `sendMessage` callback.
