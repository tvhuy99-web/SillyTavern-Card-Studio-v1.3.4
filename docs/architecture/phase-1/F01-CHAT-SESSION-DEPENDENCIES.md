# F01: Chat-session dependency contract

Replace 62 short keys in the chat-session composition bag and update all six first-party hook modules using it (session composition, persistence, summaries, history, slash commands and runtime bridge). Retain the injected values, late-bound cross-tab getter, hook order, persistence and data schemas, public runtime RPC methods and slash syntax. Source and portable mirrors migrate together. Regression fixtures for summary races, restore write guards and live session wiring use the named contract. CI is required before acceptance.
