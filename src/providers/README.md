# Provider architecture (Phase 1, P03/P04 transition)

`common/provider-registry.js` owns provider identity, default connection fields,
model resolution and capability metadata. `common/generation-gateway.js` is
its composition root and exposes `generateOnce`, `stream`, `testModel` and
`listProviders`. Unknown provider IDs must fail explicitly. Register a new
adapter here rather than introducing UI-specific request code.

Adapters own request construction and response parsing. A generation request
has an explicit `source`, `model`, `prompt`, `preset`, `signal` and optional
provider inputs. Non-stream results keep the established `{response:{text},
reasoning?}` consumer contract. Streaming preserves incremental text and
AI Studio snapshot/replacement semantics. Connection probes use the same
non-stream adapters with explicit draft credentials, a bounded token budget,
and no network logging. Generation logging redacts authentication headers at
the gateway; unrelated historical logging paths are not covered by this rule.

`proxy/generation.js` owns OpenAI-compatible and Google-native protocols for
both streaming and non-streaming. Explicit endpoint overrides do not inherit
an unrelated endpoint's credential or protocol. Existing saved settings and
profile storage keys are unchanged. `aistudio/model-catalog.js` owns model
filtering/deduplication, native invocation, timeout and cache. An independent
AI Studio generation probe is deliberately unsupported until native cancellation
is request-scoped.

The legacy source is still the transitional application shell. The build
wires a few narrow adapters to the new source modules; do not add business
logic inside these adapters or edit generated `assets/` files. Some specialized
tool SDK calls, remaining model catalogs, and storage/credential reads still
belong to the legacy application; migrate them under P03/P04/P05 before
claiming complete ownership. DOM-based test control discovery is transitional
until the source UI is recovered in P09. Browser, real provider and APK tests
remain acceptance gates, not implied by mock tests.
