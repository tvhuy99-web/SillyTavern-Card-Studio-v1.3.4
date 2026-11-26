# F01 AST inventory

The naming audit is a conservative measurement aid, not a certification that every short name was minified. The baseline is `ab71bcd1c877807b631c6900c7d2312787733b9c`. The scope is actual lexical declarations in first-party src JS files; vendor files, external property names, compatibility aliases and script contents embedded in strings are excluded. Legitimate short names are counted, so the reduction percentage is not a final F01 completion score.

Run with a separately installed TypeScript 5.8.3 parser (the product runtime lockfile is not changed):

```sh
TYPESCRIPT_PATH=/path/to/typescript node tools/audit-f01-names.cjs --baseline ab71bcd1c877807b631c6900c7d2312787733b9c --check-host
```

Use --details for file and declaration positions. The CI npm-runtime job fetches the exact baseline and installs the pinned parser outside the project. --check-host enforces no one- or two-character top-level host binding. The broader inventory is informational and does not enforce blind renaming of legitimate short names.

The parser logic was exercised locally against a synthetic Git fixture with named imports, object destructuring, function parameters, catch bindings, exports and excluded vendor code. The complete repository inventory is pending CI.
