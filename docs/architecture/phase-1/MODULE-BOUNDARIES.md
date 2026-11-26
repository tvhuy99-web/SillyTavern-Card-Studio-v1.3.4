# R1.3 | Ranh giới module và quy tắc phụ thuộc

> Baseline: `398165a0954f98de6c3553f32e6af2308c963260` (main, ứng dụng 1.3.6). Phân tích tĩnh; chưa chạy build/AST/runtime. Quyết định kiến trúc là đề xuất cho Phase 1, chưa thay đổi repository.

'
| Module | Được phụ thuộc | Cấm |
|---|---|---|
| core | primitives, standards | features, UI, platform |
| feature domain/use cases | core, own domain, declared public ports | DOM, storage globals, concrete native, private cross-feature |
| feature UI | own feature API, shared ui, core | wire protocol, DB, global business state |
| providers | core, provider contracts, injected network/credential/platform ports | UI, feature private state |
| platform | core + ports | UI/business decision logic |
| runtime iframe | runtime contract + internal modules | direct app store; credential access |
| runtime host | runtime contract, public use-case ports | arbitrary private feature implementation |
| diagnostics | core, own storage policy | ownership of business actions |
| app | module public entry points | internal deep imports except documented migration adapter |

Rule B01: no cycles in static module graph (allow documented temporary migration exceptions with owner and expiry).
Rule B02: no `window`, `document`, `localStorage`, `sessionStorage`, `indexedDB`, Capacitor in domain layer; runtime/platform/UI adapters may use them.
Rule B03: no feature-to-feature private import. Use public API or orchestrate at app composition if necessary; avoid event bus as hidden coupling.
Rule B04: one public API per feature when useful; avoid barrel reexports creating cycles.
Rule B05: no monkey patch host prototypes; compatibility modifications only inside isolated runtime and contract-tested.
Rule B06: no new minified-string patches; transitional changes explicitly tracked and removed with replacement. Exceptions only for verified blocking fixes, reviewed and sunset-tagged.
Rule B07: one write owner per data class. Read model/snapshot can be copied, but no divergent authoritative stores.
Rule B08: source never imports generated asset paths as application modules. Build imports static resource only through declared asset manifest.
Rule B09: boundary checker in CI (e.g. ESLint restrictions + dependency-cruiser or equivalent); test static import, dynamic imports and approved exceptions. Tool choice remains provisional.
