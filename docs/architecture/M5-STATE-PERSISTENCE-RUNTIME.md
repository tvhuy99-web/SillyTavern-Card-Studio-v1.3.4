# Mốc 5 — State, persistence and runtime separation

Mốc 5 gives each state lifetime one owner.

## Persistent session state

`src/app/persistence/session-state.js` is the only serializer/migrator for chat sessions. It persists conversation/domain state and explicitly excludes runtime flags, AbortControllers and diagnostics.

Legacy sessions that contain diagnostics/runtime fields are normalized on load and rewritten without those fields.

## Runtime-only state

`src/app/state/runtime-state.js` owns active AbortControllers and exposes a small observable service. AbortControllers no longer live inside the Zustand session store and are never serialized.

## Diagnostics-only state

`src/diagnostics/state.js` owns bounded diagnostic logs. The React store keeps only a render snapshot. Diagnostics are reset when a session is loaded and are not written to IndexedDB session records.

## Arena state

`src/features/arena/state-machine.js` owns candidate status normalization, selection invariants, retry snapshots, provider/profile resolution and result/error/completion transitions.

## Runtime UI guard

`src/ui/runtime-guard.js` replaces the old chat recovery and Arena UX scripts. It observes the runtime service and reconciles stale UI without patching `window.fetch` or XHR prototypes.

## Invariants

- persistent records contain no diagnostics or runtime controller state;
- AbortControllers never live in persisted/session state;
- Arena status transitions have one owner;
- runtime UI recovery does not monkey-patch network primitives;
- generated `assets/m5/**` files are exact copies of their `src/**` owners.
