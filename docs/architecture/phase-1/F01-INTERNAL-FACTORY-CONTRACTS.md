# F01 — Descriptive internal factory contracts

Character import, export and frame context factories now expose descriptive method names instead of recovered two-letter aliases. Their callers in the composition root and unit tests migrate atomically. Import and frame context dependency keys also use descriptive names. The generated portable mirrors are synchronized. These are private JavaScript composition contracts; serialized card fields, TavernHelper/iframe RPC and storage contracts are not renamed. CI must verify all consumers and runtime parity.
