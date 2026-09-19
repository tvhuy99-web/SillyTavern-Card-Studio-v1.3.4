# Card Runtime source

Mốc 3 owns Card Runtime source outside the legacy application bundle and splits the runtime by subsystem.

The `modules/*.jsfrag` files are build-time source modules. They deliberately share one lexical scope when composed because safe-mode iframes are opaque-origin and do not fetch/import runtime modules. This preserves the current CSP/CORS/sandbox model while giving each subsystem a real source owner.

Do not edit generated files in `assets/`. Change the owning module and rebuild.
