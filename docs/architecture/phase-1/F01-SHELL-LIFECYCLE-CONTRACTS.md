# F01: Shell and lifecycle dependency contracts

Replace 18 shell dependency occurrences and eight lifecycle dependency slots with descriptive names. The historical UI alpha-equivalence checker recognizes only the explicitly migrated old shell destructuring keys on getDependencies() declarations; all other object keys and lexical identities remain compared. Context values, public props, hook order, and UI structure remain unchanged. The source and portable mirrors are synchronized.
