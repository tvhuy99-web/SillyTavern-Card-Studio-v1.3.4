# F01 — Residual opaque locals

CI confirmed 128 short lexical candidates after the previous cleanup, including conventional `id`, `db`, `tx`, `op`, `fn` and deliberately unused `_`. This pass replaces opaque proxy key alias `K`, model comparison parameters, message index names and the redundant single-letter runtime adapter alias. It preserves every storage key, comparator, adapter contract, and message mutation behavior. Generated mirrors are kept in sync. Further candidate review is required.
