# Arena / chat UX audit — 2026-08-15

This audit focuses on small but high-friction interaction failures around Arena, cancellation, retry, reload, and network recovery.

## Confirmed and fixed by recovery v1.2.0

- Intentional `AbortError` / `The user aborted a request` / `Generation was stopped` must not trigger chat recovery again.
- XHR `abort` is cancellation, not a network failure.
- A real network failure still recovers the composer outside an active Arena race.
- A failure on one Arena side does not click global Stop while the other side is still generating.
- Offline and the long busy watchdog remain global recovery conditions.

## Confirmed remaining bundle-level issues

1. Direct-fetch error wrapping treats `AbortError` as a connection/CORS failure, producing misleading user-facing text after an intentional Stop.
2. The normal non-stream generation path calls the non-stream generator without the active chat `AbortSignal`; Stop can therefore fail to cancel the underlying request.
3. Smart-scan / tool preprocessing can run without the active chat `AbortSignal`; Stop during “analyzing context” may not become effective immediately.
4. An Arena candidate that failed is stored as `completed: true` with `[Lỗi: ...]` in `content`; the UI therefore enables “Chọn cái này” and can promote the error string into the conversation.
5. A completed Arena candidate with empty content displays “Đang khởi tạo...” even though it is no longer generating, and its select action is enabled.
6. Reloading a session while an Arena candidate has `completed: false` restores the stale pending flag without recreating its request/controller, so “Đang tạo...” can become permanent and Retry remains disabled.
7. Arena Retry resolves the current provider/model settings at retry time but keeps the old candidate label, allowing the displayed model name to differ from the model actually used.
8. Arena completion audio can fire once after both candidates finish and again after selecting the winner and processing it.
9. Selecting a finished candidate while the opponent is still generating intentionally aborts the opponent, but the UI does not communicate that side effect before selection.

## Recommended bundle changes

- Preserve and rethrow abort-like errors before the direct-fetch connection/CORS wrapper.
- Pass the current chat `AbortSignal` into non-stream generation and preprocessing/tool requests.
- Add explicit Arena per-side status (`pending | success | error | stopped`) instead of deriving state from `completed` and content text.
- Disable selection for `error`, `stopped`, and empty-success candidates; keep Retry available.
- Normalize stale `pending` Arena sides to a resumable/stopped state during session load.
- Persist provider/model/profile on each Arena side and retry from that stored snapshot, updating the label if the user explicitly chooses current settings.
- Emit the completion sound once per Arena turn, not again during winner post-processing.
- Warn/label the early-select action that it stops the still-running opponent.
