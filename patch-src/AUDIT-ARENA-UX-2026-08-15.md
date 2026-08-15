# Arena / chat UX audit — 2026-08-15

This audit focuses on small but high-friction interaction failures around Arena, cancellation, retry, reload, and network recovery.

## Confirmed and fixed by recovery v1.2.0

- Intentional `AbortError` / `The user aborted a request` / `Generation was stopped` must not trigger chat recovery again.
- XHR `abort` is cancellation, not a network failure.
- A real network failure still recovers the composer outside an active Arena race.
- A failure on one Arena side does not click global Stop while the other side is still generating.
- Offline and the long busy watchdog remain global recovery conditions.

## Confirmed and covered by Arena runtime guard v1.1.0

- Chat-generation fetches are tracked even when the bundle forgot to attach its own `AbortSignal`.
- Nested `/api/forward` proxy requests are recognized from their target URL/body, so Stop also cancels proxy-fallback generation and preprocessing requests.
- Clicking Stop aborts tracked generation fetches while leaving unrelated POST/GET requests alone.
- A completed Arena candidate whose content is an error string cannot be selected into the conversation.
- A completed Arena candidate with empty content / the `Đang khởi tạo...` placeholder cannot be selected.
- A short-lived abort/CORS-style banner caused by an intentional Stop is dismissed instead of being presented as a fresh network failure.

## Confirmed remaining bundle-level issues

1. The direct-fetch wrapper itself still converts an `AbortError` into connection/CORS wording before upper layers see it. The guard prevents the secondary recovery loop and hides the transient banner after an intentional Stop, but the bundle should ultimately preserve abort semantics at source.
2. Reloading a session while an Arena candidate has `completed: false` restores the stale pending flag without recreating its request/controller, so `Đang tạo...` can become permanent and Retry remains disabled. This must be normalized in session/Arena state rather than faked by toggling DOM `disabled`.
3. Arena Retry resolves the current provider/model settings at retry time but keeps the old candidate label, allowing the displayed model name to differ from the model actually used.
4. Arena completion audio can fire once after both candidates finish and again after selecting the winner and processing it.
5. Selecting a finished candidate while the opponent is still generating intentionally aborts the opponent, but the UI does not communicate that side effect before selection.

## Recommended bundle changes

- Preserve and rethrow abort-like errors before the direct-fetch connection/CORS wrapper.
- Pass the current chat `AbortSignal` directly into non-stream generation and preprocessing/tool requests; keep the runtime guard as defense in depth.
- Add explicit Arena per-side status (`pending | success | error | stopped`) instead of deriving state from `completed` and content text.
- Normalize stale `pending` Arena sides to a resumable/stopped state during session load.
- Persist provider/model/profile on each Arena side and retry from that stored snapshot, updating the label if the user explicitly chooses current settings.
- Emit the completion sound once per Arena turn, not again during winner post-processing.
- Warn/label the early-select action that it stops the still-running opponent.
