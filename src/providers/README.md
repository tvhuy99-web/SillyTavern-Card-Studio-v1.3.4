# Generation providers

Mốc 4 moves chat-generation routing and provider request/stream logic out of the UI bundle.

`common/generation-gateway.js` selects the active provider/model. Provider-specific modules own request construction and streaming behavior. Legacy SDK/bootstrap functions are injected as infrastructure dependencies rather than imported from the minified application.

Tool-only proxy calls and model-list discovery are intentionally left for a later provider/settings migration.
