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
- **G0:** repository identified; GitHub/Lovable code sync checked; no deployment actions.
- **G1:** build, lint, typecheck and secure seller/admin onboarding tested with isolated accounts. Current PR is for this stage.
- **G2:** catalog enrichment, fitment provenance and safe import; no false 'verified compatibility' claim.
- **G3:** order lifecycle, clear seller ownership and audit, then delivery/COD staging.
- **G4:** workshop, quick services and mobile workflows; service/part linkage.
- **G5:** analytics, loyalty, notifications and bounded AI agents.
- **G6:** production security, data migration rehearsals, performance, backups, real user acceptance, deployment approval.

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
