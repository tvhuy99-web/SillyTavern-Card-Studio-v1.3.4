# Chat domain

`turn-policy.js` owns pure chat-turn rules that do not belong to React:

- immutable turn snapshots;
- recent-context projection;
- Smart Scan input assembly;
- prompt-history projection;
- Arena turn snapshot creation;
- abort/result classification.

React remains responsible for rendering and store orchestration only.
