# F01 — Slash command naming pass

The AST inventory identified this module as the largest remaining concentration of short names (241 candidates). This pass restores names in tokenizer, argument parsing, macros, comparisons and command handlers. The tp/ip/op/sp factory keys and command names are retained. Portable mirrors remain synchronized. The new regression checks parsing, macro expansion, dispatch and variable operations. Final measured reduction and behavior parity depend on CI.
