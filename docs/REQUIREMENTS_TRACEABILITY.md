# Qitaa — Requirements Traceability Matrix

Status legend: **Existing** = supported by existing code/database structure, not necessarily production-tested; **Partial** = implemented but incomplete or unverified; **Planned** = target specification without working implementation; **Unverified** = source code is under review and requires tests.

| Domain | PDF source | Target acceptance criterion | Baseline / next action |
|---|---|---|---|
| Customer storefront | 00, 05, 08 | Arabic RTL, browse/search category, images, inventory offers | **Partial:** landing/catalog/part pages; real imagery and production data missing |
| Vehicle identity | 01, 02, 03, 05 | select vehicle or decode VIN into correct configuration | **Partial:** `/garage` includes preliminary VIN parsing plus optional official NHTSA vPIC lookup and manual fallback; production cross-origin/device validation outstanding |
| Fitment | 02, 03, 08 | verified part-to-car match with provenance | **Partial:** model/year sample matches, no verified supplier provenance |
| Master catalog | 02, 06, 08 | OEM/alternate IDs, variants, assets, review and CSV staged import | **Partial:** OEM core and two-stage admin-reviewed CSV import implemented and tested; no authoritative OEM/fitment feed or complete imagery |
| Seller onboarding | 05, 06 | merchant can request entry; admin accepts/rejects; approval recorded | **Partial:** application review and protected approval RPC implemented; synthetic PostgreSQL RLS checks pass; real merchant UAT outstanding |
| Seller catalog offers | 05, 06, 08 | approved seller adds/updates own price, stock, quality, warranty | **Partial:** verified merchants can maintain prices and availability; read policies restrict unverified public offers; real seller UAT outstanding |
| Official brand/authorized vendor | 00, 06, 08 | verified seller/category, evidence and provenance | **Planned:** formal evidence verification separate from self-declared quality |
| Checkout/orders | 03, 05, 06 | customer confirms and tracks an itemized order | **Partial:** unpaid availability requests, seller accept/reject, stock reservation, buyer cancellation and status tracking merged; live migration applied; no completed end-to-end real-user UAT or payment |
| Payments/COD | 01, 03, 07 | collect, reconcile/refund securely; local methods only when enabled | **Planned:** no live wallets or ledger, no payments in phase one |
| Delivery | 01, 05, 06 | delivery queue/status and customer evidence of completion | **Planned:** delivery role only |
| Workshop | 01, 03, 05, 06, 07 | inspect vehicle; quote parts+labor, client approval and work history | **Planned:** workshop role only |
| Quick service | 00, 05 | oil/filters/tires service management | **Planned:** role only |
| Lathe service | 07 | structured machining request/quote/workflow | **Planned:** no service interface |
| My vehicles | 02, 03, 05 | multiple vehicles, odometer, maintenance logs | **Partial:** /garage exists, needs browser and RLS scenario testing |
| Maintenance alerts | 05, 07 | timed/km based notifications | **Partial:** in-page banners; SMS/push not integrated |
| Identity/security | 01, 02, 03 | safe roles, private vehicles, isolated merchant data, audit trails | **Partial:** PostgreSQL RLS + application routes; penetration testing pending |
| Admin dashboard | 06 | approve merchants, manage catalog, users, orders, disputes | **Partial:** seller approval and catalog review available; orders/disputes/admin operations not complete |
| Admin CSV import | 06, 08 | validated import/dry-run/diff/approval and rollback procedure | **Partial:** parsed and staged review/approval RPCs exist; synthetic integration tests pass; production admin UAT and rollback practice outstanding |
| Pricing comparisons | 00, 03, 08 | list multiple sellers same item, condition/quality/guarantees | **Partial:** display sorted YER offers, no price history or provenance |
| Customer support/chat | 03, 04, 05 | human handoff and traceable communication | **Planned** |
| AI orchestration | 04 | bounded tool execution, logs, human approval for consequential actions | **Planned** |
| Marketing AI | 04, 07 | authorized campaign targeting/measurement | **Planned** |
| Analytics AI | 04, 09 | reliable business analytics, demand and anomalies | **Planned** |
| Research/Pricing AI | 04 | supplier trends and price recommendations based on evidence | **Planned** |
| Zero-results analytics | 09 | capture unsuccessful queries and recommend catalog opportunities | **Partial:** aggregate-only search recording and admin summary implemented; DB provisioned, read/write privileges restricted; final live verification blocked temporarily by Lovable MCP quota |
| React dashboards | 06 | admin, seller, workshop, analytics views | **Partial:** customer, seller, admin and order-status pages; workshop/analytics dashboards incomplete |
| Flutter customer/workshop/seller/delivery | 01, 05 | installable native apps / released builds | **Planned:** no Flutter code at baseline |

## Prioritized execution gates
- **G0 — Baseline: recorded.** The repository and current stack are documented. No deployment or production write is authorized.
- **G1 — Automated stability/security checks: passed in CI.** Typecheck, lint, build, database security, HTTP and buyer/seller browser workflows passed on reviewed PR heads. Real merchant/admin UAT, production migration parity and penetration testing remain unverified.
- **G2 — Catalog and fitment: partial.** Central catalog and staged admin-reviewed CSV import are implemented and tested. Authoritative OEM/fitment provenance, complete imagery and production catalog review remain outstanding.
- **G3 — Orders and inventory: partial.** Request creation, seller acceptance/rejection, reservations, cancellation, audit history and admin read-only monitoring have CI coverage. Delivery, COD reconciliation, disputes and refunds are not implemented; define their business workflow before coding.
- **G4 — Workshops, quick services and mobile workflows: planned.** No workshop/service lifecycle or Flutter applications are present.
- **G5 — Analytics, loyalty, notifications and bounded AI: planned/partial.** Zero-result analytics is partial; other target capabilities remain planned.
- **G6 — Release readiness: pending.** Production migration rehearsal/parity, backups, real-user acceptance, performance/security review and explicit deployment approval remain release gates.

## Current verified checkpoint — 2026-11-14
- `main` is at `f7a6ce03bf48a5830c20ae19909b7d487bc822b4`; no open pull requests were found.
- Latest `main` runs passed: DB Security `43638106235`, Buyer-Seller Browser E2E `43638106303`.
- PR #39 is merged and records PR #38's inventory race regression; the complete reviewed PR gate passed before merge. No production database was changed.
- **Resume point:** G2 catalog provenance is the next independent product gate. G3 delivery/COD work must wait for agreed operational rules; production UAT and parity require an authorized environment.

## Conflicts and pending input
- The PDFs discuss custom add-on modules on top of pre-existing Active eCommerce. Owner explicitly overrode this: build from THIS repository only.
- Flutter and Laravel are target specifications, not existing projects. Architecture choice requires cost/benefit analysis.
- '10_IMPLEMENTATION_GUIDE.md' is referenced in document index but not provided.
- Future owner additions will update this matrix rather than silently replacing the original requirements.

## 2026-10-15 evidence and release boundary

- GitHub PR #9 (requests) and PRs #10-#12 (request privileges, analytics privilege boundary, duplicate-open-request protection) were merged only after four CI jobs passed per branch.
- Lovable reported the matching main SHA for PR #9. The live purchase-request table and transition RPCs were installed and queried. Direct INSERT/UPDATE/DELETE grants were revoked and verified for authenticated clients; anonymous SELECT and RPC privileges were verified denied.
- Production snapshot at inspection: 7 makes, 14 models, 18 parts, 8 sellers (6 verified), 77 offers (59 active from verified sellers), 0 purchase requests.
- Analytics base migration was applied; table privilege revokes were executed. Final SQL privilege re-check was blocked by a temporary Lovable free-plan MCP action quota. Treat this confirmation as PENDING, not PASS.
- PR #12 adds a source-controlled unique index preventing duplicate open buyer/offer requests, but the index is NOT verified as deployed in the live database. Pending existing-row conflict check, migration execution and verification.
- Production is NOT accepted: real-user purchase-request and seller UAT, browser/device smoke, payment/delivery settlement, lawful source review for external vehicle datasets, and audited fitment evidence remain open.


## 2026-11-14 — Purchase-request quantity regression evidence

- PR #17 merged as `ac19c5858e17096bc77417eaa126d96bccba548b`, after five CI workflows passed on SHA `dd1cb93be9795c91dd213506003bb6ac9e163bb2` (GitHub Actions run IDs: 43627946692, 43627946752, 43627946683, 43627946686, 43627946760).
- **Completed and tested in disposable CI:** invalid quantity rejection; full available quantity accepted; initial request leaves stock unchanged; seller acceptance reserves exact stock; buyer cancellation restores exact stock.
- **Still partial/unverified:** concurrent last-unit requests and seller stock edits racing with accepted reservations; real buyer/seller UAT; deployment migration parity. CI is not production verification.

## 2026-11-14 — Inventory concurrency regression

- **Completed and tested in disposable PostgreSQL CI:** two concurrent seller acceptances cannot reserve the same last five units. One request becomes accepted and reserves all five units; the competing request remains requested.
- PR #23 merged as `843966ddfb743b405cbd607709babf813bc85373`; 5/5 workflows passed on tested SHA `4e2289660bc6dfaf56900209857843a2999e970e`.
- **Still partial/unverified:** seller stock edits racing with accepted reservations; production migration/schema parity; real buyer/seller UAT. No production database changes were made.


## 2026-11-14 — Stock recheck at seller acceptance

- **Completed and tested in disposable PostgreSQL CI:** seller reduces available inventory after the request is submitted; accepting an insufficient request is denied without changing inventory or request state. Restoring quantity permits acceptance.
- PR #25 merged as `276f9c1ee17a36548503625856534e47cecbc881`; all five workflows passed on SHA `de8135626ccb7e52c68853b0bcdd93668ac5bb10`.
- **Still partial/unverified:** true concurrent seller stock edits versus reservation transactions, real buyer/seller UAT, and production schema parity.


## 2026-11-14 — Purchase request audit trail

- **Completed and tested in disposable PostgreSQL CI:** request creation and status transitions append audit events with actor attribution and prior/new status. Buyer and verified owning seller can read; other buyers cannot; authenticated clients cannot write or delete events directly.
- PR #27 merged as `dab0ac926b94c492d8e08b21a8f81602638d141c`; 5/5 workflows passed on `5b918b2fd888f0bda16834385d0f7f3f6baeaea0`.
- **Still partial/unverified:** production migration parity/application, real user UAT, and audit trails for seller/catalog/admin actions outside purchase requests.


## 2026-11-14 — Request history visibility

- **Completed and tested in disposable CI:** buyer and verified seller can open the request timeline from their order/request cards. The participant-only RPC rejects unrelated accounts; browser E2E verifies both authorized roles.
- PR #29 merged as `6c38b3ba0be185c8ceb2aa0f1c7246459d9622c0`; 5/5 workflows passed on `37f16a709ca09b1e68ad23752258899877852737`.
- **Still planned/unverified:** actual delivery-provider flow, COD settlement/refunds, production UAT, and audit views for administration/catalog operations.


## 2026-11-14 — Superseded request lifecycle draft

- PR #5 was an old unmergeable draft. Its lifecycle migration matches the current main migration, while its UI and tests predate the current tested implementation.
- Closed as superseded; its existing work is represented by the current merged lifecycle code and later regression/security tests. No PR #5 code was merged from the stale branch.


## 2026-11-14 — Administrative request monitoring

- **Completed and tested in disposable CI:** authorized administrator can review and status-filter purchase requests and inspect their audit history. Non-admin calls to the list RPC are denied; admin browser journey is covered.
- PR #32 merged as `abc7edd84b88d48b3facab7ca6fc90dbaa9ad3e2`; 5/5 workflows passed on `4bd75d1d6431e5b07b1de1e0cd0b0cc95ab7b8ff`.
- **Still planned/unverified:** delivery assignment and shipment states, COD recording/reconciliation, disputes/refunds, real user UAT, and production migration parity.


## 2026-11-14 — Seller stock edit after reservation

- **Completed and tested in disposable CI:** after a two-unit request is accepted from five available units, the seller may edit remaining available stock to one; buyer cancellation releases the two reserved units and final availability is three. Seller UI labels the edited value as available-to-sell stock.
- PR #34 merged as `3f4ae1ab388a9df6cbb44fe68274a9c615ec9103`; 5/5 workflows passed on tested head `c11a2a81365fef7c4e7f93058ed4bfe8c67ceacf` (run IDs: 43634718906, 43634718975, 43634718920, 43634718921, 43634718912).
- **Still partial/unverified:** concurrent stock edit and reservation transactions, production migration parity, and real buyer/seller UAT. No production database was changed.


## 2026-11-14 — Admin purchase-monitor authorization and filters

- **Completed and tested in disposable CI:** the admin request-list RPC supports status filtering, does not duplicate the seeded request, and denies both buyer and seller roles. E2E browser and final database verification also passed.
- PR #36 merged as `90c1c219feedcd008b246c8e2d2e9bbd65b71925`; 5/5 workflows passed on tested head `8690cf45460f4c979b3ba048f649b162ed58a7f3` (run IDs: 43635667831, 43635667832, 43635667839, 43635667919, 43635667910).
- CI now pins Supabase CLI `3.1.0` instead of resolving `latest` through GitHub's release API at runtime.
- **Still partial/unverified:** real administrator UAT, production migration parity, and production release approval.


## 2026-11-14 — Concurrent stock edit/reservation regression

- **Completed and tested in disposable PostgreSQL CI:** seller acceptance and seller adjustment of available stock serialize without losing the accepted reservation. Buyer cancellation then restores the reserved quantity on top of the edited quantity (1 + 2 = 3).
- PR #38 merged as `c68754d679884db7e0547b0bc8a179ccac9e3df1`; 5/5 workflows passed on tested head `50e854788ef7a79f25872b6a91f14b7087a86a73` (run IDs: 43637364399, 43637364404, 43637364406, 43637364438, 43637364455).
- **Still partial/unverified:** production migration parity, real buyer/seller UAT, and end-to-end delivery/payment lifecycle.


## 2026-11-14 — عزل كراج العميل

- **مكتمل ومختبر في قاعدة PostgreSQL مؤقتة:** حظر قراءة/تعديل/حذف مركبة مستخدم آخر، وحظر إنشاء مركبة بهوية مالك مزيفة، مع إثبات استمرار وصول المالك إلى مركبته وسجل الصيانة.
- PR #41 مدمج بالـSHA 740fb0e3206db7d928ae5245f17ef2bbf9ecebc3 بعد نجاح 5/5 فحوص على head 4e760e44f9ff23f6e1c58768cb2de0e40010df17 (run IDs: 43639935410, 43639935496, 43639935434, 43639935488, 43639935457).
- **المتبقي:** اختبار تدفق المركبة عبر المتصفح وتكامل RLS في قاعدة الإنتاج ما يزالان غير مثبتين؛ لا تغيير إنتاجي. بوابة المنتج المستقلة التالية هي توثيق مصدر بيانات المركبات وحقوقه قبل استيراد أي بيانات مرجعية.