# F01 — Character export local names

Restore names in the 73 remaining short-binding candidates of character-export.js. Preserve existing factory keys, PNG chunk encoding and CRC algorithm, Character Card v1/v2/v3 fields, script conversion, private-field filtering and download behavior. The portable mirror matches the canonical source. A regression test covers UTF-8/base64, CRC32, export spec, legacy scripts, field mapping and input immutability. CI remains required.
